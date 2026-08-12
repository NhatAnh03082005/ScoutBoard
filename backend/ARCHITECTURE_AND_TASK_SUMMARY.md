# 📘 ScoutBoard Backend - Báo cáo Kiến trúc Layered & Tổng hợp Tiến độ Dự án

---

## 1. Mục đích của Tài liệu (Document Purpose)

Tài liệu này được tạo ra nhằm mục đích:
1. **Hệ thống hóa toàn bộ công việc đã triển khai**: Tổng hợp tất cả các module, migration, seed data, use case và API endpoint đã được hoàn thành trong dự án backend ScoutBoard.
2. **Giải thích Kiến trúc Hệ thống (Clean Architecture & CQRS Pattern)**: Mô tả rõ ràng vai trò, nhiệm vụ và luồng dữ liệu của từng **Layer (Tầng kiến trúc)** trong codebase.
3. **Quy chuẩn phát triển (Development Standards)**: Quy định vị trí và trách nhiệm của từng loại File (`Controller`, `UseCase`, `Port`, `Repository`, `Entity`, `DTO`), giúp đội ngũ lập trình viên dễ dàng mở rộng và bảo trì dự án mà không vi phạm nguyên lý thiết kế.

---

## 2. Tổng quan các Tầng Kiến trúc (Layered Architecture Breakdown)

Hệ thống Backend ScoutBoard được xây dựng theo mô hình **Modular Monolith** kết hợp **Clean Architecture** và **CQRS (Command Query Responsibility Segregation)**.

Dưới đây là sơ đồ luồng dữ liệu khi một HTTP Request đi qua 4 tầng kiến trúc:

```text
               Client (Frontend / Mobile / Postman)
                                │
                                ▼
┌───────────────────────────────────────────────────────────────┐
│ 1. PRESENTATION LAYER (Controllers & DTOs)                    │
│    • Tiếp nhận HTTP Endpoint & HTTP Verbs                     │
│    • Validate dữ liệu đầu vào (class-validator)               │
│    • Ủy quyền 100% việc xử lý cho Use Case                    │
│    • KHÔNG chứa bất kỳ logic nghiệp vụ hoặc SQL nào           │
└───────────────────────────────┬───────────────────────────────┘
                                │ (Truyền Query/Command DTO)
                                ▼
┌───────────────────────────────────────────────────────────────┐
│ 2. APPLICATION LAYER (Use Cases & Application Ports)          │
│    • Nơi chứa 100% logic nghiệp vụ ứng dụng (Business Logic)  │
│    • Phân giải nghiệp vụ (VD: competitionId -> currentSeason) │
│    • Kiểm tra quy tắc (minAge <= maxAge, minHeight...)        │
│    • Chuyển đổi dữ liệu từ Entity thô sang Response DTO       │
│    • Phụ thuộc vào Repository Port Interface (Inversion)      │
└───────────────────────────────┬───────────────────────────────┘
                                │ (Gọi Repository Interface)
                                ▼
┌───────────────────────────────────────────────────────────────┐
│ 3. DOMAIN LAYER (Entities, Enums & Value Objects)             │
│    • Chứa các hằng số & khái niệm nghiệp vụ cốt lõi           │
│    • Ví dụ: PreferredFoot (LEFT, RIGHT, BOTH)                 │
│    • Độc lập hoàn toàn với NestJS hay TypeORM                 │
└───────────────────────────────┬───────────────────────────────┘
                                │ (Thực thi triển khai)
                                ▼
┌───────────────────────────────────────────────────────────────┐
│ 4. INFRASTRUCTURE LAYER (ORM Entities & Repositories)         │
│    • Kết nối trực tiếp với PostgreSQL qua TypeORM             │
│    • Viết các câu lệnh QueryBuilder (JOIN, WHERE, DISTINCT)   │
│    • Ánh xạ bảng DB sang Class TypeScript (PlayerOrmEntity)   │
└───────────────────────────────┬───────────────────────────────┘
                                │ (SQL Query)
                                ▼
                       PostgreSQL Database
```

---

### 🔍 Chi tiết Vai trò & Công dụng của từng Tầng

#### 🟢 Tầng 1: Presentation Layer (Tầng Giao tiếp HTTP)
- **Các loại File**: `*.controller.ts`, `*.query.dto.ts`, `*.response.dto.ts`.
- **Nhiệm vụ & Công dụng**:
  - Đóng vai trò là cửa ngõ giao tiếp giữa bên ngoài (Frontend / Mobile App) với ứng dụng.
  - Định nghĩa đường dẫn API (Route), HTTP Method (`GET`, `POST`, `PATCH`, `DELETE`) và tài liệu Swagger API Specs (`@ApiOperation`, `@ApiResponse`).
  - Kiểm tra cú pháp dữ liệu (Validate) ngay tại cửa ngõ bằng `class-validator` và `class-transformer` (`@IsUUID()`, `@IsEnum()`, `@Min()`, `@Max()`).
- **Quy tắc tuyệt đối**: Controller **không được phép chứa bất kỳ logic nghiệp vụ nào** (không viết `if (!item) throw NotFoundException`, không kiểm tra dải tuổi, không gọi trực tiếp ORM Repository). Controller chỉ nhận DTO và gọi phương thức `.execute()` của Use Case tương ứng.

---

#### 🔵 Tầng 2: Application Layer (Tầng Ứng dụng & Luồng Nghiệp vụ)
- **Các loại File**: `*.use-case.ts`, `*.repository.ts` (Application Ports).
- **Nhiệm vụ & Công dụng**:
  - Là "trái tim điều phối" của ứng dụng. Mỗi file Use Case đảm nhận duy nhất **một chức năng nghiệp vụ** (Single Responsibility Principle).
  - Chứa 100% logic kiểm tra và phân giải nghiệp vụ (Ví dụ: `SearchPlayersUseCase`, `GetCurrentSeasonTeamsByCompetitionUseCase`).
  - Tuân thủ nguyên lý **Dependency Inversion Principle**: Tầng Application chỉ gọi Interface Port (`PlayerReadRepository`), không phụ thuộc trực tiếp vào TypeORM hay SQL.
  - Làm sạch và biến đổi dữ liệu (Mapping) từ Entity ORM thô sang Response DTO phẳng, gọn nhẹ trước khi gửi lại cho Controller.

---

#### 🟡 Tầng 3: Domain Layer (Tầng Khái niệm Nghiệp vụ Cốt lõi)
- **Các loại File**: `*.enum.ts`, domain entities, domain errors.
- **Nhiệm vụ & Công dụng**:
  - Lưu giữ các định nghĩa và quy tắc nghiệp vụ bóng đá bất biến (Ví dụ: Enum `PreferredFoot` với các giá trị `LEFT`, `RIGHT`, `BOTH`).
  - Độc lập tuyệt đối với các thư viện bên ngoài (không phụ thuộc NestJS, TypeORM hay Express).

---

#### 🔴 Tầng 4: Infrastructure Layer (Tầng Hạ tầng & Cơ sở dữ liệu)
- **Các loại File**: `typeorm-*.repository.ts`, `*.orm-entity.ts`, `migrations/*.ts`, `seeds/*.ts`.
- **Nhiệm vụ & Công dụng**:
  - Chịu trách nhiệm giao tiếp vật lý với cơ sở dữ liệu PostgreSQL.
  - Viết các câu lệnh SQL / TypeORM QueryBuilder phức tạp (`LEFT JOIN`, `INNER JOIN`, `DISTINCT`, `EXTRACT(YEAR FROM age(CURRENT_DATE, date_of_birth))`).
  - Ánh xạ các bảng cơ sở dữ liệu sang đối tượng TypeScript (`PlayerOrmEntity`, `TeamOrmEntity`, `SeasonTeamOrmEntity`...).

---

## 3. Tổng hợp các Công việc đã Hoàn thành (Work Accomplished)

### 🔹 Module Database & Seed Data
1. **Migration `season_teams`**: Tạo migration `1785700000000-CreateSeasonTeamsTable.ts` phục vụ liên kết Đội bóng và Mùa giải.
2. **Seed Data bóng đá chuẩn quốc tế**: Đảm bảo tính **Idempotency** (chạy lại nhiều lần không bị lặp data):
   - **14** Mùa giải (`seasons`).
   - **44** Đội bóng gắn với mùa giải hiện tại (`season_teams`).
   - **408** Cầu thủ (`players`) chứa đầy đủ thông tin tên, ngày sinh, chiều cao, quốc tịch, chân thuận và vị trí thi đấu.
   - **769** Bản ghi chỉ số thống kê (`player_season_statistics`).

---

### 🔹 Danh sách các API Endpoint & Use Cases đã Triển khai

Toàn bộ các Controller trong hệ thống đã được refactor để **ủy quyền 100% cho Use Cases**:

| Module | Endpoint | Method | Use Case tương ứng | Mô tả chức năng |
|---|---|:---:|---|---|
| **Players** | `/api/players` | `GET` | `SearchPlayersUseCase` | Tìm kiếm & lọc đa điều kiện (tên, chân thuận, quốc tịch, CLB, vị trí chính/phụ, giải đấu mùa hiện tại, độ tuổi, chiều cao, phân trang). |
| **Players** | `/api/players/:id` | `GET` | `GetPlayerByIdUseCase` | Lấy thông tin chi tiết của 1 Cầu thủ theo UUID. |
| **Competitions** | `/api/competitions` | `GET` | `ListCompetitionsUseCase` | Lấy danh sách tất cả các Giải đấu. |
| **Competitions** | `/api/competitions/:id` | `GET` | `GetCompetitionByIdUseCase` | Lấy chi tiết Giải đấu theo UUID. |
| **Competitions** | `/api/competitions/:id/seasons` | `GET` | `GetSeasonsByCompetitionUseCase` | Lấy danh sách Mùa giải thuộc một Giải đấu. |
| **Competitions** | `/api/competitions/:id/teams` | `GET` | `GetCurrentSeasonTeamsByCompetitionUseCase` | Lấy danh sách Các đội bóng thuộc mùa giải hiện tại (`is_current = true`) của Giải đấu. |
| **Seasons** | `/api/seasons` | `GET` | `ListSeasonsUseCase` | Lấy danh sách Mùa giải (hỗ trợ query `competitionId`). |
| **Seasons** | `/api/seasons/:id` | `GET` | `GetSeasonByIdUseCase` | Lấy chi tiết 1 Mùa giải theo UUID. |
| **Teams** | `/api/teams` | `GET` | `ListTeamsUseCase` | Lấy danh sách Đội bóng. |
| **Teams** | `/api/teams/:id` | `GET` | `GetTeamByIdUseCase` | Lấy chi tiết 1 Đội bóng theo UUID. |
| **Matches** | `/api/matches` | `GET` | `ListMatchesUseCase` | Lấy danh sách Trận đấu theo giải & mùa giải. |
| **Matches** | `/api/matches/:id` | `GET` | `GetMatchByIdUseCase` | Lấy chi tiết 1 Trận đấu theo UUID. |
| **Users** | `/api/users` | `POST` | `CreateUserUseCase` | Tạo mới người dùng. |
| **Users** | `/api/users` | `GET` | `ListUsersAdminUseCase` | Danh sách người dùng dành cho Admin. |
| **Users** | `/api/users/:id` | `GET` | `GetUserByIdUseCase` | Chi tiết người dùng. |
| **Users** | `/api/users/:id/status` | `PATCH` | `UpdateUserStatusUseCase` | Cập nhật trạng thái người dùng. |
| **Users** | `/api/users/:id/roles` | `PATCH` | `UpdateUserRolesUseCase` | Cập nhật vai trò người dùng. |
| **Users** | `/api/users/:id/unlock` | `POST` | `UnlockUserUseCase` | Mở khóa tài khoản người dùng. |
| **Auth** | `/api/auth/register` | `POST` | `RegisterUseCase` | Đăng ký tài khoản. |
| **Auth** | `/api/auth/logout` | `POST` | `LogoutUseCase` | Đăng xuất. |
| **Auth** | `/api/auth/refresh` | `POST` | `RefreshTokensUseCase` | Làm mới Token authentication. |

---

## 4. Kết quả Kiểm thử & Chất lượng Mã nguồn

- **Unit Tests (`npm run test`)**: `PASS` **31/31 Test Suites passed**, **90/90 tests passed** (Bao gồm unit test độc lập cho từng Use Case và từng Controller).
- **TypeScript Build (`npm run build`)**: `PASS` (Exit code `0`).
- **ESLint Code Style (`npm run lint`)**: `PASS` (Exit code `0`, 0 errors, 0 warnings).
