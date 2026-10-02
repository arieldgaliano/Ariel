'use strict';
// Genera un respaldo completo en data/backups. Uso: npm run backup
const db = require('../server/db');
const { writeBackupFile } = require('../server/backup');
db.init();
console.log('Respaldo creado:', writeBackupFile('manual'));
db.close();
