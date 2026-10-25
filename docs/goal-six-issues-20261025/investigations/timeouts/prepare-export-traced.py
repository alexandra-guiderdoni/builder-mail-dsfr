#!/usr/bin/env python3
"""Copie historique #145, assertions inchangées, collecte d'événements seule."""
from pathlib import Path
import subprocess
import difflib
import argparse

here = Path(__file__).resolve().parent
root = here.parents[3]
parser = argparse.ArgumentParser()
parser.add_argument('--repo', type=Path, default=root)
parser.add_argument('--output', type=Path, default=here / 'export-traced')
args = parser.parse_args()
ref = 'eadd426befeb39a6e68a14342f9c1a66102ac81d'
files = ['app/distribution/portable.html', 'tests/browser-support.cjs', 'tests/export-names-browser.test.cjs']
for name in files:
    original = subprocess.check_output(['git', 'show', f'{ref}:{name}'], cwd=args.repo).decode()
    changed = original
    if name.endswith('browser-support.cjs'):
        anchor = '  const page = await context.newPage();'
        assert changed.count(anchor) == 1
        changed = changed.replace(anchor, anchor + "\n  page.__readExportTrace145 = await require('../../trace-export.cjs').traceExport(page);")
    if name.endswith('export-names-browser.test.cjs'):
        # Une seule répétition par défaut ; nombre borné fourni par le diagnostic.
        changed = changed.replace("test(`noms des fichiers exportés, trois types d’export (${engine})`,", "for (let replay = 1; replay <= Number(process.env.EXPORT_REPLAYS || 1); replay++) test(`rejeu ${replay} — noms des fichiers exportés, trois types d’export (${engine})`,")
        anchor = '  } catch (error) { await context.close(); throw error; }'
        assert changed.count(anchor) == 1
        changed = changed.replace(anchor, "  } catch (error) { const trace = await page.__readExportTrace145(); await context.close(); throw new Error(`Forensic145 ${JSON.stringify({original: {name: error.name, message: error.message, stack: error.stack}, ...trace})}`, {cause: error}); }")
    target = args.output / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(changed)
    if changed != original:
        (args.output.parent / ('trace145-' + Path(name).name + '.diff')).write_text(''.join(difflib.unified_diff(original.splitlines(True), changed.splitlines(True), fromfile=ref + '/' + name, tofile='export-traced/' + name)))
helper = args.output.parent / 'trace-export.cjs'
if helper.resolve() != (here / 'trace-export.cjs').resolve():
    helper.write_bytes((here / 'trace-export.cjs').read_bytes())
print('Fixture historique et collecte ciblée #145 préparées ; aucune assertion ni attente modifiée.')
