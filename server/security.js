'use strict';
const crypto = require('node:crypto');
const db = require('./db');
const config = require('./config');
const { ApiError, uuid, nowIso } = require('./util');

/* ---------------- Contraseñas (scrypt, sin dependencias externas) ---------------- */
const SCRYPT = { N: 32768, r: 8, p: 1, keylen: 64, maxmem: 128 * 1024 * 1024 };

function scrypt(password, salt, params) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, params.keylen, { N: params.N, r: params.r, p: params.p, maxmem: SCRYPT.maxmem },
      (err, key) => (err ? reject(err) : resolve(key)));
  });
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, SCRYPT);
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64url'), key.toString('base64url')].join('$');
}

async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const params = { N: +parts[1], r: +parts[2], p: +parts[3], keylen: SCRYPT.keylen };
  const expected = Buffer.from(parts[5], 'base64url');
  const actual = await scrypt(password, Buffer.from(parts[4], 'base64url'), { ...params, keylen: expected.length });
  return crypto.timingSafeEqual(actual, expected);
}

// Se usa cuando el usuario no existe, para que la respuesta tarde lo mismo
// y no se pueda descubrir qué usuarios existen midiendo el tiempo.
let dummyHash;
async function burnTime(password) {
  if (!dummyHash) dummyHash = await hashPassword('dummy-password');
  await verifyPassword(password, dummyHash);
}

function randomTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 10; i++) out += chars[crypto.randomInt(chars.length)];
  return out;
}

const MIN_PASSWORD = 8;
function assertStrongEnough(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
    throw new ApiError(400, `La contraseña tiene que tener al menos ${MIN_PASSWORD} caracteres.`);
  }
  if (password.length > 200) throw new ApiError(400, 'La contraseña es demasiado larga.');
}

/* ---------------- Sesiones ---------------- */
const sha256 = text => crypto.createHash('sha256').update(text).digest('hex');
const DAY = 24 * 3600 * 1000;

function createSession(userId, req) {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  db.get().prepare(`INSERT INTO sessions (id, user_id, created_at, last_seen, expires_at, ip, user_agent)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(sha256(token), userId, now, now, now + config.sessionDays * DAY, req.ip || '', String(req.get('user-agent') || '').slice(0, 200));
  return token;
}

// Devuelve { session, user } si el token es válido (y renueva la vigencia), o null.
function lookupSession(token) {
  if (!token || typeof token !== 'string' || token.length > 200) return null;
  const conn = db.get();
  const id = sha256(token);
  const row = conn.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
  if (!row) return null;
  const now = Date.now();
  if (row.expires_at < now || row.created_at + config.sessionAbsoluteDays * DAY < now) {
    conn.prepare('DELETE FROM sessions WHERE id = ?').run(id);
    return null;
  }
  const user = conn.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id);
  if (!user) return null;
  // Renovación deslizante, como mucho una vez por hora para no escribir en cada pedido.
  if (now - row.last_seen > 3600 * 1000) {
    conn.prepare('UPDATE sessions SET last_seen = ?, expires_at = ? WHERE id = ?')
      .run(now, Math.min(now + config.sessionDays * DAY, row.created_at + config.sessionAbsoluteDays * DAY), id);
  }
  return { session: row, user };
}

const destroySession = token => token && db.get().prepare('DELETE FROM sessions WHERE id = ?').run(sha256(token));
const destroyUserSessions = (userId, exceptToken) => {
  const keep = exceptToken ? sha256(exceptToken) : '';
  db.get().prepare('DELETE FROM sessions WHERE user_id = ? AND id != ?').run(userId, keep);
};

function purgeExpired() {
  const conn = db.get();
  conn.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
  conn.prepare('DELETE FROM login_attempts WHERE ts < ?').run(Date.now() - 24 * 3600 * 1000);
}

/* ---------------- Límite de intentos de ingreso ---------------- */
const WINDOW_MS = 15 * 60 * 1000;
const LIMITS = { user: 5, ip: 30 };

function recentFailures(key) {
  return db.get().prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE key = ? AND ts > ?').get(key, Date.now() - WINDOW_MS).n;
}

function assertNotLocked(username, ip) {
  if (recentFailures('u:' + username.toLowerCase()) >= LIMITS.user || recentFailures('ip:' + ip) >= LIMITS.ip) {
    throw new ApiError(429, 'Demasiados intentos fallidos. Esperá 15 minutos y probá de nuevo.');
  }
}
function recordFailure(username, ip) {
  const stmt = db.get().prepare('INSERT INTO login_attempts (key, ts) VALUES (?, ?)');
  const ts = Date.now();
  stmt.run('u:' + username.toLowerCase(), ts);
  stmt.run('ip:' + ip, ts);
}
function clearFailures(username) {
  db.get().prepare('DELETE FROM login_attempts WHERE key = ?').run('u:' + username.toLowerCase());
}

/* ---------------- Límite genérico en memoria (formulario público, verificación) ---------------- */
function memoryLimiter({ windowMs, max, message }) {
  const hits = new Map();
  setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [k, arr] of hits) { const f = arr.filter(t => t > cutoff); f.length ? hits.set(k, f) : hits.delete(k); }
  }, windowMs).unref();
  return (req, _res, next) => {
    const now = Date.now();
    const arr = (hits.get(req.ip) || []).filter(t => t > now - windowMs);
    if (arr.length >= max) return next(new ApiError(429, message || 'Demasiados pedidos. Probá de nuevo en un rato.'));
    arr.push(now);
    hits.set(req.ip, arr);
    next();
  };
}

/* ---------------- Secretos guardados (p. ej. la clave del correo de respaldos) ----------------
   Se encriptan con AES-256-GCM. La llave vive en un archivo aparte dentro de la carpeta de datos
   (o en la variable SECRET_KEY) y NO viaja dentro de los respaldos. */
const fs = require('node:fs');
const path = require('node:path');
function secretKey() {
  if (process.env.SECRET_KEY) return crypto.createHash('sha256').update(process.env.SECRET_KEY).digest();
  const file = path.join(config.dataDir, 'secret.key');
  if (!fs.existsSync(file)) { fs.mkdirSync(config.dataDir, { recursive: true }); fs.writeFileSync(file, crypto.randomBytes(32).toString('base64'), { mode: 0o600 }); }
  return Buffer.from(fs.readFileSync(file, 'utf8').trim(), 'base64');
}
function encryptSecret(text) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', secretKey(), iv);
  const enc = Buffer.concat([c.update(String(text), 'utf8'), c.final()]);
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), enc.toString('base64')].join('.');
}
function decryptSecret(blob) {
  const [v, iv, tag, enc] = String(blob || '').split('.');
  if (v !== 'v1') throw new Error('secreto inválido');
  const d = crypto.createDecipheriv('aes-256-gcm', secretKey(), Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(enc, 'base64')), d.final()]).toString('utf8');
}

/* ---------------- Auditoría ---------------- */
function audit(req, action, entity, entityId, detail) {
  try {
    db.get().prepare('INSERT INTO audit_log (ts, user_id, username, action, entity, entity_id, detail) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(nowIso(), req?.auth?.user?.id || null, req?.auth?.user?.username || null, action, entity || null, entityId || null,
        detail ? JSON.stringify(detail) : null);
  } catch { /* la auditoría nunca debe romper la operación */ }
}

module.exports = {
  encryptSecret, decryptSecret, hashPassword, verifyPassword, burnTime, randomTempPassword, assertStrongEnough, MIN_PASSWORD,
  createSession, lookupSession, destroySession, destroyUserSessions, purgeExpired, sha256,
  assertNotLocked, recordFailure, clearFailures, memoryLimiter, audit, uuid,
};
