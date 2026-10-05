'use strict';
const { fromCents, parseJson } = require('./util');

const fileUrl = id => (id ? `/files/${id}` : null);

const activity = r => ({
  id: r.id, studentId: r.student_id, type: r.type, activity: r.activity, date: r.date,
  place: r.place, instructor: r.instructor, notes: r.notes, belt: r.belt_id || undefined, result: r.result || undefined,
});

// Ficha completa: la ve el Sensei y cada alumno sobre sí mismo.
function student(r, { activities = [], username = '' } = {}) {
  return {
    id: r.id, name: r.name, belt: r.belt_id, since: r.joined_on, beltSince: r.belt_since,
    birth: r.birth || '', familyGroup: r.family_group, phone: r.phone, guardian: r.guardian,
    group: r.grp, dojo: r.dojo_id, status: r.status, isInstructor: !!r.is_instructor,
    scholarship: { active: !!r.scholarship_active, amount: fromCents(r.scholarship_cents) },
    dni: r.dni, username, allergies: r.allergies, emergencyContact: r.emergency_contact, emergencyPhone: r.emergency_phone,
    photo: fileUrl(r.photo_file_id), enabledModules: parseJson(r.enabled_modules, []), modulePerms: parseJson(r.module_perms, {}),
    activities: activities.map(activity),
  };
}

// Versión mínima para listas de compañeros (asistencia, cobros). Sin datos médicos ni DNI.
function roster(r, { contact = false } = {}) {
  const out = { id: r.id, name: r.name, belt: r.belt_id, group: r.grp, dojo: r.dojo_id, status: r.status, since: r.joined_on, beltSince: r.belt_since };
  if (contact) {
    out.phone = r.phone;
    out.scholarship = { active: !!r.scholarship_active, amount: fromCents(r.scholarship_cents) };
  }
  return out;
}

const receiptNumber = p => (p.receipt_no ? `R-${String(p.receipt_no).padStart(4, '0')}-${(p.paid_on || '').slice(0, 4)}` : null);

const payment = r => ({
  id: r.id, studentId: r.student_id, tipo: r.tipo, period: r.period, periodMonth: r.period_month,
  concept: r.concept, amount: fromCents(r.amount_cents), status: r.status,
  paidOn: r.paid_on || undefined, medium: r.medium || undefined, method: r.method || undefined,
  receiptNo: receiptNumber(r), voidReason: r.void_reason || undefined,
  proofMedium: r.proof_medium || undefined, proofNote: r.proof_note || undefined, proofUrl: fileUrl(r.proof_file_id) || undefined,
});

const expense = r => ({
  id: r.id, category: r.category, concept: r.concept, amount: fromCents(r.amount_cents),
  date: r.date, status: r.status, paidOn: r.paid_on || undefined,
});

const belt = r => ({
  id: r.id, name: r.name, group: r.grp, order: r.position, color: r.color,
  tip: r.tip || undefined, tipCount: r.tip_count || undefined,
  minMonths: r.min_months, classesRequired: r.classes_required, kyu: !!r.is_kyu || undefined,
});

const event = r => ({ id: r.id, type: r.type, title: r.title, date: r.date, notes: r.notes });
const scheduleItem = r => ({ id: r.id, day: r.day, details: r.details });
const glossary = r => ({ id: r.id, term: r.term, def: r.def });
const link = r => ({ id: r.id, title: r.title, url: r.url, type: r.type, desc: r.descr });
const forumPost = r => ({ id: r.id, author: r.author_name, role: r.author_role, text: r.text, date: r.date });
const announcement = r => ({ id: r.id, title: r.title, body: r.body, date: r.date });
const inscription = r => ({
  id: r.id, name: r.name, birth: r.birth || '', group: r.grp, dojo: r.dojo_id, phone: r.phone, dni: r.dni,
  guardian: r.guardian, emergencyPhone: r.emergency_phone, notes: r.notes, createdAt: r.created_at,
});
const diploma = r => ({
  id: r.id, number: r.number, studentId: r.student_id, studentName: r.student_name, activity: r.activity,
  type: r.type, date: r.date, issuedOn: r.issued_on, verifyCode: r.verify_code,
});

module.exports = { fileUrl, activity, student, roster, payment, expense, belt, event, scheduleItem, glossary, link, forumPost, announcement, inscription, diploma, receiptNumber };
