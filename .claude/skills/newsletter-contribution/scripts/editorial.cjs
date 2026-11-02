#!/usr/bin/env node
'use strict';
// Recette de composition : aucun gabarit HTML ni moteur de rendu embarqué.
const fs = require('node:fs');
const path = require('node:path');
const {loadBuilder, writeDocument} = require('./builder-document.cjs');
const {assertVerified} = require('./builder-contract.cjs');

function fields(value, required, optional = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      required.some(key => !Object.hasOwn(value, key)) ||
      Object.keys(value).some(key => !required.includes(key) && !optional.includes(key))) {
    throw new Error('Contenu éditorial : champs manquants ou inconnus.');
  }
}
function text(value, label, empty = false) {
  if (typeof value !== 'string' || (!empty && !value.trim())) throw new Error(`${label} : texte requis.`);
  return value;
}
function validate(data) {
  fields(data, ['name', 'subject', 'service', 'title', 'subtitle', 'intro', 'sections', 'footerNote', 'signature', 'footer']);
  for (const key of ['name', 'subject', 'service', 'title']) text(data[key], key);
  for (const key of ['subtitle', 'intro', 'footerNote', 'signature']) text(data[key], key, true);
  if (!Array.isArray(data.sections) || !data.sections.length) throw new Error('Au moins une rubrique requise.');
  for (const section of data.sections) {
    fields(section, ['title', 'articles']);
    text(section.title, 'Rubrique');
    if (!Array.isArray(section.articles) || !section.articles.length) throw new Error('Rubrique sans article.');
    for (const article of section.articles) {
      fields(article, ['title', 'url', 'source', 'date'], ['crd']);
      for (const key of ['title', 'url']) text(article[key], key);
      for (const key of ['source', 'date']) text(article[key], key, true);
      if (Object.hasOwn(article, 'crd') && typeof article.crd !== 'boolean') throw new Error('crd : booléen requis.');
    }
  }
  fields(data.footer, ['prompt', 'links']);
  text(data.footer.prompt, 'Question de pied de page', true);
  if (!Array.isArray(data.footer.links) || data.footer.links.length < 1 || data.footer.links.length > 3) {
    throw new Error('Le pied de page requiert un à trois liens.');
  }
  for (const link of data.footer.links) {
    fields(link, ['url', 'label']);
    text(link.url, 'URL de pied de page'); text(link.label, 'Intitulé de pied de page');
    if (/[\x00-\x1f\x7f-\x9f\u2028\u2029]/.test(link.label)) throw new Error('Intitulé de pied de page sur une seule ligne requis.');
  }
}

function capabilities(A) {
  const {Model: M, Render: R} = A;
  const checks = {};
  const check = (name, run) => {
    try { run(); checks[name] = {supported: true}; }
    catch (error) { checks[name] = {supported: false, reason: error.message}; }
  };
  check('articleWithoutImage', () => {
    const doc = M.create('Vérification article', [5, 17, 31]);
    Object.assign(doc.blocks[2].values, {f0: '', f1: '', f2: '', f3: 'https://example.org/article', f4: 'Article témoin', f5: 'Source · Date', f6: ''});
    const html = R.html(M.document(doc));
    if (/<img\b/i.test(html) || !html.includes('https://example.org/article')) throw new Error('Rendu sans image non conservé.');
  });
  check('threeFooterLinks', () => {
    const doc = M.create('Vérification pied de page', [50]);
    const footer = doc.blocks[0];
    footer.values.f1 = 'https://example.org/subscribe';
    footer.additionalLinks = [{url: 'https://example.org/unsubscribe', label: 'Se désabonner'}, {url: 'https://example.org/contact', label: 'Nous contacter'}];
    const html = R.html(M.document(doc));
    for (const link of footer.additionalLinks) if (!html.includes(link.url)) throw new Error('Action supplémentaire absente du rendu.');
  });
  check('footerMailto', () => {
    const doc = M.create('Vérification mailto', [50]);
    doc.blocks[0].values.f1 = 'mailto:newsletter@example.org?subject=Abonnement';
    R.html(M.document(doc));
  });
  return {supported: Object.values(checks).every(check => check.supported), checks};
}

function compose(A, data) {
  assertVerified(A);
  validate(data);
  const support = capabilities(A);
  if (!support.supported) throw new Error('PRÉREQUIS TECHNIQUE : builder incompatible avec le template éditorial. Exécuter la commande probe ; conserver le portable compatible.');
  const {Model: M, Render: R} = A;
  const doc = M.create(data.name, []);
  doc.subject = data.subject;
  const add = (type, strings) => {
    const block = M.setTexts(M.createBlock(type), strings);
    doc.blocks.push(block); return block;
  };
  add(2, [data.service]); add(5, [data.title]);
  const intro = [data.subtitle, data.intro].filter(Boolean).join('\n\n');
  if (intro) add(19, [intro]);
  for (const section of data.sections) {
    add(17, [section.title]);
    for (const article of section.articles) {
      const block = M.createBlock(31);
      Object.assign(block.values, {f0: '', f1: '', f2: '', f3: article.url, f4: article.title,
        f5: [article.crd ? 'CRD' : '', article.source, article.date].filter(Boolean).join(' · '), f6: ''});
      doc.blocks.push(block);
    }
  }
  const closing = [data.footerNote, data.signature].filter(Boolean).join('\n\n');
  if (closing) add(19, [closing]);
  const [first, ...extra] = data.footer.links;
  const footer = add(50, [data.footer.prompt, first.label]);
  footer.values.f1 = first.url;
  if (extra.length) footer.additionalLinks = extra.map(link => ({...link}));
  M.document(doc); R.assertOutput(doc);
  return doc;
}

function main(args) {
  const [command, root, input, output] = args;
  if (!root || !['probe', 'compose'].includes(command) || (command === 'compose' && (!input || !output))) {
    throw new Error('Usage : editorial.cjs probe CHECKOUT | compose CHECKOUT CONTENU_JSON NOUVEAU_DOSSIER');
  }
  const A = loadBuilder(root);
  if (command === 'probe') {
    const result = capabilities(A);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    if (!result.supported) process.exitCode = 2;
    return;
  }
  const doc = compose(A, JSON.parse(fs.readFileSync(input, 'utf8')));
  writeDocument(A, doc, output);
  process.stdout.write(JSON.stringify({status: 'PASS', output: path.resolve(output), blocks: doc.blocks.length,
    articles: doc.blocks.filter(block => block.component === 'mail-31').length}) + '\n');
}
module.exports = {compose, capabilities};
if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { process.stderr.write(error.message + '\n'); process.exitCode = 1; }
}
