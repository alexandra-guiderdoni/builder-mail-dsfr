/* Contrat d’import des nouvelles images : réduction et recompression locales par canvas, sans dépendance.
   Les images déjà présentes dans une bibliothèque ou un fichier de travail importé ne passent jamais par ici. */
(() => {
  "use strict";
  const A = window.MailBuilder, M = A.Model;
  const contract = Object.freeze({maxWidth: 1200, quality: 0.82, animatedGifBytes: 1024 * 1024, warningBytes: 300 * 1024});
  const formats = ["image/png", "image/jpeg", "image/gif", "image/webp"];
  const number = value => value.toLocaleString("fr-FR");
  const kio = bytes => `${number(Math.ceil(bytes / 1024))} Kio`, mio = bytes => `${number(Math.ceil(bytes / 104857.6) / 10)} Mio`;
  const payload = value => value.slice(value.indexOf(",") + 1);
  const size = value => { const data = payload(value); return Math.floor(data.length * 3 / 4) - (data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0); };
  // Largeur d’affichage : la plus grande largeur en pixels que le gabarit donne à l’image, sur ordinateur ou sur mobile.
  function displayWidth(componentId, key) {
    const tag = M.component(componentId).semanticTemplate.match(new RegExp(`<img\\b[^>]*\\bsrc="\\{\\{${key}\\}\\}"[^>]*>`))?.[0];
    if (!tag) throw new Error("Champ d’image inconnu.");
    const style = /\bstyle="([^"]*)"/.exec(tag)?.[1] || "";
    const declared = name => Number(new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*(\\d+)px`, "i").exec(style)?.[1]) || 0;
    const responsive = (/\bclass="([^"]*)"/.exec(tag)?.[1] || "").split(/\s+/).filter(Boolean)
      .flatMap(name => [...A.catalog.renderCss.matchAll(new RegExp(`\\.${name}\\s*\\{\\s*width\\s*:\\s*(\\d+)px`, "g"))].map(match => Number(match[1])));
    const ceiling = declared("max-width") || Infinity, auto = /(?:^|;)\s*width\s*:\s*auto\b/i.test(style);
    return Math.min(ceiling, Math.max(Number(/\swidth="(\d+)"/.exec(tag)?.[1]) || 0, declared("width"), ...responsive, auto && ceiling < Infinity ? ceiling : 0));
  }
  // Sans largeur d’affichage connue, la cible retombe sur le plafond.
  const targetWidth = display => display > 0 ? Math.min(contract.maxWidth, 2 * display) : contract.maxWidth;
  function help(componentId, key) {
    return `Formats acceptés : PNG, JPEG, GIF ou WebP, jusqu’à 10 Mio, 8192 pixels par côté et 16 777 216 pixels au total. Une nouvelle image est réduite à ${number(targetWidth(displayWidth(componentId, key)))} pixels de large au plus, puis enregistrée en JPEG si elle est opaque, ou en PNG si elle comporte de la transparence ; un WebP est converti. Un GIF animé est gardé tel quel jusqu’à 1 Mio. Au-delà de 300 Kio après compression, un avertissement s’affiche. Les images déjà présentes ne sont pas modifiées.`;
  }
  // Compte les images d’un GIF jusqu’à la deuxième : au-delà d’une image, il est animé.
  function gifFrames(bytes) {
    const table = flags => flags & 0x80 ? 3 << ((flags & 7) + 1) : 0;
    let position = 13 + table(bytes.charCodeAt(10)), frames = 0;
    const blocks = () => { while (position < bytes.length && bytes.charCodeAt(position)) position += bytes.charCodeAt(position) + 1; position++; };
    while (position < bytes.length && frames < 2) {
      const marker = bytes.charCodeAt(position++);
      if (marker === 0x21) { position++; blocks(); }
      else if (marker === 0x2C) { position += 10 + table(bytes.charCodeAt(position + 8)); blocks(); frames++; }
      else break;
    }
    return frames;
  }
  async function decoded(value) {
    const image = new Image(); image.src = value; await image.decode(); return image;
  }
  const failure = "Image : la réduction a échoué dans ce navigateur ; le fichier original est conservé.";
  async function encode(canvas, type) {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, type, contract.quality));
    if (blob?.type !== type) throw new Error(failure);
    return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error(failure)); reader.readAsDataURL(blob); });
  }
  function opaque(context, width, height) {
    const data = context.getImageData(0, 0, width, height).data;
    for (let i = 3; i < data.length; i += 4) if (data[i] < 255) return false;
    return true;
  }
  async function prepare(file, display) {
    const original = await MailImages.read(file, formats), source = /^data:([^;]+);/.exec(original)[1], bytes = size(original);
    M.image(original);
    const image = await decoded(original), from = [image.naturalWidth, image.naturalHeight];
    if (source === "image/gif" && gifFrames(atob(payload(original))) > 1) {
      if (bytes > contract.animatedGifBytes) throw new Error(`GIF animé refusé : ${mio(bytes)}, au-delà de la limite de 1 Mio. Un GIF animé n’est ni réduit ni recompressé : allégez-le (moins d’images, de couleurs ou de pixels) ou choisissez une image fixe. La composition n’est pas modifiée.`);
      return {value: original, type: source, width: from[0], height: from[1], bytes, animated: true, resized: false};
    }
    const width = Math.min(from[0], targetWidth(display)), height = Math.max(1, Math.round(from[1] * width / from[0]));
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    try {
      const context = canvas.getContext("2d"); if (!context) throw new Error(failure);
      context.imageSmoothingQuality = "high"; context.drawImage(image, 0, 0, width, height);
      const type = source === "image/jpeg" || opaque(context, width, height) ? "image/jpeg" : "image/png", resized = width < from[0];
      let value = await encode(canvas, type);
      // Sans réduction ni changement de format, une recompression plus lourde que l’original n’est pas retenue.
      if (!resized && source === type && bytes <= size(value)) value = original;
      return {value, type, width, height, bytes: size(value), animated: false, resized};
    } finally { canvas.width = canvas.height = 0; }
  }
  function describe(result) {
    const summary = result.animated
      ? `GIF animé conservé tel quel, ${number(result.width)} × ${number(result.height)} pixels, ${kio(result.bytes)}`
      : `${result.resized ? "réduite à " : ""}${number(result.width)} × ${number(result.height)} pixels, ${result.type === "image/png" ? "PNG" : "JPEG"}, ${kio(result.bytes)}`;
    const warning = result.bytes > contract.warningBytes ? ` Attention : ${kio(result.bytes)} après compression, au-delà des 300 Kio conseillés par image ; le courriel sera plus lourd à envoyer et à recevoir. Choisissez si possible une image plus légère.` : "";
    return `Image locale incorporée à la composition : ${summary}.${warning}`;
  }
  A.Images = Object.freeze({contract, displayWidth, targetWidth, help, gifFrames, prepare, describe});
})();
