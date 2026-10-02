'use strict';
// Restaura un respaldo .zip. Uso: npm run restore -- ruta/al/respaldo.zip
// IMPORTANTE: detené el servidor antes. Lo que había queda guardado en data/backups/antes-de-restaurar-*
const fs = require('node:fs');
const db = require('../server/db');
const { restoreFromZip } = require('../server/backup');
const file = process.argv[2];
if (!file || !fs.existsSync(file)) { console.error('Uso: npm run restore -- <archivo.zip>'); process.exit(1); }
db.init();
try {
  const r = restoreFromZip(fs.readFileSync(file));
  console.log('Restauración completa. Lo anterior quedó en:', r.safetyFolder);
} catch (e) { console.error('No se pudo restaurar:', e.message); process.exitCode = 1; }
db.close();
