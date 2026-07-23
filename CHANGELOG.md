# Changelog

Alle noemenswaardige wijzigingen aan dit project worden in dit bestand vastgelegd.

Het formaat is gebaseerd op [Keep a Changelog](https://keepachangelog.com/nl/1.1.0/),
en dit project houdt zich aan [Semantic Versioning](https://semver.org/lang/nl/).

## [Unreleased]

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
