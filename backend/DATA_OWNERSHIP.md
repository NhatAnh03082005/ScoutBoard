# Data Ownership Classification (ScoutBoard System)

## 1. Overview
This document specifies data ownership boundaries between the **NestJS Backend** (application logic & user data) and the **ETL Pipeline** (official football data ingested from external providers).

---

## 2. Data Ownership Table

| Table | Owner | Backend Access | Module | Purpose / Notes |
|-------|-------|----------------|--------|-----------------|
| `users` | Backend | Read-write | `users` | Application accounts & profile status |
| `roles` | Backend | Read-write | `users` | Role definitions (`ADMIN`, `USER`, `SCOUT`, etc.) |
| `user_roles` | Backend | Read-write | `users` | Junction table connecting users and roles |
| `refresh_tokens` | Backend | Read-write | `auth` | Active JWT refresh tokens & family hashes |
| `competitions` | ETL | Read-only | `competitions` | League and tournament catalog |
| `seasons` | ETL | Read-only | `seasons` | Competition seasons and date ranges |
| `teams` | ETL | Read-only | `teams` | Official football clubs & team metadata |
| `players` | ETL | Read-only | `players` | Official player demographic info |
| `player_positions` | ETL | Read-only | `players` | Tactical position mappings per player |
| `player_season_statistics` | ETL | Read-only | `players` | Per-season aggregated statistics |
| `player_team_history` | ETL | Read-only | `players` | Transfer & roster history records |
| `matches` | ETL | Read-only | `matches` | Fixtures and match results |
| `player_match_statistics` | ETL | Read-only | `matches` | Per-match detailed player performance |

---

## 3. Core Ownership Rules & Architectural Principles

### 3.1 ETL-Owned Data Guidelines
- **System of Record**: The ETL Pipeline is the sole author of official football data.
- **Backend Permissions**: The NestJS backend **MUST NOT** perform `INSERT`, `UPDATE`, or `DELETE` operations on ETL-owned tables.
- **No Ingestion Logic**: The backend does NOT contain external football API sync jobs or schedulers.
- **Repository Interface**: ETL-owned entities are accessed via Read-Only Repository Ports (`PlayerReadRepository`, `TeamReadRepository`, etc.).

### 3.2 Backend-Owned Data Guidelines
- **System of Record**: The NestJS backend is the author of user accounts, authentication states, roles, and user-generated content.
- **Full CRUD Capabilities**: The backend executes create, read, update, and delete use cases.
- **Data Integrity**: Enforces business invariants, password hashing, and login lockout policies.

---

## 4. Local Seed Classification (`src/database/seeds/`)

- `src/database/seeds/app/`: Application seeds (default roles, initial admin account).
- `src/database/seeds/mock-etl/`: Local development mock seeds simulating ETL-ingested data for testing and offline development. Seeds **MUST NOT** run automatically in `production` environment.
