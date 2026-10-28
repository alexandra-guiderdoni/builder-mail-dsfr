// Trois compositions synthétiques reproductibles, aucune donnée utilisatrice.
// La fonction est autonome pour être exécutée telle quelle dans le navigateur.
module.exports = function weightCompositions() {
  const {Model: M, catalog} = MailBuilder, index = id => catalog.components.findIndex(c => c.id === id);
  const normal = M.create('Défaut');
  const paragraph = index('mail-19');
  const text = M.create('Texte dominant', [index('mail-02'), ...Array(30).fill(paragraph), index('mail-47')]);
  for (const block of text.blocks.slice(1, -1)) block.values[M.component(block.component).fields[0].key] = 'Un texte rédigé avec des accents, pour vérifier les octets UTF-8. '.repeat(100);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1000;
  const ctx = canvas.getContext('2d'), data = ctx.createImageData(1000, 1000); let seed = 191;
  for (let i = 0; i < data.data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    data.data[i] = data.data[i + 1] = data.data[i + 2] = seed >>> 24; data.data[i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  const image = M.create('Image dominante', [index('mail-26')]), field = M.component('mail-26').fields.find(f => f.type === 'image');
  image.blocks[0].values[field.key] = canvas.toDataURL('image/png');
  return {normal, text, image};
};
