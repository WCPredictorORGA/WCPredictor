# ⚽ World Cup Predictor.AI

> Plateforme de pronostics pour la **Coupe du Monde FIFA 2026** : les joueurs prédisent les
> scores, gagnent des points, et affrontent **Botnaru**, une IA de prédiction fondée sur un
> modèle de Poisson. Données de matchs et buteurs synchronisées automatiquement.

<p>
  <img alt="React" src="https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white">
  <img alt="Node" src="https://img.shields.io/badge/Node-Express-339933?logo=node.js&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-4169e1?logo=postgresql&logoColor=white">
  <img alt="Python" src="https://img.shields.io/badge/Python-Scraper%20%2B%20IA-3776ab?logo=python&logoColor=white">
  <img alt="Docker" src="https://img.shields.io/badge/Docker-Compose-2496ed?logo=docker&logoColor=white">
</p>

---

## Sommaire

- [Fonctionnalités](#-fonctionnalités)
- [Architecture](#-architecture)
- [Stack technique](#-stack-technique)
- [Structure du projet](#-structure-du-projet)
- [Démarrage rapide](#-démarrage-rapide)
- [Variables d'environnement](#-variables-denvironnement)
- [Services & ports](#-services--ports)
- [API REST](#-api-rest)
- [Base de données](#-base-de-données)
- [Le bot Botnaru (IA)](#-le-bot-botnaru-ia)
- [Scraping automatique](#-scraping-automatique)
- [Tests](#-tests)
- [Déploiement (Render)](#-déploiement-render)
- [Équipe](#-équipe)

---

## ✨ Fonctionnalités

- **Authentification** complète : inscription, connexion, JWT en cookie httpOnly, réinitialisation de mot de passe.
- **Pronostics** : saisie d'un score par match (upsert), verrouillés au coup d'envoi.
- **Système de points** : `3 pts` score exact · `1 pt` bon résultat (vainqueur/nul) · `0` sinon.
- **Classement temps réel** : podium, précision, score exact — avec **Botnaru (IA)** en concurrent.
- **Statistiques** : meilleurs buteurs et classement par groupe.
- **Tableau des phases finales** (knockout bracket).
- **Espace admin** : saisie manuelle des résultats + déclenchement manuel du scraping.
- **IA Botnaru** : pronostics (score + probabilités victoire/nul/défaite + xG) via modèle de Poisson.
- **Synchronisation automatique** des matchs, scores et buteurs (scraping quotidien à 10h00).
- **Multilingue** : français, anglais, slovaque.

---

## 🏗 Architecture

```
                         ┌──────────────┐
                         │   Frontend   │  React + Vite (5173)
                         │  (navigateur)│
                         └──────┬───────┘
                                │ HTTP/JSON (JWT)
                         ┌──────▼───────┐
                         │   Backend    │  Express API (3000)
                         │  Express/JWT │
                         └──────┬───────┘
                                │ SQL
                         ┌──────▼───────┐
              ┌─────────▶│  PostgreSQL  │◀─────────┐
              │          │     (5432)   │          │
              │          └──────────────┘          │
      ┌───────┴───────┐                    ┌───────┴────────┐
      │    Scraper    │                    │   AI-service   │
      │ Flask (5001)  │                    │ Poisson (Python)│
      │ + cron 10h00  │                    │  bot_predictions│
      └───────────────┘                    └────────────────┘
```

- Le **backend** déclenche le scraper via HTTP (`POST /scrape`) sur autorisation admin.
- Le **scraper** importe les données externes, recopie les pronostics de Botnaru et calcule les points.
- L'**ai-service** génère les prédictions de Botnaru (modèle de Poisson) dans `bot_predictions`.

---

## 🧰 Stack technique

| Couche | Technologies |
|---|---|
| **Frontend** | React 19, Vite, React Router, TailwindCSS, i18n maison (fr/en/sk) |
| **Backend** | Node.js, Express, JWT (`jsonwebtoken`), `bcryptjs`, `pg`, `helmet`, `cors`, `express-rate-limit`, `express-validator` |
| **Base de données** | PostgreSQL 16 |
| **Scraper** | Python, Flask, `requests`, `psycopg2`, `APScheduler` |
| **IA** | Python, modèle de Poisson (`scipy`, `numpy`) |
| **Infra** | Docker & Docker Compose |
| **Tests** | Jest (backend) |

---

## 📁 Structure du projet

```
WCPredictor/
├── backend/                 # API Express
│   ├── src/
│   │   ├── routes/          # auth, predictions, matches, leaderboard, stats,
│   │   │                    # botpredictions, homestats, admin, users
│   │   ├── middleware/      # auth (JWT), validation
│   │   ├── services/
│   │   │   └── botnaru.js   # logique métier Botnaru
│   │   ├── scoring.js       # calcul des points (3 / 1 / 0)
│   │   ├── db.js            # connexion PostgreSQL (pool)
│   │   ├── scraper.js       # client HTTP vers le service scraper
│   │   ├── app.js           # app Express (sécurité, CORS, rate-limit, routes)
│   │   └── index.js         # point d'entrée serveur
│   └── package.json
├── frontend/                # SPA React + Vite
│   ├── src/
│   │   ├── pages/           # Home, Matches, Stats, Leaderboard, Admin, Profile, Login
│   │   ├── components/      # Dashboard, Leaderboard, KnockoutBracket, BotnaruCard…
│   │   ├── i18n.js          # traductions fr / en / sk
│   │   └── config.js        # base URL API + authFetch
│   └── public/              # favicon (ballon), avatar Botnaru
├── scraper/                 # Import de données (Flask + cron quotidien)
│   └── scraper.py
├── ai-service/              # Modèle de Poisson → bot_predictions
│   └── model.py
├── db/
│   ├── init.sql             # schéma (types, tables, vue leaderboard)
│   ├── seed.sql             # données de base (équipes, matchs, joueurs, Botnaru)
│   └── migrations/          # migrations incrémentales (xG, Botnaru…)
└── docker-compose.yml
```

---

## 🚀 Démarrage rapide

**Prérequis** : Docker & Docker Compose.

```bash
# 0. Cloner le dépôt
git clone https://github.com/baubiez/WCPredictor.git
cd WCPredictor

# 1. Configurer l'environnement
cp .env.example .env      # les valeurs sont prêtes pour un usage local

# 2. Lancer toute la stack
docker compose up --build -d

# 3. (première fois) charger les données de base
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < db/seed.sql

# 4. (première fois) appliquer la migration xG
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < db/migrations/001_add_xg_to_bot_predictions.sql
```

- **Frontend** : http://localhost:5173
- **API** : http://localhost:3000
- **Générer les pronostics IA** (optionnel) : `docker compose run --rm ai-service`

> **Compte admin par défaut** (créé par le seed) :
> - Identifiant : `admin@wcpredictor.local`
> - Mot de passe : `Admin1234!`

---

## 🔐 Variables d'environnement

À placer dans un fichier `.env` à la racine :

| Variable | Description |
|---|---|
| `POSTGRES_USER` | Utilisateur PostgreSQL |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL |
| `POSTGRES_DB` | Nom de la base |
| `DATABASE_URL` | URL de connexion complète — utiliser `db` (service Docker) et non `localhost` · ex. `postgresql://wcp:wcp_password@db:5432/wcp_db` |
| `JWT_SECRET` | Secret de signature des jetons JWT |
| `CORS_ORIGIN` | Origine(s) autorisée(s) (ex. `http://localhost:5173`) |
| `VITE_API_URL` | URL de l'API consommée par le frontend |
| `SCRAPER_HOUR` | Heure du scraping quotidien (défaut : `10`) |
| `SCRAPER_TZ` | Fuseau horaire du planificateur (défaut : `Europe/Paris`) |

---

## 🔌 Services & ports

| Service | Conteneur | Port | Rôle |
|---|---|---|---|
| `db` | `wcp_db` | 5432 | PostgreSQL |
| `backend` | `wcp_backend` | 3000 | API Express |
| `frontend` | `wcp_frontend` | 5173 | SPA React (dev) |
| `frontend-prod` | `wcp_frontend_prod` | 80 | Build prod (profil `prod`) |
| `scraper` | `wcp_scraper` | 5001 (interne) | Import de données + cron 10h00 |
| `ai-service` | `wcp_ai` | — | Modèle de Poisson (profil `tools`, lancement manuel) |

---

## 📡 API REST

Base : `/api`

| Méthode | Endpoint | Description | Accès |
|---|---|---|---|
| `POST` | `/auth/register` | Inscription | public |
| `POST` | `/auth/login` | Connexion (JWT) | public |
| `POST` | `/auth/logout` | Déconnexion | public |
| `POST` | `/auth/verify-reset` | Vérifier une demande de réinitialisation | public |
| `POST` | `/auth/reset-password` | Réinitialiser le mot de passe | public |
| `GET` | `/me` | Profil de l'utilisateur courant | authentifié |
| `GET` | `/matches` | Liste des matchs (filtres groupe/phase/statut) | public |
| `POST` | `/matches/:id/result` | Saisir un résultat (calcule les points) | admin |
| `GET` / `POST` | `/predictions` | Lire / soumettre ses pronostics | authentifié |
| `GET` | `/leaderboard` | Classement général | public |
| `GET` | `/stats/scorers` · `/stats/standings` | Buteurs · classement par groupe | public |
| `GET` | `/bot-predictions` | Pronostics de Botnaru | public |
| `GET` | `/home-stats` | KPIs page d'accueil | public |
| `POST` | `/admin/scrape` · `GET` `/admin/scrape/status` | Déclencher / suivre le scraping | admin |

---

## 🗄 Base de données

Tables principales (cf. [`db/init.sql`](db/init.sql)) :

- **`users`** — comptes (`role` : `admin` / `user`).
- **`teams`** — 48 équipes (code FIFA, groupe).
- **`matches`** — matchs (statut, scores, phase) · contrainte `UNIQUE (home_team_id, away_team_id)`.
- **`players`** / **`player_stats`** — joueurs et buts (alimentés par le scraper).
- **`predictions`** — pronostics humains **et ceux de Botnaru** (`UNIQUE (user_id, match_id)`).
- **`bot_predictions`** — pronostics IA (score, probabilités, xG).
- **`leaderboard`** — *vue SQL* agrégeant les points par utilisateur.

### Migrations

| Migration | Effet | Local (fresh) | Render (existant) |
|---|---|---|---|
| `001` | Ajoute les colonnes xG à `bot_predictions` | ✅ nécessaire | ✅ nécessaire |
| `002` | Crée le compte **Botnaru** (connexion désactivée) | ⬜ déjà dans seed.sql | ✅ nécessaire |
| `003` | Donne à Botnaru un pronostic de démarrage (1 score exact → 3 pts) | ⬜ optionnel | ✅ nécessaire |

```bash
# Setup local — uniquement la migration 001 est requise (voir Démarrage rapide)
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < db/migrations/001_add_xg_to_bot_predictions.sql

# Render (base existante sans seed) — jouer les 3 dans l'ordre
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < db/migrations/001_add_xg_to_bot_predictions.sql
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < db/migrations/002_botnaru_user.sql
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < db/migrations/003_botnaru_test_score_exact.sql
```

---

## 🤖 Le bot Botnaru (IA)

Botnaru est un **utilisateur à part entière** qui concourt au classement :

1. L'**ai-service** estime les forces offensives/défensives des équipes et applique un **modèle de Poisson** pour prédire le score le plus probable et les probabilités (victoire / nul / défaite + xG) → table `bot_predictions`.
2. Le **scraper** recopie ces pronostics dans `predictions` au nom de Botnaru (`sync_bot_predictions`), puis les **note** comme ceux des joueurs humains.
3. Le frontend l'affiche avec un badge **🤖 IA** et son avatar dans le classement.

> Botnaru est identifié partout par son **username réservé** ; son compte ne permet aucune connexion (hash de mot de passe invalide). Il est exclu du KPI « meilleur joueur » de l'accueil.

---

## ⏰ Scraping automatique

Le service **scraper** tourne en serveur HTTP permanent (Flask, port 5001) et expose :

- `POST /scrape` — déclenche un import en arrière-plan (utilisé par le bouton admin).
- `GET /status` — état du dernier import.

Un **planificateur (APScheduler)** lance en plus un import **chaque jour à 10h00 (Europe/Paris)**.
Chaque import : importe matchs/scores/buteurs (UPSERT, jamais destructif) → recopie les pronostics de Botnaru → recalcule les points → met le classement à jour.

Configurable via `SCRAPER_HOUR` et `SCRAPER_TZ`.

---

## 🧪 Tests

```bash
cd backend
npm test              # Jest
npm run test:coverage # avec couverture
```

---

## ☁️ Déploiement (Render)

Le projet est hébergé sur **Render**. Pour une base déjà en service :

1. Appliquer le schéma (`db/init.sql`) à la création de la base, puis les **migrations** `db/migrations/*` dans l'ordre.
2. Charger les données de base si nécessaire (`db/seed.sql`).
3. Déployer les services `backend`, `frontend`, `scraper` (et `ai-service` au besoin).
4. Renseigner les variables d'environnement (cf. tableau ci-dessus) côté Render.

> Les fichiers `init.sql` / `seed.sql` ne s'exécutent que sur une base **neuve** ; toute évolution de schéma sur une base existante passe par une migration dédiée dans `db/migrations/`.

---

## 👥 Équipe

| Membre | Rôles |
|---|---|
| **Alexis Baubion** | Infra · Data · IA · Frontend · Backend |
| **Gwenael Bourcet** | Frontend · Data · IA |
| **Francois Manoury** | Data · IA · Frontend · Backend |

---

<p align="center"><i>Projet académique — ESIEA · Coupe du Monde FIFA 2026</i></p>
