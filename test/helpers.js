'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Cada archivo de test corre en su propio proceso, con su propia base temporal.
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dojo-test-'));
process.env.DATA_DIR = dataDir;
process.env.NODE_ENV = 'test';

const db = require('../server/db');
const { createApp } = require('../server/app');
const { seedDemo } = require('../server/seed-demo');

async function start({ demo = true } = {}) {
  db.init();
  if (demo) await seedDemo({ password: 'demo1234' });
  const server = await new Promise(resolve => { const s = createApp().listen(0, '127.0.0.1', () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    base,
    dataDir,
    async stop() { await new Promise(r => server.close(r)); db.close(); fs.rmSync(dataDir, { recursive: true, force: true }); },
  };
}

class Client {
  constructor(base) { this.base = base; this.cookie = ''; }
  async request(method, url, body, { headers = {}, raw = false, csrf = true } = {}) {
    const h = { ...headers };
    if (csrf) h['X-Requested-With'] = 'dojo';
    if (this.cookie) h.Cookie = this.cookie;
    let payload;
    if (raw) payload = body;
    else if (body !== undefined) { h['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
    const res = await fetch(this.base + url, { method, headers: h, body: payload, redirect: 'manual' });
    const set = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    for (const c of set) {
      const [pair] = c.split(';');
      const [name, value] = pair.split('=');
      if (/Max-Age=0/i.test(c) || value === '') this.cookie = '';
      else this.cookie = `${name}=${value}`;
    }
    const type = res.headers.get('content-type') || '';
    const data = type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer());
    return { status: res.status, data, headers: res.headers, setCookie: set };
  }
  get(url, o) { return this.request('GET', url, undefined, o); }
  post(url, body, o) { return this.request('POST', url, body, o); }
  put(url, body, o) { return this.request('PUT', url, body, o); }
  delete(url, o) { return this.request('DELETE', url, undefined, o); }
  async login(username, password = 'demo1234') {
    const r = await this.post('/api/auth/login', { username, password });
    if (r.status !== 200) throw new Error(`login ${username} falló: ${r.status} ${JSON.stringify(r.data)}`);
    return r.data;
  }
}

// PNG mínimo válido (1x1) para pruebas de subida.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

module.exports = { start, Client, PNG, db };
