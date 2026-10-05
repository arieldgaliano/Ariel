-- Permite anular pagos (queda el registro y el motivo; el recibo anulado no se reutiliza).
CREATE TABLE payments_new (
  id                 TEXT PRIMARY KEY,
  student_id         TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tipo               TEXT NOT NULL DEFAULT 'cuota',
  period             TEXT NOT NULL,
  period_month       TEXT NOT NULL,
  concept            TEXT NOT NULL,
  amount_cents       INTEGER NOT NULL CHECK (amount_cents > 0),
  status             TEXT NOT NULL CHECK (status IN ('pendiente','revision','pagada','anulada')),
  paid_on            TEXT,
  medium             TEXT CHECK (medium IN ('Físico','Electrónico')),
  method             TEXT,
  receipt_no         INTEGER UNIQUE,
  proof_medium       TEXT,
  proof_note         TEXT,
  proof_file_id      TEXT REFERENCES files(id) ON DELETE SET NULL,
  proof_submitted_at TEXT,
  created_by         TEXT,
  created_at         TEXT NOT NULL,
  void_reason        TEXT,
  voided_at          TEXT,
  voided_by          TEXT
);
INSERT INTO payments_new (id, student_id, tipo, period, period_month, concept, amount_cents, status, paid_on, medium, method, receipt_no,
                          proof_medium, proof_note, proof_file_id, proof_submitted_at, created_by, created_at)
  SELECT id, student_id, tipo, period, period_month, concept, amount_cents, status, paid_on, medium, method, receipt_no,
         proof_medium, proof_note, proof_file_id, proof_submitted_at, created_by, created_at FROM payments;
DROP TABLE payments;
ALTER TABLE payments_new RENAME TO payments;
CREATE INDEX idx_payments_student ON payments(student_id);
CREATE INDEX idx_payments_status  ON payments(status);
CREATE INDEX idx_payments_month   ON payments(period_month);
