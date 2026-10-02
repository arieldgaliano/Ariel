/* ============================================================
   DATOS DE EJEMPLO
============================================================ */
let belts = [
  // — Infantil —
  {id:'infantil-blanco', name:'Blanco', group:'infantil', order:1, color:'var(--belt-blanco)', minMonths:0, classesRequired:0, kyu:true},
  {id:'infantil-blanco-celeste', name:'Blanco punta celeste', group:'infantil', order:2, color:'var(--belt-blanco)', tip:'var(--belt-celeste)', minMonths:3, classesRequired:12, kyu:true},
  {id:'infantil-celeste', name:'Celeste', group:'infantil', order:3, color:'var(--belt-celeste)', minMonths:4, classesRequired:16, kyu:true},
  {id:'infantil-celeste-amarilla', name:'Celeste punta amarilla', group:'infantil', order:4, color:'var(--belt-celeste)', tip:'var(--belt-amarillo)', minMonths:3, classesRequired:12, kyu:true},
  {id:'infantil-amarillo', name:'Amarillo', group:'infantil', order:5, color:'var(--belt-amarillo)', minMonths:4, classesRequired:16, kyu:true},
  {id:'infantil-amarillo-naranja', name:'Amarillo punta naranja', group:'infantil', order:6, color:'var(--belt-amarillo)', tip:'var(--belt-naranja)', minMonths:3, classesRequired:12, kyu:true},
  {id:'infantil-naranja', name:'Naranja', group:'infantil', order:7, color:'var(--belt-naranja)', minMonths:5, classesRequired:20, kyu:true},
  {id:'infantil-verde', name:'Verde', group:'infantil', order:8, color:'var(--belt-verde)', minMonths:6, classesRequired:24, kyu:true},
  {id:'infantil-azul', name:'Azul', group:'infantil', order:9, color:'var(--belt-azul)', minMonths:6, classesRequired:24, kyu:true},
  {id:'infantil-marron', name:'Marrón', group:'infantil', order:10, color:'var(--belt-marron)', minMonths:8, classesRequired:32, kyu:true},
  {id:'infantil-negro-junior', name:'Negro junior (punta blanca)', group:'infantil', order:11, color:'var(--belt-negro)', tip:'var(--belt-blanco)', minMonths:10, classesRequired:40},
  // — Adultos —
  {id:'adulto-blanco', name:'Blanco', group:'adulto', order:1, color:'var(--belt-blanco)', minMonths:0, classesRequired:0, kyu:true},
  {id:'adulto-amarillo', name:'Amarillo', group:'adulto', order:2, color:'var(--belt-amarillo)', minMonths:6, classesRequired:24, kyu:true},
  {id:'adulto-naranja', name:'Naranja', group:'adulto', order:3, color:'var(--belt-naranja)', minMonths:6, classesRequired:24, kyu:true},
  {id:'adulto-verde', name:'Verde', group:'adulto', order:4, color:'var(--belt-verde)', minMonths:8, classesRequired:32, kyu:true},
  {id:'adulto-azul', name:'Azul', group:'adulto', order:5, color:'var(--belt-azul)', minMonths:8, classesRequired:32, kyu:true},
  {id:'adulto-marron', name:'Marrón', group:'adulto', order:6, color:'var(--belt-marron)', minMonths:12, classesRequired:48, kyu:true},
  {id:'adulto-dan1', name:'Negro 1º Dan', group:'adulto', order:7, color:'var(--belt-negro)', tip:'var(--belt-amarillo)', tipCount:1, minMonths:18, classesRequired:60},
  {id:'adulto-dan2', name:'Negro 2º Dan', group:'adulto', order:8, color:'var(--belt-negro)', tip:'var(--belt-amarillo)', tipCount:2, minMonths:24, classesRequired:80},
  {id:'adulto-dan3', name:'Negro 3º Dan', group:'adulto', order:9, color:'var(--belt-negro)', tip:'var(--belt-amarillo)', tipCount:3, minMonths:36, classesRequired:100},
  {id:'adulto-dan4', name:'Negro 4º Dan', group:'adulto', order:10, color:'var(--belt-negro)', tip:'var(--belt-amarillo)', tipCount:4, minMonths:48, classesRequired:120},
  {id:'adulto-dan5', name:'Negro 5º Dan', group:'adulto', order:11, color:'var(--belt-negro)', tip:'var(--belt-amarillo)', tipCount:5, minMonths:60, classesRequired:140},
  {id:'adulto-dan6', name:'6º Dan', group:'adulto', order:12, color:'var(--belt-rojo)', tip:'var(--belt-blanco)', minMonths:72, classesRequired:200},
  {id:'adulto-dan7', name:'7º Dan', group:'adulto', order:13, color:'var(--belt-rojo)', tip:'var(--belt-blanco)', minMonths:84, classesRequired:220},
  {id:'adulto-dan8', name:'8º Dan', group:'adulto', order:14, color:'var(--belt-rojo)', tip:'var(--belt-blanco)', minMonths:96, classesRequired:240},
  {id:'adulto-dan9', name:'9º Dan', group:'adulto', order:15, color:'var(--belt-rojo)', minMonths:120, classesRequired:260},
  {id:'adulto-dan10', name:'10º Dan', group:'adulto', order:16, color:'var(--belt-rojo)', minMonths:144, classesRequired:280},
];
function beltById(id){ return belts.find(b=>b.id===id); }
function beltsForGroup(group){ return belts.filter(b=>b.group===group).sort((a,b)=>a.order-b.order); }
function beltIndexInGroup(id, group){ return beltsForGroup(group).findIndex(b=>b.id===id); }
let beltDotSeq = 0;
function beltDotHtml(belt, extraClass){
  const cls = 'belt-dot' + (extraClass ? ' '+extraClass : '');
  if(!belt) return `<span class="${cls}" style="background:#ccc"></span>`;
  if(!belt.tip){
    return `<span class="${cls}" style="background:${belt.color}"></span>`;
  }
  const uid = 'bd'+(beltDotSeq++);
  const stripes = belt.tipCount || 1;
  let bands = '';
  for(let i=0;i<stripes;i++){
    bands += `<rect x="0" y="${88 - i*15}" width="100" height="9" fill="${belt.tip}"/>`;
  }
  return `<svg viewBox="0 0 100 100" class="${cls}" style="border-radius:50%;">
    <defs><clipPath id="${uid}"><circle cx="50" cy="50" r="48"/></clipPath></defs>
    <g clip-path="url(#${uid})">
      <rect width="100" height="100" fill="${belt.color}"/>
      ${bands}
    </g>
    <circle cx="50" cy="50" r="47" fill="none" stroke="rgba(0,0,0,0.18)" stroke-width="3"/>
  </svg>`;
}
function beltOptionsHtml(group, selectedId){
  return beltsForGroup(group).map(b=>`<option value="${b.id}" ${b.id===selectedId?'selected':''}>${b.name}</option>`).join('');
}

const dojos = [ {id:'central', name:'Dojo Central'}, {id:'norte', name:'Dojo Norte'} ];
function dojoName(id){ return (dojos.find(d=>d.id===id)||{}).name || '—'; }

const programs = {
  'infantil-blanco': ['Postura básica (kiba dachi, zenkutsu dachi)', 'Golpe de puño: choku zuki', 'Bloqueo: gedan barai', 'Disciplina y saludo en el dojo'],
  'infantil-blanco-celeste': ['Repaso de posturas básicas', 'Coordinación de golpe y bloqueo', 'Conteo en japonés del 1 al 10', 'Kata: Taikyoku Shodan (introducción)'],
  'infantil-celeste': ['Patada frontal: mae geri', 'Bloqueo alto: age uke', 'Trabajo en pareja simple', 'Kata: Taikyoku Shodan'],
  'infantil-celeste-amarilla': ['Combinaciones de puño y patada', 'Equilibrio y caídas básicas', 'Kata: Pinan Shodan (introducción)'],
  'infantil-amarillo': ['Patada lateral: yoko geri', 'Bloqueo circular: uchi uke', 'Kata: Pinan Shodan'],
  'infantil-amarillo-naranja': ['Combinaciones de 3 movimientos', 'Trabajo de distancia (maai)', 'Kata: Pinan Nidan (introducción)'],
  'infantil-naranja': ['Patada circular: mawashi geri', 'Introducción a kumite acordado', 'Kata: Pinan Nidan'],
  'infantil-verde': ['Combinaciones de mano y pierna', 'Kumite acordado', 'Kata: Pinan Sandan'],
  'infantil-azul': ['Barridos básicos: ashi barai', 'Kumite semi-libre supervisado', 'Kata: Pinan Yondan'],
  'infantil-marron': ['Preparación para negro junior', 'Ayudantía en clases de blancos', 'Kata: Pinan Godan'],
  'infantil-negro-junior': ['Perfeccionamiento de katas de Pinan', 'Primeras nociones de bunkai', 'Kata: Naihanchi Shodan'],

  'adulto-blanco': ['Postura básica (kiba dachi, zenkutsu dachi)', 'Golpes de puño: choku zuki', 'Bloqueo: gedan barai', 'Kata: Taikyoku Shodan'],
  'adulto-amarillo': ['Patada frontal: mae geri', 'Bloqueo alto: age uke', 'Combinaciones de 3 movimientos', 'Kata: Pinan Shodan'],
  'adulto-naranja': ['Patada lateral: yoko geri', 'Bloqueo circular: uchi uke', 'Trabajo de distancia (maai)', 'Kata: Pinan Nidan'],
  'adulto-verde': ['Patada circular: mawashi geri', 'Combinaciones de mano y pierna', 'Introducción a kumite acordado', 'Kata: Pinan Sandan'],
  'adulto-azul': ['Barridos básicos: ashi barai', 'Contraataques en kumite', 'Trabajo de kata a doble velocidad', 'Kata: Pinan Yondan'],
  'adulto-marron': ['Preparación de examen a negro', 'Kumite libre controlado', 'Defensa personal básica', 'Kata: Pinan Godan'],
  'adulto-dan1': ['Perfeccionamiento de katas superiores', 'Enseñanza asistida de clase', 'Bunkai del Pinan Godan', 'Kata: Naihanchi Shodan'],
  'adulto-dan2': ['Profundización de bunkai', 'Asistencia de clase con mayor autonomía', 'Kata: Kusanku'],
  'adulto-dan3': ['Introducción a kobudo (armas tradicionales)', 'Formación pedagógica básica', 'Kata: Chinto'],
  'adulto-dan4': ['Formación de instructores', 'Preparación de mesas de examen de grados inferiores', 'Kata avanzado a elección'],
  'adulto-dan5': ['Investigación de kata y aplicación (bunkai avanzado)', 'Dirección de clase propia', 'Kata avanzado a elección'],
  'adulto-dan6': ['Rol de asesoramiento técnico del dojo', 'Transmisión de la tradición e historia del estilo', 'Evaluación de exámenes de grados inferiores'],
  'adulto-dan7': ['Rol de asesoramiento técnico del dojo', 'Transmisión de la tradición e historia del estilo', 'Evaluación de exámenes de grados inferiores'],
  'adulto-dan8': ['Rol de asesoramiento técnico del dojo', 'Transmisión de la tradición e historia del estilo', 'Evaluación de exámenes de grados inferiores'],
  'adulto-dan9': ['Máxima autoridad técnica y honorífica del estilo'],
  'adulto-dan10': ['Máxima autoridad técnica y honorífica del estilo'],
};

let adminAccount = {username:'sensei', passwordHash:'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'}; // hash SHA-256 — la contraseña nunca se guarda en texto plano
let students = [
  {id:1, name:'Martina Suárez', belt:'adulto-verde', since:'2023-03-01', birth:'1998-04-12', familyGroup:'', phone:'5493610000001', guardian:'', group:'adulto', dojo:'central', status:'activo', isInstructor:false, scholarship:{active:false, amount:0}, activities:[{id:'a1', type:'examen', activity:'Examen de 3º Kyu', date:'2023-02-20', place:'Dojo Central', instructor:'', notes:'', belt:'adulto-verde', result:'aprobado'}], dni:'30111222', username:'martina.suarez', passwordHash:'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', enabledModules:['mi-programa','mis-cuotas','mi-asistencia','biblioteca','foro','inscripcion']},
  {id:2, name:'Lucas Ferreyra', belt:'infantil-amarillo-naranja', since:'2024-08-10', birth:'2016-10-03', familyGroup:'', phone:'5493610000002', guardian:'Silvina Ferreyra', group:'infantil', dojo:'central', status:'activo', isInstructor:false, scholarship:{active:false, amount:0}, activities:[{id:'a1', type:'examen', activity:'Examen de 5º Kyu', date:'2024-08-03', place:'Dojo Central', instructor:'', notes:'', belt:'infantil-amarillo-naranja', result:'aprobado'}], dni:'45222333', username:'lucas.ferreyra', passwordHash:'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', enabledModules:['mi-programa','mis-cuotas','mi-asistencia','biblioteca','foro','inscripcion']},
  {id:3, name:'Iván Castro', belt:'adulto-dan1', since:'2019-02-15', birth:'1990-11-30', familyGroup:'', phone:'5493610000003', guardian:'', group:'adulto', dojo:'norte', status:'activo', isInstructor:true, scholarship:{active:false, amount:0}, activities:[], dni:'28333444', username:'ivan.castro', passwordHash:'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', enabledModules:['mi-programa','mis-cuotas','mi-asistencia','asistencia','pagos','biblioteca','foro','inscripcion'], modulePerms:{biblioteca:'write',asistencia:'write',pagos:'write',programas:'read',cinturones:'read'}},
  {id:4, name:'Sofía Aguirre', belt:'infantil-blanco', since:'2025-06-02', birth:'2018-10-08', familyGroup:'', phone:'5493610000004', guardian:'Pablo Aguirre', group:'infantil', dojo:'central', status:'activo', isInstructor:false, scholarship:{active:true, amount:6000}, activities:[], dni:'46444555', username:'sofia.aguirre', passwordHash:'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', enabledModules:['mi-programa','mis-cuotas','mi-asistencia','biblioteca','foro','inscripcion']},
  {id:5, name:'Bruno Medina', belt:'adulto-azul', since:'2022-11-20', birth:'1995-07-22', familyGroup:'', phone:'5493610000005', guardian:'', group:'adulto', dojo:'norte', status:'suspendido', isInstructor:false, scholarship:{active:false, amount:0}, activities:[], dni:'27555666', username:'bruno.medina', passwordHash:'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', enabledModules:['mi-programa','mis-cuotas','mi-asistencia','biblioteca','foro','inscripcion']},
  {id:6, name:'Camila Rojas', belt:'infantil-naranja', since:'2024-01-18', birth:'2017-10-15', familyGroup:'', phone:'5493610000006', guardian:'Marcela Rojas', group:'infantil', dojo:'norte', status:'activo', isInstructor:false, scholarship:{active:false, amount:0}, activities:[{id:'a1', type:'examen', activity:'Examen de 4º Kyu', date:'2024-01-10', place:'Dojo Norte', instructor:'', notes:'', belt:'infantil-naranja', result:'aprobado'},{id:'a2', type:'examen', activity:'Examen de 4º Kyu', date:'2023-11-05', place:'Dojo Norte', instructor:'', notes:'A mejorar: mawashi geri.', belt:'infantil-naranja', result:'no aprobado'}], dni:'44666777', username:'camila.rojas', passwordHash:'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', enabledModules:['mi-programa','mis-cuotas','mi-asistencia','biblioteca','foro','inscripcion']},
  {id:7, name:'Prof. Yamila Ortiz', belt:'adulto-dan3', since:'2015-05-01', birth:'1985-03-10', familyGroup:'', phone:'5493610000007', guardian:'', group:'adulto', dojo:'norte', status:'activo', isInstructor:true, scholarship:{active:false, amount:0}, activities:[], dni:'25777888', username:'yamila.ortiz', passwordHash:'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', enabledModules:['mi-programa','mis-cuotas','mi-asistencia','asistencia','pagos','biblioteca','foro','inscripcion'], modulePerms:{biblioteca:'write',asistencia:'write',pagos:'write',programas:'read',cinturones:'read'}},
];
let nextStudentId = 8;
let nextActivityId = 100;

let feeConfig = { cuotaAdulto:15000, cuotaInfantil:12000, examBoard:20000, belt:8000 };
const defaultHeroPhoto = "__IMG__";
let homeContent = {
  heroTitle: 'Karate-Do Shorin-ryu (Kobayashi-ryu) y Kobudo',
  heroLead: 'Clases para adultos e infantiles en Dojo Central y Dojo Norte. Disciplina, tradición y comunidad, cinturón a cinturón.',
  nosotrosDesc: 'Shuri-te Kan enseña Karate-Do Shorin-ryu (rama Kobayashi) y Kobudo, con clases separadas para adultos e infantiles en nuestros dos dojos. El programa avanza por examen de cinturón, con un cuerpo de instructores que acompaña cada etapa.',
  showActivities: true,
  showFilosofia: true,
  filosofiaText: 'Respeto: hacia el dojo, los instructores y compañeros.\nDisciplina: constancia en la práctica, dentro y fuera del tatami.\nPerseverancia: cada cinturón se gana con esfuerzo sostenido, no con atajos.\nHumildad: el aprendizaje no termina nunca, ni siquiera en el cinturón negro.\nEspíritu de superación: buscar ser mejor que uno mismo, no mejor que los demás.',
  heroPhoto: null,
  showVideo: false,
  videoUrl: ''
};
let schoolLogo = "__IMG__"; // dataURL — logo real del dojo, reemplazable desde Configuración

let payments = [
  {id:'p1', studentId:1, period:'Septiembre 2026', concept:'Cuota mensual', amount:15000, status:'pendiente'},
  {id:'p2', studentId:2, period:'Septiembre 2026', concept:'Cuota mensual', amount:12000, status:'pagada', paidOn:'2026-09-03', method:'Transferencia', medium:'Electrónico'},
  {id:'p3', studentId:3, period:'Septiembre 2026', concept:'Cuota mensual', amount:15000, status:'pendiente'},
  {id:'p4', studentId:4, period:'Septiembre 2026', concept:'Cuota mensual (becada)', amount:6000, status:'pagada', paidOn:'2026-09-05', method:'Efectivo', medium:'Físico'},
  {id:'p5', studentId:5, period:'Septiembre 2026', concept:'Cuota mensual', amount:15000, status:'pendiente'},
  {id:'p6', studentId:6, period:'Septiembre 2026', concept:'Cuota mensual', amount:13000, status:'pagada', paidOn:'2026-09-02', method:'Mercado Pago', medium:'Electrónico'},
  {id:'p7', studentId:1, period:'Agosto 2026', concept:'Cuota mensual', amount:15000, status:'pagada', paidOn:'2026-08-04', method:'Efectivo', medium:'Físico'},
  {id:'p8', studentId:3, period:'Septiembre 2026', concept:'Mesa de examen', amount:20000, status:'revision', proofMedium:'Mercado Pago', proofNote:'Transferí desde la cuenta de mi mamá.'},
];
let nextPaymentId = 9;

const expenseCategories = ['Alquiler', 'Material', 'Certificados de cinturón', 'Otro'];
let expenses = [
  {id:'g1', category:'Alquiler', concept:'Alquiler del salón — Septiembre 2026', amount:180000, date:'2026-09-01', status:'pendiente'},
  {id:'g2', category:'Alquiler', concept:'Alquiler del salón — Agosto 2026', amount:175000, date:'2026-08-01', status:'pagado', paidOn:'2026-08-01'},
  {id:'g3', category:'Alquiler', concept:'Alquiler del salón — Julio 2026', amount:175000, date:'2026-07-01', status:'pagado', paidOn:'2026-07-01'},
  {id:'g4', category:'Material', concept:'Compra de protectores y petos', amount:45000, date:'2026-09-10', status:'pagado', paidOn:'2026-09-10'},
  {id:'g5', category:'Certificados de cinturón', concept:'Certificados — mesa de examen de septiembre', amount:12000, date:'2026-09-15', status:'pendiente'},
];
let nextExpenseId = 6;

let schedule = [
  {day:'Lun', details:'Infantiles · Dojo Central 18:00 – 19:00'},
  {day:'Lun', details:'Adultos · Dojo Central 19:15 – 20:45'},
  {day:'Mar', details:'Infantiles · Dojo Norte 18:00 – 19:00'},
  {day:'Mié', details:'Adultos · Dojo Central 19:15 – 20:45'},
  {day:'Vie', details:'Clase general · Dojo Norte 18:30 – 20:00'},
];

const eventTypeLabels = {examen:'Mesa de examen', torneo:'Torneo', seminario:'Seminario', actividad:'Actividad extra'};
let events = [
  {id:'e1', type:'examen', title:'Mesa de examen — Verde a Azul y Marrón a Negro', date:'2026-09-27', notes:''},
  {id:'e2', type:'seminario', title:'Seminario de Bunkai con invitado especial', date:'2026-10-04', notes:'Cupo limitado, avisar asistencia con anticipación.'},
  {id:'e3', type:'actividad', title:'Entrenamiento conjunto Dojo Central + Dojo Norte', date:'2026-09-30', notes:''},
  {id:'e4', type:'torneo', title:'Torneo Regional de Karate-Do', date:'2026-10-18', notes:'Categorías kata y kumite, inscripción previa.'},
];
let nextEventId = 5;

let attendanceHistory = {
  1: ['2026-09-01','2026-09-03','2026-09-08','2026-09-10'],
  2: ['2026-09-01','2026-09-08','2026-09-10'],
  3: ['2026-09-03','2026-09-08'],
  4: ['2026-09-01','2026-09-03','2026-09-08','2026-09-10'],
  5: ['2026-09-01','2026-09-10'],
  6: ['2026-09-01','2026-09-03','2026-09-08'],
  7: ['2026-09-01','2026-09-03','2026-09-08','2026-09-10'],
};
let todaysAttendance = new Set();

let pendingInscriptions = [
  {id:'i1', name:'Tomás Ibáñez', birth:'2016-04-11', group:'infantil', dojo:'central', phone:'5493610000099', guardian:'Ana Ibáñez', notes:'Sin condiciones médicas.'},
];
let nextInscId = 2;

let libraryGlossary = [
  {id:'g1', term:'Kata', def:'Secuencia formal y preestablecida de técnicas, practicada individualmente contra adversarios imaginarios.'},
  {id:'g2', term:'Kumite', def:'Combate o práctica de técnicas con un compañero, de forma acordada o libre según el nivel.'},
  {id:'g3', term:'Bunkai', def:'Análisis e interpretación práctica de las aplicaciones de movimientos de un kata.'},
  {id:'g4', term:'Maai', def:'Distancia y tiempo correctos entre dos practicantes durante un intercambio.'},
];
let nextGlossaryId = 5;
let libraryLinks = [
  {id:'l1', title:'Taikyoku Shodan — ejecución paso a paso', url:'https://youtube.com/', type:'video', desc:''},
  {id:'l2', title:'Reglamento de la federación', url:'https://example.org/', type:'link', desc:''},
];
let nextLinkId = 3;

let forumPosts = [
  {id:'f1', author:'Martina Suárez', role:'Alumno', text:'¿Alguien tiene el video de la clase del sábado? Quiero repasar el kata para el examen.', date:'2026-09-15'},
  {id:'f2', author:'Prof. Diego Peralta', role:'Instructor', text:'Recuerden traer protector bucal para las prácticas de kumite de esta semana.', date:'2026-09-16'},
];
let nextForumId = 3;
let announcements = [
  {id:'an1', title:'Receso de vacaciones de invierno', body:'No hay clases del 14 al 25 de julio. Retomamos el lunes 28 con el horario habitual.', date:'2026-07-01'},
];
let nextAnnouncementId = 2;

let currentRole = 'alumno';
let currentStudentId = 1;
let currentInstructorStudentId = 3;

/* ============================================================
   LOGIN
============================================================ */
function refreshLoginSelects(){
  const senpaiList = document.getElementById('senpai-usernames');
  senpaiList.innerHTML = students.map(s=>`<option value="${s.username}">${s.name}${s.isInstructor?' · Instructor':''}</option>`).join('');
  const senseiList = document.getElementById('sensei-usernames');
  senseiList.innerHTML = `<option value="${adminAccount.username}">Sensei</option>`;
}
refreshLoginSelects();

function setLoginRole(role){
  currentRole = role;
  document.getElementById('tab-admin').classList.toggle('active', role==='admin');
  document.getElementById('tab-alumno').classList.toggle('active', role==='alumno');
  document.getElementById('login-field-admin').classList.toggle('hidden', role!=='admin');
  document.getElementById('login-field-alumno').classList.toggle('hidden', role!=='alumno');
  document.getElementById('login-error').style.display = 'none';
}

async function login(){
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';
  const btn = document.getElementById('login-btn');
  btn.disabled = true; const prevLabel = btn.textContent; btn.textContent = 'Verificando…';
  try{
    if(currentRole==='admin'){
      const user = document.getElementById('sensei-username').value.trim();
      const pass = document.getElementById('sensei-password').value;
      const hash = await sha256Hex(pass);
      if(user!==adminAccount.username || hash!==adminAccount.passwordHash){
        errEl.textContent = 'Usuario o contraseña incorrectos.'; errEl.style.display='block'; return;
      }
    } else {
      const user = document.getElementById('senpai-username').value.trim();
      const pass = document.getElementById('senpai-password').value;
      const s = students.find(x=>x.username===user);
      if(!s){ errEl.textContent = 'Usuario o contraseña incorrectos.'; errEl.style.display='block'; return; }
      const hash = await sha256Hex(pass);
      if(hash!==s.passwordHash){ errEl.textContent = 'Usuario o contraseña incorrectos.'; errEl.style.display='block'; return; }
      if(s.status!=='activo'){ errEl.textContent = 'Este usuario está suspendido. Consultá con el Sensei.'; errEl.style.display='block'; return; }
      currentRole = s.isInstructor ? 'instructor' : 'alumno';
      currentStudentId = s.id;
      currentInstructorStudentId = s.id;
    }
    document.getElementById('login-screen').style.display='none';
    document.getElementById('app-shell').style.display='block';
    renderShell();
  } finally {
    btn.disabled = false; btn.textContent = prevLabel;
  }
}
function logout(){
  document.getElementById('app-shell').style.display='none';
  document.getElementById('login-screen').style.display='flex';
  document.getElementById('senpai-password').value = '';
  document.getElementById('sensei-password').value = '';
  todaysAttendance = new Set();
  updateFab();
}
function updateFab(){
  const fab = document.getElementById('fab-attendance');
  if(!fab) return;
  const loggedIn = getComputedStyle(document.getElementById('app-shell')).display !== 'none';
  const canTake = currentRole==='admin' || (currentRole==='instructor' && canWriteModule('asistencia'));
  fab.classList.toggle('show', loggedIn && canTake);
}
function openChangePasswordModal(){
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Cambiar mi contraseña</h3>
    <div class="field"><label>Contraseña actual</label><input type="password" id="cp-current" autocomplete="off"></div>
    <div class="field"><label>Nueva contraseña</label><input type="password" id="cp-new" autocomplete="off"></div>
    <div class="field"><label>Confirmar nueva contraseña</label><input type="password" id="cp-confirm" autocomplete="off"></div>
    <p class="hint">Se guarda siempre encriptada (hash SHA-256), nunca en texto plano.</p>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-dark" onclick="saveChangePassword()">Guardar</button>
    </div>
  `);
}
async function saveChangePassword(){
  const current = document.getElementById('cp-current').value;
  const next = document.getElementById('cp-new').value;
  const confirmVal = document.getElementById('cp-confirm').value;
  if(!current || !next){ toast('Completá todos los campos.'); return; }
  if(next!==confirmVal){ toast('La nueva contraseña no coincide con la confirmación.'); return; }
  const account = currentRole==='admin' ? adminAccount : activeStudent();
  const currentHash = await sha256Hex(current);
  if(currentHash !== account.passwordHash){ toast('La contraseña actual no es correcta.'); return; }
  account.passwordHash = await sha256Hex(next);
  closeModal();
  toast('Contraseña actualizada.');
}
function openForgotPassword(){
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Recuperar contraseña</h3>
    <p class="hint" style="margin-top:0">Verificamos tu identidad con tu usuario y tu DNI.</p>
    <div class="field"><label>Usuario</label><input type="text" id="fp-username" autocomplete="off"></div>
    <div class="field"><label>DNI</label><input type="text" id="fp-dni" autocomplete="off"></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-dark" onclick="verifyForgotPassword()">Continuar</button>
    </div>
  `);
}
function verifyForgotPassword(){
  const username = document.getElementById('fp-username').value.trim();
  const dni = document.getElementById('fp-dni').value.trim();
  const s = students.find(x=>x.username===username);
  if(!s || !s.dni || s.dni!==dni){ toast('No encontramos un alumno con ese usuario y DNI.'); return; }
  if(s.status!=='activo'){ toast('Este usuario está suspendido. Consultá con el Sensei.'); return; }
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Nueva contraseña</h3>
    <p class="hint" style="margin-top:0">Para ${esc(s.name)}.</p>
    <div class="field"><label>Nueva contraseña</label><input type="password" id="fp-new" autocomplete="off"></div>
    <div class="field"><label>Repetila</label><input type="password" id="fp-confirm" autocomplete="off"></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-dark" onclick="confirmForgotPassword(${s.id})">Guardar contraseña</button>
    </div>
  `);
}
async function confirmForgotPassword(id){
  const next = document.getElementById('fp-new').value;
  const confirmVal = document.getElementById('fp-confirm').value;
  if(!next){ toast('Escribí una contraseña.'); return; }
  if(next!==confirmVal){ toast('Las contraseñas no coinciden.'); return; }
  const s = students.find(x=>x.id===id);
  s.passwordHash = await sha256Hex(next);
  closeModal();
  toast('Contraseña actualizada. Ya podés iniciar sesión.');
}
function openResetPasswordModal(id){
  const s = students.find(x=>x.id===id);
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Restablecer contraseña</h3>
    <p style="font-size:13.5px;color:var(--ink-soft);line-height:1.6;">
      Para <strong>${s.name}</strong> (usuario: ${s.username}). Su contraseña actual dejará de funcionar.
    </p>
    <div class="field"><label>Nueva contraseña</label><input type="text" id="rp-new" placeholder="Dejá vacío para generar una automática"></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-dark" onclick="confirmResetPassword(${id})">Restablecer</button>
    </div>
  `);
}
async function confirmResetPassword(id){
  const s = students.find(x=>x.id===id);
  const typed = document.getElementById('rp-new').value.trim();
  const temp = typed || randomTempPassword();
  s.passwordHash = await sha256Hex(temp);
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Contraseña restablecida</h3>
    <p style="font-size:13.5px;color:var(--ink-soft);line-height:1.6;">
      Nueva contraseña para <strong>${s.name}</strong> (usuario: <strong>${s.username}</strong>):
    </p>
    <p style="font-size:22px;font-weight:700;text-align:center;letter-spacing:.04em;background:var(--paper);border:1px solid var(--rule);border-radius:var(--radius);padding:14px;margin:10px 0;">${temp}</p>
    <p class="hint">Comunicásela por un medio seguro. No queda guardada en ningún lado — solo se muestra esta vez.</p>
    <div class="modal-actions">
      <button class="btn btn-dark" onclick="closeModal()">Listo</button>
    </div>
  `);
}

/* ============================================================
   BRANDING (logo)
============================================================ */
function brandInnerHTML(){
  if(schoolLogo) return `<img src="${schoolLogo}" alt="Logo"><span>SHURI-TE KAN</span>`;
  return `<div class="dot"></div><span>SHORIN-RYU · SHURI-TE KAN</span>`;
}
function refreshBranding(){
  const lb = document.getElementById('login-brandmark'); if(lb) lb.innerHTML = brandInnerHTML();
  const sb = document.querySelector('.sidebar .brand');
  if(sb) sb.innerHTML = schoolLogo ? `<img src="${schoolLogo}" style="height:26px;max-width:150px;object-fit:contain">` : `<div class="dot"></div><span>Shuri-te Kan</span>`;
}
refreshBranding();

/* ============================================================
   SHELL / NAV
============================================================ */
const adminNav = [
  {id:'resumen', label:'Resumen'},
  {id:'alumnos', label:'Alumnos'},
  {id:'asistencia', label:'Asistencia'},
  {id:'pagos', label:'Cuotas y pagos'},
  {id:'alquiler', label:'Gastos'},
  {id:'programas', label:'Programas'},
  {id:'cinturones', label:'Cinturones'},
  {id:'cronograma', label:'Cronograma y actividades'},
  {id:'diplomas', label:'Diplomas'},
  {id:'biblioteca', label:'Biblioteca'},
  {id:'foro', label:'Foro'},
  {id:'inscripcion', label:'Ficha de inscripción'},
  {id:'configuracion', label:'Configuración'},
];
const instructorNav = [
  {id:'mi-programa', label:'Mi programa'},
  {id:'mis-cuotas', label:'Mis cuotas'},
  {id:'mi-asistencia', label:'Mi asistencia'},
  {id:'asistencia', label:'Asistencia'},
  {id:'pagos', label:'Cuotas y pagos'},
  {id:'biblioteca', label:'Biblioteca'},
  {id:'foro', label:'Foro'},
  {id:'inscripcion', label:'Ficha de inscripción'},
];
const alumnoNav = [
  {id:'mi-programa', label:'Mi programa'},
  {id:'mis-cuotas', label:'Mis cuotas'},
  {id:'mi-asistencia', label:'Mi asistencia'},
  {id:'biblioteca', label:'Biblioteca'},
  {id:'foro', label:'Foro'},
  {id:'inscripcion', label:'Ficha de inscripción'},
];
const grantableModules = instructorNav.concat([
  {id:'programas', label:'Programas'},
  {id:'cinturones', label:'Cinturones'},
]);
const permModuleLabels = {biblioteca:'Biblioteca', asistencia:'Asistencia', pagos:'Cuotas y pagos', programas:'Programas', cinturones:'Cinturones'};
function modulePerm(moduleId){
  if(currentRole==='admin') return 'write';
  const s = activeStudent();
  if(!s || !s.modulePerms || !s.modulePerms[moduleId]) return 'write';
  return s.modulePerms[moduleId];
}
function canWriteModule(moduleId){ return modulePerm(moduleId)==='write'; }
function activeNav(){
  if(currentRole==='admin') return adminNav;
  const s = activeStudent();
  if(!s || !s.enabledModules) return currentRole==='instructor' ? instructorNav : alumnoNav;
  const filtered = grantableModules.filter(n=>s.enabledModules.includes(n.id));
  return filtered.length ? filtered : (currentRole==='instructor' ? instructorNav : alumnoNav);
}
function activeStudent(){
  if(currentRole==='alumno') return students.find(x=>x.id===currentStudentId);
  if(currentRole==='instructor') return students.find(x=>x.id===currentInstructorStudentId);
  return null;
}

function renderShell(){
  const nav = activeNav();
  const sidebar = document.getElementById('sidebar');
  let who;
  if(currentRole==='admin') who = {name:'Sensei — Administrador', sub:'Todos los dojos'};
  else if(currentRole==='instructor'){ const s = activeStudent(); who = {name:s.name, sub:'Instructor · ' + dojoName(s.dojo)}; }
  else { const s = activeStudent(); who = {name:s.name, sub:'Cinturón ' + beltById(s.belt).name}; }

  sidebar.innerHTML = `
    <div class="brand">${schoolLogo ? `<img src="${schoolLogo}" style="height:26px;max-width:150px;object-fit:contain">` : '<div class="dot"></div><span>Shuri-te Kan</span>'}</div>
    <div class="nav-scroll">${nav.map((n,i)=>`<div class="nav-item ${i===0?'active':''}" data-nav="${n.id}" onclick="showPanel('${n.id}', this)">${n.label}</div>`).join('')}</div>
    <div class="sidebar-foot">
      <div class="who">${who.name}<small>${who.sub}</small></div>
      <button class="logout-link" onclick="openChangePasswordModal()">Cambiar contraseña</button>
      <button class="logout-link" onclick="logout()">Cerrar sesión</button>
    </div>
  `;

  const main = document.getElementById('main');
  main.innerHTML = '<button class="back-menu-btn" onclick="goHome()">‹ Menú principal</button>' + nav.map(n=>`<div class="panel" id="panel-${n.id}"></div>`).join('');
  nav.forEach(n=>renderPanel(n.id));
  document.getElementById('panel-'+nav[0].id).classList.add('active');
  updateFab();
  adjustMainOffset();
}
function adjustMainOffset(){
  const sidebar = document.getElementById('sidebar');
  const main = document.getElementById('main');
  if(!sidebar || !main) return;
  if(window.innerWidth <= 760){
    main.style.marginLeft = '0';
    main.style.paddingTop = (sidebar.offsetHeight + 16) + 'px';
  } else {
    main.style.marginLeft = '230px';
    main.style.paddingTop = '';
  }
}
window.addEventListener('resize', adjustMainOffset);
function goHome(){
  const first = document.querySelector('.nav-item');
  if(!first) return;
  showPanel(first.dataset.nav, first);
  window.scrollTo(0,0);
}
function showPanel(id, el){
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('panel-'+id).classList.add('active');
  if(id==='asistencia') renderAsistenciaPanel();
  if(id==='diplomas') renderDiplomasPanel();
}
function renderPanel(id){
  const map = {
    'resumen': renderResumen, 'alumnos': renderAlumnos, 'pagos': renderPagos,
    'asistencia': renderAsistenciaPanel, 'programas': renderProgramasAdmin,
    'cinturones': renderCinturones, 'cronograma': renderCronograma, 'alquiler': renderAlquiler,
    'inscripcion': renderInscripcionAdmin, 'configuracion': renderConfiguracion, 'diplomas': renderDiplomasPanel,
    'biblioteca': renderBiblioteca, 'foro': renderForo,
    'mi-programa': renderMiPrograma, 'mis-cuotas': renderMisCuotas, 'mi-asistencia': renderMiAsistencia,
  };
  if(map[id]) map[id]();
}
function fmtMoney(n){ return '$' + Number(n).toLocaleString('es-AR'); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function cleanText(s){ return String(s==null?'':s).replace(/[<>"`]/g,'').replace(/\s+/g,' ').trim(); }
function normalizeText(str){
  return (str==null?'':String(str)).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
}
function matchesQuery(query, ...fields){
  const q = normalizeText(query).trim();
  if(!q) return true;
  return fields.some(f=>normalizeText(f).includes(q));
}
function isValidUrl(str){
  try{
    const u = new URL((str||'').trim());
    return u.protocol==='http:' || u.protocol==='https:';
  }catch(e){ return false; }
}
function downloadCsv(filename, headers, rows){
  const csvLines = [headers, ...rows].map(r=>r.map(v=>`"${String(v==null?'':v).replace(/"/g,'""')}"`).join(','));
  const csv = '\uFEFF' + csvLines.join('\r\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function sortArrow(state, col){ return state.col!==col ? ' <span class="sort-hint">⇅</span>' : (state.dir==='asc' ? ' ▲' : ' ▼'); }
function toggleSort(state, col){
  if(state.col===col){ state.dir = state.dir==='asc' ? 'desc' : 'asc'; }
  else { state.col = col; state.dir = 'asc'; }
}
function sortByCol(list, state, keyFn){
  if(!state.col) return list;
  const dir = state.dir==='asc' ? 1 : -1;
  return list.slice().sort((a,b)=>{
    const av = keyFn(a, state.col), bv = keyFn(b, state.col);
    if(typeof av==='number' && typeof bv==='number') return (av-bv)*dir;
    return String(av).localeCompare(String(bv), 'es', {sensitivity:'base'})*dir;
  });
}

/* ============================================================
   SERVICIO CENTRAL DE EXPORTACIÓN: PDF (impresión), TXT, planilla
============================================================ */
function buildPrintHtml({title, periodLabel, headers, rows, studentInfo}){
  const lh = letterheadConfig;
  const logo = schoolLogo ? `<img class="ph-logo ph-logo-${lh.logoSize}" src="${schoolLogo}">` : '';
  const contactBits = [
    lh.show.address && lh.address,
    lh.show.phone && lh.phone && ('Tel: '+lh.phone),
    lh.show.whatsapp && lh.whatsapp && ('WhatsApp: '+lh.whatsapp),
    lh.show.email && lh.email,
    lh.show.website && lh.website,
  ].filter(Boolean).join(' · ');
  return `
    <div class="print-letterhead align-${lh.logoPosition}">
      ${logo}
      <div>
        <div class="ph-name">${lh.dojoName}</div>
        ${lh.show.subtitle && lh.subtitle ? `<div class="ph-subtitle">${lh.subtitle}</div>` : ''}
        ${contactBits ? `<div class="ph-contact">${contactBits}</div>` : ''}
        ${lh.show.social && lh.social ? `<div class="ph-contact">${lh.social}</div>` : ''}
        ${lh.show.extraText && lh.extraText ? `<div class="ph-extra">${lh.extraText}</div>` : ''}
      </div>
    </div>
    <hr class="ph-rule">
    <div class="print-title">${title}</div>
    ${studentInfo ? `<p class="print-meta">${studentInfo}</p>` : ''}
    <p class="print-meta">Período: ${periodLabel || 'Todos los registros'}</p>
    <table class="print-table">
      <thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c==null||c===''?'—':c}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
    <hr class="ph-rule">
    <div class="print-footer">
      ${letterheadConfig.show.instructorName && letterheadConfig.instructorName ? `${letterheadConfig.instructorName}${letterheadConfig.show.instructorGrade && letterheadConfig.instructorGrade ? ' — '+letterheadConfig.instructorGrade : ''}<br>` : ''}
      Generado el ${fmtDateEs(todayIso())}
    </div>
  `;
}
function setPrintPageSize(size, orientation){
  let styleEl = document.getElementById('dynamic-page-size');
  if(!styleEl){
    styleEl = document.createElement('style');
    styleEl.id = 'dynamic-page-size';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = `@page{ size:${size}${orientation?' '+orientation:''}; margin:16mm; }`;
}
function exportAsPdf(report){
  setPrintPageSize('A4');
  document.getElementById('print-area').innerHTML = buildPrintHtml(report);
  closeModal();
  setTimeout(()=>window.print(), 80);
}
function exportAsTxt(report){
  const lines = [
    letterheadConfig.dojoName, report.title,
    'Período: '+(report.periodLabel||'Todos los registros'), '',
    report.headers.join(' | '),
    '-'.repeat(60),
    ...report.rows.map(r=>r.map(c=>c==null?'':c).join(' | ')),
  ];
  const blob = new Blob([lines.join('\r\n')], {type:'text/plain;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = report.filenameBase+'.txt';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  closeModal();
  toast('Archivo de texto descargado.');
}
function exportAsSheet(report){
  downloadCsv(report.filenameBase+'.csv', report.headers, report.rows);
  closeModal();
  toast('Planilla descargada — se abre directo en Excel o Google Sheets (Archivo → Importar).');
}
let __pendingReport = null;
function openExportModal(report){
  __pendingReport = report;
  if(!report.rows.length){ toast('No hay filas para exportar con ese filtro.'); return; }
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Exportar / Descargar</h3>
    <p class="hint" style="margin-top:0">${report.title}${report.periodLabel?' · '+report.periodLabel:''} · ${report.rows.length} fila${report.rows.length===1?'':'s'}.</p>
    <div class="export-choice">
      <button class="btn btn-dark" onclick="exportAsPdf(__pendingReport)">📄 PDF / Imprimir</button>
      <button class="btn" onclick="exportAsTxt(__pendingReport)">📝 Texto (.txt)</button>
      <button class="btn" onclick="exportAsSheet(__pendingReport)">📊 Planilla de cálculo (.csv)</button>
    </div>
  `);
}
async function sha256Hex(text){
  const enc = new TextEncoder().encode(String(text));
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
function slugifyUsername(name){
  return normalizeText(name).replace(/[^a-z0-9\s]/g,'').trim().split(/\s+/).join('.');
}
function generateUniqueUsername(name, excludeId){
  const base = slugifyUsername(name) || 'usuario';
  let candidate = base, n = 2;
  while(students.some(s=>s.id!==excludeId && s.username===candidate)){
    candidate = base + n; n++;
  }
  return candidate;
}
function randomTempPassword(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for(let i=0;i<8;i++) out += chars[Math.floor(Math.random()*chars.length)];
  return out;
}
function fmtDateEs(iso){
  if(!iso) return '';
  const d = new Date(iso+'T00:00:00');
  return d.toLocaleDateString('es-AR', {day:'numeric', month:'short', year:'numeric'}).replace(/\./g,'');
}
function todayIso(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function yearsBetween(fromIso, toIso){
  if(!fromIso || !toIso) return 0;
  const from = new Date(fromIso+'T00:00:00'), to = new Date(toIso+'T00:00:00');
  let years = to.getFullYear() - from.getFullYear();
  const beforeAnniversary = (to.getMonth() < from.getMonth()) || (to.getMonth()===from.getMonth() && to.getDate()<from.getDate());
  if(beforeAnniversary) years--;
  return Math.max(0, years);
}
function groupLabel(g){ return g==='infantil' ? 'Infantil' : 'Adulto'; }

/* ============================================================
   ADMIN · RESUMEN
============================================================ */
function renderResumen(){
  const activos = students.filter(s=>s.status==='activo');
  const pendientes = payments.filter(p=>p.status==='pendiente' && p.period==='Septiembre 2026').length;
  const enRevision = payments.filter(p=>p.status==='revision').length;
  const cobradoMes = payments.filter(p=>p.status==='pagada' && p.period==='Septiembre 2026').reduce((a,p)=>a+p.amount,0);
  const gastadoMes = expenses.filter(e=>e.status==='pagado' && (e.paidOn||'').startsWith('2026-09')).reduce((a,e)=>a+e.amount,0);
  const gastosPendientes = expenses.filter(e=>e.status==='pendiente').reduce((a,e)=>a+e.amount,0);
  const resultado = cobradoMes - gastadoMes;
  const proximoExamen = events.filter(e=>e.type==='examen').sort((a,b)=>a.date.localeCompare(b.date))[0];
  document.getElementById('panel-resumen').innerHTML = `
    <div class="main-head"><div><h1>Resumen</h1><p>Un vistazo rápido antes de empezar la clase.</p></div></div>
    <div class="cards-row">
      <div class="stat-card"><div class="num">${activos.length}</div><div class="lbl">Alumnos activos</div></div>
      <div class="stat-card"><div class="num">${pendientes}</div><div class="lbl">Cuotas pendientes (sep.)</div></div>
      <div class="stat-card"><div class="num">${enRevision}</div><div class="lbl">Comprobantes en revisión</div></div>
      <div class="stat-card"><div class="num">${fmtMoney(cobradoMes)}</div><div class="lbl">Cobrado este mes</div></div>
      <div class="stat-card"><div class="num">${fmtMoney(gastadoMes)}</div><div class="lbl">Gastado este mes</div></div>
      <div class="stat-card" style="border-top-color:${resultado>=0?'var(--ok)':'var(--shu)'};${resultado<0?'background:var(--shu-tint);':''}">
        <div class="num" style="color:${resultado>=0?'var(--ok)':'var(--shu-deep)'}">${resultado>=0?'+':'−'}${fmtMoney(Math.abs(resultado))}</div>
        <div class="lbl">${resultado>=0?'Ganancia':'Pérdida'} del mes</div>
      </div>
      ${gastosPendientes>0 ? `<div class="stat-card"><div class="num">${fmtMoney(gastosPendientes)}</div><div class="lbl">Gastos pendientes de pago</div></div>` : ''}
      <div class="stat-card"><div class="num">${proximoExamen ? fmtDateEs(proximoExamen.date) : '—'}</div><div class="lbl">Próxima mesa de examen</div></div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Alumno</th><th>Cinturón</th><th>Grupo</th><th>Dojo</th></tr></thead>
        <tbody>
          ${activos.slice(0,6).map(s=>`
            <tr><td>${esc(s.name)}</td><td>${beltChip(s.belt)}</td><td>${groupLabel(s.group)}</td><td>${dojoName(s.dojo)}</td></tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <h3 class="serif" style="font-size:15px;margin:24px 0 10px;">Próximos cumpleaños</h3>
    ${upcomingBirthdays().length ? `<div class="home-grid">${upcomingBirthdays().map(u=>`
      <div class="home-card">${avatarHtml(u.s,26)}<strong style="display:inline-block;margin-left:8px;">${esc(u.s.name)}</strong><div class="meta">${u.days===0?'¡Es hoy!':(u.days===1?'Mañana':'En '+u.days+' días')} · ${u.label}</div></div>
    `).join('')}</div>` : '<p style="color:var(--ink-soft);font-size:13.5px;">Nadie cumple años en los próximos 30 días.</p>'}
  `;
}
function upcomingBirthdays(){
  const today = todayIso();
  const [ty,tm,td] = today.split('-').map(Number);
  return students.filter(s=>s.status==='activo' && s.birth).map(s=>{
    const [,bm,bd] = s.birth.split('-').map(Number);
    let next = new Date(ty, bm-1, bd);
    if(next < new Date(ty,tm-1,td)) next = new Date(ty+1, bm-1, bd);
    const days = Math.round((next - new Date(ty,tm-1,td)) / 86400000);
    const age = next.getFullYear() - Number(s.birth.split('-')[0]);
    return {s, days, label: next.toLocaleDateString('es-AR',{day:'numeric',month:'long'}) + ' · cumple ' + age};
  }).filter(u=>u.days<=30).sort((a,b)=>a.days-b.days);
}
function beltChip(beltId){
  const b = beltById(beltId);
  return `<span class="belt-chip">${beltDotHtml(b)}${b.name}</span>`;
}

/* ============================================================
   ADMIN · ALUMNOS
============================================================ */
let alumnosFilter = {group:'', dojo:'', q:''};
function renderAlumnos(){
  document.getElementById('panel-alumnos').innerHTML = `
    <div class="main-head"><div><h1>Alumnos</h1><p>Ficha, cinturón, grupo, dojo, beca e instructores.</p></div>
      <button class="btn btn-dark" onclick="openStudentForm()">+ Nuevo alumno</button>
    </div>
    <div class="toolbar">
      <input class="search" placeholder="Buscar por nombre, teléfono, tutor, grupo o dojo…" oninput="alumnosFilter.q=this.value;paintAlumnos();">
      <div class="filters">
        <select onchange="alumnosFilter.group=this.value;paintAlumnos();">
          <option value="">Todos los grupos</option>
          <option value="adulto">Adulto</option>
          <option value="infantil">Infantil</option>
        </select>
        <select onchange="alumnosFilter.dojo=this.value;paintAlumnos();">
          <option value="">Todos los dojos</option>
          ${dojos.map(d=>`<option value="${d.id}">${d.name}</option>`).join('')}
        </select>
        <button class="btn btn-sm" onclick="openAllActivitiesExport()">Exportar actividades (todos)</button>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Nombre</th><th>Cinturón</th><th>Grupo / Dojo</th><th>Estado</th><th></th></tr></thead>
        <tbody id="alumnos-body"></tbody>
      </table>
    </div>
  `;
  paintAlumnos();
}
function avatarHtml(s, size){
  size = size || 28;
  if(s.photo) return `<img src="${s.photo}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0;">`;
  const initial = (s.name||'?').trim().charAt(0).toUpperCase();
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:var(--shu-tint);color:var(--shu-deep);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${Math.round(size*0.45)}px;flex-shrink:0;">${initial}</div>`;
}
function paintAlumnos(){
  const list = students.filter(s=>
    (!alumnosFilter.group || s.group===alumnosFilter.group) &&
    (!alumnosFilter.dojo || s.dojo===alumnosFilter.dojo) &&
    matchesQuery(alumnosFilter.q, s.name, s.phone, s.guardian, groupLabel(s.group), dojoName(s.dojo))
  );
  if(list.length===0){
    document.getElementById('alumnos-body').innerHTML = `<tr><td colspan="5" class="att-empty">No se encontraron resultados.</td></tr>`;
    return;
  }
  document.getElementById('alumnos-body').innerHTML = list.map(s=>`
    <tr class="${s.status==='suspendido'?'suspended':''}">
      <td><div class="name-cell">${avatarHtml(s)}<span>${s.name}</span></div></td>
      <td>${beltChip(s.belt)}</td>
      <td>${groupLabel(s.group)} · ${dojoName(s.dojo)}</td>
      <td>
        ${s.status==='activo' ? '<span class="tag tag-ok">Activo</span>' : '<span class="tag tag-off">Suspendido</span>'}
        ${s.isInstructor ? '<span class="tag tag-review">Instructor</span>' : ''}
        ${s.scholarship && s.scholarship.active ? '<span class="tag tag-warn">Becado</span>' : ''}
      </td>
      <td>
        <div class="actions-cell">
          <button class="btn-ghost" onclick="openStudentForm(${s.id})">Editar ficha</button>
          <button class="btn-ghost" onclick="openRowMenu(${s.id})">Más ▾</button>
        </div>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="5" style="color:var(--ink-soft)">No hay alumnos que coincidan con el filtro.</td></tr>`;
}
function openRowMenu(id){
  const s = students.find(x=>x.id===id);
  const hasMedInfo = s.allergies || s.emergencyContact || s.emergencyPhone;
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif" style="display:flex;align-items:center;gap:10px;">${avatarHtml(s,32)}${s.name}</h3>
    ${hasMedInfo ? `
    <div class="info-card" style="margin-bottom:16px;">
      <strong>Ficha médica</strong>
      ${s.allergies ? `<p style="margin:6px 0 0">${esc(s.allergies)}</p>` : ''}
      ${(s.emergencyContact||s.emergencyPhone) ? `<p style="margin:6px 0 0">Emergencia: ${esc(s.emergencyContact||'—')}${s.emergencyPhone?' · '+esc(s.emergencyPhone):''}</p>` : ''}
    </div>
    ` : ''}
    <div class="row-menu">
      <button class="btn-ghost" onclick="closeModal();openActivitiesManager(${id})">Registrar actividades</button>
      <button class="btn-ghost" onclick="closeModal();openResetPasswordModal(${id})">Restablecer contraseña</button>
      <button class="btn-ghost" onclick="closeModal();toggleStudentStatus(${id})">${s.status==='activo'?'Suspender':'Reactivar'}</button>
      <button class="btn-ghost" onclick="closeModal();toggleInstructor(${id})">${s.isInstructor?'Quitar instructor':'Marcar instructor'}</button>
      <button class="btn-ghost" onclick="closeModal();openScholarshipModal(${id})">${s.scholarship&&s.scholarship.active?'Editar beca':'Marcar becado'}</button>
      <button class="btn-ghost danger" onclick="closeModal();openDeleteStudentModal(${id})">Eliminar alumno</button>
    </div>
  `);
}
function toggleStudentStatus(id){
  const s = students.find(x=>x.id===id);
  s.status = s.status==='activo' ? 'suspendido' : 'activo';
  paintAlumnos();
  toast(s.status==='activo' ? `${s.name} fue reactivado.` : `${s.name} fue suspendido. Sigue en el sistema, pero no aparece para tomar asistencia.`);
}
function toggleInstructor(id){
  const s = students.find(x=>x.id===id);
  s.isInstructor = !s.isInstructor;
  if(s.isInstructor && s.enabledModules){
    ['asistencia','pagos'].forEach(m=>{ if(!s.enabledModules.includes(m)) s.enabledModules.push(m); });
  }
  refreshLoginSelects();
  paintAlumnos();
  toast(s.isInstructor ? `${s.name} ahora también puede entrar como instructor.` : `${s.name} ya no tiene acceso como instructor.`);
}
function openScholarshipModal(id){
  const s = students.find(x=>x.id===id);
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Beca de ${s.name.split(' ')[0]}</h3>
    <div class="checkline"><input type="checkbox" id="sch-active" ${s.scholarship&&s.scholarship.active?'checked':''}> <label for="sch-active">Alumno becado</label></div>
    <div class="field"><label>Valor diferencial de la cuota</label><input type="text" id="sch-amount" value="${s.scholarship?s.scholarship.amount:0}"></div>
    <p class="hint">Este valor reemplaza al de cuota por defecto cuando se registre su pago mensual.</p>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-dark" onclick="saveScholarship(${id})">Guardar</button>
    </div>
  `);
}
function saveScholarship(id){
  const s = students.find(x=>x.id===id);
  s.scholarship = { active: document.getElementById('sch-active').checked, amount: Math.max(0, parseFloat(document.getElementById('sch-amount').value)||0) };
  closeModal(); paintAlumnos();
  toast('Beca actualizada.');
}
const activityTypes = [
  {id:'examen', label:'Examen rendido'},
  {id:'seminario', label:'Seminario'},
  {id:'exhibicion', label:'Exhibición'},
  {id:'clase_especial', label:'Clase especial'},
  {id:'evento', label:'Evento'},
  {id:'agradecimiento', label:'Agradecimiento'},
  {id:'otros', label:'Otros'},
];
function activityTypeLabel(id){ const t = activityTypes.find(x=>x.id===id); return t ? t.label : id; }
let actFilter = {q:'', type:'', from:'', to:''};
let actSort = {col:'fecha', dir:'desc'};
function filteredActivities(s){
  let list = (s.activities||[]).filter(a=>
    (!actFilter.type || a.type===actFilter.type) &&
    (!actFilter.from || a.date>=actFilter.from) &&
    (!actFilter.to || a.date<=actFilter.to) &&
    matchesQuery(actFilter.q, a.activity, activityTypeLabel(a.type), a.place, a.instructor, a.notes)
  );
  const key = (a, col)=>{
    if(col==='fecha') return a.date;
    if(col==='tipo') return activityTypeLabel(a.type);
    return a.date;
  };
  return sortByCol(list, actSort, key);
}
function actPeriodLabel(){
  const bits = [];
  if(actFilter.from || actFilter.to) bits.push(`Desde: ${actFilter.from?fmtDateEs(actFilter.from):'—'} — Hasta: ${actFilter.to?fmtDateEs(actFilter.to):'—'}`);
  if(actFilter.type) bits.push(activityTypeLabel(actFilter.type));
  if(actFilter.q) bits.push(`Búsqueda: "${actFilter.q}"`);
  return bits.length ? bits.join(' · ') : 'Todos los registros';
}
function activityReportRows(s){
  return filteredActivities(s).map(a=>[fmtDateEs(a.date), a.activity, activityTypeLabel(a.type), a.place||'', a.notes || (a.result ? (a.result==='aprobado'?'Aprobado':'No aprobado') : '')]);
}
function openStudentActivitiesExport(studentId){
  const s = students.find(x=>x.id===studentId);
  const kyu = kyuLabel(beltById(s.belt));
  const gradLabel = kyu ? `${kyu}º Kyu` : beltById(s.belt).name;
  openExportModal({
    title:'Historial de actividades', periodLabel:actPeriodLabel(),
    studentInfo:`Alumno: ${s.name} · Graduación: ${gradLabel}`,
    headers:['Fecha','Actividad','Tipo','Lugar','Observaciones'],
    rows:activityReportRows(s),
    filenameBase:`actividades_${s.name.replace(/\s+/g,'_')}`,
  });
}
function openAllActivitiesExport(){
  const list = students.filter(s=>
    (!alumnosFilter.group || s.group===alumnosFilter.group) &&
    (!alumnosFilter.dojo || s.dojo===alumnosFilter.dojo) &&
    matchesQuery(alumnosFilter.q, s.name, s.phone, s.guardian)
  );
  let rows = [];
  list.forEach(s=>{
    filteredActivities(s).forEach(a=>{
      rows.push([s.name, fmtDateEs(a.date), a.activity, activityTypeLabel(a.type), a.place||'', a.notes || (a.result ? (a.result==='aprobado'?'Aprobado':'No aprobado') : '')]);
    });
  });
  rows.sort((a,b)=>a[1].localeCompare(b[1],'es'));
  openExportModal({
    title:'Registro de actividades', periodLabel:actPeriodLabel(),
    headers:['Alumno','Fecha','Actividad','Tipo','Lugar','Observaciones'],
    rows, filenameBase:'actividades_todos_los_alumnos',
  });
}
function activitiesToolbarHtml(){
  return `
    <div class="toolbar">
      <input class="search" placeholder="Buscar…" value="${esc(actFilter.q)}" oninput="actFilter.q=this.value;refreshActivitiesViews();">
      <div class="filters">
        <select onchange="actFilter.type=this.value;refreshActivitiesViews();">
          <option value="">Todos los tipos</option>
          ${activityTypes.map(t=>`<option value="${t.id}" ${actFilter.type===t.id?'selected':''}>${t.label}</option>`).join('')}
        </select>
        <input type="date" value="${actFilter.from}" onchange="actFilter.from=this.value;refreshActivitiesViews();" title="Desde">
        <input type="date" value="${actFilter.to}" onchange="actFilter.to=this.value;refreshActivitiesViews();" title="Hasta">
      </div>
    </div>
  `;
}
function refreshActivitiesViews(){
  if(document.getElementById('act-manager-body')) paintActivitiesManager(window.__actManagerStudentId);
  if(document.getElementById('act-history-body')) paintMiProgramaActivities();
}
function isDiplomaEligible(a){ return a.type!=='examen' || a.result==='aprobado'; }
let diplomasFilter = {q:'', date:'', type:''};
let diplomasSort = {col:null, dir:'asc'};
function renderDiplomasPanel(){
  document.getElementById('panel-diplomas').innerHTML = `
    <div class="main-head"><div><h1>Diplomas</h1><p>Generá diplomas de graduación y de participación para cualquier alumno, y personalizá cómo se ven.</p></div></div>

    <div class="config-section">
      <h3 class="serif">Configuración de diplomas</h3>
      <div class="grid2">
        <div class="field"><label>Estilo del marco</label>
          <select id="dc-style">
            <option value="clasico" ${diplomaConfig.style==='clasico'?'selected':''}>Clásico — línea doble bermellón</option>
            <option value="okinawa" ${diplomaConfig.style==='okinawa'?'selected':''}>Okinawense — esquinas y tu logo como marca de agua</option>
            <option value="oriental" ${diplomaConfig.style==='oriental'?'selected':''}>Oriental dorado — marco doble rojo y ocre con rombos</option>
            <option value="minimalista" ${diplomaConfig.style==='minimalista'?'selected':''}>Minimalista — línea fina, solo esquinas marcadas</option>
            <option value="imperial" ${diplomaConfig.style==='imperial'?'selected':''}>Imperial — negro y dorado, estilo certificado formal</option>
            <option value="bambu" ${diplomaConfig.style==='bambu'?'selected':''}>Bambú — borde verde con textura de caña</option>
          </select>
        </div>
        <div class="field"><label>Tamaño de papel por defecto</label>
          <select id="dc-paperSize">
            <option value="A4" ${diplomaConfig.paperSize==='A4'?'selected':''}>A4</option>
            <option value="A3" ${diplomaConfig.paperSize==='A3'?'selected':''}>A3</option>
          </select>
        </div>
      </div>
      <div class="field"><label>Título para diplomas de examen</label><input type="text" id="dc-titleExamen" value="${esc(diplomaConfig.titleExamen)}"></div>
      <div class="field"><label>Texto de introducción (todos los diplomas)</label><input type="text" id="dc-introText" value="${esc(diplomaConfig.introText)}"></div>
      <div class="field"><label>Texto del cuerpo — exámenes</label><input type="text" id="dc-bodyExamen" value="${esc(diplomaConfig.bodyExamen)}"></div>
      <div class="field"><label>Texto del cuerpo — otras actividades</label><input type="text" id="dc-bodyGeneral" value="${esc(diplomaConfig.bodyGeneral)}"></div>
      <p style="font-size:12px;font-weight:700;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.06em;margin:14px 0 4px;">Tamaño de letra (en píxeles)</p>
      <div class="checkbox-grid" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr));">
        <div class="field" style="margin-bottom:0"><label>Título</label><input type="number" id="dc-titleSize" value="${diplomaConfig.titleSize}" min="8" max="60"></div>
        <div class="field" style="margin-bottom:0"><label>Nombre</label><input type="number" id="dc-nameSize" value="${diplomaConfig.nameSize}" min="8" max="80"></div>
        <div class="field" style="margin-bottom:0"><label>Cinturón / actividad</label><input type="number" id="dc-gradeSize" value="${diplomaConfig.gradeSize}" min="8" max="60"></div>
        <div class="field" style="margin-bottom:0"><label>Fecha</label><input type="number" id="dc-dateSize" value="${diplomaConfig.dateSize}" min="6" max="40"></div>
        <div class="field" style="margin-bottom:0"><label>Texto general</label><input type="number" id="dc-textSize" value="${diplomaConfig.textSize}" min="6" max="40"></div>
      </div>
      <div class="field" style="display:flex;align-items:center;gap:8px;margin-top:14px;">
        <input type="checkbox" id="dc-showTenure" ${diplomaConfig.showTenure?'checked':''} style="width:auto">
        <label style="margin:0" for="dc-showTenure">Mostrar antigüedad en el dojo (calculada desde la fecha de ingreso del alumno)</label>
      </div>
      <div class="field" style="display:flex;align-items:center;gap:8px;">
        <input type="checkbox" id="dc-showQr" ${diplomaConfig.showQr?'checked':''} style="width:auto">
        <label style="margin:0" for="dc-showQr">Incluir código QR de verificación en la esquina del diploma</label>
      </div>
      <div class="field">
        <label>Firma escaneada (opcional)</label>
        <div class="logo-row">
          <div class="logo-preview" id="dc-signature-preview" style="width:120px;height:50px;">${diplomaConfig.signatureImage?`<img src="${diplomaConfig.signatureImage}" style="width:100%;height:100%;object-fit:contain;">`:'Sin firma'}</div>
          <div>
            <input type="file" accept="image/*" id="dc-signature-input" onchange="onSignatureSelected(this)">
            <div style="margin-top:8px"><button type="button" class="btn-ghost" onclick="clearSignatureImage()">Quitar firma</button></div>
          </div>
        </div>
        <p class="hint" style="margin-top:8px;margin-bottom:0;">Se usa solo cuando el diploma firma el instructor general de la escuela. Si un examen puntual tiene cargado otro examinador, se muestra su nombre sin esta imagen.</p>
      </div>
      <p class="hint">Esto es la plantilla general. Al generar un diploma puntual, también podés editar su texto sin afectar esta configuración.</p>
      <button class="btn btn-dark" onclick="saveDiplomaConfig()">Guardar configuración de diplomas</button>
    </div>

    <h3 class="serif" style="font-size:15px;margin:24px 0 10px;">Generar un diploma</h3>
    <p class="hint" style="margin-top:0">Para uno solo: tocá "Generar" en su fila. Para varios juntos (ej. toda una mesa de examen): tildalos a la izquierda y usá el botón de abajo.</p>
    <div class="toolbar">
      <input class="search" placeholder="Buscar alumno o actividad…" value="${diplomasFilter.q}" oninput="diplomasFilter.q=this.value;paintDiplomasList();">
      <div class="filters">
        <select onchange="diplomasFilter.date=this.value;paintDiplomasList();">
          <option value="">Todas las fechas</option>
          ${[...new Set(allDiplomaEligibleRowsUnfiltered().map(r=>r.a.date))].sort().reverse().map(d=>`<option value="${d}" ${diplomasFilter.date===d?'selected':''}>${fmtDateEs(d)}</option>`).join('')}
        </select>
        <select onchange="diplomasFilter.type=this.value;paintDiplomasList();">
          <option value="">Todos los tipos</option>
          ${[...new Set(allDiplomaEligibleRowsUnfiltered().map(r=>r.a.type))].map(t=>`<option value="${t}" ${diplomasFilter.type===t?'selected':''}>${activityTypeLabel(t)}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-sm btn-dark" id="batch-btn" onclick="openBatchConfirm()" disabled>Generar seleccionados (0)</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th style="width:30px"><input type="checkbox" id="batch-select-all" onchange="toggleSelectAllDiplomas(this.checked)"></th>
          <th class="sortable" onclick="toggleSort(diplomasSort,'alumno');paintDiplomasList();">Alumno${sortArrow(diplomasSort,'alumno')}</th>
          <th class="sortable" onclick="toggleSort(diplomasSort,'fecha');paintDiplomasList();">Fecha${sortArrow(diplomasSort,'fecha')}</th>
          <th>Actividad</th>
          <th class="sortable" onclick="toggleSort(diplomasSort,'tipo');paintDiplomasList();">Tipo${sortArrow(diplomasSort,'tipo')}</th>
          <th></th>
        </tr></thead>
        <tbody id="diplomas-body"></tbody>
      </table>
    </div>

    <h3 class="serif" style="font-size:15px;margin:24px 0 10px;">Certificado sin una actividad registrada</h3>
    <p class="hint" style="margin-top:0">Para un instructor invitado que no es alumno, para agradecer a alguien puntualmente, o para un alumno ya registrado sin tener que cargarle primero una actividad. Si el nombre coincide con un alumno activo, se usa su ficha (foto, antigüedad); si no, se genera igual para esa persona.</p>
    <div class="config-section">
      <div class="field">
        <label>Nombre de la persona</label>
        <input type="text" id="cc-name" list="cc-student-options" placeholder="Elegí un alumno de la lista o escribí otro nombre" autocomplete="off" onchange="onCcNameChange()">
        <datalist id="cc-student-options">${students.map(s=>`<option value="${esc(s.name)}">`).join('')}</datalist>
      </div>
      <div class="grid2">
        <div class="field"><label>Tipo de certificado</label>
          <select id="cc-type" onchange="onCcTypeChange()">
            <option value="examen">Graduación (examen)</option>
            <option value="agradecimiento">Agradecimiento</option>
            <option value="seminario">Seminario</option>
            <option value="exhibicion">Exhibición</option>
            <option value="clase_especial">Clase especial</option>
            <option value="evento">Evento</option>
            <option value="otros">Otros</option>
          </select>
        </div>
        <div class="field"><label>Fecha</label><input type="date" id="cc-date" value="${todayIso()}"></div>
      </div>
      <div class="grid2" id="cc-belt-fields">
        <div class="field"><label>Grupo</label>
          <select id="cc-group" onchange="paintCcBeltOptions()">
            <option value="adulto">Adulto</option>
            <option value="infantil">Infantil</option>
          </select>
        </div>
        <div class="field"><label>Cinturón obtenido</label>
          <select id="cc-belt">${beltsForGroup('adulto').map(b=>`<option value="${b.id}">${esc(b.name)}</option>`).join('')}</select>
        </div>
      </div>
      <div class="field" id="cc-activity-field" style="display:none"><label>Motivo / actividad</label><input type="text" id="cc-activity" placeholder="Ej: Seminario de Kobudo dictado como instructor invitado"></div>
      <div class="field"><label>Lugar (opcional)</label><input type="text" id="cc-place"></div>
      <button class="btn btn-dark" onclick="openCustomCertificate()">Generar certificado</button>
    </div>

    <h3 class="serif" style="font-size:15px;margin:24px 0 10px;">Diplomas emitidos</h3>
    <p class="hint" style="margin-top:0">Se registra cada vez que imprimís o guardás un diploma como PDF. El próximo número a emitir es el <strong>Nº ${String(nextDiplomaNumber).padStart(4,'0')}</strong>.</p>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Nº</th><th>Alumno</th><th>Actividad</th><th>Fecha del diploma</th><th>Emitido el</th></tr></thead>
        <tbody id="diplomas-log"></tbody>
      </table>
    </div>
  `;
  paintDiplomasList();
  paintDiplomasLog();
}
function paintDiplomasLog(){
  const body = document.getElementById('diplomas-log');
  if(!body) return;
  const list = issuedDiplomas.slice().reverse();
  body.innerHTML = list.length ? list.map(d=>`
    <tr>
      <td>${String(d.number).padStart(4,'0')}</td>
      <td>${esc(d.studentName)}</td>
      <td>${esc(d.activity)}</td>
      <td>${fmtDateEs(d.date)}</td>
      <td>${fmtDateEs(d.issuedOn)}</td>
    </tr>
  `).join('') : `<tr><td colspan="5" class="att-empty">Todavía no se emitió ningún diploma.</td></tr>`;
}
function saveDiplomaConfig(){
  diplomaConfig.style = document.getElementById('dc-style').value;
  diplomaConfig.paperSize = document.getElementById('dc-paperSize').value;
  diplomaConfig.titleExamen = document.getElementById('dc-titleExamen').value.trim() || diplomaConfig.titleExamen;
  diplomaConfig.introText = document.getElementById('dc-introText').value.trim() || diplomaConfig.introText;
  diplomaConfig.bodyExamen = document.getElementById('dc-bodyExamen').value.trim() || diplomaConfig.bodyExamen;
  diplomaConfig.bodyGeneral = document.getElementById('dc-bodyGeneral').value.trim() || diplomaConfig.bodyGeneral;
  diplomaConfig.titleSize = parseInt(document.getElementById('dc-titleSize').value) || diplomaConfig.titleSize;
  diplomaConfig.nameSize = parseInt(document.getElementById('dc-nameSize').value) || diplomaConfig.nameSize;
  diplomaConfig.gradeSize = parseInt(document.getElementById('dc-gradeSize').value) || diplomaConfig.gradeSize;
  diplomaConfig.dateSize = parseInt(document.getElementById('dc-dateSize').value) || diplomaConfig.dateSize;
  diplomaConfig.textSize = parseInt(document.getElementById('dc-textSize').value) || diplomaConfig.textSize;
  diplomaConfig.showTenure = document.getElementById('dc-showTenure').checked;
  diplomaConfig.showQr = document.getElementById('dc-showQr').checked;
  toast('Configuración de diplomas actualizada.');
}
function onSignatureSelected(input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e=>{
    diplomaConfig.signatureImage = e.target.result;
    document.getElementById('dc-signature-preview').innerHTML = `<img src="${diplomaConfig.signatureImage}" style="width:100%;height:100%;object-fit:contain;">`;
    toast('Firma actualizada.');
  };
  reader.readAsDataURL(file);
}
function clearSignatureImage(){
  diplomaConfig.signatureImage = null;
  document.getElementById('dc-signature-preview').innerHTML = 'Sin firma';
  toast('Firma eliminada.');
}
function allDiplomaEligibleRowsUnfiltered(){
  let rows = [];
  students.forEach(s=>{
    (s.activities||[]).filter(isDiplomaEligible).forEach(a=>{
      rows.push({studentId:s.id, studentName:s.name, a});
    });
  });
  return rows;
}
function allDiplomaEligibleRows(){
  let rows = allDiplomaEligibleRowsUnfiltered();
  rows = rows.filter(r=>
    matchesQuery(diplomasFilter.q, r.studentName, r.a.activity, activityTypeLabel(r.a.type)) &&
    (!diplomasFilter.date || r.a.date===diplomasFilter.date) &&
    (!diplomasFilter.type || r.a.type===diplomasFilter.type)
  );
  if(diplomasSort.col){
    const key = (r, col) => col==='alumno' ? r.studentName : (col==='tipo' ? activityTypeLabel(r.a.type) : r.a.date);
    return sortByCol(rows, diplomasSort, key);
  }
  rows.sort((x,y)=>y.a.date.localeCompare(x.a.date));
  return rows;
}
let diplomaBatchSelection = new Set();
function paintDiplomasList(){
  const rows = allDiplomaEligibleRows();
  document.getElementById('diplomas-body').innerHTML = rows.length ? rows.map(r=>{
    const key = r.studentId+':'+r.a.id;
    return `
    <tr>
      <td><input type="checkbox" ${diplomaBatchSelection.has(key)?'checked':''} onchange="toggleDiplomaBatch('${key}',this.checked)"></td>
      <td>${esc(r.studentName)}</td>
      <td>${fmtDateEs(r.a.date)}</td>
      <td>${esc(r.a.activity)}</td>
      <td><span class="tag tag-off">${activityTypeLabel(r.a.type)}</span></td>
      <td><button class="btn btn-sm btn-dark" onclick="openDiploma(${r.studentId},'${r.a.id}')">Generar</button></td>
    </tr>
  `;}).join('') : `<tr><td colspan="6" class="att-empty">Todavía no hay actividades con diploma disponible (un examen aprobado, seminario, exhibición, etc.).</td></tr>`;
  updateBatchButton();
}
function updateBatchButton(){
  const btn = document.getElementById('batch-btn');
  if(!btn) return;
  const n = diplomaBatchSelection.size;
  btn.textContent = `Generar seleccionados (${n})`;
  btn.disabled = n===0;
}
function toggleDiplomaBatch(key, checked){
  if(checked) diplomaBatchSelection.add(key); else diplomaBatchSelection.delete(key);
  updateBatchButton();
}
function toggleSelectAllDiplomas(checked){
  const rows = allDiplomaEligibleRows();
  rows.forEach(r=>{
    const key = r.studentId+':'+r.a.id;
    if(checked) diplomaBatchSelection.add(key); else diplomaBatchSelection.delete(key);
  });
  paintDiplomasList();
  updateBatchButton();
}
function openBatchConfirm(){
  const rows = allDiplomaEligibleRows().filter(r=>diplomaBatchSelection.has(r.studentId+':'+r.a.id));
  if(rows.length===0){ toast('Tildá al menos un diploma de la lista para generarlos juntos.'); return; }
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Generar ${rows.length} diploma${rows.length===1?'':'s'}</h3>
    <p class="hint" style="margin-top:0">Se van a imprimir juntos, cada uno en su propia hoja, con la plantilla general de Diplomas (no se pueden editar individualmente en este paso). Se les va a asignar número correlativo a cada uno.</p>
    <div class="row-menu" style="max-height:220px;overflow-y:auto;">
      ${rows.map(r=>`<div style="padding:8px 4px;border-bottom:1px solid var(--rule);font-size:13px;">${esc(r.studentName)} — ${esc(r.a.activity)} (${fmtDateEs(r.a.date)})</div>`).join('')}
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-dark" onclick="generateBatchDiplomas()">Imprimir estos ${rows.length}</button>
    </div>
  `);
}
function generateBatchDiplomas(){
  const rows = allDiplomaEligibleRows().filter(r=>diplomaBatchSelection.has(r.studentId+':'+r.a.id));
  if(rows.length===0){ toast('No se encontraron las actividades seleccionadas.'); closeModal(); return; }
  setPrintPageSize(diplomaConfig.paperSize, 'landscape');
  const issuedOn = todayIso();
  const pages = rows.map((r,i)=>{
    const s = students.find(x=>x.id===r.studentId);
    const number = nextDiplomaNumber++;
    issuedDiplomas.push({number, studentId:r.studentId, studentName:s.name, activity:r.a.activity, type:r.a.type, date:r.a.date, issuedOn});
    const pageBreak = i < rows.length-1 ? 'page-break-after:always;' : '';
    return `<div class="diploma" style="${pageBreak}">${buildDiplomaHtml(s, r.a, {}, number)}</div>`;
  }).join('');
  document.getElementById('print-area').innerHTML = pages;
  renderDiplomaQrCodes(document.getElementById('print-area'));
  diplomaBatchSelection.clear();
  closeModal();
  if(document.getElementById('diplomas-log')) paintDiplomasLog();
  if(document.getElementById('batch-select-all')) document.getElementById('batch-select-all').checked = false;
  updateBatchButton();
  setTimeout(()=>window.print(), 150);
}
function activityRowHtml(a, editable){
  return `<tr>
    <td>${fmtDateEs(a.date)}</td>
    <td>${esc(a.activity)}</td>
    <td><span class="tag tag-off">${activityTypeLabel(a.type)}</span></td>
    <td>${esc(a.place)||'—'}</td>
    <td>${esc(a.notes) || (a.result ? (a.result==='aprobado'?'Aprobado':'No aprobado') : '—')}</td>
    ${editable ? `<td><button class="btn-ghost" onclick="openActivityForm(${a.studentId},'${a.id}')">Editar</button><button class="btn-ghost" onclick="deleteActivity(${a.studentId},'${a.id}')">Eliminar</button></td>` : ''}
  </tr>`;
}
function openActivitiesManager(studentId){
  window.__actManagerStudentId = studentId;
  actFilter = {q:'', type:'', from:'', to:''};
  actSort = {col:'fecha', dir:'desc'};
  const s = students.find(x=>x.id===studentId);
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Actividades de ${s.name}</h3>
    <button class="btn btn-dark" style="margin-bottom:12px" onclick="openActivityForm(${studentId})">+ Agregar actividad</button>
    <button class="btn" style="margin-bottom:12px;margin-left:8px" onclick="openStudentActivitiesExport(${studentId})">Exportar / Descargar</button>
    ${activitiesToolbarHtml()}
    <div class="table-wrap" style="max-height:340px;overflow:auto;">
      <table>
        <thead><tr>
          <th class="sortable" onclick="toggleSort(actSort,'fecha');refreshActivitiesViews();">Fecha${sortArrow(actSort,'fecha')}</th>
          <th>Actividad</th>
          <th class="sortable" onclick="toggleSort(actSort,'tipo');refreshActivitiesViews();">Tipo${sortArrow(actSort,'tipo')}</th>
          <th>Lugar</th><th>Observaciones</th><th></th>
        </tr></thead>
        <tbody id="act-manager-body"></tbody>
      </table>
    </div>
    <div class="modal-actions"><button class="btn btn-dark" onclick="closeModal()">Cerrar</button></div>
  `);
  paintActivitiesManager(studentId);
}
function paintActivitiesManager(studentId){
  const s = students.find(x=>x.id===studentId);
  const list = filteredActivities(s).map(a=>({...a, studentId}));
  document.getElementById('act-manager-body').innerHTML = list.length ? list.map(a=>activityRowHtml(a, true)).join('') : `<tr><td colspan="6" class="att-empty">No se encontraron resultados.</td></tr>`;
}
function openActivityForm(studentId, activityId){
  const s = students.find(x=>x.id===studentId);
  const a = activityId ? s.activities.find(x=>x.id===activityId) : null;
  const list = beltsForGroup(s.group);
  const idx = beltIndexInGroup(s.belt, s.group);
  const nextBelt = list[idx+1];
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">${a?'Editar':'Registrar'} actividad de ${s.name.split(' ')[0]}</h3>
    <div class="field"><label>Tipo de actividad</label>
      <select id="act-type" onchange="onActivityTypeChange()">
        ${activityTypes.map(t=>`<option value="${t.id}" ${(a?a.type:'examen')===t.id?'selected':''}>${t.label}</option>`).join('')}
      </select>
    </div>
    <div id="act-exam-fields" style="display:none">
      <p class="hint" style="margin-top:0">Cinturón actual: ${list[idx].name}${nextBelt ? ' · próximo: '+nextBelt.name : ' · ya alcanzó el grado máximo'}</p>
      <div class="field"><label>Cinturón evaluado</label>
        <select id="act-belt">
          ${list.map((b,i)=>`<option value="${b.id}" ${(a&&a.belt ? a.belt===b.id : (nextBelt?b.id===nextBelt.id:i===idx)) ? 'selected':''}>${b.name}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>Resultado</label>
        <select id="act-result">
          <option value="aprobado" ${a&&a.result==='aprobado'?'selected':''}>Aprobado</option>
          <option value="no aprobado" ${a&&a.result==='no aprobado'?'selected':''}>No aprobado</option>
        </select>
      </div>
      <p class="hint">Si el resultado es "Aprobado", el cinturón evaluado pasa a ser el cinturón actual del alumno.</p>
    </div>
    <div class="field"><label>Nombre o descripción de la actividad</label><input type="text" id="act-title" value="${a?a.activity:''}" placeholder="Ej: Entrenamiento especial con instructor invitado"></div>
    <div class="field"><label>Fecha</label><input type="date" id="act-date" value="${a?a.date:todayIso()}"></div>
    <div class="field"><label>Lugar (opcional)</label><input type="text" id="act-place" value="${a?a.place||'':''}"></div>
    <div class="field"><label>Instructor / organizador (opcional)</label><input type="text" id="act-instructor" value="${a?a.instructor||'':''}"></div>
    <div class="field"><label>Observaciones (opcional)</label><textarea id="act-notes">${a?a.notes||'':''}</textarea></div>
    <div class="modal-actions">
      <button class="btn" onclick="openActivitiesManager(${studentId})">Cancelar</button>
      <button class="btn btn-dark" onclick="saveActivity(${studentId}${activityId?`,'${activityId}'`:''})">Guardar</button>
    </div>
  `);
  onActivityTypeChange();
}
function onActivityTypeChange(){
  const type = document.getElementById('act-type').value;
  document.getElementById('act-exam-fields').style.display = type==='examen' ? 'block' : 'none';
  const titleEl = document.getElementById('act-title');
  if(!titleEl.value || activityTypes.some(t=>t.label===titleEl.value) || /^Examen de /.test(titleEl.value)){
    if(type==='examen'){
      const beltSel = document.getElementById('act-belt');
      const b = beltSel ? beltById(beltSel.value) : null;
      const kyu = b ? kyuLabel(b) : null;
      titleEl.value = b ? `Examen de ${kyu?kyu+'º Kyu':b.name}` : 'Examen rendido';
    } else if(type==='otros'){
      titleEl.value = '';
    } else {
      titleEl.value = activityTypeLabel(type);
    }
  }
}
function saveActivity(studentId, activityId){
  const s = students.find(x=>x.id===studentId);
  const type = document.getElementById('act-type').value;
  const activity = document.getElementById('act-title').value.trim();
  const date = document.getElementById('act-date').value;
  if(!activity){ toast('Escribí el nombre o descripción de la actividad.'); return; }
  if(!date){ toast('Elegí la fecha.'); return; }
  const record = {
    type, activity, date,
    place: document.getElementById('act-place').value.trim(),
    instructor: document.getElementById('act-instructor').value.trim(),
    notes: document.getElementById('act-notes').value.trim(),
  };
  if(type==='examen'){
    record.belt = document.getElementById('act-belt').value;
    record.result = document.getElementById('act-result').value;
    if(record.result==='aprobado'){ s.belt = record.belt; s.since = date; }
  }
  if(!s.activities) s.activities = [];
  if(activityId){
    const existing = s.activities.find(x=>x.id===activityId);
    Object.assign(existing, record);
  } else {
    s.activities.push({id:'a'+(nextActivityId++), ...record});
  }
  paintAlumnos();
  toast(activityId ? 'Actividad actualizada.' : 'Actividad registrada.');
  openActivitiesManager(studentId);
}
function deleteActivity(studentId, activityId){
  const s = students.find(x=>x.id===studentId);
  s.activities = s.activities.filter(x=>x.id!==activityId);
  paintAlumnos();
  toast('Actividad eliminada.');
  paintActivitiesManager(studentId);
}

let pendingStudentPhoto = undefined;
function onStudentPhotoSelected(input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e=>{
    pendingStudentPhoto = e.target.result;
    document.getElementById('sf-photo-preview').innerHTML = `<img src="${pendingStudentPhoto}" style="width:100%;height:100%;object-fit:cover;">`;
  };
  reader.readAsDataURL(file);
}
function clearStudentPhoto(){
  pendingStudentPhoto = null;
  document.getElementById('sf-photo-preview').innerHTML = 'Sin foto';
}
function openStudentForm(id){
  pendingStudentPhoto = undefined;
  const s = id ? students.find(x=>x.id===id) : null;
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">${s ? 'Editar ficha' : 'Nuevo alumno'}</h3>
    <div class="field"><label>Nombre y apellido</label><input type="text" id="sf-name" value="${s?esc(s.name):''}" oninput="${s?'':"document.getElementById('sf-username').value = slugifyUsername(this.value);"}"></div>
    <div class="field">
      <label>Foto (opcional)</label>
      <div class="logo-row">
        <div class="logo-preview" id="sf-photo-preview" style="width:64px;height:64px;border-radius:50%;overflow:hidden;">${s&&s.photo?`<img src="${s.photo}" style="width:100%;height:100%;object-fit:cover;">`:'Sin foto'}</div>
        <div>
          <input type="file" accept="image/*" id="sf-photo-input" onchange="onStudentPhotoSelected(this)">
          ${s&&s.photo?'<div style="margin-top:8px"><button type="button" class="btn-ghost" onclick="clearStudentPhoto()">Quitar foto</button></div>':''}
        </div>
      </div>
    </div>
    <div class="grid2">
      <div class="field"><label>Grupo</label>
        <select id="sf-group" onchange="document.getElementById('sf-belt').innerHTML = beltOptionsHtml(this.value, null);">
          <option value="adulto" ${s&&s.group==='adulto'?'selected':''}>Adulto</option>
          <option value="infantil" ${s&&s.group==='infantil'?'selected':''}>Infantil</option>
        </select>
      </div>
      <div class="field"><label>Dojo</label>
        <select id="sf-dojo">${dojos.map(d=>`<option value="${d.id}" ${s&&s.dojo===d.id?'selected':''}>${d.name}</option>`).join('')}</select>
      </div>
    </div>
    <div class="field"><label>Cinturón</label>
      <select id="sf-belt">${beltOptionsHtml(s?s.group:'adulto', s?s.belt:null)}</select>
    </div>
    <div class="field"><label>Teléfono</label><input type="text" id="sf-phone" value="${s?esc(s.phone):''}"></div>
    <div class="field"><label>Tutor (opcional)</label><input type="text" id="sf-guardian" value="${s?esc(s.guardian):''}"></div>
    <div class="grid2">
      <div class="field"><label>En la escuela desde</label><input type="date" id="sf-since" value="${s?s.since:todayIso()}"></div>
      <div class="field"><label>Fecha de nacimiento (opcional)</label><input type="date" id="sf-birth" value="${s?s.birth||'':''}"></div>
    </div>
    <div class="field"><label>Grupo familiar (opcional)</label><input type="text" id="sf-familyGroup" value="${s?esc(s.familyGroup||''):''}" placeholder="Ej: Familia Suárez — para vincular hermanos">
      ${s && s.familyGroup && students.filter(x=>x.id!==s.id && x.familyGroup===s.familyGroup).length ? `<p class="hint" style="margin-top:6px;margin-bottom:0;">También en la escuela: ${esc(students.filter(x=>x.id!==s.id && x.familyGroup===s.familyGroup).map(x=>x.name).join(', '))}</p>` : ''}
    </div>
    <p style="font-size:12px;font-weight:700;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.06em;margin:14px 0 4px;">Ficha médica</p>
    <div class="field"><label>Alergias o condiciones médicas (opcional)</label><textarea id="sf-allergies" placeholder="Ej: asma, alergia a la aspirina…">${s?esc(s.allergies||''):''}</textarea></div>
    <div class="grid2">
      <div class="field"><label>Contacto de emergencia</label><input type="text" id="sf-emergencyContact" value="${s?esc(s.emergencyContact||''):''}" placeholder="Nombre"></div>
      <div class="field"><label>Teléfono de emergencia</label><input type="text" id="sf-emergencyPhone" value="${s?esc(s.emergencyPhone||''):''}"></div>
    </div>
    <div class="grid2">
      <div class="field"><label>DNI</label><input type="text" id="sf-dni" value="${s?esc(s.dni||''):''}" ${s?'':'placeholder="Se usa como contraseña inicial"'}></div>
      <div class="field"><label>Usuario</label><input type="text" id="sf-username" value="${s?esc(s.username||''):''}" placeholder="se genera del nombre"></div>
    </div>
    ${!s ? '<p class="hint" style="margin-top:-8px">El Senpai/Kohai va a poder iniciar sesión con este usuario y su DNI como contraseña inicial.</p>' : ''}
    ${s ? `
    <div class="field">
      <label>Módulos habilitados</label>
      <div class="checkbox-grid">
        ${grantableModules.map(n=>`
          <label class="check-row"><input type="checkbox" class="sf-module" value="${n.id}" ${(s.enabledModules||[]).includes(n.id)?'checked':''}> ${n.label}</label>
        `).join('')}
      </div>
      <p class="hint" style="margin-top:6px;margin-bottom:0;">Solo el Sensei puede cambiar esto — podés sumarle a ${s.name.split(' ')[0]} módulos que no traiga por defecto (por ej. Asistencia o Cuotas y pagos aunque no sea instructor).</p>
    </div>
    ${s.isInstructor ? `
    <div class="field">
      <label>Permisos de instructor</label>
      <div class="checkbox-grid" style="grid-template-columns:1fr auto;align-items:center;">
        ${Object.keys(permModuleLabels).map(mid=>{
          const val = (s.modulePerms && s.modulePerms[mid]) || 'write';
          return `<span style="font-size:13px;">${permModuleLabels[mid]}</span>
          <select class="sf-perm" data-mod="${mid}" style="width:auto;">
            <option value="read" ${val==='read'?'selected':''}>Lectura sola</option>
            <option value="write" ${val==='write'?'selected':''}>Lectura y escritura</option>
          </select>`;
        }).join('')}
      </div>
      <p class="hint" style="margin-top:6px;margin-bottom:0;">"Lectura sola" en Cuotas y pagos muestra solo sus propios pagos, no los de toda la escuela.</p>
    </div>
    ` : ''}
    ` : ''}
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-dark" onclick="saveStudentForm(${s?s.id:'null'})">${s?'Guardar cambios':'Dar de alta'}</button>
    </div>
  `);
}
async function saveStudentForm(id){
  const name = document.getElementById('sf-name').value.trim();
  if(!name){ toast('Completá al menos el nombre.'); return; }
  if(students.some(s=>s.id!==id && s.name===name && s.status==='activo')){
    toast(`Ya hay un alumno activo llamado "${name}" — se van a poder distinguir por dojo donde haga falta elegir uno.`);
  }
  const dni = document.getElementById('sf-dni').value.trim();
  let username = slugifyUsername(document.getElementById('sf-username').value.trim() || name);
  if(students.some(s=>s.id!==id && s.username===username)){
    username = generateUniqueUsername(username, id);
    toast(`Ese usuario ya existía, se asignó "${username}".`);
  }
  const data = {
    name,
    belt: document.getElementById('sf-belt').value,
    group: document.getElementById('sf-group').value,
    dojo: document.getElementById('sf-dojo').value,
    phone: document.getElementById('sf-phone').value.trim(),
    guardian: document.getElementById('sf-guardian').value.trim(),
    since: document.getElementById('sf-since').value,
    birth: document.getElementById('sf-birth').value,
    familyGroup: document.getElementById('sf-familyGroup').value.trim(),
    allergies: document.getElementById('sf-allergies').value.trim(),
    emergencyContact: document.getElementById('sf-emergencyContact').value.trim(),
    emergencyPhone: document.getElementById('sf-emergencyPhone').value.trim(),
    dni,
    username,
  };
  const moduleEls = document.querySelectorAll('.sf-module');
  if(moduleEls.length){
    data.enabledModules = Array.from(moduleEls).filter(el=>el.checked).map(el=>el.value);
  }
  const permEls = document.querySelectorAll('.sf-perm');
  if(permEls.length){
    const perms = {};
    permEls.forEach(el=>{ perms[el.dataset.mod] = el.value; });
    data.modulePerms = perms;
  }
  if(pendingStudentPhoto !== undefined) data.photo = pendingStudentPhoto;
  if(id){
    const s = students.find(x=>x.id===id);
    Object.assign(s, data);
    toast(`${s.name} fue actualizado.`);
  } else {
    const passwordHash = await sha256Hex(dni || randomTempPassword());
    students.push({id:nextStudentId++, status:'activo', isInstructor:false, scholarship:{active:false, amount:0}, activities:[], photo:null, passwordHash, enabledModules:['mi-programa','mis-cuotas','mi-asistencia','biblioteca','foro','inscripcion'], ...data});
    toast(`${data.name} fue dado de alta. Usuario: ${username}`);
  }
  refreshLoginSelects();
  closeModal();
  paintAlumnos();
}
function openDeleteStudentModal(id){
  const s = students.find(x=>x.id===id);
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Eliminar alumno</h3>
    <p style="font-size:13.5px;color:var(--ink-soft);line-height:1.6;">
      Vas a eliminar a <strong>${s.name}</strong> del sistema. Esta acción no se puede deshacer.
      Si preferís conservar su historial de pagos y asistencias, usá "Suspender" en lugar de eliminar.
    </p>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-dark" style="background:var(--shu-deep);border-color:var(--shu-deep)" onclick="deleteStudentConfirmed(${id})">Eliminar definitivamente</button>
    </div>
  `);
}
function deleteStudentConfirmed(id){
  const s = students.find(x=>x.id===id);
  students = students.filter(x=>x.id!==id);
  refreshLoginSelects();
  closeModal();
  paintAlumnos();
  toast(`${s.name} fue eliminado del sistema.`);
}

/* ============================================================
   ADMIN/INSTRUCTOR · PAGOS
============================================================ */
let pagosFilter = {q:'', period:'', estado:''};
let pagosSort = {col:null, dir:'asc'};
function renderPagos(){
  if(currentRole==='instructor' && !canWriteModule('pagos')){ renderMisCuotas('panel-pagos'); return; }
  const periods = Array.from(new Set(payments.map(p=>p.period))).sort((a,b)=>a.localeCompare(b,'es'));
  document.getElementById('panel-pagos').innerHTML = `
    <div class="main-head"><div><h1>Cuotas y pagos</h1><p>Cuotas, adelantos, mesas de examen y cinturones — con medio de pago y recibo.</p></div>
      <button class="btn btn-dark" onclick="openNewPaymentModal()">+ Registrar pago</button>
    </div>
    <div class="toolbar">
      <input class="search" placeholder="Buscar alumno…" value="${esc(pagosFilter.q)}" oninput="pagosFilter.q=this.value;paintPagos();">
      <div class="filters">
        <select onchange="pagosFilter.period=this.value;paintPagos();">
          <option value="">Todos los períodos</option>
          ${periods.map(p=>`<option value="${p}" ${pagosFilter.period===p?'selected':''}>${p}</option>`).join('')}
        </select>
        <select onchange="pagosFilter.estado=this.value;paintPagos();">
          <option value="">Alumnos: todos</option>
          <option value="deudor" ${pagosFilter.estado==='deudor'?'selected':''}>Deudores</option>
          <option value="aldia" ${pagosFilter.estado==='aldia'?'selected':''}>Al día</option>
        </select>
        <button class="btn btn-sm" onclick="openPagosExport()">Exportar / Descargar</button>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th class="sortable" onclick="toggleSort(pagosSort,'alumno');paintPagos();">Alumno${sortArrow(pagosSort,'alumno')}</th>
          <th class="sortable" onclick="toggleSort(pagosSort,'concepto');paintPagos();">Concepto${sortArrow(pagosSort,'concepto')}</th>
          <th class="sortable" onclick="toggleSort(pagosSort,'periodo');paintPagos();">Período${sortArrow(pagosSort,'periodo')}</th>
          <th class="sortable" onclick="toggleSort(pagosSort,'monto');paintPagos();">Monto${sortArrow(pagosSort,'monto')}</th>
          <th class="sortable" onclick="toggleSort(pagosSort,'medio');paintPagos();">Medio${sortArrow(pagosSort,'medio')}</th>
          <th class="sortable" onclick="toggleSort(pagosSort,'estado');paintPagos();">Estado${sortArrow(pagosSort,'estado')}</th>
          <th></th>
        </tr></thead>
        <tbody id="pagos-body"></tbody>
      </table>
    </div>
  `;
  paintPagos();
}
function deudorStudentIds(){
  return new Set(payments.filter(p=>p.status!=='pagada').map(p=>p.studentId));
}
function filteredPagos(){
  const deudores = deudorStudentIds();
  let list = payments.filter(p=>{
    const s = students.find(x=>x.id===p.studentId);
    if(!s) return false;
    if(pagosFilter.period && p.period!==pagosFilter.period) return false;
    if(pagosFilter.estado==='deudor' && !deudores.has(s.id)) return false;
    if(pagosFilter.estado==='aldia' && deudores.has(s.id)) return false;
    return matchesQuery(pagosFilter.q, s.name);
  });
  const pagosKey = (p, col)=>{
    const s = students.find(x=>x.id===p.studentId);
    if(col==='alumno') return s ? s.name : '';
    if(col==='concepto') return p.concept;
    if(col==='periodo') return p.period;
    if(col==='monto') return p.amount;
    if(col==='medio') return p.status==='pagada' ? p.medium : (p.status==='revision' ? p.proofMedium||'' : '');
    if(col==='estado') return p.status;
  };
  return pagosSort.col ? sortByCol(list, pagosSort, pagosKey) : list.slice().reverse();
}
function paintPagos(){
  const list = filteredPagos();
  document.getElementById('pagos-body').innerHTML = list.length ? list.map(p=>{
    const s = students.find(x=>x.id===p.studentId);
    let estadoTag, accion;
    if(p.status==='pendiente'){
      estadoTag = '<span class="tag tag-warn">Pendiente</span>';
      accion = `<button class="btn btn-sm btn-dark" onclick="openPaymentModal('${p.id}')">Registrar pago</button>`;
    } else if(p.status==='revision'){
      estadoTag = '<span class="tag tag-review">En revisión</span>';
      accion = `<button class="btn btn-sm btn-dark" onclick="confirmProofPayment('${p.id}')">Confirmar pago</button>`;
    } else {
      estadoTag = `<span class="tag tag-ok">Pagada · ${p.paidOn}</span>`;
      accion = `<button class="btn-ghost" onclick="openReceiptModal('${p.id}')">Ver recibo</button>`;
    }
    return `<tr>
      <td>${s.name}</td><td>${esc(p.concept)}</td><td>${esc(p.period)}</td><td>${fmtMoney(p.amount)}</td>
      <td>${p.status==='pagada' ? `<span class="tag ${p.medium==='Físico'?'tag-warn':'tag-ok'}">${p.medium}</span>` : (p.status==='revision' ? `<span class="tag tag-review">${p.proofMedium}</span>` : '—')}</td>
      <td>${estadoTag}</td>
      <td>${accion}</td>
    </tr>`;
  }).join('') : `<tr><td colspan="7" class="att-empty">No se encontraron resultados.</td></tr>`;
}
function pagosPeriodLabel(){
  const bits = [pagosFilter.period || 'Todos los períodos'];
  if(pagosFilter.estado==='deudor') bits.push('Deudores');
  if(pagosFilter.estado==='aldia') bits.push('Al día');
  if(pagosFilter.q) bits.push(`Búsqueda: "${pagosFilter.q}"`);
  return bits.join(' · ');
}
function openPagosExport(){
  const list = filteredPagos();
  const header = ['Alumno','Concepto','Período','Monto','Medio','Estado'];
  const rows = list.map(p=>{
    const s = students.find(x=>x.id===p.studentId);
    const estado = p.status==='pagada' ? 'Pagada' : (p.status==='revision' ? 'En revisión' : 'Pendiente');
    const medio = p.status==='pagada' ? p.medium : (p.status==='revision' ? p.proofMedium||'' : '');
    return [s.name, p.concept, p.period, fmtMoney(p.amount), medio, estado];
  });
  openExportModal({title:'Informe de cuotas y pagos', periodLabel:pagosPeriodLabel(), headers:header, rows, filenameBase:'cuotas_y_pagos'});
}
function confirmProofPayment(paymentId){
  const p = payments.find(x=>x.id===paymentId);
  p.status = 'pagada';
  p.medium = 'Electrónico';
  p.method = p.proofMedium + ' (comprobante del alumno)';
  p.paidOn = todayIso();
  paintPagos();
  openReceiptModal(paymentId, true);
}

function feeOptionsHTML(selectedTipo){
  const opts = [
    ['cuota','Cuota mensual'],
    ['adelanto','Cuota adelantada (próximo período)'],
    ['examen','Mesa de examen'],
    ['examen_cinturon','Mesa de examen + cinturón'],
    ['cinturon','Cinturón (graduación) solamente'],
    ['otros','Otros'],
  ];
  return opts.map(([v,l])=>`<option value="${v}" ${v===selectedTipo?'selected':''}>${l}</option>`).join('');
}
function suggestedAmount(tipo, student){
  const base = student.scholarship && student.scholarship.active ? student.scholarship.amount : (student.group==='infantil' ? feeConfig.cuotaInfantil : feeConfig.cuotaAdulto);
  if(tipo==='cuota' || tipo==='adelanto') return base;
  if(tipo==='examen') return feeConfig.examBoard;
  if(tipo==='examen_cinturon') return feeConfig.examBoard + feeConfig.belt;
  if(tipo==='cinturon') return feeConfig.belt;
  if(tipo==='otros') return '';
  return base;
}
function conceptLabel(tipo, student, customConcept){
  const becaTag = (tipo==='cuota'||tipo==='adelanto') && student.scholarship && student.scholarship.active ? ' (becada)' : '';
  if(tipo==='otros') return (customConcept||'').trim() || 'Otros';
  return {cuota:'Cuota mensual'+becaTag, adelanto:'Cuota adelantada'+becaTag, examen:'Mesa de examen', examen_cinturon:'Mesa de examen + cinturón', cinturon:'Cinturón (graduación)'}[tipo];
}

function disambiguatedLabel(s, pool){
  const byName = pool.filter(x=>x.name===s.name);
  if(byName.length<=1) return s.name;
  const byNameDojo = byName.filter(x=>x.dojo===s.dojo);
  if(byNameDojo.length<=1) return `${s.name} — ${dojoName(s.dojo)}`;
  return `${s.name} — ${dojoName(s.dojo)} — desde ${fmtDateEs(s.since)}`;
}
function openNewPaymentModal(){
  const activos = students.filter(s=>s.status==='activo');
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Registrar pago</h3>
    <div class="field"><label>Alumno</label>
      <input type="text" id="np-student-input" list="np-student-options" placeholder="Escribí para buscar…" oninput="onNewPaymentChange()" autocomplete="off">
      <datalist id="np-student-options">${activos.map(s=>`<option value="${esc(disambiguatedLabel(s,activos))}">`).join('')}</datalist>
    </div>
    <div class="field"><label>Concepto</label>
      <select id="np-tipo" onchange="onNewPaymentChange()">${feeOptionsHTML('cuota')}</select>
    </div>
    <div class="field" id="np-custom-wrap" style="display:none"><label>Especificar concepto</label><input type="text" id="np-concept-custom" placeholder="Ej: Cena de fin de año"></div>
    <div class="field"><label>Período / referencia</label><input type="text" id="np-period" value="Octubre 2026"></div>
    <div class="field"><label>Monto</label><input type="text" id="np-amount"></div>
    <div class="field">
      <label>Medio</label>
      <div class="radio-row">
        <label><input type="radio" name="np-medium" value="Físico" checked onchange="syncMethodOptions('np-method')"><span>Físico</span></label>
        <label><input type="radio" name="np-medium" value="Electrónico" onchange="syncMethodOptions('np-method')"><span>Electrónico</span></label>
      </div>
    </div>
    <div class="field"><label>Detalle</label><select id="np-method"></select></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-dark" onclick="confirmNewPayment()">Confirmar y generar recibo</button>
    </div>
  `);
  syncMethodOptions('np-method');
  onNewPaymentChange();
}
function newPaymentStudent(){
  const typed = document.getElementById('np-student-input').value;
  const activos = students.filter(s=>s.status==='activo');
  return activos.find(s=>disambiguatedLabel(s,activos)===typed);
}
function onNewPaymentChange(){
  const student = newPaymentStudent();
  const tipo = document.getElementById('np-tipo').value;
  document.getElementById('np-custom-wrap').style.display = tipo==='otros' ? 'block' : 'none';
  if(!student) return;
  document.getElementById('np-amount').value = suggestedAmount(tipo, student);
  if(tipo==='adelanto') document.getElementById('np-period').value = 'Adelanto — próximo período';
  else if(tipo==='examen' || tipo==='examen_cinturon') document.getElementById('np-period').value = 'Mesa de examen — 27 sep 2026';
  else if(tipo==='cinturon') document.getElementById('np-period').value = 'Entrega de cinturón';
  else if(tipo==='otros') document.getElementById('np-period').value = '';
  else document.getElementById('np-period').value = 'Octubre 2026';
}
function confirmNewPayment(){
  const student = newPaymentStudent();
  if(!student){ toast('Elegí un alumno de la lista.'); return; }
  const tipo = document.getElementById('np-tipo').value;
  const customConcept = document.getElementById('np-concept-custom').value;
  if(tipo==='otros' && !customConcept.trim()){ toast('Escribí el concepto.'); return; }
  const amount = parseFloat(document.getElementById('np-amount').value);
  if(!amount || amount<=0 || isNaN(amount)){ toast('El monto tiene que ser un número mayor a cero.'); return; }
  const medium = document.querySelector('input[name="np-medium"]:checked').value;
  const method = document.getElementById('np-method').value;
  const id = 'p'+(nextPaymentId++);
  payments.push({
    id, studentId: student.id, period: document.getElementById('np-period').value,
    concept: conceptLabel(tipo, student, customConcept), amount,
    status:'pagada', paidOn: todayIso(), medium, method,
  });
  paintPagos();
  openReceiptModal(id, true);
}

function openPaymentModal(paymentId){
  const p = payments.find(x=>x.id===paymentId);
  const s = students.find(x=>x.id===p.studentId);
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Registrar pago</h3>
    <p style="color:var(--ink-soft);font-size:13.5px;margin:0 0 14px;">${s.name} · ${esc(p.concept)} · ${esc(p.period)}</p>
    <div class="field"><label>Monto</label><input type="text" id="pay-amount" value="${p.amount}"></div>
    <div class="field">
      <label>Medio</label>
      <div class="radio-row">
        <label><input type="radio" name="medium" value="Físico" checked onchange="syncMethodOptions('pay-method')"><span>Físico</span></label>
        <label><input type="radio" name="medium" value="Electrónico" onchange="syncMethodOptions('pay-method')"><span>Electrónico</span></label>
      </div>
    </div>
    <div class="field"><label>Detalle</label><select id="pay-method"></select></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-dark" onclick="confirmPayment('${p.id}')">Confirmar y generar recibo</button>
    </div>
  `);
  syncMethodOptions('pay-method');
}
function syncMethodOptions(selectId){
  const medium = document.querySelector(`input[name="${selectId==='pay-method'?'medium':'np-medium'}"]:checked`).value;
  const sel = document.getElementById(selectId);
  const options = medium==='Físico' ? ['Efectivo'] : ['Transferencia','Mercado Pago','Otro medio electrónico'];
  sel.innerHTML = options.map(o=>`<option>${o}</option>`).join('');
}
function confirmPayment(paymentId){
  const p = payments.find(x=>x.id===paymentId);
  const medium = document.querySelector('input[name="medium"]:checked').value;
  const method = document.getElementById('pay-method').value;
  p.status = 'pagada';
  p.paidOn = todayIso();
  p.amount = parseFloat(document.getElementById('pay-amount').value)||p.amount;
  p.medium = medium;
  p.method = method;
  paintPagos();
  openReceiptModal(paymentId, true);
}
function receiptText(p, s){
  const receiptNo = 'R-' + p.id.toUpperCase().replace('P','') + '-2026';
  return `Shuri-te Kan — Recibo no fiscal ${receiptNo}\nAlumno: ${s.name}\nConcepto: ${p.concept}\nPeríodo: ${esc(p.period)}\nMonto: ${fmtMoney(p.amount)}\nMedio: ${p.medium} (${p.method})\nFecha de pago: ${p.paidOn}\n¡Gracias!`;
}
function openReceiptModal(paymentId, justPaid){
  const p = payments.find(x=>x.id===paymentId);
  const s = students.find(x=>x.id===p.studentId);
  const receiptNo = 'R-' + p.id.toUpperCase().replace('P','') + '-2026';
  const waText = encodeURIComponent(receiptText(p,s));
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">${justPaid ? 'Pago registrado' : 'Recibo'}</h3>
    <p style="color:var(--ink-soft);font-size:13.5px;margin:0;">Comprobante no fiscal, listo para compartir.</p>
    <div class="receipt">
      <div class="rline"><span>Recibo</span><strong>${receiptNo}</strong></div>
      <div class="rline"><span>Alumno</span><strong>${s.name}</strong></div>
      <div class="rline"><span>Concepto</span><strong>${esc(p.concept)}</strong></div>
      <div class="rline"><span>Período</span><strong>${esc(p.period)}</strong></div>
      <div class="rline"><span>Monto</span><strong>${fmtMoney(p.amount)}</strong></div>
      <div class="rline"><span>Medio</span><strong>${p.medium} · ${p.method}</strong></div>
      <div class="rline"><span>Fecha</span><strong>${p.paidOn}</strong></div>
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="copyReceiptText('${p.id}')">Copiar texto</button>
      <button class="btn" onclick="printReceipt('${p.id}')">Descargar PDF</button>
      <a class="btn btn-dark" style="text-decoration:none;text-align:center" target="_blank" href="https://wa.me/${s.phone}?text=${waText}">Enviar por WhatsApp</a>
    </div>
  `);
}
function printReceipt(paymentId){
  const p = payments.find(x=>x.id===paymentId);
  const s = students.find(x=>x.id===p.studentId);
  const receiptNo = 'R-' + p.id.toUpperCase().replace('P','') + '-2026';
  const rows = [
    ['Recibo', receiptNo],
    ['Alumno', s.name],
    ['Concepto', p.concept],
    ['Período', p.period],
    ['Monto', fmtMoney(p.amount)],
    ['Medio', p.medium + ' · ' + p.method],
    ['Fecha', fmtDateEs(p.paidOn)],
  ];
  exportAsPdf({title:'Recibo de pago', periodLabel:p.period, headers:['Campo','Detalle'], rows, filenameBase:'recibo_'+receiptNo});
}
function copyReceiptText(paymentId){
  const p = payments.find(x=>x.id===paymentId);
  const s = students.find(x=>x.id===p.studentId);
  const text = receiptText(p,s);
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(()=>toast('Texto del recibo copiado.')).catch(()=>toast('No se pudo copiar automáticamente.'));
  } else { toast('No se pudo copiar automáticamente.'); }
}

/* ============================================================
   ADMIN/INSTRUCTOR · ASISTENCIA
============================================================ */
let asistenciaFilter = {group:'', dojo:''};
let asistenciaView = 'hoy';
let asistenciaMonth = null;
function renderAsistenciaPanel(){
  const today = new Date().toLocaleDateString('es-AR', {weekday:'long', day:'numeric', month:'long'});
  if(currentRole==='instructor'){ asistenciaFilter.dojo = activeStudent().dojo; }
  if(!asistenciaMonth) asistenciaMonth = monthsWithClasses().slice(-1)[0] || currentMonthKey();
  const canWrite = canWriteModule('asistencia');
  document.getElementById('panel-asistencia').innerHTML = `
    <div class="main-head"><div><h1>Asistencia</h1><p>${asistenciaView==='hoy' ? (today[0].toUpperCase()+today.slice(1)+(canWrite?' · tocá cada tarjeta para marcar presente.':' · modo lectura, no podés tomar asistencia.')) : (canWrite?'Planilla del mes · tocá una celda para corregir una presente o una ausente.':'Planilla del mes · modo lectura.')}</p></div>
      <div style="display:flex;gap:10px;">
        ${canWrite ? `<button class="btn" onclick="openAttendanceQr()">Código QR</button>` : ''}
        ${asistenciaView==='hoy' && canWrite ? `<button class="btn btn-dark" onclick="toast('Asistencia de hoy guardada: ' + todaysAttendance.size + ' presentes.')">Guardar clase</button>` : ''}
      </div>
    </div>
    <div class="sub-tabs">
      <div class="sub-tab ${asistenciaView==='hoy'?'active':''}" onclick="asistenciaView='hoy';renderAsistenciaPanel();">Clase de hoy</div>
      <div class="sub-tab ${asistenciaView==='planilla'?'active':''}" onclick="asistenciaView='planilla';renderAsistenciaPanel();">Planilla mensual</div>
    </div>
    <div class="toolbar">
      <div class="filters">
        <select onchange="asistenciaFilter.group=this.value;${asistenciaView==='hoy'?'paintAttendance()':'paintPlanilla()'};">
          <option value="">Todos los grupos</option>
          <option value="adulto" ${asistenciaFilter.group==='adulto'?'selected':''}>Adulto</option>
          <option value="infantil" ${asistenciaFilter.group==='infantil'?'selected':''}>Infantil</option>
        </select>
        ${currentRole==='instructor' ? '' : `
        <select onchange="asistenciaFilter.dojo=this.value;${asistenciaView==='hoy'?'paintAttendance()':'paintPlanilla()'};">
          <option value="">Todos los dojos</option>
          ${dojos.map(d=>`<option value="${d.id}" ${asistenciaFilter.dojo===d.id?'selected':''}>${d.name}</option>`).join('')}
        </select>`}
        ${asistenciaView==='planilla' ? `
        <select onchange="asistenciaMonth=this.value;paintPlanilla();">
          ${monthsWithClasses().map(m=>`<option value="${m}" ${asistenciaMonth===m?'selected':''}>${monthLabel(m)}</option>`).join('')}
        </select>` : ''}
      </div>
      ${asistenciaView==='planilla' ? `<button class="btn btn-dark" onclick="openDownloadSheet()">Descargar planilla</button>` : ''}
    </div>
    ${asistenciaView==='hoy'
      ? '<div class="attendance-grid" id="att-grid"></div>'
      : '<div class="sheet-wrap"><table class="sheet-table" id="sheet-table"></table></div><p style="margin-top:10px">✓ presente · celda vacía = ausente. Tocá una celda para cambiar el estado.</p>'}
  `;
  if(asistenciaView==='hoy') paintAttendance(); else paintPlanilla();
}
function currentMonthKey(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
function monthsWithClasses(){
  const set = new Set();
  Object.values(attendanceHistory).forEach(dates=>dates.forEach(d=>set.add(d.slice(0,7))));
  set.add(currentMonthKey());
  return Array.from(set).sort();
}
function monthLabel(m){
  const [y,mo] = m.split('-');
  const d = new Date(Number(y), Number(mo)-1, 1);
  const s = d.toLocaleDateString('es-AR',{month:'long',year:'numeric'});
  return s[0].toUpperCase()+s.slice(1);
}
function classDatesInMonth(month){
  const set = new Set();
  Object.values(attendanceHistory).forEach(dates=>dates.forEach(d=>{ if(d.startsWith(month)) set.add(d); }));
  return Array.from(set).sort();
}
function paintPlanilla(){
  const wrap = document.getElementById('sheet-table');
  const canWrite = canWriteModule('asistencia');
  const list = students.filter(s=>
    s.status==='activo' &&
    (!asistenciaFilter.group || s.group===asistenciaFilter.group) &&
    (!asistenciaFilter.dojo || s.dojo===asistenciaFilter.dojo)
  );
  const dates = classDatesInMonth(asistenciaMonth);
  if(list.length===0){ wrap.innerHTML = ''; wrap.parentElement.innerHTML = '<div class="att-empty">No hay alumnos activos para este filtro.</div>'; return; }
  if(dates.length===0){ wrap.innerHTML = ''; wrap.parentElement.innerHTML = '<div class="att-empty">No hay clases registradas en ese mes todavía.</div>'; return; }
  const fmt = d=>{ const [,mo,da]=d.split('-'); return da+'/'+mo; };
  wrap.innerHTML = `
    <thead><tr><th class="name-col">Alumno</th>${dates.map(d=>`<th>${fmt(d)}</th>`).join('')}</tr></thead>
    <tbody>
      ${list.map(s=>{
        const present = new Set(attendanceHistory[s.id]||[]);
        return `<tr><td class="name-col">${s.name}</td>${dates.map(d=>{
          const isPresent = present.has(d);
          return `<td class="sheet-cell ${isPresent?'present':'absent'}" ${canWrite?`onclick="toggleSheetCell(${s.id},'${d}')" title="${s.name} · ${fmt(d)} · tocá para cambiar"`:`style="cursor:default;" title="${s.name} · ${fmt(d)}"`}>${isPresent?'✓':'—'}</td>`;
        }).join('')}</tr>`;
      }).join('')}
    </tbody>
  `;
}
function toggleSheetCell(studentId, date){
  const arr = attendanceHistory[studentId] || (attendanceHistory[studentId]=[]);
  const i = arr.indexOf(date);
  if(i>-1){ arr.splice(i,1); } else { arr.push(date); }
  paintPlanilla();
}
function classDatesInRange(start, end){
  const set = new Set();
  Object.values(attendanceHistory).forEach(dates=>dates.forEach(d=>{ if(d>=start && d<=end) set.add(d); }));
  return Array.from(set).sort();
}
function openDownloadSheet(){
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Descargar planilla de asistencia</h3>
    <div class="field"><label>Rango</label>
      <select id="dl-mode" onchange="document.getElementById('dl-range-fields').style.display=this.value==='rango'?'block':'none';">
        <option value="mes">Mes seleccionado: ${monthLabel(asistenciaMonth)}</option>
        <option value="rango">Rango de fechas personalizado</option>
      </select>
    </div>
    <div id="dl-range-fields" style="display:none">
      <div class="field"><label>Desde</label><input type="date" id="dl-from" value="${asistenciaMonth}-01"></div>
      <div class="field"><label>Hasta</label><input type="date" id="dl-to" value="${todayIso()}"></div>
    </div>
    <p class="hint">Se exporta con el mismo filtro de grupo/dojo que tenés elegido en la planilla.</p>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-dark" onclick="downloadAttendanceSheet()">Descargar CSV</button>
    </div>
  `);
}
function downloadAttendanceSheet(){
  const mode = document.getElementById('dl-mode').value;
  let dates, label;
  if(mode==='rango'){
    const from = document.getElementById('dl-from').value;
    const to = document.getElementById('dl-to').value;
    if(!from || !to || from>to){ toast('Elegí un rango de fechas válido.'); return; }
    dates = classDatesInRange(from, to);
    label = `${from}_a_${to}`;
  } else {
    dates = classDatesInMonth(asistenciaMonth);
    label = asistenciaMonth;
  }
  const list = students.filter(s=>
    s.status==='activo' &&
    (!asistenciaFilter.group || s.group===asistenciaFilter.group) &&
    (!asistenciaFilter.dojo || s.dojo===asistenciaFilter.dojo)
  );
  if(dates.length===0 || list.length===0){ toast('No hay datos de asistencia para exportar con ese filtro.'); return; }
  const header = ['Alumno', ...dates, 'Total presentes'];
  const rows = list.map(s=>{
    const present = new Set(attendanceHistory[s.id]||[]);
    const cells = dates.map(d=>present.has(d)?'1':'0');
    const total = cells.filter(c=>c==='1').length;
    return [s.name, ...cells, String(total)];
  });
  const csvLines = [header, ...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','));
  const csv = '\uFEFF' + csvLines.join('\r\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `asistencia_${label}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  closeModal();
  toast('Planilla descargada.');
}
function paintAttendance(){ paintAttendanceGrid('att-grid', asistenciaFilter); }
function paintAttendanceGrid(targetId, filter){
  const grid = document.getElementById(targetId);
  if(!grid) return;
  const canWrite = canWriteModule('asistencia');
  const list = students.filter(s=>
    s.status==='activo' &&
    (!filter.group || s.group===filter.group) &&
    (!filter.dojo || s.dojo===filter.dojo)
  );
  if(list.length===0){ grid.innerHTML = '<div class="att-empty">No hay alumnos activos para este filtro.</div>'; return; }
  grid.innerHTML = list.map(s=>{
    const present = todaysAttendance.has(s.id);
    const b = beltById(s.belt);
    return `<div class="att-card ${present?'present':''}" ${canWrite?`onclick="toggleAttendance(${s.id})"`:'style="cursor:default;"'}>
      <div class="name">${s.name}</div>
      <div class="belt-line"><span class="belt-chip">${beltDotHtml(b)}${b.name}</span></div>
      <div class="state">${present ? '✓ Presente' : (canWrite ? 'Tocar para marcar' : '— Ausente')}</div>
    </div>`;
  }).join('');
}
let quickAttFilter = {group:'', dojo:''};
function toggleAttendance(id){
  if(todaysAttendance.has(id)) todaysAttendance.delete(id); else todaysAttendance.add(id);
  paintAttendanceGrid('att-grid', asistenciaFilter);
  paintAttendanceGrid('att-grid-modal', quickAttFilter);
  const counter = document.getElementById('quick-att-count');
  if(counter) counter.textContent = todaysAttendance.size;
}
function openQuickAttendance(){
  quickAttFilter = {group:'', dojo: currentRole==='instructor' ? activeStudent().dojo : ''};
  const today = new Date().toLocaleDateString('es-AR', {weekday:'long', day:'numeric', month:'long'});
  showModal(`
    <h3>Tomar asistencia — clase de hoy</h3>
    <p style="margin:-6px 0 14px;color:var(--ink-soft);font-size:13px">${today[0].toUpperCase()+today.slice(1)} · tocá cada tarjeta para marcar presente · <span id="quick-att-count">${todaysAttendance.size}</span> presentes</p>
    <div class="toolbar" style="margin-bottom:12px">
      <div class="filters">
        <select onchange="quickAttFilter.group=this.value;paintAttendanceGrid('att-grid-modal',quickAttFilter);">
          <option value="">Todos los grupos</option>
          <option value="adulto">Adulto</option>
          <option value="infantil">Infantil</option>
        </select>
        ${currentRole==='instructor' ? '' : `
        <select onchange="quickAttFilter.dojo=this.value;paintAttendanceGrid('att-grid-modal',quickAttFilter);">
          <option value="">Todos los dojos</option>
          ${dojos.map(d=>`<option value="${d.id}">${d.name}</option>`).join('')}
        </select>`}
      </div>
    </div>
    <div class="attendance-grid" id="att-grid-modal" style="max-height:48vh;overflow:auto;"></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cerrar</button>
      <button class="btn btn-dark" onclick="toast('Asistencia de hoy guardada: ' + todaysAttendance.size + ' presentes.');closeModal();">Guardar clase</button>
    </div>
  `);
  paintAttendanceGrid('att-grid-modal', quickAttFilter);
}

/* ============================================================
   ADMIN · PROGRAMAS / CINTURONES / CRONOGRAMA / ALQUILER
============================================================ */
function renderProgramasAdmin(){
  const canWrite = canWriteModule('programas');
  document.getElementById('panel-programas').innerHTML = `
    <div class="main-head"><div><h1>Programas por cinturón</h1><p>Contenido que se evalúa en cada examen de grado.</p></div></div>
    ${['infantil','adulto'].map(g=>`
      <h3 class="serif" style="font-size:15px;margin:20px 0 10px;">${groupLabel(g)}</h3>
      ${beltsForGroup(g).map(b=>`
        <div class="program-block">
          <div class="ph">${beltDotHtml(b)}<strong>${esc(b.name)}</strong>${canWrite ? `<button class="btn-ghost" style="margin-left:auto" onclick="openProgramEditor('${b.id}')">Editar</button>` : ''}</div>
          <ul>${(programs[b.id]||[]).map(t=>`<li>${esc(t)}</li>`).join('') || '<li style="color:var(--ink-soft);list-style:none;">Sin contenido cargado todavía.</li>'}</ul>
        </div>
      `).join('')}
    `).join('')}
  `;
}
function openProgramEditor(beltId){
  const b = beltById(beltId);
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">${esc(b.name)}</h3>
    <p class="hint" style="margin-top:0">${groupLabel(b.group)} · una técnica o requisito por línea.</p>
    <div class="field"><textarea id="prog-text" style="min-height:220px;">${esc((programs[beltId]||[]).join('\n'))}</textarea></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-dark" onclick="saveProgramEditor('${beltId}')">Guardar</button>
    </div>
  `);
}
function saveProgramEditor(beltId){
  const lines = document.getElementById('prog-text').value.split('\n').map(l=>l.trim()).filter(Boolean);
  programs[beltId] = lines;
  closeModal();
  renderProgramasAdmin();
  toast('Programa actualizado.');
}
function kyuLabel(belt){
  const list = beltsForGroup(belt.group);
  const marronIdx = list.findIndex(b=>b.id.endsWith('-marron'));
  const idx = list.findIndex(b=>b.id===belt.id);
  if(marronIdx===-1 || idx===-1 || idx>marronIdx) return null;
  return (marronIdx - idx) + 1;
}
function beltKanji(belt){
  const kyu = kyuLabel(belt);
  if(kyu) return kyuKanji[kyu] || '';
  const m = belt.id.match(/dan(\d+)/);
  if(m) return danKanji[Number(m[1])] || '';
  return '';
}
function renderCinturones(){
  const canWrite = canWriteModule('cinturones');
  document.getElementById('panel-cinturones').innerHTML = `
    <div class="main-head"><div><h1>Cinturones y colores</h1><p>Orden de graduación y tiempo mínimo sugerido entre exámenes, por grupo. Del blanco al marrón son grados kyu (descendente: el marrón es 1º kyu).</p></div>
    </div>
    ${['infantil','adulto'].map(g=>`
      <h3 class="serif" style="font-size:15px;margin:20px 0 10px;display:flex;align-items:center;justify-content:space-between;">
        <span>${groupLabel(g)}</span>
        ${canWrite ? `<button class="btn-ghost" onclick="openAddBeltForm('${g}')">+ Agregar cinturón</button>` : ''}
      </h3>
      <ul class="belt-list">
        ${beltsForGroup(g).map((b,i)=>{
          const kyu = kyuLabel(b);
          return `
          <li class="belt-row">
            <span class="ord">${i+1}</span>
            ${beltDotHtml(b)}
            <span class="name">${b.name}${kyu?` <span class="tag tag-off">${kyu}º Kyu</span>`:''}</span>
            <span class="time">${b.minMonths===0 ? 'Ingreso' : 'mín. ' + b.minMonths + ' meses · ' + b.classesRequired + ' clases'}</span>
            ${canWrite ? `<button class="btn-ghost" onclick="openBeltForm('${b.id}')">Editar</button>
            <button class="btn-ghost" onclick="openDeleteBeltModal('${b.id}')">Eliminar</button>` : ''}
          </li>
        `;}).join('')}
      </ul>
    `).join('')}
  `;
}
function openAddBeltForm(group){
  const existing = beltsForGroup(group);
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Agregar cinturón — ${groupLabel(group)}</h3>
    <div class="field"><label>Nombre</label><input type="text" id="nb-name" placeholder="Ej: Violeta"></div>
    <div class="field"><label>Color</label>
      <select id="nb-color">
        <option value="var(--belt-blanco)">Blanco</option>
        <option value="var(--belt-celeste)">Celeste</option>
        <option value="var(--belt-amarillo)">Amarillo</option>
        <option value="var(--belt-naranja)">Naranja</option>
        <option value="var(--belt-verde)">Verde</option>
        <option value="var(--belt-azul)">Azul</option>
        <option value="var(--belt-marron)">Marrón</option>
        <option value="var(--belt-negro)">Negro</option>
        <option value="var(--belt-rojo)">Rojo</option>
      </select>
    </div>
    <div class="field"><label>Va después de</label>
      <select id="nb-after">
        <option value="0">Al principio</option>
        ${existing.map((b,i)=>`<option value="${i+1}" ${i===existing.length-1?'selected':''}>${esc(b.name)}</option>`).join('')}
      </select>
    </div>
    <div class="grid2">
      <div class="field"><label>Tiempo mínimo (meses)</label><input type="number" id="nb-months" value="3" min="0"></div>
      <div class="field"><label>Clases mínimas</label><input type="number" id="nb-classes" value="12" min="0"></div>
    </div>
    <div class="field" style="display:flex;align-items:center;gap:8px;">
      <input type="checkbox" id="nb-kyu" checked style="width:auto">
      <label style="margin:0" for="nb-kyu">Es un grado kyu (va antes del marrón, se le calcula el número de kyu solo)</label>
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-dark" onclick="saveNewBelt('${group}')">Agregar</button>
    </div>
  `);
}
function saveNewBelt(group){
  const name = document.getElementById('nb-name').value.trim();
  if(!name){ toast('El cinturón necesita un nombre.'); return; }
  const slugBase = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
  const id = group+'-'+slugBase;
  if(beltById(id)){ toast('Ya hay un cinturón con un nombre muy parecido en este grupo. Probá con otro nombre.'); return; }
  const color = document.getElementById('nb-color').value;
  const afterIdx = parseInt(document.getElementById('nb-after').value);
  const months = Math.max(0, parseInt(document.getElementById('nb-months').value)||0);
  const classesReq = Math.max(0, parseInt(document.getElementById('nb-classes').value)||0);
  const isKyu = document.getElementById('nb-kyu').checked;
  belts.forEach(b=>{ if(b.group===group && b.order > afterIdx) b.order++; });
  const newBelt = {id, name, group, order: afterIdx+1, color, minMonths:months, classesRequired:classesReq};
  if(isKyu) newBelt.kyu = true;
  belts.push(newBelt);
  programs[id] = [];
  closeModal();
  renderCinturones();
  toast(`Cinturón "${name}" agregado.`);
}
function openBeltForm(id){
  const b = beltById(id);
  const kyu = kyuLabel(b);
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Editar cinturón</h3>
    <p class="hint" style="margin-top:0">${groupLabel(b.group)}${kyu?' · '+kyu+'º Kyu':''}</p>
    <div class="field"><label>Nombre</label><input type="text" id="bf-name" value="${b.name}"></div>
    <div class="field"><label>Tiempo mínimo en el cinturón anterior (meses)</label><input type="number" id="bf-months" value="${b.minMonths}" min="0"></div>
    <div class="field"><label>Clases mínimas desde el cinturón anterior</label><input type="number" id="bf-classes" value="${b.classesRequired}" min="0"></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-dark" onclick="saveBeltForm('${id}')">Guardar</button>
    </div>
  `);
}
function saveBeltForm(id){
  const b = beltById(id);
  const name = document.getElementById('bf-name').value.trim();
  if(!name){ toast('El cinturón necesita un nombre.'); return; }
  b.name = name;
  b.minMonths = Math.max(0, parseInt(document.getElementById('bf-months').value)||0);
  b.classesRequired = Math.max(0, parseInt(document.getElementById('bf-classes').value)||0);
  closeModal();
  renderCinturones();
  toast('Cinturón actualizado.');
}
function openDeleteBeltModal(id){
  const b = beltById(id);
  const inUse = students.filter(s=>s.belt===id);
  if(inUse.length){
    showModal(`
      <button class="close-x" onclick="closeModal()">✕</button>
      <h3 class="serif">No se puede eliminar</h3>
      <p style="font-size:13.5px;color:var(--ink-soft);line-height:1.6;">
        ${inUse.length===1 ? 'Hay 1 alumno' : 'Hay ' + inUse.length + ' alumnos'} con el cinturón <strong>${b.name}</strong> asignado (${inUse.map(s=>s.name).join(', ')}). Cambiá su cinturón desde su ficha antes de eliminarlo.
      </p>
      <div class="modal-actions">
        <button class="btn btn-dark" onclick="closeModal()">Entendido</button>
      </div>
    `);
    return;
  }
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Eliminar cinturón</h3>
    <p style="font-size:13.5px;color:var(--ink-soft);line-height:1.6;">
      Vas a eliminar <strong>${b.name}</strong> (${groupLabel(b.group)}) del programa de graduación. Esta acción no se puede deshacer.
    </p>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-dark" style="background:var(--shu-deep);border-color:var(--shu-deep)" onclick="deleteBeltConfirmed('${id}')">Eliminar definitivamente</button>
    </div>
  `);
}
function deleteBeltConfirmed(id){
  const b = beltById(id);
  belts = belts.filter(x=>x.id!==id);
  delete programs[id];
  closeModal();
  renderCinturones();
  toast(`${b.name} fue eliminado del programa.`);
}
function renderCronograma(){
  document.getElementById('panel-cronograma').innerHTML = `
    <div class="main-head"><div><h1>Cronograma y actividades</h1><p>Horarios semanales, mesas de examen, torneos y seminarios.</p></div>
      <button class="btn btn-dark" onclick="openEventForm()">+ Agregar actividad</button>
    </div>
    <div class="main-head" style="margin-bottom:10px">
      <h3 class="serif" style="font-size:15px;margin:0;">Horario semanal</h3>
      <button class="btn" onclick="openScheduleForm()">+ Agregar clase</button>
    </div>
    <div id="schedule-list"></div>
    <h3 class="serif" style="font-size:15px;margin:24px 0 10px;">Exámenes, torneos y actividades</h3>
    <div id="events-list"></div>
  `;
  paintSchedule();
  paintEvents();
}
function paintSchedule(){
  document.getElementById('schedule-list').innerHTML = schedule.length ? `<div class="sched-list">${schedule.map((s,i)=>`
    <div class="sched-item">
      <div class="day">${s.day}</div>
      <div class="details">${esc(s.details)}</div>
      <button class="btn-ghost" onclick="openScheduleForm(${i})">Editar</button>
      <button class="btn-ghost" onclick="deleteScheduleItem(${i})">Eliminar</button>
    </div>
  `).join('')}</div>` : '<p style="color:var(--ink-soft);font-size:13.5px;">Todavía no hay clases cargadas.</p>';
}
function openScheduleForm(index){
  const editing = index!==undefined;
  const s = editing ? schedule[index] : {day:'Lun', details:''};
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">${editing?'Editar clase':'Agregar clase'}</h3>
    <div class="field"><label>Día</label>
      <select id="sch-day">
        ${['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d=>`<option value="${d}" ${s.day===d?'selected':''}>${d}</option>`).join('')}
      </select>
    </div>
    <div class="field"><label>Detalle</label><input id="sch-details" value="${esc(s.details)}" placeholder="Ej: Adultos · Dojo Central 19:15 – 20:45"></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-dark" onclick="saveScheduleItem(${editing?index:'null'})">Guardar</button>
    </div>
  `);
}
function saveScheduleItem(index){
  const day = document.getElementById('sch-day').value;
  const details = document.getElementById('sch-details').value.trim();
  if(!details){ toast('Completá el detalle de la clase.'); return; }
  if(index===null){ schedule.push({day, details}); } else { schedule[index] = {day, details}; }
  closeModal();
  paintSchedule();
  toast('Horario actualizado.');
}
function deleteScheduleItem(index){
  schedule.splice(index,1);
  paintSchedule();
  toast('Clase eliminada del cronograma.');
}
function paintEvents(){
  const list = events.slice().sort((a,b)=>a.date.localeCompare(b.date));
  document.getElementById('events-list').innerHTML = list.length ? `<div class="sched-list">${list.map(e=>`
    <div class="sched-item ${e.type==='examen'?'exam':''}">
      <div class="day">${fmtDateEs(e.date)}</div>
      <div class="details">${esc(e.title)}${e.notes?`<small>${esc(e.notes)}</small>`:''}</div>
      <span class="tag ${e.type==='examen'?'tag-warn':(e.type==='torneo'?'tag-review':'tag-ok')}">${eventTypeLabels[e.type]}</span>
      <button class="btn-ghost" onclick="deleteEvent('${e.id}')">Eliminar</button>
    </div>
  `).join('')}</div>` : '<p style="color:var(--ink-soft);font-size:13.5px;">Todavía no hay actividades cargadas.</p>';
}
function openEventForm(){
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Agregar actividad</h3>
    <div class="field"><label>Tipo</label>
      <select id="ev-type">
        <option value="examen">Mesa de examen</option>
        <option value="torneo">Torneo</option>
        <option value="seminario">Seminario</option>
        <option value="actividad">Actividad extra</option>
      </select>
    </div>
    <div class="field"><label>Título</label><input id="ev-title" placeholder="Ej: Torneo Regional de Karate-Do"></div>
    <div class="field"><label>Fecha</label><input type="date" id="ev-date" value="${todayIso()}"></div>
    <div class="field"><label>Notas (opcional)</label><textarea id="ev-notes" placeholder="Detalles, requisitos, cupo…"></textarea></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-dark" onclick="saveEvent()">Guardar</button>
    </div>
  `);
}
function saveEvent(){
  const type = document.getElementById('ev-type').value;
  const title = document.getElementById('ev-title').value.trim();
  const date = document.getElementById('ev-date').value;
  const notes = document.getElementById('ev-notes').value.trim();
  if(!title || !date){ toast('Completá el título y la fecha.'); return; }
  events.push({id:'e'+(nextEventId++), type, title, date, notes});
  closeModal();
  renderCronograma();
  toast('Actividad agregada al cronograma.');
}
function deleteEvent(id){
  events = events.filter(e=>e.id!==id);
  paintEvents();
}
let gastosFilter = {q:'', category:'', month:''};
let gastosSort = {col:null, dir:'asc'};
function renderAlquiler(){
  const months = Array.from(new Set(expenses.map(e=>e.date.slice(0,7)))).sort();
  document.getElementById('panel-alquiler').innerHTML = `
    <div class="main-head"><div><h1>Gastos</h1><p>Alquiler del salón, compra de material, certificados de cinturón y otros gastos del dojo.</p></div>
      <button class="btn btn-dark" onclick="openNewExpenseModal()">+ Registrar gasto</button>
    </div>
    <div class="toolbar">
      <input class="search" placeholder="Buscar por concepto…" value="${esc(gastosFilter.q)}" oninput="gastosFilter.q=this.value;paintExpenses();">
      <div class="filters">
        <select onchange="gastosFilter.category=this.value;paintExpenses();">
          <option value="">Todas las categorías</option>
          ${expenseCategories.map(c=>`<option value="${c}" ${gastosFilter.category===c?'selected':''}>${c}</option>`).join('')}
        </select>
        <select onchange="gastosFilter.month=this.value;paintExpenses();">
          <option value="">Todos los meses</option>
          ${months.map(m=>`<option value="${m}" ${gastosFilter.month===m?'selected':''}>${monthLabel(m)}</option>`).join('')}
        </select>
        <button class="btn btn-sm" onclick="openGastosExport()">Exportar / Descargar</button>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th class="sortable" onclick="toggleSort(gastosSort,'categoria');paintExpenses();">Categoría${sortArrow(gastosSort,'categoria')}</th>
          <th class="sortable" onclick="toggleSort(gastosSort,'concepto');paintExpenses();">Concepto${sortArrow(gastosSort,'concepto')}</th>
          <th class="sortable" onclick="toggleSort(gastosSort,'fecha');paintExpenses();">Fecha${sortArrow(gastosSort,'fecha')}</th>
          <th class="sortable" onclick="toggleSort(gastosSort,'monto');paintExpenses();">Monto${sortArrow(gastosSort,'monto')}</th>
          <th class="sortable" onclick="toggleSort(gastosSort,'estado');paintExpenses();">Estado${sortArrow(gastosSort,'estado')}</th>
          <th></th>
        </tr></thead>
        <tbody id="gastos-body"></tbody>
      </table>
    </div>
  `;
  paintExpenses();
}
function filteredExpenses(){
  let list = expenses.filter(e=>
    (!gastosFilter.category || e.category===gastosFilter.category) &&
    (!gastosFilter.month || e.date.slice(0,7)===gastosFilter.month) &&
    matchesQuery(gastosFilter.q, e.concept)
  );
  const gastosKey = (e, col)=>{
    if(col==='categoria') return e.category;
    if(col==='concepto') return e.concept;
    if(col==='fecha') return e.date;
    if(col==='monto') return e.amount;
    if(col==='estado') return e.status;
  };
  return gastosSort.col ? sortByCol(list, gastosSort, gastosKey) : list.slice().reverse();
}
function paintExpenses(){
  const list = filteredExpenses();
  document.getElementById('gastos-body').innerHTML = list.length ? list.map(e=>`
    <tr>
      <td><span class="tag tag-off">${e.category}</span></td>
      <td>${esc(e.concept)}</td>
      <td>${e.date}</td>
      <td>${fmtMoney(e.amount)}</td>
      <td>${e.status==='pagado' ? `<span class="tag tag-ok">Pagado · ${e.paidOn}</span>` : '<span class="tag tag-warn">Pendiente</span>'}</td>
      <td>${e.status==='pendiente' ? `<button class="btn btn-sm btn-dark" onclick="openExpensePaymentModal('${e.id}')">Registrar pago</button>` : ''}</td>
    </tr>
  `).join('') : `<tr><td colspan="6" class="att-empty">No se encontraron resultados.</td></tr>`;
}
function gastosPeriodLabel(){
  const bits = [];
  if(gastosFilter.month) bits.push(monthLabel(gastosFilter.month)); else bits.push('Todos los meses');
  if(gastosFilter.category) bits.push(gastosFilter.category);
  if(gastosFilter.q) bits.push(`Búsqueda: "${gastosFilter.q}"`);
  return bits.join(' · ');
}
function openGastosExport(){
  const list = filteredExpenses();
  const header = ['Categoría','Concepto','Fecha','Monto','Estado'];
  const rows = list.map(e=>[e.category, e.concept, fmtDateEs(e.date), fmtMoney(e.amount), e.status==='pagado'?'Pagado':'Pendiente']);
  openExportModal({title:'Informe de gastos', periodLabel:gastosPeriodLabel(), headers:header, rows, filenameBase:'gastos'});
}
function openNewExpenseModal(){
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Registrar gasto</h3>
    <div class="field"><label>Categoría</label>
      <select id="ex-category">${expenseCategories.map(c=>`<option>${c}</option>`).join('')}</select>
    </div>
    <div class="field"><label>Concepto / descripción</label><input type="text" id="ex-concept" placeholder="Ej: Compra de tatamis nuevos"></div>
    <div class="field"><label>Monto</label><input type="text" id="ex-amount"></div>
    <div class="field"><label>Fecha</label><input type="date" id="ex-date" value="${todayIso()}"></div>
    <div class="field"><label>Estado</label>
      <select id="ex-status"><option value="pagado">Ya pagado</option><option value="pendiente">Pendiente de pago</option></select>
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-dark" onclick="saveNewExpense()">Guardar</button>
    </div>
  `);
}
function saveNewExpense(){
  const concept = document.getElementById('ex-concept').value.trim();
  const amount = parseFloat(document.getElementById('ex-amount').value);
  if(!concept){ toast('Completá el concepto.'); return; }
  if(!amount || amount<=0 || isNaN(amount)){ toast('El monto tiene que ser un número mayor a cero.'); return; }
  const status = document.getElementById('ex-status').value;
  const date = document.getElementById('ex-date').value;
  expenses.push({
    id:'g'+(nextExpenseId++), category: document.getElementById('ex-category').value,
    concept, amount, date, status, ...(status==='pagado' ? {paidOn:date} : {}),
  });
  closeModal(); paintExpenses();
  toast('Gasto registrado.');
}
function openExpensePaymentModal(id){
  const e = expenses.find(x=>x.id===id);
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Registrar pago</h3>
    <p style="color:var(--ink-soft);font-size:13.5px;margin:0 0 14px;">${e.category} · ${esc(e.concept)}</p>
    <div class="field"><label>Monto a registrar</label><input type="text" id="ex-pay-amount" value="${e.amount}"></div>
    <div class="field"><label>Fecha de pago</label><input type="date" id="ex-pay-date" value="${todayIso()}"></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-dark" onclick="confirmExpensePayment('${e.id}')">Confirmar pago</button>
    </div>
  `);
}
function confirmExpensePayment(id){
  const e = expenses.find(x=>x.id===id);
  const amount = parseFloat(document.getElementById('ex-pay-amount').value);
  if(!amount || amount<=0 || isNaN(amount)){ toast('El monto tiene que ser un número mayor a cero.'); return; }
  e.amount = amount;
  e.paidOn = document.getElementById('ex-pay-date').value;
  e.status = 'pagado';
  closeModal(); paintExpenses();
  toast('Pago registrado.');
}

/* ============================================================
   ADMIN · CONFIGURACIÓN (logo + valores por defecto)
============================================================ */
let themeColors = {
  paper:'#E8E0C4', paperRaised:'#F4EEDB', sumi:'#1C1613',
  ink:'#211B17', inkSoft:'#6B5A42',
  link:'#8E241D', btnBg:'#AC2B22', btnText:'#FFFFFF',
};
const themeDefaults = {...themeColors};
function applyTheme(){
  const r = document.documentElement.style;
  r.setProperty('--paper', themeColors.paper);
  r.setProperty('--paper-raised', themeColors.paperRaised);
  r.setProperty('--sumi', themeColors.sumi);
  r.setProperty('--ink', themeColors.ink);
  r.setProperty('--ink-soft', themeColors.inkSoft);
  r.setProperty('--shu-deep', themeColors.link);
  r.setProperty('--shu', themeColors.btnBg);
  r.setProperty('--btn-text', themeColors.btnText);
}
let diplomaConfig = {
  style: 'clasico',
  paperSize: 'A4',
  introText: 'Se otorga el presente diploma a',
  bodyExamen: 'por haber alcanzado, con esfuerzo y dedicación, el grado de',
  bodyGeneral: 'por su participación en',
  titleExamen: 'Diploma de graduación',
  titleSize: 16, nameSize: 32, gradeSize: 20, dateSize: 13, textSize: 13,
  showTenure: true, signatureImage: null, showQr: true,
};
let nextDiplomaNumber = 1;
let issuedDiplomas = [];
const kyuKanji = {1:'一級',2:'二級',3:'三級',4:'四級',5:'五級',6:'六級',7:'七級',8:'八級',9:'九級',10:'十級'};
const danKanji = {1:'初段',2:'弐段',3:'参段',4:'四段',5:'五段',6:'六段',7:'七段',8:'八段',9:'九段',10:'十段'};
let letterheadConfig = {
  dojoName: 'Shuri-te Kan', subtitle: 'Karate-Do Shorin-ryu (Kobayashi-ryu) y Kobudo',
  address:'Av. San Martín 1234, Rosario, Santa Fe', phone:'341 555-0123', whatsapp:'341 555-0123', email:'info@shuritekan.com.ar', website:'www.shuritekan.com.ar', social:'Instagram: @shuritekan · Facebook: /shuritekan', extraText:'',
  instructorName:'', instructorGrade:'',
  logoSize:'md', logoPosition:'left',
  show:{subtitle:true, address:true, phone:true, whatsapp:true, email:true, website:true, social:true, extraText:true, instructorName:true, instructorGrade:true}
};
function colorFieldRow(key, label){
  return `<div class="field">
    <label>${label}</label>
    <div style="display:flex;align-items:center;gap:10px;">
      <input type="color" id="theme-${key}" value="${themeColors[key]}" oninput="document.getElementById('theme-${key}-hex').textContent=this.value" style="width:44px;height:36px;padding:2px;border:1px solid var(--rule);border-radius:var(--radius);background:var(--paper-raised);cursor:pointer;">
      <span id="theme-${key}-hex" style="font-size:12px;color:var(--ink-soft);">${themeColors[key]}</span>
    </div>
  </div>`;
}
function saveThemeColors(){
  Object.keys(themeColors).forEach(k=>{
    themeColors[k] = document.getElementById('theme-'+k).value;
  });
  applyTheme();
  renderConfiguracion();
  toast('Colores actualizados.');
}
function resetThemeColors(){
  Object.assign(themeColors, themeDefaults);
  applyTheme();
  renderConfiguracion();
  toast('Se restablecieron los colores originales.');
}
function lhFieldRow(key, label){
  return `<div class="field">
    <label>${label}</label>
    <div style="display:flex;gap:8px;">
      <input type="checkbox" id="lh-show-${key}" ${letterheadConfig.show[key]?'checked':''} style="width:auto">
      <input type="text" id="lh-${key}" value="${esc(letterheadConfig[key])}" style="flex:1">
    </div>
  </div>`;
}
function saveLetterhead(){
  const keys = ['subtitle','address','phone','whatsapp','email','website','social','extraText','instructorName'];
  keys.forEach(k=>{
    letterheadConfig[k] = document.getElementById('lh-'+k).value.trim();
    letterheadConfig.show[k] = document.getElementById('lh-show-'+k).checked;
  });
  letterheadConfig.instructorGrade = document.getElementById('lh-instructorGrade').value.trim();
  letterheadConfig.show.instructorGrade = document.getElementById('lh-show-instructorGrade').checked;
  letterheadConfig.dojoName = document.getElementById('lh-dojoName').value.trim() || letterheadConfig.dojoName;
  letterheadConfig.logoSize = document.getElementById('lh-logoSize').value;
  letterheadConfig.logoPosition = document.getElementById('lh-logoPosition').value;
  toast('Membrete actualizado.');
}
function renderConfiguracion(){
  document.getElementById('panel-configuracion').innerHTML = `
    <div class="main-head"><div><h1>Configuración</h1><p>Logo de la escuela y valores por defecto de cuotas, mesas y cinturones.</p></div></div>

    <div class="config-section">
      <h3 class="serif">Mi cuenta (Sensei)</h3>
      <p class="d">Tu usuario y contraseña de acceso administrativo.</p>
      <div class="field"><label>Nombre de usuario</label><input type="text" id="cfg-admin-username" value="${esc(adminAccount.username)}"></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn btn-dark" onclick="saveAdminUsername()">Guardar usuario</button>
        <button class="btn" onclick="openChangePasswordModal()">Cambiar contraseña</button>
      </div>
    </div>

    <div class="config-section">
      <h3 class="serif">Colores del sitio</h3>
      <p class="d">Personalizá la paleta de todo el sistema. Los cambios se ven al instante.</p>
      <p style="font-size:12px;font-weight:700;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.06em;margin:14px 0 4px;">Fondos</p>
      <div class="grid2">
        ${colorFieldRow('paper','Fondo general')}
        ${colorFieldRow('paperRaised','Fondo de tarjetas y tablas')}
      </div>
      ${colorFieldRow('sumi','Fondo del menú lateral')}
      <p style="font-size:12px;font-weight:700;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.06em;margin:16px 0 4px;">Letras</p>
      <div class="grid2">
        ${colorFieldRow('ink','Texto principal')}
        ${colorFieldRow('inkSoft','Texto secundario')}
      </div>
      <p style="font-size:12px;font-weight:700;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.06em;margin:16px 0 4px;">Enlaces y botones</p>
      ${colorFieldRow('link','Color de los enlaces')}
      <div class="grid2">
        ${colorFieldRow('btnBg','Fondo de los botones')}
        ${colorFieldRow('btnText','Letra de los botones')}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;">
        <button class="btn btn-dark" onclick="saveThemeColors()">Guardar colores</button>
        <button class="btn" onclick="resetThemeColors()">Restablecer colores originales</button>
      </div>
    </div>

    <div class="config-section">
      <h3 class="serif">Membrete</h3>
      <p class="d">Encabezado que aparece en todos los PDF e impresiones que genera el sistema. La dirección, teléfono, WhatsApp, email, sitio web y redes también se muestran en la sección "Contacto" de la portada pública. Tildar lo que querés que se muestre.</p>
      <div class="grid2">
        <div class="field"><label>Nombre del dojo / organización</label><input type="text" id="lh-dojoName" value="${esc(letterheadConfig.dojoName)}"></div>
        <div class="field"><label>Graduación del instructor (opcional)</label>
          <div style="display:flex;gap:8px;">
            <input type="checkbox" id="lh-show-instructorGrade" ${letterheadConfig.show.instructorGrade?'checked':''} style="width:auto">
            <input type="text" id="lh-instructorGrade" value="${esc(letterheadConfig.instructorGrade)}" placeholder="Ej: 5º Dan" style="flex:1">
          </div>
        </div>
      </div>
      ${lhFieldRow('subtitle','Subtítulo o lema')}
      ${lhFieldRow('address','Dirección')}
      ${lhFieldRow('phone','Teléfono')}
      ${lhFieldRow('whatsapp','WhatsApp')}
      ${lhFieldRow('email','Correo electrónico')}
      ${lhFieldRow('website','Sitio web')}
      ${lhFieldRow('social','Redes sociales')}
      ${lhFieldRow('extraText','Texto adicional')}
      ${lhFieldRow('instructorName','Nombre del instructor / director')}
      <div class="grid2">
        <div class="field"><label>Tamaño del logo en el membrete</label>
          <select id="lh-logoSize">
            <option value="sm" ${letterheadConfig.logoSize==='sm'?'selected':''}>Chico</option>
            <option value="md" ${letterheadConfig.logoSize==='md'?'selected':''}>Mediano</option>
            <option value="lg" ${letterheadConfig.logoSize==='lg'?'selected':''}>Grande</option>
          </select>
        </div>
        <div class="field"><label>Posición del logo</label>
          <select id="lh-logoPosition">
            <option value="left" ${letterheadConfig.logoPosition==='left'?'selected':''}>Izquierda</option>
            <option value="center" ${letterheadConfig.logoPosition==='center'?'selected':''}>Centrado</option>
          </select>
        </div>
      </div>
      <p class="hint">El logo es el mismo que configurás más abajo, en "Logo de la escuela". El estilo de los diplomas se configura aparte, en la sección "Diplomas" del menú.</p>
      <button class="btn btn-dark" onclick="saveLetterhead()">Guardar membrete</button>
    </div>

    <div class="config-section">
      <h3 class="serif">Logo de la escuela</h3>
      <p class="d">Aparece en el ingreso y en el panel lateral.</p>
      <div class="logo-row">
        <div class="logo-preview" id="logo-preview">${schoolLogo?`<img src="${schoolLogo}">`:'Sin logo'}</div>
        <div>
          <input type="file" accept="image/*" id="logo-input" onchange="onLogoSelected(this)">
          <div style="margin-top:8px"><button class="btn-ghost" onclick="removeLogo()">Quitar logo</button></div>
        </div>
      </div>
    </div>

    <div class="config-section">
      <h3 class="serif">Valores por defecto</h3>
      <p class="d">Se usan para sugerir el monto al registrar un pago; siempre se pueden editar en el momento.</p>
      <div class="grid2">
        <div class="field"><label>Cuota mensual — Adulto</label><input type="text" id="cfg-cuotaAdulto" value="${feeConfig.cuotaAdulto}"></div>
        <div class="field"><label>Cuota mensual — Infantil</label><input type="text" id="cfg-cuotaInfantil" value="${feeConfig.cuotaInfantil}"></div>
        <div class="field"><label>Mesa de examen</label><input type="text" id="cfg-examBoard" value="${feeConfig.examBoard}"></div>
        <div class="field"><label>Cinturón (graduación)</label><input type="text" id="cfg-belt" value="${feeConfig.belt}"></div>
      </div>
      <button class="btn btn-dark" style="margin-top:6px" onclick="saveFeeConfig()">Guardar valores</button>
    </div>

    <div class="config-section">
      <h3 class="serif">Página pública</h3>
      <p class="d">El texto que ve cualquiera que entre al sitio, antes de iniciar sesión.</p>
      <div class="field"><label>Título principal</label><input type="text" id="cfg-heroTitle" value="${esc(homeContent.heroTitle)}"></div>
      <div class="field"><label>Texto debajo del título</label><textarea id="cfg-heroLead">${esc(homeContent.heroLead)}</textarea></div>
      <div class="field"><label>Texto de "Nosotros"</label><textarea id="cfg-nosotrosDesc">${esc(homeContent.nosotrosDesc)}</textarea></div>
      <div class="field"><label>Texto de "Filosofía" (un principio por línea)</label><textarea id="cfg-filosofiaText" style="min-height:110px;">${esc(homeContent.filosofiaText)}</textarea></div>
      <div class="field" style="display:flex;align-items:center;gap:8px;margin-top:2px">
        <input type="checkbox" id="cfg-showFilosofia" ${homeContent.showFilosofia?'checked':''} style="width:auto">
        <label style="margin:0" for="cfg-showFilosofia">Mostrar la sección "Filosofía" en la portada</label>
      </div>
      <div class="field" style="display:flex;align-items:center;gap:8px;margin-top:2px">
        <input type="checkbox" id="cfg-showActivities" ${homeContent.showActivities?'checked':''} style="width:auto">
        <label style="margin:0" for="cfg-showActivities">Mostrar la sección "Actividades" (exámenes, torneos, seminarios) en la portada</label>
      </div>

      <div class="field" style="margin-top:22px">
        <label>Foto de fondo de la portada</label>
        <div class="logo-row">
          <div class="logo-preview" id="hero-photo-preview" style="width:120px;height:80px;"><img src="${homeContent.heroPhoto || defaultHeroPhoto}" style="width:100%;height:100%;object-fit:cover;"></div>
          <div>
            <input type="file" accept="image/*" id="hero-photo-input" onchange="onHeroPhotoSelected(this)">
            <div style="margin-top:8px"><button class="btn-ghost" onclick="resetHeroPhoto()">Volver a la foto original</button></div>
          </div>
        </div>
      </div>

      <div class="field" style="margin-top:18px;display:flex;align-items:center;gap:8px;">
        <input type="checkbox" id="cfg-showVideo" ${homeContent.showVideo?'checked':''} style="width:auto">
        <label style="margin:0" for="cfg-showVideo">Mostrar un video en la portada</label>
      </div>
      <div class="field"><label>Enlace del video (YouTube o Vimeo)</label><input type="text" id="cfg-videoUrl" value="${esc(homeContent.videoUrl)}" placeholder="https://www.youtube.com/watch?v=..."></div>

      <button class="btn btn-dark" style="margin-top:6px" onclick="saveHomeContent()">Guardar página pública</button>
    </div>

    <div class="config-section">
      <h3 class="serif">Respaldo de datos</h3>
      <p class="d">Descargá una copia completa de todo lo cargado en el sistema (alumnos, pagos, gastos, configuración) o restaurala desde un archivo.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <button class="btn btn-dark" onclick="exportAllData()">Exportar todos los datos</button>
        <input type="file" accept="application/json" id="import-data-input" onchange="importAllData(this)" style="max-width:260px;">
      </div>
      <p class="hint" style="margin-top:10px;margin-bottom:0;">Importar reemplaza los datos actuales por los del archivo. Ideal para llevarte esta información el día que pases a un sistema con base de datos real.</p>
    </div>
  `;
}
function exportAllData(){
  const backup = {
    version: 1, exportedAt: todayIso(),
    students, nextStudentId, payments, nextPaymentId, expenses, nextExpenseId,
    events, nextEventId, schedule, announcements, nextAnnouncementId,
    forumPosts, nextForumId, pendingInscriptions, nextInscId,
    feeConfig, letterheadConfig, homeContent, themeColors, adminAccount,
    attendanceHistory, belts,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'shuritekan_backup_' + todayIso() + '.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Respaldo descargado.');
}
function importAllData(input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e=>{
    try{
      const data = JSON.parse(e.target.result);
      if(!data.students || !Array.isArray(data.students)) throw new Error('bad file');
      students = data.students; nextStudentId = data.nextStudentId || nextStudentId;
      payments = data.payments || payments; nextPaymentId = data.nextPaymentId || nextPaymentId;
      expenses = data.expenses || expenses; nextExpenseId = data.nextExpenseId || nextExpenseId;
      events = data.events || events; nextEventId = data.nextEventId || nextEventId;
      schedule = data.schedule || schedule;
      announcements = data.announcements || announcements; nextAnnouncementId = data.nextAnnouncementId || nextAnnouncementId;
      forumPosts = data.forumPosts || forumPosts; nextForumId = data.nextForumId || nextForumId;
      pendingInscriptions = data.pendingInscriptions || pendingInscriptions; nextInscId = data.nextInscId || nextInscId;
      if(data.feeConfig) Object.assign(feeConfig, data.feeConfig);
      if(data.letterheadConfig) Object.assign(letterheadConfig, data.letterheadConfig);
      if(data.homeContent) Object.assign(homeContent, data.homeContent);
      if(data.themeColors){ Object.assign(themeColors, data.themeColors); applyTheme(); }
      if(data.adminAccount) Object.assign(adminAccount, data.adminAccount);
      attendanceHistory = data.attendanceHistory || attendanceHistory;
      if(data.belts) belts = data.belts;
      refreshLoginSelects();
      renderConfiguracion();
      toast('Datos restaurados desde el archivo.');
    }catch(err){
      toast('No se pudo leer el archivo. Verificá que sea un respaldo válido exportado desde acá.');
    }
    input.value = '';
  };
  reader.readAsText(file);
}
function onLogoSelected(input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e=>{
    schoolLogo = e.target.result;
    document.getElementById('logo-preview').innerHTML = `<img src="${schoolLogo}">`;
    refreshBranding();
    toast('Logo actualizado.');
  };
  reader.readAsDataURL(file);
}
function removeLogo(){
  schoolLogo = null;
  document.getElementById('logo-preview').innerHTML = 'Sin logo';
  refreshBranding();
  toast('Logo quitado.');
}
function toEmbedUrl(url){
  try{
    const u = new URL(url);
    if(u.hostname.includes('youtu.be')){
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    if(u.hostname.includes('youtube.com')){
      if(u.pathname.startsWith('/embed/')) return url;
      const id = u.searchParams.get('v');
      if(id) return `https://www.youtube.com/embed/${id}`;
    }
    if(u.hostname.includes('vimeo.com')){
      if(u.pathname.startsWith('/video/')) return url;
      const id = u.pathname.split('/').filter(Boolean)[0];
      if(id) return `https://player.vimeo.com/video/${id}`;
    }
    return url;
  }catch(e){ return url; }
}
function onHeroPhotoSelected(input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e=>{
    homeContent.heroPhoto = e.target.result;
    document.getElementById('hero-photo-preview').innerHTML = `<img src="${homeContent.heroPhoto}" style="width:100%;height:100%;object-fit:cover;">`;
    toast('Foto de fondo actualizada.');
  };
  reader.readAsDataURL(file);
}
function resetHeroPhoto(){
  homeContent.heroPhoto = null;
  document.getElementById('hero-photo-preview').innerHTML = `<img src="${defaultHeroPhoto}" style="width:100%;height:100%;object-fit:cover;">`;
  toast('Se restauró la foto original.');
}
function saveAdminUsername(){
  const val = document.getElementById('cfg-admin-username').value.trim();
  if(!val){ toast('El usuario no puede quedar vacío.'); return; }
  if(students.some(s=>s.username===val)){ toast('Ese usuario ya lo usa un alumno.'); return; }
  adminAccount.username = val;
  refreshLoginSelects();
  toast('Usuario del Sensei actualizado.');
}
function saveFeeConfig(){
  feeConfig.cuotaAdulto = parseFloat(document.getElementById('cfg-cuotaAdulto').value)||feeConfig.cuotaAdulto;
  feeConfig.cuotaInfantil = parseFloat(document.getElementById('cfg-cuotaInfantil').value)||feeConfig.cuotaInfantil;
  feeConfig.examBoard = parseFloat(document.getElementById('cfg-examBoard').value)||feeConfig.examBoard;
  feeConfig.belt = parseFloat(document.getElementById('cfg-belt').value)||feeConfig.belt;
  toast('Valores por defecto actualizados.');
}
function saveHomeContent(){
  homeContent.heroTitle = document.getElementById('cfg-heroTitle').value.trim()||homeContent.heroTitle;
  homeContent.heroLead = document.getElementById('cfg-heroLead').value.trim()||homeContent.heroLead;
  homeContent.nosotrosDesc = document.getElementById('cfg-nosotrosDesc').value.trim()||homeContent.nosotrosDesc;
  homeContent.filosofiaText = document.getElementById('cfg-filosofiaText').value.trim()||homeContent.filosofiaText;
  homeContent.showFilosofia = document.getElementById('cfg-showFilosofia').checked;
  homeContent.showActivities = document.getElementById('cfg-showActivities').checked;
  homeContent.showVideo = document.getElementById('cfg-showVideo').checked;
  homeContent.videoUrl = document.getElementById('cfg-videoUrl').value.trim();
  toast('Página pública actualizada.');
}

/* ============================================================
   ADMIN · FICHA DE INSCRIPCIÓN
============================================================ */
function inscripcionUrl(){ return location.origin + location.pathname + '#inscripcion'; }
function renderInscripcionAdmin(){
  const isAdmin = currentRole==='admin';
  document.getElementById('panel-inscripcion').innerHTML = `
    <div class="main-head"><div><h1>Ficha de inscripción</h1><p>${isAdmin ? 'Compartí el enlace para que las familias completen sus datos antes de la primera clase.' : 'Compartí este enlace con quien quiera sumarse al dojo — un amigo, un familiar, alguien que preguntó por una clase de prueba.'}</p></div></div>
    <div class="info-card">
      <strong>Enlace para compartir</strong>
      <div class="link-row" style="margin-top:10px">
        <input readonly id="insc-link" value="${inscripcionUrl()}">
        <button class="btn btn-dark btn-sm" onclick="copyInscLink()">Copiar</button>
        <button class="btn btn-sm" onclick="previewInscripcion()">Vista previa</button>
      </div>
      <p>Cualquiera que abra este enlace ve solo el formulario, sin acceso al resto del sistema.</p>
    </div>
    ${isAdmin ? `
    <h3 class="serif" style="font-size:15px;margin:0 0 10px;">Solicitudes recibidas</h3>
    <div id="insc-requests"></div>` : ''}
  `;
  if(isAdmin) paintInscRequests();
}
function copyInscLink(){
  const val = document.getElementById('insc-link').value;
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(val).then(()=>toast('Enlace copiado.')).catch(()=>toast('No se pudo copiar automáticamente; seleccioná el texto del campo.'));
  } else { toast('No se pudo copiar automáticamente; seleccioná el texto del campo.'); }
}
function previewInscripcion(){ showModal(`<button class="close-x" onclick="closeModal()">✕</button>` + buildInscForm(true)); }
function paintInscRequests(){
  const box = document.getElementById('insc-requests');
  if(pendingInscriptions.length===0){ box.innerHTML = '<p style="color:var(--ink-soft);font-size:13.5px;">No hay solicitudes nuevas.</p>'; return; }
  box.innerHTML = pendingInscriptions.map(r=>`
    <div class="req-row">
      <div>
        <div class="rname">${esc(r.name)}</div>
        <div class="rmeta">${groupLabel(r.group)} · ${dojoName(r.dojo)} · ${esc(r.phone)}${r.dni?' · DNI: '+esc(r.dni):''}${r.guardian?' · Tutor: '+esc(r.guardian):''}</div>
      </div>
      <div>
        <button class="btn btn-sm btn-dark" onclick="approveInscripcion('${r.id}')">Dar de alta</button>
        <button class="btn-ghost btn-sm" style="margin-left:10px" onclick="discardInscripcion('${r.id}')">Descartar</button>
      </div>
    </div>
  `).join('');
}
async function approveInscripcion(id){
  const r = pendingInscriptions.find(x=>x.id===id);
  const startBelt = r.group + '-blanco';
  const username = generateUniqueUsername(r.name);
  const tempPass = r.dni || randomTempPassword();
  const passwordHash = await sha256Hex(tempPass);
  students.push({id:nextStudentId++, name:r.name, belt:startBelt, since:todayIso(), birth:r.birth||'', familyGroup:'', phone:r.phone, dni:r.dni||'', guardian:r.guardian, allergies:r.notes||'', emergencyContact:r.guardian||'', emergencyPhone:r.emergencyPhone||'', photo:null, group:r.group, dojo:r.dojo, status:'activo', isInstructor:false, scholarship:{active:false, amount:0}, activities:[], username, passwordHash, enabledModules:['mi-programa','mis-cuotas','mi-asistencia','biblioteca','foro','inscripcion']});
  pendingInscriptions = pendingInscriptions.filter(x=>x.id!==id);
  refreshLoginSelects();
  paintInscRequests();
  toast(`${esc(r.name)} fue dado de alta. Usuario: ${username} · Contraseña inicial: ${tempPass}`);
}
function discardInscripcion(id){
  pendingInscriptions = pendingInscriptions.filter(x=>x.id!==id);
  paintInscRequests();
}
function buildInscForm(isPreview){
  return `
    <h1 class="serif">Ficha de inscripción</h1>
    <p class="sub">Shuri-te Kan — Shorin-ryu. Completá los datos y nos pondremos en contacto para coordinar la primera clase.</p>
    <div id="insc-form-fields">
      <div class="field"><label>Nombre y apellido</label><input id="f-name" type="text" placeholder="Nombre completo"></div>
      <div class="field"><label>Fecha de nacimiento</label><input id="f-birth" type="date"></div>
      <div class="field"><label>Grupo</label><select id="f-group"><option value="infantil">Infantil</option><option value="adulto">Adulto</option></select></div>
      <div class="field"><label>Dojo</label><select id="f-dojo">${dojos.map(d=>`<option value="${d.id}">${d.name}</option>`).join('')}</select></div>
      <div class="field"><label>Teléfono de contacto</label><input id="f-phone" type="tel" placeholder="Con código de área"></div>
      <div class="field"><label>DNI</label><input id="f-dni" type="text" placeholder="Se va a usar para tu contraseña inicial"></div>
      <div class="field"><label>Tutor / contacto de emergencia (si es menor)</label><input id="f-guardian" type="text" placeholder="Opcional"></div>
      <div class="field"><label>Teléfono de emergencia (si es distinto al de contacto)</label><input id="f-emergencyPhone" type="tel" placeholder="Opcional"></div>
      <div class="field"><label>Alergias, condiciones médicas u observaciones</label><textarea id="f-notes" placeholder="Opcional"></textarea></div>
      <button class="btn-primary" onclick="submitInscripcion(${isPreview?'true':'false'})">Enviar ficha</button>
    </div>
  `;
}
function submitInscripcion(isPreview){
  const name = cleanText(document.getElementById('f-name').value.trim());
  if(!name){ toast('Completá al menos el nombre para enviar la ficha.'); return; }
  const entry = {
    id: 'i'+(nextInscId++), name,
    birth: document.getElementById('f-birth').value,
    group: document.getElementById('f-group').value,
    dojo: document.getElementById('f-dojo').value,
    phone: cleanText(document.getElementById('f-phone').value.trim()),
    dni: cleanText(document.getElementById('f-dni').value.trim()),
    guardian: cleanText(document.getElementById('f-guardian').value.trim()),
    emergencyPhone: cleanText(document.getElementById('f-emergencyPhone').value.trim()),
    notes: cleanText(document.getElementById('f-notes').value.trim()),
  };
  pendingInscriptions.push(entry);
  if(isPreview){ closeModal(); toast('Ficha de ejemplo recibida — se vería en "Solicitudes recibidas".'); return; }
  document.getElementById('insc-card').innerHTML = `
    <div class="insc-done">
      <div class="mark">〇</div>
      <h2 class="serif" style="margin:14px 0 6px;">Ficha enviada</h2>
      <p style="color:var(--ink-soft);font-size:14px;line-height:1.6;">Gracias, ${esc(name.split(' ')[0])}. El dojo se va a comunicar para coordinar tu primera clase.</p>
    </div>
  `;
}

/* ============================================================
   BIBLIOTECA (admin/instructor editan, alumno solo lee)
============================================================ */
let bibliotecaTab = 'glosario';
let glossarySort = 'asc';
let glossaryFilter = {q:''};
let linksFilter = {q:''};
let linksSort = 'asc';
function canEditLibrary(){ return currentRole==='admin' || (currentRole==='instructor' && canWriteModule('biblioteca')); }
function renderBiblioteca(){
  document.getElementById('panel-biblioteca').innerHTML = `
    <div class="main-head"><div><h1>Biblioteca</h1><p>Glosario técnico y enlaces o videos de referencia del dojo.</p></div></div>
    <div class="subtabs">
      <button id="bt-glosario" class="active" onclick="setBibliotecaTab('glosario')">Glosario</button>
      <button id="bt-links" onclick="setBibliotecaTab('links')">Enlaces y videos</button>
    </div>
    <div id="biblioteca-body"></div>
  `;
  paintBiblioteca();
}
function setBibliotecaTab(tab){
  bibliotecaTab = tab;
  document.getElementById('bt-glosario').classList.toggle('active', tab==='glosario');
  document.getElementById('bt-links').classList.toggle('active', tab==='links');
  paintBiblioteca();
}
function paintBiblioteca(){
  const box = document.getElementById('biblioteca-body');
  if(bibliotecaTab==='glosario'){
    box.innerHTML = `
      <div class="toolbar">
        <input class="search" placeholder="Buscar término o definición…" value="${esc(glossaryFilter.q)}" oninput="glossaryFilter.q=this.value;paintGlosarioResults();">
        <div class="filters">
          <button class="btn btn-sm" onclick="glossarySort=glossarySort==='asc'?'desc':'asc';paintGlosarioResults();">Orden alfabético: ${glossarySort==='asc'?'A → Z':'Z → A'}</button>
          ${canEditLibrary() ? '<button class="btn btn-dark btn-sm" onclick="openGlossaryModal()">+ Agregar término</button>' : ''}
        </div>
      </div>
      <div id="glosario-results"></div>
    `;
    paintGlosarioResults();
  } else {
    box.innerHTML = `
      <div class="toolbar">
        <input class="search" placeholder="Buscar por título, descripción o enlace…" value="${esc(linksFilter.q)}" oninput="linksFilter.q=this.value;paintLinksResults();">
        <div class="filters">
          <button class="btn btn-sm" onclick="linksSort=linksSort==='asc'?'desc':'asc';paintLinksResults();">Orden: ${linksSort==='asc'?'A → Z':'Z → A'}</button>
          ${canEditLibrary() ? '<button class="btn btn-dark btn-sm" onclick="openLinkModal()">+ Agregar enlace</button>' : ''}
        </div>
      </div>
      <div id="links-results"></div>
    `;
    paintLinksResults();
  }
}
function paintGlosarioResults(){
  const list = libraryGlossary
    .filter(g=>matchesQuery(glossaryFilter.q, g.term, g.def))
    .sort((a,b)=>{
      const cmp = a.term.localeCompare(b.term, 'es', {sensitivity:'base'});
      return glossarySort==='asc' ? cmp : -cmp;
    });
  document.getElementById('glosario-results').innerHTML = list.length ? `<dl>${list.map(g=>`
    <div class="glossary-item">
      <dt>${esc(g.term)} ${canEditLibrary()?`<button class="btn-ghost" style="margin-left:8px" onclick="removeGlossary('${g.id}')">Quitar</button>`:''}</dt>
      <dd>${esc(g.def)}</dd>
    </div>`).join('')}</dl>` : '<p class="att-empty">No se encontraron resultados.</p>';
}
function paintLinksResults(){
  const list = libraryLinks
    .filter(l=>matchesQuery(linksFilter.q, l.title, l.desc, l.url))
    .sort((a,b)=>{
      const cmp = a.title.localeCompare(b.title, 'es', {sensitivity:'base'});
      return linksSort==='asc' ? cmp : -cmp;
    });
  document.getElementById('links-results').innerHTML = list.length ? list.map(l=>`
    <div class="link-item">
      <div><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.title)}</a><small>${l.type==='video'?'Video':'Enlace'} · ${esc(l.url)}${l.desc?' · '+esc(l.desc):''}</small></div>
      ${canEditLibrary()?`<div style="display:flex;gap:10px;flex-shrink:0;"><button class="btn-ghost" onclick="openLinkModal('${l.id}')">Editar</button><button class="btn-ghost" onclick="removeLink('${l.id}')">Quitar</button></div>`:''}
    </div>`).join('') : '<p class="att-empty">No se encontraron resultados.</p>';
}
function openGlossaryModal(){
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Nuevo término</h3>
    <div class="field"><label>Término</label><input type="text" id="g-term"></div>
    <div class="field"><label>Definición</label><textarea id="g-def"></textarea></div>
    <div class="modal-actions"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn btn-dark" onclick="saveGlossary()">Agregar</button></div>
  `);
}
function saveGlossary(){
  const term = document.getElementById('g-term').value.trim();
  const def = document.getElementById('g-def').value.trim();
  if(!term||!def){ toast('Completá término y definición.'); return; }
  libraryGlossary.push({id:'g'+(nextGlossaryId++), term, def});
  closeModal(); paintBiblioteca();
}
function removeGlossary(id){ libraryGlossary = libraryGlossary.filter(g=>g.id!==id); paintBiblioteca(); }
function openLinkModal(id){
  const editing = !!id;
  const l = editing ? libraryLinks.find(x=>x.id===id) : {title:'', url:'', type:'link', desc:''};
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">${editing?'Editar enlace':'Nuevo enlace'}</h3>
    <div class="field"><label>Texto a mostrar</label><input type="text" id="l-title" value="${esc(l.title)}" placeholder="Ej: Manual de Karate"></div>
    <div class="field"><label>URL</label><input type="text" id="l-url" value="${esc(l.url)}" placeholder="https://…"></div>
    <div class="field"><label>Descripción (opcional)</label><textarea id="l-desc">${esc(l.desc||'')}</textarea></div>
    <div class="field"><label>Tipo</label><select id="l-type"><option value="link" ${l.type==='link'?'selected':''}>Enlace</option><option value="video" ${l.type==='video'?'selected':''}>Video</option></select></div>
    <div class="modal-actions"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn btn-dark" onclick="saveLink(${editing?`'${id}'`:'null'})">${editing?'Guardar':'Agregar'}</button></div>
  `);
}
function saveLink(id){
  const title = document.getElementById('l-title').value.trim();
  const url = document.getElementById('l-url').value.trim();
  const desc = document.getElementById('l-desc').value.trim();
  const type = document.getElementById('l-type').value;
  if(!title||!url){ toast('Completá el texto a mostrar y la URL.'); return; }
  if(!isValidUrl(url)){ toast('La URL no es válida. Tiene que empezar con http:// o https://'); return; }
  if(id){
    const l = libraryLinks.find(x=>x.id===id);
    Object.assign(l, {title, url, desc, type});
  } else {
    libraryLinks.push({id:'l'+(nextLinkId++), title, url, desc, type});
  }
  closeModal(); paintBiblioteca();
  toast(id?'Enlace actualizado.':'Enlace agregado.');
}
function removeLink(id){ libraryLinks = libraryLinks.filter(l=>l.id!==id); paintBiblioteca(); }

/* ============================================================
   FORO
============================================================ */
function currentDisplayName(){
  if(currentRole==='admin') return 'Sensei';
  return activeStudent().name;
}
function currentDisplayRole(){
  if(currentRole==='admin') return 'Administrador';
  if(currentRole==='instructor') return 'Instructor';
  return 'Alumno';
}
let foroTab = 'anuncios';
function renderForo(){
  document.getElementById('panel-foro').innerHTML = `
    <div class="main-head"><div><h1>Foro</h1><p>Anuncios del Sensei y un espacio para que los alumnos compartan avisos, dudas y material entre ellos.</p></div></div>
    <div class="subtabs">
      <button id="ft-anuncios" class="${foroTab==='anuncios'?'active':''}" onclick="setForoTab('anuncios')">Anuncios</button>
      <button id="ft-foro" class="${foroTab==='foro'?'active':''}" onclick="setForoTab('foro')">Foro</button>
    </div>
    <div id="foro-body"></div>
  `;
  paintForoBody();
}
function setForoTab(tab){
  foroTab = tab;
  document.getElementById('ft-anuncios').classList.toggle('active', tab==='anuncios');
  document.getElementById('ft-foro').classList.toggle('active', tab==='foro');
  paintForoBody();
}
function paintForoBody(){
  const box = document.getElementById('foro-body');
  if(foroTab==='anuncios'){
    box.innerHTML = `
      ${currentRole==='admin' ? `
      <div class="forum-compose">
        <input type="text" id="ann-title" placeholder="Título del anuncio" style="margin-bottom:8px;">
        <textarea id="ann-body" placeholder="Escribí el anuncio para todo el dojo…"></textarea>
        <button class="btn btn-dark btn-sm" style="margin-top:8px" onclick="publishAnnouncement()">Publicar anuncio</button>
      </div>
      ` : ''}
      <div id="announcements-list" style="margin-top:20px"></div>
    `;
    paintAnnouncements();
  } else {
    box.innerHTML = `
      <div class="forum-compose">
        <textarea id="forum-text" placeholder="Escribí algo para compartir con el dojo…"></textarea>
        <button class="btn btn-dark btn-sm" style="margin-top:8px" onclick="publishForum()">Publicar</button>
      </div>
      <div id="forum-list" style="margin-top:20px"></div>
    `;
    paintForum();
  }
}
function paintAnnouncements(){
  document.getElementById('announcements-list').innerHTML = announcements.slice().reverse().map(a=>`
    <div class="forum-post">
      <div class="fh"><span class="fauthor">${esc(a.title)}</span><span class="fdate">${fmtDateEs(a.date)}</span></div>
      <div class="ftext">${esc(a.body)}</div>
      ${currentRole==='admin' ? `<button class="btn-ghost" style="margin-top:8px" onclick="removeAnnouncement('${a.id}')">Eliminar</button>` : ''}
    </div>
  `).join('') || '<p style="color:var(--ink-soft);font-size:13.5px;">Todavía no hay anuncios.</p>';
}
function publishAnnouncement(){
  const title = document.getElementById('ann-title').value.trim();
  const body = document.getElementById('ann-body').value.trim();
  if(!title || !body){ toast('Completá el título y el texto del anuncio.'); return; }
  announcements.push({id:'an'+(nextAnnouncementId++), title, body, date: todayIso()});
  document.getElementById('ann-title').value = '';
  document.getElementById('ann-body').value = '';
  paintAnnouncements();
  toast('Anuncio publicado.');
}
function removeAnnouncement(id){ announcements = announcements.filter(a=>a.id!==id); paintAnnouncements(); }
function paintForum(){
  document.getElementById('forum-list').innerHTML = forumPosts.slice().reverse().map(p=>`
    <div class="forum-post">
      <div class="fh"><span class="fauthor">${esc(p.author)} <span class="frole">${esc(p.role)}</span></span><span class="fdate">${p.date}</span></div>
      <div class="ftext">${esc(p.text)}</div>
      ${(currentRole==='admin'||currentRole==='instructor') ? `<button class="btn-ghost" style="margin-top:8px" onclick="removeForumPost('${p.id}')">Eliminar</button>` : ''}
    </div>
  `).join('') || '<p style="color:var(--ink-soft);font-size:13.5px;">Todavía no hay publicaciones.</p>';
}
function publishForum(){
  const text = document.getElementById('forum-text').value.trim();
  if(!text){ toast('Escribí algo antes de publicar.'); return; }
  forumPosts.push({id:'f'+(nextForumId++), author: currentDisplayName(), role: currentDisplayRole(), text, date: todayIso()});
  document.getElementById('forum-text').value = '';
  paintForum();
}
function removeForumPost(id){ forumPosts = forumPosts.filter(p=>p.id!==id); paintForum(); }

/* ============================================================
   ALUMNO · MI PROGRAMA (su cinturón + anteriores, no los posteriores)
============================================================ */
function renderMiPrograma(){
  const s = activeStudent();
  actFilter = {q:'', type:'', from:'', to:''};
  actSort = {col:'fecha', dir:'desc'};
  const list = beltsForGroup(s.group);
  const idx = beltIndexInGroup(s.belt, s.group);
  const visible = list.slice(0, idx+1);
  const nextBelt = list[idx+1];
  const classesSince = (attendanceHistory[s.id]||[]).filter(d=>d>=s.since).length;
  const required = nextBelt ? nextBelt.classesRequired : null;
  const pct = nextBelt ? Math.min(100, Math.round((classesSince/required)*100)) : 100;
  const upcoming = events.slice().sort((a,b)=>a.date.localeCompare(b.date));
  const today = todayIso();
  document.getElementById('panel-mi-programa').innerHTML = `
    <div class="main-head"><div style="display:flex;align-items:center;gap:14px;">${avatarHtml(s,52)}<div><h1 style="margin:0">Mi programa</h1><p style="margin:2px 0 0">Tu cinturón actual y todo lo que ya recorriste antes.</p></div></div>
      <button class="btn btn-dark" onclick="openDigitalCard(${s.id})">Ver mi carnet</button>
    </div>

    <div class="info-card" style="margin-bottom:20px">
      <strong>${nextBelt ? 'Progreso hacia ' + nextBelt.name : 'Nivel máximo del programa'}</strong>
      ${nextBelt ? `
        <div class="progress-track" style="margin:10px 0 6px"><div class="progress-fill" style="width:${pct}%;background:${nextBelt.color}"></div></div>
        <p style="margin:0">${classesSince} de ${required} clases desde tu cinturón ${list[idx].name} (${fmtDateEs(s.since)}).
        ${classesSince>=required ? ' Ya cumplís el mínimo de clases — esperá la próxima convocatoria a mesa de examen.' : ' Te faltan ' + (required-classesSince) + ' clases más para poder rendir.'}</p>
      ` : `<p style="margin:0">Alcanzaste el nivel más alto del programa de cinturones. ¡Felicitaciones!</p>`}
    </div>

    ${visible.slice().reverse().map(b=>`
      <div class="program-block">
        <div class="ph">${beltDotHtml(b)}<strong>${b.name}</strong>${b.id===s.belt?' <span class="tag tag-ok" style="margin-left:8px">Actual</span>':''}</div>
        <ul>${(programs[b.id]||[]).map(t=>`<li>${t}</li>`).join('')}</ul>
      </div>
    `).join('')}

    <h3 class="serif" style="font-size:15px;margin:24px 0 10px;">Historial de actividades</h3>
    ${activitiesToolbarHtml()}
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th class="sortable" onclick="toggleSort(actSort,'fecha');refreshActivitiesViews();">Fecha${sortArrow(actSort,'fecha')}</th>
          <th>Actividad</th>
          <th class="sortable" onclick="toggleSort(actSort,'tipo');refreshActivitiesViews();">Tipo${sortArrow(actSort,'tipo')}</th>
          <th>Lugar</th><th>Observaciones</th>
        </tr></thead>
        <tbody id="act-history-body"></tbody>
      </table>
    </div>

    <h3 class="serif" style="font-size:15px;margin:24px 0 10px;">Exámenes, torneos y actividades</h3>
    ${upcoming.length ? `<div class="sched-list">${upcoming.map(e=>`
      <div class="sched-item ${e.type==='examen'?'exam':''}" style="${e.date<today?'opacity:.55':''}">
        <div class="day">${fmtDateEs(e.date)}</div>
        <div class="details">${esc(e.title)}${e.notes?`<small>${esc(e.notes)}</small>`:''}</div>
        <span class="tag ${e.type==='examen'?'tag-warn':(e.type==='torneo'?'tag-review':'tag-ok')}">${eventTypeLabels[e.type]}</span>
      </div>
    `).join('')}</div>` : `<p style="color:var(--ink-soft);font-size:13.5px;">Todavía no hay actividades cargadas.</p>`}
  `;
  paintMiProgramaActivities();
}
function openDigitalCard(id){
  const s = students.find(x=>x.id===id);
  const b = beltById(s.belt);
  const kyu = kyuLabel(b);
  const grad = kyu ? kyu+'º Kyu' : b.name;
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <div id="digital-card" class="id-card">
      <div class="id-card-head">
        ${schoolLogo?`<img src="${schoolLogo}" class="id-card-logo">`:''}
        <div class="id-card-dojo">${esc(letterheadConfig.dojoName)}</div>
      </div>
      ${avatarHtml(s,84)}
      <div class="id-card-name">${esc(s.name)}</div>
      <div class="id-card-belt">${beltDotHtml(b)} ${esc(grad)}</div>
      <div class="id-card-meta">${dojoName(s.dojo)} · Desde ${fmtDateEs(s.since)}</div>
      <div class="id-card-meta">${s.isInstructor?'Instructor · ':''}${groupLabel(s.group)}</div>
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cerrar</button>
      <button class="btn btn-dark" onclick="printDigitalCard(${id})">Imprimir / Guardar como PDF</button>
    </div>
  `);
}
function printDigitalCard(id){
  setPrintPageSize('A4');
  document.getElementById('print-area').innerHTML = document.getElementById('digital-card').outerHTML;
  setTimeout(()=>window.print(), 80);
}
function buildDiplomaHtml(s, a, overrides, diplomaNumber){
  overrides = overrides || {};
  const isExam = a.type==='examen' && a.belt;
  let titleLine, bodyLine, centerLine, extraLine = '';
  if(isExam){
    const b = beltById(a.belt);
    const kyu = kyuLabel(b);
    const grad = kyu ? kyu+'º Kyu' : b.name;
    const kanji = beltKanji(b);
    titleLine = overrides.title || diplomaConfig.titleExamen;
    bodyLine = overrides.body || diplomaConfig.bodyExamen;
    centerLine = `${beltDotHtml(b)} ${esc(grad)}${kanji?` <span class="diploma-kanji">${kanji}</span>`:''}`;
  } else if(a.type==='agradecimiento'){
    titleLine = overrides.title || 'Certificado de Agradecimiento';
    bodyLine = overrides.body || 'en agradecimiento por';
    centerLine = esc(a.activity);
    if(a.place) extraLine = `<div class="diploma-text">${esc(a.place)}</div>`;
  } else {
    titleLine = overrides.title || ('Diploma de ' + activityTypeLabel(a.type));
    bodyLine = overrides.body || diplomaConfig.bodyGeneral;
    centerLine = esc(a.activity);
    if(a.place) extraLine = `<div class="diploma-text">${esc(a.place)}</div>`;
  }
  const introLine = overrides.intro || diplomaConfig.introText;
  const style = overrides.style || diplomaConfig.style || 'clasico';
  const sz = {
    title: overrides.titleSize || diplomaConfig.titleSize,
    name: overrides.nameSize || diplomaConfig.nameSize,
    grade: overrides.gradeSize || diplomaConfig.gradeSize,
    date: overrides.dateSize || diplomaConfig.dateSize,
    text: overrides.textSize || diplomaConfig.textSize,
  };
  const borderClasses = {okinawa:'diploma-okinawa', oriental:'diploma-oriental', minimalista:'diploma-minimal', imperial:'diploma-imperial', bambu:'diploma-bambu'};
  const borderClass = borderClasses[style] || 'diploma-border';
  const decorationsByStyle = {
    okinawa: `${schoolLogo?`<img src="${schoolLogo}" class="diploma-watermark">`:''}<span class="diploma-corner-b"></span><span class="diploma-corner-c"></span>`,
    oriental: `<span class="diploma-diamond dd-tl"></span><span class="diploma-diamond dd-tr"></span><span class="diploma-diamond dd-bl"></span><span class="diploma-diamond dd-br"></span>`,
    minimalista: `<span class="diploma-corner-b"></span><span class="diploma-corner-c"></span>`,
    imperial: `<span class="diploma-bracket db-tl"></span><span class="diploma-bracket db-tr"></span><span class="diploma-bracket db-bl"></span><span class="diploma-bracket db-br"></span>`,
    bambu: '',
  };
  const decorations = decorationsByStyle[style] || '';
  const numLine = diplomaNumber ? `<div class="diploma-number">Nº ${String(diplomaNumber).padStart(4,'0')}</div>` : '';
  const qrLine = (diplomaConfig.showQr && diplomaNumber) ? `<div class="diploma-qr" data-verify="${diplomaNumber}"></div>` : '';
  const years = diplomaConfig.showTenure ? yearsBetween(s.since, a.date) : 0;
  const tenureLine = years>=1 ? `<div class="diploma-text" style="position:relative;z-index:1;font-size:${sz.text}px;">en reconocimiento a ${years} año${years===1?'':'s'} de entrenamiento en el dojo</div>` : '';
  const hasCustomExaminer = !!(a.instructor && a.instructor.trim());
  const signerName = hasCustomExaminer ? a.instructor.trim() : (letterheadConfig.instructorName || 'Sensei');
  const signerGrade = hasCustomExaminer ? '' : (letterheadConfig.instructorGrade ? ' — '+esc(letterheadConfig.instructorGrade) : '');
  const signatureImg = (!hasCustomExaminer && diplomaConfig.signatureImage) ? `<img src="${diplomaConfig.signatureImage}" class="diploma-signature-img">` : '';
  return `
    <div class="${borderClass}">
      ${numLine}
      ${qrLine}
      ${decorations}
      ${schoolLogo?`<img src="${schoolLogo}" class="diploma-logo" style="position:relative;z-index:1;">`:''}
      <div class="diploma-dojo" style="position:relative;z-index:1;">${esc(letterheadConfig.dojoName)}</div>
      ${letterheadConfig.subtitle?`<div class="diploma-sub" style="position:relative;z-index:1;">${esc(letterheadConfig.subtitle)}</div>`:''}
      <div class="diploma-title" style="position:relative;z-index:1;font-size:${sz.title}px;">${esc(titleLine)}</div>
      <div class="diploma-text" style="position:relative;z-index:1;font-size:${sz.text}px;">${esc(introLine)}</div>
      <div class="diploma-name" style="position:relative;z-index:1;font-size:${sz.name}px;">${esc(s.name)}</div>
      <div class="diploma-text" style="position:relative;z-index:1;font-size:${sz.text}px;">${esc(bodyLine)}</div>
      <div class="diploma-grade" style="position:relative;z-index:1;font-size:${sz.grade}px;">${centerLine}</div>
      <div style="position:relative;z-index:1;font-size:${sz.text}px;">${extraLine}</div>
      ${tenureLine}
      <div class="diploma-date" style="position:relative;z-index:1;font-size:${sz.date}px;">${fmtDateEs(a.date)}</div>
      <div class="diploma-sign" style="position:relative;z-index:1;">
        ${signatureImg}
        <div class="diploma-line"></div>
        <div>${esc(signerName)}${signerGrade}</div>
      </div>
    </div>
  `;
}
function renderDiplomaQrCodes(container){
  if(typeof QRCode === 'undefined') return;
  container.querySelectorAll('.diploma-qr[data-verify]').forEach(el=>{
    const num = el.dataset.verify;
    el.innerHTML = '';
    const url = location.origin + location.pathname + '#verify-' + num;
    try{ new QRCode(el, {text:url, width:120, height:120, colorDark:'#211B17', colorLight:'#ffffff'}); }catch(e){}
  });
}
let currentDiplomaStudent = null;
let currentDiplomaActivity = null;
function openDiploma(studentId, activityId){
  const s = students.find(x=>x.id===studentId);
  const a = s.activities.find(x=>x.id===activityId);
  openDiplomaModal(s, a);
}
function onCcNameChange(){
  const name = document.getElementById('cc-name').value.trim();
  const existing = students.find(x=>x.name.toLowerCase()===name.toLowerCase() && x.status==='activo');
  if(existing){
    document.getElementById('cc-group').value = existing.group;
    paintCcBeltOptions();
  }
}
function onCcTypeChange(){
  const isExam = document.getElementById('cc-type').value === 'examen';
  document.getElementById('cc-belt-fields').style.display = isExam ? 'grid' : 'none';
  document.getElementById('cc-activity-field').style.display = isExam ? 'none' : 'block';
}
function paintCcBeltOptions(){
  const group = document.getElementById('cc-group').value;
  document.getElementById('cc-belt').innerHTML = beltsForGroup(group).map(b=>`<option value="${b.id}">${esc(b.name)}</option>`).join('');
}
function openCustomCertificate(){
  const name = document.getElementById('cc-name').value.trim();
  if(!name){ toast('Escribí el nombre de la persona.'); return; }
  const type = document.getElementById('cc-type').value;
  const date = document.getElementById('cc-date').value || todayIso();
  const place = document.getElementById('cc-place').value.trim();
  const existing = students.find(x=>x.name.toLowerCase()===name.toLowerCase() && x.status==='activo');
  const s = existing || {id:null, name, since:null, photo:null};
  let a;
  if(type==='examen'){
    const beltId = document.getElementById('cc-belt').value;
    const belt = beltById(beltId);
    a = {id:'custom-'+Date.now(), type, activity:'Examen de '+belt.name, date, place, instructor:'', belt:beltId, result:'aprobado'};
  } else {
    const activity = document.getElementById('cc-activity').value.trim();
    if(!activity){ toast('Describí el motivo o la actividad.'); return; }
    a = {id:'custom-'+Date.now(), type, activity, date, place, instructor:''};
  }
  openDiplomaModal(s, a);
}
function diplomaDefaultTitleBody(a){
  if(a.type==='examen' && a.belt) return {title:diplomaConfig.titleExamen, body:diplomaConfig.bodyExamen};
  if(a.type==='agradecimiento') return {title:'Certificado de Agradecimiento', body:'en agradecimiento por'};
  return {title:'Diploma de ' + activityTypeLabel(a.type), body:diplomaConfig.bodyGeneral};
}
function openDiplomaModal(s, a){
  currentDiplomaStudent = s;
  currentDiplomaActivity = a;
  const def = diplomaDefaultTitleBody(a);
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Generar diploma</h3>
    <p class="hint" style="margin-top:0">Podés editar el texto solo para este diploma, sin tocar la plantilla general.</p>
    <div class="field"><label>Título</label><input type="text" id="dip-title" value="${esc(def.title)}" oninput="refreshDiplomaPreview()"></div>
    <div class="field"><label>Texto de introducción</label><input type="text" id="dip-intro" value="${esc(diplomaConfig.introText)}" oninput="refreshDiplomaPreview()"></div>
    <div class="field"><label>Texto del cuerpo</label><input type="text" id="dip-body" value="${esc(def.body)}" oninput="refreshDiplomaPreview()"></div>
    <div class="grid2">
      <div class="field"><label>Estilo del marco</label>
        <select id="dip-style" onchange="refreshDiplomaPreview()">
          <option value="clasico" ${diplomaConfig.style==='clasico'?'selected':''}>Clásico</option>
          <option value="okinawa" ${diplomaConfig.style==='okinawa'?'selected':''}>Okinawense</option>
          <option value="oriental" ${diplomaConfig.style==='oriental'?'selected':''}>Oriental dorado</option>
          <option value="minimalista" ${diplomaConfig.style==='minimalista'?'selected':''}>Minimalista</option>
          <option value="imperial" ${diplomaConfig.style==='imperial'?'selected':''}>Imperial</option>
          <option value="bambu" ${diplomaConfig.style==='bambu'?'selected':''}>Bambú</option>
        </select>
      </div>
      <div class="field"><label>Tamaño de papel para imprimir</label>
        <select id="dip-size">
          <option value="A4" ${diplomaConfig.paperSize==='A4'?'selected':''}>A4</option>
          <option value="A3" ${diplomaConfig.paperSize==='A3'?'selected':''}>A3</option>
        </select>
      </div>
    </div>
    <div class="field"><label>Tamaño de letra (píxeles)</label>
      <div class="checkbox-grid" style="grid-template-columns:repeat(auto-fill,minmax(100px,1fr));">
        <div><label class="hint" style="margin:0 0 4px;display:block;">Título</label><input type="number" id="dip-titleSize" value="${diplomaConfig.titleSize}" min="8" max="60" oninput="refreshDiplomaPreview()"></div>
        <div><label class="hint" style="margin:0 0 4px;display:block;">Nombre</label><input type="number" id="dip-nameSize" value="${diplomaConfig.nameSize}" min="8" max="80" oninput="refreshDiplomaPreview()"></div>
        <div><label class="hint" style="margin:0 0 4px;display:block;">Cinturón</label><input type="number" id="dip-gradeSize" value="${diplomaConfig.gradeSize}" min="8" max="60" oninput="refreshDiplomaPreview()"></div>
        <div><label class="hint" style="margin:0 0 4px;display:block;">Fecha</label><input type="number" id="dip-dateSize" value="${diplomaConfig.dateSize}" min="6" max="40" oninput="refreshDiplomaPreview()"></div>
        <div><label class="hint" style="margin:0 0 4px;display:block;">Texto</label><input type="number" id="dip-textSize" value="${diplomaConfig.textSize}" min="6" max="40" oninput="refreshDiplomaPreview()"></div>
      </div>
    </div>
    <div class="diploma" id="diploma-preview-wrap">${buildDiplomaHtml(s,a,{},nextDiplomaNumber)}</div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cerrar</button>
      <button class="btn btn-dark" onclick="printDiploma()">Imprimir / Guardar como PDF</button>
    </div>
  `);
  renderDiplomaQrCodes(document.getElementById('diploma-preview-wrap'));
}
function diplomaOverridesFromForm(){
  const num = id => { const el = document.getElementById(id); return el ? parseInt(el.value)||0 : 0; };
  return {
    title: document.getElementById('dip-title') ? document.getElementById('dip-title').value.trim() : '',
    intro: document.getElementById('dip-intro') ? document.getElementById('dip-intro').value.trim() : '',
    body: document.getElementById('dip-body') ? document.getElementById('dip-body').value.trim() : '',
    style: document.getElementById('dip-style') ? document.getElementById('dip-style').value : '',
    titleSize: num('dip-titleSize'), nameSize: num('dip-nameSize'), gradeSize: num('dip-gradeSize'),
    dateSize: num('dip-dateSize'), textSize: num('dip-textSize'),
  };
}
function refreshDiplomaPreview(){
  document.getElementById('diploma-preview-wrap').innerHTML = buildDiplomaHtml(currentDiplomaStudent, currentDiplomaActivity, diplomaOverridesFromForm(), nextDiplomaNumber);
  renderDiplomaQrCodes(document.getElementById('diploma-preview-wrap'));
}
function printDiploma(){
  const s = currentDiplomaStudent, a = currentDiplomaActivity;
  const size = document.getElementById('dip-size') ? document.getElementById('dip-size').value : diplomaConfig.paperSize;
  setPrintPageSize(size, 'landscape');
  const number = nextDiplomaNumber++;
  issuedDiplomas.push({number, studentId: s.id||null, studentName:s.name, activity:a.activity, type:a.type, date:a.date, issuedOn:todayIso()});
  document.getElementById('print-area').innerHTML = `<div class="diploma">${buildDiplomaHtml(s,a,diplomaOverridesFromForm(),number)}</div>`;
  renderDiplomaQrCodes(document.getElementById('print-area'));
  if(document.getElementById('diplomas-log')) paintDiplomasLog();
  setTimeout(()=>window.print(), 80);
}
function paintMiProgramaActivities(){
  const s = activeStudent();
  const list = filteredActivities(s);
  const body = document.getElementById('act-history-body');
  if(!body) return;
  body.innerHTML = list.length ? list.map(a=>activityRowHtml(a, false)).join('') : `<tr><td colspan="5" class="att-empty">No se encontraron resultados.</td></tr>`;
}

/* ============================================================
   ALUMNO · MIS CUOTAS (con medio de pago y compartir comprobante)
============================================================ */
function renderMisCuotas(targetId){
  const target = targetId || 'panel-mis-cuotas';
  const s = activeStudent();
  const mine = payments.filter(p=>p.studentId===s.id);
  document.getElementById(target).innerHTML = `
    <div class="main-head"><div><h1>Mis cuotas</h1><p>Estado de tus pagos y medio con el que se registraron.</p></div></div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Concepto</th><th>Período</th><th>Monto</th><th>Medio</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          ${mine.slice().reverse().map(p=>`
            <tr>
              <td>${esc(p.concept)}</td><td>${esc(p.period)}</td><td>${fmtMoney(p.amount)}</td>
              <td>${p.status==='pagada' ? p.medium : (p.status==='revision' ? p.proofMedium : '—')}</td>
              <td>${p.status==='pagada' ? `<span class="tag tag-ok">Pagada · ${p.paidOn}</span>` : (p.status==='revision' ? '<span class="tag tag-review">En revisión</span>' : '<span class="tag tag-warn">Pendiente</span>')}</td>
              <td>${p.status==='pendiente' ? `<button class="btn-ghost" onclick="openProofModal('${p.id}')">Compartir comprobante</button>` : ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}
function openProofModal(paymentId){
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Compartir comprobante de pago</h3>
    <p class="hint" style="margin-top:0">Si ya transferiste o pagaste por Mercado Pago, subí el comprobante para que el dojo confirme tu pago.</p>
    <div class="field"><label>Medio utilizado</label><select id="proof-medium"><option>Transferencia</option><option>Mercado Pago</option></select></div>
    <div class="field"><label>Comprobante (imagen o PDF)</label><input type="file" id="proof-file"></div>
    <div class="field"><label>Nota (opcional)</label><textarea id="proof-note" placeholder="Ej: transferí desde la cuenta de mi tutor"></textarea></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-dark" onclick="submitProof('${paymentId}')">Enviar comprobante</button>
    </div>
  `);
}
function submitProof(paymentId){
  const p = payments.find(x=>x.id===paymentId);
  const fileInput = document.getElementById('proof-file');
  p.status = 'revision';
  p.proofMedium = document.getElementById('proof-medium').value;
  p.proofNote = document.getElementById('proof-note').value.trim();
  p.proofFileName = fileInput.files[0] ? fileInput.files[0].name : '';
  closeModal();
  renderMisCuotas();
  toast('Comprobante enviado. El dojo va a confirmar tu pago.');
}

/* ============================================================
   ALUMNO · MI ASISTENCIA
============================================================ */
function renderMiAsistencia(){
  const s = activeStudent();
  const dates = attendanceHistory[s.id] || [];
  document.getElementById('panel-mi-asistencia').innerHTML = `
    <div class="main-head"><div><h1>Mi asistencia</h1><p>Clases a las que asististe este mes.</p></div></div>
    <div class="cards-row" style="max-width:320px">
      <div class="stat-card"><div class="num">${dates.length}</div><div class="lbl">Clases este mes</div></div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Fecha</th><th>Estado</th></tr></thead>
        <tbody>${dates.map(d=>`<tr><td>${d}</td><td><span class="tag tag-ok">Presente</span></td></tr>`).join('')}</tbody>
      </table>
    </div>
  `;
}

/* ============================================================
   HELPERS: modal + toast
============================================================ */
function showModal(html){
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal-overlay').classList.add('active');
}
function closeModal(){ document.getElementById('modal-overlay').classList.remove('active'); }
document.getElementById('modal-overlay').addEventListener('click', e=>{ if(e.target.id==='modal-overlay') closeModal(); });

let toastTimer;
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 2800);
}

/* ============================================================
   SITIO PÚBLICO: home + ruteo por hash
============================================================ */
function renderHome(){
  document.getElementById('home-hero').style.backgroundImage = `linear-gradient(165deg, rgba(28,22,19,.88), rgba(20,15,12,.82)), url('${homeContent.heroPhoto || defaultHeroPhoto}')`;
  document.getElementById('home-hero-title').textContent = homeContent.heroTitle;
  document.getElementById('home-hero-lead').textContent = homeContent.heroLead;
  document.getElementById('home-nosotros-desc').textContent = homeContent.nosotrosDesc;
  document.getElementById('home-filosofia-text').textContent = homeContent.filosofiaText;
  document.getElementById('filosofia').style.display = homeContent.showFilosofia ? 'block' : 'none';
  document.getElementById('nav-link-filosofia').style.display = homeContent.showFilosofia ? '' : 'none';
  document.getElementById('actividades').style.display = homeContent.showActivities ? 'block' : 'none';
  document.getElementById('nav-link-actividades').style.display = homeContent.showActivities ? '' : 'none';
  const showVid = homeContent.showVideo && homeContent.videoUrl.trim();
  document.getElementById('video-section').style.display = showVid ? 'block' : 'none';
  document.getElementById('nav-link-video').style.display = showVid ? '' : 'none';
  if(showVid){
    document.getElementById('home-video-wrap').innerHTML = `<div class="video-embed"><iframe src="${toEmbedUrl(homeContent.videoUrl.trim())}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
  }
  paintHomeContact();
  document.getElementById('home-belts').innerHTML = ['infantil','adulto'].map(g=>`
    <p style="font-size:12px;font-weight:700;color:var(--ink-soft);margin:14px 0 2px;text-transform:uppercase;letter-spacing:.06em;">${groupLabel(g)}</p>
    <div class="belt-path">
      ${beltsForGroup(g).map(b=>`<div class="bp-item">${beltDotHtml(b,'bp-dot')}${b.name}</div>`).join('')}
    </div>
  `).join('');
  const sorted = events.slice().sort((a,b)=>a.date.localeCompare(b.date));
  const upcoming = sorted.filter(e=>e.date>=todayIso());
  const toShow = (upcoming.length ? upcoming : sorted).slice(0,6);
  document.getElementById('home-events').innerHTML = toShow.length ? toShow.map(e=>`
    <div class="home-card"><strong>${esc(e.title)}</strong><div class="meta">${fmtDateEs(e.date)} · ${eventTypeLabels[e.type]}</div></div>
  `).join('') : '<p class="desc" style="margin:0">Muy pronto vamos a anunciar las próximas actividades.</p>';
  document.getElementById('home-schedule').innerHTML = schedule.map(s=>`
    <div class="home-card" style="background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.16);border-top-color:var(--shu);">
      <strong style="color:#F2E9DD;">${s.day}</strong><div class="meta" style="color:#C9BBA8;">${esc(s.details)}</div>
    </div>
  `).join('');
}
function paintHomeContact(){
  const lh = letterheadConfig;
  const waDigits = (lh.whatsapp||'').replace(/[^\d]/g,'');
  const items = [
    lh.show.address && lh.address && {label:'Dirección', value:lh.address},
    lh.show.phone && lh.phone && {label:'Teléfono', value:lh.phone},
    lh.show.whatsapp && lh.whatsapp && {label:'WhatsApp', value: waDigits.length>=8 ? `<a href="https://wa.me/${waDigits}" target="_blank" rel="noopener">${lh.whatsapp}</a>` : lh.whatsapp},
    lh.show.email && lh.email && {label:'Email', value:`<a href="mailto:${lh.email}">${lh.email}</a>`},
    lh.show.website && lh.website && {label:'Sitio web', value: `<a href="${/^https?:\/\//.test(lh.website)?lh.website:'https://'+lh.website}" target="_blank" rel="noopener">${lh.website}</a>`},
    lh.show.social && lh.social && {label:'Redes sociales', value: /^https?:\/\//.test(lh.social) ? `<a href="${lh.social}" target="_blank" rel="noopener">${lh.social}</a>` : lh.social},
  ].filter(Boolean);
  const section = document.getElementById('contacto');
  const navLink = document.querySelector('.home-nav-links a[href="#contacto"]');
  const hasAny = items.length>0;
  if(section) section.style.display = hasAny ? 'block' : 'none';
  if(navLink) navLink.style.display = hasAny ? '' : 'none';
  document.getElementById('home-contact').innerHTML = items.map(it=>`
    <div class="home-card"><strong>${it.label}</strong><div class="meta">${it.value}</div></div>
  `).join('');
}
function handleQrCheckin(){
  const loggedIn = getComputedStyle(document.getElementById('app-shell')).display !== 'none';
  if(!loggedIn){
    history.replaceState(null, '', location.pathname + location.search + '#login');
    toast('Iniciá sesión y volvé a escanear el código para marcar tu presencia.');
    route();
    return;
  }
  history.replaceState(null, '', location.pathname + location.search);
  if(currentRole==='admin'){
    toast('Ingresá como Senpai/Kohai para marcarte presente con este código.');
    return;
  }
  const s = activeStudent();
  const already = todaysAttendance.has(s.id);
  if(!already) todaysAttendance.add(s.id);
  if(document.getElementById('att-grid')) paintAttendanceGrid('att-grid', asistenciaFilter);
  showModal(`
    <div style="text-align:center;padding:10px 0;">
      <div style="font-size:40px;">${already?'↺':'✓'}</div>
      <h3 class="serif" style="margin:10px 0 4px;">${already?'Ya estabas presente':'¡Presente registrado!'}</h3>
      <p style="color:var(--ink-soft);margin:0;">${esc(s.name)} — ${fmtDateEs(todayIso())}</p>
      <button class="btn btn-dark" style="margin-top:16px" onclick="closeModal()">Listo</button>
    </div>
  `);
}
function openAttendanceQr(){
  const url = location.origin + location.pathname + '#checkin';
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Código QR de asistencia</h3>
    <p class="hint" style="margin-top:0">Pegalo en la pared del dojo. Cada alumno lo escanea con su celular (ya logueado) para marcarse presente solo.</p>
    <div id="qr-render" style="display:flex;justify-content:center;padding:16px;background:#fff;border-radius:var(--radius);"></div>
    <p class="hint" style="text-align:center;word-break:break-all;">${esc(url)}</p>
  `);
  document.getElementById('qr-render').innerHTML = '';
  new QRCode(document.getElementById('qr-render'), {text:url, width:200, height:200, colorDark:'#211B17', colorLight:'#ffffff'});
}
function route(){
  const hash = location.hash;
  const home = document.getElementById('home-screen');
  const login = document.getElementById('login-screen');
  const insc = document.getElementById('inscripcion-screen');
  const verify = document.getElementById('verify-screen');
  if(hash === '#checkin'){ handleQrCheckin(); return; }
  home.style.display = 'none';
  login.style.display = 'none';
  insc.style.display = 'none';
  verify.style.display = 'none';
  if(hash === '#inscripcion'){
    insc.style.display = 'flex';
    document.getElementById('insc-card').innerHTML = buildInscForm(false);
    window.scrollTo(0,0);
  } else if(hash === '#login'){
    login.style.display = 'flex';
    window.scrollTo(0,0);
  } else if(hash.indexOf('#verify-')===0){
    verify.style.display = 'flex';
    renderVerifyScreen(hash.replace('#verify-',''));
    window.scrollTo(0,0);
  } else {
    home.style.display = 'block';
    renderHome();
  }
}
function renderVerifyScreen(numberStr){
  const number = parseInt(numberStr);
  const record = issuedDiplomas.find(d=>d.number===number);
  document.getElementById('verify-card').innerHTML = record ? `
    <div class="insc-done">
      <div class="mark">✓</div>
      <h2 class="serif" style="margin:14px 0 6px;">Diploma auténtico</h2>
      <p style="color:var(--ink-soft);font-size:14px;line-height:1.8;text-align:left;">
        <strong>Nº:</strong> ${String(record.number).padStart(4,'0')}<br>
        <strong>Alumno:</strong> ${esc(record.studentName)}<br>
        <strong>Logro:</strong> ${esc(record.activity)} (${esc(activityTypeLabel(record.type))})<br>
        <strong>Fecha:</strong> ${fmtDateEs(record.date)}<br>
        <strong>Emitido por:</strong> ${esc(letterheadConfig.dojoName)}
      </p>
    </div>
  ` : `
    <div class="insc-done">
      <div class="mark" style="color:var(--ink-soft);">✕</div>
      <h2 class="serif" style="margin:14px 0 6px;">No encontrado</h2>
      <p style="color:var(--ink-soft);font-size:14px;line-height:1.6;">No hay ningún diploma con el número ${esc(numberStr)} registrado en este dispositivo.</p>
    </div>
  `;
}
window.addEventListener('hashchange', route);
route();
