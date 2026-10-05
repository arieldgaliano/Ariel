'use strict';
const express = require('express');
const db = require('../db');
const queries = require('../queries');
const security = require('../security');
const { ApiError } = require('../util');
const settings = require('../settings');

const r = express.Router();
const limiter = security.memoryLimiter({ windowMs: 60 * 1000, max: 40 });

// Todo lo que puede ver cualquiera antes de iniciar sesión.
r.get('/config', (_req, res) => res.json(queries.publicConfig()));

// Verificación de un diploma por el código del QR.
r.get('/verify/:code', limiter, (req, res) => {
  const code = String(req.params.code || '');
  if (!/^[A-Za-z0-9_-]{6,40}$/.test(code)) throw new ApiError(404, 'Diploma no encontrado.');
  const row = db.get().prepare('SELECT * FROM diplomas_issued WHERE verify_code = ?').get(code);
  if (!row) throw new ApiError(404, 'Diploma no encontrado.');
  res.json({
    number: row.number, studentName: row.student_name, activity: row.activity, type: row.type,
    date: row.date, dojoName: settings.get('letterhead').dojoName,
  });
});

module.exports = r;
