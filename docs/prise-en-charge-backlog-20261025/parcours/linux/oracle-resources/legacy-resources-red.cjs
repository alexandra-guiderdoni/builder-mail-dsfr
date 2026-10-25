async function waitForPreviewResources(frame, {title}) {
  await frame.waitForFunction(expected => document.title === expected, title);
  await frame.evaluate(async () => {
    await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
    await document.fonts.ready;
  });
}

module.exports = {waitForPreviewResources};
