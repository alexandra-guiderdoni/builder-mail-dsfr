"""Contrat pur d'attribution de contenu synthétique, aucun presse-papiers/navigateur."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('owned_payload', ROOT / 'scripts/clipboard_owned_payload.py')
owned = importlib.util.module_from_spec(spec)
spec.loader.exec_module(owned)
checked = 0


def expect(value, name):
    global checked
    checked += 1
    if not value:
        raise SystemExit('FAIL: ' + name)


html = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>/* KNOWN */ p {color:red; width:620px; content:"KNOWN"}</style></head><body><p id="known" style="color:red;width:620px">SYNTHETIC</p><!-- KNOWN --></body></html>'
plain = 'SYNTHETIC\n'
wrapper = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN"><html><head><meta http-equiv="content-type" content="text/html; charset=utf-8"></head><body>{}</body></html>'
wrapped = wrapper.format(html.replace('<!doctype html>', '').replace('<meta charset="utf-8">', '<meta http-equiv="content-type" content="text/html; charset=utf-8">'))
no_outer_decl = wrapper.split('>', 1)[1].format(html)
cases = [
    ('exact expected', html, plain, True),
    ('known wrapper and replacement meta', wrapped, plain, True),
    ('known wrapper only', wrapper.format(html), plain, True),
    ('known wrapper without outer doctype with inner declaration', no_outer_decl, plain, True),
    ('no outer doctype private HTML attribute', no_outer_decl.replace('<html>', '<html data-private=PRIVATE_SENTINEL>', 1), plain, False),
    ('no outer doctype private head attribute', no_outer_decl.replace('<head>', '<head data-private=PRIVATE_SENTINEL>', 1), plain, False),
    ('no outer doctype private body attribute', no_outer_decl.replace('<body>', '<body data-private=PRIVATE_SENTINEL>', 1), plain, False),
    ('no outer doctype meta in wrong position', no_outer_decl.replace('<head><meta http-equiv="content-type" content="text/html; charset=utf-8"></head><body>', '<head></head><body><meta http-equiv="content-type" content="text/html; charset=utf-8">', 1), plain, False),
    ('no outer doctype private meta suffix', no_outer_decl.replace('charset=utf-8', 'charset=utf-8;PRIVATE_SENTINEL', 1), plain, False),
    ('no outer doctype private comment', no_outer_decl.replace('</head>', '<!--PRIVATE_SENTINEL--></head>', 1), plain, False),
    ('no outer doctype private closing suffix', no_outer_decl.replace('</body>', '</body PRIVATE_SENTINEL>'), plain, False),
    ('unknown outer declaration', '<!DOCTYPE PRIVATE_SENTINEL>' + no_outer_decl, plain, False),
    ('known meta case only', wrapped.replace('content-type', 'Content-Type'), plain, True),
    ('known CSS declaration deletion', html.replace(' width:620px;', ''), plain, True),
    ('known style entirely deleted', html.replace('<style>/* KNOWN */ p {color:red; width:620px; content:"KNOWN"}</style>', ''), plain, True),
    ('known inline style deletion', html.replace(';width:620px', ''), plain, True),
    ('known attribute deletion', html.replace(' id="known"', ''), plain, True),
    ('closing p suffix', html.replace('</p>', '</p PRIVATE_SENTINEL>'), plain, False),
    ('closing style suffix', html.replace('</style>', '</style PRIVATE_SENTINEL>'), plain, False),
    ('closing slash suffix', html.replace('</p>', '</p/PRIVATE_SENTINEL>'), plain, False),
    ('closing HTML comment suffix', html.replace('</p>', '</p <!--PRIVATE_SENTINEL-->>'), plain, False),
    ('start tag slash suffix', html.replace('<p id=', '<p /PRIVATE_SENTINEL id='), plain, False),
    ('known closing whitespace', html.replace('</p>', '</P  >'), plain, True),
    ('invalid decimal reference text', html.replace('SYNTHETIC', 'SYN&#1;THETIC'), plain, False),
    ('invalid hex reference text', html.replace('SYNTHETIC', 'SYN&#x1;THETIC'), plain, False),
    ('invalid uppercase hex reference', html.replace('SYNTHETIC', 'SYN&#X01;THETIC'), plain, False),
    ('invalid decimal reference attr', html.replace('id="known"', 'id="kno&#1;wn"'), plain, False),
    ('invalid hex reference attr', html.replace('id="known"', 'id="kno&#x1;wn"'), plain, False),
    ('padded long invalid reference', html.replace('SYNTHETIC', 'SYN&#000000000000000001;THETIC'), plain, False),
    ('missing semicolon decimal', html.replace('SYNTHETIC', 'SYN&#1THETIC'), plain, False),
    ('missing semicolon hex attr', html.replace('id="known"', 'id="kno&#x1wn"'), plain, False),
    ('invalid reference HTML comment', html.replace('<!-- KNOWN -->', '<!-- KN&#1;OWN -->'), plain, False),
    ('invalid reference CSS comment', html.replace('/* KNOWN */', '/* KN&#x1;OWN */'), plain, False),
    ('invalid reference CSS data', html.replace('color:red;', 'color:r&#1;ed;', 1), plain, False),
    ('unknown text suffix', html.replace('</body>', ' PRIVATE_SUFFIX</body>'), plain, False),
    ('unknown HTML comment', html.replace('</body>', '<!-- PRIVATE_COMMENT --></body>'), plain, False),
    ('unknown CSS comment', html.replace('color:red;', '/* PRIVATE_CSS_COMMENT */color:red;', 1), plain, False),
    ('unknown CSS string', html.replace('content:"KNOWN"', 'content:"PRIVATE_CSS_STRING"'), plain, False),
    ('unknown CSS value', html.replace('color:red;', 'color:privatevalue;', 1), plain, False),
    ('unknown inline comment', html.replace('style="color:', 'style="/* PRIVATE_INLINE */color:'), plain, False),
    ('unknown attribute', html.replace('id="known"', 'id="known" data-private="PRIVATE_ATTRIBUTE"'), plain, False),
    ('unknown attribute value', html.replace('id="known"', 'id="PRIVATE_ID"'), plain, False),
    ('duplicate attribute', html.replace('id="known"', 'id="known" id="PRIVATE"'), plain, False),
    ('unknown meta', html.replace('<meta charset="utf-8">', '<meta name="private" content="PRIVATE_META">'), plain, False),
    ('wrapper private attribute', wrapped.replace('<html>', '<html data-private="PRIVATE_WRAPPER">', 1), plain, False),
    ('wrapper private meta suffix', wrapped.replace('charset=utf-8', 'charset=utf-8;PRIVATE', 1), plain, False),
    ('unknown processing instruction', html + '<?private PRIVATE_PI?>', plain, False),
    ('unclosed CSS comment', html.replace('color:red;', '/* PRIVATE_UNCLOSED', 1), plain, False),
    ('plain suffix despite same HTML', html, plain + 'PRIVATE_PLAIN', False),
    ('standalone CR is not normalized', html, 'SYNTHETIC\r', False),
    ('plain BOM CRLF only normalization', html, '\ufeffSYNTHETIC\r\n', True),
]
for name, actual_html, actual_plain, accepted in cases:
    result = owned.qualify_owned(html, plain, actual_html, actual_plain)
    expect(result['qualified'] is accepted, name)
    expect(not any('PRIVATE_' in str(value) for value in result.values()), name + ' receipt no payload')

# C0/C1 bruts non HTML refusés avant la normalisation Unicode des espaces.
for codepoint in list(range(32)) + list(range(0x7f, 0xa0)):
    if codepoint in (9, 10, 12, 13):
        continue
    control = chr(codepoint)
    for context, actual in [
        ('text', html.replace('SYNTHETIC', control + 'SYNTHETIC')),
        ('attribute', html.replace('id="known"', 'id="kno' + control + 'wn"')),
    ]:
        expect(not owned.qualify_owned(html, plain, actual, plain)['qualified'],
               'raw control %x in %s' % (codepoint, context))
for whitespace in ('\t', '\n', '\f', '\r'):
    expect(owned.qualify_owned(html, plain, html.replace('SYNTHETIC', whitespace + 'SYNTHETIC'), plain)['qualified'],
           'ordinary HTML whitespace remains recognized')

# Raw reference policy is also enforced when an unsafe spelling exists in the reference itself.
for name, reference in [
    ('unknown named entity', '<p>&PRIVATE;</p>'),
    ('invalid numeric source', '<p>&#1;</p>'),
    ('out of range scalar', '<p>&#1114112;</p>'),
    ('surrogate scalar', '<p>&#55296;</p>'),
    ('noncharacter scalar', '<p>&#65535;</p>'),
    ('C1 scalar mapping', '<p>&#128;</p>'),
    ('padded long valid scalar', '<p>&#00000000000000000065;</p>'),
    ('known named missing semicolon', '<p>&amp</p>'),
]:
    expect(not owned.qualify_owned(reference, plain, reference, plain)['qualified'], name)
for name, reference in [
    ('known named', '<p>SYNTHETIC &amp; &nbsp;</p>'),
    ('known decimal', '<p>SYNTHETIC &#65;</p>'),
    ('known hex', '<p>SYNTHETIC &#x41;</p>'),
    ('escaped reference example', '<p>SYNTHETIC &amp;#1;</p>'),
]:
    expect(owned.qualify_owned(reference, plain, reference, plain)['qualified'], name)
expect(not owned.qualify_owned('<p>SYNTHETIC A</p>', plain,
                              '<p>SYNTHETIC &#65;</p>', plain)['qualified'],
       'unrecognized raw spelling conservatively refused even if scalar is valid')

with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    paths = {'expected_html_path': html, 'expected_plain_path': plain,
             'observed_html_path': html + '<!-- PRIVATE_CLI -->', 'observed_plain_path': plain}
    config = {}
    for key, content in paths.items():
        target = base / key
        target.write_text(content)
        target.chmod(0o600)
        config[key] = str(target)
    child = subprocess.run([sys.executable, '-B', str(ROOT / 'scripts/clipboard_owned_payload.py')],
                           input=json.dumps(config), capture_output=True, text=True)
    receipt = json.loads(child.stdout)
    expect(child.returncode == 0 and receipt['qualified'] is False, 'CLI rejects unexpected payload privately')
    expect('PRIVATE_CLI' not in child.stdout + child.stderr, 'CLI never echoes unknown content')
    Path(config['observed_html_path']).write_text(html)
    Path(config['observed_html_path']).chmod(0o644)
    child = subprocess.run([sys.executable, '-B', str(ROOT / 'scripts/clipboard_owned_payload.py')],
                           input=json.dumps(config), capture_output=True, text=True)
    expect(json.loads(child.stdout)['reason'] == 'PRIVATE_OWNERSHIP_CHECK_FAILED', 'CLI refuses nonprivate capture')

print('owned payload: %d pure checks; no native allocation' % checked)
