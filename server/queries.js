'use strict';
const db = require('./db');
const S = require('./serialize');
const settings = require('./settings');
const { parseJson } = require('./util');

const q = () => db.get();

function activitiesByStudent() {
  const map = new Map();
  for (const r of q().prepare('SELECT * FROM activities ORDER BY date, created_at').all()) {
    if (!map.has(r.student_id)) map.set(r.student_id, []);
    map.get(r.student_id).push(r);
  }
  return map;
}

const usernameOf = studentId => (q().prepare('SELECT username FROM users WHERE student_id = ?').get(studentId) || {}).username || '';

function studentFull(id) {
  const row = q().prepare('SELECT * FROM students WHERE id = ?').get(id);
  if (!row) return null;
  const acts = q().prepare('SELECT * FROM activities WHERE student_id = ? ORDER BY date, created_at').all(id);
  return S.student(row, { activities: acts, username: usernameOf(id) });
}

function allStudentsFull() {
  const acts = activitiesByStudent();
  const users = new Map(q().prepare('SELECT student_id, username FROM users WHERE student_id IS NOT NULL').all().map(u => [u.student_id, u.username]));
  return q().prepare('SELECT * FROM students ORDER BY name COLLATE NOCASE').all()
    .map(r => S.student(r, { activities: acts.get(r.id) || [], username: users.get(r.id) || '' }));
}

function allBelts() {
  return q().prepare('SELECT * FROM belts ORDER BY grp, position').all().map(S.belt);
}

function allPrograms() {
  const out = {};
  for (const r of q().prepare('SELECT * FROM programs').all()) out[r.belt_id] = parseJson(r.items, []);
  return out;
}

const allEvents = () => q().prepare('SELECT * FROM events ORDER BY date').all().map(S.event);
const allSchedule = () => q().prepare('SELECT * FROM schedule_items ORDER BY sort_order, rowid').all().map(S.scheduleItem);
const allDojos = () => q().prepare('SELECT * FROM dojos ORDER BY rowid').all();

// Configuración que puede ver cualquiera (portada, pantalla de ingreso): sin datos privados.
function publicConfig() {
  const lh = settings.get('letterhead');
  const hiddenLh = { ...lh, show: { ...lh.show } };
  for (const key of Object.keys(lh.show)) if (!lh.show[key]) hiddenLh[key] = '';
  const home = settings.get('home');
  const heroId = settings.getRaw('heroFileId');
  const logoId = settings.getRaw('logoFileId');
  return {
    home: { ...home, heroPhoto: S.fileUrl(heroId) },
    theme: settings.get('theme'),
    letterhead: hiddenLh,
    logo: S.fileUrl(logoId),
    dojos: allDojos(),
    belts: allBelts(),
    events: allEvents(),
    schedule: allSchedule(),
  };
}

module.exports = { studentFull, allStudentsFull, allBelts, allPrograms, allEvents, allSchedule, allDojos, publicConfig, usernameOf };
