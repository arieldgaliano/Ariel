'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { start, Client, PNG } = require('./helpers');

let app, admin, boot;
const ids = {};
const as = async username => { const c = new Client(app.base); await c.login(username); return c; };

before(async () => {
  app = await start();
  admin = await as('sensei');
  boot = (await admin.get('/api/bootstrap')).data;
  for (const s of boot.students) ids[s.username] = s.id;
});
after(async () => { await app.stop(); });

const setPerms = (username, body) => admin.put(`/api/students/${ids[username]}`, body);

test('endpoints solo-Sensei: 401 sin sesión, 403 para alumno e instructor', async () => {
  const martina = await as('martina.suarez');
  const ivan = await as('ivan.castro');
  const anon = new Client(app.base);
  const sid = ids['lucas.ferreyra'];
  const calls = [
    ['POST', '/api/students', { name: 'X', group: 'adulto', belt: 'adulto-blanco', dojo: 'central' }],
    ['PUT', `/api/students/${sid}`, { name: 'Hack' }],
    ['POST', `/api/students/${sid}/status`, { status: 'suspendido' }],
    ['POST', `/api/students/${sid}/instructor`, { isInstructor: true }],
    ['PUT', `/api/students/${sid}/scholarship`, { active: true, amount: 1 }],
    ['POST', `/api/students/${sid}/reset-password`, {}],
    ['DELETE', `/api/students/${sid}`],
    ['POST', '/api/activities', { studentId: sid, type: 'otros', activity: 'x', date: '2026-01-01' }],
    ['POST', '/api/expenses', { category: 'Otro', concept: 'x', amount: 1, date: '2026-01-01', status: 'pagado' }],
    ['POST', '/api/payments/generate-monthly', { month: '2026-10' }],
    ['POST', '/api/diplomas/issue', { items: [] }],
    ['PUT', '/api/diplomas/config', {}],
    ['PUT', '/api/settings/fees', { cuotaAdulto: 1, cuotaInfantil: 1, examBoard: 1, belt: 1 }],
    ['PUT', '/api/settings/home', {}],
    ['PUT', '/api/settings/theme', {}],
    ['PUT', '/api/settings/letterhead', {}],
    ['PUT', '/api/settings/logo', { fileId: null }],
    ['GET', '/api/backup/download'], ['GET', '/api/backup/export'],
    ['GET', '/api/inscriptions'],
    ['POST', '/api/inscriptions/abc/approve', {}], ['DELETE', '/api/inscriptions/abc'],
    ['POST', '/api/events', { type: 'torneo', title: 'x', date: '2026-11-01' }],
    ['POST', '/api/schedule', { day: 'Lun', details: 'x' }],
    ['POST', '/api/forum/announcements', { title: 'x', body: 'y' }],
    ['POST', '/api/attendance/qr/rotate', {}],
    ['PUT', '/api/auth/username', { username: 'nuevo.sensei' }],
  ];
  for (const [method, url, body] of calls) {
    assert.equal((await anon.request(method, url, body)).status, 401, `anon ${method} ${url}`);
    assert.equal((await martina.request(method, url, body)).status, 403, `alumno ${method} ${url}`);
    assert.equal((await ivan.request(method, url, body)).status, 403, `instructor ${method} ${url}`);
  }
});

test('alumno: solo ve su propia ficha, sus pagos y su programa hasta su cinturón', async () => {
  const c = await as('martina.suarez');
  const b = (await c.get('/api/bootstrap')).data;
  assert.equal(b.me.role, 'alumno');
  assert.equal(b.students.length, 1);
  assert.equal(b.students[0].username, 'martina.suarez');
  assert.ok(b.payments.length > 0 && b.payments.every(p => p.studentId === ids['martina.suarez']));
  for (const k of ['expenses', 'inscriptions', 'issuedDiplomas', 'fees', 'diplomaConfig']) assert.equal(b[k], undefined, k);
  const programIds = Object.keys(b.programs);
  assert.ok(programIds.includes('adulto-verde') && programIds.includes('adulto-blanco'));
  assert.ok(!programIds.includes('adulto-azul') && !programIds.includes('adulto-dan1'), 'no ve cinturones posteriores');
  assert.ok(!programIds.some(id => id.startsWith('infantil')), 'no ve el otro grupo');
});

test('instructor con Asistencia ve solo compañeros de SU dojo, sin datos médicos ni DNI', async () => {
  const c = await as('ivan.castro'); // dojo norte
  // Con Cuotas y pagos (escritura) también necesita ver a todos para cobrar; acá se mide solo el alcance de Asistencia.
  await setPerms('ivan.castro', { modulePerms: { pagos: 'read', asistencia: 'write', biblioteca: 'write' } });
  const b = (await c.get('/api/bootstrap')).data;
  const others = b.students.filter(s => s.username === undefined);
  assert.ok(others.length > 0);
  const byId = Object.fromEntries(boot.students.map(s => [s.id, s]));
  for (const o of others) {
    assert.equal(byId[o.id].dojo, 'norte', 'solo del dojo norte');
    assert.equal(o.dni, undefined); assert.equal(o.allergies, undefined); assert.equal(o.emergencyContact, undefined);
    assert.equal(o.activities, undefined);
  }
  assert.ok(!others.some(o => o.id === ids['martina.suarez']), 'Martina (central) no aparece');
  await setPerms('ivan.castro', { modulePerms: { pagos: 'write', asistencia: 'write', biblioteca: 'write' } });
  // Quien cobra ve a todos los alumnos activos, con teléfono, pero nunca ficha médica ni DNI.
  const wide = (await c.get('/api/bootstrap')).data.students.filter(s => s.username === undefined);
  assert.ok(wide.some(o => o.id === ids['martina.suarez']));
  assert.ok(wide.every(o => o.dni === undefined && o.allergies === undefined && o.emergencyPhone === undefined));
});

test('asistencia: instructor solo puede marcar alumnos de su dojo; el Sensei, de cualquiera', async () => {
  const c = await as('ivan.castro');
  const today = (await c.get('/api/attendance/today')).data.date;
  assert.equal((await c.put('/api/attendance', { studentId: ids['camila.rojas'], date: today, present: true })).status, 200); // norte
  assert.equal((await c.put('/api/attendance', { studentId: ids['martina.suarez'], date: today, present: true })).status, 404); // central
  const t = (await c.get('/api/attendance/today')).data;
  assert.ok(t.present.includes(ids['camila.rojas']));
  assert.equal((await admin.put('/api/attendance', { studentId: ids['martina.suarez'], date: today, present: true })).status, 200);
  assert.equal((await c.put('/api/attendance', { studentId: ids['camila.rojas'], date: '2999-01-01', present: true })).status, 400, 'fecha futura');
});

test('alumno sin el módulo Asistencia no puede ni leer ni marcar; con el módulo, sí (en su dojo)', async () => {
  const c = await as('lucas.ferreyra'); // central
  const today = (await c.get('/api/bootstrap')).data.me.serverToday;
  assert.equal((await c.get('/api/attendance/today')).status, 403);
  assert.equal((await c.put('/api/attendance', { studentId: ids['martina.suarez'], date: today, present: true })).status, 403);
  const cur = boot.students.find(s => s.username === 'lucas.ferreyra');
  await setPerms('lucas.ferreyra', { enabledModules: [...cur.enabledModules, 'asistencia'] });
  assert.equal((await c.put('/api/attendance', { studentId: ids['martina.suarez'], date: today, present: true })).status, 200);
  assert.equal((await c.put('/api/attendance', { studentId: ids['camila.rojas'], date: today, present: true })).status, 404, 'otro dojo');
  // lectura sola
  await setPerms('lucas.ferreyra', { modulePerms: { asistencia: 'read' } });
  assert.equal((await c.get('/api/attendance/today')).status, 200);
  assert.equal((await c.put('/api/attendance', { studentId: ids['martina.suarez'], date: today, present: false })).status, 403);
  await setPerms('lucas.ferreyra', { enabledModules: cur.enabledModules, modulePerms: {} });
});

test('Cuotas y pagos: escritura ve y cobra todo; lectura sola ve únicamente lo propio', async () => {
  const c = await as('ivan.castro');
  let b = (await c.get('/api/bootstrap')).data;
  assert.ok(new Set(b.payments.map(p => p.studentId)).size > 1, 've pagos de varios alumnos');
  assert.ok(b.fees);
  await setPerms('ivan.castro', { modulePerms: { pagos: 'read', asistencia: 'write', biblioteca: 'write' } });
  b = (await c.get('/api/bootstrap')).data;
  assert.ok(b.payments.every(p => p.studentId === ids['ivan.castro']), 'solo sus pagos');
  assert.equal(b.fees, undefined);
  assert.equal((await c.get('/api/payments')).data.payments.every(p => p.studentId === ids['ivan.castro']), true);
  const other = boot.payments.find(p => p.status === 'pendiente' && p.studentId !== ids['ivan.castro']);
  assert.equal((await c.post(`/api/payments/${other.id}/pay`, { amount: 1000, medium: 'Físico', method: 'Efectivo' })).status, 403);
  assert.equal((await c.post('/api/payments', { studentId: ids['martina.suarez'], tipo: 'cuota', amount: 1000, medium: 'Físico', method: 'Efectivo' })).status, 403);
  await setPerms('ivan.castro', { modulePerms: { pagos: 'write', asistencia: 'write', biblioteca: 'write' } });
});

test('un alumno común no puede cobrar ni confirmar pagos ni ver los ajenos', async () => {
  const c = await as('martina.suarez');
  const pend = boot.payments.find(p => p.status === 'pendiente' && p.studentId !== ids['martina.suarez']);
  assert.equal((await c.post(`/api/payments/${pend.id}/pay`, { amount: 1, medium: 'Físico', method: 'Efectivo' })).status, 403);
  assert.equal((await c.post(`/api/payments/${pend.id}/confirm-proof`, {})).status, 403);
  assert.equal((await c.post('/api/payments', { studentId: ids['martina.suarez'], tipo: 'cuota', amount: 1, medium: 'Físico', method: 'Efectivo' })).status, 403);
  // intentar subir comprobante de un pago ajeno → ni siquiera se entera de que existe
  assert.equal((await c.post(`/api/payments/${pend.id}/proof`, { medium: 'Transferencia' })).status, 404);
  const mine = (await c.get('/api/payments')).data.payments;
  assert.ok(mine.every(p => p.studentId === ids['martina.suarez']));
});

test('biblioteca: alumno solo lee; instructor con escritura edita; con lectura sola, no', async () => {
  const martina = await as('martina.suarez');
  assert.equal((await martina.post('/api/library/glossary', { term: 'X', def: 'Y' })).status, 403);
  assert.equal((await martina.post('/api/library/links', { title: 'x', url: 'https://a.com', type: 'link' })).status, 403);
  const ivan = await as('ivan.castro');
  const ok = await ivan.post('/api/library/glossary', { term: 'Dojo', def: 'Lugar de práctica' });
  assert.equal(ok.status, 201);
  assert.equal((await ivan.post('/api/library/links', { title: 'x', url: 'javascript:alert(1)', type: 'link' })).status, 400, 'url peligrosa');
  await setPerms('ivan.castro', { modulePerms: { biblioteca: 'read', pagos: 'write', asistencia: 'write' } });
  assert.equal((await ivan.delete(`/api/library/glossary/${ok.data.item.id}`)).status, 403);
  await setPerms('ivan.castro', { modulePerms: { biblioteca: 'write', pagos: 'write', asistencia: 'write' } });
  assert.equal((await ivan.delete(`/api/library/glossary/${ok.data.item.id}`)).status, 200);
});

test('programas y cinturones: requieren el módulo con escritura', async () => {
  const martina = await as('martina.suarez');
  assert.equal((await martina.put('/api/programs/adulto-verde', { items: ['hack'] })).status, 403);
  assert.equal((await martina.post('/api/belts', { name: 'Violeta', group: 'adulto', color: 'var(--belt-azul)', after: 1, minMonths: 1, classesRequired: 1 })).status, 403);
  const cur = boot.students.find(s => s.username === 'ivan.castro');
  const ivan = await as('ivan.castro');
  assert.equal((await ivan.put('/api/programs/adulto-verde', { items: ['x'] })).status, 403, 'sin el módulo habilitado');
  await setPerms('ivan.castro', { enabledModules: [...cur.enabledModules, 'programas'], modulePerms: { programas: 'read', pagos: 'write', asistencia: 'write', biblioteca: 'write' } });
  assert.equal((await ivan.put('/api/programs/adulto-verde', { items: ['x'] })).status, 403, 'lectura sola');
  await setPerms('ivan.castro', { modulePerms: { programas: 'write', pagos: 'write', asistencia: 'write', biblioteca: 'write' } });
  assert.equal((await ivan.put('/api/programs/adulto-verde', { items: ['Nueva técnica'] })).status, 200);
  await setPerms('ivan.castro', { enabledModules: cur.enabledModules });
});

test('foro: el autor lo pone el servidor; solo Sensei/instructor borran; anuncios solo Sensei', async () => {
  const martina = await as('martina.suarez');
  const post = await martina.post('/api/forum/posts', { text: 'Hola dojo', author: 'Sensei', role: 'Administrador' });
  assert.equal(post.status, 201);
  assert.equal(post.data.post.author, 'Martina Suárez');
  assert.equal(post.data.post.role, 'Alumno');
  assert.equal((await martina.delete(`/api/forum/posts/${post.data.post.id}`)).status, 403);
  const ivan = await as('ivan.castro');
  assert.equal((await ivan.delete(`/api/forum/posts/${post.data.post.id}`)).status, 200);
  assert.equal((await martina.post('/api/forum/announcements', { title: 'a', body: 'b' })).status, 403);
});

test('archivos: foto de alumno privada; subidas restringidas y validadas por contenido', async () => {
  const lucas = await as('lucas.ferreyra');
  const martina = await as('martina.suarez');
  const anon = new Client(app.base);
  // alumno no puede subir logo ni foto
  assert.equal((await lucas.request('POST', '/api/files?kind=logo', PNG, { raw: true, headers: { 'Content-Type': 'image/png' } })).status, 403);
  // Sensei sube una foto para Martina
  const up = await admin.request('POST', `/api/files?kind=student_photo&studentId=${ids['martina.suarez']}`, PNG, { raw: true, headers: { 'Content-Type': 'image/png' } });
  assert.equal(up.status, 201);
  assert.equal((await admin.put(`/api/students/${ids['martina.suarez']}`, { photoFileId: up.data.id })).status, 200);
  const url = up.data.url;
  assert.equal((await martina.get(url)).status, 200, 'la dueña la ve');
  assert.equal((await admin.get(url)).status, 200);
  assert.equal((await lucas.get(url)).status, 404, 'otro alumno no');
  assert.equal((await anon.get(url)).status, 404, 'anónimo no');
  // el contenido manda, no el nombre ni el Content-Type
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  assert.equal((await admin.request('POST', '/api/files?kind=logo', svg, { raw: true, headers: { 'Content-Type': 'image/png' } })).status, 400);
  assert.equal((await admin.request('POST', '/api/files?kind=logo', Buffer.from('hola mundo, esto no es una imagen'), { raw: true, headers: { 'Content-Type': 'image/png' } })).status, 400);
  const big = Buffer.concat([PNG, Buffer.alloc(7 * 1024 * 1024)]);
  assert.equal((await admin.request('POST', '/api/files?kind=logo', big, { raw: true, headers: { 'Content-Type': 'image/png' } })).status, 413);
  // el logo es público
  const logo = (await anon.get('/api/public/config')).data.logo;
  assert.ok(logo);
  assert.equal((await anon.get(logo)).status, 200);
  // los archivos servidos llevan protecciones
  const served = await martina.get(url);
  assert.equal(served.headers.get('x-content-type-options'), 'nosniff');
  assert.match(served.headers.get('content-security-policy'), /sandbox/);
});

test('comprobantes: los ve el dueño, el Sensei y quien cobra; no otros alumnos', async () => {
  const martina = await as('martina.suarez');
  const lucas = await as('lucas.ferreyra');
  const ivan = await as('ivan.castro');
  const mine = (await martina.get('/api/payments')).data.payments.find(p => p.status === 'pendiente');
  const up = await martina.request('POST', '/api/files?kind=proof', PNG, { raw: true, headers: { 'Content-Type': 'image/png' } });
  assert.equal(up.status, 201);
  // otro alumno no puede usar el archivo de Martina como su comprobante
  const lucasPending = (await admin.get('/api/payments')).data.payments.find(p => p.studentId === ids['lucas.ferreyra'] && p.status === 'pendiente')
    || (await admin.post('/api/payments/generate-monthly', { month: '2030-01' })).data.payments.find(p => p.studentId === ids['lucas.ferreyra']);
  assert.equal((await lucas.post(`/api/payments/${lucasPending.id}/proof`, { medium: 'Transferencia', fileId: up.data.id })).status, 403);
  const sent = await martina.post(`/api/payments/${mine.id}/proof`, { medium: 'Mercado Pago', note: 'ok', fileId: up.data.id });
  assert.equal(sent.status, 200);
  assert.equal(sent.data.payment.status, 'revision');
  assert.equal((await lucas.get(up.data.url)).status, 404);
  assert.equal((await ivan.get(up.data.url)).status, 200, 'instructor con Cuotas y pagos (escritura)');
  assert.equal((await admin.get(up.data.url)).status, 200);
  await setPerms('ivan.castro', { modulePerms: { pagos: 'read', asistencia: 'write', biblioteca: 'write' } });
  assert.equal((await ivan.get(up.data.url)).status, 404, 'con lectura sola ya no');
  await setPerms('ivan.castro', { modulePerms: { pagos: 'write', asistencia: 'write', biblioteca: 'write' } });
});

test('un instructor no puede darse permisos a sí mismo (no hay forma de editar la ficha)', async () => {
  const ivan = await as('ivan.castro');
  assert.equal((await ivan.put(`/api/students/${ids['ivan.castro']}`, { enabledModules: ['programas', 'cinturones'] })).status, 403);
  assert.equal((await ivan.put(`/api/students/${ids['ivan.castro']}`, { isInstructor: false })).status, 403);
});

test('registro de asistencia por QR: solo alumnos, con el código vigente, una vez por día', async () => {
  const token = (await admin.get('/api/attendance/qr')).data.token;
  const sofia = await as('sofia.aguirre');
  assert.equal((await sofia.post('/api/attendance/checkin', { token: 'codigo-viejo' })).status, 400);
  const first = await sofia.post('/api/attendance/checkin', { token });
  assert.equal(first.status, 200); assert.equal(first.data.already, false);
  assert.equal((await sofia.post('/api/attendance/checkin', { token })).data.already, true);
  assert.equal((await admin.post('/api/attendance/checkin', { token })).status, 403);
  assert.equal((await new Client(app.base).post('/api/attendance/checkin', { token })).status, 401);
  // el alumno no puede leer el código del QR (solo quien toma asistencia)
  assert.equal((await sofia.get('/api/attendance/qr')).status, 403);
  // rotar invalida el anterior
  const next = (await admin.post('/api/attendance/qr/rotate', {})).data.token;
  assert.notEqual(next, token);
  assert.equal((await sofia.post('/api/attendance/checkin', { token })).status, 400);
});

test('colores del sitio: no se guarda una combinación ilegible', async () => {
  const theme = { paper: '#E8E0C4', paperRaised: '#F4EEDB', sumi: '#1C1613', ink: '#211B17', inkSoft: '#6B5A42', link: '#8E241D', btnBg: '#AC2B22', btnText: '#FFFFFF' };
  assert.equal((await admin.put('/api/settings/theme', theme)).status, 200);
  const bad = await admin.put('/api/settings/theme', { ...theme, ink: '#E0D8BC' }); // letra casi igual al fondo
  assert.equal(bad.status, 400);
  assert.match(bad.data.error, /ilegible/);
  assert.equal((await admin.put('/api/settings/theme', { ...theme, btnText: '#AC2B22' })).status, 400);
});
