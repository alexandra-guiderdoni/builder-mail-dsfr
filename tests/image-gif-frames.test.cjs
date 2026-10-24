const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

// Comptage des images d’un GIF : la décision de #33 conserve un GIF animé tel quel jusqu’à 1 Mio.
function images() {
  const scope = {MailBuilder: {Model: {}, catalog: {}}}; scope.window = scope;
  vm.runInNewContext(fs.readFileSync(path.join(root, 'app/source/images.js'), 'utf8'), scope);
  return scope.MailBuilder.Images;
}
const u16 = value => Buffer.from([value & 255, value >> 8]);
function gif(frames, local = false) {
  const palette = Buffer.alloc(128 * 3, 9), parts = [Buffer.from('GIF89a'), u16(20), u16(10), Buffer.from([local ? 0 : 0xF6, 0, 0]), ...(local ? [] : [palette])];
  parts.push(Buffer.from([0x21, 0xFF, 0x0B]), Buffer.from('NETSCAPE2.0'), Buffer.from([3, 1, 0, 0, 0]));
  for (let f = 0; f < frames; f++) {
    parts.push(Buffer.from([0x21, 0xF9, 4, 0, 10, 0, 0, 0, 0x2C]), u16(0), u16(0), u16(20), u16(10), Buffer.from([local ? 0x86 : 0]), ...(local ? [palette] : []), Buffer.from([7]));
    const codes = [128]; for (let i = 0; i < 200; i++) { if (i && i % 100 === 0) codes.push(128); codes.push(i % 128); } codes.push(129);
    parts.push(Buffer.from([codes.length, ...codes]), Buffer.from([0]));
  }
  return Buffer.concat([...parts, Buffer.from([0x3B])]).toString('latin1');
}

test('un GIF est compté animé dès sa deuxième image, même tronqué, et le comptage termine toujours', () => {
  const {gifFrames} = images();
  assert.equal(gifFrames(gif(1)), 1); assert.equal(gifFrames(gif(1, true)), 1);
  assert.equal(gifFrames(gif(2)), 2); assert.equal(gifFrames(gif(2, true)), 2); assert.equal(gifFrames(gif(12)), 2);
  const two = gif(2), second = two.indexOf('\x21\xF9', two.indexOf('\x21\xF9') + 1) + 8;
  assert.equal(gifFrames(two.slice(0, second + 20)), 2, 'deuxième image tronquée dans ses données');
  for (const short of ['', 'GIF89a', two.slice(0, 40)]) assert(gifFrames(short) <= 1);
  let seed = 7; const random = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296;
  for (let i = 0; i < 500; i++) {
    let value = 'GIF89a'; for (let k = 0, n = 13 + Math.floor(random() * 2000); k < n; k++) value += String.fromCharCode(Math.floor(random() * 256));
    const frames = gifFrames(value); assert(frames >= 0 && frames <= 2);
  }
});
