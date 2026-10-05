'use strict';
const express = require('express');
const db = require('../db');
const S = require('../serialize');
const queries = require('../queries');
const settings = require('../settings');
const perms = require('../permissions');
const { sessionPayload } = require('./auth');
const { parseJson } = require('../util');

const r = express.Router();

// Alumnos visibles para quien toma asistencia o cobra: solo lo mínimo, nunca fichas médicas.
function rosterFor(access) {
  const conn = db.get();
  const byId = new Map();
  if (access.level('asistencia') !== 'none') {
    const own = conn.prepare("SELECT * FROM students WHERE status = 'activo' AND dojo_id = ?").all(access.studentRow.dojo_id);
    own.forEach(s => byId.set(s.id, S.roster(s)));
  }
  if (access.level('pagos') === 'write') {
    conn.prepare("SELECT * FROM students WHERE status = 'activo'").all().forEach(s => byId.set(s.id, S.roster(s, { contact: true })));
  }
  byId.delete(access.studentId);
  return [...byId.values()];
}

// Los alumnos ven su programa hasta su cinturón actual, no los siguientes.
function programsFor(access, belts, programs) {
  if (access.isAdmin || access.level('programas') !== 'none') return programs;
  const mine = belts.filter(b => b.group === access.studentRow.grp).sort((a, b) => a.order - b.order);
  const idx = mine.findIndex(b => b.id === access.studentRow.belt_id);
  const out = {};
  mine.slice(0, idx + 1).forEach(b => { out[b.id] = programs[b.id] || []; });
  return out;
}

r.get('/', perms.requireAuth, (req, res) => {
  const a = req.auth;
  const conn = db.get();
  const cfg = queries.publicConfig();
  const out = { me: sessionPayload(a), config: cfg };

  out.programs = programsFor(a, cfg.belts, queries.allPrograms());

  if (a.isAdmin) {
    out.students = queries.allStudentsFull();
    out.fees = settings.get('fees');
    out.letterhead = settings.get('letterhead');
    out.theme = settings.get('theme');
    out.diplomaConfig = { ...settings.get('diploma'), signatureImage: S.fileUrl(settings.getRaw('signatureFileId')) };
    out.nextDiplomaNumber = settings.peekCounter('diploma');
    out.issuedDiplomas = conn.prepare('SELECT * FROM diplomas_issued ORDER BY number').all().map(S.diploma);
    out.expenses = conn.prepare('SELECT * FROM expenses ORDER BY date, created_at').all().map(S.expense);
    out.inscriptions = conn.prepare('SELECT * FROM inscriptions ORDER BY created_at').all().map(S.inscription);
    out.payments = conn.prepare('SELECT * FROM payments ORDER BY created_at, rowid').all().map(S.payment);
  } else {
    const self = queries.studentFull(a.studentId);
    out.students = [self, ...rosterFor(a)];
    out.letterhead = cfg.letterhead;
    if (a.level('pagos') === 'write') {
      out.fees = settings.get('fees');
      out.payments = conn.prepare('SELECT * FROM payments ORDER BY created_at, rowid').all().map(S.payment);
    } else {
      out.payments = conn.prepare("SELECT * FROM payments WHERE student_id = ? AND status != 'anulada' ORDER BY created_at, rowid").all(a.studentId).map(S.payment);
    }
    const since = a.studentRow.belt_since;
    out.classesSinceBelt = conn.prepare('SELECT COUNT(*) AS n FROM attendance WHERE student_id = ? AND date >= ?').get(a.studentId, since).n;
  }

  if (a.isAdmin || a.level('biblioteca') !== 'none') {
    out.glossary = conn.prepare('SELECT * FROM library_glossary ORDER BY term COLLATE NOCASE').all().map(S.glossary);
    out.links = conn.prepare('SELECT * FROM library_links ORDER BY title COLLATE NOCASE').all().map(S.link);
  }
  if (a.isAdmin || a.level('foro') !== 'none') {
    out.announcements = conn.prepare('SELECT * FROM announcements ORDER BY created_at').all().map(S.announcement);
    out.forumPosts = conn.prepare('SELECT * FROM forum_posts ORDER BY created_at').all().map(S.forumPost);
  }
  res.json(out);
});

module.exports = r;
