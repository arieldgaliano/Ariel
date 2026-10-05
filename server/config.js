'use strict';
const path = require('node:path');

const env = process.env;
const root = path.resolve(__dirname, '..');
const isProd = env.NODE_ENV === 'production';

module.exports = {
  root,
  isProd,
  port: parseInt(env.PORT, 10) || 3000,
  dataDir: path.resolve(env.DATA_DIR || path.join(root, 'data')),
  publicDir: path.join(root, 'public'),
  // Cuántos "saltos" de proxy confiar (Railway, Render, etc. = 1). 0 = ninguno.
  trustProxy: env.TRUST_PROXY === undefined ? (isProd ? 1 : 0) : (parseInt(env.TRUST_PROXY, 10) || 0),
  // La cookie de sesión solo viaja por HTTPS en producción.
  cookieSecure: env.COOKIE_SECURE ? env.COOKIE_SECURE === 'true' : isProd,
  timezone: env.TZ_DOJO || 'America/Argentina/Buenos_Aires',
  sessionDays: parseInt(env.SESSION_DAYS, 10) || 14,
  sessionAbsoluteDays: 60,
  // Contraseña inicial de alumnos nuevos o con clave restablecida (se puede cambiar con DEFAULT_STUDENT_PASSWORD).
  defaultStudentPassword: env.DEFAULT_STUDENT_PASSWORD || 'karatedo123',
  senseiUser: env.SENSEI_USER || 'sensei',
  senseiPassword: env.SENSEI_PASSWORD || '',
  maxUploadBytes: 6 * 1024 * 1024,
  backupKeep: parseInt(env.BACKUP_KEEP, 10) || 14,
};
