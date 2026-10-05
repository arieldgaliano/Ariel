'use strict';
const express = require('express');
const db = require('../db');
const perms = require('../permissions');
const queries = require('../queries');
const security = require('../security');
const S = require('../serialize');
const { v } = require('../validate');
const { ApiError, uuid, nowIso } = require('../util');

const r = express.Router();
r.use(perms.requireAdmin);

const TYPES = ['examen', 'seminario', 'exhibicion', 'clase_especial', 'evento', 'agradecimiento', 'otros'];

function parse(b, student) {
  b = v.object(b);
  const type = v.oneOf(b.type, 'Tipo', TYPES);
  const rec = {
    type,
    activity: v.str(b.activity, 'Actividad', { max: 200, required: true }),
    date: v.date(b.date, 'Fecha', { required: true }),
    place: v.str(b.place, 'Lugar', { max: 200 }),
    instructor: v.str(b.instructor, 'Instructor', { max: 200 }),
    notes: v.str(b.notes, 'Observaciones', { max: 1000 }),
    belt: null, result: null,
  };
  if (type === 'examen') {
    rec.belt = v.str(b.belt, 'Cinturón evaluado', { max: 80, required: true });
    const belt = db.get().prepare('SELECT grp FROM belts WHERE id = ?').get(rec.belt);
    if (!belt || belt.grp !== student.grp) throw new ApiError(400, 'Cinturón evaluado: no corresponde al grupo del alumno.');
    rec.result = v.oneOf(b.result, 'Resultado', ['aprobado', 'no aprobado']);
  }
  return rec;
}

function applyExamResult(studentId, rec) {
  if (rec.type === 'examen' && rec.result === 'aprobado') {
    db.get().prepare('UPDATE students SET belt_id = ?, belt_since = ?, updated_at = ? WHERE id = ?').run(rec.belt, rec.date, nowIso(), studentId);
  }
}

r.post('/', (req, res) => {
  const b = v.object(req.body);
  const studentId = v.id(b.studentId, 'Alumno');
  const student = db.get().prepare('SELECT * FROM students WHERE id = ?').get(studentId);
  if (!student) throw new ApiError(404, 'Alumno no encontrado.');
  const rec = parse(b, student);
  const id = uuid();
  db.tx(conn => {
    conn.prepare(`INSERT INTO activities (id, student_id, type, activity, date, place, instructor, notes, belt_id, result, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, studentId, rec.type, rec.activity, rec.date, rec.place, rec.instructor, rec.notes, rec.belt, rec.result, nowIso());
    applyExamResult(studentId, rec);
  });
  security.audit(req, 'activity_created', 'activity', id, { studentId, type: rec.type, result: rec.result });
  res.status(201).json({ activity: S.activity(db.get().prepare('SELECT * FROM activities WHERE id = ?').get(id)), student: queries.studentFull(studentId) });
});

r.put('/:id', (req, res) => {
  const id = v.id(req.params.id, 'Actividad');
  const cur = db.get().prepare('SELECT * FROM activities WHERE id = ?').get(id);
  if (!cur) throw new ApiError(404, 'Actividad no encontrada.');
  const student = db.get().prepare('SELECT * FROM students WHERE id = ?').get(cur.student_id);
  const rec = parse(req.body, student);
  db.tx(conn => {
    conn.prepare('UPDATE activities SET type=?, activity=?, date=?, place=?, instructor=?, notes=?, belt_id=?, result=? WHERE id = ?')
      .run(rec.type, rec.activity, rec.date, rec.place, rec.instructor, rec.notes, rec.belt, rec.result, id);
    applyExamResult(cur.student_id, rec);
  });
  security.audit(req, 'activity_updated', 'activity', id);
  res.json({ activity: S.activity(db.get().prepare('SELECT * FROM activities WHERE id = ?').get(id)), student: queries.studentFull(cur.student_id) });
});

r.delete('/:id', (req, res) => {
  const id = v.id(req.params.id, 'Actividad');
  const cur = db.get().prepare('SELECT student_id FROM activities WHERE id = ?').get(id);
  if (!cur) throw new ApiError(404, 'Actividad no encontrada.');
  db.get().prepare('DELETE FROM activities WHERE id = ?').run(id);
  security.audit(req, 'activity_deleted', 'activity', id);
  res.json({ student: queries.studentFull(cur.student_id) });
});

module.exports = r;
