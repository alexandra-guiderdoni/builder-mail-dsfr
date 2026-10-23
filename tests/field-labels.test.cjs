const test = require('node:test');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');

const catalog = JSON.parse(execFileSync('python3', ['-B', '-c', 'import json;from scripts.catalogue import compile_catalogue;print(json.dumps(compile_catalogue()))'], {encoding: 'utf8', maxBuffer: 20 * 1024 * 1024}));
const CONTRACT = '6ca8ea12a0dcbdd6e59f287b6435b06367b8a44c4278f74858e8cddd6e72af8b';
const GENERIC = new Set(['texte', 'titre', 'description', 'accroche', 'image', 'image locale', 'lien', 'lien https', 'alternative', 'alternative de l’image', 'champ']);
const normalize = label => label.normalize('NFC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('fr');

// Libellés génériques, numérotés ou homonymes ; clair et sombre distingués d’après les classes du gabarit.
function problems(components) {
  const found = [];
  for (const c of components) {
    const labels = Object.fromEntries(c.fields.map(f => [f.key, f.label]));
    const seen = new Map();
    for (const f of c.fields) {
      const label = normalize(f.label);
      if (!label) found.push(`${c.id} ${f.key} : libellé vide`);
      if (/(^|\s)\d+$/.test(label)) found.push(`${c.id} ${f.key} : libellé numéroté « ${f.label} »`);
      if (GENERIC.has(label)) found.push(`${c.id} ${f.key} : libellé générique « ${f.label} »`);
      if (seen.has(label)) found.push(`${c.id} ${f.key} : homonyme de ${seen.get(label)} « ${f.label} »`);
      seen.set(label, f.key);
      if (f.type === 'alt' && !label.startsWith('alternative textuelle')) found.push(`${c.id} ${f.key} : alternative non qualifiée « ${f.label} »`);
      if (f.type === 'url' && !(c.family === 'Pieds de page' ? /https ou mailto/ : /https(?! ou mailto)/).test(label)) found.push(`${c.id} ${f.key} : protocole absent « ${f.label} »`);
    }
    for (const [, cls, src, alt] of c.template.matchAll(/<img\b(?=[^>]*\bclass="(hide-black|hide-white)")(?=[^>]*\bsrc="\{\{(f\d+)\}\}")(?=[^>]*\balt="\{\{(f\d+)\}\}")[^>]*>/g)) {
      const theme = cls === 'hide-black' ? 'thème clair' : 'thème sombre';
      for (const key of [src, alt]) if (!normalize(labels[key]).includes(theme)) found.push(`${c.id} ${key} : ${theme} non nommé « ${labels[key]} »`);
    }
  }
  return found;
}

test('les libellés de champ changent sans modifier les clés, les types ni l’empreinte contractuelle', () => {
  assert.equal(catalog.id, CONTRACT);
  assert.equal(catalog.components.length, 52);
  assert.equal(catalog.components.reduce((n, c) => n + c.fields.length, 0), 178);
  for (const c of catalog.components) assert.deepEqual(c.fields.map(f => f.key), c.fields.map((_, i) => `f${i}`), c.id);
});

test('chaque champ du catalogue porte un libellé explicite, unique dans son bloc (RGAA 11.1, 11.2 ; WCAG 2.4.6)', () => {
  assert.deepEqual(problems(catalog.components), []);
  const themed = catalog.components.filter(c => c.template.includes('class="hide-white"'));
  assert.deepEqual(themed.map(c => c.id), ['mail-02', 'mail-03', 'mail-47', 'mail-48']);
});

test('le contrôle échoue si un libellé générique, numéroté, homonyme ou mal attribué réapparaît', () => {
  const mutate = (id, change) => {
    const components = structuredClone(catalog.components);
    const component = components.find(c => c.id === id);
    change(component);
    return problems([component]);
  };
  const label = (key, value) => c => { c.fields.find(f => f.key === key).label = value; };
  const mutations = {
    numéroté: mutate('mail-00', label('f0', 'Texte 1')),
    générique: mutate('mail-18', label('f0', 'Texte')),
    'générique historique': mutate('mail-26', label('f0', 'Image locale')),
    homonyme: mutate('mail-20', label('f2', catalog.components[20].fields[1].label)),
    'homonyme à la casse près': mutate('mail-46', label('f8', catalog.components[46].fields[3].label.toLocaleUpperCase('fr'))),
    'clair et sombre inversés': mutate('mail-02', c => { [c.fields[0].label, c.fields[2].label] = [c.fields[2].label, c.fields[0].label]; }),
    'alternative non qualifiée': mutate('mail-04', label('f1', 'Alternative de l’image')),
    'protocole de pied de page absent': mutate('mail-49', label('f1', 'Adresse HTTPS du lien de désabonnement')),
    'mailto hors pied de page': mutate('mail-40', label('f0', 'Adresse HTTPS ou mailto du bouton')),
    vide: mutate('mail-51', label('f0', ' ')),
  };
  for (const [name, found] of Object.entries(mutations)) assert.ok(found.length > 0, name);
});
