'use strict';
const express = require('express');
const files = require('../files');
const perms = require('../permissions');
const security = require('../security');
const settings = require('../settings');
const queries = require('../queries');
const { v } = require('../validate');
const { ApiError } = require('../util');

const r = express.Router();
r.use(perms.requireAdmin);

r.put('/fees', (req, res) => {
  const b = v.object(req.body);
  const next = {};
  for (const [key, label] of [['cuotaAdulto', 'Cuota adulto'], ['cuotaInfantil', 'Cuota infantil'], ['examBoard', 'Mesa de examen'], ['belt', 'Cinturón']]) {
    next[key] = v.money(b[key], label, { allowZero: true });
  }
  settings.set('fees', next);
  security.audit(req, 'settings_fees', 'settings', 'fees', next);
  res.json({ fees: settings.get('fees') });
});

r.put('/home', (req, res) => {
  const b = v.object(req.body);
  const cur = settings.get('home');
  const showVideo = v.bool(b.showVideo);
  const videoUrl = v.str(b.videoUrl, 'Enlace del video', { max: 300 });
  if (showVideo && videoUrl) v.url(videoUrl, 'Enlace del video');
  settings.set('home', {
    heroTitle: v.str(b.heroTitle, 'Título', { max: 200 }) || cur.heroTitle,
    heroLead: v.str(b.heroLead, 'Texto debajo del título', { max: 600 }) || cur.heroLead,
    nosotrosDesc: v.str(b.nosotrosDesc, 'Nosotros', { max: 1500 }) || cur.nosotrosDesc,
    filosofiaText: v.str(b.filosofiaText, 'Filosofía', { max: 2000 }) || cur.filosofiaText,
    showFilosofia: v.bool(b.showFilosofia), showActivities: v.bool(b.showActivities), showVideo, videoUrl,
  });
  res.json({ config: queries.publicConfig() });
});

r.put('/theme', (req, res) => {
  const b = v.object(req.body);
  const next = {};
  for (const key of Object.keys(settings.DEFAULTS.theme)) next[key] = v.color(b[key], key);
  settings.set('theme', next);
  res.json({ theme: settings.get('theme') });
});

r.put('/letterhead', (req, res) => {
  const b = v.object(req.body);
  const cur = settings.get('letterhead');
  const text = ['subtitle', 'address', 'phone', 'whatsapp', 'email', 'website', 'social', 'extraText', 'instructorName', 'instructorGrade'];
  const next = { ...cur, show: { ...cur.show } };
  for (const k of text) next[k] = v.str(b[k], k, { max: 300 });
  next.dojoName = v.str(b.dojoName, 'Nombre del dojo', { max: 120 }) || cur.dojoName;
  next.logoSize = v.oneOf(b.logoSize, 'Tamaño del logo', ['sm', 'md', 'lg']);
  next.logoPosition = v.oneOf(b.logoPosition, 'Posición del logo', ['left', 'center']);
  const show = b.show && typeof b.show === 'object' ? b.show : {};
  for (const k of Object.keys(cur.show)) next.show[k] = v.bool(show[k]);
  settings.set('letterhead', next);
  res.json({ letterhead: settings.get('letterhead'), config: queries.publicConfig() });
});

// Logo, foto de portada y firma: se sube primero con POST /api/files y acá se asigna.
const FILE_SLOTS = { logo: 'logoFileId', hero: 'heroFileId', signature: 'signatureFileId' };
for (const [kind, key] of Object.entries(FILE_SLOTS)) {
  r.put('/' + kind, (req, res) => {
    const b = v.object(req.body);
    const old = settings.getRaw(key);
    if (b.fileId === null) {
      settings.set(key, null);
    } else {
      files.claim(v.id(b.fileId, 'Archivo'), { kind, createdBy: req.auth.user.id });
      settings.set(key, b.fileId);
    }
    if (old && old !== b.fileId) files.remove(old);
    security.audit(req, 'settings_' + kind, 'settings', kind);
    res.json({ url: settings.getRaw(key) ? `/files/${settings.getRaw(key)}` : null });
  });
}

module.exports = r;
