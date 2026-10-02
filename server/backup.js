'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const config = require('./config');
const db = require('./db');
const { createZip, readZip } = require('./zip');
const { todayIso } = require('./util');

const backupsDir = () => path.join(config.dataDir, 'backups');
const uploadsDir = () => path.join(config.dataDir, 'uploads');
const dbFile = () => path.join(config.dataDir, 'dojo.db');

// Copia consistente de la base (aunque se esté usando) sin las sesiones abiertas.
function snapshotDb() {
  fs.mkdirSync(backupsDir(), { recursive: true });
  const tmp = path.join(backupsDir(), `.snapshot-${process.pid}-${Date.now()}.db`);
  db.get().prepare('VACUUM INTO ?').run(tmp);
  const copy = new DatabaseSync(tmp);
  copy.exec('DELETE FROM sessions; DELETE FROM login_attempts;');
  copy.exec('VACUUM');
  copy.close();
  const data = fs.readFileSync(tmp);
  fs.rmSync(tmp, { force: true });
  return data;
}

function createBackupZip() {
  const entries = [
    { name: 'backup-info.json', data: Buffer.from(JSON.stringify({ app: 'shuri-te-kan', format: 1, createdAt: new Date().toISOString() }, null, 2)) },
    { name: 'dojo.db', data: snapshotDb() },
  ];
  if (fs.existsSync(uploadsDir())) {
    for (const f of fs.readdirSync(uploadsDir())) {
      const full = path.join(uploadsDir(), f);
      if (fs.statSync(full).isFile()) entries.push({ name: `uploads/${f}`, data: fs.readFileSync(full), compress: false });
    }
  }
  return createZip(entries);
}

function writeBackupFile(prefix = 'auto') {
  fs.mkdirSync(backupsDir(), { recursive: true });
  const file = path.join(backupsDir(), `${prefix}-${todayIso()}.zip`);
  fs.writeFileSync(file, createBackupZip(), { mode: 0o600 });
  // Se conservan solo los últimos N respaldos automáticos.
  const autos = fs.readdirSync(backupsDir()).filter(f => f.startsWith('auto-') && f.endsWith('.zip')).sort();
  for (const old of autos.slice(0, Math.max(0, autos.length - config.backupKeep))) fs.rmSync(path.join(backupsDir(), old), { force: true });
  return file;
}

// Revisa que el .db de un respaldo sea una base de Shuri-te Kan sana antes de reemplazar nada.
function validateDbBuffer(buf) {
  if (buf.subarray(0, 15).toString('latin1') !== 'SQLite format 3') throw new Error('El respaldo no contiene una base de datos válida.');
  const tmp = path.join(backupsDir(), `.validate-${process.pid}-${Date.now()}.db`);
  fs.mkdirSync(backupsDir(), { recursive: true });
  fs.writeFileSync(tmp, buf);
  const check = new DatabaseSync(tmp);
  try {
    const tables = new Set(check.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map(r => r.name));
    for (const t of ['students', 'users', 'payments', 'settings', 'schema_migrations']) {
      if (!tables.has(t)) throw new Error('El respaldo no es de este sistema (faltan datos).');
    }
    if (check.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw new Error('La base del respaldo está dañada.');
    if (!check.prepare("SELECT 1 FROM users WHERE role = 'admin'").get()) throw new Error('El respaldo no tiene cuenta de Sensei.');
  } finally {
    check.close();
    fs.rmSync(tmp, { force: true });
  }
}

// Reemplaza TODA la información actual por la del respaldo. Lo anterior queda guardado en data/backups.
function restoreFromZip(zipBuffer) {
  const entries = readZip(zipBuffer);
  const dbEntry = entries.find(e => e.name === 'dojo.db');
  if (!dbEntry) throw new Error('El .zip no es un respaldo de Shuri-te Kan (falta dojo.db).');
  validateDbBuffer(dbEntry.data);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safety = path.join(backupsDir(), `antes-de-restaurar-${stamp}`);
  fs.mkdirSync(safety, { recursive: true });

  db.close();
  try {
    for (const suffix of ['', '-wal', '-shm']) {
      if (fs.existsSync(dbFile() + suffix)) fs.renameSync(dbFile() + suffix, path.join(safety, 'dojo.db' + suffix));
    }
    if (fs.existsSync(uploadsDir())) fs.renameSync(uploadsDir(), path.join(safety, 'uploads'));
    fs.mkdirSync(uploadsDir(), { recursive: true });
    fs.writeFileSync(dbFile(), dbEntry.data, { mode: 0o600 });
    for (const e of entries) {
      if (!e.name.startsWith('uploads/')) continue;
      const base = path.basename(e.name);
      if (!/^[0-9a-f-]{36}\.(jpg|png|webp|gif|pdf)$/.test(base)) continue;
      fs.writeFileSync(path.join(uploadsDir(), base), e.data, { mode: 0o600 });
    }
  } finally {
    db.init(); // reabre (y migra si el respaldo es de una versión anterior)
  }
  return { safetyFolder: safety };
}

module.exports = { createBackupZip, writeBackupFile, restoreFromZip, backupsDir };
