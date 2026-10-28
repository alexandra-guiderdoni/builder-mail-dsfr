import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export class Firefox {
  #profileIdentity;
  #ownedLaunch;
  #ownedSocket;
  #childExited = false;
  #sessionOwned = false;
  #unknownSession = false;
  #stopping;
  #starting = false;
  #cancelStart = false;
  #uncertainCleanup = false;
  #stopped = false;
  constructor(directory, {headless = true} = {}) {
    if (typeof headless !== 'boolean') throw new TypeError('Le mode headless doit être explicite.');
    this.directory = directory; this.profile = path.join(directory, 'profile'); this.headless = headless;
    this.sequence = 0; this.pending = new Map(); this.errors = [];
  }
  #exited() {
    const child = this.#ownedLaunch;
    return !child || this.#childExited || child.exitCode !== null && child.exitCode !== undefined || child.signalCode !== null && child.signalCode !== undefined;
  }
  async #profile() {
    if (!this.#profileIdentity) {
      await fs.mkdir(this.directory, {recursive: true});
      // Refuser un profil existant plutôt que s'attribuer son navigateur ou ses données.
      await fs.mkdir(this.profile);
      const stat = await fs.lstat(this.profile);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Profil de recette non possédé.');
      // Préférence locale du seul profil neuf possédé ; ne pas réécrire user.js aux redémarrages.
      await fs.writeFile(path.join(this.profile, 'user.js'), 'user_pref("browser.shell.checkDefaultBrowser", false);\n', {flag: 'wx'});
      this.#profileIdentity = {path: this.profile, dev: stat.dev, ino: stat.ino};
    } else {
      const stat = await fs.lstat(this.profile), owned = this.#profileIdentity;
      if (this.profile !== owned.path || !stat.isDirectory() || stat.isSymbolicLink() || stat.dev !== owned.dev || stat.ino !== owned.ino) throw new Error('Identité du profil de recette modifiée.');
    }
  }
  async start() {
    if (this.#starting) throw new Error('Démarrage de recette encore en cours.');
    if (this.#uncertainCleanup) throw new Error('Fermeture précédente non observée : relance refusée.');
    if (this.#stopping && !this.#stopped) throw new Error('Fermeture de recette encore en cours.');
    if (!this.#exited()) throw new Error('Le processus de recette est encore actif.');
    this.cleanup = null; this.cleanup_error = null; this.start_error = null; this.launchError = null;
    this.#stopping = null; this.#stopped = false; this.allocation = null; this.#starting = true; this.#cancelStart = false;
    this.#sessionOwned = false; this.#unknownSession = false; this.ws = this.#ownedSocket = null;
    try {
      await this.#profile();
      if (this.#cancelStart) throw new Error('Démarrage de recette interrompu.');
      const metadata = path.join(this.profile, 'WebDriverBiDiServer.json');
      await fs.rm(metadata, {force: true});
      if (this.#cancelStart) throw new Error('Démarrage de recette interrompu.');
      const started = Date.now(), args = [...(this.headless ? ['--headless'] : []), '--no-remote', '--new-instance', '--profile', this.profile, '--remote-debugging-port', '0', 'about:blank'];
      const child = this.launch = this.#ownedLaunch = spawn(process.env.FIREFOX_BINARY || '/Applications/Firefox.app/Contents/MacOS/firefox', args, {stdio: 'ignore'});
      this.#childExited = false;
      child.on('exit', () => { if (this.#ownedLaunch === child) this.#childExited = true; });
      child.on('error', error => { this.launchError = error; if (!child.pid && this.#ownedLaunch === child) this.#childExited = true; });
      child.unref();
      this.allocation = {status: 'launched', mode: this.headless ? 'headless' : 'visible', profile: this.profile, child_pid: child.pid ?? null};
      let server;
      for (let i = 0; i < 150; i++) {
        if (this.#cancelStart) throw new Error('Démarrage de recette interrompu.');
        if (this.launchError) throw this.launchError;
        if (this.#exited()) throw new Error('Le processus de recette est terminé avant la session.');
        try { if ((await fs.stat(metadata)).mtimeMs >= started - 2) { server = JSON.parse(await fs.readFile(metadata, 'utf8')); break; } } catch {}
        await sleep(100);
      }
      if (!server) throw new Error('Serveur BiDi du profil de recette absent.');
      this.ws = this.#ownedSocket = new WebSocket(`ws://${server.ws_host}:${server.ws_port}/session`);
      await new Promise((resolve, reject) => { this.ws.onopen = resolve; this.ws.onerror = reject; });
      if (this.#cancelStart) throw new Error('Démarrage de recette interrompu.');
      this.ws.onmessage = event => {
        const data = JSON.parse(event.data);
        if (data.id) { const job = this.pending.get(data.id); if (!job) return; this.pending.delete(data.id); clearTimeout(job.timer); if (data.type === 'error') job.reject(new Error(`${data.error}: ${data.message}`)); else job.resolve(data.result); }
        else if (data.method === 'log.entryAdded' && data.params.level === 'error') this.errors.push(data.params.text);
      };
      const session = await this.call('session.new', {capabilities: {}});
      if (this.#cancelStart) throw new Error('Démarrage de recette interrompu.');
      this.version = session.capabilities.browserVersion; this.pid = session.capabilities['moz:processID'];
      this.allocation.session_pid = this.pid ?? null;
      if (!Number.isSafeInteger(child.pid) || child.pid <= 0 || this.pid !== child.pid || this.#exited()) {
        this.#unknownSession = true; this.allocation.status = 'refused';
        throw new Error('Identité du processus de session non prouvée ; aucune fermeture de ce PID ne sera tentée.');
      }
      this.#sessionOwned = true; this.allocation.status = 'owned-session';
      await this.tab();
    } catch (cause) { this.start_error = cause; throw cause; }
    finally { this.#starting = false; }
  }
  call(method, params) {
    return new Promise((resolve, reject) => {
      const id = ++this.sequence, timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`Délai BiDi dépassé : ${method}`)); }, 30000);
      this.pending.set(id, {resolve, reject, timer});
      try { this.#ownedSocket.send(JSON.stringify({id, method, params})); }
      catch (cause) { this.pending.delete(id); clearTimeout(timer); reject(cause); }
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
  stop() {
    if (!this.#stopping) this.#stopping = this.#stop();
    return this.#stopping;
  }
  async #stop() {
    this.#cancelStart = true;
    const problems = [], receipt = {status: 'not-started', cleanup_error: null, child_pid: this.#ownedLaunch?.pid ?? null, session_end: 'not-requested', signalled: false, exit_observed: this.#exited()};
    if (this.start_error) receipt.primary_error = this.start_error.message;
    try {
      if (this.#sessionOwned && !this.#exited() && this.#ownedSocket?.readyState === WebSocket.OPEN) {
        try { await this.call('session.end', {}); receipt.session_end = 'acknowledged'; }
        catch (cause) { receipt.session_end = 'error'; receipt.session_end_error = cause.message; }
      }
      try { this.#ownedSocket?.close(); } catch (cause) { problems.push({stage: 'socket-close', message: cause.message}); }
      const child = this.#ownedLaunch;
      // Le ChildProcess capturé à spawn est la seule autorité de signal ; jamais le PID annoncé par BiDi.
      if (child && !this.#exited()) {
        try {
          if (!Number.isSafeInteger(child.pid) || child.pid <= 0) throw new Error('Identité de l’enfant absente.');
          receipt.signalled = child.kill('SIGTERM');
          if (!receipt.signalled && !this.#exited()) problems.push({stage: 'child-signal', message: 'Signal à l’enfant refusé.'});
        } catch (cause) { problems.push({stage: 'child-signal', message: cause.message}); }
        if (!this.#exited()) await new Promise(resolve => {
          const finish = () => { clearTimeout(timer); child.removeListener('exit', finish); resolve(); };
          const timer = setTimeout(finish, 5000); child.once('exit', finish);
          if (this.#exited()) finish();
        });
        receipt.exit_observed = this.#exited();
        if (!receipt.exit_observed) problems.push({stage: 'child-exit', message: 'Fin de l’enfant non observée ; aucun signal plus large.'});
      }
      if (this.#unknownSession) problems.push({stage: 'session-ownership', message: 'Processus de session non possédé : fermeture non prouvée, aucun signal ni session.end envoyé à ce processus.'});
      if (this.#starting) problems.push({stage: 'startup', message: 'Démarrage interrompu encore en cours ; aucune nouvelle allocation ne sera admise.'});
      receipt.exit_observed = this.#exited();
      if (child) receipt.status = receipt.exit_observed ? 'closed' : 'unknown';
    } finally {
      for (const job of this.pending.values()) { clearTimeout(job.timer); job.reject(new Error('Session de recette fermée.')); } this.pending.clear();
      this.#sessionOwned = false;
    }
    receipt.cleanup_error = problems.length ? problems : null;
    if (receipt.cleanup_error) { receipt.status = 'error'; this.errors.push('cleanup_error : ' + problems.map(p => p.message).join(' ')); }
    this.#uncertainCleanup = Boolean(receipt.cleanup_error); this.#stopped = true;
    this.cleanup_error = receipt.cleanup_error; this.cleanup = receipt;
    return receipt;
  }
}
