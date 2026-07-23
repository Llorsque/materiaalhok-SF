# Materiaalhok - Beweegteam Opsterland

Registratiesysteem voor sportmateriaal met uitleenlogboek.

## Features
- 172 items uit de officiele materiaallijst met inkoopprijzen
- Uitleensysteem met logboek
- Zoeken en filteren op categorie en status
- Te laat-waarschuwingen
- Totale waarde overzicht

## Installatie

npm install
npm run dev

## Tech Stack
- React + Vite + Tailwind CSS

## E-mailconfiguratie

De backend kan bevestigingsmails versturen (bonnen aangemaakt) en later ook
retourherinneringen. Configuratie via `server/.env` — dit bestand staat in
`.gitignore` en komt nooit in de repo. Kopieer `server/.env.example` en vul
de waarden in.

### Variabelen

| Variabele | Betekenis |
|---|---|
| `MAIL_MODE` | `off` \| `redirect` \| `live` — zie hieronder |
| `MAIL_REDIRECT_TO` | Verplicht bij `redirect`: alles gaat naar dit adres, met de originele ontvanger als banner in de mail |
| `SMTP_HOST` | Voor Gmail: `smtp.gmail.com` |
| `SMTP_PORT` | Voor Gmail: `587` (STARTTLS) |
| `SMTP_USER` | Volledig e-mailadres van het verzendaccount |
| `SMTP_PASS` | Gmail app-wachtwoord (16 tekens, géén gewoon wachtwoord) |
| `MAIL_FROM_NAME` | Zichtbare afzendernaam, bv. `Materiaalhok Opsterland` |
| `APP_TIMEZONE` | Tijdzone voor het verzendvenster, bv. `Europe/Amsterdam` |

### MAIL_MODE

- **`off`** — niets versturen, alleen naar de console loggen wat er gestuurd
  zou zijn (ontvanger, onderwerp, eerste regels). Veilige standaard tijdens
  ontwikkeling en de eerste periode na livegang.
- **`redirect`** — echt versturen, maar altijd naar `MAIL_REDIRECT_TO`. Bovenaan
  de mail staat een zichtbare banner met de oorspronkelijke ontvanger. Handig
  om templates te testen zonder een gebruiker per ongeluk te mailen.
- **`live`** — verstuurt naar de echte ontvanger.

Bij elke modus wordt in de console gelogd wat er gebeurde. Succesvolle en
mislukte verzendingen worden ook in de `logs`-tabel geschreven onder de
acties `mail_sent`, `mail_failed` en `mail_skipped`.

### Gmail app-wachtwoord maken

1. Zet tweestapsverificatie aan op het Google-account (`myaccount.google.com/security`).
2. Ga naar `myaccount.google.com/apppasswords`.
3. Kies een naam (bv. "materiaalhok-server") en klik op **Genereren**.
4. Kopieer het gegenereerde wachtwoord van 16 tekens en plak het **zonder
   spaties** in `SMTP_PASS` in `server/.env`.
5. Herstart de server (`npm run dev` in `server/`).

### Testen

Met een admin-account:

```
POST /api/admin/mail-test
{ "to": "jij@voorbeeld.nl" }
```

Het endpoint respecteert `MAIL_MODE` en geeft in de respons terug of de mail
verstuurd is (`sent: true`), of alleen gelogd (`skipped: true, reason: ...`).

### Verzendvenster

Volgens `BESLUITEN.md` mogen automatische mails alleen tussen 08:00 en 18:00
op werkdagen de deur uit. Dat venster geldt alleen voor **geplande** mails
(zoals retourherinneringen, straks). **Bevestigingsmails** gaan altijd
direct — die zijn een reactie op iets dat de gebruiker net gedaan heeft en
vallen per definitie binnen kantoortijd omdat de tool dan gebruikt wordt.

De helper `isBinnenVerzendvenster()` in `server/mail/mailer.js` staat klaar
om te gebruiken zodra herinneringen ingebouwd worden.

## Licentie
MIT