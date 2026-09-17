# 📋 SCOUTBOARD — FULL PROJECT ARCHITECTURE REPORT & TECHNICAL AUDIT
**Document Version:** 1.0.0  
**Audit Date:** September 12, 2026  
**Auditor / Engineering Role:** Lead Staff Architect & Technical Auditor  
**Repository:** `ScoutBoard` (FullStack Monorepo: NestJS + React 19 + PostgreSQL 17)  
**Deliverable Type:** TASK 5 — Comprehensive Onboarding Architecture Reference & Deep Technical Audit  

---

## 📑 TABLE OF CONTENTS
1. [Executive Summary](#1-executive-summary)
2. [Product Overview & Business Domain](#2-product-overview--business-domain)
3. [Technology Stack Inventory](#3-technology-stack-inventory)
4. [Repository & Directory Structure](#4-repository--directory-structure)
5. [High-Level Architecture](#5-high-level-architecture)
6. [Module Map & Dependency Graph](#6-module-map--dependency-graph)
7. [Backend Layer Analysis (Clean Architecture / DDD)](#7-backend-layer-analysis)
8. [Frontend Architecture & Component Design](#8-frontend-architecture)
9. [Database Architecture & Schema Verification](#9-database-architecture--schema-verification)
10. [Authentication & Authorization System](#10-authentication--authorization-system)
11. [Basic Search Engine (`GET /api/players`)](#11-basic-search-engine)
12. [Advanced Tactical Search Engine](#12-advanced-tactical-search-engine)
13. [Query Engine & Boolean QueryNode Tree](#13-query-engine--boolean-querynode-tree)
14. [HTTP QUERY Method & Transport Architecture](#14-http-query-method--transport-architecture)
15. [Match Aggregation Engine (`MATCH_AGGREGATION`)](#15-match-aggregation-engine)
16. [Cohort Analysis, Percentiles & Ranking Engine (`COHORT_COMPARISON`)](#16-cohort-analysis-percentiles--ranking-engine)
17. [Position-Specific Tactical Metrics & Registry](#17-position-specific-tactical-metrics--registry)
18. [Player Domain Model & Metrics Derivation](#18-player-domain-model--metrics-derivation)
19. [Player Detail & Match Log Module](#19-player-detail--match-log-module)
20. [Player Comparison Engine & Dual Radar Analysis](#20-player-comparison-engine)
21. [Shortlists Module](#21-shortlists-module)
22. [Squad Building & Tactical Formation Module](#22-squad-building--tactical-formation-module)
23. [Data Synchronization Pipeline & External Provider](#23-data-synchronization-pipeline--external-provider)
24. [Testing Strategy & Test Suite Results](#24-testing-strategy--test-suite-results)
25. [Deployment Architecture & Docker Infrastructure](#25-deployment-architecture--docker-infrastructure)
26. [Full Technical Audit](#26-full-technical-audit)
27. [Classified Audit Findings (Critical to Low)](#27-classified-audit-findings)
28. [Technical Debt Inventory](#28-technical-debt-inventory)
29. [Recommended Next Steps & Prioritized Roadmap](#29-recommended-next-steps--prioritized-roadmap)
30. [Final End-to-End Architecture Diagram](#30-final-end-to-end-architecture-diagram)

---

## 1. EXECUTIVE SUMMARY

### 1.1 Project Status At A Glance
**ScoutBoard** is an enterprise-grade football scouting, talent discovery, player evaluation, and tactical squad-building platform. Over multiple development cycles, the platform has matured from an initial CRUD foundation into a specialized analytics powerhouse featuring a recursive Boolean query engine, match-by-match aggregation subqueries, cohort percentile distributions, dynamic candidate-context ranking, and interactive squad formation builders.

```
+-------------------------------------------------------------------------------+
|                           SYSTEM HEALTH STATUS                                |
+------------------------------------+------------------------------------------+
| Backend Test Suites                | 121 / 121 Passed (100%)                  |
| Backend Unit / Integration Tests   | 664 / 664 Passed (100% in 18.37s)        |
| Backend Build (NestJS)             | SUCCESS (0 errors, 0 warnings)           |
| Frontend Build (Vite + TypeScript) | SUCCESS (0 errors, 1 chunk size warning) |
| Active PostgreSQL Dataset          | 20 Tables (1,271 players, 16,235 stats)  |
| Overall Architectural Health       | HIGH MATURITY (with 2 High Security Fixes)|
+------------------------------------+------------------------------------------+
```

### 1.2 Purpose of This Report
This report serves as the single source of truth for engineering onboarding, architectural governance, security auditing, and product roadmap prioritization. Every assertion in this document is verified against actual production source code, live database inspection in PostgreSQL 17, and live HTTP endpoint testing.

---

## 2. PRODUCT OVERVIEW & BUSINESS DOMAIN

### 2.1 Target Personas
ScoutBoard is engineered for professional football organizations:
1. **Chief Scouts & Recruitment Directors:** Rapidly scanning global and league-wide talent pools to replace departing assets or fulfill strategic roster requirements.
2. **Tactical & Data Analysts:** Creating customized statistical filters, calculating per-90 rates, evaluating percentile distributions within cohorts, and stress-testing match consistency (e.g., qualifying rate of appearances with rating > 7.0).
3. **Head Coaches & Technical Staff:** Designing tactical line-ups, testing alternative formations (4-3-3, 3-4-2-1, 5-3-2), verifying position compatibilities, and benchmarking prospective transfer targets against existing squad starters.
4. **Platform Administrators:** Managing system accounts, monitoring data pipelines, triggering synchronization jobs with external football providers (API-Football), and inspecting job logs.

### 2.2 Feature Status Matrix

| Business Capability | Feature Description | Implementation Status | Verification Evidence |
| :--- | :--- | :---: | :--- |
| **Authentication** | Registration, Login, Progressive Lockout, Email OTP, Password Reset, JWT + Refresh Tokens | `IMPLEMENTED` | `auth.controller.ts`, `login.use-case.ts`, 14 test suites |
| **Basic Player Search** | Multi-attribute filtering (Age, Height, Weight, Nationality, Team, Competition, Position) with pagination | `IMPLEMENTED` | `GET /api/players`, `search-players.use-case.ts` |
| **Advanced Query Engine** | Recursive Boolean AST (`GROUP`, `CONDITION`, `MATCH_AGGREGATION`, `COHORT_COMPARISON`) | `IMPLEMENTED` | `player-query.validator.ts`, `player-query.builder.ts` |
| **HTTP Transport** | First-class HTTP `QUERY` method handling with zero JSON truncation | `IMPLEMENTED` | `PlayersQueryMethodMiddleware`, CORS `QUERY` support |
| **Match Aggregations** | Match-level predicates (`COUNT`, `AVG`, `QUALIFYING_RATE`) via SQL `EXISTS` and `HAVING` subqueries | `IMPLEMENTED` | `player-query.builder.ts` lines 597–680 |
| **Cohort & Percentiles** | Static league/season/position cohorts and dynamic `context: true` candidate ranking | `IMPLEMENTED` | `player-query.builder.ts` lines 418–565 |
| **Tactical Search UI** | Multi-league chips, multi-club selector, 15 canonical positions, dynamic metric sets, Top N preset | `IMPLEMENTED` | `PlayerAdvancedSearchContext.tsx` |
| **Player Profile & Radar** | Biography, career history, season statistics, match logs, interactive SVG tactical radar chart | `IMPLEMENTED` | `PlayerDetailPage.tsx`, `PlayerRadarChart.tsx` |
| **Head-to-Head Comparison** | Candidate selection within competition/global scope, dual radar overlays, per-90 metrics diff | `IMPLEMENTED` | `PlayerComparisonPage.tsx`, `ComparisonRadarChart.tsx` |
| **Shortlists** | Custom player dossiers, notes, visibility settings (Private/Public), quick-add modal | `IMPLEMENTED` | `shortlists.controller.ts`, `MyShortlistsPage.tsx` |
| **Tactical Squads** | 34 realistic formations, coordinate pitch rendering, starting XI vs bench, captain assignment | `IMPLEMENTED` | `squads.controller.ts`, `SquadDetailPage.tsx`, `squad-placement.utils.ts` |
| **Admin Data Sync** | Scoped synchronization from API-Football, job tracking, status history | `IMPLEMENTED` | `admin-data-sync.controller.ts`, `data-sync-jobs` table |
| **Automated Scout Roles** | Granular RBAC differentiating `SCOUT` role permissions from `USER` | `PLANNED` | Database only contains `ADMIN` and `USER` roles in `roles` table |
| **System Audit Logs** | Global entity-level audit log recording all mutation operations | `PLANNED` | Table `audit_logs` is in docs but not yet implemented in DB |

---

## 3. TECHNOLOGY STACK INVENTORY

Only technologies actively discovered in the physical repository are listed below:

### 3.1 Backend Stack
- **Runtime:** Node.js (v20+ LTS recommended, tested on Node 22)
- **Framework:** NestJS v11.0.1 (Modular Monolith architecture with Express engine)
- **Language:** TypeScript v5.7.3 (`target: ES2021`, strict type checking enabled)
- **ORM & Database Client:** TypeORM v0.3.20 + `pg` driver v8.13.1
- **Database Engine:** PostgreSQL 17 (Official Alpine Docker Image `postgres:17-alpine`)
- **Authentication & Security:** `@nestjs/jwt` v11.0.0, `@nestjs/passport` v11.0.0, `passport-jwt` v4.0.1, `bcryptjs` v2.4.3
- **Validation & Transformation:** `class-validator` v0.14.1, `class-transformer` v0.5.1
- **API Documentation:** `@nestjs/swagger` v11.0.0 (Swagger UI at `/api/docs`)
- **Email Delivery:** `nodemailer` v9.0.5 (used for OTP email verification and password reset)
- **Configuration:** `@nestjs/config` v4.0.0 with `.env` parameter binding

### 3.2 Frontend Stack
- **Library:** React v19.2.7 (`react`, `react-dom`)
- **Build Tool:** Vite v8.1.1 + `@vitejs/plugin-react` v6.0.3
- **Language:** TypeScript v6.0.2 (`tsc -b`)
- **Styling Architecture:** Pure Vanilla CSS (`index.css`, ~208 KB), custom Design Token System (Glassmorphism, High-contrast Tactical Scout Dark/Slate Theme, zero Tailwind dependency)
- **Charts & Visualizations:** Native Math & HTML5 SVG Canvas rendering (`PlayerRadarChart.tsx`, `ComparisonRadarChart.tsx` — zero heavy external charting dependencies)
- **Linter:** `oxlint` v1.71.0

### 3.3 Infrastructure & DevOps
- **Containerization:** Docker & Docker Compose (`docker-compose.yml`)
  - Service 1: `scoutboard-postgres` (PostgreSQL 17 Alpine on port 5432)
  - Service 2: `scoutboard-pgadmin` (pgAdmin 4 on port 8080)
- **External Data Provider:** API-Football / API-Sports v3 (`https://v3.football.api-sports.io`)

### 3.4 Quality Assurance & Testing Tools
- **Test Runner:** Jest v30.0.0
- **TypeScript Jest Integration:** `ts-jest` v29.2.5
- **Mocking & Fixtures:** Dedicated in-memory repository doubles and TypeORM repository mocks
- **E2E Testing:** Supertest v7.0.0 configured in `backend/test/jest-e2e.json`

---

## 4. REPOSITORY & DIRECTORY STRUCTURE

```
ScoutBoard/
├── .env.example                               # Root database credentials template
├── docker-compose.yml                         # PostgreSQL 17 + pgAdmin 4 orchestration
├── README.md                                  # Repository overview
├── docs/                                      # Project specifications & technical guides
│   ├── 01-analysis/                           # Requirement specifications
│   ├── 02-database/                           # ERD drawings, database specifications
│   │   ├── README.md                          # 21-table ERD specification
│   │   ├── ScoutBoard_ERD.drawio              # Diagram source
│   │   └── ScoutBoard_ERD.png                 # Exported diagram
│   ├── 03-api/                                # API specs
│   ├── 04-architecture/                       # Architectural design notes
│   ├── 05-testing/                            # Testing guides
│   ├── 06-deployment/                         # Deployment guidelines
│   ├── ADVANCED_QUERY_API.md                  # Comprehensive QueryNode API reference
│   ├── SCOUTBOARD_BACKEND_STUDY_GUIDE.md      # Backend deep-dive guide
│   ├── SCOUTBOARD_FULL_TECH_STACK_AND_ARCHITECTURE.md
│   └── PROJECT_ARCHITECTURE_AND_AUDIT.md      # THIS DOCUMENT
├── backend/                                   # NestJS Backend Application
│   ├── package.json                           # Dependencies and NPM scripts
│   ├── tsconfig.json                          # Backend TypeScript config
│   ├── nest-cli.json                          # Nest CLI config
│   ├── src/
│   │   ├── main.ts                            # Bootstrap entrypoint (CORS, ValidationPipe, Swagger)
│   │   ├── app.module.ts                      # Root NestJS Module importing all 11 feature modules
│   │   ├── database/                          # TypeORM DataSource, Migrations, Seeds
│   │   │   ├── data-source.ts                 # CLI & runtime TypeORM connection
│   │   │   ├── migrations/                    # 17 sequential TypeScript migrations
│   │   │   ├── seeds/                         # Role, Admin, and Initial Football seeds
│   │   │   └── tests/                         # Database persistence integration tests
│   │   ├── modules/                           # 11 Domain Feature Modules
│   │   │   ├── auth/                          # Authentication, JWT, Tokens, Lockout, OTP
│   │   │   ├── users/                         # User accounts, Admin user management, Roles
│   │   │   ├── competitions/                  # Leagues & Tournaments
│   │   │   ├── seasons/                       # Season years & Season-Team links
│   │   │   ├── teams/                         # Football clubs & squads
│   │   │   ├── players/                       # Core Player Domain, Repositories, Query Engine
│   │   │   ├── matches/                       # Fixtures, match stats, quality validation
│   │   │   ├── shortlists/                    # User scout shortlists & player notes
│   │   │   ├── squads/                        # User squad builder, formations, line-ups
│   │   │   ├── data-sync/                     # Admin data sync jobs & execution logs
│   │   │   └── external-football/             # API-Football client, HTTP retry adapter, mappers
│   │   └── scripts/                           # Standalone sync & maintenance CLI scripts
│   └── test/                                  # E2E test suites
└── frontend/                                  # React 19 Frontend Application
    ├── package.json                           # Frontend scripts & devDependencies
    ├── vite.config.ts                         # Vite configuration
    ├── index.html                             # Single Page Application root HTML
    └── src/
        ├── main.tsx                           # React 19 root bootstrap
        ├── App.tsx                            # Primary UI Router, Navigation & Auth state
        ├── index.css                          # Centralized 200KB Design Token & Theme System
        ├── pages/                             # 11 Application Views
        │   ├── HomePage.tsx                   # Landing overview & quick metrics
        │   ├── LoginPage.tsx                  # Sign In, Sign Up, OTP, Forgot Password views
        │   ├── PlayerSearchPage.tsx           # Basic Search & Advanced Tactical Query mode
        │   ├── PlayerDetailPage.tsx           # In-depth player dossier, stats & match log
        │   ├── PlayerComparisonSetupPage.tsx  # Candidate selector & comparison scope filter
        │   ├── PlayerComparisonPage.tsx       # Side-by-side player analysis & dual radar
        │   ├── MyShortlistsPage.tsx           # User shortlist index & creation
        │   ├── ShortlistDetailPage.tsx        # Shortlist detail & player management
        │   ├── MySquadsPage.tsx               # Squad index & formation setup
        │   ├── SquadDetailPage.tsx            # Interactive tactical pitch & squad editor
        │   └── AdminDataSyncPage.tsx          # Data synchronization control dashboard
        ├── components/                        # UI Components
        │   ├── common/                        # Button, Card, Dialog, Table, Tabs, Input, Select
        │   ├── player/                        # PlayerCard, PlayerTable, AdvancedQueryBuilder, etc.
        │   ├── shortlist/                     # AddToShortlistModal
        │   └── squad/                         # Pitch slots, substitute benches
        ├── services/                          # Typed API HTTP client layer (api.ts, player.service.ts)
        ├── types/                             # Domain TypeScript interfaces (player, query, squad)
        └── utils/                             # Mathematics, coordinate calculations, radar geometry
```

---

## 5. HIGH-LEVEL ARCHITECTURE

ScoutBoard is structured as a **Modular Monolith with Hexagonal/Clean Architecture** principles embedded in each backend domain module.

### 5.1 End-to-End Tiered Flow Diagram
```
+-----------------------------------------------------------------------------------+
|                                CLIENT TIER (Browser)                             |
|  React 19 SPA (Vite)                                                              |
|  ├── View State (App.tsx, PlayerSearchPage.tsx)                                   |
|  ├── Tactical AST Builder (PlayerAdvancedSearchContext.tsx)                       |
|  ├── Custom Canvas / SVG Visualizers (PlayerRadarChart.tsx, ComparisonRadar.tsx)  |
|  └── API Client Layer (player.service.ts, shortlist.service.ts via Fetch API)     |
+-----------------------------------------------------------------------------------+
                                         │  HTTP / HTTPS
                                         │  - GET /api/players (Public Basic Search)
                                         │  - QUERY /api/players (Tactical Query Tree)
                                         │  - POST / PATCH / DELETE (Auth & Management)
                                         ▼
+-----------------------------------------------------------------------------------+
|                             BACKEND PRESENTATION TIER                             |
|  NestJS v11 Express Core                                                          |
|  ├── Global Middleware & CORS (main.ts — allows GET, POST, QUERY, PATCH, etc.)   |
|  ├── PlayersQueryMethodMiddleware (Intercepts HTTP QUERY -> QueryPlayersUseCase)  |
|  ├── Global ValidationPipe (whitelist: true, transform: true)                    |
|  ├── Guard Layer (JwtAuthGuard, RolesGuard)                                       |
|  └── Controllers (PlayersController, AuthController, SquadsController, etc.)     |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                            APPLICATION USE CASE TIER                              |
|  Pure Business Orchestration (Injected via NestJS Providers)                      |
|  ├── QueryPlayersUseCase            ├── ComparePlayerRadarUseCase                 |
|  ├── SearchPlayersUseCase           ├── CreateSquadUseCase                        |
|  ├── LoginUseCase / RegisterUseCase ├── ExecuteAdminSyncUseCase                   |
|  └── Abstract Repository Ports (e.g. PLAYER_READ_REPOSITORY)                      |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                                DOMAIN LOGIC TIER                                  |
|  Zero SQL / Zero Framework Knowledge                                              |
|  ├── Domain Entities (User, Player, Squad, Shortlist)                             |
|  ├── Query Validator (PlayerQueryValidator.ts — recursive AST inspection)         |
|  ├── Metric Registry (player-metric.registry.ts — O(1) definition lookup)         |
|  └── Enums & Types (PlayerPosition, QueryNode, MatchAggregationType)              |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                           INFRASTRUCTURE PERSISTENCE TIER                         |
|  TypeORM v0.3.20                                                                  |
|  ├── SQL Query Builder (player-query.builder.ts — Parameterized AST to SQL)       |
|  ├── Repository Implementations (TypeOrmPlayerReadRepository, etc.)               |
|  ├── TypeORM OrmEntities (PlayerOrmEntity, PlayerSeasonStatisticOrmEntity)        |
|  └── External Football Adapter (ApiFootballClient with backoff retries)           |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                                 DATABASE TIER                                     |
|  PostgreSQL 17 (Dockerized)                                                       |
|  ├── 20 Normalized Relational Tables                                              |
|  ├── Complex Window Functions (RANK(), PERCENTILE_CONT(0.5) WITHIN GROUP)         |
|  ├── Conditional Aggregations (COUNT(*) FILTER, AVG(CASE WHEN ...))               |
|  └── B-Tree Primary / Foreign / Unique Indexes                                    |
+-----------------------------------------------------------------------------------+
```

### 5.2 Architectural Style Evaluation
- **Clean Architecture Implementation:** **High fidelity in core modules.** In `players`, `squads`, `shortlists`, `users`, and `auth`, ports and use cases are cleanly separated from TypeORM implementations.
- **Pragmatic Compromises:** Certain repositories (`TypeOrmPlayerReadRepository`) directly assemble SelectQueryBuilders due to the high complexity of the dynamic SQL generation engine. This is an intentional and sound engineering trade-off.

---

## 6. MODULE MAP & DEPENDENCY GRAPH

The backend consists of 11 registered modules coordinated by `AppModule`:

```
                                  +------------+
                                  | AppModule  |
                                  +-----+------+
                                        |
       +-----------+----------+---------+---------+----------+-----------+
       |           |          |                   |          |           |
+------v----+ +----v----+ +---v-------+    +------v---+ +----v----+ +----v-----+
|   Auth    | |  Users  | | External  |    |Shortlists| | Squads  | |DataSync  |
|  Module   | | Module  | | Football  |    |  Module  | | Module  | | Module   |
+------+----+ +----+----+ +-----+-----+    +-----+----+ +----+----+ +----+-----+
       |           |            |                |           |           |
       +-----+-----+            |                +-----+-----+           |
             |                  |                      |                 |
             |                  v                      |                 |
             |         +-----------------+             |                 |
             +-------->| Competitions    |<------------+-----------------+
             |         | Seasons, Teams  |
             |         +--------+--------+
             |                  |
             |                  v
             |         +-----------------+
             +-------->| Players Module  |<------------------------------+
                       +--------+--------+
                                |
                                v
                       +-----------------+
                       | Matches Module  |
                       +-----------------+
```

### 6.1 Module Responsibility Matrix

| Module | Core Responsibility | Primary Entities | Primary Controllers | Key Dependencies |
| :--- | :--- | :--- | :--- | :--- |
| **AuthModule** | User authentication, password hashing, JWT creation & rotation, rate lockout, email OTP | `RefreshTokenOrmEntity` | `AuthController` | `UsersModule`, Nodemailer |
| **UsersModule** | User account management, status updates, RBAC role assignment | `UserOrmEntity`, `RoleOrmEntity`, `UserRoleOrmEntity` | `UsersController` (Admin) | TypeORM |
| **PlayersModule** | Canonical player catalog, search, query engine, positions, career history, season statistics | `PlayerOrmEntity`, `PlayerPositionOrmEntity`, `PlayerSeasonStatisticOrmEntity`, `PlayerTeamHistoryOrmEntity` | `PlayersController` | `CompetitionsModule`, `SeasonsModule`, `TeamsModule`, `MatchesModule` |
| **MatchesModule** | Fixture calendar, match results, match-by-match player performance stats | `MatchOrmEntity`, `PlayerMatchStatisticOrmEntity` | `MatchesController` | `CompetitionsModule`, `SeasonsModule`, `TeamsModule` |
| **CompetitionsModule**| Football competitions (e.g., Premier League, La Liga) and season associations | `CompetitionOrmEntity` | `CompetitionsController` | `SeasonsModule` |
| **SeasonsModule** | Season entities (e.g., 2024/2025) and season-team links | `SeasonOrmEntity`, `SeasonTeamOrmEntity` | `SeasonsController` | TypeORM |
| **TeamsModule** | Football clubs, stadiums, logos, current squad rosters | `TeamOrmEntity` | `TeamsController` | TypeORM |
| **ShortlistsModule** | Custom scout scouting dossiers and scout player notes | `ShortlistOrmEntity`, `ShortlistPlayerOrmEntity` | `ShortlistsController` | `UsersModule`, `PlayersModule` |
| **SquadsModule** | Tactical line-up management, 34 formations, position placement rules | `SquadOrmEntity`, `SquadPlayerOrmEntity` | `SquadsController` | `UsersModule`, `PlayersModule`, `SeasonsModule` |
| **DataSyncModule** | Ingestion job orchestration, logging, partial error recovery | `DataSyncJobOrmEntity`, `DataSyncLogOrmEntity` | `AdminDataSyncController` | `ExternalFootballModule`, Core modules |
| **ExternalFootball**| HTTP REST adapter for API-Football with exponential backoff & rate limiter | *None (Gateway Module)* | *None (Client Provider)* | ConfigModule, Native Fetch |

---

## 7. BACKEND LAYER ANALYSIS

Each domain module implements a structured 4-tier layer pattern:

### 7.1 Layer Definitions
1. **Domain Layer:**
   - **Zero dependencies on NestJS or TypeORM.**
   - Contains Domain Entities (`User`, `Player`, `Squad`), Value Objects, Domain Errors (`InvalidCredentialsError`), Metric Registries (`PLAYER_METRIC_REGISTRY`), and Pure Domain Validators (`PlayerQueryValidator`).
2. **Application Layer:**
   - Houses Use Cases (`QueryPlayersUseCase`, `SearchPlayersUseCase`, `LoginUseCase`).
   - Defines Abstract Dependency Injection Ports (`PLAYER_READ_REPOSITORY`, `PASSWORD_HASHER`).
   - Coordinates multi-entity workflows and transactions.
3. **Infrastructure Layer:**
   - Houses TypeORM ORM Entities (mapped with decorators to PostgreSQL columns).
   - Implements Repository Ports (`TypeOrmPlayerReadRepository`, `TypeOrmPlayerWriteRepository`).
   - Translates domain structures into SQL via `player-query.builder.ts`.
   - External API adapters (`ApiFootballClient`).
4. **Presentation Layer:**
   - NestJS REST Controllers decorated with Swagger annotations (`@ApiTags`, `@ApiOperation`).
   - Request DTOs with `class-validator` constraints.
   - Authentication & Role Guards (`JwtAuthGuard`, `@Roles('ADMIN')`).
   - Express Middlewares (`PlayersQueryMethodMiddleware`).

### 7.2 Detailed Request Lifecycle Examples

#### Example 1: Basic Search Request (`GET /api/players?competitionId=...&limit=20`)
1. **Browser** issues `GET /api/players?...` via `fetch`.
2. **NestJS Routing:** Handled by `PlayersController.search(@Query() query: SearchPlayersQueryDto)`.
3. **ValidationPipe:** Validates query string constraints (UUID formatting, numeric ranges).
4. **Use Case Execution:** Invokes `SearchPlayersUseCase.execute(query)`.
5. **Repository Port:** Calls `PLAYER_READ_REPOSITORY.search(query)`.
6. **Infrastructure:** `TypeOrmPlayerReadRepository` constructs a `SelectQueryBuilder`, joins `player_season_statistics` to filter by competition, joins `currentTeam` and `positions`, adds `.orderBy('player.name', 'ASC')`, and applies `.take(20).skip(0)`.
7. **Database:** PostgreSQL executes query and returns row records.
8. **DTO Serialization:** Serialized into `PlayerListResponseDto` and returned as `200 OK`.

#### Example 2: Advanced Tactical Query (`QUERY /api/players` with Boolean AST)
1. **Browser** sends HTTP `QUERY /api/players` with JSON payload `{ query: { kind: 'GROUP', ... } }`.
2. **Middleware Interception:** `PlayersQueryMethodMiddleware` detects `req.method === 'QUERY'`.
3. **Direct Delegation:** Bypasses normal NestJS controller routing directly to `QueryPlayersUseCase.execute()`.
4. **Domain Validation:** Invokes `validateQueryNode(body.query)`:
   - Validates node kinds (`GROUP`, `CONDITION`, `MATCH_AGGREGATION`, `COHORT_COMPARISON`).
   - Checks fields against `PLAYER_METRIC_REGISTRY` (rejects unknown metrics with 400).
   - Validates operator compatibility with metric data types (e.g., rejects `BETWEEN` on strings).
5. **SQL Generation:** Calls `buildWhereClause(queryNode, qb, context)`:
   - Generates nested `Brackets` for Boolean logic.
   - Binds all constants to parameterized variables (`:p0`, `:p1`).
   - Injects `EXISTS` subqueries for `MATCH_AGGREGATION` and CTE/subquery expressions for `COHORT_COMPARISON`.
6. **Two-Stage Fetch (Top N & Rank Queries):**
   - Stage 1: Fetches ranked IDs using `AVG(metricSql)` and `GROUP BY player.id`.
   - Stage 2: Fetches full entity graphs for those specific IDs via `WHERE player.id IN (:...ids)`.
7. **Response:** Middleware outputs JSON array of player profiles with total count to Express response stream.

---

## 8. FRONTEND ARCHITECTURE

The frontend is built using **React 19, TypeScript, and Vite**, following a feature-oriented SPA structure with zero heavy component framework overhead (No Tailwind, No Material UI, No Bootstrap).

### 8.1 State Management & Architecture
- **Routing & Navigation:** Controlled via high-level tab and view state within `App.tsx`.
- **View Modes:** Clean enum transitions:
  `'HOME' | 'SEARCH' | 'COMPARE' | 'SHORTLISTS' | 'SQUADS' | 'DATA_SYNC' | 'LOGIN'`
- **Local Persistence:** JWT access and refresh tokens stored in `localStorage` (`scout_access_token`, `scout_refresh_token`).
- **Session Auto-Refresh:** Integrated in `api.ts` and `shortlist.service.ts` via interceptor logic that catches 401s, calls `POST /api/auth/refresh`, updates tokens, and retries the original request seamlessly.

### 8.2 Design System & Styling Architecture
- **Centralized Design Engine:** `frontend/src/index.css` (208,155 bytes) implements a cohesive **Dark Slate / Scout B2B Tactical Theme**.
- **CSS Variables & Design Tokens:**
  - Backgrounds: `--bg-primary: #0a0e17`, `--bg-secondary: #111827`, `--bg-card: #1a2234`
  - Accent & Action: `--scout-blue: #2563eb`, `--scout-emerald: #10b981`, `--scout-rose: #f43f5e`
  - Typography: Native modern system font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`)
  - Glassmorphism & Elevation: Tailored backdrop filters and crisp borders (`border: 1px solid rgba(255,255,255,0.08)`).

### 8.3 Custom Interactive Visualizations
1. **`PlayerRadarChart.tsx` & `ComparisonRadarChart.tsx`:**
   - 100% Native SVG geometry computed via Trigonometric polar-to-cartesian projection:
     $$x = \text{centerX} + r \cdot \cos(\theta - \pi/2)$$
     $$y = \text{centerY} + r \cdot \sin(\theta - \pi/2)$$
   - Tailored metric archetypes by position category:
     - **Forward/Winger:** Goals/90, Assists/90, Shots/90, Dribbles, Key Passes, Conversion %
     - **Midfielder:** Pass Accuracy %, Progressive Passes, Tackles/90, Interceptions/90, Key Passes
     - **Defender:** Tackles Won %, Aerial Duels %, Interceptions/90, Clearances/90, Recoveries
     - **Goalkeeper:** Save %, Goals Conceded/90, Clean Sheet %, Penalties Saved
2. **Tactical Pitch Visualizer (`SquadDetailPage.tsx`):**
   - Precise football pitch rendering with grass striping, penalty boxes, center circle, and corner arcs.
   - Player position tokens projected by percentage-based coordinates $(x\%, y\%)$.
   - Drag-and-drop / click-to-swap player mechanics between starter slots and substitute benches.

---

## 9. DATABASE ARCHITECTURE & SCHEMA VERIFICATION

Direct verification executed on PostgreSQL 17 (`scoutboard-postgres` container) confirmed the existence of **20 functional tables** and **63 indexes**.

### 9.1 Physical Table Verification

| Table Name | Primary Key | Total Records | Purpose & Relational Role |
| :--- | :--- | :---: | :--- |
| `competitions` | `id` (UUID) | 2 | Top-tier competitions (Premier League, La Liga) |
| `seasons` | `id` (UUID) | 18 | Season years linked to competitions |
| `season_teams` | `(season_id, team_id)` | 40 | Junction table linking teams to specific seasons |
| `teams` | `id` (UUID) | 40 | Club profiles, country, logo, stadium details |
| `players` | `id` (UUID) | 1,271 | Master player records (name, DOB, nationality, height, weight) |
| `player_positions` | `id` (UUID) | 2,025 | Canonical positions played by players (`is_primary` flag) |
| `player_team_history` | `id` (UUID) | 0 | Historical career transfer records |
| `matches` | `id` (UUID) | 760 | Official fixtures with dates, scores, and status |
| `player_match_statistics`| `id` (UUID) | 16,235 | Granular match performance (ratings, minutes, goals, tackles) |
| `player_season_statistics`| `id` (UUID) | 729 | Pre-aggregated season totals and per-90 rates |
| `users` | `id` (UUID) | 14 | Registered user accounts (email, password hash, status) |
| `roles` | `id` (UUID) | 2 | System RBAC roles (`ADMIN`, `USER`) |
| `user_roles` | `(user_id, role_id)`| 14 | Mapping of users to system roles |
| `refresh_tokens` | `id` (UUID) | 2 | Active hashed refresh token families |
| `shortlists` | `id` (UUID) | 4 | User-created player scouting folders |
| `shortlist_players` | `id` (UUID) | 0 | Players saved into specific shortlists with scout notes |
| `squads` | `id` (UUID) | 4 | Tactical line-up rosters created by users |
| `squad_players` | `id` (UUID) | 0 | Players assigned to tactical formation slots |
| `data_sync_jobs` | `id` (UUID) | 0 | Background data synchronization job tracking |
| `data_sync_logs` | `id` (UUID) | 0 | Detailed log messages produced by data sync jobs |
| `migrations` | `id` (Int) | 17 | TypeORM migration execution history |

### 9.2 Key Composite & Performance Indexes
- `UQ_player_season_stats_composite`: UNIQUE on `(player_id, season_id, competition_id, team_id)`
- `UQ_player_match_stats_composite`: UNIQUE on `(match_id, player_id)`
- `IDX_player_match_stats_player_id`: B-tree index on `player_match_statistics (player_id)`
- `IDX_player_match_stats_match_id`: B-tree index on `player_match_statistics (match_id)`
- `IDX_players_primary_position`: B-tree index on `players (primary_position)`
- `uq_squad_captain`: Partial UNIQUE index on `squad_players (squad_id) WHERE is_captain = true`
- `uq_squad_starter_slot`: Partial UNIQUE index on `squad_players (squad_id, slot_code) WHERE role = 'STARTER'`

### 9.3 ERD Cross-Check & Mismatches
1. **Mismatch 1 — Missing `audit_logs` Table:**
   - **Documented:** Documented in `docs/02-database/README.md` and `ScoutBoard_ERD.drawio` as Table #21.
   - **Reality:** Does NOT exist in PostgreSQL (`SELECT to_regclass('public.audit_logs')` returns `NULL`). No migration or TypeORM entity has been created for it.
2. **Mismatch 2 — Dropped `preferred_foot` Column:**
   - **Documented:** Documented in older schema drafts.
   - **Reality:** Migration `1789700000000-DropPreferredFootFromPlayers.ts` explicitly dropped `preferred_foot` from `players` table to align with API-Football data limitations.

---

## 10. AUTHENTICATION & AUTHORIZATION SYSTEM

### 10.1 Authentication Workflows
- **Registration (`POST /api/auth/register`):**
  - Accepts email, password, full name.
  - Password hashed using `bcryptjs` (salt rounds: 10).
  - Assigns default role `USER`.
  - Generates a 6-digit numeric OTP with 15-minute expiration and sends via Nodemailer.
- **Login (`POST /api/auth/login`):**
  - Uses pessimistic database row locking (`setLock('pessimistic_write')`) within a transaction to prevent race conditions during rapid login attempts.
  - **Progressive Brute-Force Lockout:**
    - Tracks `failed_login_attempts` within a 1-hour observation window.
    - 5 consecutive failures triggers temporary lockout (5 min -> 15 min -> 30 min -> 60 min).
    - Prevents password guessing while maintaining user availability.
  - Generates JWT Access Token (15-minute expiry) and Refresh Token (7-day expiry).
- **Token Refresh (`POST /api/auth/refresh`):**
  - Implements Refresh Token Rotation. Using an expired or revoked token invalidates the entire token family to defend against replay attacks.

### 10.2 Role-Based Access Control (RBAC)
- **Roles in Database:** `ADMIN` and `USER` (Seeded in `role.seed.ts`).
- **Guards:**
  - `JwtAuthGuard`: Enforces valid Bearer JWT.
  - `RolesGuard`: Enforces role claims extracted from `@Roles(...)` decorator.
- **Access Policies:**
  - `GET /api/players` (Basic Search): `PUBLIC`
  - `GET /api/players/:id` (Player Details): `PUBLIC`
  - `GET /api/competitions`, `/api/seasons`, `/api/teams`, `/api/matches`: `PUBLIC`
  - `QUERY /api/players` (Advanced Search): Gated in UI, **Unauthenticated at API layer** *(See Finding SEC-001)*.
  - `POST /api/shortlists`, `POST /api/squads`: `AUTHENTICATED (USER or ADMIN)`
  - `GET /api/admin/users`, `POST /api/admin/data-sync`: `ADMIN ONLY`

---

## 11. BASIC SEARCH ENGINE

### 11.1 Overview & Endpoint
- **Endpoint:** `GET /api/players`
- **Controller:** `PlayersController.search()`
- **Use Case:** `SearchPlayersUseCase`
- **Repository Method:** `TypeOrmPlayerReadRepository.search()`
- **Access:** Public (No authentication required)

### 11.2 Supported Query Parameters

| Parameter | Type | Validation / Rule | SQL Mapping |
| :--- | :---: | :--- | :--- |
| `search` | String | Trimmed, case-insensitive substring | `player.name ILIKE :search OR player.shortName ILIKE :search` |
| `competitionId` | UUID | Must match valid competition | `pss.competition_id = :competitionId` |
| `currentTeamId` | UUID | Must match valid team | `player.current_team_id = :currentTeamId` |
| `position` | String | Valid canonical position code | `player.primary_position = :pos OR EXISTS (pp.position_code = :pos)` |
| `nationality` | String | Case-insensitive match | `LOWER(player.nationality) = LOWER(:nationality)` |
| `minAge` / `maxAge`| Number | Integer 15–50, `minAge <= maxAge` | `EXTRACT(YEAR FROM age(CURRENT_DATE, player.date_of_birth))` |
| `minHeightCm` / `maxHeightCm` | Number | Integer 150–220, `min <= max` | `player.height_cm BETWEEN :min AND :max` |
| `minWeightKg` / `maxWeightKg` | Number | Integer 50–120, `min <= max` | `player.weight_kg BETWEEN :min AND :max` |
| `limit` / `offset` | Number | Default: `limit=20, offset=0` | `.take(limit).skip(offset)` |

### 11.3 Architectural Isolation
Basic Search remains strictly decoupled from Advanced Search:
- Basic Search operates via standard URL query parameters on `GET /api/players`.
- Advanced Search operates via structured JSON request bodies on `QUERY /api/players`.
- Changes to the Advanced Query Engine do not introduce regression risks into Basic Search.

---

## 12. ADVANCED TACTICAL SEARCH ENGINE

### 12.1 User Interface & Workflow (`PlayerAdvancedSearchContext.tsx`)
The tactical search interface allows scouts to compose multi-dimensional tactical queries without writing SQL:
1. **Multi-Competition Scope:** Select 1 to N leagues (Premier League, La Liga). Displayed as removable chips.
2. **Multi-Club Scope:** Dynamically filtered by the chosen leagues. Select multiple clubs to scout.
3. **Canonical Position Selector:** Single-select from 15 canonical positions (GK, CB, LB, RB, LWB, RWB, CDM, CM, CAM, LM, RM, LW, RW, CF, ST).
4. **Position-Specific Performance Metrics:** Automatically renders metrics meaningful to that specific position (e.g., Clean Sheets and Save % for GK; Tackles and Interceptions for CDM; Key Passes and Goal Threat for CAM/ST).
5. **Statistic Ranges (`from` - `to`):** Dynamic rows allowing scouts to add multiple threshold criteria (e.g., `goals_per90 >= 0.35` AND `pass_accuracy >= 80%`).
6. **Top N Leaderboard Ranking:** Allows filtering for players ranked in the top 1, 5, 10, 15, 20, 25, 50, or custom N for any metric within the selected candidate pool.

---

## 13. QUERY ENGINE & BOOLEAN QUERYNODE TREE

### 13.1 QueryNode Domain Taxonomy
The query engine represents complex queries as a recursive Abstract Syntax Tree (AST):

```
                        GroupNode (AND)
                              │
     ┌────────────────┬───────┴────────┬──────────────────┐
     ▼                ▼                ▼                  ▼
GroupNode (OR)   ConditionNode   ConditionNode   CohortComparisonNode
(Competitions)   (Position=ST)  (Goals/90 >= 0.4)    (Top 10 Rank)
```

```typescript
export type QueryNode =
  | FieldCondition
  | GroupNode
  | MatchAggregationCondition
  | CohortComparisonCondition;
```

### 13.2 Recursive Composition Example
```json
{
  "kind": "GROUP",
  "operator": "AND",
  "conditions": [
    {
      "kind": "GROUP",
      "operator": "OR",
      "conditions": [
        { "kind": "CONDITION", "field": "competition", "operator": "EQ", "value": "comp-uuid-laliga" },
        { "kind": "CONDITION", "field": "competition", "operator": "EQ", "value": "comp-uuid-premier-league" }
      ]
    },
    { "kind": "CONDITION", "field": "position", "operator": "EQ", "value": "ST" },
    { "kind": "CONDITION", "field": "goals_per90", "operator": "GTE", "value": 0.35 },
    {
      "kind": "COHORT_COMPARISON",
      "metric": "goals_per90",
      "comparison": { "type": "RANK", "operator": "LTE", "value": 10 },
      "cohort": { "context": true }
    }
  ]
}
```

### 13.3 Safe Parameter Binding & Injection Prevention
- **Field Whitelisting:** Metric fields are strictly checked against `PLAYER_METRIC_REGISTRY`. Unknown fields are rejected with HTTP 400.
- **SQL Literals:** Column expressions are server-controlled constants (`METRIC_SQL_MAP`). No user-supplied field string is ever interpolated into SQL.
- **Parameterized Variables:** All user-supplied comparison values are assigned unique parameter names (`:p0`, `:p1`, `:p2`) and bound directly to TypeORM query parameters. SQL injection is mathematically impossible through this query engine.

---

## 14. HTTP QUERY METHOD & TRANSPORT ARCHITECTURE

### 14.1 Motivation: Why HTTP `QUERY`?
- Standard `GET` requests cannot safely convey deeply nested, arbitrary-depth JSON trees without exceeding URL length limitations (2,048 characters in standard proxies/browsers) and causing severe URL-encoding readability degradation.
- Using `POST` for idempotent data retrieval violates RESTful architectural principles (POST implies state mutation, cache invalidation, and non-idempotent semantics).
- ScoutBoard adopts the IETF draft **HTTP `QUERY` method** (`draft-ietf-httpbis-safe-method-w-body`), which explicitly specifies safe, idempotent data querying using a structured request body.

### 14.2 NestJS Implementation Mechanism
Because NestJS `@Get()` / `@Post()` decorators do not natively support `@Query()` HTTP verbs, ScoutBoard implements a dedicated middleware:
```typescript
@Injectable()
export class PlayersQueryMethodMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (req.method.toUpperCase() !== 'QUERY') {
      next(); // Pass GET, PATCH, DELETE to standard controller
      return;
    }
    // Intercept QUERY method, parse body, execute QueryPlayersUseCase
    const result = await this.queryPlayersUseCase.execute({
      queryNode: req.body['query'],
      pagination: req.body['pagination'],
      scope: req.body['scope'],
    });
    res.status(200).json(result);
  }
}
```

---

## 15. MATCH AGGREGATION ENGINE

### 15.1 Aggregation Types & SQL Execution Pattern
The `MATCH_AGGREGATION` condition allows filtering players based on their individual match performances across all matches played in the scoped season.

```typescript
export interface MatchAggregationCondition {
  readonly kind: 'MATCH_AGGREGATION';
  readonly matchCriteria: FieldCondition;
  readonly aggregation: {
    readonly type: 'COUNT' | 'AVG' | 'QUALIFYING_RATE';
    readonly operator: 'GT' | 'GTE' | 'LT' | 'LTE' | 'EQ';
    readonly value: number;
    readonly field?: string; // Required for AVG
  };
}
```

### 15.2 Generated SQL Semantics
Executed as an `EXISTS` subquery grouped by player:
```sql
EXISTS (
  SELECT 1
  FROM player_match_statistics pms
  INNER JOIN matches m ON m.id = pms.match_id
  WHERE pms.player_id = player.id
    AND m.season_id = :scopeSeasonId
  GROUP BY pms.player_id
  HAVING <AGGREGATE_EXPRESSION> >= :threshold
)
```

1. **`COUNT`:**
   Counts matches meeting the criteria:
   `COUNT(*) FILTER (WHERE pms.rating >= 7.5) >= 5`
2. **`AVG`:**
   Averages metric over qualifying matches where player actually took the pitch:
   `AVG(CASE WHEN pms.rating >= 7.0 AND pms.minutes_played > 0 THEN pms.key_passes END) >= 2.0`
3. **`QUALIFYING_RATE`:**
   Ratio of qualifying matches to total matches played (safeguarded against division by zero):
   `CAST(COUNT(*) FILTER (WHERE pms.minutes_played > 0 AND pms.rating >= 7.0) AS DECIMAL) / NULLIF(COUNT(*) FILTER (WHERE pms.minutes_played > 0), 0) >= 0.60`

---

## 16. COHORT ANALYSIS, PERCENTILES & RANKING ENGINE

### 16.1 Static Cohort vs Candidate-Context Ranking
- **Static Cohort (`cohort: { competitionId, seasonId, position }`):**
  Calculates the statistical baseline across all players belonging to a fixed league, season, and position group (e.g., "Compare against all La Liga 2024/2025 Midfielders").
- **Candidate-Context Ranking (`cohort: { context: true }`):**
  Dynamically computes the cohort distribution **strictly across the candidate pool defined by the rest of the search query**. For example, in a search for "All Premier League Strikers under 23", `cohort: { context: true }` ranks players only against other U23 Premier League Strikers, not the entire league.

### 16.2 Window Functions & Ranking Math
1. **`AVERAGE`:**
   Compares against `SELECT AVG(metric) FROM cohort_values`.
2. **`MEDIAN`:**
   Compares against `SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY metric) FROM cohort_values`.
3. **`PERCENTILE`:**
   Calculates exact percentile threshold using continuous interpolation:
   `SELECT PERCENTILE_CONT(:percentile / 100.0) WITHIN GROUP (ORDER BY metric) FROM cohort_values`.
4. **`RANK` (Top N):**
   Handles ties, lower-is-better metrics (e.g., goals conceded), and empty cohorts:
   ```sql
   (SELECT COALESCE(
       MIN(ranked.player_rank) FILTER (WHERE ranked.metric_value = candidate_metric),
       COUNT(*) FILTER (WHERE ranked.metric_value > candidate_metric) + 1
   ) FROM (
       SELECT ranked_values.metric_value, 
              RANK() OVER (ORDER BY ranked_values.metric_value DESC) AS player_rank
       FROM ( ...cohortValuesSql... ) ranked_values
   ) ranked) <= :topNThreshold
   ```

---

## 17. POSITION-SPECIFIC TACTICAL METRICS & REGISTRY

### 17.1 Canonical Position Taxonomy
ScoutBoard normalizes raw provider positions into **15 Canonical Positions**:
- **Goalkeeper:** `GK`
- **Defenders:** `LB`, `CB`, `RB`, `LWB`, `RWB`
- **Midfielders:** `CDM`, `CM`, `CAM`, `LM`, `RM`
- **Attackers:** `LW`, `RW`, `CF`, `ST`

*(Coarse labels `DEF`, `MID`, `FWD` are normalized into primary canonical positions in migration 16).*

### 17.2 Metric Registry Sample Mappings

| Metric Key | Label | Source | Type | Applicable Positions | SQL Column / Expression |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `goals_per90` | Goals / 90 | Season | Derived | Attacker / Midfielder | `pss.goals_per90` |
| `assists_per90` | Assists / 90 | Season | Derived | Attacker / Midfielder | `pss.assists_per90` |
| `key_passes_per90` | Key Passes / 90 | Season | Derived | Midfielder / Winger | `pss.key_passes_per90` |
| `tackles_per90` | Tackles / 90 | Season | Derived | Defender / Midfielder | `pss.tackles_per90` |
| `interceptions_per90` | Interceptions / 90 | Season | Derived | Defender / Midfielder | `pss.interceptions_per90` |
| `pass_accuracy` | Pass Accuracy % | Season | Derived | Outfield | `ROUND(pss.passes_completed * 100.0 / NULLIF(pss.passes_attempted, 0))` |
| `saves_per90` | Saves / 90 | Season | Derived | `GK` Only | `pss.saves_per90` |
| `save_percentage` | Save Percentage | Season | Derived | `GK` Only | `pss.save_percentage` |
| `goals_conceded_per90`| Conceded / 90 | Season | Derived | `GK` Only (ASC rank) | `pss.goals_conceded_per90` |

---

## 18. PLAYER DOMAIN MODEL & METRICS DERIVATION

### 18.1 Raw vs Derived vs Normalized Data
- **Raw Data:** Direct counts stored in `player_match_statistics` and `player_season_statistics` (e.g., `goals`, `assists`, `minutes_played`, `passes_attempted`, `passes_completed`).
- **Normalized Per-90 Metrics:** Computed during season aggregation (`player-season-statistics.aggregator.ts`) and persisted in `player_season_statistics` for high-speed indexing:
  $$\text{metric\_per90} = \frac{\text{raw\_count} \times 90}{\text{minutes\_played}}$$
- **Derived Percentages:** Computed with `NULLIF` to prevent runtime division by zero:
  $$\text{pass\_accuracy} = \frac{\text{passes\_completed} \times 100}{\max(\text{passes\_attempted}, 1)}$$

---

## 19. PLAYER DETAIL & MATCH LOG MODULE

`PlayerDetailPage.tsx` displays comprehensive player dossiers:
1. **Header & Bio:** Name, shirt number, canonical position badge, nationality flag, age, height, weight, current team logo.
2. **Career History Timeline:** Chronological club progression with start/end dates and loan indicators.
3. **Season Performance Cards:** Summary metrics broken down by competition.
4. **Interactive Tactical Radar Chart:** Visualizes position archetype strengths against league benchmarks.
5. **Match Log Grid:** Paginated list of recent fixtures showing match rating, minutes played, goals, assists, passes, tackles, and starter status.

---

## 20. PLAYER COMPARISON ENGINE

`PlayerComparisonPage.tsx` delivers head-to-head scouting comparisons:
- **Comparison Setup:** Candidate selection filtered by competition scope (`COMPETITION` vs `GLOBAL`) and position compatibility.
- **Dual Radar Overlay:** Compares Player A (Blue) vs Player B (Emerald) on a unified SVG canvas.
- **Dynamic Metric Highlighting:** Highlights the superior metric in emerald and indicates statistically significant margins.
- **Goalkeeper & Outfield Modes:** Automatically adjusts metrics if comparing two goalkeepers.

---

## 21. SHORTLISTS MODULE

`shortlists.controller.ts` & `ShortlistDetailPage.tsx`:
- **Scouting Dossiers:** Scouts create categorized lists (e.g., "U21 Summer Targets", "Emergency CBs").
- **Dossier Operations:** Full CRUD on dossiers with private/public visibility settings.
- **Player Annotations:** Attach private scouting notes, priority ratings, and target valuations to shortlisted players.

---

## 22. SQUAD BUILDING & TACTICAL FORMATION MODULE

`squads.controller.ts`, `SquadDetailPage.tsx`, & `squad-placement.utils.ts`:
- **34 Supported Formations:** Full coverage including 4-3-3, 4-2-3-1, 3-4-2-1, 5-3-2, 4-4-2 Diamond, etc.
- **Interactive Pitch Rendering:** Percentage coordinate projection renders starting XI and bench.
- **Position Compatibility Matrix:** Validates if a player's canonical position or aliases match slot requirements.
- **Roster Controls:** Captaincy assignment (`uq_squad_captain` constraint guarantees single captain), substitution swapping, and formation restructuring without losing player assignments.

---

## 23. DATA SYNCHRONIZATION PIPELINE & EXTERNAL PROVIDER

### 23.1 External Provider Client
- Implemented in `backend/src/modules/external-football/infrastructure/clients/api-football.client.ts`.
- Targets API-Sports v3 (`https://v3.football.api-sports.io`).
- Implements exponential backoff retry logic (`maxRetries: 3`, `initialRetryDelayMs: 1000`) for resilience against network jitter.

### 23.2 Admin Synchronization Engine
- `ExecuteAdminSyncUseCase` orchestrates multi-stage sync jobs:
  1. Team & Roster Ingestion
  2. Player Profile Ingestion & Nationality Resolution
  3. Match Fixture Schedule Ingestion
  4. Fixture Player Match Statistics Ingestion
  5. Season Statistics Aggregation & Per-90 Calculation

---

## 24. TESTING STRATEGY & TEST SUITE RESULTS

### 24.1 Test Execution Verification
Test suite executed via `npm test -- --runInBand` in `backend/`:
```
Test Suites: 121 passed, 121 total
Tests:       664 passed, 664 total
Snapshots:   0 total
Time:        18.373 s
Ran all test suites.
```

### 24.2 Testing Breadth
- **Domain Tests:** Comprehensive validation of AST recursive validator (`player-query.validator.spec.ts`), position enums, and stat aggregators.
- **Query Builder Tests:** Verifies generated SQL clauses, parameter bindings, `HAVING` expressions, and `EXISTS` subqueries (`player-query.builder.spec.ts`).
- **Use Case Tests:** Unit test coverage across all application use cases using in-memory mock repositories.
- **Integration / Database Tests:** Migration tests (`squad-players-migration.spec.ts`, `data-sync-persistence.spec.ts`).

---

## 25. DEPLOYMENT ARCHITECTURE & DOCKER INFRASTRUCTURE

### 25.1 Container Orchestration
`docker-compose.yml` configures two services:
```yaml
services:
  postgres:
    image: postgres:17-alpine
    container_name: scoutboard-postgres
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d scoutboard_db"]
      interval: 10s
  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: scoutboard-pgadmin
    ports: ["8080:80"]
    depends_on:
      postgres: { condition: service_healthy }
```

---

## 26. FULL TECHNICAL AUDIT

### 26.1 Architectural Audit
- **Modularity:** High. Modules are self-contained with clear boundaries.
- **Coupling:** Moderate circular dependencies exist between `players`, `competitions`, `seasons`, and `teams`, resolved via `forwardRef()`.
- **Frontend File Size:** Monolithic page files (several exceeding 1,200 lines) concentrate excessive UI and state logic.

### 26.2 Backend & Security Audit
- **Input Validation:** Excellent on standard endpoints via `class-validator`. AST queries are strictly validated via domain validator.
- **SQL Injection:** Zero vulnerability detected. All query engine clauses use server-side constants and parameterized inputs.
- **Authorization Gaps:** Two significant authorization omissions were identified in `PlayersQueryMethodMiddleware` and `PlayersController` *(See Findings SEC-001 and SEC-002)*.

### 26.3 Database & Query Performance Audit
- **Indexing:** Primary keys and search filter columns are thoroughly indexed.
- **Scalability Concern:** `MATCH_AGGREGATION` subqueries perform table scans on `player_match_statistics` filtering on `(player_id, minutes_played)`. While fast at 16,000 rows, a composite index will be required as match data scales past 100,000 rows.

---

## 27. CLASSIFIED AUDIT FINDINGS

### 🚨 FINDING SEC-001: Advanced Search Gated in UI but Unauthenticated at API Layer
- **Severity:** `HIGH`
- **Location:** `backend/src/modules/players/presentation/http/middlewares/players-query-method.middleware.ts` (lines 27–52)
- **Problem:** In the React frontend (`PlayerSearchPage.tsx` lines 571–614), Advanced Tactical Search is restricted to authenticated users via an Auth Guard Card. However, in the backend, `PlayersQueryMethodMiddleware` intercepts `QUERY /api/players` and executes the query directly **without verifying JWT tokens or applying `JwtAuthGuard`**.
- **Evidence:** Verified via live HTTP request:
  `curl.exe -X QUERY "http://localhost:3000/api/players" -H "Content-Type: application/json" --data-binary "@scratch/t1_gp90.json"`
  Returned `HTTP/1.1 200 OK` with 95 matched players and full data without an `Authorization` header.
- **Impact:** Any external user or automated script can query the full advanced scouting database without logging in, bypassing the intended product/monetization gate.
- **Recommendation:** Inject `JwtAuthGuard` into `PlayersQueryMethodMiddleware` or invoke Passport's JWT verification before delegating to `QueryPlayersUseCase`.

---

### 🚨 FINDING SEC-002: Unauthenticated Player Primary Position Mutation
- **Severity:** `HIGH`
- **Location:** `backend/src/modules/players/presentation/http/controllers/players.controller.ts` (lines 85–94)
- **Problem:** The endpoint `PATCH /api/players/:id/primary-position` allows updating a player's canonical primary position. It has **no `@UseGuards(JwtAuthGuard)` and no role restriction**.
- **Evidence:** Line 85:
  ```typescript
  @ApiOperation({ summary: 'Cập nhật vị trí chính của cầu thủ' })
  @Patch(':id/primary-position')
  async updatePrimaryPosition(...)
  ```
- **Impact:** Any anonymous visitor on the internet can overwrite the primary tactical position of any player in the database, corrupting search results, radar charts, and squad placement.
- **Recommendation:** Apply `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles('ADMIN')` to restrict position updates to administrators.

---

### ⚠️ FINDING DB-001: Schema vs Documentation Mismatch (`audit_logs`)
- **Severity:** `MEDIUM`
- **Location:** `docs/02-database/README.md` & `ScoutBoard_ERD.drawio`
- **Problem:** Documentation lists Table #21 as `audit_logs` in Zone 4.
- **Evidence:** Query `SELECT to_regclass('public.audit_logs');` returns `NULL`. No migration or entity exists.
- **Impact:** Misleads developers and auditors into expecting automatic database auditing.
- **Recommendation:** Either implement the `audit_logs` migration/entity or update the documentation to mark it as `PLANNED`.

---

### ⚠️ FINDING ARCH-001: Monolithic Frontend Page Components
- **Severity:** `MEDIUM`
- **Location:** `PlayerComparisonPage.tsx` (1,733 lines), `PlayerDetailPage.tsx` (1,544 lines), `PlayerAdvancedSearchContext.tsx` (1,306 lines), `SquadDetailPage.tsx` (1,266 lines)
- **Problem:** Massive page components bundle UI layout, modal state, data fetching, coordinate calculations, and error handling in single files.
- **Impact:** High cognitive load, merge conflict risks, and lack of component reusability.
- **Recommendation:** Decompose into specialized subcomponents and custom hooks (e.g., `usePlayerDetailStats`, `useSquadPlacement`).

---

### ⚠️ FINDING PERF-001: Monolithic Frontend Bundle (No Route Code-Splitting)
- **Severity:** `LOW`
- **Location:** `frontend/src/App.tsx` & `vite.config.ts`
- **Problem:** All pages are imported statically. Vite build generates a single 627.89 kB JavaScript bundle triggering a chunk size warning.
- **Impact:** Slower initial page load for users who only visit basic search.
- **Recommendation:** Use `React.lazy()` and `Suspense` for heavy routes (`PlayerComparisonPage`, `SquadDetailPage`, `AdminDataSyncPage`).

---

### ℹ️ FINDING TEST-001: Frontend Lacks Automated Test Script
- **Severity:** `LOW`
- **Location:** `frontend/package.json`
- **Problem:** Although `squad-placement.utils.spec.ts` exists, `frontend/package.json` has no test script or test runner (no Vitest or Jest installed).
- **Impact:** Frontend utility and component logic cannot be validated in CI/CD pipelines.
- **Recommendation:** Install Vitest and add `"test": "vitest run"`.

---

## 28. TECHNICAL DEBT INVENTORY

| Debt Item | Area | Description | Priority |
| :--- | :---: | :--- | :---: |
| **Module Circularity** | Backend | Circular references between `PlayersModule` and `Competitions/Teams/Seasons` resolved with `forwardRef()`. | Medium |
| **Composite Match Index**| Database | Missing composite index on `player_match_statistics (player_id, minutes_played)`. | Medium |
| **Token Secret in Git** | Security | Fallback JWT secret in `.env.example` must be enforced as mandatory environment variable in production. | Medium |
| **Sync Quota Tracking** | Data Pipeline| API-Football calls are not tracked against monthly plan quotas, risking sudden API throttling. | Low |
| **CSS Organization** | Frontend | `index.css` is a single 208 KB file; should be split into modular CSS files or CSS modules. | Low |

---

## 29. RECOMMENDED NEXT STEPS

### Phase 1: Security & Stability (Immediate Priority)
1. **Patch SEC-001:** Add JWT authentication check to `PlayersQueryMethodMiddleware` so `QUERY /api/players` requires an active session.
2. **Patch SEC-002:** Add `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles('ADMIN')` to `PATCH /api/players/:id/primary-position`.
3. **Database Indexing:** Add composite index `CREATE INDEX idx_pms_player_minutes ON player_match_statistics (player_id, minutes_played);`.

### Phase 2: Frontend Modernization & Performance
1. **Code-Splitting:** Implement `React.lazy()` for `PlayerComparisonPage`, `SquadDetailPage`, and `AdminDataSyncPage`.
2. **Decompose Monoliths:** Refactor `PlayerDetailPage.tsx` and `PlayerComparisonPage.tsx` into modular hooks and presentation components.
3. **Frontend Testing:** Configure Vitest to run frontend unit tests in automated CI.

### Phase 3: Product Enhancements (Roadmap)
1. **Granular RBAC:** Implement dedicated `SCOUT` role in `roles` table with customized feature quotas.
2. **Audit Logging:** Implement the planned `audit_logs` entity to track admin actions and data sync executions.
3. **Export Dossiers:** Add PDF / CSV export for shortlists and player comparison reports.

---

## 30. FINAL ARCHITECTURE DIAGRAM

```
================================================================================================
                                   SCOUTBOARD SYSTEM TOPOLOGY
================================================================================================

 [ Client Browser ]
        │
        ├─► Static Assets (Vite SPA: React 19, CSS Design Tokens, Native SVG Radars)
        │
        ▼ (HTTPS / JSON)
 [ Reverse Proxy / Nginx / Ingress ]
        │
        ▼
 [ NestJS Monolith API (:3000) ]
   ├── Global Middleware Layer
   │     ├── CORS Configuration (Methods: GET, POST, PATCH, DELETE, QUERY)
   │     ├── Global ValidationPipe (DTO Transformation & Whitelisting)
   │     └── PlayersQueryMethodMiddleware (Intercepts HTTP QUERY Method)
   │
   ├── Presentation Layer (REST Controllers & Guards)
   │     ├── AuthController (`/api/auth/*` — Register, Login, Lockout, OTP, Refresh)
   │     ├── PlayersController (`/api/players/*` — Basic Search, Profiles, Stats)
   │     ├── CompetitionsController / SeasonsController / TeamsController
   │     ├── MatchesController (`/api/matches/*` — Fixtures & Match Logs)
   │     ├── ShortlistsController (`/api/shortlists/*` — Guarded by JwtAuthGuard)
   │     ├── SquadsController (`/api/squads/*` — Guarded by JwtAuthGuard)
   │     └── AdminDataSyncController (`/api/admin/data-sync` — Guarded by Roles('ADMIN'))
   │
   ├── Application Layer (Pure Orchestration Use Cases)
   │     ├── QueryPlayersUseCase (Executes Recursive Boolean Queries)
   │     ├── SearchPlayersUseCase (Executes Multi-Attribute Basic Search)
   │     ├── LoginUseCase (Transaction-locked Brute-Force Rate Limiting)
   │     ├── CreateSquadUseCase / PlacePlayerUseCase
   │     └── ExecuteAdminSyncUseCase
   │
   ├── Domain Layer (Zero Framework / Zero SQL)
   │     ├── PlayerQueryValidator (Recursive AST validation against Metric Registry)
   │     ├── PlayerMetricRegistry (O(1) dictionary of 40+ queryable metrics)
   │     └── Domain Entities & Value Objects
   │
   └── Infrastructure Layer (Persistence & Adapters)
         ├── PlayerQueryBuilder (Translates AST -> Parameterized TypeORM SQL Clauses)
         ├── TypeORM Repositories (TypeOrmPlayerReadRepository, etc.)
         └── ApiFootballClient (External Gateway with Exponential Backoff)
                │
                ▼ (HTTPS API Key)
         [ API-Sports / API-Football External API ]

        │ (TypeORM Connection Pool: 5432)
        ▼
 [ PostgreSQL 17 Alpine Database (:5432) ]
   ├── Authentication & RBAC (users, roles, user_roles, refresh_tokens)
   ├── Football Core (competitions, seasons, season_teams, teams, matches)
   ├── Player Catalog (players, player_positions, player_team_history)
   ├── Performance Stats (player_season_statistics, player_match_statistics)
   ├── User Data (shortlists, shortlist_players, squads, squad_players)
   └── Sync Jobs (data_sync_jobs, data_sync_logs)
================================================================================================
```
