# Sportmateriaal Tracker

Een web-applicatie om sportmateriaal te registreren, bij te houden wie het gebruikt, waar het is en wanneer het terugkomt.

## Features

- **Overzicht** - Dashboard met statistieken (totaal, beschikbaar, in gebruik, onderhoud)
- **Zoeken en filteren** - Op naam, gebruiker, locatie, categorie en status
- **Uitlenen en retour** - Registreer wie materiaal leent en wanneer het terug moet zijn
- **Te laat-waarschuwingen** - Automatische alerts voor materiaal dat over de retourdatum is
- **Snelle retour** - Een klik om materiaal als teruggebracht te markeren
- **Toevoegen/bewerken/verwijderen** - Volledig CRUD-beheer van al het materiaal
- **Lokale opslag** - Data wordt bewaard in de browser (localStorage)

## Installatie

```bash
git clone https://github.com/jouw-gebruiker/sportmateriaal-tracker.git
cd sportmateriaal-tracker
npm install
npm run dev
```

De app draait dan op http://localhost:5173

## Bouwen voor productie

```bash
npm run build
```

## Tech Stack

- React
- Vite
- Tailwind CSS

## Licentie

MIT