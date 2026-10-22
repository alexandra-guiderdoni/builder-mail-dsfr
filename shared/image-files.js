/* Décodage natif partagé : imports et fichiers locaux, sans modification des données. */
(() => {
  "use strict";
  const maxBytes = 10 * 1024 * 1024, maxSide = 8192, maxPixels = 16 * 1024 * 1024;
  async function decode(value, label = "Image") {
    const payload = value.slice(value.indexOf(",") + 1), padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
    if (Math.floor(payload.length * 3 / 4) - padding > maxBytes) throw new Error(`${label} : limite de 10 Mio par image dépassée ; le fichier original est conservé.`);
    const image = new Image(); image.src = value;
    try { await image.decode(); if (!image.naturalWidth || !image.naturalHeight) throw new Error(); }
    catch { throw new Error(`${label} : le contenu de l’image est illisible ou incomplet.`); }
    if (image.naturalWidth > maxSide || image.naturalHeight > maxSide || image.naturalWidth * image.naturalHeight > maxPixels) throw new Error(`${label} : limites de 8192 pixels par côté et 16 777 216 pixels dépassées ; le fichier original est conservé.`);
  }
  async function validate(entries) {
    const seen = new Set();
    for (const {value, label} of entries) if (!seen.has(value)) { await decode(value, label); seen.add(value); }
  }
  async function read(file, formats) {
    if (!file || !formats.includes(file.type)) throw new Error("Choisissez un fichier image dans un format pris en charge.");
    if (file.size > maxBytes) throw new Error("Image : limite de 10 Mio dépassée ; le fichier original est conservé.");
    const value = await new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error("Le fichier image est illisible.")); reader.readAsDataURL(file);
    });
    await decode(value); return value;
  }
  window.MailImages = Object.freeze({decode, validate, read});
})();
