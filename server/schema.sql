-- Schema voor materiaalhok-SF backend.
-- Alle CREATE-statements zijn idempotent (IF NOT EXISTS) zodat dit bij elke
-- start veilig kan worden uitgevoerd.

CREATE TABLE IF NOT EXISTS materials (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT    NOT NULL,
  category         TEXT,
  stock            INTEGER NOT NULL DEFAULT 0,
  unit             TEXT,
  type             TEXT    NOT NULL CHECK (type IN ('uniek', 'bulk')),
  location         TEXT,
  notes            TEXT,
  purchase_link    TEXT,
  barcode          TEXT    UNIQUE,
  created_at       TEXT    NOT NULL,
  updated_at       TEXT    NOT NULL,
  -- Ronde B: unieke materialen die kwijt/kapot zijn, staan 'out_of_service'.
  -- Beschikbaarheid wordt dan 0 ongeacht stock. Voor bulk zakt stock zelf.
  available_status TEXT    NOT NULL DEFAULT 'available' CHECK (available_status IN ('available', 'out_of_service'))
);

CREATE TABLE IF NOT EXISTS sets (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT    NOT NULL,
  category         TEXT,
  stock            INTEGER NOT NULL DEFAULT 0,
  composition      TEXT,
  location         TEXT,
  notes            TEXT,
  purchase_link    TEXT,
  barcode          TEXT    UNIQUE,
  created_at       TEXT    NOT NULL,
  updated_at       TEXT    NOT NULL,
  -- Sets gedragen zich als bulk: kwijt/kapot verlaagt stock. Kolom zit hier
  -- voor consistentie met materials en toekomstige uitbreiding.
  available_status TEXT    NOT NULL DEFAULT 'available' CHECK (available_status IN ('available', 'out_of_service'))
);

CREATE TABLE IF NOT EXISTS users (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  name                  TEXT    NOT NULL,
  email                 TEXT    NOT NULL UNIQUE,
  password_hash         TEXT    NOT NULL,
  role                  TEXT    NOT NULL CHECK (role IN ('admin', 'user')),
  login_barcode         TEXT    UNIQUE,
  created_at            TEXT    NOT NULL,
  notify_reservation    INTEGER NOT NULL DEFAULT 1 CHECK (notify_reservation IN (0, 1)),
  notify_pickup         INTEGER NOT NULL DEFAULT 1 CHECK (notify_pickup IN (0, 1)),
  notify_reminder       INTEGER NOT NULL DEFAULT 1 CHECK (notify_reminder IN (0, 1))
);

CREATE TABLE IF NOT EXISTS bons (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  bon_number             TEXT    NOT NULL UNIQUE,
  -- v1.12.0 externe verhuur: user_id is nullable geworden. Een bon is óf
  -- intern (user_id gevuld, externe velden NULL) óf extern (user_id NULL,
  -- external_org gevuld). Zie CHECK onderin de tabel.
  user_id                INTEGER,
  start_date             TEXT,
  return_date            TEXT,
  status                 TEXT    NOT NULL CHECK (status IN ('active', 'reserved', 'completed')),
  notes                  TEXT,
  created_at             TEXT    NOT NULL,
  completed_at           TEXT,
  created_by_admin_id    INTEGER,
  reminder_sent_at       TEXT,
  -- Externe verhuur (v1.12.0). Alleen gevuld bij een externe bon; blijven
  -- NULL voor interne bonnen. external_org fungeert als sentinel voor de
  -- CHECK verderop: als 'ie gevuld is, hoort de bon extern te zijn.
  external_org           TEXT,
  external_contact       TEXT,
  external_phone         TEXT,
  external_email         TEXT,
  rental_price           REAL    NOT NULL DEFAULT 0,
  deposit                REAL    NOT NULL DEFAULT 0,
  -- NULL bij interne bon of bij externe bon met prijs 0. 'open' zodra een
  -- externe bon met bedrag > 0 wordt aangemaakt; 'paid' pas nadat een admin
  -- de betaling markeert (stap 3 van de sub-roadmap).
  payment_status         TEXT    CHECK (payment_status IS NULL OR payment_status IN ('open', 'paid')),
  FOREIGN KEY (user_id)             REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by_admin_id) REFERENCES users(id) ON DELETE SET NULL,
  -- Intern-vs-extern: exact één van beide "identiteiten" moet gevuld zijn.
  -- external_org fungeert als sentinel voor "dit is een externe bon".
  CHECK (
    (user_id IS NOT NULL AND external_org IS NULL)
    OR
    (user_id IS NULL AND external_org IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS bon_items (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  bon_id              INTEGER NOT NULL,
  material_id         INTEGER,
  set_id              INTEGER,
  quantity            INTEGER NOT NULL,
  returned            INTEGER NOT NULL DEFAULT 0 CHECK (returned IN (0, 1)),
  picked_up           INTEGER NOT NULL DEFAULT 0 CHECK (picked_up IN (0, 1)),
  -- Soft-delete-vlag: 1 = stond op de reservering maar is bij ophalen niet
  -- meegenomen. Telt nergens meer mee (beschikbaarheid, retour, mail) en
  -- blijft alleen bestaan voor de audit-trail in admin-detail.
  removed_at_pickup   INTEGER NOT NULL DEFAULT 0 CHECK (removed_at_pickup IN (0, 1)),
  -- 1 = pas bij ophalen aan de bon toegevoegd (stond niet op de oorspronkelijke
  -- reservering). Zichtbaar in admin-detail, niet in de mail.
  added_at_pickup     INTEGER NOT NULL DEFAULT 0 CHECK (added_at_pickup IN (0, 1)),
  -- Ronde B: hoe kwam dit (deel-)item terug? Voor rijen met returned=1 is dit
  -- de audit-trail; voor returned=0 is de waarde irrelevant (default vult 'm).
  -- Per-stuk splitsing: bulk 3 waarvan 2 retour + 1 kwijt wordt gesplitst in
  -- twee rijen met eigen return_condition en quantity, vergelijkbaar met
  -- de pickup-split.
  return_condition    TEXT    NOT NULL DEFAULT 'returned' CHECK (return_condition IN ('returned', 'lost', 'broken')),
  FOREIGN KEY (bon_id)      REFERENCES bons(id)      ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT,
  FOREIGN KEY (set_id)      REFERENCES sets(id)      ON DELETE RESTRICT,
  CHECK (
    (material_id IS NOT NULL AND set_id IS NULL)
    OR
    (material_id IS NULL AND set_id IS NOT NULL)
  )
);

-- Ronde B: één rij per gemelde schade/verlies. Bron van waarheid voor het
-- admin-overzicht én voor tellingen per materiaal ("hoe vaak is dit al kapot
-- geweest?"). Aangemaakt door de retour-flow; afgehandeld door admin via
-- PATCH /api/damage-reports/:id/resolve.
CREATE TABLE IF NOT EXISTS damage_reports (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  bon_id         INTEGER,
  bon_item_id    INTEGER,
  material_id    INTEGER,
  set_id         INTEGER,
  reason         TEXT    NOT NULL CHECK (reason IN ('lost', 'broken')),
  quantity       INTEGER NOT NULL,
  status         TEXT    NOT NULL CHECK (status IN ('open', 'repaired', 'replaced', 'written_off')),
  notes          TEXT,
  reported_at    TEXT    NOT NULL,
  reported_by    INTEGER,
  resolved_at    TEXT,
  resolved_by    INTEGER,
  FOREIGN KEY (bon_id)      REFERENCES bons(id)       ON DELETE SET NULL,
  FOREIGN KEY (bon_item_id) REFERENCES bon_items(id)  ON DELETE SET NULL,
  FOREIGN KEY (material_id) REFERENCES materials(id)  ON DELETE SET NULL,
  FOREIGN KEY (set_id)      REFERENCES sets(id)       ON DELETE SET NULL,
  FOREIGN KEY (reported_by) REFERENCES users(id)      ON DELETE SET NULL,
  FOREIGN KEY (resolved_by) REFERENCES users(id)      ON DELETE SET NULL,
  CHECK (
    (material_id IS NOT NULL AND set_id IS NULL)
    OR
    (material_id IS NULL AND set_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT    PRIMARY KEY,
  user_id     INTEGER NOT NULL,
  created_at  TEXT    NOT NULL,
  expires_at  TEXT    NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- v1.13.0: instelbare tekstinstellingen die niet in code horen. Voor nu
-- alleen `rental_terms` (huurvoorwaarden extern), maar bewust generiek
-- opgezet zodat andere UI-teksten hier later ook in kunnen. Waarde is
-- altijd TEXT; interpretatie ligt bij de aanroeper.
CREATE TABLE IF NOT EXISTS settings (
  key    TEXT PRIMARY KEY,
  value  TEXT
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
CREATE INDEX IF NOT EXISTS idx_sessions_user_id     ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at  ON sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_damage_status        ON damage_reports (status);
CREATE INDEX IF NOT EXISTS idx_damage_material_id   ON damage_reports (material_id);
CREATE INDEX IF NOT EXISTS idx_damage_set_id        ON damage_reports (set_id);
