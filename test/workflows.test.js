'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { start, Client, PNG, db } = require('./helpers');

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

test('cobros: cobrar una cuota pendiente genera recibo correlativo; no se puede cobrar dos veces', async () => {
  const pend = boot.payments.filter(p => p.status === 'pendiente' && p.tipo !== 'examen').slice(0, 2);
  const a = await admin.post(`/api/payments/${pend[0].id}/pay`, { amount: 15000, medium: 'Físico', method: 'Efectivo' });
  const b = await admin.post(`/api/payments/${pend[1].id}/pay`, { amount: 15000, medium: 'Electrónico', method: 'Transferencia' });
  assert.equal(a.status, 200);
  assert.equal(a.data.payment.status, 'pagada');
  assert.match(a.data.payment.receiptNo, /^R-\d{4}-\d{4}$/);
  assert.notEqual(a.data.payment.receiptNo, b.data.payment.receiptNo);
  assert.equal((await admin.post(`/api/payments/${pend[0].id}/pay`, { amount: 1, medium: 'Físico', method: 'Efectivo' })).status, 409);
});

test('cobros: validaciones de monto y medio', async () => {
  const base = { studentId: ids['martina.suarez'], tipo: 'cuota', medium: 'Físico', method: 'Efectivo' };
  for (const amount of [0, -5, 'abc', null, 1e12]) assert.equal((await admin.post('/api/payments', { ...base, amount })).status, 400, `monto ${amount}`);
  assert.equal((await admin.post('/api/payments', { ...base, amount: 100, method: 'Mercado Pago' })).status, 400, 'medio y detalle incoherentes');
  assert.equal((await admin.post('/api/payments', { ...base, amount: 100, tipo: 'otros' })).status, 400, 'otros exige concepto');
  assert.equal((await admin.post('/api/payments', { ...base, studentId: ids['bruno.medina'], amount: 100 })).status, 404, 'alumno suspendido');
});

test('cobros: registrar una cuota de un mes con deuda la cobra en vez de duplicarla', async () => {
  const gen = await admin.post('/api/payments/generate-monthly', { month: '2026-11' });
  assert.equal(gen.status, 201);
  const activeCount = boot.students.filter(s => s.status === 'activo').length;
  assert.ok(gen.data.created >= activeCount - 1);
  // generar de nuevo no duplica
  assert.equal((await admin.post('/api/payments/generate-monthly', { month: '2026-11' })).data.created, 0);
  const sofia = gen.data.payments.find(p => p.studentId === ids['sofia.aguirre']);
  assert.equal(sofia.amount, 6000, 'respeta la beca');
  assert.match(sofia.concept, /becada/);
  const before = (await admin.get('/api/payments')).data.payments.length;
  const paid = await admin.post('/api/payments', { studentId: ids['sofia.aguirre'], tipo: 'cuota', periodMonth: '2026-11', amount: 6000, medium: 'Físico', method: 'Efectivo' });
  assert.equal(paid.status, 201);
  assert.equal(paid.data.payment.id, sofia.id, 'misma fila');
  assert.equal((await admin.get('/api/payments')).data.payments.length, before);
});

test('cobros: el monto se guarda en centavos sin errores de redondeo', async () => {
  const r = await admin.post('/api/payments', { studentId: ids['camila.rojas'], tipo: 'otros', customConcept: 'Cena', amount: '1234,56', medium: 'Físico', method: 'Efectivo' });
  assert.equal(r.status, 201);
  assert.equal(r.data.payment.amount, 1234.56);
  assert.equal(db.get().prepare('SELECT amount_cents FROM payments WHERE id = ?').get(r.data.payment.id).amount_cents, 123456);
});

test('flujo del comprobante: alumno informa → Sensei confirma → queda pagada con recibo', async () => {
  const martina = await as('martina.suarez');
  const pend = (await martina.get('/api/payments')).data.payments.find(p => p.status === 'pendiente');
  assert.equal((await martina.post(`/api/payments/${pend.id}/proof`, { medium: 'Efectivo' })).status, 400, 'medio no permitido');
  const sent = await martina.post(`/api/payments/${pend.id}/proof`, { medium: 'Transferencia', note: 'listo' });
  assert.equal(sent.data.payment.status, 'revision');
  assert.equal((await martina.post(`/api/payments/${pend.id}/proof`, { medium: 'Transferencia' })).status, 409, 'ya no está pendiente');
  const done = await admin.post(`/api/payments/${pend.id}/confirm-proof`, {});
  assert.equal(done.data.payment.status, 'pagada');
  assert.equal(done.data.payment.medium, 'Electrónico');
  assert.ok(done.data.payment.receiptNo);
});

test('exámenes: aprobar actualiza el cinturón y la fecha del cinturón; no aprobar no', async () => {
  const sid = ids['lucas.ferreyra'];
  const before = boot.students.find(s => s.id === sid);
  const fail = await admin.post('/api/activities', { studentId: sid, type: 'examen', activity: 'Examen', date: '2026-09-27', belt: 'infantil-amarillo-naranja', result: 'no aprobado' });
  assert.equal(fail.status, 201);
  assert.equal(fail.data.student.belt, before.belt);
  assert.equal((await admin.post('/api/activities', { studentId: sid, type: 'examen', activity: 'x', date: '2026-09-27', belt: 'adulto-verde', result: 'aprobado' })).status, 400, 'cinturón de otro grupo');
  const ok = await admin.post('/api/activities', { studentId: sid, type: 'examen', activity: 'Examen de 2º Kyu', date: '2026-09-27', belt: 'infantil-naranja', result: 'aprobado' });
  assert.equal(ok.data.student.belt, 'infantil-naranja');
  assert.equal(ok.data.student.beltSince, '2026-09-27');
  assert.equal(ok.data.student.since, before.since, 'la fecha de ingreso a la escuela no cambia');
});

test('diplomas: numeración correlativa sin saltos ni repetidos, con código de verificación público', async () => {
  const acts = boot.students.find(s => s.username === 'martina.suarez').activities;
  const approved = acts.find(a => a.result === 'aprobado');
  // pedidos en paralelo: ningún número se repite
  const results = await Promise.all([1, 2, 3, 4, 5].map(() => admin.post('/api/diplomas/issue', { items: [{ activityId: approved.id }] })));
  const numbers = results.map(r => r.data.issued[0].number).sort((a, b) => a - b);
  assert.deepEqual(numbers, [numbers[0], numbers[0] + 1, numbers[0] + 2, numbers[0] + 3, numbers[0] + 4]);
  const d = results[0].data.issued[0];
  assert.ok(d.verifyCode.length >= 10);
  assert.notEqual(d.verifyCode, String(d.number), 'el QR no usa el número correlativo');
  const anon = new Client(app.base);
  const v = await anon.get(`/api/public/verify/${d.verifyCode}`);
  assert.equal(v.status, 200);
  assert.equal(v.data.studentName, 'Martina Suárez');
  assert.equal(v.data.studentId, undefined);
  assert.equal((await anon.get('/api/public/verify/CODIGOFALSO12')).status, 404);
  assert.equal((await anon.get(`/api/public/verify/${d.number}`)).status, 404, 'no se puede adivinar por número');
  // certificado suelto a una persona que no es alumna
  const free = await admin.post('/api/diplomas/issue', { items: [{ studentName: 'Maestro Invitado', type: 'agradecimiento', activity: 'Seminario de Kobudo', date: '2026-09-20' }] });
  assert.equal(free.status, 201);
  assert.equal(free.data.issued[0].studentId, null);
  // un examen no aprobado no genera diploma
  const noOk = (await admin.post('/api/activities', { studentId: ids['camila.rojas'], type: 'examen', activity: 'x', date: '2026-09-01', belt: 'infantil-verde', result: 'no aprobado' })).data.activity;
  assert.equal((await admin.post('/api/diplomas/issue', { items: [{ activityId: noOk.id }] })).status, 400);
});

test('inscripción pública: cualquiera envía; el Sensei aprueba y se crea alumno + usuario', async () => {
  const anon = new Client(app.base);
  const sent = await anon.post('/api/inscriptions', { name: 'Ana <script>alert(1)</script> López', group: 'infantil', dojo: 'norte', dni: '50111222', guardian: 'Marta López', phone: '5493410000000' });
  assert.equal(sent.status, 201);
  assert.equal((await anon.post('/api/inscriptions', { name: 'Bot', group: 'adulto', dojo: 'norte', website: 'http://spam' })).status, 201, 'el robot cree que funcionó');
  assert.equal((await anon.post('/api/inscriptions', { name: '', group: 'adulto', dojo: 'norte' })).status, 400);
  assert.equal((await anon.post('/api/inscriptions', { name: 'X', group: 'adulto', dojo: 'inexistente' })).status, 400);
  const list = (await admin.get('/api/inscriptions')).data.inscriptions;
  assert.ok(!list.some(i => i.name === 'Bot'), 'la trampa no guarda nada');
  const ana = list.find(i => i.name.startsWith('Ana'));
  assert.ok(!ana.name.includes('<'), 'se limpian los caracteres de HTML');
  const ap = await admin.post(`/api/inscriptions/${ana.id}/approve`, {});
  assert.equal(ap.status, 201);
  assert.equal(ap.data.student.belt, 'infantil-blanco');
  assert.equal(ap.data.initialPassword, 'karatedo123');
  assert.equal((await new Client(app.base).post('/api/auth/login', { username: ap.data.username, password: 'karatedo123' })).status, 200);
});

test('anular: solo el Sensei; queda el registro con motivo, deja de contar y se puede volver a cobrar', async () => {
  const paid = (await admin.get('/api/payments')).data.payments.find(p => p.status === 'pagada' && p.receiptNo);
  const ivan = await as('ivan.castro'); // instructor que cobra: no puede anular
  assert.equal((await ivan.post(`/api/payments/${paid.id}/void`, { reason: 'x' })).status, 403);
  assert.equal((await as('martina.suarez').then(c => c.post(`/api/payments/${paid.id}/void`, { reason: 'x' }))).status, 403);
  assert.equal((await admin.post(`/api/payments/${paid.id}/void`, {})).status, 400, 'exige motivo');
  const v = await admin.post(`/api/payments/${paid.id}/void`, { reason: 'Monto mal cargado' });
  assert.equal(v.data.payment.status, 'anulada');
  assert.equal(v.data.payment.voidReason, 'Monto mal cargado');
  assert.equal(v.data.payment.receiptNo, paid.receiptNo, 'el recibo anulado queda registrado');
  assert.equal((await admin.post(`/api/payments/${paid.id}/void`, { reason: 'otra vez' })).status, 409);
  assert.equal((await admin.post(`/api/payments/${paid.id}/pay`, { amount: 1, medium: 'Físico', method: 'Efectivo' })).status, 409, 'no se cobra un anulado');
  // el alumno ya no lo ve; quien cobra sí (marcado)
  const owner = boot.students.find(s => s.id === paid.studentId);
  const oc = await as(owner.username);
  assert.ok(!(await oc.get('/api/payments')).data.payments.some(p => p.id === paid.id));
  assert.ok((await ivan.get('/api/payments')).data.payments.some(p => p.id === paid.id && p.status === 'anulada'));
  // se puede registrar el cobro correcto
  const again = await admin.post('/api/payments', { studentId: paid.studentId, tipo: 'otros', customConcept: 'Corrección', amount: 100, medium: 'Físico', method: 'Efectivo' });
  assert.equal(again.status, 201);
  assert.notEqual(again.data.payment.receiptNo, paid.receiptNo);
});

test('rechazar comprobante: vuelve a pendiente y el alumno puede reenviarlo (solo Sensei)', async () => {
  const lucas = await as('lucas.ferreyra');
  const gen = (await admin.post('/api/payments/generate-monthly', { month: '2031-05' })).data.payments.find(p => p.studentId === ids['lucas.ferreyra']);
  await lucas.post(`/api/payments/${gen.id}/proof`, { medium: 'Transferencia', note: 'ok' });
  assert.equal((await lucas.post(`/api/payments/${gen.id}/reject-proof`, {})).status, 403);
  const rej = await admin.post(`/api/payments/${gen.id}/reject-proof`, {});
  assert.equal(rej.data.payment.status, 'pendiente');
  assert.equal((await lucas.post(`/api/payments/${gen.id}/proof`, { medium: 'Mercado Pago' })).status, 200);
  assert.equal((await admin.post(`/api/payments/${gen.id}/reject-proof`, {})).status, 200);
  assert.equal((await admin.post(`/api/payments/${gen.id}/reject-proof`, {})).status, 409);
});

test('el formulario público tiene límite de envíos por hora', async () => {
  const anon = new Client(app.base);
  let last;
  for (let i = 0; i < 12; i++) last = await anon.post('/api/inscriptions', { name: 'Persona ' + i, group: 'adulto', dojo: 'central' });
  assert.equal(last.status, 429);
});

test('eliminar un alumno borra su usuario, sus datos y sus archivos del disco', async () => {
  const c = await admin.post('/api/students', { name: 'Para Borrar', group: 'adulto', belt: 'adulto-blanco', dojo: 'central', dni: '33333333' });
  const sid = c.data.student.id;
  const up = await admin.request('POST', `/api/files?kind=student_photo&studentId=${sid}`, PNG, { raw: true, headers: { 'Content-Type': 'image/png' } });
  await admin.put(`/api/students/${sid}`, { photoFileId: up.data.id });
  const row = db.get().prepare('SELECT * FROM files WHERE id = ?').get(up.data.id);
  const file = path.join(app.dataDir, 'uploads', `${row.id}.${row.ext}`);
  assert.ok(fs.existsSync(file));
  assert.equal((await admin.delete(`/api/students/${sid}`)).status, 200);
  assert.ok(!fs.existsSync(file), 'archivo borrado');
  assert.equal(db.get().prepare('SELECT COUNT(*) AS n FROM users WHERE student_id = ?').get(sid).n, 0);
  assert.equal((await new Client(app.base).post('/api/auth/login', { username: 'para.borrar', password: '33333333' })).status, 401);
});

test('cinturones: no se borra uno en uso; al agregar se acomoda el orden', async () => {
  const inUse = await admin.delete('/api/belts/adulto-verde');
  assert.equal(inUse.status, 409);
  const add = await admin.post('/api/belts', { name: 'Violeta', group: 'adulto', color: 'var(--belt-azul)', after: 4, minMonths: 6, classesRequired: 20, kyu: true });
  assert.equal(add.status, 201);
  const adult = add.data.belts.filter(b => b.group === 'adulto').sort((a, b) => a.order - b.order);
  assert.equal(adult[4].id, 'adulto-violeta');
  assert.deepEqual(adult.map(b => b.order), adult.map((_, i) => i + 1));
  assert.equal((await admin.post('/api/belts', { name: 'Violeta', group: 'adulto', color: 'var(--belt-azul)', after: 1, minMonths: 1, classesRequired: 1 })).status, 409);
  assert.equal((await admin.post('/api/belts', { name: 'Raro', group: 'adulto', color: 'url(javascript:1)', after: 1, minMonths: 1, classesRequired: 1 })).status, 400);
  assert.equal((await admin.delete('/api/belts/adulto-violeta')).status, 200);
});

test('respaldo: se descarga, se restaura y recupera datos y archivos', async () => {
  const zipRes = await admin.get('/api/backup/download');
  assert.equal(zipRes.status, 200);
  const zip = zipRes.data;
  const { readZip } = require('../server/zip');
  const names = readZip(zip).map(e => e.name);
  assert.ok(names.includes('dojo.db') && names.some(n => n.startsWith('uploads/')));
  // el respaldo no arrastra sesiones abiertas
  const dbEntry = readZip(zip).find(e => e.name === 'dojo.db').data;
  const tmp = path.join(app.dataDir, 'check.db');
  fs.writeFileSync(tmp, dbEntry);
  const { DatabaseSync } = require('node:sqlite');
  const chk = new DatabaseSync(tmp);
  assert.equal(chk.prepare('SELECT COUNT(*) AS n FROM sessions').get().n, 0);
  chk.close();

  const marker = await admin.post('/api/library/glossary', { term: 'MarcaDeRespaldo', def: 'x' });
  assert.equal(marker.status, 201);
  // contraseña incorrecta: no restaura nada
  assert.equal((await admin.request('POST', '/api/backup/restore', zip, { raw: true, headers: { 'X-Confirm-Password': 'mala' } })).status, 403);
  // archivo que no es un respaldo
  assert.equal((await admin.request('POST', '/api/backup/restore', Buffer.from('no soy un zip'), { raw: true, headers: { 'X-Confirm-Password': 'demo1234' } })).status, 400);
  const r = await admin.request('POST', '/api/backup/restore', zip, { raw: true, headers: { 'X-Confirm-Password': 'demo1234' } });
  assert.equal(r.status, 200);
  const again = await as('sensei');
  const b = (await again.get('/api/bootstrap')).data;
  assert.ok(!b.glossary.some(g => g.term === 'MarcaDeRespaldo'), 'volvió al estado del respaldo');
  assert.ok(fs.existsSync(path.join(app.dataDir, 'backups')), 'quedó copia de seguridad previa');
});

test('importar planilla: crea alumnos con clave inicial, reconoce nombres de dojo/cinturón y reporta filas con error', async () => {
  admin = await as('sensei'); // el test de restaurar cerró las sesiones
  const rows = [
    { name: 'Importado Uno', group: 'Adulto', dojo: 'Dojo Norte', belt: 'Verde', birth: '20/05/1990', phone: '5493415550001' },
    { name: 'Importada Dos', group: 'Infantil', dojo: 'central', belt: '', birth: '2015-03-02', guardian: 'Mamá Dos' },
    { name: 'Sin Dojo', group: 'Adulto', dojo: 'Dojo Sur' },
    { name: 'Cinturón Raro', group: 'Adulto', dojo: 'Central', belt: 'Arcoíris' },
    { name: 'Fecha Mala', group: 'Adulto', dojo: 'Central', birth: '31/02/2000' },
    { name: 'Importado Uno', group: 'Adulto', dojo: 'Dojo Norte', birth: '20/05/1990' },
    { name: '', group: 'Adulto', dojo: 'Central' },
  ];
  const r = await admin.post('/api/students/import', { rows });
  assert.equal(r.status, 201);
  assert.equal(r.data.created, 2);
  assert.equal(r.data.skipped.length, 5);
  assert.deepEqual(r.data.skipped.map(x => x.row), [4, 5, 6, 7, 8]);
  const uno = r.data.students.find(s => s.name === 'Importado Uno');
  assert.equal(uno.dojo, 'norte'); assert.equal(uno.belt, 'adulto-verde'); assert.equal(uno.birth, '1990-05-20');
  assert.equal(r.data.students.find(s => s.name === 'Importada Dos').belt, 'infantil-blanco');
  const login = await new Client(app.base).post('/api/auth/login', { username: uno.username, password: 'karatedo123' });
  assert.equal(login.data.mustChangePassword, true);
  // reimportar no duplica
  assert.equal((await admin.post('/api/students/import', { rows: rows.slice(0, 2) })).data.created, 0);
  assert.equal((await as('martina.suarez').then(c => c.post('/api/students/import', { rows }))).status, 403);
  assert.equal((await admin.post('/api/students/import', { rows: [] })).status, 400);
});

test('listo para rendir: el Sensei recibe las clases desde el último cinturón de cada alumno', async () => {
  const b = (await admin.get('/api/bootstrap')).data;
  const martina = b.students.find(s => s.username === 'martina.suarez');
  assert.equal(typeof martina.classesSinceBelt, 'number');
  const cnt = db.get().prepare('SELECT COUNT(*) AS n FROM attendance WHERE student_id = ? AND date >= ?').get(martina.id, martina.beltSince).n;
  assert.equal(martina.classesSinceBelt, cnt);
});

test('gastos: el Sensei puede corregirlos y borrarlos; nadie más', async () => {
  const e = (await admin.post('/api/expenses', { category: 'Otro', concept: 'Mal cargado', amount: 100, date: '2026-10-01', status: 'pendiente' })).data.expense;
  const ivan = await as('ivan.castro');
  assert.equal((await ivan.put(`/api/expenses/${e.id}`, { category: 'Otro', concept: 'x', amount: 1, date: '2026-10-01', status: 'pagado' })).status, 403);
  assert.equal((await ivan.delete(`/api/expenses/${e.id}`)).status, 403);
  const up = await admin.put(`/api/expenses/${e.id}`, { category: 'Material', concept: 'Corregido', amount: 250.5, date: '2026-10-02', status: 'pagado' });
  assert.equal(up.status, 200);
  assert.equal(up.data.expense.amount, 250.5);
  assert.equal(up.data.expense.paidOn, '2026-10-02');
  assert.equal((await admin.put(`/api/expenses/${e.id}`, { category: 'Inventada', concept: 'x', amount: 1, date: '2026-10-02', status: 'pagado' })).status, 400);
  assert.equal((await admin.delete(`/api/expenses/${e.id}`)).status, 200);
  assert.equal((await admin.delete(`/api/expenses/${e.id}`)).status, 404);
});
