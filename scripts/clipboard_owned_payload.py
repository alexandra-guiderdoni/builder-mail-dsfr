"""Attribution bornée d'un payload synthétique Firefox, distincte de sa fidélité.

CLI : JSON sur stdin avec chemins ; stdout ne contient jamais de contenu capturé.
Les lexèmes observés doivent être connus dans l'attendu, ou supprimés : aucune
inférence de DOM/rendu, CSS, accessibilité ou réception de courriel.
"""

import json
import os
import re
import stat
import sys
from html.parser import HTMLParser
from pathlib import Path

CSS_TOKEN = re.compile(
    r'/\*.*?\*/|"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|'
    r'(?:--?|[_a-zA-Z\u0080-\uffff])(?:[\w-]|\\[^\r\n])*|'
    r'(?:\d*\.\d+|\d+)(?:[eE][+-]?\d+)?|[^\s]', re.DOTALL
)
HTML4 = 'doctype html public "-//w3c//dtd html 4.0 transitional//en"'
UTF8_META = {'http-equiv': 'content-type', 'content': 'text/html; charset=utf-8'}
# HTMLParser est tolérant : ses callbacks seuls peuvent jeter des octets bruts.
# Ce sous-ensemble lexical strict doit consommer chaque balise entièrement.
RAW_START = re.compile(
    r'''<[A-Za-z][\w:.-]*(?:[ \t\r\n\f]+[A-Za-z_:][A-Za-z0-9_:.-]*(?:[ \t\r\n\f]*=[ \t\r\n\f]*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*[ \t\r\n\f]*/?>'''
)
RAW_END = re.compile(r'</[A-Za-z][\w:.-]*[ \t\r\n\f]*>')


def plain(value):
    return value.removeprefix('\ufeff').replace('\r\n', '\n')


def css_tokens(value):
    # Comments and quoted strings are whole tokens. Unknown comments are NOT erased.
    value = plain(value)
    result = []
    for match in CSS_TOKEN.finditer(value):
        token = match.group()
        if value.startswith('/*', match.start()) and not token.endswith('*/'):
            raise ValueError('UNTERMINATED_CSS_COMMENT')
        if token[0] in ('"', "'") and (len(token) < 2 or token[-1] != token[0]):
            raise ValueError('UNTERMINATED_CSS_STRING')
        result.append(token)
    return result


def subsequence(observed, expected, matches=lambda a, b: a == b):
    position = 0
    for token in observed:
        while position < len(expected) and not matches(token, expected[position]):
            position += 1
        if position == len(expected):
            return False
        position += 1
    return True


class Tokens(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tokens = []
        self.in_style = False
        self.invalid = False

    def handle_starttag(self, tag, attrs):
        if not RAW_START.fullmatch(self.get_starttag_text()):
            self.invalid = True
        if len(dict(attrs)) != len(attrs):
            self.invalid = True
        self.tokens.append(('start', tag, dict(attrs)))
        self.in_style = tag == 'style'

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag == 'style':
            self.invalid = True

    def handle_endtag(self, tag):
        self.tokens.append(('end', tag))
        self.in_style = False

    def parse_endtag(self, position):
        end = super().parse_endtag(position)
        if end != -1 and not RAW_END.fullmatch(self.rawdata[position:end]):
            self.invalid = True
        return end

    def handle_data(self, value):
        if self.in_style:
            self.tokens.append(('css', css_tokens(value)))
        else:
            value = re.sub(r'\s+', ' ', value).strip()
            if value:
                self.tokens.append(('text', value))

    def handle_comment(self, value):
        self.tokens.append(('comment', plain(value)))

    def handle_decl(self, value):
        self.tokens.append(('decl', value.lower()))

    def unknown_decl(self, value):
        self.invalid = True

    def handle_pi(self, value):
        self.tokens.append(('pi', plain(value)))


def parse(value):
    parser = Tokens()
    parser.feed(plain(value))
    parser.close()
    return parser


def known_meta(token):
    return token[:2] == ('start', 'meta') and {key: (value or '').lower() for key, value in token[2].items()} == UTF8_META


def unwrap(tokens):
    """Enveloppe neutre exacte, avec déclaration HTML4 connue facultative."""
    pattern = [('start', 'html'), ('start', 'head'), ('start', 'meta'),
               ('end', 'head'), ('start', 'body')]
    start = 1 if tokens[:1] == [('decl', HTML4)] else 0
    if (len(tokens) >= start + 7
            and [t[:2] for t in tokens[start:start + 5]] == pattern
            and tokens[-2:] == [('end', 'body'), ('end', 'html')]
            and all(tokens[start + i][2] == {} for i in (0, 1, 4))
            and known_meta(tokens[start + 2])):
        return tokens[start + 5:-2], True
    return tokens, False


def matches(observed, expected):
    if observed[0] != expected[0]:
        return False
    if observed[0] == 'css':
        return subsequence(observed[1], expected[1])
    if observed[0] != 'start':
        return observed == expected
    if observed[1] != expected[1]:
        return False
    for key, value in observed[2].items():
        if key not in expected[2]:
            return False
        if key == 'style':
            if value is None or expected[2][key] is None or not subsequence(css_tokens(value), css_tokens(expected[2][key])):
                return False
        elif value != expected[2][key]:
            return False
    return True


def qualify_owned(expected_html, expected_plain, observed_html, observed_plain):
    result = {'qualified': False, 'plain_exact': plain(expected_plain) == plain(observed_plain),
              'scope': 'Known-only synthetic payload attribution; never copy fidelity',
              'normalization': 'Plain: initial BOM and CRLF only; HTML text: whitespace; CSS: whole lexemes including comments'}
    if not result['plain_exact']:
        result['reason'] = 'PLAIN_NOT_EXPECTED'
        return result
    try:
        expected, observed = parse(expected_html), parse(observed_html)
    except ValueError:
        result['reason'] = 'UNSUPPORTED_CSS_TOKENIZATION'
        return result
    tokens, wrapped = unwrap(observed.tokens)
    result['known_html4_wrapper'] = wrapped
    if expected.invalid or observed.invalid:
        result['reason'] = 'UNSUPPORTED_HTML_TOKENIZATION'
        return result
    # A UTF-8 replacement meta is allowed only inside the recognized outer wrapper,
    # at the location of an expected meta, not anywhere arbitrary in the document.
    def known_token(actual, reference):
        if wrapped and known_meta(actual) and reference[:2] == ('start', 'meta'):
            return reference[2] == {'charset': 'utf-8'} or matches(actual, reference)
        return matches(actual, reference)
    try:
        result['qualified'] = subsequence(tokens, expected.tokens, known_token)
    except ValueError:
        result['reason'] = 'UNSUPPORTED_CSS_TOKENIZATION'
        return result
    result['reason'] = 'KNOWN_EXPECTED_SUBSET' if result['qualified'] else 'UNEXPECTED_HTML_OR_CSS'
    return result


def private_read(filename):
    target = Path(filename)
    parent = target.parent.lstat()
    if not stat.S_ISDIR(parent.st_mode) or parent.st_uid != os.geteuid() or stat.S_IMODE(parent.st_mode) != 0o700:
        raise ValueError('PRIVATE_DIRECTORY_REQUIRED')
    fd = os.open(target, os.O_RDONLY | os.O_NOFOLLOW)
    try:
        info = os.fstat(fd)
        if not stat.S_ISREG(info.st_mode) or info.st_uid != os.geteuid() or stat.S_IMODE(info.st_mode) != 0o600 or info.st_nlink != 1:
            raise ValueError('PRIVATE_FILE_REQUIRED')
        with os.fdopen(fd, 'r', encoding='utf-8', newline='', closefd=False) as source:
            return source.read()
    finally:
        os.close(fd)


def main():
    try:
        config = json.load(sys.stdin)
        expected_html = Path(config['expected_html_path']).read_bytes().decode('utf-8')
        expected_plain = Path(config['expected_plain_path']).read_bytes().decode('utf-8')
        result = qualify_owned(expected_html, expected_plain,
                               private_read(config['observed_html_path']), private_read(config['observed_plain_path']))
    except Exception:
        result = {'qualified': False, 'reason': 'PRIVATE_OWNERSHIP_CHECK_FAILED'}
    print(json.dumps(result))


if __name__ == '__main__':
    main()
