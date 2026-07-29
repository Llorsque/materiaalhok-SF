# Changelog

Alle noemenswaardige wijzigingen aan dit project worden in dit bestand vastgelegd.

Het formaat is gebaseerd op [Keep a Changelog](https://keepachangelog.com/nl/1.1.0/),
en dit project houdt zich aan [Semantic Versioning](https://semver.org/lang/nl/).

## [Unreleased]

## [1.9.0] - 2026-07-28

Blok 2 van Ronde B: kwijt/kapot melden bij retour, met directe
voorraadmutatie en een schade/verlies-overzicht voor de admin.

### Toegevoegd
- **Kwijt/kapot melden bij retour, per stuk**. `ReturnFlow.jsx` heeft per
  bon-regel drie tellers (Retour / Kwijt / Kapot) met +/-. Scannen telt
  standaard als Retour; Kwijt en Kapot markeer je expliciet. Voor bulk-
  regels kunnen de stuks over meerdere condities verdeeld worden (3
  ballen: 2 retour + 1 kwijt). Bevestigingsbanner meldt wat er straks van
  de voorraad wordt afgeboekt.
- **Nieuwe tabel `damage_reports`** met `reason` (`lost`/`broken`),
  `quantity`, `status` (`open`/`repaired`/`replaced`/`written_off`) en
  audit-velden. Bron van waarheid voor het admin-overzicht én voor
  tellingen per materiaal.
- **Nieuwe kolommen** `bon_items.return_condition`
  (`returned`/`lost`/`broken`) en `materials.available_status` +
  `sets.available_status` (`available`/`out_of_service`). Migraties voor
  bestaande DBs: alles krijgt de default (`returned`, `available`).
- **`POST /api/bons/:id/return` uitgebreid**: body `{ items: [{ id,
  condition, quantity }] }`. Meerdere entries per bon_item worden
  gecombineerd; het bon_item wordt gesplitst in aparte rijen met eigen
  `return_condition` en `quantity`, precies zoals de pickup-split werkt.
  In één transactie: bon_items splitsen, `damage_reports` inschrijven,
  voorraad muteren (bulk/sets: `stock -= n`, uniek: `available_status =
  'out_of_service'`), bon voltooien wanneer alles binnen is. `stock`
  klemt op 0 met `MAX(0, stock - n)`, zodat 'ie nooit negatief wordt.
  Achterwaarts compatibel: kaal retour zonder body blijft "alles retour".
- **Nieuw endpoint `GET /api/damage-reports`** (admin) met filters
  `?status=open|resolved`, `?reason=lost|broken`, `?material_id=`,
  `?set_id=`. Openstaande bovenaan, historie eronder.
- **Nieuw endpoint `PATCH /api/damage-reports/:id/resolve`** (admin) met
  body `{ resolution: 'repaired'|'replaced'|'written_off', notes? }`.
  Bulk/sets: `stock += n` bij repaired/replaced, ongewijzigd bij
  written_off. Uniek: `available_status = 'available'` bij repaired/
  replaced, `out_of_service` bij written_off. Log-actie
  `damage_resolved` met leesbare NL-omschrijving.
- **Nieuwe admin-tab "Schade / verlies"** (`DamageTab.jsx`) met status- en
  reason-filters, teller in de tab-titel voor openstaande meldingen,
  per-melding een "Afhandelen"-modal met keuze uit gerepareerd/vervangen/
  afgeschreven + optionele notitie.
- **Materiaal-detail** (`ItemDetailModal.jsx`) toont nu een schade-blok
  met open kwijt/kapot-tellingen + totaal aantal meldingen, en een
  "Bekijk"-knop die naar de Schade-tab springt. Buiten dienst-badge op de
  header. Beschikbaarheid rendert 0 (met "(buiten dienst)"-notitie) voor
  unieke items die kwijt/kapot zijn.
- **Bon-detail** (`BonDetailModal.jsx`) toont per item labeltje "kwijt" of
  "kapot" waar van toepassing.
- **Log-acties** `damage_reported` en `damage_resolved` toegevoegd aan
  `LogTab`-dropdown, plus `bon_pickup` en `user_password_reset` die al
  bestonden maar nog niet zichtbaar waren als filter-optie.
- API-client: `getDamageReports(params)` en `resolveDamageReport(id, {
  resolution, notes })`. `returnBon` accepteert nu de nieuwe entry-shape
  (achterwaarts compatibel).

### Gewijzigd
- **Beschikbaarheid** houdt nu rekening met `available_status`:
  ```
  available = (available_status === 'available') ? (stock - unavailableQty) : 0
  ```
  Consistent doorgevoerd in `checkStock` (server) en `availQty`/
  `availSetQty` (client). Een reservering op een `out_of_service`-item
  krijgt 409 met `reden: 'buiten dienst (kwijt/kapot)'` in de details.
- **Kapotte "maintenance"-veld verwijderd** uit `AdminView` (dead code:
  bestond niet in schema of API, leverde altijd 0 op) en uit
  `ItemDetailModal` (regel "Onderhoud").

### Opgelost
- **Dead `maintenance`-veld** stond in de UI maar bestond niet in de
  backend. Uit `totalUnavail`-berekening en het materiaal-detail
  verwijderd.

## [1.8.0] - 2026-07-28

### Gewijzigd
- **UserHome-layout**: de vier actietegels (Materiaal lenen, Reserveren,
  Ophalen, Retourneren) staan nu altijd bovenaan, direct onder de header.
  "Mijn actieve uitleningen" is verplaatst naar eronder. Alleen volgorde;
  geen functionele wijzigingen.
- **PickupFlow is nu een scan-flow**, consistent met retour en lenen. Per
  gereserveerd item is een teller "X / Y gescand" zichtbaar; scannen
  verhoogt de teller, plus/min-knoppen doen dat handmatig, en de knop
  "Niet meenemen" markeert een item als bewust achtergelaten (soft-delete).
  Afronden ("Ophalen bevestigen") kan pas als elk item ofwel is gescand
  (deels of vol) ofwel als "niet meenemen" is gemarkeerd — een item met 0
  scans en zonder markering blokkeert bevestigen met een duidelijke
  melding welk item nog open staat. De hoofdscanner reageert op barcodes
  van reserverings-items; scannen van iets dat er niet op staat toont een
  hint om de "Extra materiaal"-sectie te gebruiken.
- **Bulk gedeeltelijk meenemen wordt server-side afgehandeld**:
  `POST /:id/pickup` accepteert nu naast `remove` en `add` ook een `keep`-
  lijst met `[{ id, quantity }]`. Bij een `quantity` kleiner dan de
  gereserveerde hoeveelheid splitst de backend het `bon_item` in twee
  rijen — de originele rij krijgt `quantity=kept` en `picked_up=1`, en er
  komt een schaduw-rij met `quantity=vrijgekomen` en `removed_at_pickup=1`
  (`picked_up=0`). Alles in één transactie; de retour-, beschikbaarheids-
  en mailtemplate-logica blijven ongewijzigd omdat soft-delete-rijen
  nergens meetellen. Validatie:
  - `keep[i].quantity` moet 1..origineel zijn — 0 wordt afgewezen met een
    hint om `remove` te gebruiken.
  - `keep` en `remove` mogen elkaar niet overlappen.
  - Ontbreekt `keep` voor een item, dan blijft dat item volledig
    meegenomen (backwards compatible met de v1.8.0 "kaal opnemen"-call).
- **Beschikbaarheidscheck bij `add` gebeurt nu ná de kept-mutatie**, binnen
  dezelfde transactie. Zo telt de gereduceerde eigen reservering correct
  mee — een edge case in v1.8.0 waarbij "alles behouden + zelfde materiaal
  toevoegen" tot oversubscribe kon leiden is daarmee weg. Bij een conflict
  rolt de transactie volledig terug (409 met `details`, bon blijft
  `reserved`).

### Opgelost
- **Reserveringstatus werd fout afgeleid uit de datum**: `computeStatus` in
  `server/routes/bons.js` zette een reservering die vandaag (of eerder)
  startte meteen op `'active'`. Dat botste met de v1.8.0-flow waarin een
  reservering pas via `POST /:id/pickup` `'active'` mag worden. Vervangen
  door `statusFromIntent(intent)`: de frontend stuurt bij `POST /api/bons`
  nu expliciet `intent: 'reservation' | 'loan'` mee, en die intentie is
  leidend voor de status. Ontbrekende `intent` geeft een 400 met
  Nederlandse foutmelding.
- **PUT `/api/bons/:id`** rekent geen status meer uit uit datums. Bestaande
  status en `completed_at` blijven behouden; een admin die een reservering
  verplaatst houdt daarmee een reservering. Voorheen kon een datum-
  wijziging ongewild `'completed'` triggeren.
- **Automatische `'completed'`** bij retrocreatie (return_date in het
  verleden) is weg. `'completed'` wordt uitsluitend nog gezet door de
  retour-flow wanneer alle items binnen zijn.
- **`checkStock` blijft ongewijzigd** (`b.status IN ('active','reserved')`)
  — reserveringen blokkeren nog steeds voorraad in hun periode.
- **Bestaande bonnen in de DB** zijn niet aangeraakt: geen retro-migratie,
  alleen nieuwe creates/updates volgen de nieuwe regels.

## [1.8.0] - 2026-07-28

Blok 1 van Ronde B: reservering en ophalen zijn nu twee losse momenten.
Bij ophalen kan de gebruiker items uit de reservering weglaten en extra
materiaal toevoegen, met live beschikbaarheidscheck.

### Toegevoegd
- **`PickupFlow.jsx`** — nieuwe user-flow voor "Ophalen". Selecteer een
  reservering, vink af wat je *niet* meeneemt, voeg optioneel extra
  materiaal toe via scan of zoeker (met live beschikbaarheidscheck die de
  eigen reservering uitsluit), en bevestig. Toegevoegd materiaal wordt in
  één transactie samen met de pickup weggeschreven.
- **UserHome krijgt twee aparte tegels**: "Ophalen" (indigo) en
  "Retourneren" (emerald), in plaats van de gecombineerde "Retour /
  Ophalen"-tegel. Layout nu 4 kolommen (2×2 op mobile).
- **`POST /api/bons/:id/pickup`** accepteert body
  `{ remove: [bon_item_id], add: [{ kind, id, quantity }] }`:
  - `remove` zet `removed_at_pickup=1` op de betrokken items (soft-delete);
  - `add` verifieert beschikbaarheid via `checkStock` met `excludeBonId`
    zodat de eigen reservering niet dubbel telt, en voegt nieuwe items in
    met `added_at_pickup=1, picked_up=1`;
  - alle mutaties in één transactie — bij een voorraadconflict wordt niets
    weggeschreven en volgt 409 met concrete cijfers per item.
- **Nieuwe kolommen op `bon_items`**: `removed_at_pickup` en
  `added_at_pickup` (beide `INTEGER NOT NULL DEFAULT 0`, met
  CHECK-constraint). Migratie voor bestaande DBs neemt de default over.
- **`bon_pickup` log-actie** met leesbare NL-omschrijving, bv.
  `"BON-2026-0007 opgehaald voor Jan Vrijwilliger: 1x Tennisbal — niet
  meegenomen: 2x Pittenzakje — toegevoegd bij ophalen: 1x Kaatsbal"`.
- **`BonDetailModal`** (admin) toont bij items het labeltje "toegevoegd
  bij ophalen" en heeft onderaan een aparte "Niet meegenomen bij ophalen"-
  sectie met de soft-deleted items — audit-weergave voor admins.

### Gewijzigd
- **Ophaalbevestiging** filtert de soft-deleted items uit de mail — de
  gebruiker krijgt alleen de definitieve, meegenomen items te zien. De
  mail maakt geen verschil tussen "stond op reservering" en "bij ophalen
  toegevoegd".
- **Beschikbaarheid** (`checkStock` server + `getAvailForItem` en
  `loanedQty`/`reservedQty` frontend) sluit alle rijen met
  `removed_at_pickup=1` uit. Soft-deleted items geven direct voorraad
  vrij.
- **Retour-flow** filtert soft-deleted items: die zijn nooit het hok uit
  gegaan en verschijnen dus niet in de retour-vinklijst. `openCount` in de
  retour-transactie kijkt daar ook aan voorbij.
- **`ReturnFlow.jsx`** doet nu uitsluitend retour; de pickup-tak
  (die eerder verstopt in `activeBon.status === 'reserved'` zat) is
  verhuisd naar `PickupFlow`.
- **`utils/bons.js`** krijgt een nieuwe helper `bonActiveItems(b)` voor
  UI-lijsten die soft-deleted items moeten weglaten. `bonRemaining` en
  `bonComplete` gebruiken 'm.
- **API-client**: `pickupBon(id, { remove, add })` in plaats van
  `pickupBon(id)`. Zonder tweede argument werkt 'ie achterwaarts
  compatibel (kaal opnemen zoals gereserveerd).
- **Ronde B-guarantee** in `PUT /api/bons/:id`: de handler blijft
  admin-only (via bestaande `requireAdmin`). Een gebruiker die het toch
  probeert krijgt 403 met "Alleen admins mogen deze actie uitvoeren."
  Doc-comment in de code verwijst expliciet naar het besluit.

## [1.7.0] - 2026-07-28

E-mailvoorkeuren per gebruiker en de retourherinnering — twee samenhangende
onderdelen die op het e-mailfundament uit v1.6.0 leunen.

### Toegevoegd
- **Drie aparte e-mailvoorkeuren per gebruiker** (`notify_reservation`,
  `notify_pickup`, `notify_reminder`) in plaats van de grofmazige
  `email_reminders`. Frontend toont drie toggles in het profielscherm van
  de gebruiker met korte uitleg per mail; admin kan ze ook zetten via de
  gebruikersbeheer-tab.
- **Reserveringsbevestiging** en **ophaalbevestiging** zijn nu twee aparte
  mails: reserveringen (`POST /api/bons` met status `reserved`) vallen
  onder `notify_reservation`; direct-lenen (`POST /api/bons` met status
  `active`) en het ophalen van een reservering (`POST /api/bons/:id/pickup`)
  vallen onder `notify_pickup`.
- **Retourherinnering** op de laatste werkdag vóór de retourdatum. Nieuwe
  scheduler in `server/mail/scheduler.js` draait elke 30 minuten (plus
  eenmaal bij startup), respecteert het verzendvenster 08:00–18:00 op
  werkdagen, en markeert bonnen na succesvolle verzending in
  `bons.reminder_sent_at` zodat er nooit dubbel herinnerd wordt. Bij een
  gemiste herinnerdag (laptop uit) wordt alsnog een catch-up-mail
  gestuurd met tekst "je materiaal moet binnenkort terug".
- Nieuw e-mailsjabloon `returnReminder(bon, { catchup })` met HTML +
  platte-tekst-variant.
- Nieuw endpoint `PUT /api/me/notifications` voor ingelogde gebruikers om
  hun eigen voorkeuren te zetten. `GET /api/me` geeft de voorkeuren ook
  terug.

### Gewijzigd
- Database-migratie: `users.email_reminders` (v1.6.0) is vervangen door
  drie kolommen (`notify_reservation`, `notify_pickup`, `notify_reminder`).
  De oude waarde is naar alle drie de nieuwe kolommen gekopieerd zodat
  niemand ineens andere voorkeuren heeft. Daarna is de oude kolom gedropt
  (SQLite 3.35+, aanwezig op 3.53).
- Bons-tabel heeft een nieuwe kolom `reminder_sent_at TEXT` (nullable) met
  lichte migratie voor bestaande DBs.
- Response van `POST /api/users` en `PUT /api/users/:id` accepteert de drie
  voorkeuren; admin kan ze bij een andere gebruiker aanpassen.
- Frontend-user-object (`sessionStorage`) wordt bij het toggelen van een
  voorkeur direct bijgewerkt via een nieuwe callback `onProfileUpdate`,
  zodat de UI en de sessie synchroon blijven.

### Aanhakingspunt (nog niet gebouwd)
- **Externe huurders (ronde B)** krijgen straks alle drie de mails altijd,
  ongeacht voorkeuren. In `server/routes/bons.js` en
  `server/mail/scheduler.js` staan expliciete comments waar de check moet
  worden overgeslagen zodra de externe-huurder-entiteit bestaat.

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
