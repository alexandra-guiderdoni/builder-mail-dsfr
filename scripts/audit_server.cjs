/* Serveur de recette en boucle locale : seules les distributions et sorties synthétiques. */
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const directory = path.resolve(root, process.env.BUILDER_AUDIT_OUTPUT || 'evidence/accessibilite-20261022');
const server = http.createServer(async (request, response) => {
  const route = new URL(request.url, 'http://localhost').pathname;
  const web = ['index.html', 'sw.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png'];
  let file;
  if (route === '/') file = 'app/distribution/web/index.html';
  else if (web.includes(route.slice(1))) file = 'app/distribution/web/' + route.slice(1);
  else if (route === '/portable.html') file = 'app/distribution/portable.html';
  else if (route === '/snum.html') file = 'app/distribution/snum.html';
  else if (/^\/mail\/\d{2}\.html$/.test(route)) file = path.join(directory, 'exports', path.basename(route));
  else { response.writeHead(404); response.end(); return; }
  // Lire avant d’écrire l’en-tête : un fichier listé mais absent donne un 404 propre.
  let body;
  try { body = await fs.readFile(path.resolve(root, file)); } catch { response.writeHead(404); response.end(); return; }
  const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png'};
  response.writeHead(200, {'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-store'});
  response.end(body);
});
server.listen(Number(process.env.BUILDER_AUDIT_PORT || 4187), '127.0.0.1', async () => {
  await fs.mkdir(directory, {recursive: true});
  const address = `http://127.0.0.1:${server.address().port}/`;
  await fs.writeFile(path.join(directory, 'server.json'), JSON.stringify({pid: process.pid, address}, null, 2));
  console.log(address);
});
