'use strict';
const crypto = require('node:crypto');
const db = require('./db');
const { parseJson } = require('./util');

// Valores de fábrica; lo guardado en la base los pisa campo por campo.
const DEFAULTS = {
  fees: { cuotaAdulto: 15000, cuotaInfantil: 12000, examBoard: 20000, belt: 8000 },
  home: {
    heroTitle: 'Karate-Do Shorin-ryu (Kobayashi-ryu) y Kobudo',
    heroLead: 'Clases para adultos e infantiles en Dojo Central y Dojo Norte. Disciplina, tradición y comunidad, cinturón a cinturón.',
    nosotrosDesc: 'Shuri-te Kan enseña Karate-Do Shorin-ryu (rama Kobayashi) y Kobudo, con clases separadas para adultos e infantiles en nuestros dos dojos. El programa avanza por examen de cinturón, con un cuerpo de instructores que acompaña cada etapa.',
    showActivities: true,
    showFilosofia: true,
    filosofiaText: 'Respeto: hacia el dojo, los instructores y compañeros.\nDisciplina: constancia en la práctica, dentro y fuera del tatami.\nPerseverancia: cada cinturón se gana con esfuerzo sostenido, no con atajos.\nHumildad: el aprendizaje no termina nunca, ni siquiera en el cinturón negro.\nEspíritu de superación: buscar ser mejor que uno mismo, no mejor que los demás.',
    showVideo: false,
    videoUrl: '',
  },
  theme: {
    paper: '#E8E0C4', paperRaised: '#F4EEDB', sumi: '#1C1613',
    ink: '#211B17', inkSoft: '#6B5A42',
    link: '#8E241D', btnBg: '#AC2B22', btnText: '#FFFFFF',
  },
  diploma: {
    style: 'clasico',
    paperSize: 'A4',
    introText: 'Se otorga el presente diploma a',
    bodyExamen: 'por haber alcanzado, con esfuerzo y dedicación, el grado de',
    bodyGeneral: 'por su participación en',
    titleExamen: 'Diploma de graduación',
    titleSize: 16, nameSize: 32, gradeSize: 20, dateSize: 13, textSize: 13,
    showTenure: true, showQr: true,
  },
  letterhead: {
    dojoName: 'Shuri-te Kan', subtitle: 'Karate-Do Shorin-ryu (Kobayashi-ryu) y Kobudo',
    address: '', phone: '', whatsapp: '', email: '', website: '', social: '', extraText: '',
    instructorName: '', instructorGrade: '',
    logoSize: 'md', logoPosition: 'left',
    show: { subtitle: true, address: true, phone: true, whatsapp: true, email: true, website: true, social: true, extraText: true, instructorName: true, instructorGrade: true },
  },
};

function getRaw(key) {
  const row = db.get().prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? parseJson(row.value, undefined) : undefined;
}

function setRaw(key, value) {
  db.get().prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, JSON.stringify(value));
}

function get(key) {
  const stored = getRaw(key);
  const def = DEFAULTS[key];
  if (def === undefined) return stored;
  if (stored === undefined) return structuredClone(def);
  const merged = { ...structuredClone(def), ...stored };
  if (def.show) merged.show = { ...def.show, ...(stored.show || {}) };
  return merged;
}

// Contadores correlativos (diplomas, recibos). Se llaman dentro de una transacción.
function nextCounter(name) {
  const current = getRaw('counter.' + name) || 0;
  const next = current + 1;
  setRaw('counter.' + name, next);
  return next;
}
function peekCounter(name) {
  return (getRaw('counter.' + name) || 0) + 1;
}

// Código que lleva el QR de asistencia pegado en el dojo.
function checkinToken() {
  let token = getRaw('checkinToken');
  if (!token) { token = rotateCheckinToken(); }
  return token;
}
function rotateCheckinToken() {
  const token = crypto.randomBytes(12).toString('base64url');
  setRaw('checkinToken', token);
  return token;
}

module.exports = { DEFAULTS, get, set: setRaw, getRaw, nextCounter, peekCounter, checkinToken, rotateCheckinToken };
