'use strict';
const express = require('express');
const db = require('../db');
const perms = require('../permissions');
const S = require('../serialize');
const { v } = require('../validate');
const { ApiError, uuid } = require('../util');

const r = express.Router();
const write = perms.requireModule('biblioteca', 'write');

r.post('/glossary', write, (req, res) => {
  const b = v.object(req.body);
  const id = uuid();
  db.get().prepare('INSERT INTO library_glossary (id, term, def) VALUES (?, ?, ?)')
    .run(id, v.str(b.term, 'Término', { max: 120, required: true }), v.str(b.def, 'Definición', { max: 2000, required: true }));
  res.status(201).json({ item: S.glossary(db.get().prepare('SELECT * FROM library_glossary WHERE id = ?').get(id)) });
});
r.delete('/glossary/:id', write, (req, res) => {
  db.get().prepare('DELETE FROM library_glossary WHERE id = ?').run(v.id(req.params.id, 'Término'));
  res.json({ ok: true });
});

function linkFields(b) {
  b = v.object(b);
  return [v.str(b.title, 'Texto a mostrar', { max: 200, required: true }), v.url(b.url, 'URL'),
    v.oneOf(b.type, 'Tipo', ['link', 'video']), v.str(b.desc, 'Descripción', { max: 500 })];
}
r.post('/links', write, (req, res) => {
  const [title, url, type, desc] = linkFields(req.body);
  const id = uuid();
  db.get().prepare('INSERT INTO library_links (id, title, url, type, descr) VALUES (?, ?, ?, ?, ?)').run(id, title, url, type, desc);
  res.status(201).json({ item: S.link(db.get().prepare('SELECT * FROM library_links WHERE id = ?').get(id)) });
});
r.put('/links/:id', write, (req, res) => {
  const id = v.id(req.params.id, 'Enlace');
  const [title, url, type, desc] = linkFields(req.body);
  if (!db.get().prepare('UPDATE library_links SET title = ?, url = ?, type = ?, descr = ? WHERE id = ?').run(title, url, type, desc, id).changes) {
    throw new ApiError(404, 'Enlace no encontrado.');
  }
  res.json({ item: S.link(db.get().prepare('SELECT * FROM library_links WHERE id = ?').get(id)) });
});
r.delete('/links/:id', write, (req, res) => {
  db.get().prepare('DELETE FROM library_links WHERE id = ?').run(v.id(req.params.id, 'Enlace'));
  res.json({ ok: true });
});

module.exports = r;
