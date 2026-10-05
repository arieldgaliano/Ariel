/* ============================================================
   CONEXIÓN CON EL SERVIDOR
   Todo lo que se ve acá viene del servidor y cada cambio se guarda allá.
   El servidor vuelve a verificar los permisos en CADA pedido: lo que se
   oculta en pantalla (botones, menús) es solo comodidad visual.
============================================================ */
class ApiError extends Error {
  constructor(message, status, data){ super(message); this.status = status; this.data = data || {}; }
}
async function api(method, path, body, opts){
  opts = opts || {};
  const headers = {'X-Requested-With':'dojo'};
  let payload;
  if(opts.raw){ payload = body; if(opts.contentType) headers['Content-Type'] = opts.contentType; }
  else if(body !== undefined){ headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  Object.assign(headers, opts.headers || {});
  let res;
  try{ res = await fetch('/api' + path, {method, headers, body: payload, credentials:'same-origin'}); }
  catch(e){ throw new ApiError('No hay conexión con el servidor. Revisá tu internet y probá de nuevo.', 0); }
  let data = null;
  if((res.headers.get('content-type') || '').includes('application/json')) data = await res.json().catch(()=>null);
  if(!res.ok){
    const err = new ApiError((data && data.error) || 'Ocurrió un error. Probá de nuevo.', res.status, data);
    if(res.status === 401 && data && data.code === 'unauthenticated' && me) onSessionExpired();
    if(res.status === 403 && data && data.code === 'must_change_password') openForcedPasswordChange();
    throw err;
  }
  return data;
}
// Cualquier error del servidor que no se atrape en el código se muestra como aviso.
window.addEventListener('unhandledrejection', e=>{
  if(e.reason instanceof ApiError){
    e.preventDefault();
    if(e.reason.data && (e.reason.data.code === 'unauthenticated' || e.reason.data.code === 'must_change_password')) return;
    toast(e.reason.message);
  }
});

// Sube un archivo (foto, logo, comprobante) como archivo real. Las imágenes grandes se achican antes.
async function prepareImage(file, maxDim){
  if(!file || !file.type.startsWith('image/') || file.type === 'image/gif') return file;
  try{
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
    if(scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const keepPng = file.type === 'image/png';
    const blob = await new Promise(r=>canvas.toBlob(r, keepPng ? 'image/png' : 'image/jpeg', 0.88));
    return blob || file;
  }catch(e){ return file; }
}
async function uploadFile(file, kind, extraQuery){
  const body = file.type.startsWith('image/') ? await prepareImage(file, kind === 'proof' ? 1600 : 1024) : file;
  const q = '?kind=' + kind + (extraQuery ? '&' + extraQuery : '');
  return api('POST', '/files' + q, body, {raw:true, contentType: body.type || 'application/octet-stream', headers:{'X-Filename': encodeURIComponent(file.name || '')}});
}

/* ============================================================
   ESTADO (copia local de lo que el servidor permite ver a esta persona)
============================================================ */
const expenseCategories = ['Alquiler', 'Material', 'Certificados de cinturón', 'Otro'];
const eventTypeLabels = {examen:'Mesa de examen', torneo:'Torneo', seminario:'Seminario', actividad:'Actividad extra'};
let me = null;                 // sesión: {role, username, studentId, modules, mustChangePassword, serverToday}
let belts = [];
let dojos = [];
let programs = {};
let students = [];
let payments = [];
let expenses = [];
let events = [];
let schedule = [];
let announcements = [];
let forumPosts = [];
let libraryGlossary = [];
let libraryLinks = [];
let pendingInscriptions = [];
let issuedDiplomas = [];
let nextDiplomaNumber = 1;
let classesSinceBelt = 0;
let backupEmail = null;       // estado del respaldo por correo (solo Sensei)
let feeConfig = { cuotaAdulto:0, cuotaInfantil:0, examBoard:0, belt:0 };
const defaultHeroPhoto = '/img/hero-default.jpg';
let homeContent = { heroTitle:'', heroLead:'', nosotrosDesc:'', showActivities:true, showFilosofia:true, filosofiaText:'', heroPhoto:null, showVideo:false, videoUrl:'' };
let schoolLogo = null;         // dirección del archivo del logo (o null)
let currentRole = 'alumno';    // 'admin' | 'instructor' | 'alumno'
let currentStudentId = null;
let currentInstructorStudentId = null;
let loginTab = 'alumno';

function setRoleFromMe(){
  currentRole = me.role;
  currentStudentId = me.studentId;
  currentInstructorStudentId = me.studentId;
}
function applyPublicConfig(c){
  belts = c.belts; dojos = c.dojos; events = c.events; schedule = c.schedule;
  homeContent = c.home; letterheadConfig = c.letterhead; schoolLogo = c.logo || null;
  Object.assign(themeColors, c.theme);
  applyTheme();
  refreshBranding();
}
async function loadPublicConfig(){ applyPublicConfig(await api('GET', '/public/config')); }
async function loadAppData(){
  const d = await api('GET', '/bootstrap');
  me = d.me; setRoleFromMe();
  applyPublicConfig(d.config);
  programs = d.programs || {};
  students = d.students || [];
  payments = d.payments || [];
  expenses = d.expenses || [];
  pendingInscriptions = d.inscriptions || [];
  libraryGlossary = d.glossary || [];
  libraryLinks = d.links || [];
  announcements = d.announcements || [];
  forumPosts = d.forumPosts || [];
  if(d.fees) feeConfig = d.fees;
  if(d.letterhead) letterheadConfig = d.letterhead;
  if(d.diplomaConfig) diplomaConfig = d.diplomaConfig;
  issuedDiplomas = d.issuedDiplomas || [];
  nextDiplomaNumber = d.nextDiplomaNumber || 1;
  classesSinceBelt = d.classesSinceBelt || 0;
  backupEmail = d.backupEmail || null;
}
function upsertById(list, item){
  const i = list.findIndex(x=>x.id===item.id);
  if(i >= 0) list[i] = item; else list.push(item);
}

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

function dojoName(id){ return (dojos.find(d=>d.id===id)||{}).name || '—'; }

/* ============================================================
   LOGIN
============================================================ */

function setLoginRole(role){
  // Las pestañas solo cambian qué campos se muestran; quién es la persona lo decide el servidor.
  loginTab = role;
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
  const user = document.getElementById(loginTab==='admin' ? 'sensei-username' : 'senpai-username').value.trim();
  const pass = document.getElementById(loginTab==='admin' ? 'sensei-password' : 'senpai-password').value;
  if(!user || !pass){ errEl.textContent = 'Completá usuario y contraseña.'; errEl.style.display = 'block'; return; }
  btn.disabled = true; const prevLabel = btn.textContent; btn.textContent = 'Verificando…';
  try{
    me = await api('POST', '/auth/login', {username:user, password:pass});
    document.getElementById('sensei-password').value = '';
    document.getElementById('senpai-password').value = '';
    await enterApp();
  }catch(e){
    if(!(e instanceof ApiError)) throw e;
    errEl.textContent = e.message; errEl.style.display = 'block';
  }finally{
    btn.disabled = false; btn.textContent = prevLabel;
  }
}
// Entra al sistema con la sesión ya iniciada: carga los datos que le corresponden y arma las pantallas.
async function enterApp(){
  if(me.mustChangePassword){ openForcedPasswordChange(); return; }
  await loadAppData();
  ['home-screen','login-screen','inscripcion-screen','verify-screen'].forEach(id=>document.getElementById(id).style.display = 'none');
  document.getElementById('app-shell').style.display = 'block';
  renderShell();
  window.scrollTo(0,0);
  if(location.hash && /^#(login|home)?$/.test(location.hash)) history.replaceState(null, '', location.pathname);
  const pending = sessionStorage.getItem('pendingCheckin');
  if(pending){ sessionStorage.removeItem('pendingCheckin'); doCheckin(pending); }
}
function resetAppState(){
  me = null; students = []; payments = []; expenses = []; pendingInscriptions = []; issuedDiplomas = [];
  libraryGlossary = []; libraryLinks = []; announcements = []; forumPosts = [];
  attendanceToday = new Set(); attendanceMonthData = null; attendanceMonths = [];
  closeModal();
  document.getElementById('app-shell').style.display = 'none';
  document.getElementById('fab-attendance').classList.remove('show');
}
async function logout(){
  try{ await api('POST', '/auth/logout', {}); }catch(e){}
  resetAppState();
  history.replaceState(null, '', location.pathname);
  route();
}
function onSessionExpired(){
  resetAppState();
  document.getElementById('home-screen').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  const errEl = document.getElementById('login-error');
  errEl.textContent = 'Tu sesión venció. Ingresá de nuevo.'; errEl.style.display = 'block';
}
function updateFab(){
  const fab = document.getElementById('fab-attendance');
  if(!fab) return;
  const loggedIn = !!me && getComputedStyle(document.getElementById('app-shell')).display !== 'none';
  const canTake = currentRole==='admin' || (currentRole==='instructor' && canWriteModule('asistencia'));
  fab.classList.toggle('show', loggedIn && canTake);
}
function openChangePasswordModal(){
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Cambiar mi contraseña</h3>
    <div class="field"><label>Contraseña actual</label><input type="password" id="cp-current" autocomplete="current-password"></div>
    <div class="field"><label>Nueva contraseña</label><input type="password" id="cp-new" autocomplete="new-password"></div>
    <div class="field"><label>Confirmar nueva contraseña</label><input type="password" id="cp-confirm" autocomplete="new-password"></div>
    <p class="hint">Mínimo 8 caracteres. Se guarda siempre encriptada: ni el Sensei puede verla.</p>
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
  me = await api('POST', '/auth/change-password', {current, next});
  closeModal();
  toast('Contraseña actualizada.');
}
// Cuando el Sensei restableció la clave (o es la primera vez): no se puede seguir sin elegir una propia.
function openForcedPasswordChange(){
  if(document.getElementById('fp-forced')) return;
  showModal(`
    <h3 class="serif" id="fp-forced">Elegí tu contraseña</h3>
    <p class="hint" style="margin-top:0">${me.role==='admin' ? 'Por seguridad tenés que elegir tu propia contraseña antes de seguir.' : 'Podés elegir una contraseña propia (recomendado) o conservar la que te dieron.'} Mínimo 8 caracteres.</p>
    ${me.role==='admin' ? '' : '<button class="btn" style="margin-bottom:14px" onclick="keepPassword()">Conservar la contraseña actual</button>'}
    <div class="field"><label>Contraseña actual (la que te dieron)</label><input type="password" id="fc-current" autocomplete="current-password"></div>
    <div class="field"><label>Nueva contraseña</label><input type="password" id="fc-new" autocomplete="new-password"></div>
    <div class="field"><label>Repetí la nueva contraseña</label><input type="password" id="fc-confirm" autocomplete="new-password"></div>
    <p class="demo-note" id="fc-error" style="display:none;color:var(--shu-deep);"></p>
    <div class="modal-actions">
      <button class="btn" onclick="logout()">Salir</button>
      <button class="btn btn-dark" onclick="saveForcedPassword()">Guardar y entrar</button>
    </div>
  `, {locked:true});
}
async function saveForcedPassword(){
  const current = document.getElementById('fc-current').value;
  const next = document.getElementById('fc-new').value;
  const errEl = document.getElementById('fc-error');
  errEl.style.display = 'none';
  const fail = msg=>{ errEl.textContent = msg; errEl.style.display = 'block'; };
  if(!current || !next) return fail('Completá todos los campos.');
  if(next!==document.getElementById('fc-confirm').value) return fail('La nueva contraseña no coincide con la confirmación.');
  try{
    me = await api('POST', '/auth/change-password', {current, next});
  }catch(e){ if(e instanceof ApiError) return fail(e.message); throw e; }
  modalLocked = false; closeModal();
  toast('Contraseña actualizada.');
  await enterApp();
}
async function keepPassword(){
  me = await api('POST', '/auth/keep-password', {});
  modalLocked = false; closeModal();
  await enterApp();
}
function openForgotPassword(){
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">¿Olvidaste tu contraseña?</h3>
    <p style="font-size:13.5px;color:var(--ink-soft);line-height:1.6;margin-top:0">
      Por seguridad, la contraseña solo puede restablecerla el Sensei. Pedíselo en el dojo: te va a dar una contraseña temporal
      y el sistema te va a pedir elegir una nueva apenas ingreses.
    </p>
    <div class="modal-actions"><button class="btn btn-dark" onclick="closeModal()">Entendido</button></div>
  `);
}


function openResetPasswordModal(id){
  const s = students.find(x=>x.id===id);
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Restablecer contraseña</h3>
    <p style="font-size:13.5px;color:var(--ink-soft);line-height:1.6;">
      Para <strong>${esc(s.name)}</strong> (usuario: ${esc(s.username)}). Su contraseña actual dejará de funcionar y se cerrarán sus sesiones abiertas. Al ingresar con la nueva, el sistema le pregunta si quiere cambiarla o conservarla.
    </p>
    <div class="field"><label>Contraseña temporal</label><input type="text" id="rp-new" placeholder="Dejá vacío para usar la contraseña inicial del dojo" autocomplete="off"></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-dark" onclick="confirmResetPassword('${id}')">Restablecer</button>
    </div>
  `);
}
async function confirmResetPassword(id){
  const s = students.find(x=>x.id===id);
  const typed = document.getElementById('rp-new').value.trim();
  const r = await api('POST', `/students/${id}/reset-password`, typed ? {password:typed} : {});
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Contraseña restablecida</h3>
    <p style="font-size:13.5px;color:var(--ink-soft);line-height:1.6;">
      Contraseña temporal para <strong>${esc(s.name)}</strong> (usuario: <strong>${esc(r.username)}</strong>):
    </p>
    <p class="pw-box">${esc(r.password)}</p>
    <p class="hint">Comunicásela por un medio seguro. No queda guardada en ningún lado — solo se muestra esta vez. Al ingresar, el sistema le va a pedir elegir una propia.</p>
    <div class="modal-actions">
      <button class="btn btn-dark" onclick="closeModal()">Listo</button>
    </div>
  `);
}
/* ============================================================
   BRANDING (logo)
============================================================ */
function brandInnerHTML(){
  if(schoolLogo) return `<img src="${esc(schoolLogo)}" alt="Logo"><span>SHURI-TE KAN</span>`;
  return `<div class="dot"></div><span>SHORIN-RYU · SHURI-TE KAN</span>`;
}
function refreshBranding(){
  const lb = document.getElementById('login-brandmark'); if(lb) lb.innerHTML = brandInnerHTML();
  const sb = document.querySelector('.sidebar .brand');
  if(sb) sb.innerHTML = schoolLogo ? `<img src="${esc(schoolLogo)}" style="height:26px;max-width:150px;object-fit:contain">` : `<div class="dot"></div><span>Shuri-te Kan</span>`;
  document.querySelectorAll('img[data-logo]').forEach(img=>{
    if(schoolLogo){ img.src = schoolLogo; img.hidden = false; } else { img.hidden = true; img.removeAttribute('src'); }
  });
}
/* ============================================================
   SHELL / NAV
============================================================ */
const adminNav = [
  {id:'resumen', label:'Resumen', group:'Gestión diaria'},
  {id:'alumnos', label:'Alumnos', group:'Gestión diaria'},
  {id:'asistencia', label:'Asistencia', group:'Gestión diaria'},
  {id:'pagos', label:'Cuotas y pagos', group:'Gestión diaria'},
  {id:'alquiler', label:'Gastos', group:'Gestión diaria'},
  {id:'programas', label:'Programas', group:'Enseñanza'},
  {id:'cinturones', label:'Cinturones', group:'Enseñanza'},
  {id:'cronograma', label:'Cronograma y actividades', group:'Enseñanza'},
  {id:'diplomas', label:'Diplomas', group:'Enseñanza'},
  {id:'biblioteca', label:'Biblioteca', group:'Comunidad'},
  {id:'foro', label:'Foro', group:'Comunidad'},
  {id:'inscripcion', label:'Ficha de inscripción', group:'Comunidad'},
  {id:'configuracion', label:'Configuración', group:'Sistema'},
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
const grantableModules = instructorNav.concat([
  {id:'programas', label:'Programas'},
  {id:'cinturones', label:'Cinturones'},
]);
const permModuleLabels = {biblioteca:'Biblioteca', asistencia:'Asistencia', pagos:'Cuotas y pagos', programas:'Programas', cinturones:'Cinturones'};
function modulePerm(moduleId){
  if(currentRole==='admin') return 'write';
  return (me && me.modules && me.modules[moduleId]) || 'none';
}
function canWriteModule(moduleId){ return modulePerm(moduleId)==='write'; }
function activeNav(){
  if(currentRole==='admin') return adminNav;
  return grantableModules.filter(n=>modulePerm(n.id)!=='none');
}
function activeStudent(){
  if(currentRole==='admin' || !me) return null;
  return students.find(x=>x.id===me.studentId) || null;
}
function renderShell(){
  const nav = activeNav();
  const sidebar = document.getElementById('sidebar');
  let who;
  if(currentRole==='admin') who = {name:'Sensei — Administrador', sub:'Todos los dojos'};
  else if(currentRole==='instructor'){ const s = activeStudent(); who = {name:esc(s.name), sub:'Instructor · ' + esc(dojoName(s.dojo))}; }
  else { const s = activeStudent(); who = {name:esc(s.name), sub:'Cinturón ' + esc(beltById(s.belt).name)}; }

  sidebar.innerHTML = `
    <div class="brand">${schoolLogo ? `<img src="${esc(schoolLogo)}" style="height:26px;max-width:150px;object-fit:contain">` : '<div class="dot"></div><span>Shuri-te Kan</span>'}</div>
    <div class="nav-scroll">${nav.map((n,i)=>`${n.group && n.group!==(nav[i-1]||{}).group ? `<div class="nav-group">${n.group}</div>` : ''}<div class="nav-item ${i===0?'active':''}" data-nav="${n.id}" onclick="showPanel('${n.id}', this)">${n.label}</div>`).join('')}</div>
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

function slugifyUsername(name){
  return normalizeText(name).replace(/[^a-z0-9\s]/g,'').trim().split(/\s+/).join('.');
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
  const cm = me.serverToday.slice(0,7);
  const cmLabel = monthLabel(cm).split(' ')[0].toLowerCase();
  const activos = students.filter(s=>s.status==='activo');
  const pendientes = payments.filter(p=>p.status==='pendiente' && p.periodMonth===cm).length;
  const enRevision = payments.filter(p=>p.status==='revision').length;
  const cobradoMes = payments.filter(p=>p.status==='pagada' && (p.paidOn||'').startsWith(cm)).reduce((a,p)=>a+p.amount,0);
  const gastadoMes = expenses.filter(e=>e.status==='pagado' && (e.paidOn||'').startsWith(cm)).reduce((a,e)=>a+e.amount,0);
  const gastosPendientes = expenses.filter(e=>e.status==='pendiente').reduce((a,e)=>a+e.amount,0);
  const resultado = cobradoMes - gastadoMes;
  const proximoExamen = events.filter(e=>e.type==='examen' && e.date>=me.serverToday).sort((a,b)=>a.date.localeCompare(b.date))[0];
  document.getElementById('panel-resumen').innerHTML = `
    <div class="main-head"><div><h1>Resumen</h1><p>Un vistazo rápido antes de empezar la clase.</p></div></div>
    <div class="cards-row">
      <div class="stat-card"><div class="num">${activos.length}</div><div class="lbl">Alumnos activos</div></div>
      <div class="stat-card"><div class="num">${pendientes}</div><div class="lbl">Cuotas pendientes (${cmLabel})</div></div>
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
            <tr><td>${esc(s.name)}</td><td>${beltChip(s.belt)}</td><td>${groupLabel(s.group)}</td><td>${esc(dojoName(s.dojo))}</td></tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ${backupReminderHtml()}
    ${readyToExamHtml()}
    <h3 class="serif" style="font-size:15px;margin:24px 0 10px;">Próximos cumpleaños</h3>
    ${upcomingBirthdays().length ? `<div class="home-grid">${upcomingBirthdays().map(u=>`
      <div class="home-card">${avatarHtml(u.s,26)}<strong style="display:inline-block;margin-left:8px;">${esc(u.s.name)}</strong><div class="meta">${u.days===0?'¡Es hoy!':(u.days===1?'Mañana':'En '+u.days+' días')} · ${u.label}</div></div>
    `).join('')}</div>` : '<p style="color:var(--ink-soft);font-size:13.5px;">Nadie cumple años en los próximos 30 días.</p>'}
  `;
}
function backupReminderHtml(){
  const b = backupEmail;
  if(!b) return '';
  if(b.lastError) return `<div class="info-card" style="margin-top:20px;border-left:3px solid var(--shu)"><strong>⚠ El respaldo por correo falló</strong><p style="margin:6px 0 0">${esc(b.lastError)} Revisalo en Configuración.</p></div>`;
  if(!b.enabled) return `<div class="info-card" style="margin-top:20px"><strong>Todavía no tenés respaldo automático</strong><p style="margin:6px 0 0">Activá el envío por correo en Configuración para que tus datos estén a salvo aunque falle el servidor.</p></div>`;
  return '';
}
function monthsBetween(fromIso, toIso){
  if(!fromIso || !toIso) return 0;
  const [fy,fm,fd] = fromIso.split('-').map(Number), [ty,tm,td] = toIso.split('-').map(Number);
  return Math.max(0, (ty-fy)*12 + (tm-fm) - (td<fd ? 1 : 0));
}
// Alumnos que ya cumplen el tiempo y las clases mínimas para el próximo cinturón.
function readyToExam(){
  return students.filter(s=>s.status==='activo' && s.classesSinceBelt!==undefined).map(s=>{
    const list = beltsForGroup(s.group);
    const next = list[list.findIndex(b=>b.id===s.belt)+1];
    if(!next) return null;
    const months = monthsBetween(s.beltSince, me.serverToday);
    return (months>=next.minMonths && s.classesSinceBelt>=next.classesRequired) ? {s, next, months} : null;
  }).filter(Boolean);
}
function readyToExamHtml(){
  const ready = readyToExam();
  return `<h3 class="serif" style="font-size:15px;margin:24px 0 10px;">Listos para rendir (${ready.length})</h3>` + (ready.length ? `<div class="home-grid">${ready.map(x=>`
    <div class="home-card">${avatarHtml(x.s,26)}<strong style="display:inline-block;margin-left:8px;">${esc(x.s.name)}</strong>
      <div class="meta">${esc(beltById(x.s.belt).name)} → ${esc(x.next.name)} · ${x.months} meses · ${x.s.classesSinceBelt} clases</div></div>`).join('')}</div>`
    : '<p style="color:var(--ink-soft);font-size:13.5px;">Nadie cumple todavía el tiempo y las clases mínimas para el próximo cinturón.</p>');
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
  if(!b) return '<span class="belt-chip">—</span>';
  return `<span class="belt-chip">${beltDotHtml(b)}${esc(b.name)}</span>`;
}
/* ============================================================
   ADMIN · ALUMNOS
============================================================ */
let alumnosFilter = {group:'', dojo:'', q:''};
function renderAlumnos(){
  document.getElementById('panel-alumnos').innerHTML = `
    <div class="main-head"><div><h1>Alumnos</h1><p>Ficha, cinturón, grupo, dojo, beca e instructores.</p></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn" onclick="openImportStudents()">Importar planilla</button>
        <button class="btn btn-dark" onclick="openStudentForm()">+ Nuevo alumno</button>
      </div>
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
/* ---------- Importar alumnos desde una planilla (CSV) ---------- */
const IMPORT_COLUMNS = [
  ['name','Nombre','nombre|nombre y apellido|alumno|apellido y nombre'],
  ['group','Grupo','grupo|categoria'],
  ['dojo','Dojo','dojo|sede'],
  ['belt','Cinturón','cinturon|grado'],
  ['phone','Teléfono','telefono|celular|whatsapp'],
  ['guardian','Tutor','tutor|responsable|padre/madre'],
  ['birth','Nacimiento','nacimiento|fecha de nacimiento|fecha nac'],
  ['since','Ingreso','ingreso|fecha de ingreso|en la escuela desde'],
  ['dni','DNI','dni|documento'],
  ['allergies','Alergias','alergias|ficha medica|condiciones medicas'],
  ['emergencyContact','Contacto de emergencia','contacto de emergencia|emergencia'],
  ['emergencyPhone','Teléfono de emergencia','telefono de emergencia|tel emergencia'],
  ['familyGroup','Grupo familiar','grupo familiar|familia'],
];
function parseCsv(text){
  text = text.replace(/^﻿/, '');
  const first = text.split(/\r?\n/)[0] || '';
  const delim = (first.match(/;/g)||[]).length > (first.match(/,/g)||[]).length ? ';' : ',';
  const rows = []; let row = [], cell = '', q = false;
  for(let i=0;i<text.length;i++){
    const c = text[i];
    if(q){
      if(c==='"'){ if(text[i+1]==='"'){ cell += '"'; i++; } else q = false; } else cell += c;
    } else if(c==='"') q = true;
    else if(c===delim){ row.push(cell); cell = ''; }
    else if(c==='\n' || c==='\r'){ if(c==='\r' && text[i+1]==='\n') i++; row.push(cell); cell = ''; if(row.some(x=>x.trim()!=='')) rows.push(row); row = []; }
    else cell += c;
  }
  row.push(cell); if(row.some(x=>x.trim()!=='')) rows.push(row);
  return rows;
}
function downloadImportTemplate(){
  downloadCsv('modelo_importar_alumnos.csv', IMPORT_COLUMNS.map(c=>c[1]), [
    ['Juan Pérez','Adulto','Dojo Central','Blanco','5493415551234','','1990-05-20','2024-03-01','30111222','','',''  ,''],
    ['Sofía López','Infantil','Dojo Norte','','5493415559999','Marta López','15/08/2016','','50222333','Asma','Marta López','5493415559999','Familia López'],
  ]);
}
let importRows = [];
function openImportStudents(){
  importRows = [];
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Importar alumnos desde una planilla</h3>
    <p class="hint" style="margin-top:0">Guardá tu planilla de Excel o Google Sheets como <strong>CSV</strong> (Archivo → Descargar/Guardar como → CSV). La primera fila tiene que tener los nombres de las columnas. Solo es obligatorio <strong>Nombre</strong>, <strong>Grupo</strong> (Adulto/Infantil) y <strong>Dojo</strong>.</p>
    <button class="btn btn-sm" onclick="downloadImportTemplate()">Descargar modelo de planilla</button>
    <div class="field" style="margin-top:14px"><label>Archivo CSV</label><input type="file" id="import-file" accept=".csv,text/csv" onchange="onImportFile(this)"></div>
    <div id="import-preview"></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-dark" id="import-go" onclick="confirmImportStudents()" disabled>Importar</button>
    </div>
  `);
}
function onImportFile(input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e=>{
    const table = parseCsv(String(e.target.result));
    const box = document.getElementById('import-preview');
    if(table.length < 2){ box.innerHTML = '<p class="hint">El archivo no tiene filas de alumnos.</p>'; return; }
    const norm = normalizeText;
    const header = table[0].map(h=>norm(h).trim());
    const colIndex = {};
    IMPORT_COLUMNS.forEach(([key,,aliases])=>{
      const names = aliases.split('|');
      const i = header.findIndex(h=>names.includes(h));
      if(i>=0) colIndex[key] = i;
    });
    if(colIndex.name===undefined){ box.innerHTML = '<p class="hint" style="color:var(--shu-deep)">No encontré la columna "Nombre". Revisá la primera fila de la planilla o usá el modelo.</p>'; return; }
    importRows = table.slice(1).map(r=>{
      const o = {}; Object.keys(colIndex).forEach(k=>{ o[k] = (r[colIndex[k]]||'').trim(); }); return o;
    });
    const missing = IMPORT_COLUMNS.filter(c=>colIndex[c[0]]===undefined).map(c=>c[1]);
    box.innerHTML = `<p style="font-size:13.5px"><strong>${importRows.length}</strong> alumno${importRows.length===1?'':'s'} para importar.${missing.length ? ` <span class="hint">Columnas no encontradas (quedan vacías): ${esc(missing.join(', '))}.</span>` : ''}</p>
      <div class="table-wrap" style="max-height:200px;overflow:auto"><table><thead><tr><th>Nombre</th><th>Grupo</th><th>Dojo</th><th>Cinturón</th></tr></thead><tbody>
      ${importRows.slice(0,8).map(r=>`<tr><td>${esc(r.name)}</td><td>${esc(r.group||'')}</td><td>${esc(r.dojo||'')}</td><td>${esc(r.belt||'')}</td></tr>`).join('')}
      ${importRows.length>8 ? `<tr><td colspan="4" class="hint">… y ${importRows.length-8} más</td></tr>` : ''}</tbody></table></div>`;
    document.getElementById('import-go').disabled = false;
  };
  reader.readAsText(file, 'utf-8');
}
async function confirmImportStudents(){
  const btn = document.getElementById('import-go');
  btn.disabled = true; btn.textContent = 'Importando…';
  let r;
  try{ r = await api('POST', '/students/import', {rows: importRows}); }
  catch(e){ btn.disabled = false; btn.textContent = 'Importar'; throw e; }
  r.students.forEach(st=>upsertById(students, st));
  paintAlumnos();
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Importación terminada</h3>
    <p style="font-size:13.5px;line-height:1.6"><strong>${r.created}</strong> alumno${r.created===1?'':'s'} creado${r.created===1?'':'s'}. Contraseña inicial de todos: <strong>${esc(r.initialPassword)}</strong> (la primera vez eligen cambiarla o conservarla).</p>
    ${r.skipped.length ? `<p style="font-size:13.5px"><strong>${r.skipped.length}</strong> fila${r.skipped.length===1?'':'s'} no se importó:</p>
      <div class="row-menu" style="max-height:200px;overflow-y:auto;">${r.skipped.map(x=>`<div style="padding:8px 4px;border-bottom:1px solid var(--rule);font-size:13px;">Fila ${x.row}${x.name?' · '+esc(x.name):''}: ${esc(x.reason)}</div>`).join('')}</div>
      <p class="hint">Corregí esas filas en la planilla y volvé a importar solo esas: los que ya se crearon no se duplican.</p>` : ''}
    <div class="modal-actions"><button class="btn btn-dark" onclick="closeModal()">Listo</button></div>
  `);
}

function avatarHtml(s, size){
  size = size || 28;
  if(s.photo) return `<img src="${esc(s.photo)}" alt="" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0;">`;
  const initial = (s.name||'?').trim().charAt(0).toUpperCase();
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:var(--shu-tint);color:var(--shu-deep);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${Math.round(size*0.45)}px;flex-shrink:0;">${esc(initial)}</div>`;
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
      <td><div class="name-cell">${avatarHtml(s)}<span>${esc(s.name)}</span></div></td>
      <td>${beltChip(s.belt)}</td>
      <td>${groupLabel(s.group)} · ${esc(dojoName(s.dojo))}</td>
      <td>
        ${s.status==='activo' ? '<span class="tag tag-ok">Activo</span>' : '<span class="tag tag-off">Suspendido</span>'}
        ${s.isInstructor ? '<span class="tag tag-review">Instructor</span>' : ''}
        ${s.scholarship && s.scholarship.active ? '<span class="tag tag-warn">Becado</span>' : ''}
      </td>
      <td>
        <div class="actions-cell">
          <button class="btn-ghost" onclick="openStudentForm('${s.id}')">Editar ficha</button>
          <button class="btn-ghost" onclick="openRowMenu('${s.id}')">Más ▾</button>
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
    <h3 class="serif" style="display:flex;align-items:center;gap:10px;">${avatarHtml(s,32)}${esc(s.name)}</h3>
    ${hasMedInfo ? `
    <div class="info-card" style="margin-bottom:16px;">
      <strong>Ficha médica</strong>
      ${s.allergies ? `<p style="margin:6px 0 0">${esc(s.allergies)}</p>` : ''}
      ${(s.emergencyContact||s.emergencyPhone) ? `<p style="margin:6px 0 0">Emergencia: ${esc(s.emergencyContact||'—')}${s.emergencyPhone?' · '+esc(s.emergencyPhone):''}</p>` : ''}
    </div>
    ` : ''}
    <div class="row-menu">
      <button class="btn-ghost" onclick="closeModal();openActivitiesManager('${id}')">Registrar actividades</button>
      <button class="btn-ghost" onclick="closeModal();openResetPasswordModal('${id}')">Restablecer contraseña</button>
      <button class="btn-ghost" onclick="closeModal();toggleStudentStatus('${id}')">${s.status==='activo'?'Suspender':'Reactivar'}</button>
      <button class="btn-ghost" onclick="closeModal();toggleInstructor('${id}')">${s.isInstructor?'Quitar instructor':'Marcar instructor'}</button>
      <button class="btn-ghost" onclick="closeModal();openScholarshipModal('${id}')">${s.scholarship&&s.scholarship.active?'Editar beca':'Marcar becado'}</button>
      <button class="btn-ghost danger" onclick="closeModal();openDeleteStudentModal('${id}')">Eliminar alumno</button>
    </div>
  `);
}
async function toggleStudentStatus(id){
  const s = students.find(x=>x.id===id);
  const r = await api('POST', `/students/${id}/status`, {status: s.status==='activo' ? 'suspendido' : 'activo'});
  upsertById(students, r.student);
  paintAlumnos();
  toast(r.student.status==='activo' ? `${r.student.name} fue reactivado.` : `${r.student.name} fue suspendido. Sigue en el sistema, pero no puede ingresar ni aparece para tomar asistencia.`);
}
async function toggleInstructor(id){
  const s = students.find(x=>x.id===id);
  const r = await api('POST', `/students/${id}/instructor`, {isInstructor: !s.isInstructor});
  upsertById(students, r.student);
  paintAlumnos();
  toast(r.student.isInstructor ? `${r.student.name} ahora también puede entrar como instructor.` : `${r.student.name} ya no tiene acceso como instructor.`);
}
function openScholarshipModal(id){
  const s = students.find(x=>x.id===id);
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Beca de ${esc(s.name.split(' ')[0])}</h3>
    <div class="checkline"><input type="checkbox" id="sch-active" ${s.scholarship&&s.scholarship.active?'checked':''}> <label for="sch-active">Alumno becado</label></div>
    <div class="field"><label>Valor diferencial de la cuota</label><input type="text" id="sch-amount" value="${s.scholarship?s.scholarship.amount:0}"></div>
    <p class="hint">Este valor reemplaza al de cuota por defecto cuando se registre su pago mensual.</p>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-dark" onclick="saveScholarship('${id}')">Guardar</button>
    </div>
  `);
}
async function saveScholarship(id){
  const r = await api('PUT', `/students/${id}/scholarship`, {
    active: document.getElementById('sch-active').checked,
    amount: document.getElementById('sch-amount').value,
  });
  upsertById(students, r.student);
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
          <div class="logo-preview" id="dc-signature-preview" style="width:120px;height:50px;">${diplomaConfig.signatureImage?`<img src="${esc(diplomaConfig.signatureImage)}" style="width:100%;height:100%;object-fit:contain;">`:'Sin firma'}</div>
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
        <datalist id="cc-student-options">${students.filter(s=>s.status==='activo').map(s=>`<option value="${esc(s.name)}">`).join('')}</datalist>
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
async function saveDiplomaConfig(){
  const num = id=>parseInt(document.getElementById(id).value);
  const r = await api('PUT', '/diplomas/config', {
    style: document.getElementById('dc-style').value,
    paperSize: document.getElementById('dc-paperSize').value,
    titleExamen: document.getElementById('dc-titleExamen').value.trim(),
    introText: document.getElementById('dc-introText').value.trim(),
    bodyExamen: document.getElementById('dc-bodyExamen').value.trim(),
    bodyGeneral: document.getElementById('dc-bodyGeneral').value.trim(),
    titleSize: num('dc-titleSize'), nameSize: num('dc-nameSize'), gradeSize: num('dc-gradeSize'),
    dateSize: num('dc-dateSize'), textSize: num('dc-textSize'),
    showTenure: document.getElementById('dc-showTenure').checked,
    showQr: document.getElementById('dc-showQr').checked,
  });
  diplomaConfig = r.diplomaConfig;
  toast('Configuración de diplomas actualizada.');
}
async function onSignatureSelected(input){
  const file = input.files[0];
  if(!file) return;
  const up = await uploadFile(file, 'signature');
  const r = await api('PUT', '/settings/signature', {fileId: up.id});
  diplomaConfig.signatureImage = r.url;
  document.getElementById('dc-signature-preview').innerHTML = `<img src="${esc(r.url)}" style="width:100%;height:100%;object-fit:contain;">`;
  toast('Firma actualizada.');
}
async function clearSignatureImage(){
  await api('PUT', '/settings/signature', {fileId: null});
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
      <td><button class="btn btn-sm btn-dark" onclick="openDiploma('${r.studentId}','${r.a.id}')">Generar</button></td>
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
async function generateBatchDiplomas(){
  const rows = allDiplomaEligibleRows().filter(r=>diplomaBatchSelection.has(r.studentId+':'+r.a.id));
  if(rows.length===0){ toast('No se encontraron las actividades seleccionadas.'); closeModal(); return; }
  const r = await api('POST', '/diplomas/issue', {items: rows.map(x=>({activityId: x.a.id}))});
  issuedDiplomas.push(...r.issued); nextDiplomaNumber = r.nextDiplomaNumber;
  setPrintPageSize(diplomaConfig.paperSize, 'landscape');
  const pages = rows.map((row,i)=>{
    const s = students.find(x=>x.id===row.studentId);
    const d = r.issued[i];
    const pageBreak = i < rows.length-1 ? 'page-break-after:always;' : '';
    return `<div class="diploma" style="${pageBreak}">${buildDiplomaHtml(s, row.a, {}, d.number, d.verifyCode)}</div>`;
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
    ${editable ? `<td><button class="btn-ghost" onclick="openActivityForm('${a.studentId}','${a.id}')">Editar</button><button class="btn-ghost" onclick="deleteActivity('${a.studentId}','${a.id}')">Eliminar</button></td>` : ''}
  </tr>`;
}
function openActivitiesManager(studentId){
  window.__actManagerStudentId = studentId;
  actFilter = {q:'', type:'', from:'', to:''};
  actSort = {col:'fecha', dir:'desc'};
  const s = students.find(x=>x.id===studentId);
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Actividades de ${esc(s.name)}</h3>
    <button class="btn btn-dark" style="margin-bottom:12px" onclick="openActivityForm('${studentId}')">+ Agregar actividad</button>
    <button class="btn" style="margin-bottom:12px;margin-left:8px" onclick="openStudentActivitiesExport('${studentId}')">Exportar / Descargar</button>
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
    <h3 class="serif">${a?'Editar':'Registrar'} actividad de ${esc(s.name.split(' ')[0])}</h3>
    <div class="field"><label>Tipo de actividad</label>
      <select id="act-type" onchange="onActivityTypeChange()">
        ${activityTypes.map(t=>`<option value="${t.id}" ${(a?a.type:'examen')===t.id?'selected':''}>${t.label}</option>`).join('')}
      </select>
    </div>
    <div id="act-exam-fields" style="display:none">
      <p class="hint" style="margin-top:0">Cinturón actual: ${esc(list[idx].name)}${nextBelt ? ' · próximo: '+esc(nextBelt.name) : ' · ya alcanzó el grado máximo'}</p>
      <div class="field"><label>Cinturón evaluado</label>
        <select id="act-belt">
          ${list.map((b,i)=>`<option value="${b.id}" ${(a&&a.belt ? a.belt===b.id : (nextBelt?b.id===nextBelt.id:i===idx)) ? 'selected':''}>${esc(b.name)}</option>`).join('')}
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
    <div class="field"><label>Nombre o descripción de la actividad</label><input type="text" id="act-title" value="${a?esc(a.activity):''}" placeholder="Ej: Entrenamiento especial con instructor invitado"></div>
    <div class="field"><label>Fecha</label><input type="date" id="act-date" value="${a?a.date:todayIso()}"></div>
    <div class="field"><label>Lugar (opcional)</label><input type="text" id="act-place" value="${a?esc(a.place||''):''}"></div>
    <div class="field"><label>Instructor / organizador (opcional)</label><input type="text" id="act-instructor" value="${a?esc(a.instructor||''):''}"></div>
    <div class="field"><label>Observaciones (opcional)</label><textarea id="act-notes">${a?esc(a.notes||''):''}</textarea></div>
    <div class="modal-actions">
      <button class="btn" onclick="openActivitiesManager('${studentId}')">Cancelar</button>
      <button class="btn btn-dark" onclick="saveActivity('${studentId}'${activityId?`,'${activityId}'`:''})">Guardar</button>
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
async function saveActivity(studentId, activityId){
  const type = document.getElementById('act-type').value;
  const activity = document.getElementById('act-title').value.trim();
  const date = document.getElementById('act-date').value;
  if(!activity){ toast('Escribí el nombre o descripción de la actividad.'); return; }
  if(!date){ toast('Elegí la fecha.'); return; }
  const record = {
    studentId, type, activity, date,
    place: document.getElementById('act-place').value.trim(),
    instructor: document.getElementById('act-instructor').value.trim(),
    notes: document.getElementById('act-notes').value.trim(),
  };
  if(type==='examen'){
    record.belt = document.getElementById('act-belt').value;
    record.result = document.getElementById('act-result').value;
  }
  const r = activityId ? await api('PUT', '/activities/'+activityId, record) : await api('POST', '/activities', record);
  upsertById(students, r.student);
  paintAlumnos();
  toast(activityId ? 'Actividad actualizada.' : 'Actividad registrada.');
  openActivitiesManager(studentId);
}
async function deleteActivity(studentId, activityId){
  const r = await api('DELETE', '/activities/'+activityId);
  upsertById(students, r.student);
  paintAlumnos();
  toast('Actividad eliminada.');
  paintActivitiesManager(studentId);
}
let pendingStudentPhoto = undefined; // undefined = sin cambios · null = quitar foto · File = foto nueva
function onStudentPhotoSelected(input){
  const file = input.files[0];
  if(!file) return;
  pendingStudentPhoto = file;   // se sube al guardar la ficha
  document.getElementById('sf-photo-preview').innerHTML = `<img src="${URL.createObjectURL(file)}" style="width:100%;height:100%;object-fit:cover;">`;
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
        <div class="logo-preview" id="sf-photo-preview" style="width:64px;height:64px;border-radius:50%;overflow:hidden;">${s&&s.photo?`<img src="${esc(s.photo)}" style="width:100%;height:100%;object-fit:cover;">`:'Sin foto'}</div>
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
        <select id="sf-dojo">${dojos.map(d=>`<option value="${d.id}" ${s&&s.dojo===d.id?'selected':''}>${esc(d.name)}</option>`).join('')}</select>
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
      <div class="field"><label>DNI</label><input type="text" id="sf-dni" value="${s?esc(s.dni||''):''}" ${s?'':'placeholder="Dato de la ficha"'}></div>
      <div class="field"><label>Usuario</label><input type="text" id="sf-username" value="${s?esc(s.username||''):''}" placeholder="se genera del nombre"></div>
    </div>
    ${!s ? '<p class="hint" style="margin-top:-8px">El Senpai/Kohai ingresa con este usuario y la contraseña inicial del dojo; la primera vez el sistema le pregunta si quiere cambiarla o conservarla. El DNI se guarda solo como dato de la ficha.</p>' : ''}
    ${s ? `
    <div class="field">
      <label>Módulos habilitados</label>
      <div class="checkbox-grid">
        ${grantableModules.map(n=>`
          <label class="check-row"><input type="checkbox" class="sf-module" value="${n.id}" ${(s.enabledModules||[]).includes(n.id)?'checked':''}> ${n.label}</label>
        `).join('')}
      </div>
      <p class="hint" style="margin-top:6px;margin-bottom:0;">Solo el Sensei puede cambiar esto — podés sumarle a ${esc(s.name.split(' ')[0])} módulos que no traiga por defecto (por ej. Asistencia o Cuotas y pagos aunque no sea instructor).</p>
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
      <button class="btn btn-dark" onclick="saveStudentForm(${s?`'${s.id}'`:'null'})">${s?'Guardar cambios':'Dar de alta'}</button>
    </div>
  `);
}
async function saveStudentForm(id){
  const name = document.getElementById('sf-name').value.trim();
  if(!name){ toast('Completá al menos el nombre.'); return; }
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
    dni: document.getElementById('sf-dni').value.trim(),
    username: document.getElementById('sf-username').value.trim(),
  };
  const moduleEls = document.querySelectorAll('.sf-module');
  if(moduleEls.length) data.enabledModules = Array.from(moduleEls).filter(el=>el.checked).map(el=>el.value);
  const permEls = document.querySelectorAll('.sf-perm');
  if(permEls.length){
    const perms = {};
    permEls.forEach(el=>{ perms[el.dataset.mod] = el.value; });
    data.modulePerms = perms;
  }
  const result = id ? await api('PUT', '/students/'+id, data) : await api('POST', '/students', data);
  let student = result.student;
  // La foto es un archivo aparte: primero se sube y después se asigna a la ficha.
  if(pendingStudentPhoto === null && student.photo){
    student = (await api('PUT', '/students/'+student.id, {photoFileId:null})).student;
  } else if(pendingStudentPhoto instanceof File){
    const up = await uploadFile(pendingStudentPhoto, 'student_photo', 'studentId='+student.id);
    student = (await api('PUT', '/students/'+student.id, {photoFileId:up.id})).student;
  }
  upsertById(students, student);
  pendingStudentPhoto = undefined;
  closeModal();
  paintAlumnos();
  if(!id){
    if(result.duplicateName) toast(`Ya había un alumno activo llamado "${name}". Se distinguen por dojo y fecha donde haga falta elegir uno.`);
    showNewStudentCredentials(student, result);
  } else {
    toast(result.usernameChanged ? `${student.name} fue actualizado. Su usuario ahora es "${result.usernameChanged}".` : `${student.name} fue actualizado.`);
  }
}
function showNewStudentCredentials(student, result){
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">${esc(student.name)} fue dado de alta</h3>
    <p style="font-size:13.5px;color:var(--ink-soft);line-height:1.6;">Usuario: <strong>${esc(result.username)}</strong></p>
    <p style="font-size:13.5px;color:var(--ink-soft);line-height:1.6;">Contraseña inicial:</p>
    <p class="pw-box">${esc(result.initialPassword)}</p>
    <p class="hint">La primera vez que ingrese, el sistema le va a preguntar si quiere cambiarla o conservarla.</p>
    <div class="modal-actions"><button class="btn btn-dark" onclick="closeModal()">Listo</button></div>
  `);
}
function openDeleteStudentModal(id){
  const s = students.find(x=>x.id===id);
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Eliminar alumno</h3>
    <p style="font-size:13.5px;color:var(--ink-soft);line-height:1.6;">
      Vas a eliminar a <strong>${esc(s.name)}</strong> del sistema. Esta acción no se puede deshacer.
      Si preferís conservar su historial de pagos y asistencias, usá "Suspender" en lugar de eliminar.
    </p>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-dark" style="background:var(--shu-deep);border-color:var(--shu-deep)" onclick="deleteStudentConfirmed('${id}')">Eliminar definitivamente</button>
    </div>
  `);
}
async function deleteStudentConfirmed(id){
  const s = students.find(x=>x.id===id);
  await api('DELETE', '/students/'+id);
  students = students.filter(x=>x.id!==id);
  payments = payments.filter(x=>x.studentId!==id);
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
  if(currentRole!=='admin' && !canWriteModule('pagos')){ renderMisCuotas('panel-pagos'); return; }
  const periods = Array.from(new Set(payments.map(p=>p.period))).sort((a,b)=>a.localeCompare(b,'es'));
  document.getElementById('panel-pagos').innerHTML = `
    <div class="main-head"><div><h1>Cuotas y pagos</h1><p>Cuotas, adelantos, mesas de examen y cinturones — con medio de pago y recibo.</p></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn" onclick="openDebtorsModal()">Avisar a deudores</button>
        ${currentRole==='admin' ? '<button class="btn" onclick="openGenerateMonthlyModal()">Generar cuotas del mes</button>' : ''}
        <button class="btn btn-dark" onclick="openNewPaymentModal()">+ Registrar pago</button>
      </div>
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
  return new Set(payments.filter(p=>p.status==='pendiente' || p.status==='revision').map(p=>p.studentId));
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
      accion = `<button class="btn btn-sm btn-dark" onclick="openPaymentModal('${p.id}')">Registrar pago</button>${voidBtn(p)}`;
    } else if(p.status==='anulada'){
      estadoTag = '<span class="tag tag-off" title="'+esc(p.voidReason||'')+'">Anulada</span>';
      accion = p.voidReason ? `<span class="hint" style="margin:0">${esc(p.voidReason)}</span>` : '';
    } else if(p.status==='revision'){
      estadoTag = '<span class="tag tag-review">En revisión</span>';
      accion = `${p.proofUrl ? `<a class="btn-ghost" href="${esc(p.proofUrl)}" target="_blank" rel="noopener">Ver comprobante</a>` : ''}<button class="btn btn-sm btn-dark" onclick="confirmProofPayment('${p.id}')">Confirmar pago</button>${currentRole==='admin' ? `<button class="btn-ghost" onclick="rejectProof('${p.id}')">Rechazar</button>` : ''}${voidBtn(p)}`;
    } else {
      estadoTag = `<span class="tag tag-ok">Pagada · ${esc(p.paidOn)}</span>`;
      accion = `<button class="btn-ghost" onclick="openReceiptModal('${p.id}')">Ver recibo</button>${voidBtn(p)}`;
    }
    return `<tr>
      <td>${esc(s.name)}</td><td>${esc(p.concept)}</td><td>${esc(p.period)}</td><td>${fmtMoney(p.amount)}</td>
      <td>${p.status==='pagada' ? `<span class="tag ${p.medium==='Físico'?'tag-warn':'tag-ok'}">${esc(p.medium)}</span>` : (p.status==='revision' ? `<span class="tag tag-review">${esc(p.proofMedium)}</span>` : '—')}</td>
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
    const estado = p.status==='pagada' ? 'Pagada' : (p.status==='revision' ? 'En revisión' : (p.status==='anulada' ? 'Anulada' : 'Pendiente'));
    const medio = p.status==='pagada' ? p.medium : (p.status==='revision' ? p.proofMedium||'' : '');
    return [s.name, p.concept, p.period, fmtMoney(p.amount), medio, estado];
  });
  openExportModal({title:'Informe de cuotas y pagos', periodLabel:pagosPeriodLabel(), headers:header, rows, filenameBase:'cuotas_y_pagos'});
}
function voidBtn(p){
  return currentRole==='admin' ? `<button class="btn-ghost danger" onclick="openVoidModal('${p.id}')">Anular</button>` : '';
}
async function rejectProof(id){
  const r = await api('POST', `/payments/${id}/reject-proof`, {});
  upsertById(payments, r.payment); paintPagos();
  toast('El comprobante se rechazó: la cuota volvió a pendiente y el alumno puede enviarlo de nuevo.');
}
function openVoidModal(id){
  const p = payments.find(x=>x.id===id);
  const s = students.find(x=>x.id===p.studentId);
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Anular ${p.status==='pagada' ? 'pago' : 'registro'}</h3>
    <p style="font-size:13.5px;color:var(--ink-soft);line-height:1.6;margin-top:0">${esc(s.name)} · ${esc(p.concept)} · ${esc(p.period)} · ${fmtMoney(p.amount)}${p.receiptNo ? ' · Recibo '+esc(p.receiptNo) : ''}</p>
    <p class="hint">Se usa para corregir un error de carga. Queda marcado como anulado (con su motivo) y deja de contar en los totales. Después podés registrar el pago correcto.</p>
    <div class="field"><label>Motivo</label><input type="text" id="void-reason" placeholder="Ej: monto mal cargado" maxlength="300"></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-dark" style="background:var(--shu-deep);border-color:var(--shu-deep)" onclick="confirmVoid('${id}')">Anular</button>
    </div>
  `);
}
async function confirmVoid(id){
  const reason = document.getElementById('void-reason').value.trim();
  if(!reason){ toast('Escribí el motivo de la anulación.'); return; }
  const r = await api('POST', `/payments/${id}/void`, {reason});
  upsertById(payments, r.payment);
  closeModal(); paintPagos();
  toast('Registro anulado.');
}
async function confirmProofPayment(paymentId){
  const r = await api('POST', `/payments/${paymentId}/confirm-proof`, {});
  upsertById(payments, r.payment);
  paintPagos();
  openReceiptModal(paymentId, true);
}
function debtorGroups(){
  const by = new Map();
  payments.filter(p=>p.status==='pendiente').forEach(p=>{
    const st = students.find(x=>x.id===p.studentId);
    if(!st || st.status!=='activo') return;
    if(!by.has(st.id)) by.set(st.id, {s:st, items:[], total:0});
    const g = by.get(st.id); g.items.push(p); g.total += p.amount;
  });
  return [...by.values()].sort((a,b)=>a.s.name.localeCompare(b.s.name,'es'));
}
function debtorMessage(g){
  const first = (g.s.guardian || g.s.name).split(' ')[0];
  const lines = g.items.map(p=>`• ${p.concept} (${p.period}): ${fmtMoney(p.amount)}`).join('\n');
  return `Hola ${first}! Te escribimos de ${letterheadConfig.dojoName}. Recordamos que ${g.s.name} tiene pendiente:\n${lines}\nTotal: ${fmtMoney(g.total)}.\nCualquier duda, avisanos. ¡Gracias!`;
}
function openDebtorsModal(){
  const groups = debtorGroups();
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Avisar a deudores</h3>
    <p class="hint" style="margin-top:0">Abre WhatsApp con el mensaje ya escrito para cada alumno con cuotas pendientes. Vos decidís cuándo enviarlo.</p>
    <div class="row-menu" style="max-height:340px;overflow-y:auto;">
      ${groups.length ? groups.map(g=>{
        const phone = String(g.s.phone||'').replace(/\D/g,'');
        return `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 4px;border-bottom:1px solid var(--rule);font-size:13.5px;">
          <div><strong>${esc(g.s.name)}</strong><div class="hint" style="margin:2px 0 0">${g.items.length} pendiente${g.items.length===1?'':'s'} · ${fmtMoney(g.total)}${phone?'':' · sin teléfono'}</div></div>
          ${phone ? `<a class="btn btn-sm btn-dark" style="text-decoration:none" target="_blank" rel="noopener" href="https://wa.me/${phone}?text=${encodeURIComponent(debtorMessage(g))}">WhatsApp</a>` : ''}
        </div>`;
      }).join('') : '<p style="padding:14px 4px;color:var(--ink-soft)">No hay cuotas pendientes. ¡Todos al día!</p>'}
    </div>
    <div class="modal-actions"><button class="btn btn-dark" onclick="closeModal()">Cerrar</button></div>
  `);
}
function openGenerateMonthlyModal(){
  const cm = me.serverToday.slice(0,7);
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Generar cuotas del mes</h3>
    <p class="hint" style="margin-top:0">Crea una cuota pendiente para cada alumno activo que todavía no la tenga en ese mes, con el valor por defecto (o el de su beca). Los que ya tienen su cuota no se duplican.</p>
    <div class="field"><label>Mes</label><input type="month" id="gm-month" value="${cm}"></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-dark" onclick="confirmGenerateMonthly()">Generar</button>
    </div>
  `);
}
async function confirmGenerateMonthly(){
  const month = document.getElementById('gm-month').value;
  if(!month){ toast('Elegí el mes.'); return; }
  const r = await api('POST', '/payments/generate-monthly', {month});
  r.payments.forEach(pay=>upsertById(payments, pay));
  closeModal(); paintPagos();
  toast(r.created ? `Se generaron ${r.created} cuota${r.created===1?'':'s'} pendiente${r.created===1?'':'s'}.` : 'Todos los alumnos activos ya tenían su cuota de ese mes.');
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
  const sch = student.scholarship;
  const base = sch && sch.active ? sch.amount : (student.group==='infantil' ? feeConfig.cuotaInfantil : feeConfig.cuotaAdulto);
  if(tipo==='cuota' || tipo==='adelanto') return base;
  if(tipo==='examen') return feeConfig.examBoard;
  if(tipo==='examen_cinturon') return feeConfig.examBoard + feeConfig.belt;
  if(tipo==='cinturon') return feeConfig.belt;
  if(tipo==='otros') return '';
  return base;
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
  const cm = me.serverToday.slice(0,7);
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Registrar pago</h3>
    <div class="field"><label>Alumno</label>
      <input type="text" id="np-student-input" list="np-student-options" placeholder="Escribí para buscar…" oninput="onNewPaymentChange()" autocomplete="off">
      <datalist id="np-student-options">${activos.map(s=>`<option value="${esc(disambiguatedLabel(s,activos))}">`).join('')}</datalist>
    </div>
    <div class="field"><label>Concepto</label>
      <select id="np-tipo" onchange="onNewPaymentTipoChange()">${feeOptionsHTML('cuota')}</select>
    </div>
    <div class="field" id="np-custom-wrap" style="display:none"><label>Especificar concepto</label><input type="text" id="np-concept-custom" placeholder="Ej: Cena de fin de año"></div>
    <div class="grid2">
      <div class="field"><label>Mes al que corresponde</label><input type="month" id="np-month" value="${cm}" onchange="onNewPaymentMonthChange()"></div>
      <div class="field"><label>Período / referencia (texto del recibo)</label><input type="text" id="np-period" value="${esc(monthLabel(cm))}"></div>
    </div>
    <div class="field"><label>Monto</label><input type="text" id="np-amount"></div>
    <div class="field">
      <label>Medio</label>
      <div class="radio-row">
        <label><input type="radio" name="np-medium" value="Físico" checked onchange="syncMethodOptions('np-method')"><span>Físico</span></label>
        <label><input type="radio" name="np-medium" value="Electrónico" onchange="syncMethodOptions('np-method')"><span>Electrónico</span></label>
      </div>
    </div>
    <div class="field"><label>Detalle</label><select id="np-method"></select></div>
    <p class="hint">Si el alumno ya tiene esa cuota pendiente en el mes elegido, se cobra esa misma (no se duplica).</p>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-dark" onclick="confirmNewPayment()">Confirmar y generar recibo</button>
    </div>
  `);
  syncMethodOptions('np-method');
  onNewPaymentChange();
}
function nextMonthKey(ym){
  const [y,m] = ym.split('-').map(Number);
  return m===12 ? `${y+1}-01` : `${y}-${String(m+1).padStart(2,'0')}`;
}
function onNewPaymentTipoChange(){
  const tipo = document.getElementById('np-tipo').value;
  const cm = me.serverToday.slice(0,7);
  document.getElementById('np-month').value = tipo==='adelanto' ? nextMonthKey(cm) : cm;
  const nextExam = events.filter(e=>e.type==='examen' && e.date>=me.serverToday).sort((a,b)=>a.date.localeCompare(b.date))[0];
  const per = document.getElementById('np-period');
  if(tipo==='examen' || tipo==='examen_cinturon') per.value = nextExam ? 'Mesa de examen — ' + fmtDateEs(nextExam.date) : 'Mesa de examen';
  else if(tipo==='cinturon') per.value = 'Entrega de cinturón';
  else if(tipo==='otros') per.value = '';
  else per.value = monthLabel(document.getElementById('np-month').value);
  onNewPaymentChange();
}
function onNewPaymentMonthChange(){
  const tipo = document.getElementById('np-tipo').value;
  if(tipo==='cuota' || tipo==='adelanto') document.getElementById('np-period').value = monthLabel(document.getElementById('np-month').value);
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
}
async function confirmNewPayment(){
  const student = newPaymentStudent();
  if(!student){ toast('Elegí un alumno de la lista.'); return; }
  const tipo = document.getElementById('np-tipo').value;
  const customConcept = document.getElementById('np-concept-custom').value;
  if(tipo==='otros' && !customConcept.trim()){ toast('Escribí el concepto.'); return; }
  const amount = parseFloat(String(document.getElementById('np-amount').value).replace(',','.'));
  if(!amount || amount<=0 || isNaN(amount)){ toast('El monto tiene que ser un número mayor a cero.'); return; }
  const r = await api('POST', '/payments', {
    studentId: student.id, tipo, customConcept, amount,
    period: document.getElementById('np-period').value.trim(),
    periodMonth: document.getElementById('np-month').value || undefined,
    medium: document.querySelector('input[name="np-medium"]:checked').value,
    method: document.getElementById('np-method').value,
  });
  upsertById(payments, r.payment);
  paintPagos();
  openReceiptModal(r.payment.id, true);
}
function openPaymentModal(paymentId){
  const p = payments.find(x=>x.id===paymentId);
  const s = students.find(x=>x.id===p.studentId);
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Registrar pago</h3>
    <p style="color:var(--ink-soft);font-size:13.5px;margin:0 0 14px;">${esc(s.name)} · ${esc(p.concept)} · ${esc(p.period)}</p>
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
async function confirmPayment(paymentId){
  const amount = parseFloat(String(document.getElementById('pay-amount').value).replace(',','.'));
  if(!amount || amount<=0 || isNaN(amount)){ toast('El monto tiene que ser un número mayor a cero.'); return; }
  const r = await api('POST', `/payments/${paymentId}/pay`, {
    amount,
    medium: document.querySelector('input[name="medium"]:checked').value,
    method: document.getElementById('pay-method').value,
  });
  upsertById(payments, r.payment);
  paintPagos();
  openReceiptModal(paymentId, true);
}
function receiptText(p, s){
  return `${letterheadConfig.dojoName} — Recibo no fiscal ${p.receiptNo}\nAlumno: ${s.name}\nConcepto: ${p.concept}\nPeríodo: ${p.period}\nMonto: ${fmtMoney(p.amount)}\nMedio: ${p.medium} (${p.method})\nFecha de pago: ${p.paidOn}\n¡Gracias!`;
}
function openReceiptModal(paymentId, justPaid){
  const p = payments.find(x=>x.id===paymentId);
  const s = students.find(x=>x.id===p.studentId);
  const waText = encodeURIComponent(receiptText(p,s));
  const waPhone = String(s.phone||'').replace(/\D/g,'');
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">${justPaid ? 'Pago registrado' : 'Recibo'}</h3>
    <p style="color:var(--ink-soft);font-size:13.5px;margin:0;">Comprobante no fiscal, listo para compartir.</p>
    <div class="receipt">
      <div class="rline"><span>Recibo</span><strong>${esc(p.receiptNo)}</strong></div>
      <div class="rline"><span>Alumno</span><strong>${esc(s.name)}</strong></div>
      <div class="rline"><span>Concepto</span><strong>${esc(p.concept)}</strong></div>
      <div class="rline"><span>Período</span><strong>${esc(p.period)}</strong></div>
      <div class="rline"><span>Monto</span><strong>${fmtMoney(p.amount)}</strong></div>
      <div class="rline"><span>Medio</span><strong>${esc(p.medium)} · ${esc(p.method)}</strong></div>
      <div class="rline"><span>Fecha</span><strong>${esc(p.paidOn)}</strong></div>
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="copyReceiptText('${p.id}')">Copiar texto</button>
      <button class="btn" onclick="printReceipt('${p.id}')">Descargar PDF</button>
      <a class="btn btn-dark" style="text-decoration:none;text-align:center" target="_blank" rel="noopener" href="https://wa.me/${waPhone}?text=${waText}">Enviar por WhatsApp</a>
    </div>
  `);
}
function printReceipt(paymentId){
  const p = payments.find(x=>x.id===paymentId);
  const s = students.find(x=>x.id===p.studentId);
  const rows = [
    ['Recibo', p.receiptNo],
    ['Alumno', esc(s.name)],
    ['Concepto', esc(p.concept)],
    ['Período', esc(p.period)],
    ['Monto', fmtMoney(p.amount)],
    ['Medio', esc(p.medium) + ' · ' + esc(p.method)],
    ['Fecha', fmtDateEs(p.paidOn)],
  ];
  exportAsPdf({title:'Recibo de pago', periodLabel:esc(p.period), headers:['Campo','Detalle'], rows, filenameBase:'recibo_'+p.receiptNo});
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
let attendanceToday = new Set();   // presentes de hoy (ids de alumnos)
let attendanceDate = null;         // fecha de "hoy" según el servidor
let attendanceMonths = [];         // meses con clases registradas
let attendanceMonthData = null;    // {month, dates:[...], records:{studentId:[fechas]}}
async function refreshAttendanceToday(){
  const t = await api('GET', '/attendance/today');
  attendanceToday = new Set(t.present); attendanceDate = t.date;
}
async function refreshAttendanceData(){
  const [, m] = await Promise.all([refreshAttendanceToday(), api('GET', '/attendance/months')]);
  attendanceMonths = m.months;
  if(!asistenciaMonth || !attendanceMonths.includes(asistenciaMonth)) asistenciaMonth = attendanceMonths[attendanceMonths.length-1];
  attendanceMonthData = await api('GET', '/attendance?month=' + asistenciaMonth);
}
async function changeAsistenciaMonth(month){
  asistenciaMonth = month;
  attendanceMonthData = await api('GET', '/attendance?month=' + month);
  paintPlanilla();
}
async function renderAsistenciaPanel(){
  const panel = document.getElementById('panel-asistencia');
  if(!panel) return;
  if(!attendanceMonthData) panel.innerHTML = '<div class="loading-note">Cargando asistencia…</div>';
  await refreshAttendanceData();
  paintAsistenciaPanel();
}
function paintAsistenciaPanel(){
  const today = new Date().toLocaleDateString('es-AR', {weekday:'long', day:'numeric', month:'long'});
  if(currentRole!=='admin'){ asistenciaFilter.dojo = activeStudent().dojo; }
  const canWrite = canWriteModule('asistencia');
  document.getElementById('panel-asistencia').innerHTML = `
    <div class="main-head"><div><h1>Asistencia</h1><p>${asistenciaView==='hoy' ? (today[0].toUpperCase()+today.slice(1)+(canWrite?' · tocá cada tarjeta para marcar presente.':' · modo lectura, no podés tomar asistencia.')) : (canWrite?'Planilla del mes · tocá una celda para corregir una presente o una ausente.':'Planilla del mes · modo lectura.')}</p></div>
      <div style="display:flex;gap:10px;">
        ${canWrite ? `<button class="btn" onclick="openAttendanceQr()">Código QR</button>` : ''}
        ${asistenciaView==='hoy' && canWrite ? `<button class="btn btn-dark" onclick="toast('Asistencia de hoy guardada: ' + attendanceToday.size + ' presentes.')">Guardar clase</button>` : ''}
      </div>
    </div>
    <div class="sub-tabs">
      <div class="sub-tab ${asistenciaView==='hoy'?'active':''}" onclick="asistenciaView='hoy';paintAsistenciaPanel();">Clase de hoy</div>
      <div class="sub-tab ${asistenciaView==='planilla'?'active':''}" onclick="asistenciaView='planilla';paintAsistenciaPanel();">Planilla mensual</div>
    </div>
    <div class="toolbar">
      <div class="filters">
        <select onchange="asistenciaFilter.group=this.value;${asistenciaView==='hoy'?'paintAttendance()':'paintPlanilla()'};">
          <option value="">Todos los grupos</option>
          <option value="adulto" ${asistenciaFilter.group==='adulto'?'selected':''}>Adulto</option>
          <option value="infantil" ${asistenciaFilter.group==='infantil'?'selected':''}>Infantil</option>
        </select>
        ${currentRole!=='admin' ? '' : `
        <select onchange="asistenciaFilter.dojo=this.value;${asistenciaView==='hoy'?'paintAttendance()':'paintPlanilla()'};">
          <option value="">Todos los dojos</option>
          ${dojos.map(d=>`<option value="${d.id}" ${asistenciaFilter.dojo===d.id?'selected':''}>${esc(d.name)}</option>`).join('')}
        </select>`}
        ${asistenciaView==='planilla' ? `
        <select onchange="changeAsistenciaMonth(this.value)">
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
function monthsWithClasses(){ return attendanceMonths.length ? attendanceMonths : [currentMonthKey()]; }
function monthLabel(m){
  const [y,mo] = m.split('-');
  const d = new Date(Number(y), Number(mo)-1, 1);
  const s = d.toLocaleDateString('es-AR',{month:'long',year:'numeric'});
  return s[0].toUpperCase()+s.slice(1);
}
function classDatesInMonth(month){
  return attendanceMonthData && attendanceMonthData.month===month ? attendanceMonthData.dates : [];
}
function paintPlanilla(){
  const wrap = document.getElementById('sheet-table');
  if(!wrap) return;
  const canWrite = canWriteModule('asistencia');
  const list = students.filter(s=>
    s.status==='activo' &&
    (!asistenciaFilter.group || s.group===asistenciaFilter.group) &&
    (!asistenciaFilter.dojo || s.dojo===asistenciaFilter.dojo)
  );
  const dates = classDatesInMonth(asistenciaMonth);
  const records = (attendanceMonthData && attendanceMonthData.records) || {};
  if(list.length===0){ wrap.innerHTML = ''; wrap.parentElement.innerHTML = '<div class="att-empty">No hay alumnos activos para este filtro.</div>'; return; }
  if(dates.length===0){ wrap.innerHTML = ''; wrap.parentElement.innerHTML = '<div class="att-empty">No hay clases registradas en ese mes todavía.</div>'; return; }
  const fmt = d=>{ const [,mo,da]=d.split('-'); return da+'/'+mo; };
  wrap.innerHTML = `
    <thead><tr><th class="name-col">Alumno</th>${dates.map(d=>`<th>${fmt(d)}</th>`).join('')}</tr></thead>
    <tbody>
      ${list.map(s=>{
        const present = new Set(records[s.id]||[]);
        return `<tr><td class="name-col">${esc(s.name)}</td>${dates.map(d=>{
          const isPresent = present.has(d);
          return `<td class="sheet-cell ${isPresent?'present':'absent'}" ${canWrite?`onclick="toggleSheetCell('${s.id}','${d}')" title="${esc(s.name)} · ${fmt(d)} · tocá para cambiar"`:`style="cursor:default;" title="${esc(s.name)} · ${fmt(d)}"`}>${isPresent?'✓':'—'}</td>`;
        }).join('')}</tr>`;
      }).join('')}
    </tbody>
  `;
}
async function toggleSheetCell(studentId, date){
  const records = attendanceMonthData.records;
  const arr = records[studentId] || (records[studentId] = []);
  const present = arr.indexOf(date) === -1;
  await api('PUT', '/attendance', {studentId, date, present});
  if(present) arr.push(date); else arr.splice(arr.indexOf(date), 1);
  if(date===attendanceDate){ if(present) attendanceToday.add(studentId); else attendanceToday.delete(studentId); }
  paintPlanilla();
}

function openDownloadSheet(){
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Descargar planilla de asistencia</h3>
    <div class="field"><label>Rango</label>
      <select id="dl-mode" onchange="document.getElementById('dl-range-fields').style.display=this.value==='rango'?'block':'none';">
        <option value="mes">Mes seleccionado: ${esc(monthLabel(asistenciaMonth))}</option>
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
async function downloadAttendanceSheet(){
  const mode = document.getElementById('dl-mode').value;
  let data, label;
  if(mode==='rango'){
    const from = document.getElementById('dl-from').value;
    const to = document.getElementById('dl-to').value;
    if(!from || !to || from>to){ toast('Elegí un rango de fechas válido.'); return; }
    data = await api('GET', `/attendance/range?from=${from}&to=${to}`);
    label = `${from}_a_${to}`;
  } else {
    data = {dates: classDatesInMonth(asistenciaMonth), records: (attendanceMonthData && attendanceMonthData.records) || {}};
    label = asistenciaMonth;
  }
  const dates = data.dates;
  const list = students.filter(s=>
    s.status==='activo' &&
    (!asistenciaFilter.group || s.group===asistenciaFilter.group) &&
    (!asistenciaFilter.dojo || s.dojo===asistenciaFilter.dojo)
  );
  if(dates.length===0 || list.length===0){ toast('No hay datos de asistencia para exportar con ese filtro.'); return; }
  const header = ['Alumno', ...dates, 'Total presentes'];
  const rows = list.map(s=>{
    const present = new Set(data.records[s.id]||[]);
    const cells = dates.map(d=>present.has(d)?'1':'0');
    return [s.name, ...cells, String(cells.filter(c=>c==='1').length)];
  });
  downloadCsv(`asistencia_${label}.csv`, header, rows);
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
    const present = attendanceToday.has(s.id);
    const b = beltById(s.belt);
    return `<div class="att-card ${present?'present':''}" ${canWrite?`onclick="toggleAttendance('${s.id}')"`:'style="cursor:default;"'}>
      <div class="name">${esc(s.name)}</div>
      <div class="belt-line"><span class="belt-chip">${beltDotHtml(b)}${esc(b.name)}</span></div>
      <div class="state">${present ? '✓ Presente' : (canWrite ? 'Tocar para marcar' : '— Ausente')}</div>
    </div>`;
  }).join('');
}
let quickAttFilter = {group:'', dojo:''};
async function toggleAttendance(id){
  const wasPresent = attendanceToday.has(id);
  const repaint = ()=>{
    paintAttendanceGrid('att-grid', asistenciaFilter);
    paintAttendanceGrid('att-grid-modal', quickAttFilter);
    const counter = document.getElementById('quick-att-count');
    if(counter) counter.textContent = attendanceToday.size;
  };
  // Se refleja al instante y se guarda en el servidor; si falla, se deshace.
  if(wasPresent) attendanceToday.delete(id); else attendanceToday.add(id);
  repaint();
  try{
    await api('PUT', '/attendance', {studentId:id, date:attendanceDate, present:!wasPresent});
  }catch(e){
    if(wasPresent) attendanceToday.add(id); else attendanceToday.delete(id);
    repaint();
    throw e;
  }
  if(attendanceMonthData && attendanceDate && attendanceMonthData.month===attendanceDate.slice(0,7)){
    const arr = attendanceMonthData.records[id] || (attendanceMonthData.records[id] = []);
    const i = arr.indexOf(attendanceDate);
    if(!wasPresent && i===-1) arr.push(attendanceDate);
    if(wasPresent && i>-1) arr.splice(i,1);
    if(!wasPresent && !attendanceMonthData.dates.includes(attendanceDate)) attendanceMonthData.dates.push(attendanceDate);
  }
}
async function openQuickAttendance(){
  await refreshAttendanceToday();
  quickAttFilter = {group:'', dojo: currentRole!=='admin' ? activeStudent().dojo : ''};
  const today = new Date().toLocaleDateString('es-AR', {weekday:'long', day:'numeric', month:'long'});
  showModal(`
    <h3>Tomar asistencia — clase de hoy</h3>
    <p style="margin:-6px 0 14px;color:var(--ink-soft);font-size:13px">${today[0].toUpperCase()+today.slice(1)} · tocá cada tarjeta para marcar presente · <span id="quick-att-count">${attendanceToday.size}</span> presentes</p>
    <div class="toolbar" style="margin-bottom:12px">
      <div class="filters">
        <select onchange="quickAttFilter.group=this.value;paintAttendanceGrid('att-grid-modal',quickAttFilter);">
          <option value="">Todos los grupos</option>
          <option value="adulto">Adulto</option>
          <option value="infantil">Infantil</option>
        </select>
        ${currentRole!=='admin' ? '' : `
        <select onchange="quickAttFilter.dojo=this.value;paintAttendanceGrid('att-grid-modal',quickAttFilter);">
          <option value="">Todos los dojos</option>
          ${dojos.map(d=>`<option value="${d.id}">${esc(d.name)}</option>`).join('')}
        </select>`}
      </div>
    </div>
    <div class="attendance-grid" id="att-grid-modal" style="max-height:48vh;overflow:auto;"></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cerrar</button>
      <button class="btn btn-dark" onclick="toast('Asistencia de hoy guardada: ' + attendanceToday.size + ' presentes.');closeModal();">Guardar clase</button>
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
async function saveProgramEditor(beltId){
  const lines = document.getElementById('prog-text').value.split('\n').map(l=>l.trim()).filter(Boolean);
  const r = await api('PUT', '/programs/'+beltId, {items: lines});
  programs[beltId] = r.items;
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
            <span class="name">${esc(b.name)}${kyu?` <span class="tag tag-off">${kyu}º Kyu</span>`:''}</span>
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
async function saveNewBelt(group){
  const name = document.getElementById('nb-name').value.trim();
  if(!name){ toast('El cinturón necesita un nombre.'); return; }
  const r = await api('POST', '/belts', {
    name, group,
    color: document.getElementById('nb-color').value,
    after: parseInt(document.getElementById('nb-after').value),
    minMonths: Math.max(0, parseInt(document.getElementById('nb-months').value)||0),
    classesRequired: Math.max(0, parseInt(document.getElementById('nb-classes').value)||0),
    kyu: document.getElementById('nb-kyu').checked,
  });
  belts = r.belts; programs = Object.assign(programs, r.programs);
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
    <div class="field"><label>Nombre</label><input type="text" id="bf-name" value="${esc(b.name)}"></div>
    <div class="field"><label>Tiempo mínimo en el cinturón anterior (meses)</label><input type="number" id="bf-months" value="${b.minMonths}" min="0"></div>
    <div class="field"><label>Clases mínimas desde el cinturón anterior</label><input type="number" id="bf-classes" value="${b.classesRequired}" min="0"></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-dark" onclick="saveBeltForm('${id}')">Guardar</button>
    </div>
  `);
}
async function saveBeltForm(id){
  const name = document.getElementById('bf-name').value.trim();
  if(!name){ toast('El cinturón necesita un nombre.'); return; }
  const r = await api('PUT', '/belts/'+id, {
    name,
    minMonths: Math.max(0, parseInt(document.getElementById('bf-months').value)||0),
    classesRequired: Math.max(0, parseInt(document.getElementById('bf-classes').value)||0),
  });
  belts = r.belts;
  closeModal();
  renderCinturones();
  toast('Cinturón actualizado.');
}
function openDeleteBeltModal(id){
  const b = beltById(id);
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Eliminar cinturón</h3>
    <p style="font-size:13.5px;color:var(--ink-soft);line-height:1.6;">
      Vas a eliminar <strong>${esc(b.name)}</strong> (${groupLabel(b.group)}) del programa de graduación. Esta acción no se puede deshacer.
    </p>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-dark" style="background:var(--shu-deep);border-color:var(--shu-deep)" onclick="deleteBeltConfirmed('${id}')">Eliminar definitivamente</button>
    </div>
  `);
}
async function deleteBeltConfirmed(id){
  const b = beltById(id);
  try{
    const r = await api('DELETE', '/belts/'+id);
    belts = r.belts; programs = r.programs;
  }catch(e){
    if(!(e instanceof ApiError) || e.status!==409) throw e;
    // En uso: se explica quiénes lo tienen asignado.
    const names = e.data.inUseNames;
    showModal(`
      <button class="close-x" onclick="closeModal()">✕</button>
      <h3 class="serif">No se puede eliminar</h3>
      <p style="font-size:13.5px;color:var(--ink-soft);line-height:1.6;">${esc(e.message)}${names ? ` (${esc(names.join(', '))})` : ''}</p>
      <div class="modal-actions"><button class="btn btn-dark" onclick="closeModal()">Entendido</button></div>
    `);
    return;
  }
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
  document.getElementById('schedule-list').innerHTML = schedule.length ? `<div class="sched-list">${schedule.map(s=>`
    <div class="sched-item">
      <div class="day">${esc(s.day)}</div>
      <div class="details">${esc(s.details)}</div>
      <button class="btn-ghost" onclick="openScheduleForm('${s.id}')">Editar</button>
      <button class="btn-ghost" onclick="deleteScheduleItem('${s.id}')">Eliminar</button>
    </div>
  `).join('')}</div>` : '<p style="color:var(--ink-soft);font-size:13.5px;">Todavía no hay clases cargadas.</p>';
}
function openScheduleForm(id){
  const editing = !!id;
  const s = editing ? schedule.find(x=>x.id===id) : {day:'Lun', details:''};
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
      <button class="btn btn-dark" onclick="saveScheduleItem(${editing?`'${id}'`:'null'})">Guardar</button>
    </div>
  `);
}
async function saveScheduleItem(id){
  const day = document.getElementById('sch-day').value;
  const details = document.getElementById('sch-details').value.trim();
  if(!details){ toast('Completá el detalle de la clase.'); return; }
  const r = id ? await api('PUT', '/schedule/'+id, {day, details}) : await api('POST', '/schedule', {day, details});
  schedule = r.schedule;
  closeModal();
  paintSchedule();
  toast('Horario actualizado.');
}
async function deleteScheduleItem(id){
  schedule = (await api('DELETE', '/schedule/'+id)).schedule;
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
async function saveEvent(){
  const type = document.getElementById('ev-type').value;
  const title = document.getElementById('ev-title').value.trim();
  const date = document.getElementById('ev-date').value;
  const notes = document.getElementById('ev-notes').value.trim();
  if(!title || !date){ toast('Completá el título y la fecha.'); return; }
  events = (await api('POST', '/events', {type, title, date, notes})).events;
  closeModal();
  renderCronograma();
  toast('Actividad agregada al cronograma.');
}
async function deleteEvent(id){
  events = (await api('DELETE', '/events/'+id)).events;
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
      <td>${esc(e.date)}</td>
      <td>${fmtMoney(e.amount)}</td>
      <td>${e.status==='pagado' ? `<span class="tag tag-ok">Pagado · ${esc(e.paidOn)}</span>` : '<span class="tag tag-warn">Pendiente</span>'}</td>
      <td>${e.status==='pendiente' ? `<button class="btn btn-sm btn-dark" onclick="openExpensePaymentModal('${e.id}')">Registrar pago</button>` : ''}<button class="btn-ghost" onclick="openEditExpense('${e.id}')">Editar</button><button class="btn-ghost danger" onclick="openDeleteExpense('${e.id}')">Eliminar</button></td>
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
async function saveNewExpense(){
  const concept = document.getElementById('ex-concept').value.trim();
  const amount = parseFloat(String(document.getElementById('ex-amount').value).replace(',','.'));
  if(!concept){ toast('Completá el concepto.'); return; }
  if(!amount || amount<=0 || isNaN(amount)){ toast('El monto tiene que ser un número mayor a cero.'); return; }
  const r = await api('POST', '/expenses', {
    category: document.getElementById('ex-category').value, concept, amount,
    date: document.getElementById('ex-date').value, status: document.getElementById('ex-status').value,
  });
  expenses.push(r.expense);
  closeModal(); paintExpenses();
  toast('Gasto registrado.');
}
function openEditExpense(id){
  const e = expenses.find(x=>x.id===id);
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Editar gasto</h3>
    <div class="field"><label>Categoría</label><select id="ee-category">${expenseCategories.map(c=>`<option ${c===e.category?'selected':''}>${esc(c)}</option>`).join('')}</select></div>
    <div class="field"><label>Concepto / descripción</label><input type="text" id="ee-concept" value="${esc(e.concept)}"></div>
    <div class="grid2">
      <div class="field"><label>Monto</label><input type="text" id="ee-amount" value="${e.amount}"></div>
      <div class="field"><label>Fecha</label><input type="date" id="ee-date" value="${esc(e.date)}"></div>
    </div>
    <div class="field"><label>Estado</label><select id="ee-status"><option value="pagado" ${e.status==='pagado'?'selected':''}>Pagado</option><option value="pendiente" ${e.status==='pendiente'?'selected':''}>Pendiente de pago</option></select></div>
    <div class="modal-actions"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn btn-dark" onclick="saveEditExpense('${id}')">Guardar</button></div>
  `);
}
async function saveEditExpense(id){
  const concept = document.getElementById('ee-concept').value.trim();
  const amount = parseFloat(String(document.getElementById('ee-amount').value).replace(',','.'));
  if(!concept){ toast('Completá el concepto.'); return; }
  if(!amount || amount<=0 || isNaN(amount)){ toast('El monto tiene que ser un número mayor a cero.'); return; }
  const old = expenses.find(x=>x.id===id);
  const status = document.getElementById('ee-status').value;
  const r = await api('PUT', '/expenses/'+id, {
    category: document.getElementById('ee-category').value, concept, amount, date: document.getElementById('ee-date').value,
    status, paidOn: old.paidOn,
  });
  upsertById(expenses, r.expense);
  closeModal(); paintExpenses();
  toast('Gasto actualizado.');
}
function openDeleteExpense(id){
  const e = expenses.find(x=>x.id===id);
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Eliminar gasto</h3>
    <p style="font-size:13.5px;color:var(--ink-soft);line-height:1.6;">Vas a eliminar <strong>${esc(e.concept)}</strong> (${fmtMoney(e.amount)}). Esta acción no se puede deshacer.</p>
    <div class="modal-actions"><button class="btn" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-dark" style="background:var(--shu-deep);border-color:var(--shu-deep)" onclick="confirmDeleteExpense('${id}')">Eliminar definitivamente</button></div>
  `);
}
async function confirmDeleteExpense(id){
  await api('DELETE', '/expenses/'+id);
  expenses = expenses.filter(x=>x.id!==id);
  closeModal(); paintExpenses();
  toast('Gasto eliminado.');
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
async function confirmExpensePayment(id){
  const amount = parseFloat(String(document.getElementById('ex-pay-amount').value).replace(',','.'));
  if(!amount || amount<=0 || isNaN(amount)){ toast('El monto tiene que ser un número mayor a cero.'); return; }
  const r = await api('POST', `/expenses/${id}/pay`, {amount, paidOn: document.getElementById('ex-pay-date').value});
  upsertById(expenses, r.expense);
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
const kyuKanji = {1:'一級',2:'二級',3:'三級',4:'四級',5:'五級',6:'六級',7:'七級',8:'八級',9:'九級',10:'十級'};
const danKanji = {1:'初段',2:'弐段',3:'参段',4:'四段',5:'五段',6:'六段',7:'七段',8:'八段',9:'九段',10:'十段'};
let letterheadConfig = {
  dojoName: 'Shuri-te Kan', subtitle: 'Karate-Do Shorin-ryu (Kobayashi-ryu) y Kobudo',
  address:'', phone:'', whatsapp:'', email:'', website:'', social:'', extraText:'',
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
async function saveThemeColors(){
  const body = {};
  Object.keys(themeColors).forEach(k=>{ body[k] = document.getElementById('theme-'+k).value; });
  const r = await api('PUT', '/settings/theme', body);
  Object.assign(themeColors, r.theme);
  applyTheme();
  renderConfiguracion();
  toast('Colores actualizados.');
}
async function resetThemeColors(){
  const r = await api('PUT', '/settings/theme', themeDefaults);
  Object.assign(themeColors, r.theme);
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
async function saveLetterhead(){
  const keys = ['subtitle','address','phone','whatsapp','email','website','social','extraText','instructorName'];
  const body = {show:{}};
  keys.forEach(k=>{
    body[k] = document.getElementById('lh-'+k).value.trim();
    body.show[k] = document.getElementById('lh-show-'+k).checked;
  });
  body.instructorGrade = document.getElementById('lh-instructorGrade').value.trim();
  body.show.instructorGrade = document.getElementById('lh-show-instructorGrade').checked;
  body.dojoName = document.getElementById('lh-dojoName').value.trim();
  body.logoSize = document.getElementById('lh-logoSize').value;
  body.logoPosition = document.getElementById('lh-logoPosition').value;
  const r = await api('PUT', '/settings/letterhead', body);
  letterheadConfig = r.letterhead;
  toast('Membrete actualizado.');
}
function renderConfiguracion(){
  document.getElementById('panel-configuracion').innerHTML = `
    <div class="main-head"><div><h1>Configuración</h1><p>Logo de la escuela y valores por defecto de cuotas, mesas y cinturones.</p></div></div>

    <div class="config-section">
      <h3 class="serif">Mi cuenta (Sensei)</h3>
      <p class="d">Tu usuario y contraseña de acceso administrativo.</p>
      <div class="field"><label>Nombre de usuario</label><input type="text" id="cfg-admin-username" value="${esc(me.username)}" autocomplete="off"></div>
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
        <div class="logo-preview" id="logo-preview">${schoolLogo?`<img src="${esc(schoolLogo)}">`:'Sin logo'}</div>
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
          <div class="logo-preview" id="hero-photo-preview" style="width:120px;height:80px;"><img src="${esc(homeContent.heroPhoto || defaultHeroPhoto)}" style="width:100%;height:100%;object-fit:cover;"></div>
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
      <h3 class="serif">Respaldo automático por correo</h3>
      <p class="d">El sistema se envía solo una copia completa a un correo del dojo. Así, aunque se rompa el servidor, tus datos están a salvo en tu mail.</p>
      ${backupEmailStatusHtml()}
      <div class="checkline"><input type="checkbox" id="be-enabled" ${backupEmail&&backupEmail.enabled?'checked':''}> <label for="be-enabled">Enviar el respaldo automáticamente</label></div>
      <div class="grid2">
        <div class="field"><label>Correo desde el que se envía (Gmail)</label><input type="email" id="be-user" value="${esc(backupEmail?backupEmail.user:'')}" placeholder="dojo@gmail.com" autocomplete="off"></div>
        <div class="field"><label>Contraseña de aplicación</label><input type="password" id="be-pass" placeholder="${backupEmail&&backupEmail.hasPassword?'•••• guardada (dejá vacío para conservarla)':'16 letras que da Google'}" autocomplete="new-password"></div>
        <div class="field"><label>Enviar el respaldo a</label><input type="email" id="be-to" value="${esc(backupEmail?backupEmail.to:'')}" placeholder="Por defecto, el mismo correo" autocomplete="off"></div>
        <div class="field"><label>Frecuencia</label>
          <select id="be-every">${[[1,'Todos los días'],[7,'Una vez por semana'],[30,'Una vez por mes']].map(([d,l])=>`<option value="${d}" ${(backupEmail?backupEmail.everyDays:7)===d?'selected':''}>${l}</option>`).join('')}</select>
        </div>
      </div>
      <details style="margin:4px 0 12px;"><summary class="hint" style="cursor:pointer">Cómo obtener la contraseña de aplicación de Gmail</summary>
        <ol class="hint" style="line-height:1.8;margin:8px 0 0 18px;">
          <li>Entrá a <strong>myaccount.google.com</strong> con el Gmail del dojo → <strong>Seguridad</strong>.</li>
          <li>Activá la <strong>Verificación en dos pasos</strong> (si no la tenés).</li>
          <li>Buscá <strong>"Contraseñas de aplicaciones"</strong> (podés escribirlo en el buscador de la cuenta).</li>
          <li>Poné un nombre, por ejemplo "Shuri-te Kan", y tocá <strong>Crear</strong>.</li>
          <li>Google muestra un código de 16 letras: copialo y pegalo arriba (los espacios no importan). Solo se muestra una vez.</li>
        </ol>
      </details>
      <details style="margin:0 0 12px;"><summary class="hint" style="cursor:pointer">Usar otro proveedor de correo (avanzado)</summary>
        <div class="grid2" style="margin-top:8px;">
          <div class="field"><label>Servidor SMTP</label><input type="text" id="be-host" value="${esc(backupEmail?backupEmail.host:'smtp.gmail.com')}"></div>
          <div class="field"><label>Puerto (465 o 587)</label><input type="text" id="be-port" value="${backupEmail?backupEmail.port:465}"></div>
        </div>
      </details>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn btn-dark" onclick="saveBackupEmail()">Guardar</button>
        <button class="btn" onclick="sendBackupEmailNow()">Enviar respaldo ahora (prueba)</button>
      </div>
      <p class="hint" style="margin-top:10px;margin-bottom:0;">El respaldo lleva datos personales de los alumnos: usá un correo del dojo con verificación en dos pasos. La contraseña se guarda encriptada y no se vuelve a mostrar. Si el respaldo pesa más de 24 MB, se envía solo la base de datos.</p>
    </div>

    <div class="config-section">
      <h3 class="serif">Respaldo de datos</h3>
      <p class="d">Tus datos viven en la base del servidor. Descargá una copia completa (alumnos, pagos, asistencia, fotos, comprobantes y configuración) y guardala en un lugar seguro fuera del servidor. Además, el sistema guarda solo un respaldo por día en el propio servidor.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <button class="btn btn-dark" onclick="downloadBackup()">Descargar respaldo completo (.zip)</button>
        <button class="btn" onclick="downloadDataExport()">Exportar datos legibles (.json)</button>
      </div>
      <p class="hint" style="margin-top:10px;">El respaldo incluye las contraseñas encriptadas y los datos personales de los alumnos: guardalo como guardarías una carpeta con sus fichas.</p>
      <div class="field" style="margin-top:18px;">
        <label>Restaurar desde un respaldo (.zip)</label>
        <input type="file" accept=".zip,application/zip" id="restore-input" onchange="startRestore(this)" style="max-width:300px;">
      </div>
      <p class="hint" style="margin:0;">Restaurar reemplaza TODO lo actual por lo que hay en el respaldo y te pide tu contraseña. Lo anterior queda guardado en el servidor por si te arrepentís.</p>
    </div>
  `;
}
function backupEmailStatusHtml(){
  const b = backupEmail;
  if(!b) return '';
  const fmt = iso=>new Date(iso).toLocaleString('es-AR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  if(b.lastError) return `<div class="info-card" style="margin-bottom:14px;border-left:3px solid var(--shu)"><strong>El último envío falló</strong><p style="margin:6px 0 0">${esc(b.lastError)}</p></div>`;
  if(b.lastOk) return `<div class="info-card" style="margin-bottom:14px"><strong>Último respaldo enviado: ${esc(fmt(b.lastOk))}</strong>${b.lastNote?`<p style="margin:6px 0 0">${esc(b.lastNote)}</p>`:''}</div>`;
  return '<div class="info-card" style="margin-bottom:14px"><strong>Todavía no se envió ningún respaldo por correo.</strong></div>';
}
function backupEmailForm(){
  return {
    enabled: document.getElementById('be-enabled').checked,
    user: document.getElementById('be-user').value.trim(),
    pass: document.getElementById('be-pass').value,
    to: document.getElementById('be-to').value.trim(),
    everyDays: parseInt(document.getElementById('be-every').value),
    host: document.getElementById('be-host').value.trim(),
    port: parseInt(document.getElementById('be-port').value) || 465,
  };
}
async function saveBackupEmail(){
  const r = await api('PUT', '/backup/email', backupEmailForm());
  backupEmail = r.backupEmail;
  renderConfiguracion();
  toast(backupEmail.enabled ? 'Respaldo por correo activado.' : 'Datos del correo guardados (envío automático desactivado).');
}
async function sendBackupEmailNow(){
  await saveBackupEmail();
  toast('Enviando el respaldo… puede tardar unos segundos.');
  try{
    const r = await api('POST', '/backup/email/test', {});
    backupEmail = r.backupEmail;
    renderConfiguracion();
    toast(`Respaldo enviado a ${backupEmail.to || backupEmail.user} (${r.sizeMb<0.1 ? 'menos de 0,1' : String(r.sizeMb).replace('.',',')} MB).`);
  }catch(e){
    if(e instanceof ApiError && e.data && e.data.backupEmail){ backupEmail = e.data.backupEmail; renderConfiguracion(); }
    throw e;
  }
}
function downloadBackup(){
  window.location.href = '/api/backup/download';
  toast('Descargando el respaldo…');
}
function downloadDataExport(){
  window.location.href = '/api/backup/export';
  toast('Descargando los datos…');
}
let pendingRestoreFile = null;
function startRestore(input){
  const file = input.files[0];
  input.value = '';
  if(!file) return;
  pendingRestoreFile = file;
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Restaurar respaldo</h3>
    <p style="font-size:13.5px;color:var(--ink-soft);line-height:1.6;">
      Vas a reemplazar <strong>todos</strong> los datos actuales por los de <strong>${esc(file.name)}</strong>. Todos van a tener que volver a ingresar.
      Lo que hay ahora queda guardado en el servidor (carpeta de respaldos) por si necesitás volver atrás.
    </p>
    <div class="field"><label>Tu contraseña, para confirmar</label><input type="password" id="rs-password" autocomplete="current-password"></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-dark" style="background:var(--shu-deep);border-color:var(--shu-deep)" onclick="confirmRestore()">Restaurar</button>
    </div>
  `);
}
async function confirmRestore(){
  const password = document.getElementById('rs-password').value;
  if(!password){ toast('Escribí tu contraseña para confirmar.'); return; }
  await api('POST', '/backup/restore', pendingRestoreFile, {raw:true, contentType:'application/zip', headers:{'X-Confirm-Password': password}});
  pendingRestoreFile = null;
  resetAppState();
  showModal(`
    <h3 class="serif">Respaldo restaurado</h3>
    <p style="font-size:13.5px;color:var(--ink-soft);line-height:1.6;">Los datos se reemplazaron correctamente. Ingresá de nuevo con las credenciales que tenían en ese respaldo.</p>
    <div class="modal-actions"><button class="btn btn-dark" onclick="location.href='/#login';location.reload()">Ir al ingreso</button></div>
  `, {locked:true});
}

async function onLogoSelected(input){
  const file = input.files[0];
  if(!file) return;
  const up = await uploadFile(file, 'logo');
  const r = await api('PUT', '/settings/logo', {fileId: up.id});
  schoolLogo = r.url;
  document.getElementById('logo-preview').innerHTML = `<img src="${esc(schoolLogo)}">`;
  refreshBranding();
  toast('Logo actualizado.');
}
async function removeLogo(){
  await api('PUT', '/settings/logo', {fileId: null});
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
async function onHeroPhotoSelected(input){
  const file = input.files[0];
  if(!file) return;
  const up = await uploadFile(file, 'hero');
  const r = await api('PUT', '/settings/hero', {fileId: up.id});
  homeContent.heroPhoto = r.url;
  document.getElementById('hero-photo-preview').innerHTML = `<img src="${esc(r.url)}" style="width:100%;height:100%;object-fit:cover;">`;
  toast('Foto de fondo actualizada.');
}
async function resetHeroPhoto(){
  await api('PUT', '/settings/hero', {fileId: null});
  homeContent.heroPhoto = null;
  document.getElementById('hero-photo-preview').innerHTML = `<img src="${defaultHeroPhoto}" style="width:100%;height:100%;object-fit:cover;">`;
  toast('Se restauró la foto original.');
}
async function saveAdminUsername(){
  const val = document.getElementById('cfg-admin-username').value.trim();
  if(!val){ toast('El usuario no puede quedar vacío.'); return; }
  const r = await api('PUT', '/auth/username', {username: val});
  me.username = r.username;
  toast('Usuario del Sensei actualizado.');
}
async function saveFeeConfig(){
  const num = id=>parseFloat(String(document.getElementById(id).value).replace(',','.'));
  const r = await api('PUT', '/settings/fees', {
    cuotaAdulto: num('cfg-cuotaAdulto'), cuotaInfantil: num('cfg-cuotaInfantil'), examBoard: num('cfg-examBoard'), belt: num('cfg-belt'),
  });
  feeConfig = r.fees;
  toast('Valores por defecto actualizados.');
}
async function saveHomeContent(){
  const r = await api('PUT', '/settings/home', {
    heroTitle: document.getElementById('cfg-heroTitle').value.trim(),
    heroLead: document.getElementById('cfg-heroLead').value.trim(),
    nosotrosDesc: document.getElementById('cfg-nosotrosDesc').value.trim(),
    filosofiaText: document.getElementById('cfg-filosofiaText').value.trim(),
    showFilosofia: document.getElementById('cfg-showFilosofia').checked,
    showActivities: document.getElementById('cfg-showActivities').checked,
    showVideo: document.getElementById('cfg-showVideo').checked,
    videoUrl: document.getElementById('cfg-videoUrl').value.trim(),
  });
  homeContent = r.config.home;
  toast('Página pública actualizada.');
}
/* ============================================================
   ADMIN · FICHA DE INSCRIPCIÓN
============================================================ */
function inscripcionUrl(){ return location.origin + '/#inscripcion'; }
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
        <div class="rmeta">${groupLabel(r.group)} · ${esc(dojoName(r.dojo))} · ${esc(r.phone)}${r.dni?' · DNI: '+esc(r.dni):''}${r.guardian?' · Tutor: '+esc(r.guardian):''}</div>
      </div>
      <div>
        <button class="btn btn-sm btn-dark" onclick="approveInscripcion('${r.id}')">Dar de alta</button>
        <button class="btn-ghost btn-sm" style="margin-left:10px" onclick="discardInscripcion('${r.id}')">Descartar</button>
      </div>
    </div>
  `).join('');
}
async function approveInscripcion(id){
  const r = await api('POST', `/inscriptions/${id}/approve`, {});
  pendingInscriptions = pendingInscriptions.filter(x=>x.id!==id);
  upsertById(students, r.student);
  paintInscRequests();
  showNewStudentCredentials(r.student, r);
}
async function discardInscripcion(id){
  await api('DELETE', '/inscriptions/'+id);
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
      <div class="field"><label>Dojo</label><select id="f-dojo">${dojos.map(d=>`<option value="${d.id}">${esc(d.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Teléfono de contacto</label><input id="f-phone" type="tel" placeholder="Con código de área"></div>
      <div class="field"><label>DNI</label><input id="f-dni" type="text" placeholder="Se va a usar para tu contraseña inicial"></div>
      <div class="field"><label>Tutor / contacto de emergencia (si es menor)</label><input id="f-guardian" type="text" placeholder="Opcional"></div>
      <div class="field"><label>Teléfono de emergencia (si es distinto al de contacto)</label><input id="f-emergencyPhone" type="tel" placeholder="Opcional"></div>
      <div class="field"><label>Alergias, condiciones médicas u observaciones</label><textarea id="f-notes" placeholder="Opcional"></textarea></div>
      <input class="hp-field" id="f-website" type="text" tabindex="-1" autocomplete="off" aria-hidden="true">
      <button class="btn-primary" onclick="submitInscripcion(${isPreview?'true':'false'})">Enviar ficha</button>
    </div>
  `;
}
async function submitInscripcion(isPreview){
  const name = cleanText(document.getElementById('f-name').value.trim());
  if(!name){ toast('Completá al menos el nombre para enviar la ficha.'); return; }
  if(isPreview){ closeModal(); toast('Así se ve el formulario. Esta vista previa no envía nada.'); return; }
  const r = await api('POST', '/inscriptions', {
    name,
    birth: document.getElementById('f-birth').value,
    group: document.getElementById('f-group').value,
    dojo: document.getElementById('f-dojo').value,
    phone: cleanText(document.getElementById('f-phone').value.trim()),
    dni: cleanText(document.getElementById('f-dni').value.trim()),
    guardian: cleanText(document.getElementById('f-guardian').value.trim()),
    emergencyPhone: cleanText(document.getElementById('f-emergencyPhone').value.trim()),
    notes: cleanText(document.getElementById('f-notes').value.trim()),
    website: document.getElementById('f-website').value,
  });
  document.getElementById('insc-card').innerHTML = `
    <div class="insc-done">
      <div class="mark">〇</div>
      <h2 class="serif" style="margin:14px 0 6px;">Ficha enviada</h2>
      <p style="color:var(--ink-soft);font-size:14px;line-height:1.6;">Gracias, ${esc(r.firstName || name.split(' ')[0])}. El dojo se va a comunicar para coordinar tu primera clase.</p>
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
function canEditLibrary(){ return currentRole==='admin' || canWriteModule('biblioteca'); }
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
async function saveGlossary(){
  const term = document.getElementById('g-term').value.trim();
  const def = document.getElementById('g-def').value.trim();
  if(!term||!def){ toast('Completá término y definición.'); return; }
  const r = await api('POST', '/library/glossary', {term, def});
  libraryGlossary.push(r.item);
  closeModal(); paintBiblioteca();
}
async function removeGlossary(id){
  await api('DELETE', '/library/glossary/'+id);
  libraryGlossary = libraryGlossary.filter(g=>g.id!==id);
  paintBiblioteca();
}
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
async function saveLink(id){
  const title = document.getElementById('l-title').value.trim();
  const url = document.getElementById('l-url').value.trim();
  const desc = document.getElementById('l-desc').value.trim();
  const type = document.getElementById('l-type').value;
  if(!title||!url){ toast('Completá el texto a mostrar y la URL.'); return; }
  if(!isValidUrl(url)){ toast('La URL no es válida. Tiene que empezar con http:// o https://'); return; }
  const r = id ? await api('PUT', '/library/links/'+id, {title, url, desc, type}) : await api('POST', '/library/links', {title, url, desc, type});
  upsertById(libraryLinks, r.item);
  closeModal(); paintBiblioteca();
  toast(id?'Enlace actualizado.':'Enlace agregado.');
}
async function removeLink(id){
  await api('DELETE', '/library/links/'+id);
  libraryLinks = libraryLinks.filter(l=>l.id!==id);
  paintBiblioteca();
}
/* ============================================================
   FORO
============================================================ */


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
async function publishAnnouncement(){
  const title = document.getElementById('ann-title').value.trim();
  const body = document.getElementById('ann-body').value.trim();
  if(!title || !body){ toast('Completá el título y el texto del anuncio.'); return; }
  const r = await api('POST', '/forum/announcements', {title, body});
  announcements.push(r.item);
  document.getElementById('ann-title').value = '';
  document.getElementById('ann-body').value = '';
  paintAnnouncements();
  toast('Anuncio publicado.');
}
async function removeAnnouncement(id){
  await api('DELETE', '/forum/announcements/'+id);
  announcements = announcements.filter(a=>a.id!==id);
  paintAnnouncements();
}
function paintForum(){
  document.getElementById('forum-list').innerHTML = forumPosts.slice().reverse().map(p=>`
    <div class="forum-post">
      <div class="fh"><span class="fauthor">${esc(p.author)} <span class="frole">${esc(p.role)}</span></span><span class="fdate">${esc(p.date)}</span></div>
      <div class="ftext">${esc(p.text)}</div>
      ${(currentRole==='admin'||currentRole==='instructor') ? `<button class="btn-ghost" style="margin-top:8px" onclick="removeForumPost('${p.id}')">Eliminar</button>` : ''}
    </div>
  `).join('') || '<p style="color:var(--ink-soft);font-size:13.5px;">Todavía no hay publicaciones.</p>';
}
async function publishForum(){
  const text = document.getElementById('forum-text').value.trim();
  if(!text){ toast('Escribí algo antes de publicar.'); return; }
  const r = await api('POST', '/forum/posts', {text});
  forumPosts.push(r.post);
  document.getElementById('forum-text').value = '';
  paintForum();
}
async function removeForumPost(id){
  await api('DELETE', '/forum/posts/'+id);
  forumPosts = forumPosts.filter(p=>p.id!==id);
  paintForum();
}
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
  const classesSince = classesSinceBelt;
  const required = nextBelt ? nextBelt.classesRequired : null;
  const pct = nextBelt ? Math.min(100, Math.round((classesSince/required)*100)) : 100;
  const upcoming = events.slice().sort((a,b)=>a.date.localeCompare(b.date));
  const today = todayIso();
  document.getElementById('panel-mi-programa').innerHTML = `
    <div class="main-head"><div style="display:flex;align-items:center;gap:14px;">${avatarHtml(s,52)}<div><h1 style="margin:0">Mi programa</h1><p style="margin:2px 0 0">Tu cinturón actual y todo lo que ya recorriste antes.</p></div></div>
      <button class="btn btn-dark" onclick="openDigitalCard('${s.id}')">Ver mi carnet</button>
    </div>

    <div class="info-card" style="margin-bottom:20px">
      <strong>${nextBelt ? 'Progreso hacia ' + esc(nextBelt.name) : 'Nivel máximo del programa'}</strong>
      ${nextBelt ? `
        <div class="progress-track" style="margin:10px 0 6px"><div class="progress-fill" style="width:${pct}%;background:${nextBelt.color}"></div></div>
        <p style="margin:0">${classesSince} de ${required} clases desde tu cinturón ${esc(list[idx].name)} (${fmtDateEs(s.beltSince)}).
        ${classesSince>=required ? ' Ya cumplís el mínimo de clases — esperá la próxima convocatoria a mesa de examen.' : ' Te faltan ' + (required-classesSince) + ' clases más para poder rendir.'}</p>
      ` : `<p style="margin:0">Alcanzaste el nivel más alto del programa de cinturones. ¡Felicitaciones!</p>`}
    </div>

    ${visible.slice().reverse().map(b=>`
      <div class="program-block">
        <div class="ph">${beltDotHtml(b)}<strong>${esc(b.name)}</strong>${b.id===s.belt?' <span class="tag tag-ok" style="margin-left:8px">Actual</span>':''}</div>
        <ul>${(programs[b.id]||[]).map(t=>`<li>${esc(t)}</li>`).join('')}</ul>
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
        ${schoolLogo?`<img src="${esc(schoolLogo)}" class="id-card-logo">`:''}
        <div class="id-card-dojo">${esc(letterheadConfig.dojoName)}</div>
      </div>
      ${avatarHtml(s,84)}
      <div class="id-card-name">${esc(s.name)}</div>
      <div class="id-card-belt">${beltDotHtml(b)} ${esc(grad)}</div>
      <div class="id-card-meta">${esc(dojoName(s.dojo))} · Desde ${fmtDateEs(s.since)}</div>
      <div class="id-card-meta">${s.isInstructor?'Instructor · ':''}${groupLabel(s.group)}</div>
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cerrar</button>
      <button class="btn btn-dark" onclick="printDigitalCard('${id}')">Imprimir / Guardar como PDF</button>
    </div>
  `);
}
function printDigitalCard(id){
  setPrintPageSize('A4');
  document.getElementById('print-area').innerHTML = document.getElementById('digital-card').outerHTML;
  setTimeout(()=>window.print(), 80);
}
function buildDiplomaHtml(s, a, overrides, diplomaNumber, verifyCode){
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
    okinawa: `${schoolLogo?`<img src="${esc(schoolLogo)}" class="diploma-watermark">`:''}<span class="diploma-corner-b"></span><span class="diploma-corner-c"></span>`,
    oriental: `<span class="diploma-diamond dd-tl"></span><span class="diploma-diamond dd-tr"></span><span class="diploma-diamond dd-bl"></span><span class="diploma-diamond dd-br"></span>`,
    minimalista: `<span class="diploma-corner-b"></span><span class="diploma-corner-c"></span>`,
    imperial: `<span class="diploma-bracket db-tl"></span><span class="diploma-bracket db-tr"></span><span class="diploma-bracket db-bl"></span><span class="diploma-bracket db-br"></span>`,
    bambu: '',
  };
  const decorations = decorationsByStyle[style] || '';
  const numLine = diplomaNumber ? `<div class="diploma-number">Nº ${String(diplomaNumber).padStart(4,'0')}</div>` : '';
  const qrLine = (diplomaConfig.showQr && diplomaNumber) ? `<div class="diploma-qr" data-verify="${esc(verifyCode || 'VISTA-PREVIA')}"></div>` : '';
  const years = diplomaConfig.showTenure ? yearsBetween(s.since, a.date) : 0;
  const tenureLine = years>=1 ? `<div class="diploma-text" style="position:relative;z-index:1;font-size:${sz.text}px;">en reconocimiento a ${years} año${years===1?'':'s'} de entrenamiento en el dojo</div>` : '';
  const hasCustomExaminer = !!(a.instructor && a.instructor.trim());
  const signerName = hasCustomExaminer ? a.instructor.trim() : (letterheadConfig.instructorName || 'Sensei');
  const signerGrade = hasCustomExaminer ? '' : (letterheadConfig.instructorGrade ? ' — '+esc(letterheadConfig.instructorGrade) : '');
  const signatureImg = (!hasCustomExaminer && diplomaConfig.signatureImage) ? `<img src="${esc(diplomaConfig.signatureImage)}" class="diploma-signature-img">` : '';
  return `
    <div class="${borderClass}">
      ${numLine}
      ${qrLine}
      ${decorations}
      ${schoolLogo?`<img src="${esc(schoolLogo)}" class="diploma-logo" style="position:relative;z-index:1;">`:''}
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
    el.innerHTML = '';
    const url = location.origin + '/#verify-' + el.dataset.verify;
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
    a = {custom:true, id:'custom-'+Date.now(), type, activity:'Examen de '+belt.name, date, place, instructor:'', belt:beltId, result:'aprobado'};
  } else {
    const activity = document.getElementById('cc-activity').value.trim();
    if(!activity){ toast('Describí el motivo o la actividad.'); return; }
    a = {custom:true, id:'custom-'+Date.now(), type, activity, date, place, instructor:''};
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
    <div class="diploma" id="diploma-preview-wrap">${buildDiplomaHtml(s,a,{},nextDiplomaNumber,null)}</div>
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
  document.getElementById('diploma-preview-wrap').innerHTML = buildDiplomaHtml(currentDiplomaStudent, currentDiplomaActivity, diplomaOverridesFromForm(), nextDiplomaNumber, null);
  renderDiplomaQrCodes(document.getElementById('diploma-preview-wrap'));
}
async function printDiploma(){
  const s = currentDiplomaStudent, a = currentDiplomaActivity;
  const size = document.getElementById('dip-size') ? document.getElementById('dip-size').value : diplomaConfig.paperSize;
  const overrides = diplomaOverridesFromForm();
  const item = a.custom
    ? {studentId: s.id || undefined, studentName: s.name, type: a.type, activity: a.activity, date: a.date}
    : {activityId: a.id};
  const r = await api('POST', '/diplomas/issue', {items: [item]});
  const d = r.issued[0];
  issuedDiplomas.push(d); nextDiplomaNumber = r.nextDiplomaNumber;
  setPrintPageSize(size, 'landscape');
  document.getElementById('print-area').innerHTML = `<div class="diploma">${buildDiplomaHtml(s, a, overrides, d.number, d.verifyCode)}</div>`;
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
let misCuotasTarget = 'panel-mis-cuotas';
function renderMisCuotas(targetId){
  const target = targetId || misCuotasTarget;
  misCuotasTarget = target;
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
              <td>${p.status==='pagada' ? esc(p.medium) : (p.status==='revision' ? esc(p.proofMedium) : '—')}</td>
              <td>${p.status==='pagada' ? `<span class="tag tag-ok">Pagada · ${esc(p.paidOn)}</span>` : (p.status==='revision' ? '<span class="tag tag-review">En revisión</span>' : '<span class="tag tag-warn">Pendiente</span>')}</td>
              <td>${p.status==='pendiente' ? `<button class="btn-ghost" onclick="openProofModal('${p.id}')">Compartir comprobante</button>` : ''}</td>
            </tr>
          `).join('') || '<tr><td colspan="6" class="att-empty">Todavía no tenés cuotas registradas.</td></tr>'}
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
    <div class="field"><label>Comprobante (imagen o PDF, hasta 6 MB)</label><input type="file" id="proof-file" accept="image/*,application/pdf"></div>
    <div class="field"><label>Nota (opcional)</label><textarea id="proof-note" placeholder="Ej: transferí desde la cuenta de mi tutor"></textarea></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-dark" onclick="submitProof('${paymentId}')">Enviar comprobante</button>
    </div>
  `);
}
async function submitProof(paymentId){
  const fileInput = document.getElementById('proof-file');
  let fileId = null;
  if(fileInput.files[0]) fileId = (await uploadFile(fileInput.files[0], 'proof')).id;
  const r = await api('POST', `/payments/${paymentId}/proof`, {
    medium: document.getElementById('proof-medium').value,
    note: document.getElementById('proof-note').value.trim(),
    fileId,
  });
  upsertById(payments, r.payment);
  closeModal();
  renderMisCuotas();
  toast('Comprobante enviado. El dojo va a confirmar tu pago.');
}
/* ============================================================
   ALUMNO · MI ASISTENCIA
============================================================ */
async function renderMiAsistencia(){
  const panel = document.getElementById('panel-mi-asistencia');
  if(!panel) return;
  panel.innerHTML = '<div class="loading-note">Cargando…</div>';
  const r = await api('GET', '/attendance/me');
  classesSinceBelt = r.classesSinceBelt;
  panel.innerHTML = `
    <div class="main-head"><div><h1>Mi asistencia</h1><p>Clases a las que asististe en ${esc(monthLabel(r.month))}.</p></div></div>
    <div class="cards-row" style="max-width:520px">
      <div class="stat-card"><div class="num">${r.dates.length}</div><div class="lbl">Clases este mes</div></div>
      <div class="stat-card"><div class="num">${r.classesSinceBelt}</div><div class="lbl">Clases desde tu último cinturón</div></div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Fecha</th><th>Estado</th></tr></thead>
        <tbody>${r.dates.map(d=>`<tr><td>${fmtDateEs(d)}</td><td><span class="tag tag-ok">Presente</span></td></tr>`).join('') || '<tr><td colspan="2" class="att-empty">Todavía no hay clases registradas este mes.</td></tr>'}</tbody>
      </table>
    </div>
  `;
}
/* ============================================================
   HELPERS: modal + toast
============================================================ */
let modalLocked = false;
function showModal(html, opts){
  modalLocked = !!(opts && opts.locked);
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal-overlay').classList.add('active');
}
function closeModal(){
  if(modalLocked) return;
  document.getElementById('modal-overlay').classList.remove('active');
}
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
    document.getElementById('home-video-wrap').innerHTML = `<div class="video-embed"><iframe src="${esc(toEmbedUrl(homeContent.videoUrl.trim()))}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
  }
  paintHomeContact();
  document.getElementById('home-belts').innerHTML = ['infantil','adulto'].map(g=>`
    <p style="font-size:12px;font-weight:700;color:var(--ink-soft);margin:14px 0 2px;text-transform:uppercase;letter-spacing:.06em;">${groupLabel(g)}</p>
    <div class="belt-path">
      ${beltsForGroup(g).map(b=>`<div class="bp-item">${beltDotHtml(b,'bp-dot')}${esc(b.name)}</div>`).join('')}
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
      <strong style="color:#F2E9DD;">${esc(s.day)}</strong><div class="meta" style="color:#C9BBA8;">${esc(s.details)}</div>
    </div>
  `).join('');
}
function paintHomeContact(){
  const lh = letterheadConfig;
  const waDigits = (lh.whatsapp||'').replace(/[^\d]/g,'');
  const webUrl = /^https?:\/\//.test(lh.website||'') ? lh.website : 'https://'+(lh.website||'');
  const items = [
    lh.show.address && lh.address && {label:'Dirección', value:esc(lh.address)},
    lh.show.phone && lh.phone && {label:'Teléfono', value:esc(lh.phone)},
    lh.show.whatsapp && lh.whatsapp && {label:'WhatsApp', value: waDigits.length>=8 ? `<a href="https://wa.me/${waDigits}" target="_blank" rel="noopener">${esc(lh.whatsapp)}</a>` : esc(lh.whatsapp)},
    lh.show.email && lh.email && {label:'Email', value:`<a href="mailto:${esc(lh.email)}">${esc(lh.email)}</a>`},
    lh.show.website && lh.website && {label:'Sitio web', value: `<a href="${esc(webUrl)}" target="_blank" rel="noopener">${esc(lh.website)}</a>`},
    lh.show.social && lh.social && {label:'Redes sociales', value: /^https?:\/\//.test(lh.social) ? `<a href="${esc(lh.social)}" target="_blank" rel="noopener">${esc(lh.social)}</a>` : esc(lh.social)},
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
function handleQrCheckin(token){
  if(!me){
    // Sin sesión: se guarda el código, se pide ingresar y al entrar se marca la presencia sola.
    if(token) sessionStorage.setItem('pendingCheckin', token);
    history.replaceState(null, '', location.pathname + '#login');
    toast('Iniciá sesión para marcar tu presencia.');
    route();
    return;
  }
  history.replaceState(null, '', location.pathname);
  doCheckin(token);
}
async function doCheckin(token){
  if(currentRole==='admin'){ toast('Ingresá como Senpai/Kohai para marcarte presente con este código.'); return; }
  let r;
  try{
    r = await api('POST', '/attendance/checkin', {token});
  }catch(e){
    if(!(e instanceof ApiError)) throw e;
    showModal(`
      <div style="text-align:center;padding:10px 0;">
        <div style="font-size:40px;">✕</div>
        <h3 class="serif" style="margin:10px 0 4px;">No se pudo registrar</h3>
        <p style="color:var(--ink-soft);margin:0;">${esc(e.message)}</p>
        <button class="btn btn-dark" style="margin-top:16px" onclick="closeModal()">Cerrar</button>
      </div>`);
    return;
  }
  if(!r.already) classesSinceBelt++;
  const s = activeStudent();
  showModal(`
    <div style="text-align:center;padding:10px 0;">
      <div style="font-size:40px;">${r.already?'↺':'✓'}</div>
      <h3 class="serif" style="margin:10px 0 4px;">${r.already?'Ya estabas presente':'¡Presente registrado!'}</h3>
      <p style="color:var(--ink-soft);margin:0;">${esc(s.name)} — ${fmtDateEs(r.date)}</p>
      <button class="btn btn-dark" style="margin-top:16px" onclick="closeModal()">Listo</button>
    </div>
  `);
}
async function openAttendanceQr(){
  const t = await api('GET', '/attendance/qr');
  const url = location.origin + '/#checkin-' + t.token;
  showModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 class="serif">Código QR de asistencia</h3>
    <p class="hint" style="margin-top:0">Pegalo en la pared del dojo. Cada alumno lo escanea con su celular (ya logueado) para marcarse presente solo.</p>
    <div id="qr-render" style="display:flex;justify-content:center;padding:16px;background:#fff;border-radius:var(--radius);"></div>
    <p class="hint" style="text-align:center;word-break:break-all;">${esc(url)}</p>
    ${currentRole==='admin' ? `<p class="hint">Si el código se filtró fuera del dojo, generá uno nuevo: el anterior deja de funcionar y hay que volver a imprimirlo.</p>
    <div class="modal-actions"><button class="btn" onclick="rotateQr()">Generar código nuevo</button><button class="btn btn-dark" onclick="window.print()">Imprimir</button></div>` : ''}
  `);
  document.getElementById('qr-render').innerHTML = '';
  new QRCode(document.getElementById('qr-render'), {text:url, width:200, height:200, colorDark:'#211B17', colorLight:'#ffffff'});
}
async function rotateQr(){
  await api('POST', '/attendance/qr/rotate', {});
  toast('Código nuevo generado. Imprimí el QR actualizado.');
  openAttendanceQr();
}
function route(){
  const hash = location.hash;
  if(hash.indexOf('#checkin')===0){ handleQrCheckin(hash.replace(/^#checkin-?/, '')); return; }
  const screens = {home:'home-screen', login:'login-screen', insc:'inscripcion-screen', verify:'verify-screen'};
  const hide = ()=>Object.values(screens).forEach(id=>document.getElementById(id).style.display = 'none');
  const isPublicPage = hash === '#inscripcion' || hash.indexOf('#verify-')===0;
  hide();
  // Con la sesión iniciada se ve el sistema (salvo en las páginas públicas: ficha de inscripción y verificación).
  if(me && !isPublicPage){ document.getElementById('app-shell').style.display = 'block'; return; }
  document.getElementById('app-shell').style.display = 'none';
  if(hash === '#inscripcion'){
    document.getElementById(screens.insc).style.display = 'flex';
    document.getElementById('insc-card').innerHTML = buildInscForm(false);
    window.scrollTo(0,0);
  } else if(hash === '#login'){
    document.getElementById(screens.login).style.display = 'flex';
    window.scrollTo(0,0);
  } else if(isPublicPage){
    document.getElementById(screens.verify).style.display = 'flex';
    renderVerifyScreen(hash.replace('#verify-',''));
    window.scrollTo(0,0);
  } else {
    document.getElementById(screens.home).style.display = 'block';
    renderHome();
  }
}
async function renderVerifyScreen(code){
  const card = document.getElementById('verify-card');
  card.innerHTML = '<div class="loading-note">Verificando…</div>';
  let record = null;
  try{ record = await api('GET', '/public/verify/' + encodeURIComponent(code)); }
  catch(e){ if(!(e instanceof ApiError) || e.status!==404) { card.innerHTML = `<div class="insc-done"><p style="color:var(--ink-soft)">${esc(e.message)}</p></div>`; return; } }
  card.innerHTML = record ? `
    <div class="insc-done">
      <div class="mark">✓</div>
      <h2 class="serif" style="margin:14px 0 6px;">Diploma auténtico</h2>
      <p style="color:var(--ink-soft);font-size:14px;line-height:1.8;text-align:left;">
        <strong>Nº:</strong> ${String(record.number).padStart(4,'0')}<br>
        <strong>Alumno:</strong> ${esc(record.studentName)}<br>
        <strong>Logro:</strong> ${esc(record.activity)} (${esc(activityTypeLabel(record.type))})<br>
        <strong>Fecha:</strong> ${fmtDateEs(record.date)}<br>
        <strong>Emitido por:</strong> ${esc(record.dojoName)}
      </p>
    </div>
  ` : `
    <div class="insc-done">
      <div class="mark" style="color:var(--ink-soft);">✕</div>
      <h2 class="serif" style="margin:14px 0 6px;">No encontrado</h2>
      <p style="color:var(--ink-soft);font-size:14px;line-height:1.6;">No hay ningún diploma registrado con ese código. Revisá que el QR esté completo.</p>
    </div>
  `;
}
window.addEventListener('hashchange', route);

/* En pantallas chicas las tablas se muestran como tarjetas: cada celda lleva el nombre de su columna. */
function labelTables(){
  document.querySelectorAll('.table-wrap table:not(.sheet-table)').forEach(t=>{
    const heads = [...t.querySelectorAll('thead th')].map(th=>th.textContent.replace(/[⇅▲▼]/g,'').trim());
    t.querySelectorAll('tbody tr').forEach(tr=>{
      [...tr.children].forEach((td,i)=>{ if(td.tagName==='TD' && !td.hasAttribute('data-label')) td.setAttribute('data-label', td.colSpan>1 ? '' : (heads[i]||'')); });
    });
    t.classList.add('stack');
  });
}
let labelQueued = false;
new MutationObserver(()=>{ if(labelQueued) return; labelQueued = true; requestAnimationFrame(()=>{ labelQueued = false; labelTables(); }); })
  .observe(document.body, {childList:true, subtree:true});

/* ============================================================
   ARRANQUE
============================================================ */
async function init(){
  applyTheme();
  try{
    await loadPublicConfig();
    const s = await api('GET', '/auth/session');
    if(s.authenticated){ me = s; await enterApp(); }
  }catch(e){
    console.error(e);
    toast(e instanceof ApiError ? e.message : 'No se pudo conectar con el servidor.');
  }
  route();
}
init();
