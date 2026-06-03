# Roadmap — toekomstige features en uitbreidingen

Dit document beschrijft features die nog niet zijn gebouwd. Voor concrete keuzes
die zijn afgesproken zie BESLUITEN.md; voor bekende issues in bestaande code zie
BEKENDE-BUGS.md.

Sub-roadmaps zijn op volgorde van waarschijnlijke uitvoering. Per sub-roadmap
staan iteraties als geschat plan; details worden bepaald wanneer de iteratie
daadwerkelijk start.

---

## Sub-roadmap 1 — Remote toegang voor admins

**Status**: niet gestart. Eerst items 10 en 11 uit BEKENDE-BUGS.md oplossen.

**Doel**: admins kunnen vanaf andere locatie (kantoor, thuis) inloggen op
de tool om status te bekijken of beheer-acties uit te voeren.

**Voorwaarden vóór start**:
- Auth-middleware op alle backend endpoints (item 10 uit BEKENDE-BUGS.md)
- xlsx-pakket vervangen door veiliger alternatief zoals exceljs (item 11)

**Iteraties**:
A — Auth-middleware en sessie-token mechanisme
B — xlsx vervangen door exceljs
C — Cloudflare Tunnel opzetten op de Windows-laptop
D — Cloudflare Access policies voor login-bescherming
E — Domein-keuze maken en DNS inrichten
F — Testen vanuit andere locatie

**Geschatte omvang**: 4-5 sessies.

---

## Sub-roadmap 2 — Externe verhuur

**Status**: niet gestart. Start na productie-stabiele interne uitleen-tool.

**Doel**: admins kunnen materiaal verhuren aan externe partijen (verenigingen,
bedrijven, particulieren) bovenop de bestaande interne uitleen.

**Vastgelegde aannames**:
- Juridisch laagdrempelig — geen advocaat-niveau, wel beargumenteerd akkoord
  op huurvoorwaarden door de huurder
- In basis gratis. Betaald (met factuur) komt later.
- Verzekering valt buiten scope van v1 — wordt eventueel later toegevoegd
- Alleen admins kunnen extern verhuren — gewone gebruikers niet

**Iteraties**:
A — Datamodel uitbreiden (tabel external_renters, kolom external_renter_id op bons)
    plus backend-routes voor CRUD op renters
B — Admin-UI voor externe verhuur: huurder-gegevens invullen, materiaal kiezen,
    bon aanmaken
C — Huurvoorwaarden + digitale akkoord-flow met versie-vastlegging
D — E-mailverzending via Gmail-integratie (SMTP of OAuth): bon plus voorwaarden
    naar huurder
E — Retour-flow voor externe huurders (admin doet retour of huurder via link)
F — Later: factureren bij betaalde verhuur (BTW, betaal-link, herinneringen)

**Geschatte omvang**: 5-7 sessies voor iteraties A t/m E. Factureren komt apart.

**Belangrijke vragen die voor start beantwoord moeten worden**:
- Hoe ziet de huurvoorwaarden-tekst eruit? Wie schrijft die en houdt 'm actueel?
- Wat is het format van de e-mailbevestiging — bon als bijlage of in body?
- Bij betaald (later): welke betaalmethode? Per factuur of direct?

---

## Sub-roadmap 3 — E-mailbonnen voor interne uitleen

**Status**: niet gestart. Uitgesteld in iteratie 5 (authenticatie).

**Doel**: vrijwilligers krijgen per e-mail een bevestiging van hun uitleen-
of reserveer-bon, met overzicht en retourdatum.

**Vermoedelijke aanpak**:
Hergebruikt de Gmail-integratie uit sub-roadmap 2 (iteratie D). Logisch om
deze sub-roadmap na of tegelijk met externe verhuur op te pakken zodat het
e-mailsysteem één keer wordt gebouwd voor beide use-cases.

**Geschatte omvang**: 1-2 sessies bovenop de Gmail-integratie van externe verhuur.

---

## Sub-roadmap 4 — Sets-tab in admin

**Status**: niet gestart. Klein werk, kan kandidaat zijn voor een aparte korte sessie.

**Doel**: admins kunnen sets bewerken (voorraad, samenstelling, locatie,
verwijderen) via de UI in plaats van alleen via Excel-import.

**Geschatte omvang**: 1 sessie van ongeveer 15-25 minuten.

---

## Sub-roadmap 5 — Performance-optimalisatie op productie-laptop

**Status**: gedeeltelijk gestart (Defender-uitzondering ingesteld).

**Doel**: opstartduur van Windows-laptop tot werkende tool terugbrengen
van circa 30 seconden naar onder de 10 seconden.

**Opties die nog open staan**:
- Vite production-build in plaats van dev-server (één Node-proces ipv twee)
- Onnodige Windows-opstartprogramma's uitschakelen
- RAM-upgrade van 4 GB naar 8 GB (hardware-overweging)

**Geschatte omvang**: Vite-build is een eigen iteratie van 1 sessie. Windows-
tweaks zijn losse 10-minuten-klusjes.

---

## Onderhoud — geen sub-roadmap maar wel te onthouden

- **Categorie-A werk voor uitrol** staat los van deze roadmap. Dat zijn praktische
  acties die niet in code worden gedaan: Dymo Label Software v8 installeren,
  sjabloon hermaken, stickers printen en plakken, vrijwilliger-accounts aanmaken,
  inlog-labels printen, gelamineerde instructiekaart maken. Reken op een werkdag
  praktisch werk.
- **Pilot met echte vrijwilliger**: na uitrol een korte praktijktest plannen om
  te zien wat in dagelijks gebruik opvalt. Feedback voedt prioriteit van komende
  iteraties.

---

## Hoe deze roadmap te onderhouden

Wanneer een sub-roadmap wordt gestart: noteer de start-datum. Wanneer voltooid:
beweeg de hele sectie naar een nieuw kopje "Voltooid" onderaan dit bestand, met
de voltooidings-datum en eventuele afwijkingen van het oorspronkelijke plan.

Nieuwe ideeën die in gesprekken naar voren komen worden direct hier toegevoegd
als nieuwe sub-roadmap met status "niet gestart".
