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

## Backend

Le code serveur vit dans `server/` (TypeScript strict, `tsconfig.server.json`). `tsx` est l'unique runtime : les imports relatifs entre modules serveur portent l'extension `.ts` explicite (option `allowImportingTsExtensions`), convention que tout nouveau module backend doit suivre.

Les groups surveillés sont découverts automatiquement après enregistrement du token, via les groups dont le porteur du token est membre (`GET /groups?membership=true`). Les sous-groups descendants sont écartés car le listing des projets est déjà récursif. Aucun fichier de configuration n'est requis.

## API

Toutes les routes sont servies sous `/api` (même origine que le front).

- `GET /api/status` — état courant : `tokenSet`, `lastListingRefresh`, `lastStatusRefresh`, `rateLimited`.
- `GET /api/pipelines` — dernier état connu du cache (arbre groups → repos → pipeline).
- `POST /api/token` — enregistre le PAT `{ "token": string }` et arme le polling.
- `POST /api/refresh` — déclenche immédiatement un cycle listing + statuts (fire-and-forget) ; `400` si aucun token n'est configuré.
- `DELETE /api/token` — purge le token, arrête le polling et vide le cache.

## Authentification GitLab

Le PAT GitLab requis devra avoir le scope **`read_api`** uniquement.

Après un `POST /api/token` réussi, le token est conservé côté serveur en mémoire et dupliqué dans un cookie de session `pipeboard_token` (`httpOnly`, `sameSite=strict`, `path=/api`, sans expiration). À la première requête suivant un redémarrage du client, si la mémoire serveur ne contient plus de token mais que le cookie est présent, le token est restauré et le polling réarmé. Un token rejeté par GitLab (401/403) est mémorisé en mémoire seule : le cookie correspondant est alors effacé sans nouvelle tentative de restauration, ce qui évite toute boucle purge → restauration.
