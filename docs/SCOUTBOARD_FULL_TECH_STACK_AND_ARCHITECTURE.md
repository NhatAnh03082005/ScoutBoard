# TỔNG QUAN TOÀN BỘ KIẾN TRÚC & CÔNG NGHỆ DỰ ÁN SCOUTBOARD
> **ScoutBoard Platform**: Hệ thống tìm kiếm, phân tích và so sánh dữ liệu cầu thủ bóng đá chuyên nghiệp.  
> **Cập nhật ngày:** 19/08/2026

---

## 1. TỔNG QUAN KIẾN TRÚC & CÔNG NGHỆ (TECH STACK)

### 1.1. Backend Architecture & Technologies
| Thành phần | Công nghệ / Thư viện | Phiên bản | Vai trò & Mục đích |
|---|---|---|---|
| **Core Framework** | [NestJS](https://nestjs.com/) | `^11.0.1` | Framework Node.js dạng module hóa, hỗ trợ Dependency Injection (DI) và Clean Architecture. |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | `^5.7.3` | Ngôn ngữ tĩnh kiểu mạnh, đảm bảo Type Safety toàn diện. |
| **Database ORM** | [TypeORM](https://typeorm.io/) | `^0.3.20` | Quản lý schema, migrations, data-source và mapping thực thể (Entity). |
| **Database Driver** | [pg (node-postgres)](https://node-postgres.com/) | `^8.13.1` | Giao tiếp trực tiếp với cơ sở dữ liệu PostgreSQL. |
| **Authentication** | [Passport.js](http://www.passportjs.org/) + `@nestjs/jwt` | `^0.7.0` / `^11.0.0` | Quản lý chiến lược JWT (Access Token 15m + Refresh Token 7d). |
| **Password Hashing** | [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | `^2.4.3` | Mã hóa mật khẩu bảo mật chuẩn công nghiệp. |
| **Mailing & OTP Service**| [Nodemailer](https://nodemailer.com/) | `^6.9.16` | Gửi email OTP xác thực tài khoản và khôi phục mật khẩu (hỗ trợ SMTP & dev console box fallback). |
| **Data Validation** | `class-validator` & `class-transformer` | `^0.14.1` / `^0.5.1` | Tự động validate và chuyển đổi kiểu dữ liệu cho DTO (Data Transfer Object). |
| **API Documentation**| `@nestjs/swagger` | `^11.0.0` | Tự động sinh tài liệu Swagger/OpenAPI UI tương tác tại `/api/docs`. |
| **Testing** | [Jest](https://jestjs.io/) + `ts-jest` | `^30.0.0` / `^29.2.5` | Chạy Unit Tests và E2E Tests (**38 Test Suites, 128 Unit Tests**). |

---

### 1.2. Frontend Architecture & Technologies
| Thành phần | Công nghệ / Thư viện | Phiên bản | Vai trò & Mục đích |
|---|---|---|---|
| **Core UI Library** | [React](https://react.dev/) | `^19.2.7` | Thư viện xây dựng giao diện người dùng tương tác dạng component. |
| **Build Tool & Dev** | [Vite](https://vitejs.dev/) | `^8.1.1` | Build tool thế hệ mới siêu nhanh, tối ưu hóa bundle qua Rollup/esbuild. |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | `~6.0.2` | Type Safety cho toàn bộ React Components, API Services và Models. |
| **CSS & Design System**| **Vanilla CSS** (Custom Design Tokens) | N/A | Hệ thống Design System màu sắc Dark Theme, Glassmorphism, 50/50 Split-Screen Fixed Layout (không giật khung). |
| **Linter** | [oxlint](https://oxc.rs/) | `^1.71.0` | Linter hiệu năng cao kiểm tra cú pháp và chất lượng mã nguồn. |

---

### 1.3. Cơ sở dữ liệu (PostgreSQL Relational Database)
- **Hệ quản trị CSDL**: PostgreSQL 16+
- **Kiểu dữ liệu cốt lõi**:
  - `UUID v4`: Khóa chính (PK) cho toàn bộ các bảng trong hệ thống.
  - `TIMESTAMPTZ`: Lưu trữ thời gian có múi giờ (UTC).
  - `JSONB`: Lưu trữ chỉ số mở rộng của nhà cung cấp (`statistics`, `advanced_statistics`).
  - `INTEGER`, `BOOLEAN`, `VARCHAR`, `DATE`: Cột dữ liệu chuẩn hóa.
- **Ràng buộc toàn vẹn**: Khóa ngoại `FOREIGN KEY` (với `ON DELETE CASCADE` ở bảng phụ thuộc), `UNIQUE` phức hợp, `CHECK` constraints cho dữ liệu số liệu không âm.

---

## 2. CẤU TRÚC PHÂN TẦNG (CLEAN ARCHITECTURE / HEXAGONAL)

Dự án áp dụng mô hình **Ports & Adapters (Clean Architecture)** tại Backend:

```text
ScoutBoard Backend Layer Structure
┌─────────────────────────────────────────────────────────────┐
│  Presentation Layer (HTTP Controllers & DTOs)               │
│  - players.controller.ts, auth.controller.ts, etc.          │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Calls)
┌──────────────────────────────▼──────────────────────────────┐
│  Application Layer (Use Cases & Ports)                      │
│  - verify-email.use-case.ts, resend-verification-otp.ts     │
│  - forgot-password.use-case.ts, reset-password.use-case.ts  │
│  - search-players.use-case.ts, get-player-by-id.use-case.ts │
│  - get-player-season-statistics.use-case.ts                 │
│  - get-player-match-statistics.use-case.ts                  │
│  - get-comparison-candidates.use-case.ts                    │
│  - Port Interfaces: user.repository.ts, token-service.port  │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Implements Port)
┌──────────────────────────────▼──────────────────────────────┐
│  Infrastructure Layer (Persistence & Adapters)              │
│  - EmailService (Nodemailer SMTP + dev logger)              │
│  - TypeOrmUserRepository, TypeOrmRefreshTokenRepository     │
│  - TypeOrmPlayerReadRepository (SQL QueryBuilder)           │
│  - Entities: UserOrmEntity, PlayerOrmEntity                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│  Domain Layer (Entities & Enums)                            │
│  - User, Role, RefreshToken, ComparisonScope                │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. CHI TIẾT CÁC MODULE VÀ TÍNH NĂNG ĐÃ HOÀN THÀNH

```
┌────────────────────────────────────────────────────────────────────────┐
│ VÙNG 1: Authentication & Authorization (Hoàn thành 100%)               │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Đăng ký & Xác thực Email bằng mã OTP 6 số (Nodemailer, 15 phút).   │
│ 2. Đặt lại Mật khẩu (Forgot / Reset Password OTP flow an toàn).        │
│ 3. Đăng nhập (Email + Password hash BCrypt) & Khung cố định 50/50.     │
│ 4. Dual JWT Tokens: Access Token (15 phút) & Refresh Token (7 ngày).  │
│ 5. Token Family Rotation & Chống Reuse Token.                          │
│ 6. Progressive Account Lockout: Khóa tài khoản tạm thời lũy tiến       │
│    (1p -> 5p -> 15p -> 30p -> 1h) sau mỗi 5 lần đăng nhập sai.        │
│ 7. Phân quyền RBAC: Quản lý vai trò (USER, ADMIN) & Mở khóa thủ công. │
└────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌────────────────────────────────────────────────────────────────────────┐
│ VÙNG 2: Football Data & Player Analytics (Hoàn thành 90%)              │
├────────────────────────────────────────────────────────────────────────┤
│ • Task D1 (Player Search & Profile): Tìm kiếm cầu thủ theo tên, lọc   │
│   vị trí, chân thuận, quốc tịch, độ tuổi, chiều cao, CLB, giải đấu.   │
│ • Task D2 (Career Team History): Lịch sử thi đấu qua các đội bóng.     │
│ • Task D3 (Season Statistics): Thống kê theo mùa giải & giải đấu.      │
│ • Task D4 (Selectors & Per 90 Metrics): Chuẩn hóa chỉ số theo 90 phút. │
│ • Task D5 + D6 + D6.1 + D7 (Match Log): Danh sách trận đấu phân trang, │
│   tỷ số, đối thủ, sân nhà/khách, số phút, thẻ phạt và kết quả trận.    │
│ • Task D7.1 (Passing Data Model Upgrade): Chuẩn hóa `passes_attempted` │
│   và `passes_completed`, tính động `passAccuracy` chính xác 100%.     │
│ • Task D8 (Player Comparison & Candidate Search):                      │
│   - Chọn phạm vi: Specific Competition vs All Competitions (Aggregate)│
│   - Lọc ứng viên tự động loại trừ cầu thủ gốc (No Self Comparison).    │
│   - Bảng đối đầu chi tiết: Biometrics, Thời gian, Tấn công,            │
│     Chuyền bóng kiến tạo, Phòng ngự tranh chấp với Highlight Bar.      │
└────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌────────────────────────────────────────────────────────────────────────┐
│ VÙNG 3: User-generated Data (Shortlists & Squads) (Chưa bắt đầu - 0%)  │
│ VÙNG 4: Synchronization & Audit Logs (Chưa bắt đầu - 0%)               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. MA TRẬN TEST CASES (TEST MATRIX)

Hệ thống sở hữu bộ kiểm thử tự động toàn diện với **38 Test Suites** và **128 Unit Tests** (100% Pass):

| Module | Use Case / Controller / Entity | Số Test Cases | Trạng Thái |
|---|---|---|---|
| **Auth** | `VerifyEmailUseCase` | 5 | ✅ PASS |
| **Auth** | `ForgotPasswordUseCase` | 2 | ✅ PASS |
| **Auth** | `ResetPasswordUseCase` | 4 | ✅ PASS |
| **Auth** | `RegisterUseCase` | 2 | ✅ PASS |
| **Auth** | `LoginUseCase` | 6 | ✅ PASS |
| **Auth** | `RefreshTokensUseCase` | 4 | ✅ PASS |
| **Auth** | `LogoutUseCase` | 2 | ✅ PASS |
| **Auth** | `AuthController` & `RolesGuard` | 5 | ✅ PASS |
| **Users** | `CreateUserUseCase` | 3 | ✅ PASS |
| **Users** | `UpdateUserStatusUseCase` | 4 | ✅ PASS |
| **Users** | `UnlockUserUseCase` | 3 | ✅ PASS |
| **Users** | `UpdateUserRolesUseCase` | 3 | ✅ PASS |
| **Players**| `SearchPlayersUseCase` | 7 | ✅ PASS |
| **Players**| `GetPlayerByIdUseCase` | 3 | ✅ PASS |
| **Players**| `GetPlayerSeasonStatisticsUseCase`| 5 | ✅ PASS |
| **Players**| `GetPlayerMatchStatisticsUseCase` | 5 | ✅ PASS |
| **Players**| `GetComparisonCandidatesUseCase`  | 6 | ✅ PASS |
| **Players**| `GetPlayerTeamHistoryUseCase`     | 3 | ✅ PASS |
| **Teams**  | `GetTeamByIdUseCase` & `ListTeams` | 6 | ✅ PASS |
| **Seasons**| `GetSeasonByIdUseCase` & `List`   | 6 | ✅ PASS |
| **Competitions** | `ListCompetitions` & `Seasons` | 8 | ✅ PASS |
| **Matches**| `GetMatchByIdUseCase` & `List`    | 6 | ✅ PASS |

---

## 5. CÁC CÔNG THỨC NGHIỆP VỤ & DATA CONTRACT CHUẨN XÁC

### 5.1. Công thức tính Tỷ lệ Chuyền Chính Xác (Pass Accuracy)
Không lưu cứng phần trăm vào database mà tính động từ raw metrics để tránh sai số khi tổng hợp nhiều giải đấu:
$$\text{Pass Accuracy (\%)} = \begin{cases} \left( \dfrac{\sum \text{passes\_completed}}{\sum \text{passes\_attempted}} \right) \times 100 & \text{khi } \text{passes\_attempted} > 0 \\ \text{null} & \text{khi } \text{passes\_attempted} = 0 \end{cases}$$

### 5.2. Công thức Chuẩn Hóa Chỉ Số Theo 90 Phút (Per-90 Normalization)
$$\text{Metric Per 90} = \begin{cases} \dfrac{\text{Raw Metric Value} \times 90}{\text{Minutes Played}} & \text{khi } \text{Minutes Played} > 0 \\ \text{null} & \text{khi } \text{Minutes Played} = 0 \end{cases}$$
> **Nguyên tắc vàng:** Khi tổng hợp nhiều giải đấu (`ALL COMPETITIONS`), hệ thống **tổng hợp (SUM) toàn bộ số liệu thô và số phút thi đấu** rồi mới chia theo mẫu số tổng phút, **tuyệt đối không lấy trung bình cộng của các chỉ số per-90 riêng lẻ**.

---

## 6. KẾT QUẢ KIỂM THỬ VÀ CHẤT LƯỢNG MÃ NGUỒN

- **Backend Unit Tests**: **38/38 Test Suites PASS (128/128 Tests Passed, 100% Success)**.
- **Backend Build**: `nest build` biên dịch thành công 100%, **0 lỗi**.
- **Frontend Build**: `tsc -b && vite build` tạo bundle thành công, **0 lỗi TypeScript/Lint**.

---

## 7. LỘ TRÌNH PHÁT TRIỂN TIẾP THEO (NEXT MILESTONES)

1. **Task D8.1**: *Comparison Quality & UI Polish* (tối ưu hóa giao diện đối đầu, responsive, biểu đồ thanh trực quan).
2. **Task D9**: *Radar Chart Comparison* (biểu đồ mạng nhện đa giác so sánh 5 trục: Shooting, Passing, Dribbling, Defending, Physical).
3. **Chốt Zone 2 ➔ Chuyển sang Zone 3**:
   - Triển khai Migration cho `shortlists`, `shortlist_players`, `squads`, `squad_players`.
   - Xây dựng Shortlist Management (lưu trữ danh sách mục tiêu tuyển trạch).
   - Xây dựng Squad Builder (sa bàn chiến thuật đội hình kéo thả).

