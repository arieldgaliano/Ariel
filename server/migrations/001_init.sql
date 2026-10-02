-- Esquema inicial de Shuri-te Kan.
-- Convenciones:
--   * Todos los registros de personas/pagos/etc. usan un ID único universal (UUID) como texto.
--   * Las fechas se guardan como texto ISO 'AAAA-MM-DD'; los instantes como ISO-8601 en UTC.
--   * Los montos se guardan en centavos (enteros) para evitar errores de redondeo.

CREATE TABLE dojos (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE belts (
  id               TEXT PRIMARY KEY,           -- identificador legible, p.ej. 'adulto-verde'
  name             TEXT NOT NULL,
  grp              TEXT NOT NULL CHECK (grp IN ('adulto','infantil')),
  position         INTEGER NOT NULL,
  color            TEXT NOT NULL,
  tip              TEXT,
  tip_count        INTEGER,
  min_months       INTEGER NOT NULL DEFAULT 0,
  classes_required INTEGER NOT NULL DEFAULT 0,
  is_kyu           INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE programs (
  belt_id TEXT PRIMARY KEY REFERENCES belts(id) ON DELETE CASCADE,
  items   TEXT NOT NULL DEFAULT '[]'            -- lista JSON de textos
);

-- Archivos reales (fotos, logo, firma, comprobantes). El contenido vive en disco.
CREATE TABLE files (
  id               TEXT PRIMARY KEY,
  kind             TEXT NOT NULL CHECK (kind IN ('student_photo','logo','hero','signature','proof')),
  mime             TEXT NOT NULL,
  ext              TEXT NOT NULL,
  size             INTEGER NOT NULL,
  original_name    TEXT,
  owner_student_id TEXT,
  created_by       TEXT,
  attached         INTEGER NOT NULL DEFAULT 0,  -- 0 = subido pero todavía sin usar (se limpia solo)
  created_at       TEXT NOT NULL
);

CREATE TABLE students (
  id                      TEXT PRIMARY KEY,
  name                    TEXT NOT NULL,
  belt_id                 TEXT NOT NULL REFERENCES belts(id),
  joined_on               TEXT NOT NULL,        -- "En la escuela desde"
  belt_since              TEXT NOT NULL,        -- desde cuándo tiene el cinturón actual
  birth                   TEXT,
  family_group            TEXT NOT NULL DEFAULT '',
  phone                   TEXT NOT NULL DEFAULT '',
  guardian                TEXT NOT NULL DEFAULT '',
  grp                     TEXT NOT NULL CHECK (grp IN ('adulto','infantil')),
  dojo_id                 TEXT NOT NULL REFERENCES dojos(id),
  status                  TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('activo','suspendido')),
  is_instructor           INTEGER NOT NULL DEFAULT 0,
  scholarship_active      INTEGER NOT NULL DEFAULT 0,
  scholarship_cents       INTEGER NOT NULL DEFAULT 0,
  dni                     TEXT NOT NULL DEFAULT '',
  allergies               TEXT NOT NULL DEFAULT '',
  emergency_contact       TEXT NOT NULL DEFAULT '',
  emergency_phone         TEXT NOT NULL DEFAULT '',
  photo_file_id           TEXT REFERENCES files(id) ON DELETE SET NULL,
  enabled_modules         TEXT NOT NULL DEFAULT '[]',   -- lista JSON
  module_perms            TEXT NOT NULL DEFAULT '{}',   -- objeto JSON {modulo:'read'|'write'}
  created_at              TEXT NOT NULL,
  updated_at              TEXT NOT NULL
);
CREATE INDEX idx_students_dojo   ON students(dojo_id);
CREATE INDEX idx_students_status ON students(status);

-- Credenciales. Un usuario es el Sensei (admin) o está ligado a un alumno.
CREATE TABLE users (
  id                   TEXT PRIMARY KEY,
  username             TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash        TEXT NOT NULL,
  role                 TEXT NOT NULL CHECK (role IN ('admin','student')),
  student_id           TEXT UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  created_at           TEXT NOT NULL,
  CHECK ((role = 'admin' AND student_id IS NULL) OR (role = 'student' AND student_id IS NOT NULL))
);

CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,                  -- SHA-256 del token (el token real solo vive en la cookie)
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  last_seen  INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  ip         TEXT,
  user_agent TEXT
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

CREATE TABLE login_attempts (
  id  INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL,                            -- 'u:<usuario>' o 'ip:<dirección>'
  ts  INTEGER NOT NULL
);
CREATE INDEX idx_login_attempts ON login_attempts(key, ts);

CREATE TABLE activities (
  id         TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  activity   TEXT NOT NULL,
  date       TEXT NOT NULL,
  place      TEXT NOT NULL DEFAULT '',
  instructor TEXT NOT NULL DEFAULT '',
  notes      TEXT NOT NULL DEFAULT '',
  belt_id    TEXT REFERENCES belts(id) ON DELETE SET NULL,
  result     TEXT CHECK (result IN ('aprobado','no aprobado')),
  created_at TEXT NOT NULL
);
CREATE INDEX idx_activities_student ON activities(student_id);

CREATE TABLE payments (
  id                 TEXT PRIMARY KEY,
  student_id         TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tipo               TEXT NOT NULL DEFAULT 'cuota',
  period             TEXT NOT NULL,             -- texto que se muestra: "Septiembre 2026"
  period_month       TEXT NOT NULL,             -- 'AAAA-MM' para totales y filtros
  concept            TEXT NOT NULL,
  amount_cents       INTEGER NOT NULL CHECK (amount_cents > 0),
  status             TEXT NOT NULL CHECK (status IN ('pendiente','revision','pagada')),
  paid_on            TEXT,
  medium             TEXT CHECK (medium IN ('Físico','Electrónico')),
  method             TEXT,
  receipt_no         INTEGER UNIQUE,
  proof_medium       TEXT,
  proof_note         TEXT,
  proof_file_id      TEXT REFERENCES files(id) ON DELETE SET NULL,
  proof_submitted_at TEXT,
  created_by         TEXT,
  created_at         TEXT NOT NULL
);
CREATE INDEX idx_payments_student ON payments(student_id);
CREATE INDEX idx_payments_status  ON payments(status);
CREATE INDEX idx_payments_month   ON payments(period_month);

CREATE TABLE expenses (
  id           TEXT PRIMARY KEY,
  category     TEXT NOT NULL,
  concept      TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  date         TEXT NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('pagado','pendiente')),
  paid_on      TEXT,
  created_at   TEXT NOT NULL
);

CREATE TABLE attendance (
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date       TEXT NOT NULL,
  source     TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','qr')),
  marked_by  TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (student_id, date)
);
CREATE INDEX idx_attendance_date ON attendance(date);

CREATE TABLE schedule_items (
  id         TEXT PRIMARY KEY,
  day        TEXT NOT NULL,
  details    TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE events (
  id    TEXT PRIMARY KEY,
  type  TEXT NOT NULL CHECK (type IN ('examen','torneo','seminario','actividad')),
  title TEXT NOT NULL,
  date  TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE inscriptions (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  birth           TEXT,
  grp             TEXT NOT NULL CHECK (grp IN ('adulto','infantil')),
  dojo_id         TEXT NOT NULL REFERENCES dojos(id),
  phone           TEXT NOT NULL DEFAULT '',
  dni             TEXT NOT NULL DEFAULT '',
  guardian        TEXT NOT NULL DEFAULT '',
  emergency_phone TEXT NOT NULL DEFAULT '',
  notes           TEXT NOT NULL DEFAULT '',
  created_at      TEXT NOT NULL
);

CREATE TABLE library_glossary (
  id   TEXT PRIMARY KEY,
  term TEXT NOT NULL,
  def  TEXT NOT NULL
);

CREATE TABLE library_links (
  id    TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url   TEXT NOT NULL,
  type  TEXT NOT NULL CHECK (type IN ('link','video')),
  descr TEXT NOT NULL DEFAULT ''
);

CREATE TABLE forum_posts (
  id          TEXT PRIMARY KEY,
  author_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL,
  text        TEXT NOT NULL,
  date        TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE TABLE announcements (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  date       TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Diplomas emitidos. 'number' es el correlativo visible (Nº 0001);
-- 'verify_code' es el código no adivinable que va en el QR.
CREATE TABLE diplomas_issued (
  id           TEXT PRIMARY KEY,
  number       INTEGER NOT NULL UNIQUE,
  verify_code  TEXT NOT NULL UNIQUE,
  student_id   TEXT REFERENCES students(id) ON DELETE SET NULL,
  student_name TEXT NOT NULL,
  activity     TEXT NOT NULL,
  type         TEXT NOT NULL,
  date         TEXT NOT NULL,
  issued_on    TEXT NOT NULL,
  issued_by    TEXT,
  created_at   TEXT NOT NULL
);

-- Configuración general (valores JSON por clave).
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE audit_log (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  ts        TEXT NOT NULL,
  user_id   TEXT,
  username  TEXT,
  action    TEXT NOT NULL,
  entity    TEXT,
  entity_id TEXT,
  detail    TEXT
);
CREATE INDEX idx_audit_ts ON audit_log(ts);
