'use strict';
const express = require('express');
const db = require('../db');
const backup = require('../backup');
const perms = require('../permissions');
const security = require('../security');
const settings = require('../settings');
const S = require('../serialize');
const { ApiError, todayIso } = require('../util');

const r = express.Router();
r.use(perms.requireAdmin);

// Respaldo completo (base de datos + fotos y archivos) para guardar fuera del servidor.
r.get('/download', (req, res) => {
  const zip = backup.createBackupZip();
  security.audit(req, 'backup_downloaded');
  res.set({
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="shuritekan_respaldo_${todayIso()}.zip"`,
    'Content-Length': String(zip.length),
  });
  res.send(zip);
});

// Datos legibles (JSON), sin contraseñas ni sesiones. Sirve para llevarlos a otro lado o auditarlos.
r.get('/export', (req, res) => {
  const c = db.get();
  const all = sql => c.prepare(sql).all();
  const data = {
    app: 'shuri-te-kan', exportedAt: new Date().toISOString(),
    settings: { fees: settings.get('fees'), letterhead: settings.get('letterhead'), home: settings.get('home'), theme: settings.get('theme'), diploma: settings.get('diploma') },
    dojos: all('SELECT * FROM dojos'),
    belts: all('SELECT * FROM belts ORDER BY grp, position'),
    programs: all('SELECT * FROM programs'),
    students: all('SELECT * FROM students ORDER BY name'),
    activities: all('SELECT * FROM activities'),
    payments: all('SELECT * FROM payments'),
    expenses: all('SELECT * FROM expenses'),
    attendance: all('SELECT * FROM attendance ORDER BY date'),
    events: all('SELECT * FROM events'),
    schedule: all('SELECT * FROM schedule_items'),
    announcements: all('SELECT * FROM announcements'),
    forumPosts: all('SELECT * FROM forum_posts'),
    glossary: all('SELECT * FROM library_glossary'),
    links: all('SELECT * FROM library_links'),
    inscriptions: all('SELECT * FROM inscriptions'),
    diplomas: all('SELECT * FROM diplomas_issued'),
  };
  security.audit(req, 'data_exported');
  res.set('Content-Disposition', `attachment; filename="shuritekan_datos_${todayIso()}.json"`);
  res.json(data);
});

// Restaurar desde un respaldo .zip. Reemplaza todo, así que pide la contraseña otra vez.
r.post('/restore', express.raw({ type: () => true, limit: '600mb' }), async (req, res) => {
  const password = req.get('x-confirm-password') || '';
  if (!password || !(await security.verifyPassword(password, req.auth.user.password_hash))) {
    security.recordFailure(req.auth.user.username, req.ip);
    throw new ApiError(403, 'La contraseña no es correcta. No se restauró nada.');
  }
  if (!Buffer.isBuffer(req.body) || !req.body.length) throw new ApiError(400, 'No llegó ningún archivo.');
  let result;
  try { result = backup.restoreFromZip(req.body); }
  catch (err) { throw new ApiError(400, err.message || 'No se pudo restaurar el respaldo.'); }
  // La sesión actual ya no existe en la base restaurada: se vuelve a pedir el ingreso.
  res.append('Set-Cookie', 'sid=; Max-Age=0; Path=/');
  res.append('Set-Cookie', '__Host-sid=; Max-Age=0; Path=/; Secure');
  res.json({ ok: true, safetyFolder: result.safetyFolder });
});

module.exports = r;
