# PipeBoard

Dashboard centralisé en lecture seule des pipelines gitlab.com, organisés par group et par repo (Express TS + React/Vite/canopui).

## Prérequis

- Node.js >= 20

## Installation

Le registre npm QVL est configuré dans `.npmrc` (lecture anonyme). Installation reproductible :

```bash
npm ci
```

## Scripts

- `npm run dev` — lance le front (Vite) et le back (Express via tsx) en parallèle
- `npm run dev:front` — front seul (Vite)
- `npm run dev:back` — back seul (Express via tsx, en watch)
- `npm run build` — vérification des types (`tsc`) puis build de production (`vite build` vers `dist/`)
- `npm start` — backend de production qui sert `dist/`

## Ports

- Front (Vite) : `5190`
- Back (Express) : `5191`

Le front proxifie `/api` vers le backend (`http://127.0.0.1:5191`). L'hôte est forcé sur `127.0.0.1` (jamais `0.0.0.0`).

## Authentification GitLab

Le PAT GitLab requis (configuré ultérieurement) devra avoir le scope **`read_api`** uniquement.
