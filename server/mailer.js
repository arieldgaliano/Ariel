'use strict';
// Envío del respaldo por correo. El Sensei carga su cuenta en Configuración; la contraseña se guarda encriptada.
const nodemailer = require('nodemailer');
const db = require('./db');
const backup = require('./backup');
const security = require('./security');
const settings = require('./settings');
const { createZip } = require('./zip');
const { todayIso } = require('./util');
const fs = require('node:fs');
const path = require('node:path');
const config = require('./config');

const MAX_ATTACHMENT = 24 * 1024 * 1024; // límite práctico de Gmail (25 MB)
const DEFAULTS = { enabled: false, host: 'smtp.gmail.com', port: 465, user: '', to: '', everyDays: 7, passEnc: '', lastOk: null, lastError: null, lastAt: null, lastNote: null };

// Permite reemplazar el transporte en los tests (sin conectarse a ningún servidor real).
let transportFactory = cfg => nodemailer.createTransport({
  host: cfg.host, port: cfg.port, secure: cfg.port === 465,
  auth: { user: cfg.user, pass: security.decryptSecret(cfg.passEnc) },
  connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 60000,
});
const setTransportFactory = f => { transportFactory = f; };

const getConfig = () => ({ ...DEFAULTS, ...(settings.getRaw('backupEmail') || {}) });
const saveConfig = c => settings.set('backupEmail', c);

// Lo que ve la pantalla: nunca la contraseña.
function publicStatus() {
  const c = getConfig();
  return { enabled: c.enabled, host: c.host, port: c.port, user: c.user, to: c.to, everyDays: c.everyDays, hasPassword: !!c.passEnc,
    lastOk: c.lastOk, lastError: c.lastError, lastAt: c.lastAt, lastNote: c.lastNote };
}

function friendlyError(err) {
  const m = String((err && err.message) || err);
  if (/unable to authenticate|secreto inv/i.test(m)) return 'La contraseña guardada ya no se puede usar (por ejemplo, tras restaurar un respaldo en otro servidor). Volvé a escribirla y guardá.';
  if (err && (err.code === 'EAUTH' || /535|Invalid login|Username and Password/i.test(m)))
    return 'El correo rechazó el usuario o la contraseña. Con Gmail hay que usar una "contraseña de aplicación" (no la contraseña normal).';
  if (err && (err.code === 'ESOCKET' || err.code === 'ECONNECTION' || err.code === 'ETIMEDOUT' || /ENOTFOUND|ECONNREFUSED/i.test(m)))
    return 'No se pudo conectar con el servidor de correo. Revisá el servidor y el puerto.';
  return 'No se pudo enviar el correo: ' + m.slice(0, 200);
}

function buildAttachment() {
  const full = backup.createBackupZip();
  if (full.length <= MAX_ATTACHMENT) return { name: `shuritekan_respaldo_${todayIso()}.zip`, data: full, note: null };
  // Muy pesado para un mail: se manda solo la base de datos (sin fotos ni comprobantes).
  const dbOnly = createZip([{ name: 'dojo.db', data: require('./backup').snapshotDb() }]);
  return { name: `shuritekan_base_de_datos_${todayIso()}.zip`, data: dbOnly,
    note: 'El respaldo completo supera los 24 MB, así que se envió solo la base de datos (sin fotos ni comprobantes). Descargá el respaldo completo desde Configuración.' };
}

// Envía el respaldo ahora. Devuelve {ok, note} o lanza un error con mensaje entendible.
async function sendBackupNow() {
  const cfg = getConfig();
  if (!cfg.user || !cfg.passEnc || !cfg.to) throw Object.assign(new Error('Completá el correo, la contraseña y el destino antes de enviar.'), { friendly: true });
  const att = buildAttachment();
  try {
    const transport = transportFactory(cfg);
    await transport.sendMail({
      from: `"Shuri-te Kan" <${cfg.user}>`, to: cfg.to,
      subject: `Respaldo Shuri-te Kan — ${todayIso()}`,
      text: `Adjuntamos el respaldo automático del sistema (${todayIso()}).\n\nContiene datos personales de los alumnos: guardalo en un lugar seguro y no lo reenvíes.\n` +
        (att.note ? `\nAVISO: ${att.note}\n` : '') + '\nPara restaurarlo: Configuración → Restaurar desde un respaldo (.zip).',
      attachments: [{ filename: att.name, content: att.data }],
    });
  } catch (err) {
    const msg = friendlyError(err);
    saveConfig({ ...getConfig(), lastError: msg, lastAt: new Date().toISOString() });
    throw Object.assign(new Error(msg), { friendly: true });
  }
  saveConfig({ ...getConfig(), lastOk: new Date().toISOString(), lastAt: new Date().toISOString(), lastError: null, lastNote: att.note });
  return { ok: true, note: att.note, sizeMb: Math.round(att.data.length / 1024 / 1024 * 10) / 10 };
}

// Se llama cada hora: envía si está activado y ya pasó el plazo desde el último envío exitoso.
async function runIfDue(now = Date.now()) {
  const cfg = getConfig();
  if (!cfg.enabled || !cfg.passEnc) return false;
  const last = cfg.lastOk ? Date.parse(cfg.lastOk) : 0;
  if (now - last < (cfg.everyDays * 24 - 1) * 3600 * 1000) return false;
  // Si falló hace poco, se reintenta recién a las 6 horas (para no insistir de más).
  if (cfg.lastError && cfg.lastAt && now - Date.parse(cfg.lastAt) < 6 * 3600 * 1000) return false;
  try { await sendBackupNow(); return true; } catch { return false; }
}

module.exports = { getConfig, saveConfig, publicStatus, sendBackupNow, runIfDue, setTransportFactory, DEFAULTS };
