const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');

// Variantes corrigées du pied mail-50 (#40). Le cas sans lien supplémentaire reste couvert,
// inchangé, par le premier test de article-text-footer-links.test.cjs.
global.window = global;
global.MailBuilder = {catalog: JSON.parse(execFileSync('python3', ['-c', 'import json;from scripts.catalogue import compile_catalogue;print(json.dumps(compile_catalogue()))'], {encoding: 'utf8'}))};
for (const name of ['model.js', 'render.js', 'imports.js']) vm.runInThisContext(fs.readFileSync('app/source/' + name, 'utf8'), {filename: name});
const {Model: M, Render: R, Imports: I} = MailBuilder;
const index = MailBuilder.catalog.components.findIndex(c => c.id === 'mail-50');
const extras = [
  {url: 'mailto:service@exemple.invalid?subject=D%C3%A9sabonnement', label: 'Se désabonner'},
  {url: 'https://exemple.invalid/contact?a="x"&b=<y>', label: 'Contact <équipe> & "aide" {{f0}}'},
];
const footer = count => {
  const doc = M.create('Pied de recette', [index]);
  if (count !== undefined) doc.blocks[0].additionalLinks = extras.slice(0, count);
  return doc;
};
// Le lien canonique du gabarit, tel que le catalogue le fournit.
const canonicalAnchor = MailBuilder.catalog.components[index].semanticTemplate.match(/<a\b[^>]*\bhref="\{\{f1\}\}"[^>]*>[\s\S]*?<\/a>/)[0];
const anchorFor = (link, preview = false) => {
  const incomplete = preview && !link.label.trim();
  const markup = incomplete ? canonicalAnchor.replace(/\s+href="\{\{f1\}\}"/, '') : canonicalAnchor;
  return markup.replace(/\{\{(f1|f2)\}\}/g, (_, key) => key === 'f1' ? R.escape(link.url) : R.escape(incomplete ? 'Intitulé du lien à renseigner' : link.label));
};

test('zéro, un ou deux liens supplémentaires sont rendus ; le troisième reste refusé', () => {
  for (const count of [0, 1, 2]) {
    const doc = footer(count);
    assert.doesNotThrow(() => M.document(doc));
    assert.doesNotThrow(() => I.parse(JSON.stringify(doc)));
    for (const html of [R.html(doc), R.html(doc, true)]) assert.equal((html.match(/<a\b/g) || []).length, 1 + count, `${count} lien(s)`);
  }
  const third = footer(2); third.blocks[0].additionalLinks.push({url: 'https://exemple.invalid/troisieme', label: 'Troisième lien'});
  assert.throws(() => M.document(third), /au plus deux liens supplémentaires/);
  assert.throws(() => I.parse(JSON.stringify(third)));
  assert.throws(() => R.html(third), /au plus deux liens supplémentaires/);
});

test('le rendu dérivé conserve le gabarit canonique hors des liens ajoutés, et chaque lien ajouté reprend le lien canonique', () => {
  for (const preview of [false, true]) {
    const canonical = R.block(footer().blocks[0], [], preview);
    const end = canonical.indexOf('</a>') + '</a>'.length;
    for (const count of [1, 2]) {
      const block = footer(count).blocks[0];
      if (preview) block.additionalLinks[count - 1] = {...block.additionalLinks[count - 1], label: ' '};
      const derived = R.block(block, [], preview);
      // Cadre, tableaux, classes, polices et couleurs : tout ce qui précède et suit les liens ajoutés est identique au gabarit.
      assert.ok(derived.startsWith(canonical.slice(0, end)), `début du gabarit modifié (${count} lien(s), aperçu ${preview})`);
      assert.ok(derived.endsWith(canonical.slice(end)), `fin du gabarit modifiée (${count} lien(s), aperçu ${preview})`);
      let inserted = derived.slice(end, derived.length - (canonical.length - end));
      for (const link of block.additionalLinks) {
        const anchor = anchorFor(link, preview), at = inserted.indexOf(anchor);
        assert.ok(at >= 0, `lien ajouté « ${link.label} » différent du lien canonique (aperçu ${preview})`);
        // Seul un séparateur textuel, sans balise, précède chaque lien ajouté.
        assert.doesNotMatch(inserted.slice(0, at), /[<>]/);
        assert.ok(inserted.slice(0, at).trim().length > 0, 'séparateur visible attendu entre deux liens');
        inserted = inserted.slice(at + anchor.length);
      }
      assert.equal(inserted, '', 'aucun contenu après le dernier lien ajouté');
    }
  }
});

test('les liens ajoutés ne portent ni retour à la ligne interdit ni valeur réinterprétée comme champ', () => {
  const doc = footer(2), html = R.html(doc);
  assert.doesNotMatch(html, /white-space:\s*nowrap/);
  assert.ok(html.includes('Contact &lt;équipe&gt; &amp; &quot;aide&quot; {{f0}}'), 'un intitulé « {{f0}} » reste du texte');
  assert.equal(html.split(R.escape(doc.blocks[0].values.f0)).length - 1, 1, 'le texte f0 n’apparaît qu’une fois');
  assert.ok(html.includes('href="' + R.escape(extras[1].url) + '"'));
  const labels = [...html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
  assert.deepEqual(labels, [doc.blocks[0].values.f2, ...extras.map(link => R.escape(link.label))]);
});
