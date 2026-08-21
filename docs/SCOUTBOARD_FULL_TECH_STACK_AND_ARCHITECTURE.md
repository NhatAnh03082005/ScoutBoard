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
| **Data Visualization** | **Pure Vector SVG Engine** | Native SVG | Dựng biểu đồ Radar Chart 5 trục, đa giác lưới đồng tâm 5 cấp, gradients & glow filters (Zero dependency). |
| **CSS & Design System**| **Vanilla CSS** (Custom Design Tokens) | N/A | Hệ thống Design System màu sắc Dark Theme, Glassmorphism, EA FC HUD & Broadcast Micro-animations. |
| **Position Roles** | Role Categorization Engine | N/A | Chuẩn hóa 4 nhóm vai trò (GK, DEF, MID, ATT) đồng bộ màu sắc và metrics giao diện. |
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
│ • Task D8.1 (Position Integrity & Any Position Search):                │
│   - Enforce Single Primary Position DB Constraint + Transaction flow.  │
│   - Chuẩn hóa mã vị trí CDM, CAM, LWB, RWB, LM, RM, CF, ST, CB, LB, RB.│
│ • Task D9 (Position-Aware Player Hero Card & Vector SVG Radar Chart):  │
│   - 5 KPI nổi bật trên Hero Card biến đổi theo vai trò GK/DEF/MID/ATT. │
│   - Pure Vector SVG Radar Chart 5 trục với dynamic normalization 0-100.│
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
| **Players**| `UpdatePlayerPrimaryPositionUseCase`| 2 | ✅ PASS |
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

### 5.3. Hình Học Tọa Độ Lượng Giác Vẽ Biểu Đồ Radar (SVG Radar Geometry)
Dựng đa giác mạng nhện trực tiếp bằng SVG nguyên bản:
$$x = \text{center} + r \cdot \cos(\theta), \quad y = \text{center} + r \cdot \sin(\theta)$$
- **Tâm đa giác:** $\text{center} = 150\text{px}$, bán kính tối đa $R = 95\text{px}$.
- **Góc khởi đầu:** $\theta_0 = -\frac{\pi}{2}$ (đỉnh trên cùng).
- **Góc giữa 5 trục:** $\Delta \theta = \frac{2\pi}{5} = 72^\circ$.
- **Lưới đồng tâm:** 5 mức tỷ lệ $[0.2, 0.4, 0.6, 0.8, 1.0]$.

### 5.4. Công Thức Chuẩn Hóa Thang Điểm 0–100 cho Radar (Linear Min-Max Normalization)
$$\text{Score} = \text{clamp}\left( \dfrac{\text{val} - \text{min}}{\text{max} - \text{min}} \times 100, 0, 100 \right)$$
Đối với chỉ số nghịch đảo (như Goals Conceded / 90 của Thủ môn):
$$\text{Score}_{\text{inverse}} = 100 - \text{clamp}\left( \dfrac{\text{val} - \text{min}}{\text{max} - \text{min}} \times 100, 0, 100 \right)$$

#### **Bảng Thang Đo Chuẩn Hóa theo Nhóm Vị Trí (Position-Aware Bounds):**
| Nhóm vị trí | Trục chiến thuật | Metric nguồn | Thang đo $[\text{min}, \text{max}]$ |
| :--- | :--- | :--- | :--- |
| **Thủ môn (GK)** | **SHOT STOPPING**<br>**CLEAN SHEETS**<br>**DISTRIBUTION**<br>**GOAL PREVENTION**<br>**PENALTY STOPPING** | `savesPer90`<br>`cleanSheets`<br>`passAccuracy`<br>`goalsConcededPer90`<br>`penaltiesSaved` | $[0, 5.0] \text{ saves/90}$<br>$[0, 16] \text{ clean sheets}$<br>$[40\%, 90\%]$<br>$[0.6, 2.4] \text{ GA/90 (inverse)}$<br>$[0, 3] \text{ penalties saved}$ |
| **Hậu vệ (DEF)** | **TACKLING**<br>**INTERCEPTIONS**<br>**DUEL ABILITY**<br>**PASS ACCURACY**<br>**BUILD-UP** | `tacklesPer90`<br>`interceptionsPer90`<br>`duelsWonPer90`<br>`passAccuracy`<br>`passesPer90` | $[0, 3.5] \text{ tackles/90}$<br>$[0, 2.5] \text{ int/90}$<br>$[0, 7.0] \text{ duels/90}$<br>$[60\%, 95\%]$<br>$[0, 75] \text{ passes/90}$ |
| **Tiền vệ (MID)** | **PASS VOLUME**<br>**PASS ACCURACY**<br>**CREATIVITY**<br>**RECOVERY**<br>**GOAL THREAT** | `passesPer90`<br>`passAccuracy`<br>`keyPassesPer90`<br>`tacklesPer90 + interceptionsPer90`<br>`goalsPer90 + assistsPer90` | $[0, 80] \text{ passes/90}$<br>$[65\%, 95\%]$<br>$[0, 3.0] \text{ KP/90}$<br>$[0, 4.5] \text{ actions/90}$<br>$[0, 0.8] \text{ G+A/90}$ |
| **Tiền đạo (ATT)** | **SCORING**<br>**SHOOTING**<br>**ON TARGET**<br>**CHANCE CREATION**<br>**PLAYMAKING** | `goalsPer90`<br>`shotsPer90`<br>`shotsOnTargetPer90`<br>`keyPassesPer90`<br>`assistsPer90` | $[0, 1.0] \text{ goals/90}$<br>$[0, 4.5] \text{ shots/90}$<br>$[0, 2.0] \text{ SoT/90}$<br>$[0, 2.8] \text{ KP/90}$<br>$[0, 0.5] \text{ assists/90}$ |

---

## 6. KẾT QUẢ KIỂM THỬ VÀ CHẤT LƯỢNG MÃ NGUỒN

- **Backend Unit Tests**: **39/39 Test Suites PASS (133/133 Tests Passed, 100% Success)**.
- **Backend Build**: `nest build` biên dịch thành công 100%, **0 lỗi**.
- **Frontend Build**: `tsc -b && vite build` tạo bundle thành công, **0 lỗi TypeScript/Lint**.

---

## 7. LỘ TRÌNH PHÁT TRIỂN TIẾP THEO (NEXT MILESTONES)

1. **Chốt Zone 2 ➔ Chuyển sang Zone 3 (User-Generated Data)**:
   - Triển khai Migration cho `shortlists`, `shortlist_players`, `squads`, `squad_players`.
   - Xây dựng Shortlist Management (lưu trữ danh sách mục tiêu tuyển trạch theo thư mục).
   - Xây dựng Squad Builder (sa bàn chiến thuật đội hình kéo thả, tính Chemistry & OVR).
2. **Zone 4 (Audit & Sync Automation)**:
   - Cơ chế đồng bộ dữ liệu bóng đá định kỳ và lưu vết thay đổi (Audit Logs).

