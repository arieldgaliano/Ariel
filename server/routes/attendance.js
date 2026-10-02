'use strict';
const crypto = require('node:crypto');
const express = require('express');
const db = require('../db');
const perms = require('../permissions');
const security = require('../security');
const settings = require('../settings');
const { v } = require('../validate');
const { ApiError, todayIso, nowIso, currentMonth } = require('../util');

const r = express.Router();

// El Sensei ve todos los dojos; quien tiene el módulo Asistencia ve solo los alumnos de su dojo.
function scopeSql(access) {
  return access.isAdmin ? { sql: '', args: [] } : { sql: 'AND s.dojo_id = ?', args: [access.studentRow.dojo_id] };
}
const canTake = access => access.level('asistencia') === 'write';

r.get('/months', perms.requireModule('asistencia'), (req, res) => {
  const sc = scopeSql(req.auth);
  const rows = db.get().prepare(`SELECT DISTINCT substr(a.date, 1, 7) AS m FROM attendance a JOIN students s ON s.id = a.student_id
                                 WHERE 1=1 ${sc.sql} ORDER BY m`).all(...sc.args);
  const set = new Set(rows.map(x => x.m));
  set.add(currentMonth());
  res.json({ months: [...set].sort() });
});

r.get('/', perms.requireModule('asistencia'), (req, res) => {
  const month = v.month(req.query.month, 'Mes', { required: true });
  const sc = scopeSql(req.auth);
  const rows = db.get().prepare(`SELECT a.student_id, a.date FROM attendance a JOIN students s ON s.id = a.student_id
                                 WHERE a.date LIKE ? ${sc.sql} ORDER BY a.date`).all(month + '-%', ...sc.args);
  const records = {};
  const dates = new Set();
  for (const row of rows) { (records[row.student_id] ||= []).push(row.date); dates.add(row.date); }
  res.json({ month, dates: [...dates].sort(), records });
});

// Rango arbitrario, para descargar la planilla.
r.get('/range', perms.requireModule('asistencia'), (req, res) => {
  const from = v.date(req.query.from, 'Desde', { required: true });
  const to = v.date(req.query.to, 'Hasta', { required: true });
  if (from > to) throw new ApiError(400, 'El rango de fechas no es válido.');
  const sc = scopeSql(req.auth);
  const rows = db.get().prepare(`SELECT a.student_id, a.date FROM attendance a JOIN students s ON s.id = a.student_id
                                 WHERE a.date >= ? AND a.date <= ? ${sc.sql} ORDER BY a.date`).all(from, to, ...sc.args);
  const records = {};
  const dates = new Set();
  for (const row of rows) { (records[row.student_id] ||= []).push(row.date); dates.add(row.date); }
  res.json({ dates: [...dates].sort(), records });
});

r.get('/today', perms.requireModule('asistencia'), (req, res) => {
  const date = todayIso();
  const sc = scopeSql(req.auth);
  const rows = db.get().prepare(`SELECT a.student_id FROM attendance a JOIN students s ON s.id = a.student_id
                                 WHERE a.date = ? ${sc.sql}`).all(date, ...sc.args);
  res.json({ date, present: rows.map(x => x.student_id) });
});

// Marcar o desmarcar la presencia de un alumno en una fecha.
r.put('/', perms.requireModule('asistencia', 'write'), (req, res) => {
  const b = v.object(req.body);
  const studentId = v.id(b.studentId, 'Alumno');
  const date = v.date(b.date, 'Fecha', { required: true });
  const present = v.bool(b.present);
  if (date > todayIso()) throw new ApiError(400, 'No se puede registrar asistencia en una fecha futura.');
  const student = db.get().prepare("SELECT id, dojo_id FROM students WHERE id = ? AND status = 'activo'").get(studentId);
  if (!student || (!req.auth.isAdmin && student.dojo_id !== req.auth.studentRow.dojo_id)) throw new ApiError(404, 'Alumno no encontrado.');
  if (present) {
    db.get().prepare("INSERT OR IGNORE INTO attendance (student_id, date, source, marked_by, created_at) VALUES (?, ?, 'manual', ?, ?)")
      .run(studentId, date, req.auth.user.id, nowIso());
  } else {
    db.get().prepare('DELETE FROM attendance WHERE student_id = ? AND date = ?').run(studentId, date);
  }
  res.json({ studentId, date, present });
});

// Cada alumno se marca solo escaneando el QR del dojo (con su sesión iniciada).
r.post('/checkin', perms.requireStudent, (req, res) => {
  const token = String(v.object(req.body).token || '');
  const expected = Buffer.from(settings.checkinToken());
  const given = Buffer.from(token);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    throw new ApiError(400, 'Este código QR ya no es válido. Pedile al Sensei el código actual.');
  }
  const date = todayIso();
  const res1 = db.get().prepare("INSERT OR IGNORE INTO attendance (student_id, date, source, marked_by, created_at) VALUES (?, ?, 'qr', ?, ?)")
    .run(req.auth.studentId, date, req.auth.user.id, nowIso());
  security.audit(req, 'attendance_checkin', 'student', req.auth.studentId, { date });
  res.json({ already: res1.changes === 0, date });
});

// El código que va impreso en el QR de la pared.
r.get('/qr', perms.requireModule('asistencia', 'write'), (_req, res) => res.json({ token: settings.checkinToken() }));
r.post('/qr/rotate', perms.requireAdmin, (req, res) => {
  security.audit(req, 'checkin_token_rotated');
  res.json({ token: settings.rotateCheckinToken() });
});

// Historial propio del alumno.
r.get('/me', perms.requireStudent, (req, res) => {
  const month = v.month(req.query.month, 'Mes') || currentMonth();
  const rows = db.get().prepare('SELECT date FROM attendance WHERE student_id = ? AND date LIKE ? ORDER BY date').all(req.auth.studentId, month + '-%');
  const total = db.get().prepare('SELECT COUNT(*) AS n FROM attendance WHERE student_id = ? AND date >= ?').get(req.auth.studentId, req.auth.studentRow.belt_since).n;
  res.json({ month, dates: rows.map(x => x.date), classesSinceBelt: total });
});

module.exports = r;
