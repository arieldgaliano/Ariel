# Shuri-te Kan — Sistema de gestión

Alumnos, cuotas y recibos, gastos, asistencia (manual y por QR), programas por cinturón, diplomas con verificación por QR,
biblioteca, foro, ficha de inscripción pública y portada del dojo. Los datos se guardan de verdad: base de datos SQLite
(un solo archivo), fotos y comprobantes como archivos, login con contraseñas encriptadas y permisos verificados en el servidor.

El prototipo original está en `prototipo/dojo.html` (solo de referencia).

## Probarlo en tu computadora
1. Instalá Node.js 22 o más nuevo (https://nodejs.org, versión "LTS").
2. En una terminal, dentro de esta carpeta: `npm install`
3. Datos de ejemplo (opcional, solo para probar): `npm run seed:demo`
   — crea usuarios `sensei`, `martina.suarez`, `ivan.castro`… todos con contraseña `demo1234`.
   Sin esto, el sistema arranca vacío y crea la cuenta del Sensei con `SENSEI_USER` / `SENSEI_PASSWORD`
   (si no las definís, genera una contraseña y la muestra **una sola vez** en la terminal).
4. `npm start` y abrí http://localhost:3000

## Cargar tus alumnos reales de una vez
Alumnos → **Importar planilla**: descargá el modelo, completalo en Excel o Google Sheets, guardalo como CSV y subilo.
Solo son obligatorios Nombre, Grupo (Adulto/Infantil) y Dojo. Las filas con errores se te informan para corregirlas; los alumnos
ya creados no se duplican si volvés a importar.

## Cómo se protegen los datos
- Contraseñas con *scrypt* (nunca en texto plano). Tras 5 intentos fallidos el usuario se bloquea 15 minutos.
- Sesiones por cookie `HttpOnly`; se cierran al suspender a un alumno o cambiar su contraseña.
- **Cada acción se valida en el servidor** según el rol y los módulos que el Sensei habilitó; ocultar un botón es solo estético.
- Contraseña inicial de todo alumno nuevo (o con clave restablecida): `karatedo123` (se cambia con la variable `DEFAULT_STUDENT_PASSWORD`). En el primer ingreso el sistema le pregunta si quiere cambiarla o conservarla.
  Si alguien olvida su clave, el Sensei la restablece (Alumnos → Más ▾ → Restablecer contraseña).
- Fotos y comprobantes: solo los ve quien corresponde. Se valida el contenido real del archivo.

## Respaldos (importante)
- Configuración → **Descargar respaldo completo (.zip)**: base de datos + fotos + comprobantes. Hacelo seguido y guardalo fuera del servidor (tu computadora, Drive).
- El servidor guarda además un respaldo automático por día en `data/backups` (los últimos 14).
- **Respaldo automático por correo:** Configuración → "Respaldo automático por correo". El Sensei carga un Gmail del dojo con una *contraseña de aplicación* (la pantalla explica cómo obtenerla) y el sistema envía el .zip a diario, por semana o por mes. Si falla, avisa en el Resumen. La contraseña se guarda encriptada (llave en `data/secret.key`, o variable `SECRET_KEY`).
- Restaurar: Configuración → "Restaurar desde un respaldo", o por terminal `npm run restore -- archivo.zip` (con el servidor detenido).

## Publicarlo en internet (Docker)
Necesitás un servicio que ejecute Docker o Node **con un disco persistente** (sin disco, se pierden los datos en cada reinicio).
Ejemplos: Railway, Render, Fly.io, o un VPS propio. Pasos generales:
1. Subí este repositorio a ese servicio (usa el `Dockerfile`).
2. Agregá un volumen/disco montado en `/data`.
3. Variables de entorno: `SENSEI_USER`, `SENSEI_PASSWORD` (de al menos 8 caracteres) y `NODE_ENV=production` (ya viene en el Dockerfile).
4. Abrí la dirección pública (HTTPS), ingresá como Sensei y cambiá la contraseña.
Las cookies seguras requieren HTTPS; los servicios mencionados lo dan automáticamente.

## Para quien mantenga el código
- `server/` API (Express 5, `node:sqlite`), `server/migrations/` esquema, `public/` pantalla (HTML/CSS/JS sin build).
- Tests: `npm test` (permisos, login, flujos de cobro, diplomas, respaldo).
- Cambios de esquema: agregar un archivo `server/migrations/002_*.sql`; se aplica solo al arrancar.
