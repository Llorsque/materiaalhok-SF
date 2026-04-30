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

## Wat we expliciet niet doen (nu)

- Eigen desktop-app op de scan-laptop (browser in kioskmodus volstaat).
- Eigen domeinnaam (kan later, geen blokkade).
- Foto's bij materialen (later, niet in scope voor v1).
- TypeScript, automatische tests, CI/CD-pipelines (overkill voor de schaal).
- Voorrangslogica bij gelijktijdige reserveringen (volgorde van aanvraag,
  herzien na praktijkervaring).
