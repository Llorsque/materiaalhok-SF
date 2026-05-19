# Installatie op de Windows-laptop

Deze handleiding zet de materiaalhok-tool op een verse Windows-laptop neer.
Doelgroep: een collega met basis-computervaardigheden, geen programmeerkennis
nodig. In ongeveer 30 minuten klaar als alles meezit.

Werk de stappen op volgorde af. Als iets niet lukt, kijk onderaan bij
**Bij problemen**.

## Wat heb je nodig

- Een laptop met Windows 10 of Windows 11.
- Een internetverbinding tijdens de installatie. Daarna mag de laptop offline,
  zolang gebruikers wél via het lokale netwerk of de Cloudflare-tunnel kunnen
  bereiken.
- Ongeveer 500 MB vrije schijfruimte.
- Administrator-rechten op de laptop (nodig voor de installers).

## Stap 1 — Node.js installeren

1. Open een browser en ga naar [https://nodejs.org](https://nodejs.org).
2. Klik op de groene knop **LTS** (de stabiele versie, niet "Current").
3. Het bestand `node-vXX.X.X-x64.msi` wordt gedownload. Open het.
4. Klik door de installer met de standaardinstellingen. Klik op de laatste
   pagina **Finish**.
5. Test de installatie:
   - Open **PowerShell** (toets Windows-toets, typ "powershell", druk Enter).
   - Typ `node --version` en druk Enter. Je ziet iets als `v22.x.x`.
   - Typ `npm --version`. Je ziet bijvoorbeeld `10.x.x`.

Werkt allebei? Door naar stap 2.

## Stap 2 — Git installeren

1. Ga naar [https://git-scm.com](https://git-scm.com) en klik **Download for
   Windows**.
2. Open het gedownloade bestand `Git-X.XX-64-bit.exe`.
3. Klik door de installer met alle standaardopties (alleen "Next" klikken is
   prima).
4. Test in **PowerShell**: typ `git --version`. Je ziet iets als
   `git version 2.XX.X.windows.X`.

## Stap 3 — Project ophalen

1. Maak een map waar het project komt te staan. Bijvoorbeeld op het bureaublad
   een map **materiaalhok**. Open die map in Verkenner.
2. Klik rechtsbovenin de Verkenner-adresbalk, typ `powershell` en druk Enter.
   Je krijgt een PowerShell-venster dat al in die map staat.
3. Typ achter elkaar:

   ```powershell
   git clone https://github.com/Llorsque/materiaalhok-SF.git
   cd materiaalhok-SF
   ```

4. Je hebt nu een map `materiaalhok-SF` met de hele code erin.

## Stap 4 — Dependencies installeren

Vanuit de PowerShell in `materiaalhok-SF`:

```powershell
npm install
cd server
npm install
cd ..
```

Dit downloadt alle benodigde pakketten. De eerste keer duurt het ongeveer
twee minuten. Je krijgt mogelijk waarschuwingen over "deprecated" pakketten —
dat is normaal en geen probleem.

## Stap 5 — Eerste admin-account aanmaken

> **Belangrijk:** draai het seed-script (`npm run seed` in de server-map)
> **niet** op productie. Dat wist alle data en zet testgebruikers met
> standaardwachtwoorden klaar. Maak in plaats daarvan handmatig één
> admin-account met een eigen sterk wachtwoord.

1. Bedenk een sterk wachtwoord voor de eerste admin (minimaal 12 tekens, mix
   van letters, cijfers en leestekens). Schrijf het op een veilige plek op.
2. Maak in de map `materiaalhok-SF\server` een nieuw tekstbestand
   `create-admin.js` met de volgende inhoud:

   ```javascript
   // Eenmalig: maakt één admin aan. Daarna kun je dit bestand wissen.
   const db = require('./db');
   const bcrypt = require('bcrypt');
   const { nowDutchISO } = require('./utils');

   const NAAM      = 'Jouw naam';          // pas aan
   const EMAIL     = 'jij@voorbeeld.nl';   // pas aan
   const WACHTWOORD = 'KIES-EEN-STERK-WACHTWOORD'; // pas aan

   const hash = bcrypt.hashSync(WACHTWOORD, 10);
   db.prepare(
     'INSERT INTO users (name, email, password_hash, role, login_barcode, created_at) VALUES (?, ?, ?, ?, ?, ?)'
   ).run(NAAM, EMAIL, hash, 'admin', null, nowDutchISO());
   console.log('Admin aangemaakt:', EMAIL);
   ```

3. Pas de drie variabelen bovenaan aan met je echte gegevens.
4. Draai het script:

   ```powershell
   cd server
   node create-admin.js
   cd ..
   ```

5. Je ziet `Admin aangemaakt: jij@voorbeeld.nl`. Verwijder daarna
   `create-admin.js` zodat het wachtwoord niet op schijf blijft staan.

## Stap 6 — Backend en frontend opstarten

De tool bestaat uit twee processen die tegelijk moeten draaien: de backend
(poort 3001) en de frontend (poort 5173).

### Optie A — Handmatig, twee PowerShell-vensters

1. Open een PowerShell in `materiaalhok-SF\server` en typ `npm start`. Laat
   dat venster open.
2. Open een tweede PowerShell in `materiaalhok-SF` en typ `npm run dev`. Laat
   ook dat venster open.

### Optie B — Met één klik via een batch-bestand

Maak in de project-root een bestand `start-materiaalhok.bat` met deze inhoud:

```bat
@echo off
cd /d "%~dp0server"
start "Backend"  cmd /k npm start
cd /d "%~dp0"
start "Frontend" cmd /k npm run dev
```

Dubbelklik op `start-materiaalhok.bat` om beide processen tegelijk te starten.

## Stap 7 — Backup-taak inplannen in Windows Taakplanner

1. Druk op de Windows-toets, typ **Taakplanner** en open het programma.
2. Rechts in het deelvenster: klik **Taak maken...** (niet "Eenvoudige taak
   maken").
3. **Tabblad Algemeen:**
   - Naam: `Materiaalhok backup`
   - Vink aan: **Uitvoeren met hoogste machtigingen**
   - Configureren voor: **Windows 10** (of 11 — wat je gebruikt)
4. **Tabblad Triggers** → **Nieuw...**:
   - Trigger starten: **Volgens een schema** → **Dagelijks**
   - Starten: vandaag, **03:00:00**
   - Vink onderaan aan: **Ingeschakeld**
5. **Tabblad Acties** → **Nieuw...**:
   - Actie: **Een programma starten**
   - Programma/script: `node`
   - Argumenten toevoegen: `backup.js`
   - Begin in: het volledige pad naar de server-map, bijvoorbeeld
     `C:\Users\jij\Desktop\materiaalhok\materiaalhok-SF\server`
6. **Tabblad Voorwaarden:**
   - **Vink uit:** "De taak alleen starten als de computer netvoeding heeft"
     (anders blijft 'ie liggen als de laptop op accu draait).
7. **Tabblad Instellingen:**
   - **Vink aan:** "De taak zo snel mogelijk uitvoeren nadat een geplande
     start is gemist". Hierdoor draait de backup alsnog wanneer de laptop om
     03:00 uitstond.
   - "De taak stoppen als deze langer dan ... duurt": 1 uur is ruim genoeg.
8. Klik **OK**. Windows vraagt om je accountwachtwoord (de taak draait onder
   dat account).
9. Test direct: selecteer de taak in de lijst en klik rechts op **Uitvoeren**.
   Kijk daarna in `materiaalhok-SF\server\backups\` — er staat een
   `database-YYYY-MM-DD.db` en `last-backup.json`.

## Stap 8 — Kioskmodus instellen

De scan-laptop staat in een vaste fullscreen-browser. Voorkomt dat
medewerkers per ongeluk naar Outlook of YouTube switchen.

### Snelkoppeling maken

1. Klik met rechts op een leeg stuk bureaublad → **Nieuw** → **Snelkoppeling**.
2. Locatie van het item: vul één van onderstaande in.
   - Voor Chrome:
     `"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --app=http://localhost:5173/`
   - Voor Edge:
     `"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --kiosk --app=http://localhost:5173/`
3. Naam: `Materiaalhok kiosk`. **Voltooien**.

Dubbelklik om te testen. Browser opent zonder adresbalk, taakbalk, tabbladen
of menu's. Sluit met `Alt + F4`.

### Automatisch starten bij Windows-login

1. Druk `Windows + R`, typ `shell:startup`, druk Enter. Verkenner opent de
   "Opstartmap" voor jouw account.
2. Sleep de snelkoppeling **Materiaalhok kiosk** naar deze map (Ctrl
   ingedrukt houden om een kopie te maken in plaats van te verplaatsen).
3. Sleep ook `start-materiaalhok.bat` uit stap 6 hierheen, zodat backend en
   frontend automatisch starten.

Volgende keer dat je inlogt op de Windows-laptop, draait alles vanzelf.

## Stap 9 — Eerste werking testen

Open de tool in de browser (`http://localhost:5173`) en doorloop deze
checklist:

- [ ] Inloggen lukt met het admin-account uit stap 5.
- [ ] Admin → tab **Materiaal**: lijst is zichtbaar (waarschijnlijk leeg op
      een verse installatie; importeer via tab **Import** een Excel om
      verder te kunnen).
- [ ] Admin → tab **Gebruikers**: een tweede testgebruiker aanmaken lukt.
- [ ] Uitloggen, opnieuw inloggen als die testgebruiker.
- [ ] Een testbon maken met één materiaal erop.
- [ ] Uitloggen, weer als admin inloggen, **Bonnen**-tab: testbon staat erin.
- [ ] In het bon-detail: items op "retour" zetten en bon afronden.
- [ ] Eventueel de testbon weer verwijderen.

Werkt alles? De installatie is gelukt.

## Stap 10 — Backup-controle

Backups moeten zonder dat iemand erom hoeft te denken doorgaan. Controleer
dit twee manieren:

1. **Na de eerste nacht:** kijk in `materiaalhok-SF\server\backups\`. Je
   verwacht daar:
   - `database-YYYY-MM-DD.db` van vandaag (of gisteren als de laptop uit
     stond rond 03:00 en de taak nog niet ingehaald is).
   - `last-backup.json` met `"success": true` en een recente `timestamp`.
   - `backup.log` met een `OK`-regel.
2. **Vanuit de admin:** log in als admin. Bovenaan elke admin-pagina
   verschijnt een gele of rode banner als de laatste backup ouder is dan
   48 uur of gefaald is. Bij de knop **Maak nu een handmatige backup**
   draait `node backup.js` direct vanaf de server en wordt de status
   ververst.

Tip: na 14 dagen worden oude backups automatisch geruimd. Wil je langer
bewaard, kopieer dan af en toe een `.db`-bestand naar een externe schijf.

## Bijlage — Bekende issues

Een lijstje met dingen die op het moment van schrijven nog niet werken zoals
gewenst staat in `BEKENDE-BUGS.md` in de repo. Daarin onder andere:

- De API is nog niet beschermd met een sessie-token; alleen acceptabel zolang
  de tool lokaal blijft of achter Cloudflare Access.
- De Sets-flow voor uitlenen door gebruikers ontbreekt nog.
- De badge-scan login submit na drie karakters.

## Bij problemen

**De browser zegt "Kan deze pagina niet bereiken" op `localhost:5173`.**
Frontend draait niet. Open `start-materiaalhok.bat` opnieuw, of kijk of het
frontend-PowerShell-venster nog draait (moet `VITE vX.X.X ready in ...`
tonen).

**De tool laadt wel, maar bij elke actie verschijnt "Geen verbinding met de
server".**
Backend draait niet of niet op poort 3001. Test in PowerShell:
`curl http://localhost:3001/api/health`. Je verwacht `{"status":"ok",...}`.
Geen antwoord? Start de backend opnieuw via `start-materiaalhok.bat`.

**De backup-banner blijft rood terwijl ik net een backup heb gedraaid.**
Refresh de pagina (`Ctrl + R`). De banner haalt de status op bij het laden
van de admin-view.

**Backup-taak draait niet om 03:00.**
Open Taakplanner → klik op de taak → tabblad **Geschiedenis**. Daar staan
foutmeldingen. Veel voorkomende oorzaken: laptop stond uit (Windows haalt 'm
dan zelf in als de gemiste-taak-instelling aan staat), of het pad bij
"Begin in" klopt niet — controleer of het naar de **server**-submap wijst.

**De Excel-import doet niets / geeft een rare fout.**
Controleer dat de tabbladen exact `Losse materialen` en `Sets` heten en dat
de kolomnamen kloppen (zie de uitleg op de Import-pagina in de admin).

**Ik weet mijn admin-wachtwoord niet meer.**
Open de map `server` in PowerShell. Maak opnieuw een klein script zoals in
stap 5, maar gebruik nu deze SQL in plaats van een INSERT:

```javascript
const db = require('./db');
const bcrypt = require('bcrypt');
const NIEUW_WACHTWOORD = 'KIES-NIEUW';
const EMAIL = 'jij@voorbeeld.nl';
db.prepare('UPDATE users SET password_hash = ? WHERE email = ?')
  .run(bcrypt.hashSync(NIEUW_WACHTWOORD, 10), EMAIL);
console.log('Wachtwoord gereset voor', EMAIL);
```

Daarna draaien met `node` en het bestand weer verwijderen.
