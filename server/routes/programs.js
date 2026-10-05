'use strict';
const express = require('express');
const db = require('../db');
const perms = require('../permissions');
const security = require('../security');
const { v } = require('../validate');
const { ApiError } = require('../util');

const r = express.Router();

r.put('/:beltId', perms.requireModule('programas', 'write'), (req, res) => {
  const beltId = v.id(req.params.beltId, 'Cinturón');
  if (!db.get().prepare('SELECT 1 FROM belts WHERE id = ?').get(beltId)) throw new ApiError(404, 'Cinturón no encontrado.');
  const items = v.stringList(v.object(req.body).items, 'Programa', { maxItems: 100, maxLen: 300 });
  db.get().prepare('INSERT INTO programs (belt_id, items) VALUES (?, ?) ON CONFLICT(belt_id) DO UPDATE SET items = excluded.items')
    .run(beltId, JSON.stringify(items));
  security.audit(req, 'program_updated', 'belt', beltId);
  res.json({ beltId, items });
});

module.exports = r;
