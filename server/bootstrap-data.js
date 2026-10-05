'use strict';
const fs = require('node:fs');
const path = require('node:path');
const db = require('./db');
const config = require('./config');
const security = require('./security');
const settings = require('./settings');
const files = require('./files');
const { uuid, nowIso } = require('./util');

const DOJOS = [{ id: 'central', name: 'Dojo Central' }, { id: 'norte', name: 'Dojo Norte' }];

// Carga lo imprescindible la primera vez: dojos, cinturones y programas de fábrica.
function seedReferenceData() {
  const conn = db.get();
  if (!conn.prepare('SELECT 1 FROM dojos LIMIT 1').get()) {
    const ins = conn.prepare('INSERT INTO dojos (id, name) VALUES (?, ?)');
    DOJOS.forEach(d => ins.run(d.id, d.name));
  }
  if (!conn.prepare('SELECT 1 FROM belts LIMIT 1').get()) {
    const belts = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed', 'belts.json'), 'utf8'));
    const programs = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed', 'programs.json'), 'utf8'));
    db.tx(c => {
      const b = c.prepare(`INSERT INTO belts (id, name, grp, position, color, tip, tip_count, min_months, classes_required, is_kyu)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      const p = c.prepare('INSERT INTO programs (belt_id, items) VALUES (?, ?)');
      for (const x of belts) {
        b.run(x.id, x.name, x.group, x.order, x.color, x.tip || null, x.tipCount || null, x.minMonths, x.classesRequired, x.kyu ? 1 : 0);
        p.run(x.id, JSON.stringify(programs[x.id] || []));
      }
    });
  }
  // Logo de fábrica (se puede cambiar o quitar desde Configuración).
  if (settings.getRaw('logoFileId') === undefined) {
    const src = path.join(config.publicDir, 'img', 'logo-default.jpg');
    if (fs.existsSync(src)) {
      const row = files.save({ buffer: fs.readFileSync(src), kind: 'logo', originalName: 'logo.jpg' });
      conn.prepare('UPDATE files SET attached = 1 WHERE id = ?').run(row.id);
      settings.set('logoFileId', row.id);
    } else {
      settings.set('logoFileId', null);
    }
  }
}

// Si todavía no existe la cuenta del Sensei, la crea. Devuelve la contraseña generada (si hubo que inventarla).
async function ensureAdmin() {
  const conn = db.get();
  if (conn.prepare("SELECT 1 FROM users WHERE role = 'admin'").get()) return null;
  const username = config.senseiUser;
  let password = config.senseiPassword;
  let generated = false;
  if (!password) { password = security.randomTempPassword() + '9'; generated = true; }
  else security.assertStrongEnough(password);
  conn.prepare('INSERT INTO users (id, username, password_hash, role, student_id, must_change_password, created_at) VALUES (?, ?, ?, ?, NULL, 1, ?)')
    .run(uuid(), username, await security.hashPassword(password), 'admin', nowIso());
  return { username, password, generated };
}

module.exports = { seedReferenceData, ensureAdmin, DOJOS };
