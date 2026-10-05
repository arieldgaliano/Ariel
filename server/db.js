'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const config = require('./config');

let db = null;

function open(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const conn = new DatabaseSync(file);
  conn.exec('PRAGMA journal_mode = WAL');
  conn.exec('PRAGMA foreign_keys = ON');
  conn.exec('PRAGMA busy_timeout = 5000');
  conn.exec('PRAGMA synchronous = NORMAL');
  migrate(conn);
  return conn;
}

// Aplica en orden los archivos server/migrations/NNN_*.sql que todavía no se corrieron.
function migrate(conn) {
  conn.exec('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
  const dir = path.join(__dirname, 'migrations');
  const done = new Set(conn.prepare('SELECT name FROM schema_migrations').all().map(r => r.name));
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) {
    if (done.has(file)) continue;
    conn.exec('BEGIN');
    try {
      conn.exec(fs.readFileSync(path.join(dir, file), 'utf8'));
      conn.prepare('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)').run(file, new Date().toISOString());
      conn.exec('COMMIT');
    } catch (err) {
      conn.exec('ROLLBACK');
      throw new Error(`Falló la migración ${file}: ${err.message}`);
    }
  }
}

function init(file = path.join(config.dataDir, 'dojo.db')) {
  if (db) return db;
  db = open(file);
  return db;
}

function get() {
  if (!db) throw new Error('La base de datos no está inicializada');
  return db;
}

function close() {
  if (db) { db.close(); db = null; }
}

// Ejecuta fn dentro de una transacción; si algo falla se deshace todo.
function tx(fn) {
  const conn = get();
  conn.exec('BEGIN IMMEDIATE');
  try {
    const result = fn(conn);
    conn.exec('COMMIT');
    return result;
  } catch (err) {
    try { conn.exec('ROLLBACK'); } catch { /* ya cerrada */ }
    throw err;
  }
}

module.exports = { init, get, close, tx };
