const assert = require('node:assert/strict');
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

// Oracle du HTML source contrôlé : aucune réparation DOM ne doit transformer <td><tr> en parent valide.
// Les commentaires (dont les variantes MSO) et textes bruts ne définissent pas la parenté de la scène.
function openingAncestorsAt(html, index) {
  const tokens = /<!--[\s\S]*?-->|<![^>]*>|<\/?([a-z][a-z0-9:-]*)\b(?:"[^"]*"|'[^']*'|[^'">])*>/gi;
  const stack = [];
  let match;
  while ((match = tokens.exec(html)) && match.index < index) {
    assert(match.index + match[0].length <= index, 'source-marker : repère situé dans une balise ou un commentaire');
    if (!match[1]) continue;
    const tag = match[1].toLowerCase(), closing = /^<\//.test(match[0]);
    if (closing) {
      const at = stack.findLastIndex(node => node.tag === tag);
      if (at >= 0) stack.length = at;
    } else if (tag === 'script' || tag === 'style') {
      const end = new RegExp(`</${tag}\\s*>`, 'gi'); end.lastIndex = tokens.lastIndex;
      const close = end.exec(html);
      assert(close && index >= close.index + close[0].length, 'source-marker : repère dans un texte brut ou texte brut non terminé');
      tokens.lastIndex = close.index + close[0].length;
    } else if (!VOID.has(tag)) stack.push({tag, opening: match[0], index: match.index});
  }
  return stack;
}
function tableWidthPx(openTag) {
  // Tokeniser les attributs entiers évite data-width et les faux attributs dans une valeur citée.
  const attributes = new Map();
  const body = openTag.replace(/^<[a-z][a-z0-9:-]*/i, '');
  const token = /\s+([^\s/=>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/gy;
  let match;
  while ((match = token.exec(body))) {
    const name = match[1].toLowerCase();
    // Comme le parseur HTML, conserver le premier attribut en cas de doublon.
    if (!attributes.has(name)) attributes.set(name, match[2] ?? match[3] ?? match[4] ?? '');
  }
  const style = attributes.get('style');
  const width = style && /(?:^|;)\s*width\s*:\s*(\d+)px\s*(?:;|$)/i.exec(style);
  if (width) return Number(width[1]);
  const attr = attributes.get('width');
  return attr && /^\d+$/.test(attr) ? Number(attr) : 0;
}
function assertEditorialSource(html, needle, expectedWidth = 496) {
  const index = html.indexOf(needle);
  assert(index >= 0 && html.indexOf(needle, index + 1) < 0, 'source-marker : lien source absent ou ambigu');
  const ancestors = openingAncestorsAt(html, index);
  const row = ancestors.findLastIndex(node => node.tag === 'tr');
  assert(row > 0, 'source-row : le lien doit appartenir à une rangée');
  const cell = ancestors.findLastIndex(node => node.tag === 'td' || node.tag === 'th');
  assert(cell > row && ancestors[cell - 1]?.tag === 'tr', 'source-cell : la cellule doit appartenir à la rangée source');
  const rowParent = ancestors[row - 1];
  assert(['table', 'tbody', 'thead', 'tfoot'].includes(rowParent.tag), `source-row-parent : rangée sous ${rowParent.tag}, pas sous une table ou section`);
  const table = rowParent.tag === 'table' ? rowParent : ancestors[row - 2];
  assert(table?.tag === 'table', 'source-row-context : section de rangées hors table');
  const nearestTable = ancestors.findLast(node => node.tag === 'table');
  assert(nearestTable === table, 'source-table-context : lien dans une sous-table de la rangée source');
  const width = tableWidthPx(table.opening);
  assert.equal(width, expectedWidth, `source-editorial-width : attendu ${expectedWidth} px, trouvé ${width} px`);
  const tables = ancestors.filter(node => node.tag === 'table');
  for (const node of tables) {
    const ancestorWidth = tableWidthPx(node.opening);
    if (ancestorWidth) assert(ancestorWidth >= expectedWidth, `source-subtable-width : table ancêtre de ${ancestorWidth} px`);
  }
  return {ancestors, rowParent, table, width, tables};
}
module.exports = {openingAncestorsAt, tableWidthPx, assertEditorialSource};
