'use strict';
const express = require('express');
const db = require('../db');
const perms = require('../permissions');
const queries = require('../queries');
const security = require('../security');
const S = require('../serialize');
const { v } = require('../validate');
const { ApiError, uuid, nowIso, todayIso } = require('../util');

const r = express.Router();
const inForum = perms.requireModule('foro');

// Foro: cualquiera con el módulo publica; el nombre y el rol los pone el servidor, no el navegador.
r.post('/posts', inForum, (req, res) => {
  const text = v.str(v.object(req.body).text, 'Mensaje', { max: 2000, required: true });
  const a = req.auth;
  const name = a.isAdmin ? 'Sensei' : a.studentRow.name;
  const role = a.isAdmin ? 'Administrador' : a.isInstructor ? 'Instructor' : 'Alumno';
  const id = uuid();
  db.get().prepare('INSERT INTO forum_posts (id, author_id, author_name, author_role, text, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, a.user.id, name, role, text, todayIso(), nowIso());
  res.status(201).json({ post: S.forumPost(db.get().prepare('SELECT * FROM forum_posts WHERE id = ?').get(id)) });
});

// Solo el Sensei y los instructores pueden borrar mensajes.
r.delete('/posts/:id', inForum, (req, res) => {
  if (!req.auth.isAdmin && !req.auth.isInstructor) throw new ApiError(403, 'No tenés permiso para eliminar mensajes.');
  db.get().prepare('DELETE FROM forum_posts WHERE id = ?').run(v.id(req.params.id, 'Mensaje'));
  security.audit(req, 'forum_post_deleted', 'forum_post', req.params.id);
  res.json({ ok: true });
});

r.post('/announcements', perms.requireAdmin, (req, res) => {
  const b = v.object(req.body);
  const id = uuid();
  db.get().prepare('INSERT INTO announcements (id, title, body, date, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, v.str(b.title, 'Título', { max: 200, required: true }), v.str(b.body, 'Texto', { max: 5000, required: true }), todayIso(), nowIso());
  res.status(201).json({ item: S.announcement(db.get().prepare('SELECT * FROM announcements WHERE id = ?').get(id)) });
});
r.delete('/announcements/:id', perms.requireAdmin, (req, res) => {
  db.get().prepare('DELETE FROM announcements WHERE id = ?').run(v.id(req.params.id, 'Anuncio'));
  res.json({ ok: true });
});

module.exports = r;
