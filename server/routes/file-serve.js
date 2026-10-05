'use strict';
const fs = require('node:fs');
const express = require('express');
const files = require('../files');
const settings = require('../settings');
const { ApiError } = require('../util');

const r = express.Router();

// ¿Puede esta persona ver este archivo? El logo y la foto de portada son públicos;
// la firma es solo del Sensei; la foto de un alumno la ven el Sensei y el propio alumno;
// un comprobante lo ven el Sensei, quien cobra (módulo Cuotas y pagos) y quien lo subió.
function canView(auth, row) {
  if (row.kind === 'logo' || row.kind === 'hero') return true;
  if (!auth) return false;
  if (auth.isAdmin) return true;
  if (row.kind === 'signature') return false;
  if (row.kind === 'student_photo') return auth.studentId === row.owner_student_id;
  if (row.kind === 'proof') return auth.studentId === row.owner_student_id || auth.level('pagos') === 'write';
  return false;
}

r.get('/:id', (req, res) => {
  const id = String(req.params.id || '');
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new ApiError(404, 'Archivo no encontrado.');
  const row = files.getRow(id);
  if (!row || !canView(req.auth, row)) throw new ApiError(404, 'Archivo no encontrado.');
  const file = files.pathFor(row);
  if (!fs.existsSync(file)) throw new ApiError(404, 'Archivo no encontrado.');
  const isPublic = row.kind === 'logo' || row.kind === 'hero';
  res.set({
    'Content-Type': row.mime,
    'Content-Length': String(row.size),
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    // El nombre del archivo es un UUID que cambia con cada subida, así que se puede cachear.
    'Cache-Control': isPublic ? 'public, max-age=86400' : 'private, max-age=3600',
    'Content-Disposition': 'inline',
  });
  fs.createReadStream(file).pipe(res);
});

module.exports = r;
