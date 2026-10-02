'use strict';
const crypto = require('node:crypto');
const config = require('./config');

class ApiError extends Error {
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

const uuid = () => crypto.randomUUID();
const nowIso = () => new Date().toISOString();

// Fecha de hoy (AAAA-MM-DD) en la zona horaria del dojo, no la del servidor.
function todayIso(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: config.timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = t => parts.find(p => p.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
const currentMonth = () => todayIso().slice(0, 7);

const toCents = pesos => Math.round(Number(pesos) * 100);
const fromCents = cents => (cents == null ? null : cents / 100);

const parseJson = (text, fallback) => {
  try { return JSON.parse(text); } catch { return fallback; }
};

module.exports = { ApiError, uuid, nowIso, todayIso, currentMonth, toCents, fromCents, parseJson };
