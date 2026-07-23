# CLAUDE.md

Aanwijzingen voor Claude Code bij het werken aan dit project.

## Versiebeheer

Dit project volgt [Semantic Versioning](https://semver.org/lang/nl/): `MAJOR.MINOR.PATCH`.

- **PATCH** (`1.0.0` → `1.0.1`): bugfix, kleine correctie zonder gedragsverandering voor de gebruiker.
- **MINOR** (`1.0.0` → `1.1.0`): nieuwe feature of uitbreiding, backwards compatible.
- **MAJOR** (`1.0.0` → `2.0.0`): breaking change — bijvoorbeeld een incompatibele datamigratie of het verwijderen van functionaliteit waar bestaande gebruikers op leunen.

De bron van waarheid voor het versienummer is `package.json`. De frontend leest deze via `__APP_VERSION__` (gedefinieerd in `vite.config.js`) en toont hem onderaan in admin → Instellingen.

## Changelog

Bij **elke** functionele wijziging wordt `CHANGELOG.md` bijgewerkt onder de `[Unreleased]` sectie, in het Nederlands, volgens het [Keep a Changelog](https://keepachangelog.com/nl/1.1.0/) formaat:

- `### Toegevoegd` — nieuwe functionaliteit
- `### Gewijzigd` — aanpassingen aan bestaande functionaliteit
- `### Verouderd` — functionaliteit die binnenkort verdwijnt
- `### Verwijderd` — verwijderde functionaliteit
- `### Opgelost` — bugfixes
- `### Beveiliging` — beveiligingsfixes

Bij een release wordt de `[Unreleased]` sectie hernoemd naar het nieuwe versienummer met datum, en wordt de versie in `package.json` opgehoogd volgens de regels hierboven.
