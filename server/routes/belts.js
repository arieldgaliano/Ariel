'use strict';
const express = require('express');
const db = require('../db');
const perms = require('../permissions');
const queries = require('../queries');
const security = require('../security');
const { v } = require('../validate');
const { ApiError } = require('../util');

const r = express.Router();
const COLORS = ['blanco', 'celeste', 'amarillo', 'naranja', 'verde', 'azul', 'marron', 'negro', 'rojo'].map(c => `var(--belt-${c})`);

const slug = name => name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const snapshot = () => ({ belts: queries.allBelts(), programs: queries.allPrograms() });

r.post('/', perms.requireModule('cinturones', 'write'), (req, res) => {
  const b = v.object(req.body);
  const name = v.str(b.name, 'Nombre', { max: 80, required: true });
  const group = v.oneOf(b.group, 'Grupo', ['adulto', 'infantil']);
  const color = v.oneOf(b.color, 'Color', COLORS);
  const afterIdx = v.int(b.after, 'Posición', { min: 0, max: 100 });
  const minMonths = v.int(b.minMonths, 'Tiempo mínimo', { min: 0, max: 600 });
  const classes = v.int(b.classesRequired, 'Clases mínimas', { min: 0, max: 5000 });
  const id = `${group}-${slug(name)}`;
  if (!slug(name)) throw new ApiError(400, 'Nombre: usá letras o números.');
  if (db.get().prepare('SELECT 1 FROM belts WHERE id = ?').get(id)) {
    throw new ApiError(409, 'Ya hay un cinturón con un nombre muy parecido en este grupo. Probá con otro nombre.');
  }
  db.tx(conn => {
    conn.prepare('UPDATE belts SET position = position + 1 WHERE grp = ? AND position > ?').run(group, afterIdx);
    conn.prepare('INSERT INTO belts (id, name, grp, position, color, min_months, classes_required, is_kyu) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, name, group, afterIdx + 1, color, minMonths, classes, v.bool(b.kyu) ? 1 : 0);
    conn.prepare("INSERT INTO programs (belt_id, items) VALUES (?, '[]')").run(id);
  });
  security.audit(req, 'belt_created', 'belt', id);
  res.status(201).json(snapshot());
});

r.put('/:id', perms.requireModule('cinturones', 'write'), (req, res) => {
  const id = v.id(req.params.id, 'Cinturón');
  const b = v.object(req.body);
  const ok = db.get().prepare('UPDATE belts SET name = ?, min_months = ?, classes_required = ? WHERE id = ?')
    .run(v.str(b.name, 'Nombre', { max: 80, required: true }), v.int(b.minMonths, 'Tiempo mínimo', { min: 0, max: 600 }),
      v.int(b.classesRequired, 'Clases mínimas', { min: 0, max: 5000 }), id).changes;
  if (!ok) throw new ApiError(404, 'Cinturón no encontrado.');
  security.audit(req, 'belt_updated', 'belt', id);
  res.json(snapshot());
});

r.delete('/:id', perms.requireModule('cinturones', 'write'), (req, res) => {
  const id = v.id(req.params.id, 'Cinturón');
  const belt = db.get().prepare('SELECT * FROM belts WHERE id = ?').get(id);
  if (!belt) throw new ApiError(404, 'Cinturón no encontrado.');
  const inUse = db.get().prepare('SELECT name FROM students WHERE belt_id = ? ORDER BY name').all(id);
  if (inUse.length) {
    throw new ApiError(409, `Hay ${inUse.length} alumno${inUse.length === 1 ? '' : 's'} con este cinturón asignado. Cambiá su cinturón desde su ficha antes de eliminarlo.`,
      { inUseCount: inUse.length, inUseNames: req.auth.isAdmin ? inUse.map(s => s.name) : undefined });
  }
  db.tx(conn => {
    conn.prepare('DELETE FROM belts WHERE id = ?').run(id);
    // Se cierra el hueco en el orden.
    conn.prepare('UPDATE belts SET position = position - 1 WHERE grp = ? AND position > ?').run(belt.grp, belt.position);
  });
  security.audit(req, 'belt_deleted', 'belt', id);
  res.json(snapshot());
});

module.exports = r;
