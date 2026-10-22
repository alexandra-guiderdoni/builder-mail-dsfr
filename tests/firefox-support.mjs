import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export class Firefox {
  constructor(directory) { this.directory = directory; this.profile = path.join(directory, 'profile'); this.sequence = 0; this.pending = new Map(); this.errors = []; }
  async start() {
    await fs.mkdir(this.profile, {recursive: true});
    const started = Date.now();
    this.launch = spawn(process.env.FIREFOX_BINARY || '/Applications/Firefox.app/Contents/MacOS/firefox', ['--headless', '--profile', this.profile, '--remote-debugging-port', '0', 'about:blank'], {stdio: 'ignore'});
    this.launch.on('error', error => { this.launchError = error; }); this.launch.unref();
    const metadata = path.join(this.profile, 'WebDriverBiDiServer.json'); let server;
    for (let i = 0; i < 150; i++) {
      if (this.launchError) throw this.launchError;
      try { if ((await fs.stat(metadata)).mtimeMs >= started - 2) { server = JSON.parse(await fs.readFile(metadata, 'utf8')); break; } } catch {}
      await sleep(100);
    }
    if (!server) throw new Error('Serveur BiDi du profil de recette absent.');
    this.ws = new WebSocket(`ws://${server.ws_host}:${server.ws_port}/session`);
    await new Promise((resolve, reject) => { this.ws.onopen = resolve; this.ws.onerror = reject; });
    this.ws.onmessage = event => {
      const data = JSON.parse(event.data);
      if (data.id) { const job = this.pending.get(data.id); if (!job) return; this.pending.delete(data.id); clearTimeout(job.timer); if (data.type === 'error') job.reject(new Error(`${data.error}: ${data.message}`)); else job.resolve(data.result); }
      else if (data.method === 'log.entryAdded' && data.params.level === 'error') this.errors.push(data.params.text);
    };
    const session = await this.call('session.new', {capabilities: {}});
    this.version = session.capabilities.browserVersion; this.pid = session.capabilities['moz:processID'];
    await this.tab();
  }
  call(method, params) {
    return new Promise((resolve, reject) => {
      const id = ++this.sequence, timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`Délai BiDi dépassé : ${method}`)); }, 30000);
      this.pending.set(id, {resolve, reject, timer}); this.ws.send(JSON.stringify({id, method, params}));
    });
  }
  async tab() { this.context = (await this.call('browsingContext.create', {type: 'tab'})).context; await this.call('session.subscribe', {events: ['log.entryAdded'], contexts: [this.context]}); }
  async evaluate(expression) {
    const result = await this.call('script.evaluate', {target: {context: this.context}, expression: `(async()=>JSON.stringify(await (${expression})))()`, awaitPromise: true});
    if (result.type === 'exception') throw new Error(result.exceptionDetails.text);
    return JSON.parse(result.result.value ?? 'null');
  }
  async wait(expression) { for (let i = 0; i < 100; i++) { if (await this.evaluate(expression)) return; await sleep(100); } throw new Error(`Condition Firefox absente : ${expression}`); }
  async navigate(url) { await this.call('browsingContext.navigate', {context: this.context, url, wait: 'complete'}); await this.wait('window.MailBuilder?.ready'); }
  async field(selector, value) { await this.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input',{bubbles:true}));return true})()`); }
  async click(selector) {
    await this.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'center'});e.focus();return true})()`);
    await this.call('input.performActions', {context: this.context, actions: [{type: 'key', id: 'keyboard', actions: [{type: 'keyDown', value: '\uE007'}, {type: 'keyUp', value: '\uE007'}]}]});
  }
  async details(text) { await this.evaluate(`(()=>{const e=[...document.querySelectorAll('summary')].find(e=>e.textContent.includes(${JSON.stringify(text)}));e.parentElement.open=true;return true})()`); }
  async files(selector, filename) {
    const result = await this.call('script.evaluate', {target: {context: this.context}, expression: `document.querySelector(${JSON.stringify(selector)})`, awaitPromise: false});
    await this.call('input.setFiles', {context: this.context, element: {sharedId: result.result.sharedId}, files: [filename]});
  }
  async capture(filename) { const result = await this.call('browsingContext.captureScreenshot', {context: this.context, origin: 'document'}); await fs.writeFile(path.join(this.directory, filename), Buffer.from(result.data, 'base64')); }
  async stop() {
    try { if (this.ws?.readyState === WebSocket.OPEN) await this.call('session.end', {}); } catch {}
    this.ws?.close();
    if (this.pid) { try { process.kill(this.pid, 'SIGTERM'); } catch {} }
    else this.launch?.kill('SIGTERM');
    for (let i = 0; this.pid && i < 50; i++) { try { process.kill(this.pid, 0); await sleep(100); } catch { break; } }
    for (const job of this.pending.values()) { clearTimeout(job.timer); job.reject(new Error('Session de recette fermée.')); } this.pending.clear();
    this.pid = null;
  }
}
