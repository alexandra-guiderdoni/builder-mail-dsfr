const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(execFileSync('python3', ['-B', '-c', 'import json;from scripts.catalogue import compile_catalogue;print(json.dumps(compile_catalogue()))'], {cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024}));
const CONTRACT = '6ca8ea12a0dcbdd6e59f287b6435b06367b8a44c4278f74858e8cddd6e72af8b';
const GENERIC = new Set(['texte', 'titre', 'description', 'accroche', 'image', 'image locale', 'lien', 'lien https', 'alternative', 'alternative de l’image', 'champ']);
const normalize = label => label.normalize('NFC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('fr');

// Préfixe attendu selon le type : un libellé décalé vers un champ d’un autre type est refusé.
const PREFIX = {image: /^(logo|image|vignette)\b/, alt: /^alternative textuelle\b/, url: /^adresse https\b/};
const isTyped = label => Object.values(PREFIX).some(prefix => prefix.test(label)) || label.startsWith('alternative');

// Chaque défaut porte sa règle entre crochets ; clair et sombre sont lus dans les classes du gabarit.
function problems(components) {
  const found = [];
  for (const c of components) {
    const labels = Object.fromEntries(c.fields.map(f => [f.key, f.label]));
    const seen = new Map();
    const report = (key, rule, detail) => found.push(`${c.id} ${key} [${rule}] ${detail}`);
    for (const f of c.fields) {
      const label = normalize(f.label);
      if (!label) report(f.key, 'vide', 'libellé vide');
      if (/(^|\s)\d+(?=\s|$)/.test(label)) report(f.key, 'numéroté', `« ${f.label} »`);
      if (GENERIC.has(label)) report(f.key, 'générique', `« ${f.label} »`);
      // Les messages d’erreur séparent bloc et champ par une virgule (model.js, files.js).
      if (label.includes(',')) report(f.key, 'virgule', `« ${f.label} »`);
      if (seen.has(label)) report(f.key, 'homonyme', `de ${seen.get(label)} « ${f.label} »`);
      seen.set(label, f.key);
      if (PREFIX[f.type] ? !PREFIX[f.type].test(label) : isTyped(label)) report(f.key, 'type', `${f.type} « ${f.label} »`);
      if (f.type === 'url' && (c.family === 'Pieds de page') !== label.startsWith('adresse https ou mailto')) report(f.key, 'protocole', `« ${f.label} »`);
    }
    for (const [, cls, src, alt] of c.template.matchAll(/<img\b(?=[^>]*\bclass="(hide-black|hide-white)")(?=[^>]*\bsrc="\{\{(f\d+)\}\}")(?=[^>]*\balt="\{\{(f\d+)\}\}")[^>]*>/g)) {
      const theme = cls === 'hide-black' ? 'thème clair' : 'thème sombre';
      for (const key of [src, alt]) if (!normalize(labels[key]).includes(theme)) report(key, 'thème', `${theme} non nommé « ${labels[key]} »`);
    }
  }
  return found;
}

test('les libellés de champ changent sans modifier les clés, les types ni l’empreinte contractuelle', () => {
  assert.equal(catalog.id, CONTRACT);
  assert.equal(catalog.components.length, 52);
  assert.equal(catalog.components.reduce((n, c) => n + c.fields.length, 0), 178);
});

test('chaque champ du catalogue porte un libellé explicite, unique dans son bloc (RGAA 11.1, 11.2 ; WCAG 2.4.6)', () => {
  assert.deepEqual(problems(catalog.components), []);
  const themed = catalog.components.filter(c => c.template.includes('class="hide-white"'));
  assert.deepEqual(themed.map(c => c.id), ['mail-02', 'mail-03', 'mail-47', 'mail-48']);
});

test('la compilation nomme la section ou la table quand FIELD_LABELS est mal dimensionnée', () => {
  const code = `import scripts.catalogue as c
def message(change):
    saved = [list(labels) for labels in c.FIELD_LABELS]
    try:
        change(c.FIELD_LABELS)
        c.compile_catalogue()
    except ValueError as error:
        return str(error)
    finally:
        c.FIELD_LABELS[:] = saved
    return ''
print(message(lambda t: t[46].pop()))
print(message(lambda t: t[46].append('Libellé en trop')))
print(message(lambda t: t.pop()))`;
  const [short, extra, table] = execFileSync('python3', ['-B', '-c', code], {cwd: root, encoding: 'utf8'}).trim().split('\n');
  assert.match(short, /mail-46/);
  assert.match(extra, /mail-46/);
  assert.match(table, /FIELD_LABELS/);
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
    numéroté: ['numéroté', mutate('mail-00', label('f0', 'Texte 1'))],
    'numéroté avant un complément': ['numéroté', mutate('mail-46', label('f4', 'Texte 2 de la carte'))],
    générique: ['générique', mutate('mail-18', label('f0', 'Texte'))],
    'générique historique': ['générique', mutate('mail-26', label('f0', 'Image locale'))],
    homonyme: ['homonyme', mutate('mail-20', label('f2', catalog.components[20].fields[1].label))],
    'homonyme à la casse près': ['homonyme', mutate('mail-46', label('f8', catalog.components[46].fields[3].label.toLocaleUpperCase('fr')))],
    'clair et sombre inversés': ['thème', mutate('mail-02', c => { [c.fields[0].label, c.fields[2].label] = [c.fields[2].label, c.fields[0].label]; })],
    'image et titre échangés': ['type', mutate('mail-46', c => { [c.fields[1].label, c.fields[3].label] = [c.fields[3].label, c.fields[1].label]; })],
    'alternative non qualifiée': ['type', mutate('mail-04', label('f1', 'Alternative de l’image'))],
    'texte libellé comme une alternative': ['type', mutate('mail-30', label('f2', 'Alternative textuelle du surtitre'))],
    'image libellée comme une adresse': ['type', mutate('mail-30', label('f0', 'Adresse HTTPS de la vignette'))],
    'protocole de pied de page absent': ['protocole', mutate('mail-49', label('f1', 'Adresse HTTPS du lien de désabonnement'))],
    'mailto hors pied de page': ['protocole', mutate('mail-40', label('f0', 'Adresse HTTPS ou mailto du bouton'))],
    'virgule ambiguë dans les messages': ['virgule', mutate('mail-05', label('f0', 'Titre principal, en tête du courriel'))],
    vide: ['vide', mutate('mail-51', label('f0', ' '))],
  };
  const missed = Object.entries(mutations).filter(([, [rule, found]]) => !found.some(p => p.includes(`[${rule}]`))).map(([name]) => name);
  assert.deepEqual(missed, []);
});
