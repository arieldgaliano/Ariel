'use strict';
const express = require('express');
const db = require('../db');
const perms = require('../permissions');
const S = require('../serialize');
const { v } = require('../validate');
const { ApiError, uuid } = require('../util');

const r = express.Router();
r.use(perms.requireAdmin);

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const fresh = id => S.scheduleItem(db.get().prepare('SELECT * FROM schedule_items WHERE id = ?').get(id));
const all = () => db.get().prepare('SELECT * FROM schedule_items ORDER BY sort_order, rowid').all().map(S.scheduleItem);

r.post('/', (req, res) => {
  const b = v.object(req.body);
  const id = uuid();
  const next = (db.get().prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM schedule_items').get()).n;
  db.get().prepare('INSERT INTO schedule_items (id, day, details, sort_order) VALUES (?, ?, ?, ?)')
    .run(id, v.oneOf(b.day, 'Día', DAYS), v.str(b.details, 'Detalle', { max: 200, required: true }), next);
  res.status(201).json({ schedule: all(), item: fresh(id) });
});

r.put('/:id', (req, res) => {
  const id = v.id(req.params.id, 'Clase');
  const b = v.object(req.body);
  const ok = db.get().prepare('UPDATE schedule_items SET day = ?, details = ? WHERE id = ?')
    .run(v.oneOf(b.day, 'Día', DAYS), v.str(b.details, 'Detalle', { max: 200, required: true }), id).changes;
  if (!ok) throw new ApiError(404, 'Clase no encontrada.');
  res.json({ schedule: all() });
});

r.delete('/:id', (req, res) => {
  db.get().prepare('DELETE FROM schedule_items WHERE id = ?').run(v.id(req.params.id, 'Clase'));
  res.json({ schedule: all() });
});

module.exports = r;
