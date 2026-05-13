-- Schema voor materiaalhok-SF backend.
-- Alle CREATE-statements zijn idempotent (IF NOT EXISTS) zodat dit bij elke
-- start veilig kan worden uitgevoerd.

CREATE TABLE IF NOT EXISTS materials (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  category      TEXT,
  stock         INTEGER NOT NULL DEFAULT 0,
  unit          TEXT,
  type          TEXT    NOT NULL CHECK (type IN ('uniek', 'bulk')),
  location      TEXT,
  notes         TEXT,
  purchase_link TEXT,
  barcode       TEXT,
  created_at    TEXT    NOT NULL,
  updated_at    TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS sets (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  category      TEXT,
  stock         INTEGER NOT NULL DEFAULT 0,
  composition   TEXT,
  location      TEXT,
  notes         TEXT,
  purchase_link TEXT,
  barcode       TEXT,
  created_at    TEXT    NOT NULL,
  updated_at    TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT    NOT NULL,
  email          TEXT    NOT NULL UNIQUE,
  password_hash  TEXT    NOT NULL,
  role           TEXT    NOT NULL CHECK (role IN ('admin', 'user')),
  login_barcode  TEXT    UNIQUE,
  created_at     TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS bons (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  bon_number    TEXT    NOT NULL UNIQUE,
  user_id       INTEGER NOT NULL,
  start_date    TEXT,
  return_date   TEXT,
  status        TEXT    NOT NULL CHECK (status IN ('active', 'reserved', 'completed')),
  created_at    TEXT    NOT NULL,
  completed_at  TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS bon_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  bon_id      INTEGER NOT NULL,
  material_id INTEGER,
  set_id      INTEGER,
  quantity    INTEGER NOT NULL,
  returned    INTEGER NOT NULL DEFAULT 0 CHECK (returned IN (0, 1)),
  picked_up   INTEGER NOT NULL DEFAULT 0 CHECK (picked_up IN (0, 1)),
  FOREIGN KEY (bon_id)      REFERENCES bons(id)      ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT,
  FOREIGN KEY (set_id)      REFERENCES sets(id)      ON DELETE RESTRICT,
  CHECK (
    (material_id IS NOT NULL AND set_id IS NULL)
    OR
    (material_id IS NULL AND set_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp  TEXT    NOT NULL,
  action     TEXT    NOT NULL,
  detail     TEXT,
  user_id    INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexen op velden die we vaak filteren of opzoeken
CREATE INDEX IF NOT EXISTS idx_materials_barcode    ON materials (barcode);
CREATE INDEX IF NOT EXISTS idx_sets_barcode         ON sets (barcode);
CREATE INDEX IF NOT EXISTS idx_users_email          ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_login_barcode  ON users (login_barcode);
CREATE INDEX IF NOT EXISTS idx_bons_bon_number      ON bons (bon_number);
CREATE INDEX IF NOT EXISTS idx_bons_user_id         ON bons (user_id);
CREATE INDEX IF NOT EXISTS idx_bons_status          ON bons (status);
