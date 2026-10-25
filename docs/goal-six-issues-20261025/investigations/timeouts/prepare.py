#!/usr/bin/env python3
"""Recrée seulement les copies jetables voisines ; aucune modification produit."""
from pathlib import Path
import subprocess, re, hashlib, base64
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
BASE='79c999cc00e8a317e71aa6f91c3bb357b5537741'
OLD='395c08d1dfa4d0b8e41416da798bf0313a8bd379'
EXPORT='eadd426befeb39a6e68a14342f9c1a66102ac81d'
def source(ref,file):return subprocess.check_output(['git','show',f'{ref}:{file}'],cwd=ROOT)
def put(base,file,content):
 target=HERE/base/file;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(content)
for variant,ref in [('historical',OLD),('preview-only',OLD),('export-historical',EXPORT)]:
 for file in ['app/distribution/portable.html','tests/browser-support.cjs','tests/export-names-browser.test.cjs']:put(variant,file,source(ref,file))
 if variant!='export-historical':
  for file in ['article-text-footer-links-browser.test.cjs','preview-size-browser.test.cjs','preview-resources.cjs']:put(variant,'tests/'+file,source(BASE,'tests/'+file))
  full=source(BASE,'tests/article-text-footer-links-browser.test.cjs').decode()
  put(variant,'tests/article-repeat.test.cjs',full.replace("test('article sans image", "for (let repeat=0; repeat<12; repeat++) test('article sans image").encode())
f=HERE/'preview-only/app/distribution/portable.html';original=f.read_text();before=source(OLD,'app/source/preview.js').decode();after=source(BASE,'app/source/preview.js').decode();assert original.count(before)==1
changed=original.replace(before,after)
def digest(text):
 scripts=re.findall(r'<script>(.*?)</script>',text,re.S);assert len(scripts)==1
 return base64.b64encode(hashlib.sha256(scripts[0].encode()).digest()).decode()
oldhash,newhash=digest(original),digest(changed);assert oldhash in changed;f.write_text(changed.replace(oldhash,newhash))
print('Copies historiques et comparateur preview-only prêts ; aucune dépendance installée.')
