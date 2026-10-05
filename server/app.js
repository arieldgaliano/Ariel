'use strict';
const path = require('node:path');
const express = require('express');
const compression = require('compression');
const config = require('./config');
const db = require('./db');
const security = require('./security');
const perms = require('./permissions');
const { ApiError } = require('./util');

const COOKIE = config.cookieSecure ? '__Host-sid' : 'sid';

function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

function setSessionCookie(res, token) {
  res.cookie(COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: config.cookieSecure, path: '/',
    maxAge: config.sessionDays * 24 * 3600 * 1000,
  });
}
const clearSessionCookie = res => res.clearCookie(COOKIE, { httpOnly: true, sameSite: 'lax', secure: config.cookieSecure, path: '/' });

// Carga quién es la persona que hace el pedido (si hay sesión válida).
function authenticate(req, _res, next) {
  req.auth = null;
  const token = readCookie(req, COOKIE);
  req.sessionToken = token;
  const found = security.lookupSession(token);
  if (!found) return next();
  const { user } = found;
  let studentRow = null;
  if (user.role === 'student') {
    studentRow = db.get().prepare('SELECT * FROM students WHERE id = ?').get(user.student_id);
    if (!studentRow || studentRow.status !== 'activo') {
      security.destroyUserSessions(user.id);
      return next();
    }
  }
  req.auth = perms.buildAccess(user, studentRow);
  next();
}

// Defensa contra pedidos disparados desde otros sitios (CSRF).
function csrfGuard(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('x-requested-with') !== 'dojo') return next(new ApiError(403, 'Pedido no permitido.'));
  const origin = req.get('origin');
  if (origin) {
    let host;
    try { host = new URL(origin).host; } catch { host = ''; }
    if (host !== req.get('host')) return next(new ApiError(403, 'Pedido no permitido.'));
  }
  next();
}

function securityHeaders(req, res, next) {
  res.set({
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
      "connect-src 'self'",
      "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
    ].join('; '),
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  if (config.cookieSecure) res.set('Strict-Transport-Security', 'max-age=15552000');
  next();
}

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.use(securityHeaders);
  app.use(compression()); // páginas y datos viajan comprimidos (mucho más rápido en celular)

  const api = express.Router();
  api.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  api.use(express.json({ limit: '200kb' }));
  api.use(csrfGuard);
  api.use(authenticate);
  // Mientras la persona no cambie su contraseña inicial, solo puede usar el ingreso/cambio de clave.
  api.use((req, _res, next) => {
    if (req.auth && req.auth.user.must_change_password && !req.path.startsWith('/auth/')) {
      return next(new ApiError(403, 'Tenés que cambiar tu contraseña antes de seguir.', { code: 'must_change_password' }));
    }
    next();
  });

  api.use('/auth', require('./routes/auth')({ setSessionCookie, clearSessionCookie }));
  api.use('/public', require('./routes/public'));
  api.use('/bootstrap', require('./routes/bootstrap'));
  api.use('/students', require('./routes/students'));
  api.use('/activities', require('./routes/activities'));
  api.use('/payments', require('./routes/payments'));
  api.use('/expenses', require('./routes/expenses'));
  api.use('/attendance', require('./routes/attendance'));
  api.use('/belts', require('./routes/belts'));
  api.use('/programs', require('./routes/programs'));
  api.use('/schedule', require('./routes/schedule'));
  api.use('/events', require('./routes/events'));
  api.use('/library', require('./routes/library'));
  api.use('/forum', require('./routes/forum'));
  api.use('/inscriptions', require('./routes/inscriptions'));
  api.use('/diplomas', require('./routes/diplomas'));
  api.use('/settings', require('./routes/settings'));
  api.use('/files', require('./routes/files'));
  api.use('/backup', require('./routes/backup'));
  api.use('/reports', require('./routes/reports'));
  api.use((req, _res, next) => next(new ApiError(404, 'No existe esa dirección.')));
  api.use(errorHandler);
  app.use('/api', api);

  // Archivos subidos (fotos, logo, comprobantes) con control de acceso.
  app.use('/files', authenticate, require('./routes/file-serve'), errorHandler);

  // El servicio de la app instalable no se guarda en caché, para que las actualizaciones lleguen enseguida.
  app.get('/sw.js', (_req, res) => { res.set({ 'Cache-Control': 'no-cache', 'Content-Type': 'text/javascript; charset=utf-8' }); res.sendFile(path.join(config.publicDir, 'sw.js')); });
  app.use(express.static(config.publicDir, { maxAge: config.isProd ? '1h' : 0, index: 'index.html' }));
  app.use(errorHandler);
  return app;
}

function errorHandler(err, req, res, _next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message, ...(err.extra || {}) });
  }
  if (err && err.type === 'entity.too.large') return res.status(413).json({ error: 'El pedido es demasiado grande.' });
  if (err && (err.type === 'entity.parse.failed' || err instanceof SyntaxError)) return res.status(400).json({ error: 'El pedido no es válido.' });
  if (err && err.code === 'ERR_SQLITE_ERROR') console.error('[sqlite]', err.message);
  else console.error('[error]', req.method, req.originalUrl, err);
  res.status(500).json({ error: 'Ocurrió un error inesperado. Probá de nuevo.' });
}

module.exports = { createApp, COOKIE, readCookie };
