'use strict';
const express = require('express');
const db = require('../db');
const perms = require('../permissions');
const queries = require('../queries');
const security = require('../security');
const S = require('../serialize');
const { v, cleanText } = require('../validate');
const { ApiError, uuid, nowIso, todayIso } = require('../util');
const { uniqueUsername } = require('./students');

const r = express.Router();
const publicLimiter = security.memoryLimiter({ windowMs: 60 * 60 * 1000, max: 8, message: 'Ya enviaste varias fichas. Probá de nuevo en una hora.' });
const MAX_PENDING = 300;

// Ficha pública: la puede enviar cualquiera, sin cuenta. Está limitada para evitar basura.
r.post('/', publicLimiter, (req, res) => {
  const b = v.object(req.body);
  // Campo trampa: las personas no lo ven ni lo completan; los robots sí. Se responde "ok" sin guardar nada.
  if (b.website) return res.status(201).json({ ok: true });
  const name = cleanText(v.str(b.name, 'Nombre', { max: 120, required: true }));
  if (!name) throw new ApiError(400, 'Completá al menos el nombre para enviar la ficha.');
  const group = v.oneOf(b.group, 'Grupo', ['adulto', 'infantil']);
  const dojo = v.str(b.dojo, 'Dojo', { max: 40, required: true });
  if (!db.get().prepare('SELECT 1 FROM dojos WHERE id = ?').get(dojo)) throw new ApiError(400, 'Dojo: no existe.');
  if (db.get().prepare('SELECT COUNT(*) AS n FROM inscriptions').get().n >= MAX_PENDING) {
    throw new ApiError(503, 'En este momento no podemos recibir más fichas. Escribinos por WhatsApp.');
  }
  db.get().prepare(`INSERT INTO inscriptions (id, name, birth, grp, dojo_id, phone, dni, guardian, emergency_phone, notes, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(uuid(), name, v.date(b.birth, 'Nacimiento'), group, dojo, cleanText(v.str(b.phone, 'Teléfono', { max: 40 })),
      cleanText(v.str(b.dni, 'DNI', { max: 20 })), cleanText(v.str(b.guardian, 'Tutor', { max: 120 })),
      cleanText(v.str(b.emergencyPhone, 'Teléfono de emergencia', { max: 40 })), cleanText(v.str(b.notes, 'Observaciones', { max: 1000 })), nowIso());
  res.status(201).json({ ok: true, firstName: name.split(' ')[0] });
});

r.get('/', perms.requireAdmin, (_req, res) => {
  res.json({ inscriptions: db.get().prepare('SELECT * FROM inscriptions ORDER BY created_at').all().map(S.inscription) });
});

r.post('/:id/approve', perms.requireAdmin, async (req, res) => {
  const id = v.id(req.params.id, 'Solicitud');
  const ins = db.get().prepare('SELECT * FROM inscriptions WHERE id = ?').get(id);
  if (!ins) throw new ApiError(404, 'Solicitud no encontrada.');
  const belt = `${ins.grp}-blanco`;
  if (!db.get().prepare('SELECT 1 FROM belts WHERE id = ?').get(belt)) throw new ApiError(409, `No existe el cinturón inicial (${belt}). Creálo en Cinturones.`);
  const password = ins.dni || security.randomTempPassword();
  const hash = await security.hashPassword(password);
  const studentId = uuid();
  const now = nowIso(), today = todayIso();
  const modules = JSON.stringify(perms.DEFAULT_STUDENT_MODULES);
  let username;
  db.tx(conn => {
    username = uniqueUsername(ins.name);
    conn.prepare(`INSERT INTO students (id, name, belt_id, joined_on, belt_since, birth, phone, guardian, grp, dojo_id, dni, allergies,
                    emergency_contact, emergency_phone, enabled_modules, module_perms, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?, ?)`)
      .run(studentId, ins.name, belt, today, today, ins.birth, ins.phone, ins.guardian, ins.grp, ins.dojo_id, ins.dni, ins.notes,
        ins.guardian, ins.emergency_phone, modules, now, now);
    conn.prepare('INSERT INTO users (id, username, password_hash, role, student_id, must_change_password, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)')
      .run(uuid(), username, hash, 'student', studentId, now);
    conn.prepare('DELETE FROM inscriptions WHERE id = ?').run(id);
  });
  security.audit(req, 'inscription_approved', 'student', studentId);
  res.status(201).json({ student: queries.studentFull(studentId), username, initialPassword: ins.dni ? null : password, passwordIsDni: !!ins.dni });
});

r.delete('/:id', perms.requireAdmin, (req, res) => {
  db.get().prepare('DELETE FROM inscriptions WHERE id = ?').run(v.id(req.params.id, 'Solicitud'));
  res.json({ ok: true });
});

module.exports = r;
