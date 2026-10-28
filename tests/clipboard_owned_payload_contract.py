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
cases = [
    ('exact expected', html, plain, True),
    ('known wrapper and replacement meta', wrapped, plain, True),
    ('known wrapper only', wrapper.format(html), plain, True),
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
