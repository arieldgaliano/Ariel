'use strict';
// Crea (o resetea) la cuenta del Sensei desde la terminal.
// Uso:  npm run create-admin -- usuario "nueva contraseña"
const db = require('../server/db');
const security = require('../server/security');
const { seedReferenceData } = require('../server/bootstrap-data');
const { uuid, nowIso } = require('../server/util');

(async () => {
  const [username, password] = process.argv.slice(2);
  if (!username || !password) { console.error('Uso: npm run create-admin -- <usuario> "<contraseña de al menos 8 caracteres>"'); process.exit(1); }
  security.assertStrongEnough(password);
  db.init();
  seedReferenceData();
  const hash = await security.hashPassword(password);
  const existing = db.get().prepare("SELECT id FROM users WHERE role = 'admin'").get();
  if (existing) {
    db.get().prepare('UPDATE users SET username = ?, password_hash = ?, must_change_password = 1 WHERE id = ?').run(username, hash, existing.id);
    security.destroyUserSessions(existing.id);
    console.log(`Se actualizó la cuenta del Sensei: usuario "${username}". Al ingresar te pedirá cambiar la contraseña.`);
  } else {
    db.get().prepare("INSERT INTO users (id, username, password_hash, role, student_id, must_change_password, created_at) VALUES (?, ?, ?, 'admin', NULL, 1, ?)")
      .run(uuid(), username, hash, nowIso());
    console.log(`Se creó la cuenta del Sensei: usuario "${username}".`);
  }
  db.close();
})().catch(e => { console.error(e.message); process.exit(1); });
