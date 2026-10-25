// Préparation de la géométrie : chargement de toutes les sources, y compris masquées,
// puis fontes terminées. Ce contrat ne certifie ni decode() ni la peinture des pixels.
async function waitForPreviewResources(frame, {url, title, imageCount, timeout = 10000}) {
  const expected = {url, title, imageCount};
  const resources = await frame.waitForFunction(expected =>
    location.href === expected.url && document.title === expected.title && document.readyState === 'complete' &&
    document.images.length === expected.imageCount &&
    [...document.images].every(image => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0), expected, {timeout});
  await resources.dispose();
  const fonts = await frame.waitForFunction(async expected => {
    await document.fonts.ready;
    // Une navigation ou une mutation pendant l'attente des fontes ne valide pas un autre document.
    return location.href === expected.url && document.title === expected.title && document.readyState === 'complete' &&
      document.images.length === expected.imageCount &&
      [...document.images].every(image => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0);
  }, expected, {timeout});
  await fonts.dispose();
}

module.exports = {waitForPreviewResources};
