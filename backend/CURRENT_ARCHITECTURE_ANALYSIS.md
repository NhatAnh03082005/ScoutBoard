# Current Architecture Analysis Report (ScoutBoard Backend)

## 1. Executive Summary
This document provides a comprehensive analysis of the existing ScoutBoard backend architecture prior to refactoring it into a **Modular Monolith with Clean Architecture**.

---

## 2. Directory Structure & File Listing

### Existing Structure (`src/`)
```text
src/
├── app.controller.spec.ts
├── app.controller.ts
├── app.module.ts
├── app.service.ts
├── main.ts
├── auth/
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── constants/
│   │   └── auth-lockout.constants.ts
│   ├── decorators/
│   │   └── roles.decorator.ts
│   ├── dto/
│   │   ├── login.dto.ts
│   │   ├── refresh-token.dto.ts
│   │   └── register.dto.ts
│   ├── entities/
│   │   └── refresh-token.entity.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   └── strategies/
│       └── jwt.strategy.ts
├── users/
│   ├── dto/
│   │   └── admin-user.dto.ts
│   ├── entities/
│   │   └── user.entity.ts
│   ├── users.controller.ts
│   ├── users.module.ts
│   └── users.service.ts
├── roles/
│   ├── entities/
│   │   ├── role.entity.ts
│   │   └── user-role.entity.ts
│   ├── roles.module.ts
│   └── roles.service.ts
├── competitions/
│   ├── dto/
│   ├── entities/
│   │   └── competition.entity.ts
│   ├── competitions.controller.ts
│   ├── competitions.module.ts
│   └── competitions.service.ts
├── seasons/
│   └── entities/
│       └── season.entity.ts
├── teams/
│   └── entities/
│       └── team.entity.ts
├── players/
│   └── entities/
│       ├── player-position.entity.ts
│       ├── player-season-statistic.entity.ts
│       ├── player-team-history.entity.ts
│       └── player.entity.ts
├── matches/
│   └── entities/
│       ├── match.entity.ts
│       └── player-match-statistic.entity.ts
└── database/
    ├── data-source.ts
    ├── migrations/
    │   ├── 1784991962668-1785000000001-CreateUsersAndRoles.ts
    │   ├── 1785000000002-AddLockoutColumnsToUsers.ts
    │   ├── 1785382913636-CreateFootballCoreZone2.ts
    │   └── 1785383171108-AddRemainingZone2Entities.ts
    └── seeds/
        ├── admin.seed.ts
        ├── role.seed.ts
        └── run-seeds.ts
```

---

## 3. Identified Architectural Issues

### 3.1 Tight Coupling to TypeORM & NestJS Decorators
- Entities in `users`, `roles`, `auth`, `players`, etc., double as TypeORM ORM entities with `@Entity()`, `@Column()`, `@PrimaryGeneratedColumn()`.
- Controllers and services directly depend on TypeORM `@InjectRepository(Entity)` and `Repository<T>`.

### 3.2 Monolithic "God Services"
- `AuthService` handles password hashing, JWT generation, registration, login lockout, raw SQL transactions, token refresh, and logout all in a single 470+ line class.
- `UsersService` handles admin queries, status updates, lockout resets, role management, and user registration queries.

### 3.3 Over-fragmented Technical Modules
- `RolesModule` exists as a separate module even though `roles` and `user_roles` are technical/junction tables serving the `users` domain.
- `roles` and `user_roles` will be consolidated under `modules/users`.

### 3.4 Missing Layer Separation
- Application logic, validation, HTTP response formatting, database queries, and raw SQL queries are mixed inside NestJS Services (`AuthService`, `UsersService`).
- No domain entities, repository interfaces, use cases, or persistence mappers exist yet.

---

## 4. Proposed Modular Monolith + Clean Architecture

### Proposed Directory Layout (`src/modules/`)
```text
src/
├── modules/
│   ├── auth/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── refresh-token.ts
│   │   │   └── repositories/
│   │   │       └── refresh-token.repository.ts
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   ├── register.use-case.ts
│   │   │   │   ├── login.use-case.ts
│   │   │   │   ├── refresh-tokens.use-case.ts
│   │   │   │   └── logout.use-case.ts
│   │   │   ├── dto/
│   │   │   └── ports/
│   │   │       ├── password-hasher.port.ts
│   │   │       └── token-service.port.ts
│   │   ├── infrastructure/
│   │   │   ├── persistence/
│   │   │   │   └── typeorm/
│   │   │   │       ├── entities/
│   │   │   │       │   └── refresh-token.orm-entity.ts
│   │   │   │       ├── repositories/
│   │   │   │       │   └── typeorm-refresh-token.repository.ts
│   │   │   │       └── mappers/
│   │   │   │           └── refresh-token.mapper.ts
│   │   │   └── security/
│   │   │       ├── bcrypt-password-hasher.ts
│   │   │       └── jwt-token.service.ts
│   │   ├── presentation/
│   │   │   └── http/
│   │   │       ├── controllers/
│   │   │       │   └── auth.controller.ts
│   │   │       ├── dto/
│   │   │       ├── guards/
│   │   │       ├── strategies/
│   │   │       └── decorators/
│   │   └── auth.module.ts
│   │
│   ├── users/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── user.ts
│   │   │   │   └── role.ts
│   │   │   ├── repositories/
│   │   │   │   └── user.repository.ts
│   │   │   └── errors/
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   ├── create-user.use-case.ts
│   │   │   │   ├── get-user-by-id.use-case.ts
│   │   │   │   ├── get-user-by-email.use-case.ts
│   │   │   │   ├── list-users-admin.use-case.ts
│   │   │   │   ├── update-user-status.use-case.ts
│   │   │   │   ├── unlock-user.use-case.ts
│   │   │   │   └── update-user-roles.use-case.ts
│   │   │   └── dto/
│   │   ├── infrastructure/
│   │   │   ├── persistence/
│   │   │   │   └── typeorm/
│   │   │   │       ├── entities/
│   │   │   │       │   ├── user.orm-entity.ts
│   │   │   │       │   ├── role.orm-entity.ts
│   │   │   │       │   └── user-role.orm-entity.ts
│   │   │   │       ├── repositories/
│   │   │   │       │   └── typeorm-user.repository.ts
│   │   │   │       └── mappers/
│   │   │   │           └── user.mapper.ts
│   │   ├── presentation/
│   │   │   └── http/
│   │   │       ├── controllers/
│   │   │       │   └── users.controller.ts
│   │   │       └── dto/
│   │   └── users.module.ts
│   │
│   ├── players/ (Lightweight Clean Architecture for ETL-owned data)
│   ├── teams/
│   ├── competitions/
│   ├── seasons/
│   └── matches/
│
├── shared/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── presentation/
│
├── database/
│   ├── migrations/
│   ├── seeds/
│   │   ├── app/
│   │   └── mock-etl/
│   └── data-source.ts
│
├── app.module.ts
└── main.ts
```

---

## 5. Risk Assessment & Refactoring Strategy

### Key Risks
1. **API Contract Breakage**: Endpoint paths, HTTP methods, request DTO validation decorators, and JSON response shapes must remain 100% identical.
2. **TypeORM Entity Discovery**: Changing entity locations requires updating `data-source.ts` and `TypeOrmModule.forFeature(...)` so migrations and entity metadata work seamlessly.
3. **Login Lockout Race Conditions**: The progressive lockout mechanism requires careful handling of raw SQL transactions / pessimistic locking within the infrastructure layer while preserving domain invariants.

### Execution Sequence
1. **Module 1: Users** (Sample Module)
2. **Module 2: Auth** (Security & Lockout Logic)
3. **Module 3: Competitions, Seasons, Teams, Players, Matches** (ETL Read-only Modules)
4. **Shared Layer & Dependency Cleanup**
5. **Full Verification (Lint, Test, Build)**
