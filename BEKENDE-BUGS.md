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

- **Er is geen Sets-tab in de admin.** Admins kunnen sets niet bewerken
  (voorraad, samenstelling, verwijderen) via de UI. Sets worden alleen
  aangemaakt via Excel-import. Lijst is te bekijken via /api/sets.

## UI

- **Totaalaantal materialen niet zichtbaar in admin.** Onduidelijk of dit ooit
  ergens stond. Niet acuut. Mee te nemen wanneer we de admin-dashboard verbeteren.

## Foutafhandeling UI

- **ConnectionBanner toont validatiefouten van de backend** (zoals "email bestaat
  al") samen met de algemene verbinding-foutmelding "Geen verbinding met de
  server". Dit is misleidend — server-validatiefouten zouden een eigen, kortere
  foutweergave moeten krijgen. Op te lossen in iteratie 5 wanneer auth-flow
  opnieuw wordt bekeken.

## UX verbeterpunten

- **In admin → Bonnen-tab moet "Alle" de standaard filter zijn** bij openen
  van het tabblad, niet "Afgerond" of een ander filter. Wordt opgelost in
  iteratie 5 of 6 bij de UX-opschoning.
- **In Chrome-kiosk-modus op de Windows-laptop in het hok is de Windows-taakbalk
  niet zichtbaar en heeft de browser geen UI-knoppen.** Vrijwilligers moeten de
  juiste sneltoets weten om de kioskmodus te verlaten: Ctrl + W (sluit huidige
  venster) of Alt + F4. Aanbevolen: een gelamineerde instructiekaart bij de
  scan-laptop in het hok plakken met de essentiële sneltoetsen en wat te doen
  bij problemen. In een latere iteratie eventueel een visuele indicatie of
  escape-knop binnen de tool zelf bouwen.
- **De bureaublad-snelkoppeling Materiaalhok starten opent alleen backend en
  frontend, niet Chrome in kioskmodus.** Voorstel: start-materiaalhok.bat
  uitbreiden met een timeout en een Chrome-kioskmodus-start, zodat één klik op
  de bureaublad-snelkoppeling de complete tool opent inclusief de
  scan-interface.
- **Op de Windows-laptop staan twee mechanismen die Chrome in kioskmodus kunnen
  openen: de losse snelkoppeling in de opstartmap én (na uitbreiding van
  start-materiaalhok.bat) ook het batch-bestand.** Bij opstart kan dat dubbele
  Chrome-vensters geven. Wanneer het batch-bestand wordt uitgebreid: de losse
  kiosk-snelkoppeling uit de opstartmap halen zodat er één bron van waarheid is
  voor het openen van de tool.

## Bekende geaccepteerde keuzes

- **Barcodes hoeven niet opvolgend te zijn.** De counter begint na een herlaad
  bij een safe-marge boven het hoogste nummer. Geen bug, bewuste keuze.
