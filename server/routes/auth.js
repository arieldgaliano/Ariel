'use strict';
const express = require('express');
const db = require('../db');
const security = require('../security');
const perms = require('../permissions');
const { v } = require('../validate');
const { ApiError, todayIso } = require('../util');

// Datos de la sesión que necesita la pantalla para armar el menú. El servidor igual
// revisa cada acción por su cuenta; esto es solo para mostrar u ocultar botones.
function sessionPayload(access) {
  const modules = {};
  for (const m of perms.GRANTABLE) modules[m] = access.level(m);
  return {
    authenticated: true,
    role: perms.roleName(access),
    username: access.user.username,
    studentId: access.studentId,
    mustChangePassword: !!access.user.must_change_password,
    modules,
    serverToday: todayIso(),
  };
}

module.exports = ({ setSessionCookie, clearSessionCookie }) => {
  const r = express.Router();

  r.post('/login', async (req, res) => {
    const body = v.object(req.body);
    const username = v.str(body.username, 'Usuario', { max: 100, required: true });
    const password = typeof body.password === 'string' ? body.password : '';
    if (!password || password.length > 200) throw new ApiError(400, 'Completá usuario y contraseña.');

    security.assertNotLocked(username, req.ip);
    const user = db.get().prepare('SELECT * FROM users WHERE username = ?').get(username);
    let ok = false;
    if (user) ok = await security.verifyPassword(password, user.password_hash);
    else await security.burnTime(password);
    if (!ok) {
      security.recordFailure(username, req.ip);
      security.audit({ auth: { user: user || null } }, 'login_failed', 'user', user ? user.id : null, { username, ip: req.ip });
      throw new ApiError(401, 'Usuario o contraseña incorrectos.');
    }
    if (user.role === 'student') {
      const st = db.get().prepare('SELECT status FROM students WHERE id = ?').get(user.student_id);
      if (!st || st.status !== 'activo') throw new ApiError(403, 'Este usuario está suspendido. Consultá con el Sensei.');
    }
    security.clearFailures(username);
    const token = security.createSession(user.id, req);
    setSessionCookie(res, token);
    const studentRow = user.role === 'student' ? db.get().prepare('SELECT * FROM students WHERE id = ?').get(user.student_id) : null;
    const access = perms.buildAccess(user, studentRow);
    security.audit({ auth: access }, 'login', 'user', user.id);
    res.json(sessionPayload(access));
  });

  r.post('/logout', (req, res) => {
    security.destroySession(req.sessionToken);
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  r.get('/session', (req, res) => {
    if (!req.auth) return res.json({ authenticated: false });
    res.json(sessionPayload(req.auth));
  });

  r.post('/change-password', perms.requireAuth, async (req, res) => {
    const body = v.object(req.body);
    const current = typeof body.current === 'string' ? body.current : '';
    const next = typeof body.next === 'string' ? body.next : '';
    if (!current || !next) throw new ApiError(400, 'Completá todos los campos.');
    if (!(await security.verifyPassword(current, req.auth.user.password_hash))) {
      security.recordFailure(req.auth.user.username, req.ip);
      throw new ApiError(400, 'La contraseña actual no es correcta.');
    }
    security.assertStrongEnough(next);
    if (next === current) throw new ApiError(400, 'La nueva contraseña tiene que ser distinta de la actual.');
    const hash = await security.hashPassword(next);
    db.get().prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(hash, req.auth.user.id);
    security.destroyUserSessions(req.auth.user.id, req.sessionToken);
    security.audit(req, 'password_changed', 'user', req.auth.user.id);
    req.auth.user.must_change_password = 0;
    res.json(sessionPayload(req.auth));
  });

  // Primer ingreso: el alumno puede conservar la contraseña inicial en vez de cambiarla.
  // (La cuenta del Sensei siempre tiene que elegir una propia.)
  r.post('/keep-password', perms.requireAuth, (req, res) => {
    if (req.auth.isAdmin) throw new ApiError(403, 'El Sensei tiene que elegir una contraseña propia.');
    db.get().prepare('UPDATE users SET must_change_password = 0 WHERE id = ?').run(req.auth.user.id);
    security.audit(req, 'password_kept', 'user', req.auth.user.id);
    req.auth.user.must_change_password = 0;
    res.json(sessionPayload(req.auth));
  });

  // El Sensei cambia su propio usuario (no puede coincidir con el de un alumno).
  r.put('/username', perms.requireAdmin, (req, res) => {
    const body = v.object(req.body);
    const username = v.str(body.username, 'Usuario', { max: 60, required: true });
    if (!/^[A-Za-z0-9._-]{3,60}$/.test(username)) throw new ApiError(400, 'Usuario: usá letras, números, punto, guión o guión bajo (mínimo 3).');
    const clash = db.get().prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.auth.user.id);
    if (clash) throw new ApiError(409, 'Ese usuario ya está en uso.');
    db.get().prepare('UPDATE users SET username = ? WHERE id = ?').run(username, req.auth.user.id);
    security.audit(req, 'admin_username_changed', 'user', req.auth.user.id, { username });
    res.json({ username });
  });

  return r;
};
module.exports.sessionPayload = sessionPayload;
