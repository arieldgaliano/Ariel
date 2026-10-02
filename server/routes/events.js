'use strict';
const express = require('express');
const db = require('../db');
const perms = require('../permissions');
const S = require('../serialize');
const { v } = require('../validate');
const { uuid } = require('../util');

const r = express.Router();
r.use(perms.requireAdmin);

const all = () => db.get().prepare('SELECT * FROM events ORDER BY date').all().map(S.event);

r.post('/', (req, res) => {
  const b = v.object(req.body);
  db.get().prepare('INSERT INTO events (id, type, title, date, notes) VALUES (?, ?, ?, ?, ?)')
    .run(uuid(), v.oneOf(b.type, 'Tipo', ['examen', 'torneo', 'seminario', 'actividad']), v.str(b.title, 'Título', { max: 200, required: true }),
      v.date(b.date, 'Fecha', { required: true }), v.str(b.notes, 'Notas', { max: 1000 }));
  res.status(201).json({ events: all() });
});

r.delete('/:id', (req, res) => {
  db.get().prepare('DELETE FROM events WHERE id = ?').run(v.id(req.params.id, 'Actividad'));
  res.json({ events: all() });
});

module.exports = r;
