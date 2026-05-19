# Bekende bugs en pre-existing issues

Dingen die nu niet werken zoals verwacht maar die niet acuut hoeven worden opgelost.
Bedoeld als geheugensteun zodat we ze niet vergeten als we in een latere iteratie
aan het relevante onderdeel werken.

## Login

- **Badge-scan login submit na 3 karakters in plaats van na volledige code of Enter.**
  Pre-existing, bestond al voor de herstructurering. Niet acuut, te fixen wanneer
  we de loginflow opnieuw bekijken (iteratie 4 — authenticatie).

## API beveiliging

- **API endpoints (GET/POST/PUT/DELETE op materials, sets, users, bons) zijn nog
  niet beschermd door auth-middleware.** Wie de backend direct kan bereiken
  (lokaal of via netwerk) kan zonder login data lezen en wijzigen. Acceptabel in
  lokale single-laptop-context, maar niet zodra de tool via Cloudflare Tunnel of
  een ander netwerk-pad bereikbaar wordt. Moet opgelost zijn voor iteratie 7
  (Cloudflare). Concreet: sessie-token bij login, auth-middleware op alle
  data-endpoints.
- **xlsx-pakket heeft een open high-severity npm audit** (prototype pollution +
  ReDoS in SheetJS) zonder fix in de npm-versie. Acceptabel voor lokale
  single-laptop-context, maar moet vóór iteratie 7 (Cloudflare-exposure) weg.
  Mogelijke oplossingen: overstap naar SheetJS Pro/CDN-versie of overstap naar
  exceljs-package.

## Sets

- **Sets kunnen niet via de Lenen- of Reserveren-flow worden uitgeleend door
  gebruikers.** Database en backend ondersteunen sets in bon_items (set_id-veld),
  maar de frontend Lenen-/Reserveren-flow toont alleen materialen. Op te lossen
  in een volgende iteratie waar sets-in-uitleen-flow wordt toegevoegd.
- **Er is geen Sets-tab in de admin.** Admins kunnen sets niet bewerken
  (voorraad, samenstelling, verwijderen) via de UI. Sets worden alleen
  aangemaakt via Excel-import. Lijst is te bekijken via /api/sets. Op te lossen
  samen met sets-in-uitleen-flow.

## UI

- **Totaalaantal materialen niet zichtbaar in admin.** Onduidelijk of dit ooit
  ergens stond. Niet acuut. Mee te nemen wanneer we de admin-dashboard verbeteren.

## Materialen-formulier (admin)

- **Categorie-veld toont nog de oude hardgecodeerde lijst** (Sport sets, Atletiek,
  etc.) in plaats van de afgesproken nieuwe lijst (Atletiek, Racketsport,
  Balsporten, Circus, Doelgericht spel, Avontuurlijk, Hulpmiddelen,
  Aangepast/speciaal, Vervoer & opslag). Wordt opgeruimd in iteratie 6.
- **Velden voor "type" (uniek/bulk), "barcode" en "inkooplink" ontbreken in het
  formulier**, terwijl de backend deze ondersteunt. Backend geeft defaults
  (type=bulk, barcode=null). Wordt opgeruimd in iteratie 6.
- **Velden voor "Prijs/stuk" en "Onderhoud" zijn nog zichtbaar maar worden door
  de backend niet opgeslagen** (bewuste keuze conform BESLUITEN.md). Verwijderen
  of verbergen in iteratie 6.
- **Bij het wijzigen van de voorraad kan het oude getal niet met backspace
  worden gewist.** Alleen door het hele veld te selecteren en te overschrijven
  werkt het. Waarschijnlijk een minimum-validatie die het veld terugzet zodra
  het leeg dreigt te worden. Wordt opgeruimd in iteratie 6.

## Foutafhandeling UI

- **ConnectionBanner toont validatiefouten van de backend** (zoals "email bestaat
  al") samen met de algemene verbinding-foutmelding "Geen verbinding met de
  server". Dit is misleidend — server-validatiefouten zouden een eigen, kortere
  foutweergave moeten krijgen. Op te lossen in iteratie 5 wanneer auth-flow
  opnieuw wordt bekeken.

## UX verbeterpunten

- **De uitloggen-knop is voor users moeilijk vindbaar** — zit verstopt achter de
  avatar rechtsboven. Voor de user-flow waar mensen snel materiaal lenen en
  daarna uitloggen is een directere uitlog-knop wenselijk. Op te lossen in
  iteratie 5 of 6.
- **In admin → Bonnen-tab moet "Alle" de standaard filter zijn** bij openen
  van het tabblad, niet "Afgerond" of een ander filter. Wordt opgelost in
  iteratie 5 of 6 bij de UX-opschoning.

## Bekende geaccepteerde keuzes

- **Barcodes hoeven niet opvolgend te zijn.** De counter begint na een herlaad
  bij een safe-marge boven het hoogste nummer. Geen bug, bewuste keuze.
