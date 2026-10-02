'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { start, Client, db } = require('./helpers');

let app;
before(async () => { app = await start(); });
after(async () => { await app.stop(); });

test('sin sesión no se puede leer nada privado', async () => {
  const c = new Client(app.base);
  for (const url of ['/api/bootstrap', '/api/students', '/api/payments', '/api/attendance/today', '/api/backup/download']) {
    const r = await c.get(url);
    assert.equal(r.status, 401, url);
  }
});

test('login correcto crea cookie HttpOnly y no filtra la contraseña', async () => {
  const c = new Client(app.base);
  const r = await c.post('/api/auth/login', { username: 'sensei', password: 'demo1234' });
  assert.equal(r.status, 200);
  assert.equal(r.data.role, 'admin');
  const cookie = r.setCookie.find(x => x.startsWith('sid='));
  assert.ok(cookie, 'debe setear cookie de sesión');
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);
  assert.ok(!JSON.stringify(r.data).includes('scrypt'));
  const boot = await c.get('/api/bootstrap');
  assert.equal(boot.status, 200);
  assert.ok(!JSON.stringify(boot.data).includes('scrypt'), 'el bootstrap no debe incluir hashes');
  assert.ok(!JSON.stringify(boot.data).includes('password'), 'el bootstrap no debe incluir campos de contraseña');
});

test('el token de sesión se guarda hasheado en la base', async () => {
  const c = new Client(app.base);
  await c.login('martina.suarez');
  const token = c.cookie.split('=')[1];
  const rows = db.get().prepare('SELECT id FROM sessions').all();
  assert.ok(rows.length > 0);
  assert.ok(!rows.some(r => r.id === token), 'el token real no debe estar en la base');
});

test('contraseñas guardadas con scrypt y salt distinto', () => {
  const rows = db.get().prepare("SELECT password_hash FROM users").all();
  assert.ok(rows.every(r => r.password_hash.startsWith('scrypt$')));
  assert.equal(new Set(rows.map(r => r.password_hash)).size, rows.length, 'mismo password → hashes distintos');
});

test('mensaje idéntico para usuario inexistente y contraseña incorrecta', async () => {
  const c = new Client(app.base);
  const a = await c.post('/api/auth/login', { username: 'no.existe', password: 'xxxxxxxx' });
  const b = await c.post('/api/auth/login', { username: 'lucas.ferreyra', password: 'xxxxxxxx' });
  assert.equal(a.status, 401); assert.equal(b.status, 401);
  assert.equal(a.data.error, b.data.error);
});

test('se bloquea el usuario tras 5 intentos fallidos (aunque luego acierte)', async () => {
  const c = new Client(app.base);
  for (let i = 0; i < 5; i++) assert.equal((await c.post('/api/auth/login', { username: 'camila.rojas', password: 'mal' + i })).status, 401);
  const blocked = await c.post('/api/auth/login', { username: 'camila.rojas', password: 'demo1234' });
  assert.equal(blocked.status, 429);
  // otro usuario sigue pudiendo entrar
  assert.equal((await new Client(app.base).post('/api/auth/login', { username: 'lucas.ferreyra', password: 'demo1234' })).status, 200);
});

test('alumno suspendido no puede ingresar', async () => {
  const r = await new Client(app.base).post('/api/auth/login', { username: 'bruno.medina', password: 'demo1234' });
  assert.equal(r.status, 403);
});

test('suspender a un alumno cierra sus sesiones al instante', async () => {
  const admin = new Client(app.base); await admin.login('sensei');
  const st = new Client(app.base); await st.login('sofia.aguirre');
  assert.equal((await st.get('/api/bootstrap')).status, 200);
  const boot = (await admin.get('/api/bootstrap')).data;
  const sofia = boot.students.find(s => s.username === 'sofia.aguirre');
  assert.equal((await admin.post(`/api/students/${sofia.id}/status`, { status: 'suspendido' })).status, 200);
  assert.equal((await st.get('/api/bootstrap')).status, 401);
  await admin.post(`/api/students/${sofia.id}/status`, { status: 'activo' });
});

test('logout invalida la sesión en el servidor', async () => {
  const c = new Client(app.base); await c.login('lucas.ferreyra');
  const saved = c.cookie;
  await c.post('/api/auth/logout', {});
  const again = new Client(app.base); again.cookie = saved;
  assert.equal((await again.get('/api/bootstrap')).status, 401);
});

test('CSRF: los pedidos que modifican datos exigen el encabezado propio', async () => {
  const c = new Client(app.base); await c.login('sensei');
  const r = await c.post('/api/events', { type: 'torneo', title: 'x', date: '2026-11-01' }, { csrf: false });
  assert.equal(r.status, 403);
  const cross = await c.post('/api/events', { type: 'torneo', title: 'x', date: '2026-11-01' }, { headers: { Origin: 'https://sitio-malo.example' } });
  assert.equal(cross.status, 403);
});

test('cambio de contraseña: valida la actual, largo mínimo y cierra otras sesiones', async () => {
  const a = new Client(app.base); await a.login('lucas.ferreyra');
  const b = new Client(app.base); await b.login('lucas.ferreyra');
  assert.equal((await a.post('/api/auth/change-password', { current: 'incorrecta', next: 'NuevaClave-99' })).status, 400);
  assert.equal((await a.post('/api/auth/change-password', { current: 'demo1234', next: 'corta' })).status, 400);
  assert.equal((await a.post('/api/auth/change-password', { current: 'demo1234', next: 'NuevaClave-99' })).status, 200);
  assert.equal((await a.get('/api/bootstrap')).status, 200, 'la sesión que cambió la clave sigue');
  assert.equal((await b.get('/api/bootstrap')).status, 401, 'la otra sesión se cerró');
  assert.equal((await new Client(app.base).post('/api/auth/login', { username: 'lucas.ferreyra', password: 'demo1234' })).status, 401);
  await new Client(app.base).login('lucas.ferreyra', 'NuevaClave-99');
});

test('alumno nuevo: contraseña inicial = DNI, obligado a cambiarla antes de usar el sistema', async () => {
  const admin = new Client(app.base); await admin.login('sensei');
  const created = await admin.post('/api/students', { name: 'Tomás Prueba', group: 'adulto', belt: 'adulto-blanco', dojo: 'central', dni: '40123456' });
  assert.equal(created.status, 201);
  assert.equal(created.data.username, 'tomas.prueba');
  const st = new Client(app.base);
  const login = await st.post('/api/auth/login', { username: 'tomas.prueba', password: '40123456' });
  assert.equal(login.status, 200);
  assert.equal(login.data.mustChangePassword, true);
  const blocked = await st.get('/api/bootstrap');
  assert.equal(blocked.status, 403);
  assert.equal(blocked.data.code, 'must_change_password');
  assert.equal((await st.post('/api/auth/change-password', { current: '40123456', next: 'MiClaveNueva-1' })).status, 200);
  assert.equal((await st.get('/api/bootstrap')).status, 200);
});

test('usuarios únicos: dos alumnos con el mismo nombre reciben IDs y usuarios distintos', async () => {
  const admin = new Client(app.base); await admin.login('sensei');
  const a = await admin.post('/api/students', { name: 'Juan Pérez', group: 'adulto', belt: 'adulto-blanco', dojo: 'central', dni: '30000001' });
  const b = await admin.post('/api/students', { name: 'Juan Pérez', group: 'adulto', belt: 'adulto-blanco', dojo: 'norte', dni: '30000002' });
  assert.notEqual(a.data.student.id, b.data.student.id);
  assert.notEqual(a.data.username, b.data.username);
  assert.equal(b.data.duplicateName, true);
  assert.match(a.data.student.id, /^[0-9a-f-]{36}$/);
});
