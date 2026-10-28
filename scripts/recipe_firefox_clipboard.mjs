// PDG-LARGE-FILE-JUSTIFICATION: A single comparative recipe owns both Firefox profiles and each private clipboard transaction, so interruption, cleanup and publication guards share one lifecycle.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFile, execFileSync} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID, createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {Firefox} from '../tests/firefox-support.mjs';
import collectors from './collector_receipt.cjs';
const {newCollection, beginCollection, finishCollection, collectionFailure} = collectors;
const execute = promisify(execFile), hash = value => createHash('sha256').update(value).digest('hex');
const root = path.resolve(import.meta.dirname, '..');

export function publicationGuard(expected, observed) {
  // Publication is narrower than native semantic equivalence: no unrecognized serialization is released.
  const normalize = value => typeof value === 'string' ? value.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n') : null;
  return typeof expected?.html === 'string' && typeof expected?.plain === 'string' &&
    normalize(expected.html) === normalize(observed?.html) && normalize(expected.plain) === normalize(observed?.plain);
}

export function receiptMatches(current, attributed) {
  return Number.isInteger(attributed?.change_count) && /^[a-f0-9]{64}$/.test(attributed?.digest || '') &&
    current?.change_count === attributed.change_count && current?.digest === attributed.digest;
}

export function runCompleted(variants, signal) {
  return !signal && variants.length === 2 && variants.every(v => !v.interrupted && !v.collection_errors.length && !v.cleanup_errors.length && v.restoreVerified);
}

export async function finalizeRun(report, interrupted, persist) {
  const initialSignal = interrupted.signal;
  const mark = () => {
    report.interrupted = interrupted.signal;
    collectionFailure(report, 'collection', new Error('Recette interrompue : ' + interrupted.signal));
  };
  if (initialSignal) mark();
  await persist();
  // A signal can arrive while the first receipt's bytes are already serialized.
  if (!initialSignal && interrupted.signal) { mark(); await persist(); }
}

export function compareProperties(expected, observed) {
  const equalHash = key => /^[a-f0-9]{64}$/.test(expected[key] || '') && expected[key] === observed[key];
  const checks = {
    marker_html: observed.markerHTML === true, marker_plain: observed.markerPlain === true,
    styles: expected.styles === observed.styles && expected.styles > 0 && equalHash('styleContentHash'),
    images: JSON.stringify(expected.images) === JSON.stringify(observed.images) && expected.images.length > 0,
    preheader: expected.preheader === true && observed.preheader === true,
    mso_declarations: expected.msoDeclarations === observed.msoDeclarations && expected.msoDeclarations > 0 && equalHash('msoContentHash'),
    mso_hide: expected.msoHide === observed.msoHide && expected.msoHide > 0,
    width_bounds: expected.widthBounds === observed.widthBounds && equalHash('widthContentHash'),
    plain_text: expected.plainNormalizedHash === observed.plainNormalizedHash,
  };
  return {checks, matches: Object.values(checks).every(Boolean), byteEqualityRequired: false};
}

export function classifyCopy(api, before, after, capture, comparison) {
  const metadata = {digestChanged: before.digest !== after.digest,
    changeCountChanged: before.change_count !== after.change_count};
  if (!api?.resolved || !api?.markerConfirmed) return {kind: 'api_not_confirmed', ...metadata};
  if (!capture?.captured) return {kind: metadata.digestChanged || metadata.changeCountChanged ? 'system_changed_without_owned_capture' : 'api_only_system_not_observed', ...metadata};
  if (capture.digest !== after.digest || capture.change_count !== after.change_count) return {kind: 'clipboard_changed_during_observation', ...metadata};
  if (!metadata.digestChanged || !metadata.changeCountChanged || !comparison?.matches) return {kind: 'system_copy_not_qualified', ...metadata};
  return {kind: 'system_copy_observed', ...metadata};
}

// Runs in the fresh owned Firefox, never against the pre-existing system clipboard.
async function htmlProperties(html, plain, marker, preheader) {
  const digest = async text => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))).map(x => x.toString(16).padStart(2, '0')).join('');
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const styleContent = [...doc.querySelectorAll('style')].map(e => e.textContent.replace(/\r\n/g, '\n'));
  const inlineProperties = [...doc.querySelectorAll('[style]')].map((e,index) => ({index,tag:e.tagName,
    mso:[...e.style].filter(name=>name.startsWith('mso-')).map(name=>[name,e.style.getPropertyValue(name).trim(),e.style.getPropertyPriority(name)]),
    width:[...e.style].filter(name=>/^(inline-size|min-inline-size|max-inline-size|width|min-width|max-width)$/.test(name)).map(name=>[name,e.style.getPropertyValue(name).trim(),e.style.getPropertyPriority(name)])}));
  // Raw mso declarations remain necessary: DOM CSS parsers may drop unknown Microsoft properties.
  const msoRaw = [...html.matchAll(/\bmso-[\w-]+\s*:[^;"<>}]+/gi)].map(match=>match[0].trim());
  const images = [];
  for (const image of doc.images) images.push({srcHash: await digest(image.getAttribute('src') || ''), alt: image.getAttribute('alt') || ''});
  return {markerHTML: html.includes(marker), markerPlain: plain.includes(marker), styles: doc.querySelectorAll('style').length,
    styleContentHash: await digest(JSON.stringify(styleContent)),
    msoContentHash: await digest(JSON.stringify({raw:msoRaw,inline:inlineProperties.filter(p=>p.mso.length)})),
    widthContentHash: await digest(JSON.stringify(inlineProperties.filter(p=>p.width.length))),
    images, preheader: (doc.body?.textContent || '').includes(preheader),
    msoDeclarations: (html.match(/\bmso-[\w-]+\s*:/gi) || []).length,
    msoHide: (html.match(/\bmso-hide\s*:\s*all/gi) || []).length,
    widthBounds: (html.match(/inline-size\s*:\s*min\(/gi) || []).length,
    plainNormalizedHash: await digest(plain.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')),
    plainNormalization: 'Decoded text: remove initial BOM and normalize CRLF to LF only',
    serialization: {utf8Bytes: new TextEncoder().encode(html).length, doctype: doc.doctype?.name || null,
      metaTags: [...doc.querySelectorAll('meta')].map(e => e.outerHTML)}};
}

export function parseOptions(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--run-native') {
      if (result.runNative) throw new Error('Arguments de recette invalides.');
      result.runNative = true; continue;
    }
    const keys = {'--output': 'output', '--expected-sha': 'expectedSHA', '--clipboard-helper': 'helper'};
    const key = keys[argv[i]];
    if (!key || !argv[i + 1] || argv[i + 1].startsWith('--') || result[key]) throw new Error('Arguments de recette invalides.');
    result[key] = argv[++i];
  }
  if (!result.runNative || !result.output || !result.helper || !/^[0-9a-f]{40}$/.test(result.expectedSHA || '')) {
    throw new Error('Exiger --run-native --output DOSSIER_NEUF --expected-sha SHA40 --clipboard-helper BINAIRE_RELU.');
  }
  result.output = path.resolve(result.output); result.helper = path.resolve(result.helper);
  if (result.output === root || result.output.startsWith(root + path.sep)) throw new Error('Les preuves doivent être hors du dépôt figé.');
  return result;
}

async function swift(helper, args) {
  try {
    const {stdout} = await execute(helper, args, {encoding: 'utf8', timeout: 20000, maxBuffer: 1024 * 1024});
    const result = JSON.parse(stdout);
    if (result.ok === false) throw Object.assign(new Error(result.error || 'CLIPBOARD_HELPER_FAILED'), {safeResult: result});
    return result;
  } catch (error) {
    // Never print raw child output or Foundation errors that could include clipboard representations.
    let safe = error.safeResult;
    if (!safe && error.stdout) { try { safe = JSON.parse(error.stdout); } catch {} }
    throw Object.assign(new Error(safe?.error || 'CLIPBOARD_HELPER_FAILED'), {safeResult: safe, code: safe?.error || 'CLIPBOARD_HELPER_FAILED'});
  }
}

async function frozenSources(expectedSHA, helper) {
  const head = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
  assert.equal(head, expectedSHA, 'SHA différent de la référence autorisée');
  assert.equal(execFileSync('git', ['status', '--porcelain'], {cwd: root, encoding: 'utf8'}).trim(), '', 'Un candidat propre et commité est requis');
  const files = execFileSync('git', ['ls-files', 'app/source', 'app/snum', 'shared', 'app/distribution', 'scripts/build_app.py',
    'scripts/recipe_firefox_clipboard.mjs', 'scripts/clipboard_recipe.swift', 'scripts/collector_receipt.cjs', 'tests/firefox-support.mjs'], {cwd: root, encoding: 'utf8'}).trim().split('\n').filter(Boolean);
  for (const required of ['scripts/recipe_firefox_clipboard.mjs', 'scripts/clipboard_recipe.swift', 'tests/firefox-support.mjs', 'app/distribution/portable.html']) assert(files.includes(required), 'Source de recette non versionnée');
  const stat = await fs.lstat(helper); assert(stat.isFile() && !stat.isSymbolicLink(), 'Helper compilé explicite requis');
  const sources = Object.fromEntries(await Promise.all(files.map(async file => [file, hash(await fs.readFile(path.join(root, file)))])));
  sources[helper] = hash(await fs.readFile(helper));
  return sources;
}

async function prepareFixture(firefox, marker, preheader) {
  await firefox.navigate(pathToFileURL(path.join(root, 'app/distribution/portable.html')).href);
  assert.equal(firefox.allocation?.status, 'owned-session');
  await firefox.click('[data-action=resume-document]');
  const expected = await firefox.evaluate(`(async()=>{
    const A=MailBuilder,marker=${JSON.stringify(marker)},preheader=${JSON.stringify(preheader)};
    const doc=A.Model.create('Recette Firefox '+marker,[0,2,31,47]);
    doc.subject='Recette Firefox '+marker;doc.blocks[0].values.f0=preheader;
    for(const field of A.Model.component('mail-31').fields)if(field.type==='text')doc.blocks[2].values[field.key]=marker+' — contenu synthétique';
    for(const block of doc.blocks)for(const field of A.Model.component(block.component).fields)if(field.type==='url')block.values[field.key]='https://exemple.invalid/recette';
    await A.State.change(lib=>{lib.documents=[doc];lib.activeId=doc.id});
    const html=A.Render.clipboardHtml(A.doc()),plain=A.Render.plain(A.doc());
    if(!html.includes(marker)||!plain.includes(marker))throw Error('Marqueur synthétique absent des sorties attendues');
    return{html,plain};
  })()`);
  await firefox.wait(`document.getElementById('save-state').textContent==='Bibliothèque sauvegardée dans ce navigateur.'`);
  return expected;
}

export async function observeNativeWrite(firefox, marker, beforeCopy) {
  await firefox.evaluate(`(()=>{
    const proto=window.Clipboard?.prototype,original=proto?.write,marker=${JSON.stringify(marker)};
    if(typeof original!=='function')throw Error('Clipboard.write indisponible');
    window.__clipboardRecipeAPI={started:false,resolved:false,settled:false};
    proto.write=function(items){
      const record=window.__clipboardRecipeAPI={started:true,resolved:false,settled:false};let promise;
      try{promise=original.call(this,items)}catch(error){record.error=error.name;record.settled=true;throw error}
      Promise.resolve(promise).then(async()=>{
        record.resolved=true;
        try{const item=items[0],html=await(await item.getType('text/html')).text(),plain=await(await item.getType('text/plain')).text();
          record.markerConfirmed=html.includes(marker)&&plain.includes(marker);
          if(record.markerConfirmed){const h=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');record.htmlHash=await h(html);record.plainHash=await h(plain)}
        }catch(error){record.observationError=error.name}finally{record.settled=true}
      },error=>{record.error=error.name;record.settled=true});
      return promise;
    };return true;
  })()`);
  await beforeCopy();
  await firefox.click('[data-action=copy]');
  await firefox.wait(`document.getElementById('check-dialog').open||window.__clipboardRecipeAPI.settled||!document.getElementById('error').hidden`);
  if (await firefox.evaluate(`document.getElementById('check-dialog').open`)) {
    await beforeCopy();
    await firefox.click('#check-confirm');
  }
  await firefox.wait(`window.__clipboardRecipeAPI.settled||!document.getElementById('error').hidden`);
  return firefox.evaluate(`({...window.__clipboardRecipeAPI,notice:document.getElementById('notice').textContent,errorVisible:!document.getElementById('error').hidden})`);
}

async function variant(config, mode, interrupted) {
  const directory = path.join(config.output, mode); await fs.mkdir(directory, {mode: 0o700});
  const nonce = randomUUID(), marker = 'BUILDER_FIREFOX_COPY_' + nonce, preheader = marker + '-PREHEADER';
  const report = {mode, headlessRequested: mode === 'headless', marker, collection_errors: [], cleanup_errors: [], restoreVerified: false};
  const firefox = new Firefox(path.join(directory, 'browser'), {headless: mode === 'headless'});
  const privateDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'builder-clipboard-private-')); await fs.chmod(privateDirectory, 0o700);
  const backup = path.join(privateDirectory, 'original.plist'); let saved, lastOwned, restore, stopped;
  interrupted.active = firefox;
  try {
    if (interrupted.signal) throw new Error('Recette interrompue avant allocation.');
    await firefox.start(); report.browser = firefox.version; report.allocation = firefox.allocation;
    assert.equal(firefox.allocation?.mode, mode); assert.equal(firefox.allocation?.status, 'owned-session');
    const expected = await prepareFixture(firefox, marker, preheader);
    report.expected = await firefox.evaluate(`(${htmlProperties.toString()})(${JSON.stringify(expected.html)},${JSON.stringify(expected.plain)},${JSON.stringify(marker)},${JSON.stringify(preheader)})`);
    await fs.writeFile(path.join(directory, 'expected-api.html'), expected.html, {flag: 'wx', mode: 0o600});
    await fs.writeFile(path.join(directory, 'expected-api.txt'), expected.plain, {flag: 'wx', mode: 0o600});
    if (interrupted.signal) throw new Error('Recette interrompue avant transaction presse-papiers.');
    saved = await swift(config.helper, ['backup', backup, nonce]);
    assert.equal(saved.backup_created, true);
    if (interrupted.signal) throw new Error('Recette interrompue avant témoin.');
    const before = await swift(config.helper, ['witness', backup, nonce]); assert.equal(before.witness_observed, true); lastOwned = before;
    if (interrupted.signal) throw new Error('Recette interrompue avant copie.');
    if (mode === 'visible') await firefox.call('browsingContext.activate', {context: firefox.context});
    report.contextState = await firefox.evaluate('({hasFocus:document.hasFocus(),visibilityState:document.visibilityState})');
    if (mode === 'visible') assert.equal(report.contextState.hasFocus, true, 'La fenêtre Firefox possédée doit avoir le focus');
    const api = await observeNativeWrite(firefox, marker, async () => {
      const current = await swift(config.helper, ['metadata']);
      assert(receiptMatches(current, lastOwned), 'Clipboard conflict before Firefox keyboard copy');
      if (interrupted.signal) throw new Error('Recette interrompue avant action Firefox.');
    });
    report.api = api;
    assert.equal(api.resolved, true, 'API Clipboard.write non résolue');
    assert.equal(api.markerConfirmed, true, 'Payload API hors témoin synthétique');
    assert.equal(api.htmlHash, hash(expected.html)); assert.equal(api.plainHash, hash(expected.plain));
    const after = await swift(config.helper, ['metadata']);
    const privatePrefix = path.join(privateDirectory, 'system-copy');
    const capture = await swift(config.helper, ['capture', privatePrefix, nonce]);
    report.systemCapture = {captured: false, reason: capture.reason || 'PRIVATE_STAGING_ONLY'};
    if (capture.captured) {
      const html = await fs.readFile(privatePrefix + '.html', 'utf8'), plain = await fs.readFile(privatePrefix + '.txt', 'utf8');
      const publishable = publicationGuard(expected, {html, plain});
      report.publicationGuard = {matches: publishable, method: 'Complete decoded payload equality, initial BOM/CRLF normalization only', semanticEquivalenceNotInferred: true};
      assert(publishable, 'Private capture differs from the complete expected synthetic payload; no content published');
      assert.equal(capture.digest, after.digest, 'Clipboard changed during observation');
      assert.equal(capture.change_count, after.change_count, 'Clipboard changed during observation');
      lastOwned = capture;
      await fs.writeFile(path.join(directory, 'system-copy.html'), html, {flag:'wx',mode:0o600});
      await fs.writeFile(path.join(directory, 'system-copy.txt'), plain, {flag:'wx',mode:0o600});
      report.systemCapture = capture;
      report.observed = await firefox.evaluate(`(${htmlProperties.toString()})(${JSON.stringify(html)},${JSON.stringify(plain)},${JSON.stringify(marker)},${JSON.stringify(preheader)})`);
      report.comparison = compareProperties(report.expected, report.observed);
      report.byteTransformation = {apiHtmlUTF8: Buffer.byteLength(expected.html), systemDecodedHtmlUTF8: Buffer.byteLength(html),
        apiPlainUTF8: Buffer.byteLength(expected.plain), systemDecodedPlainUTF8: Buffer.byteLength(plain),
        htmlByteEqualityObserved: html === expected.html, note: 'Byte identity is measured, never required or presumed; raw flavor sizes/hashes are in the guarded capture.'};
    }
    report.outcome = classifyCopy(api, before, after, capture, report.comparison);
    if (mode === 'visible') assert.equal(report.outcome.kind, 'system_copy_observed', 'Copie système visible non qualifiée');
  } catch (error) {
    if (error.safeResult?.owned_receipt) lastOwned = error.safeResult.owned_receipt;
    report.collection_errors.push({code: error.code || null, message: error.message});
  } finally {
    try { stopped = await firefox.stop(); report.cleanup = stopped;
      if (!stopped || stopped.cleanup_error !== null) report.cleanup_errors.push({resource: 'owned-firefox', error: stopped?.cleanup_error || 'cleanup receipt absent'});
    } catch (error) { report.cleanup_errors.push({resource: 'owned-firefox', error: error.message}); }
    // A pending writer must not be allowed to overwrite the restored original after an uncertain close.
    if (saved?.backup_created) {
      if (stopped?.cleanup_error === null && stopped.exit_observed === true) {
        try {
          // If no mutation was attributed, only the unchanged original receipt is admissible.
          const attributed = lastOwned || saved;
          const current = await swift(config.helper, ['metadata']);
          assert(receiptMatches(current, attributed) || receiptMatches(current, saved), 'Clipboard conflict before restore; private backup retained');
          restore = await swift(config.helper, ['restore', backup, nonce, attributed.digest, String(attributed.change_count)]);
          report.restoreVerified = restore.restored === true && restore.backup_removed === true && restore.all_items_types_data_equal === true && restore.digest === saved.digest;
          if (!report.restoreVerified) report.cleanup_errors.push({resource: 'clipboard', error: 'Restoration not verified'});
        } catch (error) { report.cleanup_errors.push({resource: 'clipboard', error: error.message}); }
      } else report.cleanup_errors.push({resource: 'clipboard', error: 'Restoration deferred: owned writer exit not observed'});
    }
    // Staging files are ours but may contain a foreign payload: delete privately, never publish on mismatch.
    for (const suffix of ['.html', '.txt']) {
      try { await fs.unlink(path.join(privateDirectory, 'system-copy' + suffix)); }
      catch (error) { if (error.code !== 'ENOENT') report.cleanup_errors.push({resource:'private-staging',error:'Private staging removal failed'}); }
    }
    if (interrupted.signal) report.interrupted = interrupted.signal;
    try { await fs.rmdir(privateDirectory); }
    catch { report.privateBackupRetained = true; report.cleanup_errors.push({resource: 'private-backup', error: 'Private recovery directory retained outside public evidence'}); console.error('PRIVATE_RECOVERY_DIRECTORY=' + privateDirectory); }
    interrupted.active = null;
    await fs.writeFile(path.join(directory, 'receipt.json'), JSON.stringify(report, null, 2) + '\n', {flag: 'wx', mode: 0o600});
  }
  return report;
}

async function main(argv) {
  const config = parseOptions(argv); await fs.mkdir(config.output, {mode: 0o700});
  const report = newCollection(root, {expected_sha: config.expectedSHA, variants: [], errors: [], scope: 'Firefox native headless versus visible; no mail client',
    instrumentation: 'Clipboard.write pass-through observation returning the original promise; fresh synthetic profile', not_verified: ['Outlook', 'Mélissa', 'Windows', 'VoiceOver']});
  const interrupted = {signal: null, active: null};
  const stop = signal => { report.interrupted = signal; report.completed = false; interrupted.signal = signal; void interrupted.active?.stop().catch(() => {}); };
  const onInterrupt = () => stop('SIGINT'), onTerminate = () => stop('SIGTERM');
  process.on('SIGINT', onInterrupt); process.on('SIGTERM', onTerminate);
  try {
    await beginCollection(config.output, 'receipt.json', report);
    report.sourceSha256 = await frozenSources(config.expectedSHA, config.helper);
    for (const mode of ['headless', 'visible']) {
      if (interrupted.signal) throw new Error('Recette interrompue : ' + interrupted.signal);
      const result = await variant(config, mode, interrupted); report.variants.push(result);
      for (const error of result.collection_errors) collectionFailure(report, 'collection', new Error(mode + ': ' + error.message));
      for (const error of result.cleanup_errors) collectionFailure(report, 'cleanup', new Error(mode + ': ' + error.error));
      if (result.cleanup_errors.length) break; // Do not start another variant while restoration/ownership is unknown.
    }
    report.completed = runCompleted(report.variants, interrupted.signal);
  } catch (error) { collectionFailure(report, 'collection', error); }
  finally {
    await finalizeRun(report, interrupted, () => finishCollection({root, output: config.output, filename: 'receipt.json', report, sources: report.sourceSha256}));
    process.off('SIGINT', onInterrupt); process.off('SIGTERM', onTerminate);
    if (!report.completed) process.exitCode = 1;
    console.log(JSON.stringify({run_id: report.run_id, completed: report.completed, variants: report.variants.map(v => ({mode: v.mode, outcome: v.outcome, restoreVerified: v.restoreVerified})), errors: report.errors}));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main(process.argv.slice(2));
