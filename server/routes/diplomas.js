'use strict';
const crypto = require('node:crypto');
const express = require('express');
const db = require('../db');
const perms = require('../permissions');
const security = require('../security');
const settings = require('../settings');
const S = require('../serialize');
const { v } = require('../validate');
const { ApiError, uuid, nowIso, todayIso } = require('../util');

const r = express.Router();
r.use(perms.requireAdmin);

const TYPES = ['examen', 'seminario', 'exhibicion', 'clase_especial', 'evento', 'agradecimiento', 'otros'];
const STYLES = ['clasico', 'okinawa', 'oriental', 'minimalista', 'imperial', 'bambu'];

// Código corto y no adivinable para el QR de verificación (sin caracteres que se confunden).
function newVerifyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 12; i++) out += chars[crypto.randomInt(chars.length)];
  return out;
}

r.put('/config', (req, res) => {
  const b = v.object(req.body);
  const cur = settings.get('diploma');
  const next = {
    style: v.oneOf(b.style, 'Estilo', STYLES),
    paperSize: v.oneOf(b.paperSize, 'Tamaño de papel', ['A4', 'A3']),
    titleExamen: v.str(b.titleExamen, 'Título', { max: 120 }) || cur.titleExamen,
    introText: v.str(b.introText, 'Introducción', { max: 200 }) || cur.introText,
    bodyExamen: v.str(b.bodyExamen, 'Cuerpo (exámenes)', { max: 200 }) || cur.bodyExamen,
    bodyGeneral: v.str(b.bodyGeneral, 'Cuerpo (otras actividades)', { max: 200 }) || cur.bodyGeneral,
    titleSize: v.int(b.titleSize, 'Tamaño del título', { min: 8, max: 60 }),
    nameSize: v.int(b.nameSize, 'Tamaño del nombre', { min: 8, max: 80 }),
    gradeSize: v.int(b.gradeSize, 'Tamaño del cinturón', { min: 8, max: 60 }),
    dateSize: v.int(b.dateSize, 'Tamaño de la fecha', { min: 6, max: 40 }),
    textSize: v.int(b.textSize, 'Tamaño del texto', { min: 6, max: 40 }),
    showTenure: v.bool(b.showTenure),
    showQr: v.bool(b.showQr),
  };
  settings.set('diploma', next);
  res.json({ diplomaConfig: { ...settings.get('diploma'), signatureImage: S.fileUrl(settings.getRaw('signatureFileId')) } });
});

// Emite diplomas: cada uno recibe su número correlativo y su código de verificación.
// items: [{activityId}]  → diploma de una actividad ya registrada
//        [{studentId?, studentName, type, activity, date}]  → certificado suelto
r.post('/issue', (req, res) => {
  const items = v.object(req.body).items;
  if (!Array.isArray(items) || !items.length || items.length > 100) throw new ApiError(400, 'Elegí entre 1 y 100 diplomas.');
  const issued = [];
  db.tx(conn => {
    for (const it of items) {
      v.object(it);
      let rec;
      if (it.activityId) {
        const a = conn.prepare('SELECT a.*, s.name AS student_name FROM activities a JOIN students s ON s.id = a.student_id WHERE a.id = ?').get(v.id(it.activityId, 'Actividad'));
        if (!a) throw new ApiError(404, 'Actividad no encontrada.');
        if (a.type === 'examen' && a.result !== 'aprobado') throw new ApiError(400, 'Solo se emiten diplomas de exámenes aprobados.');
        rec = { studentId: a.student_id, studentName: a.student_name, activity: a.activity, type: a.type, date: a.date };
      } else {
        let studentId = it.studentId ? v.id(it.studentId, 'Alumno') : null;
        let studentName = v.str(it.studentName, 'Nombre', { max: 120, required: true });
        if (studentId) {
          const s = conn.prepare('SELECT id, name FROM students WHERE id = ?').get(studentId);
          if (!s) throw new ApiError(404, 'Alumno no encontrado.');
          studentName = s.name;
        }
        rec = {
          studentId, studentName, activity: v.str(it.activity, 'Actividad', { max: 200, required: true }),
          type: v.oneOf(it.type, 'Tipo', TYPES), date: v.date(it.date, 'Fecha', { required: true }),
        };
      }
      const id = uuid();
      const number = settings.nextCounter('diploma');
      conn.prepare(`INSERT INTO diplomas_issued (id, number, verify_code, student_id, student_name, activity, type, date, issued_on, issued_by, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, number, newVerifyCode(), rec.studentId, rec.studentName, rec.activity, rec.type, rec.date, todayIso(), req.auth.user.id, nowIso());
      issued.push(S.diploma(conn.prepare('SELECT * FROM diplomas_issued WHERE id = ?').get(id)));
    }
  });
  security.audit(req, 'diplomas_issued', 'diploma', null, { numbers: issued.map(d => d.number) });
  res.status(201).json({ issued, nextDiplomaNumber: settings.peekCounter('diploma') });
});

module.exports = r;
