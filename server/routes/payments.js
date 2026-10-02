'use strict';
const express = require('express');
const db = require('../db');
const files = require('../files');
const perms = require('../permissions');
const security = require('../security');
const settings = require('../settings');
const S = require('../serialize');
const { v } = require('../validate');
const { ApiError, uuid, nowIso, todayIso, currentMonth, toCents } = require('../util');

const r = express.Router();

const TIPOS = ['cuota', 'adelanto', 'examen', 'examen_cinturon', 'cinturon', 'otros'];
const METHODS = { 'Físico': ['Efectivo'], 'Electrónico': ['Transferencia', 'Mercado Pago', 'Otro medio electrónico'] };
const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const monthLabel = ym => `${MONTHS_ES[parseInt(ym.slice(5, 7), 10) - 1]} ${ym.slice(0, 4)}`;

const canCollect = access => access.isAdmin || access.level('pagos') === 'write';
const requireCollector = (req, _res, next) => (req.auth && canCollect(req.auth)
  ? next() : next(new ApiError(req.auth ? 403 : 401, req.auth ? 'No tenés permiso para registrar pagos.' : 'Tenés que iniciar sesión.')));

const getPayment = id => {
  const row = db.get().prepare('SELECT * FROM payments WHERE id = ?').get(v.id(id, 'Pago'));
  if (!row) throw new ApiError(404, 'Pago no encontrado.');
  return row;
};
const fresh = id => S.payment(db.get().prepare('SELECT * FROM payments WHERE id = ?').get(id));

function suggestedCents(tipo, student) {
  const fees = settings.get('fees');
  const base = student.scholarship_active ? student.scholarship_cents / 100
    : (student.grp === 'infantil' ? fees.cuotaInfantil : fees.cuotaAdulto);
  if (tipo === 'cuota' || tipo === 'adelanto') return toCents(base);
  if (tipo === 'examen') return toCents(fees.examBoard);
  if (tipo === 'examen_cinturon') return toCents(fees.examBoard + fees.belt);
  if (tipo === 'cinturon') return toCents(fees.belt);
  return 0;
}

function conceptLabel(tipo, student, custom) {
  const beca = (tipo === 'cuota' || tipo === 'adelanto') && student.scholarship_active ? ' (becada)' : '';
  if (tipo === 'otros') return custom || 'Otros';
  return {
    cuota: 'Cuota mensual' + beca, adelanto: 'Cuota adelantada' + beca, examen: 'Mesa de examen',
    examen_cinturon: 'Mesa de examen + cinturón', cinturon: 'Cinturón (graduación)',
  }[tipo];
}

// Marca un pago como cobrado y le asigna su número de recibo correlativo.
function markPaid(conn, id, { amountCents, medium, method, confirmedBy }) {
  const receiptNo = settings.nextCounter('receipt');
  conn.prepare(`UPDATE payments SET status = 'pagada', paid_on = ?, amount_cents = ?, medium = ?, method = ?, receipt_no = ?, created_by = COALESCE(created_by, ?)
                WHERE id = ?`)
    .run(todayIso(), amountCents, medium, method, receiptNo, confirmedBy, id);
}

// Lista: el Sensei y quien cobra ven todo; el resto solo sus propios pagos.
r.get('/', perms.requireAuth, (req, res) => {
  const rows = canCollect(req.auth)
    ? db.get().prepare('SELECT * FROM payments ORDER BY created_at, rowid').all()
    : db.get().prepare('SELECT * FROM payments WHERE student_id = ? ORDER BY created_at, rowid').all(req.auth.studentId);
  res.json({ payments: rows.map(S.payment) });
});

// Registrar un cobro (queda pagado en el acto y genera recibo).
r.post('/', requireCollector, (req, res) => {
  const b = v.object(req.body);
  const studentId = v.id(b.studentId, 'Alumno');
  const student = db.get().prepare("SELECT * FROM students WHERE id = ? AND status = 'activo'").get(studentId);
  if (!student) throw new ApiError(404, 'Alumno no encontrado o suspendido.');
  const tipo = v.oneOf(b.tipo, 'Concepto', TIPOS);
  const custom = tipo === 'otros' ? v.str(b.customConcept, 'Concepto', { max: 120, required: true }) : '';
  const amount = v.money(b.amount, 'Monto');
  const medium = v.oneOf(b.medium, 'Medio', Object.keys(METHODS));
  const method = v.oneOf(b.method, 'Detalle', METHODS[medium]);
  const periodMonth = v.month(b.periodMonth, 'Mes') || currentMonth();
  const period = v.str(b.period, 'Período', { max: 120 }) || monthLabel(periodMonth);
  const concept = conceptLabel(tipo, student, custom);

  let id;
  db.tx(conn => {
    // Si ya había una cuota pendiente (o con comprobante en revisión) de ese mes, se cobra esa en vez de duplicarla.
    const open = (tipo === 'cuota' || tipo === 'adelanto')
      ? conn.prepare("SELECT id FROM payments WHERE student_id = ? AND tipo = ? AND period_month = ? AND status IN ('pendiente','revision')")
        .get(studentId, tipo, periodMonth)
      : null;
    if (open) {
      id = open.id;
    } else {
      id = uuid();
      conn.prepare(`INSERT INTO payments (id, student_id, tipo, period, period_month, concept, amount_cents, status, created_by, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?)`)
        .run(id, studentId, tipo, period, periodMonth, concept, toCents(amount), req.auth.user.id, nowIso());
    }
    markPaid(conn, id, { amountCents: toCents(amount), medium, method, confirmedBy: req.auth.user.id });
  });
  security.audit(req, 'payment_registered', 'payment', id, { studentId, tipo, amount });
  res.status(201).json({ payment: fresh(id) });
});

// Genera las cuotas pendientes de todo el mes para los alumnos activos que todavía no tienen una.
r.post('/generate-monthly', perms.requireAdmin, (req, res) => {
  const month = v.month(v.object(req.body).month, 'Mes', { required: true });
  const created = [];
  db.tx(conn => {
    const students = conn.prepare("SELECT * FROM students WHERE status = 'activo'").all();
    const exists = conn.prepare("SELECT 1 FROM payments WHERE student_id = ? AND tipo = 'cuota' AND period_month = ?");
    const insert = conn.prepare(`INSERT INTO payments (id, student_id, tipo, period, period_month, concept, amount_cents, status, created_by, created_at)
                                 VALUES (?, ?, 'cuota', ?, ?, ?, ?, 'pendiente', ?, ?)`);
    for (const s of students) {
      if (exists.get(s.id, month)) continue;
      const cents = suggestedCents('cuota', s);
      if (cents <= 0) continue; // beca de valor cero: no hay nada que cobrar
      const id = uuid();
      insert.run(id, s.id, monthLabel(month), month, conceptLabel('cuota', s), cents, req.auth.user.id, nowIso());
      created.push(id);
    }
  });
  security.audit(req, 'payments_generated', 'payment', null, { month, count: created.length });
  const rows = created.map(id => fresh(id));
  res.status(201).json({ created: rows.length, payments: rows });
});

// Cobrar una cuota que estaba pendiente.
r.post('/:id/pay', requireCollector, (req, res) => {
  const p = getPayment(req.params.id);
  if (p.status !== 'pendiente') throw new ApiError(409, 'Ese pago ya no está pendiente.');
  const b = v.object(req.body);
  const amount = v.money(b.amount, 'Monto');
  const medium = v.oneOf(b.medium, 'Medio', Object.keys(METHODS));
  const method = v.oneOf(b.method, 'Detalle', METHODS[medium]);
  db.tx(conn => markPaid(conn, p.id, { amountCents: toCents(amount), medium, method, confirmedBy: req.auth.user.id }));
  security.audit(req, 'payment_paid', 'payment', p.id, { amount });
  res.json({ payment: fresh(p.id) });
});

// Confirmar un comprobante que subió el alumno.
r.post('/:id/confirm-proof', requireCollector, (req, res) => {
  const p = getPayment(req.params.id);
  if (p.status !== 'revision') throw new ApiError(409, 'Ese pago no tiene un comprobante para confirmar.');
  db.tx(conn => markPaid(conn, p.id, {
    amountCents: p.amount_cents, medium: 'Electrónico', method: `${p.proof_medium} (comprobante del alumno)`, confirmedBy: req.auth.user.id,
  }));
  security.audit(req, 'payment_proof_confirmed', 'payment', p.id);
  res.json({ payment: fresh(p.id) });
});

// El alumno informa que pagó y adjunta su comprobante (solo sobre pagos propios y pendientes).
r.post('/:id/proof', perms.requireStudent, (req, res) => {
  const p = getPayment(req.params.id);
  if (p.student_id !== req.auth.studentId) throw new ApiError(404, 'Pago no encontrado.');
  if (p.status !== 'pendiente') throw new ApiError(409, 'Ese pago ya no está pendiente.');
  const b = v.object(req.body);
  const medium = v.oneOf(b.medium, 'Medio utilizado', ['Transferencia', 'Mercado Pago']);
  const note = v.str(b.note, 'Nota', { max: 500 });
  db.tx(conn => {
    if (b.fileId) files.claim(v.id(b.fileId, 'Comprobante'), { kind: 'proof', ownerStudentId: req.auth.studentId, createdBy: req.auth.user.id });
    conn.prepare("UPDATE payments SET status = 'revision', proof_medium = ?, proof_note = ?, proof_file_id = ?, proof_submitted_at = ? WHERE id = ?")
      .run(medium, note, b.fileId || null, nowIso(), p.id);
  });
  security.audit(req, 'payment_proof_submitted', 'payment', p.id);
  res.json({ payment: fresh(p.id) });
});

module.exports = r;
module.exports.monthLabel = monthLabel;
