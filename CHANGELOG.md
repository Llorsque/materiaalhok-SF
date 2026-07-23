# Changelog

Alle noemenswaardige wijzigingen aan dit project worden in dit bestand vastgelegd.

Het formaat is gebaseerd op [Keep a Changelog](https://keepachangelog.com/nl/1.1.0/),
en dit project houdt zich aan [Semantic Versioning](https://semver.org/lang/nl/).

## [Unreleased]

## [1.3.0] - 2026-07-23

Token-authenticatie in twee stappen afgerond: eerst het fundament (stap 1),
daarna alle bestaande routes dichtgezet (stap 2).

### Toegevoegd
- **Token-authenticatie — fundament (stap 1)**: na een succesvolle login
  geeft de backend een sessie-token uit (12 uur geldig), opgeslagen in een
  nieuwe `sessions`-tabel. De frontend bewaart het token in `localStorage`
  en stuurt het als `Authorization: Bearer <token>` mee bij elke API-call.
  Bij een 401 wist de client het token en stuurt de gebruiker terug naar
  het loginscherm met "Sessie verlopen".
- Nieuw endpoint `POST /api/logout` dat de server-side sessie opruimt
  (idempotent — onbekend/verlopen token geeft nog steeds 200).
- Nieuw endpoint `GET /api/me` (met `requireAuth`) dat de ingelogde
  gebruiker teruggeeft.
- Nieuwe middleware `requireAuth` en `requireAdmin` in
  `server/middleware/auth.js`. Verlopen sessies worden bij elke login
  opgeruimd; geen aparte cronjob.
- **Token-authenticatie — routes dichtzetten (stap 2)**: alle bestaande
  data-endpoints zijn nu beveiligd. Materialen en sets zijn voor iedere
  ingelogde gebruiker leesbaar; wijzigingen zijn admin-only. Gebruikers-,
  import-, backup-, admin- (reset) en logboek-endpoints zijn volledig
  admin-only. Bons volgen role-based access: gewone gebruikers zien en
  bewerken uitsluitend hun eigen bonnen; `PUT`/`DELETE` en `POST /` (bon
  bewerken/verwijderen) zijn admin-only.
- **Wie-kolom in het logboek** is nu gevuld bij materiaal-, set-,
  gebruikers-, bon-, import- en reset-acties. `logAction` krijgt overal
  `req.user.id` van de actor mee.

### Gewijzigd
- Frontend haalt data pas op *na* login (voorheen direct bij mount) en slaat
  `users`/`logs` over voor gewone gebruikers, om onnodige 403's te vermijden.
- Bij bon-mutaties is het `user_id` in het logboek nu de actor (bv. de admin
  die de bon aanmaakte) in plaats van de betrokken lener.

### Opgelost
- **API-endpoints waren onbeschermd** — iedereen die de backend kon bereiken
  kon zonder login data lezen en wijzigen. Was gedocumenteerd in
  `BEKENDE-BUGS.md`; die vermelding is verwijderd.

## [1.2.0] - 2026-07-23

### Toegevoegd
- **Serverside activity log**: de backend schrijft nu logregels weg voor
  aangemaakte/gewijzigde/verwijderde bonnen, materialen, sets, gebruikers,
  Excel-imports en reset-acties. Logregels bevatten leesbare Nederlandse
  omschrijvingen met namen en aantallen.
- Nieuwe `logAction(action, detail, userId)` helper in `server/utils.js` die
  faal-tolerant schrijft naar de bestaande `logs`-tabel.
- Nieuw endpoint `GET /api/logs` met paginering (`limit`/`offset`), filters op
  `action`, zoekterm `q`, datumbereik (`from`/`to`) en totaaltelling.
- **Logboek-tab** in de admin met tabel (tijdstip, actie, wie, omschrijving),
  zoekveld, actie-dropdown, vorige/volgende-paginering en een rustige lege
  staat wanneer er nog niets is gebeurd.
- `getLogs(params)` in de frontend-API-client.

### Gewijzigd
- Recente activiteit op het admin-dashboard leest voortaan uit de backend in
  plaats van uit `localStorage`.
- `addLog(...)` op de frontend is nu een dunne wrapper die enkel de logs
  ververst; de backend is de bron van waarheid geworden.

## [1.1.0] - 2026-07-23

### Toegevoegd
- **Reset voor livegang** (admin → Instellingen → Gevarenzone): wist alle bonnen
  en bonregels na expliciete bevestiging (typ `RESET`). Materialen, sets,
  gebruikers en logs blijven staan. Bonnummers beginnen daarna weer bij 1.
- Automatische backup vóór een reset naar `server/backups/database-voor-reset-YYYY-MM-DD-HHMM.db`.
- Nieuwe backend-endpoints `GET /api/admin/reset-preview` en `POST /api/admin/reset`.

### Verwijderd
- Kapotte "Reset alle data"-knop die nog naar oude localStorage-keys (`mhok-eq6`,
  `mhok-bons`, `mhok-logs`) schreef van vóór de SQLite-migratie en de database
  niet aanraakte.

## [1.0.0] - 2026-07-23

Eerste productieversie van Materiaalhok-SF.

### Toegevoegd
- **Materialen**: beheer van individuele materialen met categorieën, voorraad, type, barcode en inkooplink.
- **Sets**: samengestelde materialen die als één eenheid geleend en geretourneerd kunnen worden, met uitvouwbare samenstelling.
- **Bonnen**: uitleen- en retourbonnen met detailweergave, filters en doorklikbare eigen bonnen.
- **Barcodes**: scannen van materialen en badges via het scan-veld met auto-focus.
- **Import**: importeren van materialen vanuit een extern bestand.
- **Backup**: exporteren en resetten van alle data vanuit Instellingen.
- **Branding**: instelbaar logo, kleur, titel en login-achtergrond.
