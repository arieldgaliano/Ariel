'use strict';
const express = require('express');
const db = require('../db');
const files = require('../files');
const perms = require('../permissions');
const queries = require('../queries');
const security = require('../security');
const { v } = require('../validate');
const config = require('../config');
const { ApiError, uuid, nowIso, todayIso, toCents } = require('../util');

const r = express.Router();
r.use(perms.requireAdmin);

const slugify = name => String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z0-9.\s]/g, '').trim().split(/\s+/).filter(Boolean).join('.').replace(/\.{2,}/g, '.').replace(/^\.|\.$/g, '');

function uniqueUsername(base, exceptUserId) {
  const root = slugify(base) || 'usuario';
  let candidate = root, n = 2;
  const stmt = db.get().prepare('SELECT id FROM users WHERE username = ?');
  for (;;) {
    const hit = stmt.get(candidate);
    if (!hit || hit.id === exceptUserId) return candidate;
    candidate = root + n++;
  }
}

function checkBeltGroup(beltId, group) {
  const belt = db.get().prepare('SELECT grp FROM belts WHERE id = ?').get(beltId);
  if (!belt) throw new ApiError(400, 'Cinturón: no existe.');
  if (belt.grp !== group) throw new ApiError(400, 'Cinturón: no corresponde al grupo elegido.');
}
function checkDojo(id) {
  if (!db.get().prepare('SELECT 1 FROM dojos WHERE id = ?').get(id)) throw new ApiError(400, 'Dojo: no existe.');
}

function parseModules(list) {
  const arr = v.stringList(list, 'Módulos', { maxItems: 30, maxLen: 40 });
  for (const m of arr) if (!perms.GRANTABLE.includes(m)) throw new ApiError(400, `Módulos: "${m}" no es un módulo válido.`);
  return [...new Set(arr)];
}
function parsePerms(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new ApiError(400, 'Permisos: formato inválido.');
  const out = {};
  for (const [k, val] of Object.entries(obj)) {
    if (!perms.PERM_MODULES.includes(k)) throw new ApiError(400, `Permisos: "${k}" no es un módulo válido.`);
    out[k] = v.oneOf(val, 'Permisos', ['read', 'write']);
  }
  return out;
}

r.post('/', async (req, res) => {
  const b = v.object(req.body);
  const name = v.str(b.name, 'Nombre', { max: 120, required: true });
  const group = v.oneOf(b.group, 'Grupo', ['adulto', 'infantil']);
  const belt = v.str(b.belt, 'Cinturón', { max: 80, required: true });
  const dojo = v.str(b.dojo, 'Dojo', { max: 40, required: true });
  checkBeltGroup(belt, group);
  checkDojo(dojo);
  const joinedOn = v.date(b.since, 'En la escuela desde') || todayIso();
  const dni = v.str(b.dni, 'DNI', { max: 20 });
  const hash = await security.hashPassword(config.defaultStudentPassword);
  const id = uuid();
  const now = nowIso();

  const duplicateName = !!db.get().prepare("SELECT 1 FROM students WHERE status = 'activo' AND name = ? COLLATE NOCASE").get(name);
  let username;
  db.tx(conn => {
    username = uniqueUsername(v.str(b.username, 'Usuario', { max: 60 }) || name);
    conn.prepare(`INSERT INTO students (id, name, belt_id, joined_on, belt_since, birth, family_group, phone, guardian, grp, dojo_id,
                    dni, allergies, emergency_contact, emergency_phone, enabled_modules, module_perms, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?, ?)`)
      .run(id, name, belt, joinedOn, joinedOn, v.date(b.birth, 'Nacimiento'), v.str(b.familyGroup, 'Grupo familiar', { max: 120 }),
        v.str(b.phone, 'Teléfono', { max: 40 }), v.str(b.guardian, 'Tutor', { max: 120 }), group, dojo,
        dni, v.str(b.allergies, 'Alergias', { max: 1000 }), v.str(b.emergencyContact, 'Contacto de emergencia', { max: 120 }),
        v.str(b.emergencyPhone, 'Teléfono de emergencia', { max: 40 }), JSON.stringify(perms.DEFAULT_STUDENT_MODULES), now, now);
    conn.prepare('INSERT INTO users (id, username, password_hash, role, student_id, must_change_password, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)')
      .run(uuid(), username, hash, 'student', id, now);
  });
  security.audit(req, 'student_created', 'student', id, { name });
  res.status(201).json({
    student: queries.studentFull(id), username, duplicateName,
    initialPassword: config.defaultStudentPassword,
  });
});

r.put('/:id', (req, res) => {
  const id = v.id(req.params.id, 'Alumno');
  const cur = db.get().prepare('SELECT * FROM students WHERE id = ?').get(id);
  if (!cur) throw new ApiError(404, 'Alumno no encontrado.');
  const b = v.object(req.body);
  const has = k => Object.prototype.hasOwnProperty.call(b, k);

  const next = {
    name: has('name') ? v.str(b.name, 'Nombre', { max: 120, required: true }) : cur.name,
    grp: has('group') ? v.oneOf(b.group, 'Grupo', ['adulto', 'infantil']) : cur.grp,
    belt_id: has('belt') ? v.str(b.belt, 'Cinturón', { max: 80, required: true }) : cur.belt_id,
    dojo_id: has('dojo') ? v.str(b.dojo, 'Dojo', { max: 40, required: true }) : cur.dojo_id,
    phone: has('phone') ? v.str(b.phone, 'Teléfono', { max: 40 }) : cur.phone,
    guardian: has('guardian') ? v.str(b.guardian, 'Tutor', { max: 120 }) : cur.guardian,
    joined_on: has('since') ? (v.date(b.since, 'En la escuela desde', { required: true })) : cur.joined_on,
    birth: has('birth') ? v.date(b.birth, 'Nacimiento') : cur.birth,
    family_group: has('familyGroup') ? v.str(b.familyGroup, 'Grupo familiar', { max: 120 }) : cur.family_group,
    allergies: has('allergies') ? v.str(b.allergies, 'Alergias', { max: 1000 }) : cur.allergies,
    emergency_contact: has('emergencyContact') ? v.str(b.emergencyContact, 'Contacto de emergencia', { max: 120 }) : cur.emergency_contact,
    emergency_phone: has('emergencyPhone') ? v.str(b.emergencyPhone, 'Teléfono de emergencia', { max: 40 }) : cur.emergency_phone,
    dni: has('dni') ? v.str(b.dni, 'DNI', { max: 20 }) : cur.dni,
    enabled_modules: has('enabledModules') ? JSON.stringify(parseModules(b.enabledModules)) : cur.enabled_modules,
    module_perms: has('modulePerms') ? JSON.stringify(parsePerms(b.modulePerms)) : cur.module_perms,
  };
  checkBeltGroup(next.belt_id, next.grp);
  checkDojo(next.dojo_id);

  let usernameChanged = null;
  let photoToDelete = null;
  db.tx(conn => {
    if (has('username')) {
      const wanted = v.str(b.username, 'Usuario', { max: 60 });
      const user = conn.prepare('SELECT id, username FROM users WHERE student_id = ?').get(id);
      const slug = slugify(wanted) || slugify(next.name) || 'usuario';
      if (user && slug !== user.username.toLowerCase()) {
        const unique = uniqueUsername(slug, user.id);
        conn.prepare('UPDATE users SET username = ? WHERE id = ?').run(unique, user.id);
        usernameChanged = unique;
      }
    }
    let photoId = cur.photo_file_id;
    if (has('photoFileId')) {
      if (b.photoFileId === null) { photoToDelete = cur.photo_file_id; photoId = null; }
      else {
        files.claim(v.id(b.photoFileId, 'Foto'), { kind: 'student_photo', ownerStudentId: id });
        photoToDelete = cur.photo_file_id;
        photoId = b.photoFileId;
      }
    }
    conn.prepare(`UPDATE students SET name=?, grp=?, belt_id=?, dojo_id=?, phone=?, guardian=?, joined_on=?, birth=?, family_group=?,
                    allergies=?, emergency_contact=?, emergency_phone=?, dni=?, enabled_modules=?, module_perms=?, photo_file_id=?, updated_at=?
                  WHERE id = ?`)
      .run(next.name, next.grp, next.belt_id, next.dojo_id, next.phone, next.guardian, next.joined_on, next.birth, next.family_group,
        next.allergies, next.emergency_contact, next.emergency_phone, next.dni, next.enabled_modules, next.module_perms, photoId, nowIso(), id);
  });
  if (photoToDelete) files.remove(photoToDelete);
  security.audit(req, 'student_updated', 'student', id);
  res.json({ student: queries.studentFull(id), usernameChanged });
});

// Importación masiva desde planilla (el navegador lee el CSV y manda las filas).
const norm = t => String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
function parseDateLoose(t) {
  const x = String(t || '').trim();
  if (!x) return null;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(x);
  if (!m) { const d = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/.exec(x); if (d) m = [0, d[3], d[2], d[1]]; }
  if (!m) return undefined;
  const iso = `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  return Number.isNaN(new Date(iso + 'T00:00:00Z').getTime()) || new Date(iso + 'T00:00:00Z').toISOString().slice(0, 10) !== iso ? undefined : iso;
}

r.post('/import', async (req, res) => {
  const rows = v.object(req.body).rows;
  if (!Array.isArray(rows) || !rows.length) throw new ApiError(400, 'La planilla no tiene filas para importar.');
  if (rows.length > 300) throw new ApiError(400, 'Importá hasta 300 alumnos por vez.');
  const conn = db.get();
  const dojos = conn.prepare('SELECT * FROM dojos').all();
  const belts = conn.prepare('SELECT * FROM belts').all();
  const existing = new Set(conn.prepare('SELECT name, birth FROM students').all().map(s => norm(s.name) + '|' + (s.birth || '')));
  const plan = [], skipped = [];
  rows.forEach((raw, i) => {
    const line = i + 2; // la fila 1 de la planilla es el encabezado
    try {
      const b = v.object(raw);
      const name = v.str(b.name, 'Nombre', { max: 120, required: true });
      const group = norm(b.group).startsWith('inf') ? 'infantil' : 'adulto';
      const dj = dojos.find(d => d.id === norm(b.dojo) || norm(d.name) === norm(b.dojo) || norm(d.name).includes(norm(b.dojo)) && norm(b.dojo));
      if (!dj) throw new Error(`Dojo "${b.dojo || ''}" no reconocido (usá ${dojos.map(d => d.name).join(' o ')})`);
      const wanted = norm(b.belt);
      const belt = wanted ? belts.find(x => x.grp === group && (x.id === wanted || norm(x.name) === wanted)) : belts.find(x => x.id === `${group}-blanco`);
      if (!belt) throw new Error(`Cinturón "${b.belt}" no existe en el grupo ${group}`);
      const birth = parseDateLoose(b.birth), since = parseDateLoose(b.since);
      if (birth === undefined) throw new Error('Fecha de nacimiento inválida (usá AAAA-MM-DD o DD/MM/AAAA)');
      if (since === undefined) throw new Error('Fecha de ingreso inválida');
      const key = norm(name) + '|' + (birth || '');
      if (existing.has(key)) throw new Error('Ya existe un alumno con ese nombre y fecha de nacimiento');
      existing.add(key);
      plan.push({ name, group, dojo: dj.id, belt: belt.id, birth, since: since || todayIso(),
        phone: v.str(b.phone, 'Teléfono', { max: 40 }), guardian: v.str(b.guardian, 'Tutor', { max: 120 }), dni: v.str(b.dni, 'DNI', { max: 20 }),
        allergies: v.str(b.allergies, 'Alergias', { max: 1000 }), emergencyContact: v.str(b.emergencyContact, 'Contacto de emergencia', { max: 120 }),
        emergencyPhone: v.str(b.emergencyPhone, 'Teléfono de emergencia', { max: 40 }), familyGroup: v.str(b.familyGroup, 'Grupo familiar', { max: 120 }) });
    } catch (e) { skipped.push({ row: line, name: String((raw && raw.name) || ''), reason: e.message.replace(/^[^:]+: /, m => m) }); }
  });
  for (const p of plan) p.hash = await security.hashPassword(config.defaultStudentPassword); // cada uno con su sal
  const createdIds = [];
  db.tx(c => {
    for (const p of plan) {
      const id = uuid(), now = nowIso();
      const username = uniqueUsername(p.name);
      c.prepare(`INSERT INTO students (id, name, belt_id, joined_on, belt_since, birth, family_group, phone, guardian, grp, dojo_id, dni, allergies,
                   emergency_contact, emergency_phone, enabled_modules, module_perms, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?, ?)`)
        .run(id, p.name, p.belt, p.since, p.since, p.birth, p.familyGroup, p.phone, p.guardian, p.group, p.dojo, p.dni, p.allergies,
          p.emergencyContact, p.emergencyPhone, JSON.stringify(perms.DEFAULT_STUDENT_MODULES), now, now);
      c.prepare('INSERT INTO users (id, username, password_hash, role, student_id, must_change_password, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)')
        .run(uuid(), username, p.hash, 'student', id, now);
      createdIds.push(id);
    }
  });
  security.audit(req, 'students_imported', 'student', null, { created: createdIds.length, skipped: skipped.length });
  res.status(201).json({ created: createdIds.length, students: createdIds.map(queries.studentFull), skipped, initialPassword: config.defaultStudentPassword });
});

r.post('/:id/status', (req, res) => {
  const id = v.id(req.params.id, 'Alumno');
  const status = v.oneOf(v.object(req.body).status, 'Estado', ['activo', 'suspendido']);
  const ok = db.get().prepare('UPDATE students SET status = ?, updated_at = ? WHERE id = ?').run(status, nowIso(), id).changes;
  if (!ok) throw new ApiError(404, 'Alumno no encontrado.');
  if (status === 'suspendido') {
    const user = db.get().prepare('SELECT id FROM users WHERE student_id = ?').get(id);
    if (user) security.destroyUserSessions(user.id);
  }
  security.audit(req, 'student_status', 'student', id, { status });
  res.json({ student: queries.studentFull(id) });
});

r.post('/:id/instructor', (req, res) => {
  const id = v.id(req.params.id, 'Alumno');
  const flag = v.bool(v.object(req.body).isInstructor);
  const cur = db.get().prepare('SELECT * FROM students WHERE id = ?').get(id);
  if (!cur) throw new ApiError(404, 'Alumno no encontrado.');
  let modules = JSON.parse(cur.enabled_modules || '[]');
  if (flag) for (const m of ['asistencia', 'pagos']) if (!modules.includes(m)) modules.push(m);
  db.get().prepare('UPDATE students SET is_instructor = ?, enabled_modules = ?, updated_at = ? WHERE id = ?')
    .run(flag ? 1 : 0, JSON.stringify(modules), nowIso(), id);
  security.audit(req, 'student_instructor', 'student', id, { isInstructor: flag });
  res.json({ student: queries.studentFull(id) });
});

r.put('/:id/scholarship', (req, res) => {
  const id = v.id(req.params.id, 'Alumno');
  const b = v.object(req.body);
  const active = v.bool(b.active);
  const amount = active ? v.money(b.amount, 'Valor de la cuota', { allowZero: true }) : 0;
  const ok = db.get().prepare('UPDATE students SET scholarship_active = ?, scholarship_cents = ?, updated_at = ? WHERE id = ?')
    .run(active ? 1 : 0, toCents(amount), nowIso(), id).changes;
  if (!ok) throw new ApiError(404, 'Alumno no encontrado.');
  security.audit(req, 'student_scholarship', 'student', id, { active, amount });
  res.json({ student: queries.studentFull(id) });
});

r.post('/:id/reset-password', async (req, res) => {
  const id = v.id(req.params.id, 'Alumno');
  const user = db.get().prepare('SELECT * FROM users WHERE student_id = ?').get(id);
  if (!user) throw new ApiError(404, 'Alumno no encontrado.');
  const typed = v.str(v.object(req.body).password, 'Contraseña', { max: 200 });
  if (typed) security.assertStrongEnough(typed);
  const password = typed || config.defaultStudentPassword;
  db.get().prepare('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?').run(await security.hashPassword(password), user.id);
  security.destroyUserSessions(user.id);
  security.audit(req, 'password_reset', 'student', id);
  res.json({ username: user.username, password });
});

r.delete('/:id', (req, res) => {
  const id = v.id(req.params.id, 'Alumno');
  const conn = db.get();
  if (!conn.prepare('SELECT 1 FROM students WHERE id = ?').get(id)) throw new ApiError(404, 'Alumno no encontrado.');
  const ownedFiles = conn.prepare('SELECT * FROM files WHERE owner_student_id = ?').all(id);
  db.tx(c => {
    c.prepare('DELETE FROM students WHERE id = ?').run(id); // borra también usuario, pagos, asistencia y actividades
    c.prepare('DELETE FROM files WHERE owner_student_id = ?').run(id);
  });
  ownedFiles.forEach(files.unlink);
  security.audit(req, 'student_deleted', 'student', id);
  res.json({ ok: true });
});

module.exports = r;
module.exports.uniqueUsername = uniqueUsername;
module.exports.slugify = slugify;
