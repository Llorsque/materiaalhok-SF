# Besluiten — materiaalhok-SF

Dit bestand legt de uitgangspunten en richting van het project vast.
Bedoeld als geheugensteun voor mezelf en voor iedereen die later
meekijkt of meewerkt. Niet formeel, wel scherp.

## Uitgangspunten

- **Robuust zonder poespas.** De tool moet betrouwbaar doen wat 'ie
  hoort te doen bij normaal gebruik en bij voor de hand liggende
  fouten. Niet kogelvrij voor extreme situaties — daarvoor is de
  schaal te klein.
- **Geen feature zonder probleem.** Elke toevoeging moet een echt
  probleem oplossen dat ik nu heb of binnen drie maanden krijg.
  "Zou ook leuk zijn" is geen reden.
- **Admin kan zelf onderhouden.** De tool mag niet afhankelijk worden
  van mij. Een admin moet bonnen kunnen corrigeren, voorraad bijstellen,
  gebruikers beheren, backups draaien en foutmeldingen kunnen lezen
  zonder de terminal te openen.
- **Geen stille keuzes.** Belangrijke technische beslissingen worden
  expliciet gemaakt en hier of in de code-commentaar genoteerd. Liever
  even stilstaan dan iets aanzetten waarvan ik later niet meer weet
  waarom het er staat.
- **Kleine iteraties.** Wijzigen, in de browser zien, tevreden? committen.
  Branches voor experimenten. Geen grote sprongen.

## Architectuur in het kort

De tool draait op één laptop in het materiaalhok. Daar staat een lokale
SQLite-database (één bestand) als opslag, met een dunne Node-backend
ervoor en de bestaande React-frontend erbovenop. De scan-laptop opent
de app in kioskmodus op localhost. Drie admins en circa vijftien
gebruikers kunnen vanaf hun eigen apparaat inloggen via een Cloudflare
Tunnel met Cloudflare Access ervoor — alleen vooraf goedgekeurde
e-mailadressen komen erdoorheen. Geen eigen domein om te starten.
Dagelijkse backup van het databasebestand naar een instelbare locatie,
veertien dagen historie.

## Roadmap

1. **Codestructuur opknippen** — App.jsx splitsen in losse componenten,
   geen functionele wijzigingen.
2. **Backend en SQLite optuigen** — Node + Express + SQLite ernaast
   bouwen, frontend voorlopig ongewijzigd.
3. **Frontend overzetten naar de backend** — per scherm localStorage
   vervangen door API-calls.
4. **Authenticatie en gebruikersbeheer goed neerzetten** — gehashte
   wachtwoorden, gebruikers gekoppeld via ID, e-mailbon na uitleen
   en reservering.
5. **Frisse materialenlijst inladen en barcode-generator robuust maken**
   — Code 128, geen dubbele codes, importeerbaar via UI.
6. **Cloudflare Tunnel + Access en kioskmodus inrichten** — remote
   toegang voor admins en gebruikers, scan-laptop fullscreen op
   localhost.
7. **Backups en admin-onderhoudsfuncties afronden** — geplande backups,
   herstelknop, leesbare foutafhandeling.

## Iteratie 6 — import-strategie

- **Excel-bestand direct uploaden (.xlsx).** Drie tabbladen verwacht: "Losse
  materialen", "Sets", "Nog op te lossen". Tabblad 3 wordt door de import-tool
  genegeerd.
- **Eén knop importeert tabblad 1 en 2 tegelijk.** Geen aparte upload per
  tabblad.
- **Preview vóór import met expliciete bevestiging.** Gebruiker ziet wat er
  toegevoegd en bijgewerkt gaat worden, en moet daarna bevestigen.
- **Geen WIS-modus.** Import werkt slim: rij met bestaande barcode in de
  barcode-kolom → update bestaand materiaal. Geen barcode of onbekende barcode
  → nieuw materiaal. Items in de database die niet in Excel staan: blijven met
  rust.
- **Iteratie 6-minimum is alleen de eerste import-richting (Excel → database).**
  Export-functie en re-import met barcode-matching komen in een latere iteratie.
- **Barcode-format: Code 128.** Structuur `M-XXXX` voor materialen, `S-XXXX`
  voor sets. Automatisch oplopend. Generator controleert altijd op uniciteit en
  telt door bij botsing.
- **Alleen admins kunnen importeren.** Knop in admin-Instellingen of een
  vergelijkbare admin-sectie.
- **Validatie streng op structuur, tolerant op rijen.** Tabbladen en
  kolomnamen moeten kloppen, anders stopt de import. Foute rijen worden
  overgeslagen en gerapporteerd in de preview.

## Iteratie 6 — barcode-export voor Dymo

- **Tool genereert geen labels zelf.** De admin beheert een eigen Dymo-template
  in Dymo Label Software (Dymo LabelWriter 550, label 36×89mm).
- **Tool exporteert CSV** voor import in Dymo Label Software.
- **In admin → Barcodes komt een selectie-pagina** met vinkjes per item,
  filters (type, categorie, zoeken op naam) en bulk-acties (selecteer alles,
  deselecteer alles).
- **Geen aantal-veld in de tool.** Eén CSV-rij per geselecteerd item. Aantal
  labels regelt de admin per item in Dymo Label Software bij het printen.
- **CSV-kolommen:** Barcode, Naam, Categorie, Locatie, Type.
- **Directe download bij klik op export-knop**, met bestandsnaam
  `barcodes-export-YYYY-MM-DD-HHMM.csv`.
- **Visuele stijl van de label** (kleur, layout, lettertype): keuze van de
  admin in Dymo, geen tool-bemoeienis.

## Iteratie 7-minimum — backup en kioskmodus

- **Dagelijkse backup van het databasebestand.** Opslag: in een map `backups/`
  naast de database op dezelfde laptop. Niet naar netwerk of cloud.
- **Frequentie:** één keer per dag om 03:00. **Bewaartermijn:** 14 dagen —
  oudere backups worden automatisch verwijderd.
- **"Haal gemiste taken in"-instelling in Windows-taakplanner** zorgt dat de
  backup alsnog draait wanneer de laptop op het geplande tijdstip uitstond.
- **Backup-status wordt bijgehouden:** zowel in een logbestand
  `backups/backup.log` als in een database-tabel `backup_status` (of een
  vergelijkbaar JSON-bestand met de laatste status).
- **In de admin verschijnt een waarschuwingsbanner** wanneer de laatste backup
  ouder is dan 48 uur of gefaald is, met een knop "Maak nu een handmatige
  backup".
- **Kioskmodus is geen code-werk in onze tool** maar Windows-configuratie. We
  schrijven een installatiehandleiding voor de Windows-laptop die later wordt
  gevolgd.

## Operationele besluiten — laptop en e-mail

- **Laptop draait maandag t/m vrijdag.** Handmatig aan om 08:00 op
  maandagochtend, automatisch uit om 19:00 op vrijdagavond via de
  Windows-taakplanner. In het weekend staat 'ie uit — dus geen bonnen,
  geen mails, geen backups tussen vrijdag 19:00 en maandag 08:00.
- **WiFi in het materiaalhok is aanwezig**, dus e-mailverzending vanuit
  de tool is technisch mogelijk. Geen SMS-fallback of andere kanalen.
- **Automatische mails alleen tussen 08:00 en 18:00.** Nooit daarbuiten.
  Wie op maandagochtend 08:05 z'n materiaal komt afhalen krijgt geen
  mail die om 07:59 al klaarstond.
- **Bevestigingsmails (bon aangemaakt, materiaal afgehaald) gaan direct
  bij de handeling.** Die vallen automatisch binnen kantoortijd omdat
  de tool alleen dan gebruikt wordt — geen aparte planning nodig.
- **Retourherinnering gaat naar de laatste werkdag vóór de retourdatum.**
  Retour op maandag → mail op vrijdag. Retour op woensdag → mail op
  dinsdag. Geen "één dag ervoor" als dat op een zaterdag valt.
- **Retourdatums kunnen alleen op werkdagen vallen.** Zaterdag en zondag
  zijn niet selecteerbaar. Wordt in de datumkiezer afgedwongen, niet
  pas bij het opslaan.
- **Gebruikers kunnen e-mailherinneringen zelf uitzetten in hun profiel.**
  Bevestigingsmails blijven altijd, herinneringen zijn opt-out.

## Ronde B — reservering/ophaal, kwijt/kapot en admin-dashboard

### Reservering en ophalen zijn twee losse momenten

- **Reservering** legt materiaal, ophaaldatum én retourdatum vast en stuurt
  een reserveringsbevestiging. De retourdatum ligt vanaf dat moment vast —
  ophalen kan de scope nog verkleinen of verruimen, maar niet de retourdatum
  opschuiven. Wie later terug wil, moet een nieuwe reservering maken.
- **Ophalen** is het echte uitleenmoment. De reservering wordt op dat moment
  de definitieve bon. De inhoud mag bij ophalen nog afwijken:
  - **Minder**: de gebruiker verwijdert items uit de te-scannen lijst.
    Waarom: bij de reservering weet je nog niet altijd exact wat er past;
    liever een correcte bon dan een bon met spookitems die daarna scheve
    voorraadcijfers geeft.
  - **Meer**: knop "extra materiaal toevoegen" die de normale
    beschikbaarheidscheck doet. Toegevoegd materiaal blijft in de data
    herkenbaar als "na reservering toegevoegd" (bv. een vlag op het
    bon_item), zodat we later kunnen zien hoe vaak dit gebeurt.
- **Op het ophaalmoment** gaat de ophaalbevestiging (de definitieve bon) de
  deur uit. Reservering en ophaal zijn dus twee mailmomenten met twee
  voorkeurs-toggles, precies zoals `notify_reservation` en `notify_pickup`
  al gescheiden zijn (v1.7.0).
- **Directe uitlening zonder voorafgaande reservering** krijgt géén aparte
  ophaalmail; die krijgt gewoon de bonbevestiging. Anders zou de gebruiker
  bij een spontane uitleen ineens twee bijna-identieke mails krijgen.

### Kwijt en kapot

- **Gebruiker meldt bij retour** of een item kwijt of kapot is. Twee aparte
  keuzes, niet één "probleem"-vlag — kwijt en kapot vragen verschillende
  vervolgacties (zoeken vs. repareren/afschrijven) en we willen het
  onderscheid in de data terugzien.
- **Voorraad wordt op dat moment direct aangepast.** Bij bulk-materiaal
  zakt het aantal met de gemelde hoeveelheid; een uniek item wordt
  onbeschikbaar (aparte status, zodat 'ie later gerepareerd kan worden
  zonder dat we een nieuwe barcode moeten uitgeven).
- **Waarom direct en waarom via de gebruiker?** Het materiaal is op dat
  moment fysiek weg of stuk. Wachten tot een admin er ooit naar kijkt is
  geen optie — dan lopen voorraadcijfers en werkelijkheid uiteen, en de
  volgende gebruiker vertrouwt de app niet meer. De gebruiker legt het
  fysiek apart en meldt het; de admin krijgt een signaal en behoudt
  controle via het overzicht. Elk geval levert een spoor + adminmelding op.
- **Schade/verlies-overzicht** is altijd live: openstaande gevallen bovenaan,
  afgehandelde historie eronder. Geen jaarlijkse afsluiting — dan verlies
  je juist de langetermijnpatronen waar we het overzicht voor maken.
- **Admin kan de status later bijwerken**:
  - *Gerepareerd* / *vervangen* → voorraad omhoog.
  - *Afgeschreven* → voorraad blijft eraf.
  - Elke mutatie komt in het logboek (bestaande `logs`-tabel).
- **Doel op termijn**: inzicht in welk materiaal vaak kapot gaat of
  kwijtraakt, als basis voor vervangings- en inkoopbeslissingen. Alleen de
  raw data verzamelen is nu genoeg — analyse-tooling komt pas als er een
  jaar aan data ligt.

### Admin-dashboard

- **Dashboard/homepagina voor admins met tiles.** Elke tile toont één
  signaal + telling. Klik → detail-modal met de onderliggende gevallen en
  directe acties. Verschilt van het bestaande dashboard doordat het
  actiegericht is (wat moet je *nu* oplossen?) i.p.v. rapportage-achtig.
- **Zes signalen** in Ronde B:
  1. Bonnen te laat (retourdatum verstreken, status niet completed).
  2. Openstaande incomplete retouren (bon geretourneerd maar niet alle
     items binnen).
  3. Kwijt gemeld (nog niet afgehandeld door admin).
  4. Kapot / in reparatie (nog niet afgehandeld door admin).
  5. Voorraad laag (op of onder de drempel).
  6. Mislukte e-mails (logs met actie `mail_failed`).
- **Voorraaddrempel**: één instelbare **standaarddrempel voor alles**
  (bv. `stock_threshold_default` in de settings), met een **optioneel eigen
  drempelveld per materiaal** dat de standaard overschrijft. Reden: bij 167
  materialen is per stuk instellen ondoenlijk, maar één vaste drempel is
  ook onhandig — een voetbal met stock 20 en een zeldzaam item met stock 2
  vragen om verschillende signalen. Standaard + uitzondering geeft het
  beste van beide.
- **Geen e-mail naar de admin bij deze signalen.** Alles loopt via het
  dashboard. Reden: admins zijn in het hok wanneer ze de tool gebruiken —
  daar horen de signalen ook op te vallen. Mail zou een tweede kanaal
  worden dat we óók moeten onderhouden en kan snel wennen tot ruis. De
  bestaande `mail_failed`-tile zorgt dat we falende mail wél in het zicht
  houden.

## Wat we expliciet niet doen (nu)

- Eigen desktop-app op de scan-laptop (browser in kioskmodus volstaat).
- Eigen domeinnaam (kan later, geen blokkade).
- Foto's bij materialen (later, niet in scope voor v1).
- TypeScript, automatische tests, CI/CD-pipelines (overkill voor de schaal).
- Voorrangslogica bij gelijktijdige reserveringen (volgorde van aanvraag,
  herzien na praktijkervaring).

Voor toekomstige features zie ROADMAP.md.
