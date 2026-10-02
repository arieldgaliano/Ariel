'use strict';
const express = require('express');
const db = require('../db');
const perms = require('../permissions');
const security = require('../security');
const S = require('../serialize');
const { v } = require('../validate');
const { ApiError, uuid, nowIso, toCents } = require('../util');

const r = express.Router();
r.use(perms.requireAdmin);

const CATEGORIES = ['Alquiler', 'Material', 'Certificados de cinturón', 'Otro'];
const fresh = id => S.expense(db.get().prepare('SELECT * FROM expenses WHERE id = ?').get(id));

r.post('/', (req, res) => {
  const b = v.object(req.body);
  const category = v.oneOf(b.category, 'Categoría', CATEGORIES);
  const concept = v.str(b.concept, 'Concepto', { max: 200, required: true });
  const amount = v.money(b.amount, 'Monto');
  const date = v.date(b.date, 'Fecha', { required: true });
  const status = v.oneOf(b.status, 'Estado', ['pagado', 'pendiente']);
  const id = uuid();
  db.get().prepare('INSERT INTO expenses (id, category, concept, amount_cents, date, status, paid_on, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, category, concept, toCents(amount), date, status, status === 'pagado' ? date : null, nowIso());
  security.audit(req, 'expense_created', 'expense', id, { amount, category });
  res.status(201).json({ expense: fresh(id) });
});

r.post('/:id/pay', (req, res) => {
  const id = v.id(req.params.id, 'Gasto');
  const cur = db.get().prepare('SELECT * FROM expenses WHERE id = ?').get(id);
  if (!cur) throw new ApiError(404, 'Gasto no encontrado.');
  if (cur.status !== 'pendiente') throw new ApiError(409, 'Ese gasto ya está pagado.');
  const b = v.object(req.body);
  db.get().prepare("UPDATE expenses SET status = 'pagado', amount_cents = ?, paid_on = ? WHERE id = ?")
    .run(toCents(v.money(b.amount, 'Monto')), v.date(b.paidOn, 'Fecha de pago', { required: true }), id);
  security.audit(req, 'expense_paid', 'expense', id);
  res.json({ expense: fresh(id) });
});

module.exports = r;
module.exports.CATEGORIES = CATEGORIES;
