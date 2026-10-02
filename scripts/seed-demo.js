'use strict';
// Carga los datos de ejemplo del prototipo en una base NUEVA (para probar). Uso: npm run seed:demo
const config = require('../server/config');
const db = require('../server/db');
const { seedDemo } = require('../server/seed-demo');

if (config.isProd && process.env.ALLOW_DEMO_IN_PRODUCTION !== 'yes') {
  console.error('Por seguridad no se cargan datos de ejemplo en producción.');
  process.exit(1);
}
db.init();
seedDemo().then(r => {
  console.log(`Listo. Usuarios de prueba (contraseña "${r.password}" para todos):`);
  console.log('  sensei (Sensei)');
  r.students.forEach(s => console.log(`  ${s.username}  — ${s.name}${s.instructor ? ' (instructor)' : ''}${s.status === 'suspendido' ? ' (suspendido)' : ''}`));
  db.close();
}).catch(e => { console.error(e.message); process.exit(1); });
