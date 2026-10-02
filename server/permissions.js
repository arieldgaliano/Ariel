'use strict';
const { ApiError, parseJson } = require('./util');

// Módulos que el Sensei puede habilitar a un alumno o instructor.
const GRANTABLE = ['mi-programa', 'mis-cuotas', 'mi-asistencia', 'asistencia', 'pagos', 'biblioteca', 'foro', 'inscripcion', 'programas', 'cinturones'];
// Módulos que admiten "solo lectura" o "lectura y escritura".
const PERM_MODULES = ['biblioteca', 'asistencia', 'pagos', 'programas', 'cinturones'];
const DEFAULT_STUDENT_MODULES = ['mi-programa', 'mis-cuotas', 'mi-asistencia', 'biblioteca', 'foro', 'inscripcion'];
const DEFAULT_INSTRUCTOR_MODULES = ['mi-programa', 'mis-cuotas', 'mi-asistencia', 'asistencia', 'pagos', 'biblioteca', 'foro', 'inscripcion'];

// Reúne qué puede hacer la persona que hace el pedido. Se arma en cada pedido a partir
// de la base de datos, así un cambio de permisos o una suspensión rige de inmediato.
function buildAccess(user, studentRow) {
  const isAdmin = user.role === 'admin';
  const access = { isAdmin, user, studentRow: studentRow || null, studentId: studentRow ? studentRow.id : null };
  if (isAdmin) {
    access.isInstructor = false;
    access.level = () => 'write';
    access.modules = new Set(GRANTABLE);
    return access;
  }
  access.isInstructor = !!studentRow.is_instructor;
  const stored = parseJson(studentRow.enabled_modules, []).filter(m => GRANTABLE.includes(m));
  const enabled = stored.length ? stored : (access.isInstructor ? DEFAULT_INSTRUCTOR_MODULES : DEFAULT_STUDENT_MODULES);
  const perms = parseJson(studentRow.module_perms, {});
  access.modules = new Set(enabled);
  access.level = module => {
    if (!access.modules.has(module)) return 'none';
    // Como en el diseño original: editar la Biblioteca es cosa de instructores; los alumnos solo leen.
    if (module === 'biblioteca' && !access.isInstructor) return 'read';
    if (PERM_MODULES.includes(module)) return perms[module] === 'read' ? 'read' : 'write';
    return 'write';
  };
  return access;
}

const roleName = a => (a.isAdmin ? 'admin' : a.isInstructor ? 'instructor' : 'alumno');

function requireAuth(req, _res, next) {
  if (!req.auth) return next(new ApiError(401, 'Tenés que iniciar sesión.', { code: 'unauthenticated' }));
  next();
}
function requireAdmin(req, _res, next) {
  if (!req.auth) return next(new ApiError(401, 'Tenés que iniciar sesión.', { code: 'unauthenticated' }));
  if (!req.auth.isAdmin) return next(new ApiError(403, 'Solo el Sensei puede hacer esto.'));
  next();
}
// requireModule('pagos', 'write'): exige acceso al módulo con al menos ese nivel.
function requireModule(module, min = 'read') {
  return (req, _res, next) => {
    if (!req.auth) return next(new ApiError(401, 'Tenés que iniciar sesión.', { code: 'unauthenticated' }));
    const level = req.auth.level(module);
    const ok = level === 'write' || (min === 'read' && level === 'read');
    if (!ok) return next(new ApiError(403, 'No tenés permiso para hacer esto.'));
    next();
  };
}
function requireStudent(req, _res, next) {
  if (!req.auth) return next(new ApiError(401, 'Tenés que iniciar sesión.', { code: 'unauthenticated' }));
  if (req.auth.isAdmin) return next(new ApiError(403, 'Ingresá como Senpai/Kohai para hacer esto.'));
  next();
}

module.exports = {
  GRANTABLE, PERM_MODULES, DEFAULT_STUDENT_MODULES, DEFAULT_INSTRUCTOR_MODULES,
  buildAccess, roleName, requireAuth, requireAdmin, requireModule, requireStudent,
};
