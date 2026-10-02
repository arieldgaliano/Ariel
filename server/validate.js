'use strict';
const { ApiError } = require('./util');

const fail = (field, why) => { throw new ApiError(400, `${field}: ${why}`); };
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);

// Cada validador devuelve el valor ya limpio o lanza un error 400 con un mensaje en español.
const v = {
  object(body) {
    if (!isObj(body)) throw new ApiError(400, 'El pedido no es válido.');
    return body;
  },
  str(value, field, { max = 300, required = false, allowEmpty = true } = {}) {
    if (value == null || value === '') {
      if (required) fail(field, 'es obligatorio.');
      return '';
    }
    if (typeof value !== 'string') fail(field, 'tiene que ser texto.');
    const s = value.trim();
    if (required && !s) fail(field, 'es obligatorio.');
    if (!allowEmpty && !s) fail(field, 'no puede quedar vacío.');
    if (s.length > max) fail(field, `es demasiado largo (máximo ${max} caracteres).`);
    return s;
  },
  oneOf(value, field, list, { required = true } = {}) {
    if ((value == null || value === '') && !required) return null;
    if (!list.includes(value)) fail(field, 'no es un valor válido.');
    return value;
  },
  date(value, field, { required = false } = {}) {
    if (value == null || value === '') {
      if (required) fail(field, 'es obligatoria.');
      return null;
    }
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(field, 'no es una fecha válida.');
    const d = new Date(value + 'T00:00:00Z');
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) fail(field, 'no es una fecha válida.');
    return value;
  },
  month(value, field, { required = false } = {}) {
    if (value == null || value === '') {
      if (required) fail(field, 'es obligatorio.');
      return null;
    }
    if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) fail(field, 'no es un mes válido.');
    return value;
  },
  // Importes en pesos, con hasta 2 decimales, mayores a cero.
  money(value, field, { allowZero = false } = {}) {
    const n = typeof value === 'string' ? Number(value.replace(',', '.')) : value;
    if (typeof n !== 'number' || !Number.isFinite(n)) fail(field, 'tiene que ser un número.');
    if (allowZero ? n < 0 : n <= 0) fail(field, allowZero ? 'no puede ser negativo.' : 'tiene que ser mayor a cero.');
    if (n > 100000000) fail(field, 'es demasiado grande.');
    return Math.round(n * 100) / 100;
  },
  int(value, field, { min = 0, max = 100000 } = {}) {
    const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
    if (!Number.isInteger(n) || n < min || n > max) fail(field, `tiene que ser un número entero entre ${min} y ${max}.`);
    return n;
  },
  bool(value) { return value === true || value === 1 || value === 'true'; },
  id(value, field) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(value)) fail(field, 'no es válido.');
    return value;
  },
  url(value, field, { required = true } = {}) {
    if (!value) { if (required) fail(field, 'es obligatoria.'); return ''; }
    let u;
    try { u = new URL(String(value).trim()); } catch { fail(field, 'no es una dirección válida.'); }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') fail(field, 'tiene que empezar con http:// o https://');
    if (String(value).length > 600) fail(field, 'es demasiado larga.');
    return u.toString();
  },
  color(value, field) {
    if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value)) fail(field, 'no es un color válido.');
    return value;
  },
  stringList(value, field, { maxItems = 100, maxLen = 300 } = {}) {
    if (!Array.isArray(value)) fail(field, 'tiene que ser una lista.');
    if (value.length > maxItems) fail(field, 'tiene demasiados elementos.');
    return value.map(x => v.str(x, field, { max: maxLen })).filter(Boolean);
  },
};

// Para texto que viene de formularios públicos: saca caracteres que sirven para inyectar HTML.
const cleanText = s => String(s == null ? '' : s).replace(/[<>"`]/g, '').replace(/\s+/g, ' ').trim();

module.exports = { v, cleanText, isObj };
