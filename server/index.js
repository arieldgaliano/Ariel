'use strict';
const config = require('./config');
const db = require('./db');
const security = require('./security');
const files = require('./files');
const backup = require('./backup');
const mailer = require('./mailer');
const { seedReferenceData, ensureAdmin } = require('./bootstrap-data');
const { createApp } = require('./app');

async function main() {
  db.init();
  seedReferenceData();

  const admin = await ensureAdmin();
  if (admin) {
    console.log('\n==============================================================');
    console.log(' Se creó la cuenta del Sensei');
    console.log(`   Usuario:    ${admin.username}`);
    if (admin.generated) console.log(`   Contraseña: ${admin.password}   (anotala: no se vuelve a mostrar)`);
    else console.log('   Contraseña: la que definiste en SENSEI_PASSWORD');
    console.log(' Al ingresar por primera vez el sistema te pide cambiarla.');
    console.log('==============================================================\n');
  }

  // Tareas de mantenimiento: limpieza de sesiones/archivos huérfanos y respaldo diario automático.
  const maintain = () => {
    try { security.purgeExpired(); files.purgeOrphans(); } catch (e) { console.error('[mantenimiento]', e.message); }
  };
  const dailyBackup = () => {
    try { backup.writeBackupFile('auto'); } catch (e) { console.error('[respaldo automático]', e.message); }
  };
  const emailBackup = () => mailer.runIfDue().catch(e => console.error('[respaldo por correo]', e.message));
  maintain();
  dailyBackup();
  emailBackup();
  setInterval(emailBackup, 3600 * 1000).unref();
  setInterval(maintain, 3600 * 1000).unref();
  setInterval(dailyBackup, 24 * 3600 * 1000).unref();

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`Shuri-te Kan escuchando en http://localhost:${config.port}  (datos en ${config.dataDir})`);
  });
  const shutdown = () => { server.close(() => { db.close(); process.exit(0); }); setTimeout(() => process.exit(0), 5000).unref(); };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch(err => { console.error(err); process.exit(1); });
