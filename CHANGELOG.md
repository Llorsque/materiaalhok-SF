# Changelog

Alle noemenswaardige wijzigingen aan dit project worden in dit bestand vastgelegd.

Het formaat is gebaseerd op [Keep a Changelog](https://keepachangelog.com/nl/1.1.0/),
en dit project houdt zich aan [Semantic Versioning](https://semver.org/lang/nl/).

## [Unreleased]

## [1.6.0] - 2026-07-23

E-mailfundament: bevestigingsmails na aanmaken van een bon plus alle
infrastructuur waar herinneringen en externe verhuur straks op leunen.
Herinneringen en externe verhuur zitten expliciet **nog niet** in deze release.

### Toegevoegd
- **Verzendlaag** `server/mail/mailer.js` met nodemailer. Publieke functie
  `sendMail({ to, subject, html, text, context })` respecteert `MAIL_MODE`
  (`off` / `redirect` / `live`) en is fout-tolerant: een falende mail laat
  de hoofdactie nooit crashen. Succes/mislukking/skip komt zowel in de
  console als in de `logs`-tabel (`mail_sent`, `mail_failed`,
  `mail_skipped`).
- **Verzendvenster-helper** `isBinnenVerzendvenster()` (werkdag + 08:00–17:59
  in `APP_TIMEZONE`, zie `BESLUITEN.md`). Nog niet in gebruik; klaar voor de
  retourherinneringen die straks komen. Bevestigingsmails omzeilen het
  venster bewust.
- **Sjablonen** `server/mail/templates.js`: nette mobielvriendelijke basis
  met inline CSS + platte-tekst-variant, plus de eerste sjabloon
  `bonConfirmation(bon)` voor uitleen én reservering (bonnummer, items met
  aantallen, ophaal- en retourdatum, informele NL-tekst).
- **Koppeling**: `POST /api/bons` verstuurt na succesvol aanmaken een
  bevestigingsmail naar het e-mailadres van de betrokken gebruiker (fire &
  forget). Zonder e-mailadres: `mail_skipped` log, geen fout.
- **Testendpoint** `POST /api/admin/mail-test` (admin-only) om de
  SMTP-configuratie te controleren zonder een bon aan te maken.
- **Nieuwe kolom** `users.email_reminders` (`INTEGER NOT NULL DEFAULT 1`),
  incl. lichte migratie voor bestaande DBs. Nog niet in gebruik — bedoeld
  voor de herinneringen. Bevestigingsmails blijven altijd gaan
  (`BESLUITEN.md`).
- **Configuratie via dotenv**: `server/.env.example` met commentaar per
  variabele (`MAIL_MODE`, `MAIL_REDIRECT_TO`, `SMTP_*`, `MAIL_FROM_NAME`,
  `APP_TIMEZONE`). `server/.env` staat in `.gitignore` en komt nooit in de
  repo.
- **README**: sectie "E-mailconfiguratie" met de variabelen, uitleg per
  `MAIL_MODE`, stappen voor het maken van een Gmail app-wachtwoord en hoe
  je met het testendpoint controleert of alles staat.

### Wijzigingen
- Dependencies `nodemailer` en `dotenv` toegevoegd aan `server/package.json`.
- `server/index.js` laadt `dotenv` als eerste zodat modules die tijdens
  `require` uit `process.env` lezen (zoals de mailer) de juiste config zien.

## [1.5.1] - 2026-07-23

### Opgelost
- **Aantal-teller in de Sets-tab**: Sets-tab toonde geen teller met het aantal
  items in de lijst, waardoor 'ie afweek van de Materiaal-tab. Beide tabs
  hebben nu dezelfde `<h3>Materiaal ({n})</h3>` / `<h3>Sets ({n})</h3>`
  header boven de lijst met het aantal na filter en categorie-selectie.

## [1.5.0] - 2026-07-23

### Toegevoegd
- **Admin kan een bon aanmaken namens een gebruiker**. Nieuwe knop "Nieuwe
  bon" in het bonnen-overzicht opent een tweefase-flow: eerst kies je de
  gebruiker (alleen accounts met rol 'gebruiker'), daarna kies je direct
  lenen of reserveren en doorloop je de bestaande `LoanFlow` ongewijzigd
  (voorraadcheck, weekend-blokkade, datums, samenvatting). Admins kunnen
  géén bon voor zichzelf of voor een andere admin aanmaken; de backend
  weigert dat met een Nederlandse foutmelding.
- Nieuwe kolom `bons.created_by_admin_id` (nullable, FK naar `users(id)`
  met `ON DELETE SET NULL`) plus lichte migratie in `server/db.js`. Wordt
  alleen gezet wanneer een admin de bon namens iemand anders aanmaakt.
- `GET /api/bons` geeft `created_by_admin_id` en `created_by_admin_name`
  mee (JOIN op users), zowel voor de lijst als de detail-endpoints.
- `logAction` bij zulke bonnen: `"BON-2026-XXXX aangemaakt door <admin>
  namens <gebruiker>: 2x Voetbal"`. De actor blijft de admin.
- **Sterretje bij admin-gemaakte bonnen**: in het admin bonnen-overzicht
  (BonsTab), op het dashboard, in item- en set-detailmodals verschijnt een
  amber `*` achter het bonnummer met tooltip en ondertitel "Aangemaakt door
  X namens Y". In het bon-detail komt het als eigen regel te staan. De
  gebruiker ziet in zijn eigen overzicht geen sterretje — voor hem is het
  een normale bon.

## [1.4.0] - 2026-07-23

### Toegevoegd
- **Sets-tab in de admin**: eigen tab naast Materiaal met dezelfde vorm
  (overzicht, zoeken, filteren op categorie, scan-bar, add/edit/delete-modals,
  detail-modal met barcode-SVG en samenstelling). Barcode wordt automatisch
  gegenereerd als `S-XXXX` en kan opnieuw worden gegenereerd via de
  detail-modal. Verwijderen wordt door de backend geblokkeerd zolang de set
  op een openstaande bon staat.
- **Wachtwoord resetten vanuit admin**: per gebruiker een gele knop
  "Wachtwoord resetten" in de gebruikersbeheer-tab. Opent een modal met een
  nieuw wachtwoord + bevestiging (minimaal 8 tekens). Backend:
  `PUT /api/users/:id/password` (admin-only). Bij een reset worden alle
  actieve sessies van die gebruiker in één transactie verwijderd, zodat een
  gestolen token direct dood is. Log-actie `user_password_reset` met
  omschrijving "Wachtwoord gereset voor <naam>" — het wachtwoord zelf wordt
  nooit gelogd.
- **Weekend geblokkeerd in datumkiezer**: zaterdag en zondag zijn niet meer
  bruikbaar voor `start_date` en `return_date` in lenen, reserveren en bij
  admin-bon-edit. De UI toont inline een rode melding en houdt de
  volgende-knop uit. De backend (`POST /api/bons`, `PUT /api/bons/:id`)
  weigert weekend-datums met een Nederlandse foutmelding als tweede
  verdedigingslinie.
- Nieuwe helpers `isWeekend(dateStr)` in `src/utils/date.js`,
  `nextSetBarcode(sets)` in `src/utils/barcode.js`, en set-varianten van
  `loanedQty` / `reservedQty` / `unavailableQty` / `availQty` in
  `src/utils/bons.js`.
- `resetUserPassword(id, password)` in de frontend-API-client.

### Opgelost
- **Er is geen Sets-tab in de admin** (was gedocumenteerd in
  `BEKENDE-BUGS.md`) is opgelost door de nieuwe Sets-tab.

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
