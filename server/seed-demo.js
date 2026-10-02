'use strict';
// Datos de ejemplo del prototipo, SOLO para probar. Nunca cargar en el sistema real.
const fs = require('node:fs');
const path = require('node:path');
const db = require('./db');
const security = require('./security');
const settings = require('./settings');
const { seedReferenceData } = require('./bootstrap-data');
const { uuid, nowIso, toCents } = require('./util');

const MONTHS = { Enero: '01', Febrero: '02', Marzo: '03', Abril: '04', Mayo: '05', Junio: '06', Julio: '07', Agosto: '08', Septiembre: '09', Octubre: '10', Noviembre: '11', Diciembre: '12' };
const periodMonth = label => { const m = /^(\w+) (\d{4})$/.exec(label || ''); return m && MONTHS[m[1]] ? `${m[2]}-${MONTHS[m[1]]}` : '2026-09'; };

async function seedDemo({ password = 'demo1234' } = {}) {
  seedReferenceData();
  const conn = db.get();
  if (conn.prepare('SELECT 1 FROM students LIMIT 1').get()) throw new Error('La base ya tiene alumnos; no se cargan datos de ejemplo.');
  const demo = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed', 'demo.json'), 'utf8'));
  const hashes = [];
  for (let i = 0; i <= demo.students.length; i++) hashes.push(await security.hashPassword(password)); // cada usuario con su propia sal
  const now = nowIso();
  const idMap = new Map();

  db.tx(c => {
    if (!c.prepare("SELECT 1 FROM users WHERE role = 'admin'").get()) {
      c.prepare("INSERT INTO users (id, username, password_hash, role, student_id, must_change_password, created_at) VALUES (?, 'sensei', ?, 'admin', NULL, 0, ?)")
        .run(uuid(), hashes[0], now);
    }
    for (const [idx, s] of demo.students.entries()) {
      const id = uuid();
      idMap.set(s.id, id);
      c.prepare(`INSERT INTO students (id, name, belt_id, joined_on, belt_since, birth, family_group, phone, guardian, grp, dojo_id, status, is_instructor,
                   scholarship_active, scholarship_cents, dni, allergies, emergency_contact, emergency_phone, enabled_modules, module_perms, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, s.name, s.belt, s.since, s.since, s.birth || null, s.familyGroup || '', s.phone || '', s.guardian || '', s.group, s.dojo, s.status,
          s.isInstructor ? 1 : 0, s.scholarship.active ? 1 : 0, toCents(s.scholarship.amount), s.dni || '', s.allergies || '', s.emergencyContact || '',
          s.emergencyPhone || '', JSON.stringify(s.enabledModules || []), JSON.stringify(s.modulePerms || {}), now, now);
      c.prepare('INSERT INTO users (id, username, password_hash, role, student_id, must_change_password, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)')
        .run(uuid(), s.username, hashes[idx + 1], 'student', id, now);
      for (const a of s.activities || []) {
        c.prepare('INSERT INTO activities (id, student_id, type, activity, date, place, instructor, notes, belt_id, result, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .run(uuid(), id, a.type, a.activity, a.date, a.place || '', a.instructor || '', a.notes || '', a.belt || null, a.result || null, now);
      }
    }
    for (const p of demo.payments) {
      const paid = p.status === 'pagada';
      const tipo = /examen/i.test(p.concept) ? 'examen' : 'cuota';
      c.prepare(`INSERT INTO payments (id, student_id, tipo, period, period_month, concept, amount_cents, status, paid_on, medium, method, receipt_no,
                   proof_medium, proof_note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(uuid(), idMap.get(p.studentId), tipo, p.period, periodMonth(p.period), p.concept, toCents(p.amount), p.status, p.paidOn || null,
          p.medium || null, p.method || null, paid ? settings.nextCounter('receipt') : null, p.proofMedium || null, p.proofNote || null, now);
    }
    for (const e of demo.expenses) {
      c.prepare('INSERT INTO expenses (id, category, concept, amount_cents, date, status, paid_on, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(uuid(), e.category, e.concept, toCents(e.amount), e.date, e.status, e.paidOn || null, now);
    }
    demo.schedule.forEach((s, i) => c.prepare('INSERT INTO schedule_items (id, day, details, sort_order) VALUES (?, ?, ?, ?)').run(uuid(), s.day, s.details, i + 1));
    for (const e of demo.events) c.prepare('INSERT INTO events (id, type, title, date, notes) VALUES (?, ?, ?, ?, ?)').run(uuid(), e.type, e.title, e.date, e.notes || '');
    for (const [oldId, dates] of Object.entries(demo.attendance)) {
      for (const d of dates) c.prepare("INSERT OR IGNORE INTO attendance (student_id, date, source, created_at) VALUES (?, ?, 'manual', ?)").run(idMap.get(Number(oldId)), d, now);
    }
    for (const i of demo.inscriptions) {
      c.prepare('INSERT INTO inscriptions (id, name, birth, grp, dojo_id, phone, dni, guardian, emergency_phone, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(uuid(), i.name, i.birth || null, i.group, i.dojo, i.phone || '', i.dni || '', i.guardian || '', '', i.notes || '', now);
    }
    for (const g of demo.glossary) c.prepare('INSERT INTO library_glossary (id, term, def) VALUES (?, ?, ?)').run(uuid(), g.term, g.def);
    for (const l of demo.links) c.prepare('INSERT INTO library_links (id, title, url, type, descr) VALUES (?, ?, ?, ?, ?)').run(uuid(), l.title, l.url, l.type, l.desc || '');
    for (const f of demo.forum) c.prepare('INSERT INTO forum_posts (id, author_id, author_name, author_role, text, date, created_at) VALUES (?, NULL, ?, ?, ?, ?, ?)').run(uuid(), f.author, f.role, f.text, f.date, now);
    for (const a of demo.announcements) c.prepare('INSERT INTO announcements (id, title, body, date, created_at) VALUES (?, ?, ?, ?, ?)').run(uuid(), a.title, a.body, a.date, now);
  });
  return { password, students: demo.students.map(s => ({ username: s.username, name: s.name, instructor: s.isInstructor, status: s.status })) };
}

module.exports = { seedDemo };
