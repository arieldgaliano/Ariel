'use strict';
const fs = require('node:fs');
const path = require('node:path');
const config = require('./config');
const db = require('./db');
const { ApiError, uuid, nowIso } = require('./util');

const uploadsDir = () => path.join(config.dataDir, 'uploads');

// Se reconoce el tipo de archivo por su contenido real, no por lo que diga el navegador.
// (SVG no se acepta: puede llevar código.)
function sniff(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: 'png' };
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
  if (buf.subarray(0, 4).toString('latin1') === 'GIF8') return { mime: 'image/gif', ext: 'gif' };
  if (buf.subarray(0, 5).toString('latin1') === '%PDF-') return { mime: 'application/pdf', ext: 'pdf' };
  return null;
}

const IMAGE_KINDS = new Set(['student_photo', 'logo', 'hero', 'signature']);

function save({ buffer, kind, ownerStudentId = null, createdBy = null, originalName = '' }) {
  if (!buffer || !buffer.length) throw new ApiError(400, 'No llegó ningún archivo.');
  if (buffer.length > config.maxUploadBytes) throw new ApiError(413, 'El archivo es demasiado grande (máximo 6 MB).');
  const type = sniff(buffer);
  if (!type) throw new ApiError(400, 'Formato no permitido. Subí una imagen JPG, PNG, WEBP o GIF (o un PDF para comprobantes).');
  if (IMAGE_KINDS.has(kind) && type.mime === 'application/pdf') throw new ApiError(400, 'Acá tiene que ser una imagen, no un PDF.');
  const id = uuid();
  fs.mkdirSync(uploadsDir(), { recursive: true });
  fs.writeFileSync(path.join(uploadsDir(), `${id}.${type.ext}`), buffer, { mode: 0o600 });
  db.get().prepare(`INSERT INTO files (id, kind, mime, ext, size, original_name, owner_student_id, created_by, attached, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`)
    .run(id, kind, type.mime, type.ext, buffer.length, String(originalName).slice(0, 200), ownerStudentId, createdBy, nowIso());
  return db.get().prepare('SELECT * FROM files WHERE id = ?').get(id);
}

const getRow = id => db.get().prepare('SELECT * FROM files WHERE id = ?').get(id);
const pathFor = row => path.join(uploadsDir(), `${row.id}.${row.ext}`);

const unlink = row => fs.rmSync(pathFor(row), { force: true });

function remove(id) {
  const row = getRow(id);
  if (!row) return;
  db.get().prepare('DELETE FROM files WHERE id = ?').run(id);
  unlink(row);
}

// Marca un archivo recién subido como "en uso", validando que sea del tipo esperado.
function claim(fileId, { kind, ownerStudentId, createdBy }) {
  const row = getRow(fileId);
  if (!row || row.kind !== kind) throw new ApiError(400, 'El archivo subido no es válido. Subilo de nuevo.');
  if (row.attached) throw new ApiError(400, 'Ese archivo ya se usó. Subilo de nuevo.');
  if (ownerStudentId !== undefined && row.owner_student_id !== ownerStudentId) throw new ApiError(403, 'Ese archivo no te pertenece.');
  if (createdBy !== undefined && row.created_by !== createdBy) throw new ApiError(403, 'Ese archivo no te pertenece.');
  db.get().prepare('UPDATE files SET attached = 1 WHERE id = ?').run(fileId);
  return row;
}

// Borra archivos subidos que nunca se usaron (de más de un día).
function purgeOrphans() {
  const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  for (const r of db.get().prepare('SELECT id FROM files WHERE attached = 0 AND created_at < ?').all(cutoff)) remove(r.id);
}

module.exports = { save, getRow, pathFor, remove, unlink, claim, purgeOrphans, uploadsDir, sniff };
