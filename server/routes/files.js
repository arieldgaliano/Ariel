'use strict';
const express = require('express');
const files = require('../files');
const perms = require('../permissions');
const config = require('../config');
const { ApiError } = require('../util');
const { v } = require('../validate');
const db = require('../db');

const r = express.Router();

// Subida de archivos: el cuerpo del pedido es el archivo en sí (sin base64).
// kind: student_photo | logo | hero | signature  → solo Sensei
//       proof                                    → alumno (comprobante de un pago propio)
r.post('/', perms.requireAuth, express.raw({ type: () => true, limit: config.maxUploadBytes + 1024 }), (req, res) => {
  const kind = v.oneOf(req.query.kind, 'Tipo', ['student_photo', 'logo', 'hero', 'signature', 'proof']);
  const buffer = req.body;
  if (!Buffer.isBuffer(buffer)) throw new ApiError(400, 'No llegó ningún archivo.');
  let ownerStudentId = null;
  if (kind === 'proof') {
    if (!req.auth.studentId) throw new ApiError(403, 'Ingresá como Senpai/Kohai para subir un comprobante.');
    ownerStudentId = req.auth.studentId;
    const recent = db.get().prepare("SELECT COUNT(*) AS n FROM files WHERE kind = 'proof' AND created_by = ? AND created_at > ?")
      .get(req.auth.user.id, new Date(Date.now() - 3600 * 1000).toISOString()).n;
    if (recent >= 20) throw new ApiError(429, 'Subiste muchos archivos seguidos. Probá en un rato.');
  } else {
    if (!req.auth.isAdmin) throw new ApiError(403, 'Solo el Sensei puede hacer esto.');
    if (kind === 'student_photo') {
      ownerStudentId = v.id(req.query.studentId, 'Alumno');
      if (!db.get().prepare('SELECT 1 FROM students WHERE id = ?').get(ownerStudentId)) throw new ApiError(404, 'Alumno no encontrado.');
    }
  }
  const row = files.save({
    buffer, kind, ownerStudentId, createdBy: req.auth.user.id,
    originalName: decodeURIComponent(String(req.get('x-filename') || '')).replace(/[^\w .()-]/g, '_'),
  });
  res.status(201).json({ id: row.id, url: `/files/${row.id}`, mime: row.mime, size: row.size });
});

module.exports = r;
