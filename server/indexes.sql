-- Indexen op velden die we vaak filteren of opzoeken.
--
-- Dit bestand draait als LAATSTE stap in server/db.js — na de CREATE TABLEs
-- uit schema.sql, na de kolom-migraties (ensureColumn) en na de bons-
-- herbouw. Zo zijn alle referenced kolommen gegarandeerd aanwezig en
-- overleven de indexen ook een table-rename in de bons-herbouw.
--
-- Alle statements zijn idempotent (CREATE INDEX IF NOT EXISTS).

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
