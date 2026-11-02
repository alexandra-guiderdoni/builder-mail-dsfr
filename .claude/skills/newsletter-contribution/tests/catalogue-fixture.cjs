'use strict';
const {capabilities} = require('../scripts/editorial.cjs');

function fixture(A) {
  const doc = A.Model.create('Recette de couverture — démonstration hors diffusion', A.catalog.components.map(c => c.id));
  for (const block of doc.blocks) {
    for (const field of A.Model.component(block.component).fields) {
      if (field.type === 'text') block.values[field.key] = `Texte ${block.component} ${field.key} & <exemple>`;
      if (field.type === 'url') block.values[field.key] = `https://example.org/${block.component}/${field.key}`;
      if (field.type === 'alt') block.values[field.key] = `Illustration de démonstration ${block.component} ${field.key}`;
    }
    block.source = `https://example.org/source/${block.component}`;
    block.sourceLabel = `Source ${block.component}`;
  }
  if (capabilities(A).supported) {
    const article = A.Model.createBlock(31);
    Object.assign(article.values, {f0: '', f1: '', f2: '', f3: 'https://example.org/article-sans-image', f4: 'Article sans image de recette', f5: 'Source fournie · date fournie', f6: ''});
    const footer = A.Model.createBlock(50);
    Object.assign(footer.values, {f0: 'Question de recette', f1: 'mailto:subscribe@example.org', f2: 'S’abonner'});
    footer.additionalLinks = [{url: 'mailto:unsubscribe@example.org', label: 'Se désabonner'}, {url: 'mailto:contact@example.org', label: 'Nous contacter'}];
    doc.blocks.push(article, footer);
  }
  A.Model.document(doc); A.Render.assertOutput(doc);
  return doc;
}
const normalize = doc => ({...doc, id: null, blocks: doc.blocks.map(block => ({...block, id: null}))});
module.exports = {fixture, normalize};
