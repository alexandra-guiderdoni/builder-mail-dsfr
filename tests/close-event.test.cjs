const test = require('node:test');
const assert = require('node:assert/strict');
const {fixture} = require('./modal-dom.cjs');
const warning = f => [{block:f.doc.blocks[0].id, field:'field-f0', message:'À vérifier.'}];
const start = f => f.A.Checks.confirm('export',warning(f));

test('le lien d’avertissement cible son champ dès la fermeture sans remonter les aperçus', async () => {
  const f = fixture(), calls = [];
  f.A.Preview.show(f.doc);
  f.A.UI = {blockList() { calls.push('blocks'); }, fields() { calls.push('fields'); }};
  const block = f.doc.blocks[0].id, field = f.element('document-name');
  const result = f.A.Checks.confirm('export', [{block, field: 'document-name', message: 'À vérifier.'}]);
  f.element('check-list').emit('click', {target: {closest() { return {dataset: {checkIndex: '0'}}; }}});
  assert.equal(f.element('check-dialog').open, false);
  assert.equal(f.A.selected, block);
  assert.equal(f.document.activeElement, field, 'le champ est ciblé avant la tâche close');
  assert.deepEqual(calls, ['blocks', 'fields']);
  assert.equal(f.element('preview'), undefined);
  f.drainClose();
  assert.equal(await result, false);
  assert.deepEqual(calls, ['blocks', 'fields'], 'aucune restitution de focus en double');
  assert.ok(f.element('preview'));
});

test('public confirm: fond et autorisation restent suspendus jusqu’au close associé', async () => {
  const f=fixture(); f.A.Preview.show(f.doc);
  let outputs=0;
  const result=start(f); result.then(go=>{if(go) outputs++;});
  f.element('check-form').emit('submit');
  assert.equal(f.element('check-dialog').open,false);
  assert.equal(f.element('preview'),undefined,'aucun nouvel iframe avant close');
  await Promise.resolve(); assert.equal(outputs,0,'pas de go avant restauration');
  f.drainClose(); assert.equal(await result,true); await Promise.resolve();
  assert.equal(outputs,1); assert.ok(f.element('preview')); assert.ok(f.element('catalogue-preview'));
});

test('closeA puis closeB en file: closeA ne restaure ni n’autorise B', async () => {
  const f=fixture();f.A.Preview.show(f.doc);
  const a=start(f);f.element('check-form').emit('submit');
  const b=start(f);f.element('check-form').emit('submit');
  let bDone=false;b.then(()=>bDone=true);
  f.drainClose();await Promise.resolve();
  assert.equal(f.element('preview'),undefined,'le bail B attend son événement');
  assert.equal(bDone,false);assert.equal(await a,true);
  f.drainClose();assert.equal(await b,true);assert.ok(f.element('preview'));
});

test('une erreur de restauration rejette go avant toute sortie', async () => {
  const f=fixture();f.A.Preview.show(f.doc);let outputs=0;
  const error=new Error('restore failed'),result=start(f);
  const rejected=assert.rejects(result,cause=>cause===error);
  result.then(()=>outputs++,()=>{});f.failNextClone(error);
  f.element('check-form').emit('submit');f.drainClose();await rejected;
  assert.equal(outputs,0);
});

test('fermeture native puis réouverture puis fermeture avant le premier événement', async () => {
  const f=fixture();f.A.Preview.show(f.doc);
  const a=start(f);f.element('check-dialog').close();
  const b=start(f);f.element('check-dialog').close();
  f.drainClose();assert.equal(await a,false);assert.equal(f.element('preview'),undefined);
  f.drainClose();assert.equal(await b,false);assert.ok(f.element('preview'));
});

test('close refusé: primaire immédiate, bail mort retenu jusqu’à une fermeture effective', async () => {
  const f=fixture();f.A.Preview.show(f.doc);const d=f.element('check-dialog'),close=d.close.bind(d);
  const error=new Error('close refused'),a=start(f),rejected=assert.rejects(a,cause=>cause===error);
  d.close=()=>{throw error;};f.element('check-form').emit('submit');await rejected;
  assert.equal(f.element('preview'),undefined);assert.equal(d.open,true);
  d.close=close;const b=start(f);f.element('check-cancel').emit('click');
  assert.equal(f.element('preview'),undefined);f.drainClose();assert.equal(await b,false);
  assert.ok(f.element('preview'));assert.ok(f.element('catalogue-preview'));
});

test('échec de focus après ouverture: restauration au close et rejet primaire conservé', async () => {
  const f=fixture();f.A.Preview.show(f.doc);const error=new Error('focus failed');
  f.element('check-dialog-title').focusError=error;
  const result=start(f),rejected=assert.rejects(result,cause=>cause===error);
  assert.equal(f.element('preview'),undefined);f.drainClose();await rejected;
  assert.ok(f.element('preview'));
});

test('un bail déjà rejeté rend une erreur de restauration tardive observable', async () => {
  const f=fixture();f.A.Preview.show(f.doc);const d=f.element('check-dialog'),close=d.close.bind(d);
  const primary=new Error('close refused'),secondary=new Error('restore dead lease');
  const result=start(f),rejected=assert.rejects(result,cause=>cause===primary);
  d.close=()=>{throw primary;};f.element('check-form').emit('submit');await rejected;
  d.close=close;f.failNextClone(secondary);close();
  assert.throws(()=>f.drainClose(),cause=>cause===secondary);
});

test('une fermeture effective qui lève ensuite garde sa primaire et attend son close', async () => {
  const f=fixture();f.A.Preview.show(f.doc);const d=f.element('check-dialog'),close=d.close.bind(d);
  const error=new Error('failure after close'),result=start(f),rejected=assert.rejects(result,cause=>cause===error);
  d.close=()=>{close();throw error;};f.element('check-form').emit('submit');
  assert.equal(d.open,false);assert.equal(f.element('preview'),undefined);
  f.drainClose();await rejected;assert.ok(f.element('preview'));
});

test('plusieurs baux rejetés sont libérés une seule fois lors du close effectif', async () => {
  const f=fixture();f.A.Preview.show(f.doc);const d=f.element('check-dialog'),close=d.close.bind(d);
  const error=new Error('close refused');d.close=()=>{throw error;};
  for(let index=0;index<3;index++) {
    const result=start(f),rejected=assert.rejects(result,cause=>cause===error);
    f.element('check-form').emit('submit');await rejected;
    assert.equal(f.element('preview'),undefined);
  }
  const before=f.replacements.length;d.close=close;close();f.drainClose();
  assert.ok(f.element('preview'));assert.equal(f.replacements.length,before+2);
  f.drain();assert.equal(f.replacements.length,before+2);
});
