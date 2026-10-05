'use strict';
const express = require('express');
const db = require('../db');
const perms = require('../permissions');
const { v } = require('../validate');
const { currentMonth } = require('../util');

const r = express.Router();
r.use(perms.requireAdmin);

const TIPO_LABEL = { cuota: 'Cuotas mensuales', adelanto: 'Cuotas adelantadas', examen: 'Mesas de examen', examen_cinturon: 'Examen + cinturón', cinturon: 'Cinturones', otros: 'Otros' };

function lastMonths(n) {
  const [y, m] = currentMonth().split('-').map(Number);
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

// Totales por mes para los gráficos: cobrado, gastado, deuda pendiente, asistencia y altas.
r.get('/summary', (req, res) => {
  const n = v.oneOf(Number(req.query.months || 12), 'Meses', [6, 12, 24]);
  const months = lastMonths(n);
  const from = months[0] + '-01';
  const c = db.get();
  const series = (sql, ...args) => {
    const map = new Map(c.prepare(sql).all(...args).map(x => [x.m, x.t]));
    return months.map(m => map.get(m) || 0);
  };
  const income = series("SELECT substr(paid_on, 1, 7) AS m, SUM(amount_cents) / 100.0 AS t FROM payments WHERE status = 'pagada' AND paid_on >= ? GROUP BY m", from);
  const expenses = series("SELECT substr(paid_on, 1, 7) AS m, SUM(amount_cents) / 100.0 AS t FROM expenses WHERE status = 'pagado' AND paid_on >= ? GROUP BY m", from);
  const pending = series("SELECT period_month AS m, SUM(amount_cents) / 100.0 AS t FROM payments WHERE status IN ('pendiente','revision') AND period_month >= ? GROUP BY m", months[0]);
  const attendance = series('SELECT substr(date, 1, 7) AS m, COUNT(*) AS t FROM attendance WHERE date >= ? GROUP BY m', from);
  const classes = series('SELECT m, COUNT(*) AS t FROM (SELECT DISTINCT substr(date, 1, 7) AS m, date FROM attendance WHERE date >= ?) GROUP BY m', from);
  const newStudents = series('SELECT substr(joined_on, 1, 7) AS m, COUNT(*) AS t FROM students WHERE joined_on >= ? GROUP BY m', from);
  const byTipo = c.prepare("SELECT tipo, SUM(amount_cents) / 100.0 AS total, COUNT(*) AS n FROM payments WHERE status = 'pagada' AND paid_on >= ? GROUP BY tipo ORDER BY total DESC", ).all(from)
    .map(x => ({ tipo: x.tipo, label: TIPO_LABEL[x.tipo] || x.tipo, total: x.total, count: x.n }));
  const active = c.prepare(`SELECT d.name AS dojo, s.grp AS grp, COUNT(*) AS n FROM students s JOIN dojos d ON d.id = s.dojo_id
                            WHERE s.status = 'activo' GROUP BY d.name, s.grp ORDER BY d.rowid, s.grp`).all();
  const debt = c.prepare("SELECT COUNT(DISTINCT student_id) AS students, COALESCE(SUM(amount_cents), 0) / 100.0 AS total FROM payments WHERE status IN ('pendiente','revision')").get();
  res.json({ months, income, expenses, pending, attendance, classes, newStudents, byTipo, active, debt });
});

module.exports = r;
