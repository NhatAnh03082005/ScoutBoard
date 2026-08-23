# 🗄️ DATABASE ARCHITECTURE & ERD SPECIFICATION – SCOUTBOARD

Tài liệu hướng dẫn toàn diện về cấu hình, khởi chạy cơ sở dữ liệu PostgreSQL 17 và đặc tả chi tiết Sơ đồ Thực thể Liên kết (Entity Relationship Diagram - ERD) gồm **21 bảng** được phân chia khoa học theo **4 vùng chức năng**.

---

## 🛠 1. THÔNG TIN CẤU HÌNH & QUẢN TRỊ DATABASE

### 1.1. Cấu hình kết nối cơ bản

| Thông số | Môi trường Local / Docker | Ghi chú |
| :--- | :--- | :--- |
| **Database Engine** | **PostgreSQL 17** (Alpine) | Hệ quản trị CSDL quan hệ chính |
| **Host** | `localhost` (hoặc `postgres` khi chạy mạng nội bộ Docker) | Địa chỉ máy chủ CSDL |
| **Port** | `5432` | Cổng kết nối PostgreSQL |
| **Database Name** | `scoutboard_db` | Tên cơ sở dữ liệu |
| **Username** | `postgres` | Tài khoản quản trị CSDL |
| **Password** | `postgres123` | Mật khẩu kết nối CSDL |
| **pgAdmin Web UI** | `http://localhost:8080` | Giao diện quản lý trực quan qua web |
| **pgAdmin Credentials** | `admin@scoutboard.com` / `admin123` | Tài khoản đăng nhập pgAdmin |

### 1.2. Chuỗi kết nối (Connection String)

```text
postgresql://postgres:postgres123@localhost:5432/scoutboard_db?schema=public
```

### 1.3. Hướng dẫn khởi chạy nhanh bằng Docker Compose

Dự án đã cấu hình sẵn `docker-compose.yml` ở thư mục gốc:

```bash
# 1. Khởi động Container PostgreSQL 17 & pgAdmin 4 ở chế độ nền (Background)
docker compose up -d

# 2. Kiểm tra trạng thái các container đang chạy
docker compose ps

# 3. Theo dõi realtime log hoạt động của database
docker compose logs -f postgres

# 4. Tạm dừng container (bảo toàn toàn bộ volume dữ liệu)
docker compose stop

# 5. Dừng và gỡ bỏ container
docker compose down

# (*) Lưu ý: Nếu muốn xóa sạch toàn bộ dữ liệu CSDL để khởi tạo lại từ đầu:
docker compose down -v
```

---

## 🗺️ 2. TỔNG QUAN CẤU TRÚC ERD THEO 4 VÙNG CHỨC NĂNG

Sơ đồ ERD của **ScoutBoard** được phân chia độc lập và rõ ràng thành 4 phân vùng chính:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 SCOUTBOARD DATABASE                                    │
├──────────────────────────────────────────┬─────────────────────────────────────────────┤
│ 1. AUTHENTICATION & AUTHORIZATION        │ 2. FOOTBALL DATA (CORE ENGINE)              │
│    • users                               │    • competitions      • matches            │
│    • roles                               │    • seasons           • player_positions   │
│    • user_roles                          │    • teams             • player_team_history│
│    • refresh_tokens                      │    • season_teams      • player_match_stats │
│                                          │    • players           • player_season_stats│
├──────────────────────────────────────────┼─────────────────────────────────────────────┤
│ 3. USER-GENERATED DATA                   │ 4. SYNCHRONIZATION & AUDIT                  │
│    • shortlists                          │    • data_sync_jobs                         │
│    • shortlist_players                   │    • data_sync_logs                         │
│    • squads                              │    • audit_logs                             │
│    • squad_players                       │                                             │
└──────────────────────────────────────────┴─────────────────────────────────────────────┘
```

### 2.1. Danh sách bảng theo vùng

| Vùng | Nhóm chức năng | Danh sách 21 bảng trong hệ thống |
|:---:|---|---|
| **1** | **Authentication & Authorization** | `users`, `roles`, `user_roles`, `refresh_tokens` |
| **2** | **Football Data (Synced from APIs)** | `competitions`, `seasons`, `season_teams`, `teams`, `players`, `player_positions`, `player_team_history`, `matches`, `player_match_statistics`, `player_season_statistics` |
| **3** | **User-generated Data** | `shortlists`, `shortlist_players`, `squads`, `squad_players` |
| **4** | **Synchronization & Audit** | `data_sync_jobs`, `data_sync_logs`, `audit_logs` |

---

## 🔗 3. BẢNG TỔNG HỢP TOÀN BỘ QUAN HỆ (RELATIONSHIPS)

### 3.1. Bảng quan hệ chi tiết

| STT | Bảng cha | Bảng con | Cardinality | Khóa ngoại ở bảng con | Ý nghĩa nghiệp vụ |
|---:|---|---|---|---|---|
| 1 | `users` | `user_roles` | 1–N | `user_roles.user_id` | Một tài khoản có thể có nhiều vai trò (`HAS ROLE`). |
| 2 | `roles` | `user_roles` | 1–N | `user_roles.role_id` | Một vai trò được gán cho nhiều tài khoản (`ASSIGNED TO`). |
| 3 | `users` | `refresh_tokens` | 1–N | `refresh_tokens.user_id` | Một tài khoản có thể sở hữu nhiều token phiên đăng nhập (`OWNS`). |
| 4 | `competitions` | `seasons` | 1–N | `seasons.competition_id` | Một giải đấu có nhiều mùa giải thi đấu (`HAS SEASONS`). |
| 5 | `seasons` | `season_teams` | 1–N | `season_teams.season_id` | Một mùa giải gồm nhiều đội bóng tham gia (`INCLUDES TEAMS`). |
| 6 | `teams` | `season_teams` | 1–N | `season_teams.team_id` | Một đội bóng tham gia vào nhiều mùa giải (`PARTICIPATES IN`). |
| 7 | `teams` | `players` | 1–N | `players.current_team_id` | Một đội có danh sách cầu thủ hiện tại (`HAS CURRENT PLAYERS`); `NULL` nếu tự do. |
| 8 | `players` | `player_positions` | 1–N | `player_positions.player_id` | Một cầu thủ có thể thi đấu ở nhiều vị trí (`HAS POSITIONS`). |
| 9 | `players` | `player_team_history` | 1–N | `player_team_history.player_id` | Lịch sử các câu lạc bộ của một cầu thủ (`CAREER HISTORY`). |
| 10 | `teams` | `player_team_history` | 1–N | `player_team_history.team_id` | Đội bóng xuất hiện trong lịch sử chuyển nhượng (`TEAM HISTORY`). |
| 11 | `competitions` | `matches` | 1–N | `matches.competition_id` | Một giải đấu có nhiều trận đấu diễn ra (`CONTAINS MATCHES`). |
| 12 | `seasons` | `matches` | 1–N | `matches.season_id` | Một mùa giải có nhiều trận đấu (`CONTAINS MATCHES`). |
| 13 | `teams` | `matches` | 1–N | `matches.home_team_id` | Đội chủ nhà trong trận đấu (`HOME TEAM`). |
| 14 | `teams` | `matches` | 1–N | `matches.away_team_id` | Đội khách trong trận đấu (`AWAY TEAM`). |
| 15 | `matches` | `player_match_statistics` | 1–N | `player_match_statistics.match_id` | Thống kê của nhiều cầu thủ trong trận đấu (`HAS PLAYER STATS`). |
| 16 | `players` | `player_match_statistics` | 1–N | `player_match_statistics.player_id` | Cầu thủ tham gia và được ghi nhận thống kê theo trận (`RECORDED MATCH STATS`). |
| 17 | `teams` | `player_match_statistics` | 1–N | `player_match_statistics.team_id` | Đội bóng mà cầu thủ đại diện trong trận đấu (`MATCH TEAM`). |
| 18 | `players` | `player_season_statistics` | 1–N | `player_season_statistics.player_id` | Thống kê tổng hợp mùa giải của cầu thủ (`RECORDED SEASON STATS`). |
| 19 | `teams` | `player_season_statistics` | 1–N | `player_season_statistics.team_id` | Đội bóng ghi nhận thống kê mùa giải (`SEASON TEAM STATS`). |
| 20 | `competitions` | `player_season_statistics` | 1–N | `player_season_statistics.competition_id` | Giải đấu ghi nhận thống kê mùa giải (`IN COMPETITION`). |
| 21 | `seasons` | `player_season_statistics` | 1–N | `player_season_statistics.season_id` | Mùa giải ghi nhận thống kê (`IN SEASON`). |
| 22 | `users` | `shortlists` | 1–N | `shortlists.owner_id` | Người dùng tạo danh sách theo dõi cầu thủ (`CREATES SHORTLIST`). |
| 23 | `shortlists` | `shortlist_players` | 1–N | `shortlist_players.shortlist_id` | Shortlist chứa các cầu thủ được theo dõi (`CONTAINS PLAYERS`). |
| 24 | `players` | `shortlist_players` | 1–N | `shortlist_players.player_id` | Cầu thủ được thêm vào shortlist (`ADDED TO SHORTLIST`). |
| 25 | `users` | `squads` | 1–N | `squads.owner_id` | Người dùng tạo các đội hình chiến thuật (`CREATES SQUADS`). |
| 26 | `seasons` | `squads` | 1–N | `squads.season_id` | Đội hình áp dụng cho một mùa giải cụ thể (`APPLIES TO SEASON`); có thể `NULL`. |
| 27 | `squads` | `squad_players` | 1–N | `squad_players.squad_id` | Đội hình gồm 11 cầu thủ đá chính & dự bị (`CONTAINS PLAYERS`). |
| 28 | `players` | `squad_players` | 1–N | `squad_players.player_id` | Cầu thủ được sắp xếp vào sơ đồ chiến thuật (`PLACED IN SQUAD`). |
| 29 | `users` | `data_sync_jobs` | 1–N | `data_sync_jobs.initiated_by` | Quản trị viên kích hoạt đồng bộ (`TRIGGERS SYNC`); `NULL` nếu chạy cron. |
| 30 | `competitions` | `data_sync_jobs` | 1–N | `data_sync_jobs.competition_id` | Giải đấu được đồng bộ dữ liệu (`SYNCED FOR COMPETITION`). |
| 31 | `seasons` | `data_sync_jobs` | 1–N | `data_sync_jobs.season_id` | Mùa giải được đồng bộ dữ liệu (`SYNCED FOR SEASON`). |
| 32 | `data_sync_jobs` | `data_sync_logs` | 1–N | `data_sync_logs.job_id` | Nhật ký chi tiết của từng tiến trình đồng bộ (`GENERATES LOGS`). |
| 33 | `users` | `audit_logs` | 1–N | `audit_logs.actor_user_id` | Người dùng/Admin thực hiện hành động hệ thống (`PERFORMS ACTION`). |

### 3.2. Sơ đồ quan hệ dạng văn bản (ASCII Diagram)

```text
VÙNG 1: AUTH & ROLES
users (1) ─────── (N) user_roles (N) ─────── (1) roles
users (1) ─────── (N) refresh_tokens

VÙNG 2: FOOTBALL DATA
competitions (1) ─────── (N) seasons
seasons      (1) ─────── (N) season_teams (N) ─────── (1) teams
competitions (1) ─────── (N) matches
seasons      (1) ─────── (N) matches
teams        (1) ─────── (N) players (current_team_id)
players      (1) ─────── (N) player_positions
players      (1) ─────── (N) player_team_history (N) ─────── (1) teams
matches      (1) ─────── (N) player_match_statistics (N) ─── (1) players & teams
seasons      (1) ─────── (N) player_season_statistics (N) ── (1) players & teams & competitions

VÙNG 3: USER DATA
users      (1) ─────── (N) shortlists (1) ─────── (N) shortlist_players (N) ─────── (1) players
users      (1) ─────── (N) squads     (1) ─────── (N) squad_players     (N) ─────── (1) players
seasons    (1) ─────── (N) squads

VÙNG 4: SYNC & AUDIT
users        (1) ─────── (N) data_sync_jobs (1) ─────── (N) data_sync_logs
competitions (1) ─────── (N) data_sync_jobs
seasons      (1) ─────── (N) data_sync_jobs
users        (1) ─────── (N) audit_logs
```

---

## 📑 4. ĐẶC TẢ CHI TIẾT 21 BẢNG DỮ LIỆU

---

### VÙNG 1 – AUTHENTICATION & AUTHORIZATION

#### 1. Bảng `users`
Lưu trữ thông tin tài khoản người dùng, trạng thái kích hoạt, mã xác thực email và đặt lại mật khẩu.

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Mô tả & Nghiệp vụ |
|---|---|:---:|---|:---:|---|
| `id` | `UUID` | Không | Không | PK | Khóa chính duy nhất định danh tài khoản. |
| `email` | `VARCHAR(255)` | Không | Không | UNIQUE | Địa chỉ email dùng để đăng nhập. Viết thường, chuẩn RFC 5322. |
| `password_hash` | `VARCHAR(255)` | Không | Không |  | Mật khẩu đã băm (Bcrypt cost factor $\ge 10$ hoặc Argon2id). |
| `full_name` | `VARCHAR(150)` | Không | Không |  | Họ và tên hiển thị của người dùng. |
| `status` | `VARCHAR(30)` | Không | `'ACTIVE'` |  | Trạng thái tài khoản (`ACTIVE`, `INACTIVE`, `LOCKED`). |
| `is_email_verified` | `BOOLEAN` | Không | `FALSE` |  | Đánh dấu email đã được kích hoạt thành công qua mã OTP. |
| `email_verification_code` | `VARCHAR(20)` | Có | `NULL` |  | Mã OTP kích hoạt tài khoản. |
| `email_verification_expires_at`| `TIMESTAMPTZ` | Có | `NULL` |  | Thời gian hết hạn của mã xác thực email (thường 15 phút). |
| `password_reset_code` | `VARCHAR(20)` | Có | `NULL` |  | Mã OTP phục vụ yêu cầu quên mật khẩu. |
| `password_reset_expires_at` | `TIMESTAMPTZ` | Có | `NULL` |  | Thời gian hết hạn của mã đặt lại mật khẩu. |
| `created_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm đăng ký tài khoản. |
| `updated_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm cập nhật thông tin tài khoản gần nhất. |

---

#### 2. Bảng `roles`
Danh mục các vai trò quyền hạn trong hệ thống.

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Mô tả & Nghiệp vụ |
|---|---|:---:|---|:---:|---|
| `id` | `UUID` | Không | Không | PK | Khóa chính của vai trò. |
| `code` | `VARCHAR(50)` | Không | Không | UNIQUE | Mã vai trò viết hoa (`USER`, `ADMIN`). |
| `name` | `VARCHAR(100)` | Không | Không |  | Tên hiển thị thân thiện của vai trò. |
| `description` | `TEXT` | Có | `NULL` |  | Mô tả phạm vi quyền hạn của vai trò. |
| `created_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm tạo vai trò. |

---

#### 3. Bảng `user_roles`
Bảng trung gian liên kết giữa tài khoản `users` và vai trò `roles` (Quan hệ N–N).

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Mô tả & Nghiệp vụ |
|---|---|:---:|---|:---:|---|
| `id` | `UUID` | Không | Không | PK | Mã bản ghi phân quyền. |
| `user_id` | `UUID` | Không | Không | FK | Khóa ngoại tham chiếu đến `users.id` (`ON DELETE CASCADE`). |
| `role_id` | `UUID` | Không | Không | FK | Khóa ngoại tham chiếu đến `roles.id` (`ON DELETE CASCADE`). |
| `assigned_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm vai trò được gán cho người dùng. |
| `(user_id, role_id)` | Tổ hợp | — | — | UNIQUE | Đảm bảo một vai trò không bị gán lặp lại cho một tài khoản. |

---

#### 4. Bảng `refresh_tokens`
Quản lý các phiên đăng nhập dài hạn và cơ chế thu hồi token (Revocation).

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Mô tả & Nghiệp vụ |
|---|---|:---:|---|:---:|---|
| `id` | `UUID` | Không | Không | PK | Mã định danh của Refresh Token. |
| `user_id` | `UUID` | Không | Không | FK | Khóa ngoại tham chiếu đến `users.id` (`ON DELETE CASCADE`). |
| `token` | `VARCHAR(500)` | Không | Không | UNIQUE | Chuỗi JWT hoặc cryptographically secure random token băm SHA-256. |
| `expires_at` | `TIMESTAMPTZ` | Không | Không |  | Thời điểm token hết hạn (mặc định 7 ngày). |
| `is_revoked` | `BOOLEAN` | Không | `FALSE` |  | Đánh dấu token đã bị vô hiệu hóa khi người dùng bấm Logout. |
| `created_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm phát hành phiên đăng nhập. |

---

### VÙNG 2 – FOOTBALL DATA (CORE ENGINE)

#### 5. Bảng `competitions`
Lưu trữ thông tin các giải đấu bóng đá (Premier League, La Liga, Serie A, Champions League,...).

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Mô tả & Nghiệp vụ |
|---|---|:---:|---|:---:|---|
| `id` | `UUID` | Không | Không | PK | Khóa chính nội bộ giải đấu. |
| `name` | `VARCHAR(150)` | Không | Không |  | Tên chính thức của giải đấu (VD: `Premier League`). |
| `code` | `VARCHAR(50)` | Có | `NULL` |  | Mã ký hiệu giải đấu (VD: `PL`, `PD`, `SA`). |
| `country` | `VARCHAR(100)` | Có | `NULL` |  | Quốc gia đăng cai (VD: `England`, `Spain`). |
| `type` | `VARCHAR(50)` | Không | `'DOMESTIC_LEAGUE'`| | Phân loại giải (`DOMESTIC_LEAGUE`, `CUP`, `INTERNATIONAL`). |
| `logo_url` | `TEXT` | Có | `NULL` |  | Đường dẫn ảnh logo biểu trưng của giải đấu. |
| `external_provider` | `VARCHAR(50)` | Không | Không |  | Tên nhà cung cấp API dữ liệu (VD: `FOOTBALL_DATA_ORG`, `API_FOOTBALL`). |
| `external_id` | `VARCHAR(100)` | Không | Không |  | ID của giải đấu tại nhà cung cấp dữ liệu phục vụ Upsert. |
| `created_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm tạo bản ghi giải đấu. |
| `updated_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm đồng bộ/cập nhật gần nhất. |
| `(external_provider, external_id)` | Tổ hợp | — | — | UNIQUE | Ngăn chặn việc ghi trùng lặp một giải đấu từ một nguồn API. |

---

#### 6. Bảng `seasons`
Lưu trữ các mùa giải của từng giải đấu (VD: `2024-2025`, `2025-2026`).

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Mô tả & Nghiệp vụ |
|---|---|:---:|---|:---:|---|
| `id` | `UUID` | Không | Không | PK | Khóa chính của mùa giải. |
| `competition_id` | `UUID` | Không | Không | FK | Khóa ngoại tham chiếu đến `competitions.id`. |
| `season_code` | `VARCHAR(50)` | Không | Không |  | Chuỗi hiển thị mùa giải (VD: `2025-2026`). |
| `start_date` | `DATE` | Có | `NULL` |  | Ngày khởi tranh mùa giải. |
| `end_date` | `DATE` | Có | `NULL` |  | Ngày bế mạc mùa giải. |
| `is_current` | `BOOLEAN` | Không | `FALSE` |  | Đánh dấu mùa giải hiện tại đang diễn ra. |
| `external_provider` | `VARCHAR(50)` | Không | Không |  | Tên nhà cung cấp API dữ liệu. |
| `external_id` | `VARCHAR(100)` | Không | Không |  | ID mùa giải tại nhà cung cấp. |
| `created_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm tạo bản ghi. |
| `updated_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm cập nhật bản ghi. |
| `(competition_id, season_code)` | Tổ hợp | — | — | UNIQUE | Mỗi giải đấu chỉ có một mã mùa giải duy nhất. |
| `(external_provider, external_id)` | Tổ hợp | — | — | UNIQUE | Định danh duy nhất theo provider. |

---

#### 7. Bảng `teams`
Lưu trữ thông tin câu lạc bộ hoặc đội tuyển bóng đá.

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Mô tả & Nghiệp vụ |
|---|---|:---:|---|:---:|---|
| `id` | `UUID` | Không | Không | PK | Khóa chính của đội bóng. |
| `name` | `VARCHAR(150)` | Không | Không |  | Tên đầy đủ của đội bóng (VD: `Manchester City FC`). |
| `short_name` | `VARCHAR(80)` | Có | `NULL` |  | Tên viết gọn của đội bóng (VD: `Man City`). |
| `code` | `VARCHAR(20)` | Có | `NULL` |  | Mã viết tắt 3 ký tự (VD: `MCI`, `ARS`, `RMA`). |
| `country` | `VARCHAR(100)` | Có | `NULL` |  | Quốc gia của câu lạc bộ. |
| `founded_year` | `INTEGER` | Có | `NULL` |  | Năm thành lập câu lạc bộ. |
| `stadium_name` | `VARCHAR(150)` | Có | `NULL` |  | Tên sân vận động sân nhà. |
| `logo_url` | `TEXT` | Có | `NULL` |  | Đường dẫn logo huy hiệu đội bóng. |
| `external_provider` | `VARCHAR(50)` | Không | Không |  | Tên nhà cung cấp API dữ liệu. |
| `external_id` | `VARCHAR(100)` | Không | Không |  | ID đội bóng tại provider. |
| `created_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm tạo bản ghi. |
| `updated_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm cập nhật bản ghi. |
| `(external_provider, external_id)` | Tổ hợp | — | — | UNIQUE | Định danh duy nhất theo provider. |

---

#### 8. Bảng `season_teams`
Bảng trung gian quản lý danh sách các đội bóng tham gia vào từng mùa giải cụ thể (Quan hệ N–N).

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Mô tả & Nghiệp vụ |
|---|---|:---:|---|:---:|---|
| `season_id` | `UUID` | Không | Không | PK, FK | Khóa ngoại tham chiếu đến `seasons.id`. |
| `team_id` | `UUID` | Không | Không | PK, FK | Khóa ngoại tham chiếu đến `teams.id`. |
| `created_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm thiết lập đội bóng thuộc mùa giải. |

---

#### 9. Bảng `players`
Lưu trữ hồ sơ lý lịch, thông tin thể chất và kỹ thuật của cầu thủ.

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Mô tả & Nghiệp vụ |
|---|---|:---:|---|:---:|---|
| `id` | `UUID` | Không | Không | PK | Khóa chính duy nhất của cầu thủ. |
| `current_team_id` | `UUID` | Có | `NULL` | FK | Khóa ngoại tham chiếu đến `teams.id` (`NULL` nếu cầu thủ tự do). |
| `first_name` | `VARCHAR(100)` | Có | `NULL` |  | Tên gọi của cầu thủ. |
| `last_name` | `VARCHAR(100)` | Có | `NULL` |  | Họ của cầu thủ. |
| `name` | `VARCHAR(150)` | Không | Không |  | Tên thông dụng trong thi đấu (VD: `Erling Haaland`). |
| `normalized_name` | `VARCHAR(150)` | Không | Không |  | Tên chuẩn hóa không dấu, viết thường phục vụ tìm kiếm nhanh. |
| `date_of_birth` | `DATE` | Có | `NULL` |  | Ngày tháng năm sinh (tính tuổi tự động). |
| `nationality` | `VARCHAR(100)` | Có | `NULL` |  | Quốc tịch chính thức của cầu thủ. |
| `height_cm` | `INTEGER` | Có | `NULL` |  | Chiều cao tính theo đơn vị Centimet (cm). |
| `weight_kg` | `INTEGER` | Có | `NULL` |  | Cân nặng tính theo đơn vị Kilogram (kg). |
| `preferred_foot` | `VARCHAR(20)` | Có | `NULL` |  | Chân thuận thi đấu (`LEFT`, `RIGHT`, `BOTH`). |
| `shirt_number` | `INTEGER` | Có | `NULL` |  | Số áo thi đấu tại câu lạc bộ hiện tại. |
| `primary_position` | `VARCHAR(30)` | Có | `NULL` |  | Vị trí sở trường chính (`GK`, `CB`, `LB`, `RB`, `CM`, `CAM`, `ST`,...). |
| `image_url` | `TEXT` | Có | `NULL` |  | Đường dẫn ảnh đại diện cầu thủ. |
| `status` | `VARCHAR(30)` | Không | `'ACTIVE'` |  | Trạng thái hoạt động (`ACTIVE`, `INJURED`, `RETIRED`). |
| `external_provider` | `VARCHAR(50)` | Không | Không |  | Nhà cung cấp API dữ liệu. |
| `external_id` | `VARCHAR(100)` | Không | Không |  | ID cầu thủ tại provider. |
| `created_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm thêm cầu thủ vào hệ thống. |
| `updated_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm đồng bộ gần nhất. |
| `(external_provider, external_id)` | Tổ hợp | — | — | UNIQUE | Định danh duy nhất theo provider. |

---

#### 10. Bảng `player_positions`
Lưu trữ danh sách các vị trí thi đấu (chính và phụ) mà cầu thủ có thể đảm nhiệm.

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Mô tả & Nghiệp vụ |
|---|---|:---:|---|:---:|---|
| `id` | `UUID` | Không | Không | PK | Mã bản ghi vị trí. |
| `player_id` | `UUID` | Không | Không | FK | Khóa ngoại tham chiếu đến `players.id` (`ON DELETE CASCADE`). |
| `position_code` | `VARCHAR(50)` | Không | Không |  | Mã vị trí thi đấu tiêu chuẩn (`GK`, `CB`, `LB`, `RB`, `CM`, `CDM`, `CAM`, `LW`, `RW`, `ST`,...). |
| `is_primary` | `BOOLEAN` | Không | `FALSE` |  | Đánh dấu vị trí sở trường chính. |
| `display_order` | `INTEGER` | Có | `NULL` |  | Thứ tự ưu tiên hiển thị. |
| `(player_id, position_code)` | Tổ hợp | — | — | UNIQUE | Một cầu thủ không bị gán trùng lặp cùng một mã vị trí. |

---

#### 11. Bảng `player_team_history`
Lưu lịch sử thi đấu của cầu thủ qua từng câu lạc bộ theo thời gian.

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Mô tả & Nghiệp vụ |
|---|---|:---:|---|:---:|---|
| `id` | `UUID` | Không | Không | PK | Mã bản ghi lịch sử chuyển nhượng. |
| `player_id` | `UUID` | Không | Không | FK | Khóa ngoại tham chiếu đến `players.id` (`ON DELETE CASCADE`). |
| `team_id` | `UUID` | Không | Không | FK | Khóa ngoại tham chiếu đến `teams.id`. |
| `joined_at` | `DATE` | Có | `NULL` |  | Ngày bắt đầu gia nhập đội bóng. |
| `left_at` | `DATE` | Có | `NULL` |  | Ngày rời câu lạc bộ (`NULL` nếu đang thi đấu). |
| `shirt_number` | `INTEGER` | Có | `NULL` |  | Số áo thi đấu trong giai đoạn đó. |
| `is_current` | `BOOLEAN` | Không | `FALSE` |  | Đánh dấu câu lạc bộ hiện tại. |
| `created_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm tạo bản ghi. |

---

#### 12. Bảng `matches`
Lưu trữ thông tin các trận đấu bóng đá, kết quả tỷ số và thời gian thi đấu.

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Mô tả & Nghiệp vụ |
|---|---|:---:|---|:---:|---|
| `id` | `UUID` | Không | Không | PK | Khóa chính nội bộ trận đấu. |
| `competition_id` | `UUID` | Không | Không | FK | Khóa ngoại tham chiếu đến `competitions.id`. |
| `season_id` | `UUID` | Không | Không | FK | Khóa ngoại tham chiếu đến `seasons.id`. |
| `home_team_id` | `UUID` | Không | Không | FK | Đội chủ nhà (`teams.id`). |
| `away_team_id` | `UUID` | Không | Không | FK | Đội khách (`teams.id`). |
| `kickoff_at` | `TIMESTAMPTZ` | Có | `NULL` |  | Giờ bóng lăn theo múi giờ UTC. |
| `status` | `VARCHAR(30)` | Không | `'SCHEDULED'`| | Trạng thái trận (`SCHEDULED`, `LIVE`, `FINISHED`, `POSTPONED`, `CANCELLED`). |
| `home_score` | `INTEGER` | Có | `NULL` |  | Số bàn thắng của đội chủ nhà (`NULL` nếu chưa đá). |
| `away_score` | `INTEGER` | Có | `NULL` |  | Số bàn thắng của đội khách (`NULL` nếu chưa đá). |
| `external_provider` | `VARCHAR(50)` | Không | Không |  | Nhà cung cấp API dữ liệu. |
| `external_id` | `VARCHAR(100)` | Không | Không |  | ID trận đấu tại provider. |
| `created_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm tạo bản ghi. |
| `updated_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm cập nhật bản ghi. |
| `(external_provider, external_id)` | Tổ hợp | — | — | UNIQUE | Định danh duy nhất theo provider. |

---

#### 13. Bảng `player_match_statistics`
Lưu trữ số liệu thống kê chi tiết của từng cầu thủ trong từng trận đấu cụ thể. Hỗ trợ toàn diện cả **Cầu thủ vòng ngoài (Outfield)** lẫn **Thủ môn (Goalkeeper)**.

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Mô tả & Nghiệp vụ |
|---|---|:---:|---|:---:|---|
| `id` | `UUID` | Không | Không | PK | Mã bản ghi thống kê trận đấu. |
| `match_id` | `UUID` | Không | Không | FK | Khóa ngoại tham chiếu đến `matches.id` (`ON DELETE CASCADE`). |
| `player_id` | `UUID` | Không | Không | FK | Khóa ngoại tham chiếu đến `players.id` (`ON DELETE CASCADE`). |
| `team_id` | `UUID` | Không | Không | FK | Đội bóng mà cầu thủ đại diện trong trận (`teams.id`). |
| `minutes_played` | `INTEGER` | Không | `0` |  | Số phút thi đấu thực tế trên sân. |
| `goals` | `INTEGER` | Không | `0` |  | Số bàn thắng ghi được trong trận. |
| `assists` | `INTEGER` | Không | `0` |  | Số đường kiến tạo trong trận. |
| `shots` | `INTEGER` | Không | `0` |  | Tổng số cú sút thực hiện. |
| `passes_attempted` | `INTEGER` | Không | `0` |  | Tổng số đường chuyền thực hiện. |
| `passes_completed` | `INTEGER` | Không | `0` |  | Số đường chuyền chính xác ($\le \text{passes\_attempted}$). |
| `tackles` | `INTEGER` | Không | `0` |  | Số pha tắc bóng / xoạc bóng thành công. |
| `yellow_cards` | `INTEGER` | Không | `0` |  | Số thẻ vàng phải nhận trong trận. |
| `red_cards` | `INTEGER` | Không | `0` |  | Số thẻ đỏ phải nhận trong trận. |
| **`saves`** | `INTEGER` | Có | `NULL` |  | **[GK]** Số pha cứu thua trong trận (Chỉ áp dụng cho GK; `NULL` với Outfield). |
| **`goals_conceded`**| `INTEGER` | Có | `NULL` |  | **[GK]** Số bàn thua phải nhận trong trận (Chỉ áp dụng cho GK; `NULL` với Outfield). |
| **`clean_sheets`** | `INTEGER` | Có | `NULL` |  | **[GK]** Giữ sạch lưới trong trận (`1`: Có, `0`: Không; `NULL` với Outfield). |
| **`penalties_saved`**| `INTEGER`| Có | `NULL` |  | **[GK]** Số quả penalty cản phá thành công trong trận. |
| `statistics` | `JSONB` | Có | `NULL` |  | Dữ liệu JSON mở rộng phụ thuộc provider. |
| `created_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm tạo bản ghi. |
| `updated_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm cập nhật bản ghi. |
| `(match_id, player_id)` | Tổ hợp | — | — | UNIQUE | Mỗi cầu thủ chỉ có duy nhất một bản ghi thống kê trong một trận. |

---

#### 14. Bảng `player_season_statistics`
Lưu trữ số liệu thống kê tổng hợp của cầu thủ theo đội bóng, giải đấu và mùa giải. Đây là bảng dữ liệu trọng tâm phục vụ tính năng **Player Search, Player Detail, Performance Radar Chart và Player Comparison Matrix**.

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Mô tả & Nghiệp vụ |
|---|---|:---:|---|:---:|---|
| `id` | `UUID` | Không | Không | PK | Mã bản ghi thống kê mùa giải. |
| `player_id` | `UUID` | Không | Không | FK | Khóa ngoại tham chiếu đến `players.id` (`ON DELETE CASCADE`). |
| `team_id` | `UUID` | Không | Không | FK | Khóa ngoại tham chiếu đến `teams.id`. |
| `competition_id` | `UUID` | Không | Không | FK | Khóa ngoại tham chiếu đến `competitions.id`. |
| `season_id` | `UUID` | Không | Không | FK | Khóa ngoại tham chiếu đến `seasons.id`. |
| `appearances` | `INTEGER` | Không | `0` |  | Tổng số trận ra sân thi đấu. |
| `starts` | `INTEGER` | Không | `0` |  | Số trận có tên trong đội hình xuất phát ($\le \text{appearances}$). |
| `minutes_played` | `INTEGER` | Không | `0` |  | Tổng số phút thi đấu trên sân (Dùng làm mẫu số tính Per-90). |
| `goals` | `INTEGER` | Không | `0` |  | Tổng số bàn thắng ghi được. |
| `assists` | `INTEGER` | Không | `0` |  | Tổng số pha kiến tạo thành bàn. |
| `shots` | `INTEGER` | Không | `0` |  | Tổng số cú sút thực hiện. |
| `shots_on_target` | `INTEGER` | Không | `0` |  | Số cú sút trúng đích ($\le \text{shots}$). |
| `passes_attempted` | `INTEGER` | Không | `0` |  | Tổng số đường chuyền thực hiện. |
| `passes_completed` | `INTEGER` | Không | `0` |  | Số đường chuyền thành công ($\le \text{passes\_attempted}$). |
| `key_passes` | `INTEGER` | Không | `0` |  | Số đường chuyền tạo cơ hội dứt điểm (Key passes). |
| `tackles` | `INTEGER` | Không | `0` |  | Tổng số pha tắc bóng thành công. |
| `interceptions` | `INTEGER` | Không | `0` |  | Tổng số lần đánh chặn / cắt đường chuyền. |
| `duels_won` | `INTEGER` | Không | `0` |  | Số pha tranh chấp tay đôi chiến thắng. |
| `goals_per_90` | `DECIMAL(5,2)` | Có | `NULL` |  | Bàn thắng trung bình mỗi 90 phút thi đấu ($\frac{\text{goals} \times 90}{\text{minutes\_played}}$). |
| `assists_per_90` | `DECIMAL(5,2)` | Có | `NULL` |  | Kiến tạo trung bình mỗi 90 phút thi đấu. |
| `shots_per_90` | `DECIMAL(5,2)` | Có | `NULL` |  | Số cú sút mỗi 90 phút thi đấu. |
| `shots_on_target_per_90`| `DECIMAL(5,2)`| Có | `NULL` |  | Sút trúng đích mỗi 90 phút thi đấu. |
| `passes_per_90` | `DECIMAL(5,2)` | Có | `NULL` |  | Đường chuyền mỗi 90 phút thi đấu. |
| `key_passes_per_90` | `DECIMAL(5,2)` | Có | `NULL` |  | Key passes mỗi 90 phút thi đấu. |
| `tackles_per_90` | `DECIMAL(5,2)` | Có | `NULL` |  | Tắc bóng mỗi 90 phút thi đấu. |
| `interceptions_per_90`| `DECIMAL(5,2)` | Có | `NULL` |  | Đánh chặn mỗi 90 phút thi đấu. |
| `duels_won_per_90` | `DECIMAL(5,2)` | Có | `NULL` |  | Tranh chấp thắng mỗi 90 phút thi đấu. |
| **`saves`** | `INTEGER` | Có | `NULL` |  | **[GK]** Tổng số pha cứu thua trong mùa (Chỉ áp dụng cho GK; `NULL` với Outfield). |
| **`goals_conceded`**| `INTEGER` | Có | `NULL` |  | **[GK]** Tổng số bàn thua phải nhận (Chỉ áp dụng cho GK; `NULL` với Outfield). |
| **`clean_sheets`** | `INTEGER` | Có | `NULL` |  | **[GK]** Tổng số trận giữ sạch lưới trong mùa ($\le \text{appearances}$). |
| **`penalties_saved`**| `INTEGER`| Có | `NULL` |  | **[GK]** Số quả penalty cản phá thành công ($\le \text{penalties\_faced}$). |
| **`penalties_faced`**| `INTEGER`| Có | `NULL` |  | **[GK]** Tổng số quả penalty phải đối mặt trong mùa. |
| **`saves_per_90`** | `DECIMAL(5,2)` | Có | `NULL` |  | **[GK]** Cứu thua mỗi 90 phút thi đấu ($\frac{\text{saves} \times 90}{\text{minutes\_played}}$). |
| **`goals_conceded_per_90`**| `DECIMAL(5,2)`| Có | `NULL`| | **[GK]** Bàn thua mỗi 90 phút thi đấu ($\frac{\text{goals\_conceded} \times 90}{\text{minutes\_played}}$). |
| **`save_percentage`**| `DECIMAL(5,2)`| Có | `NULL` |  | **[GK]** Tỷ lệ cứu thua thành công $\left(\frac{\text{saves}}{\text{saves} + \text{goals\_conceded}} \times 100\right)\%$. |
| `advanced_statistics`| `JSONB` | Có | `NULL` |  | Các chỉ số nâng cao mở rộng phụ thuộc provider (xG, xA, PSxG). |
| `created_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm tạo bản ghi thống kê. |
| `updated_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm cập nhật bản ghi. |
| `(player_id, team_id, competition_id, season_id)` | Tổ hợp | — | — | UNIQUE | Đảm bảo tính duy nhất của thống kê theo cầu thủ, đội, giải và mùa. |

> **Ghi chú tính toán động:**
> * `pass_accuracy (%)`: Được tính động $\left(\frac{\text{passes\_completed}}{\text{passes\_attempted}} \times 100\right)\%$ (trả về `NULL` nếu $\text{passes\_attempted} = 0$).
> * `cleanSheetPercentage (%)`: Được tính động $\left(\frac{\text{clean\_sheets}}{\text{appearances}} \times 100\right)\%$ (trả về `NULL` nếu $\text{appearances} = 0$).
> * Khi `minutes_played = 0`, tất cả các chỉ số Per-90 đều trả về `NULL` (hiển thị ký tự `—` trên frontend), hoàn toàn loại trừ lỗi chia cho số 0 (`NaN` / `Infinity`).

---

### VÙNG 3 – USER-GENERATED DATA – SHORTLIST & SQUAD BUILDER

#### 15. Bảng `shortlists`
Lưu trữ danh sách theo dõi cầu thủ cá nhân của từng người dùng.

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Mô tả & Nghiệp vụ |
|---|---|:---:|---|:---:|---|
| `id` | `UUID` | Không | Không | PK | Khóa chính của shortlist. |
| `owner_id` | `UUID` | Không | Không | FK | Khóa ngoại tham chiếu đến `users.id` (`ON DELETE CASCADE`). |
| `name` | `VARCHAR(150)` | Không | Không |  | Tên shortlist (VD: `U23 Midfield Targets 2026`). |
| `description` | `TEXT` | Có | `NULL` |  | Mô tả mục đích tuyển trạch của danh sách. |
| `visibility` | `VARCHAR(30)` | Không | `'PRIVATE'` |  | Phạm vi hiển thị (`PRIVATE`, `PUBLIC`). |
| `created_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm tạo shortlist. |
| `updated_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm cập nhật danh sách gần nhất. |

---

#### 16. Bảng `shortlist_players`
Bảng trung gian liên kết giữa `shortlists` và `players`, kèm ghi chú tuyển trạch viên (Quan hệ N–N).

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Mô tả & Nghiệp vụ |
|---|---|:---:|---|:---:|---|
| `id` | `UUID` | Không | Không | PK | Mã bản ghi liên kết. |
| `shortlist_id` | `UUID` | Không | Không | FK | Khóa ngoại tham chiếu đến `shortlists.id` (`ON DELETE CASCADE`). |
| `player_id` | `UUID` | Không | Không | FK | Khóa ngoại tham chiếu đến `players.id` (`ON DELETE CASCADE`). |
| `note` | `TEXT` | Có | `NULL` |  | Ghi chú tuyển trạch riêng của người dùng về cầu thủ. |
| `added_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm thêm cầu thủ vào danh sách. |
| `(shortlist_id, player_id)` | Tổ hợp | — | — | UNIQUE | Một cầu thủ chỉ xuất hiện 1 lần trong cùng 1 shortlist. |

---

#### 17. Bảng `squads`
Lưu trữ các đội hình chiến thuật (Squad Builder) do người dùng xây dựng.

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Mô tả & Nghiệp vụ |
|---|---|:---:|---|:---:|---|
| `id` | `UUID` | Không | Không | PK | Khóa chính của đội hình. |
| `owner_id` | `UUID` | Không | Không | FK | Khóa ngoại tham chiếu đến `users.id` (`ON DELETE CASCADE`). |
| `season_id` | `UUID` | Có | `NULL` | FK | Mùa giải áp dụng (`seasons.id`); `NULL` nếu đội hình tự do. |
| `name` | `VARCHAR(150)` | Không | Không |  | Tên đội hình (VD: `Dream Team EPL 2026`). |
| `formation_code` | `VARCHAR(30)` | Không | Không |  | Mã sơ đồ chiến thuật (`4-3-3`, `4-2-3-1`, `4-4-2`, `3-5-2`, `3-4-3`). |
| `description` | `TEXT` | Có | `NULL` |  | Mô tả chiến thuật hoặc phân tích lối chơi. |
| `visibility` | `VARCHAR(30)` | Không | `'PRIVATE'` |  | Phạm vi hiển thị (`PRIVATE`, `PUBLIC`). |
| `created_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm tạo đội hình. |
| `updated_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm cập nhật đội hình gần nhất. |

---

#### 18. Bảng `squad_players`
Lưu vị trí cụ thể của từng cầu thủ trong đội hình chiến thuật, vai trò đá chính / dự bị và đội trưởng.

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Mô tả & Nghiệp vụ |
|---|---|:---:|---|:---:|---|
| `id` | `UUID` | Không | Không | PK | Khóa chính bản ghi. |
| `squad_id` | `UUID` | Không | Không | FK | Khóa ngoại tham chiếu đến `squads.id` (`ON DELETE CASCADE`). |
| `player_id` | `UUID` | Không | Không | FK | Khóa ngoại tham chiếu đến `players.id` (`ON DELETE CASCADE`). |
| `slot_code` | `VARCHAR(30)` | Có | `NULL` |  | Mã vị trí trên sa bàn (`GK`, `CB-1`, `CB-2`, `LB`, `RB`, `CM-1`, `ST`,...; `NULL` nếu dự bị). |
| `role` | `VARCHAR(30)` | Không | Không |  | Vai trò cầu thủ (`STARTER`: Đá chính, `SUBSTITUTE`: Dự bị). |
| `is_captain` | `BOOLEAN` | Không | `FALSE` |  | Đánh dấu cầu thủ mang băng đội trưởng (Chỉ áp dụng cho `STARTER`). |
| `display_order` | `INTEGER` | Có | `NULL` |  | Thứ tự sắp xếp trong danh sách dự bị. |
| `added_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm cầu thủ được xếp vào đội hình. |
| `(squad_id, player_id)` | Tổ hợp | — | — | UNIQUE | Một cầu thủ chỉ xuất hiện 1 lần trong 1 đội hình. |
| `(squad_id, slot_code) WHERE role='STARTER'` | Tổ hợp | — | — | PARTIAL UNIQUE | Một vị trí đá chính trên sa bàn chỉ có đúng 1 cầu thủ. |
| `squad_id WHERE is_captain=TRUE` | Đơn | — | — | PARTIAL UNIQUE | Mỗi đội hình chỉ có duy nhất 1 đội trưởng. |

---

### VÙNG 4 – SYNCHRONIZATION & AUDIT

#### 19. Bảng `data_sync_jobs`
Quản lý các tiến trình đồng bộ dữ liệu từ nhà cung cấp bên ngoài (External APIs).

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Mô tả & Nghiệp vụ |
|---|---|:---:|---|:---:|---|
| `id` | `UUID` | Không | Không | PK | Khóa chính của job đồng bộ. |
| `initiated_by` | `UUID` | Có | `NULL` | FK | Quản trị viên kích hoạt (`users.id`); `NULL` nếu chạy tự động theo lịch. |
| `competition_id` | `UUID` | Không | Không | FK | Giải đấu cần đồng bộ (`competitions.id`). |
| `season_id` | `UUID` | Không | Không | FK | Mùa giải cần đồng bộ (`seasons.id`). |
| `provider` | `VARCHAR(50)` | Không | Không |  | Tên nhà cung cấp (`FOOTBALL_DATA_ORG`, `API_FOOTBALL`, `SPORTRADAR`). |
| `status` | `VARCHAR(30)` | Không | `'PENDING'` |  | Trạng thái tiến trình (`PENDING`, `RUNNING`, `SUCCESS`, `FAILED`, `PARTIAL_SUCCESS`). |
| `trigger_type` | `VARCHAR(30)` | Không | Không |  | Nguồn kích hoạt (`MANUAL`, `SCHEDULED`). |
| `processed_count` | `INTEGER` | Không | `0` |  | Tổng số bản ghi đã duyệt qua trong tiến trình. |
| `created_count` | `INTEGER` | Không | `0` |  | Số bản ghi mới được tạo thêm vào CSDL. |
| `updated_count` | `INTEGER` | Không | `0` |  | Số bản ghi cũ được cập nhật dữ liệu mới. |
| `failed_count` | `INTEGER` | Không | `0` |  | Số bản ghi gặp lỗi trong quá trình đồng bộ. |
| `started_at` | `TIMESTAMPTZ` | Có | `NULL` |  | Thời điểm bắt đầu chạy job. |
| `completed_at` | `TIMESTAMPTZ` | Có | `NULL` |  | Thời điểm hoàn thành job. |
| `error_message` | `TEXT` | Có | `NULL` |  | Thông điệp lỗi tổng quát nếu job thất bại. |

---

#### 20. Bảng `data_sync_logs`
Ghi nhận chi tiết từng bước xử lý và các bản ghi lỗi trong một synchronization job.

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Mô tả & Nghiệp vụ |
|---|---|:---:|---|:---:|---|
| `id` | `UUID` | Không | Không | PK | Mã định danh của dòng log. |
| `job_id` | `UUID` | Không | Không | FK | Khóa ngoại tham chiếu đến `data_sync_jobs.id` (`ON DELETE CASCADE`). |
| `level` | `VARCHAR(20)` | Không | Không |  | Mức độ nghiêm trọng (`INFO`, `WARN`, `ERROR`). |
| `entity_type` | `VARCHAR(50)` | Có | `NULL` |  | Loại thực thể đang xử lý (`PLAYER`, `TEAM`, `MATCH`, `STATISTICS`). |
| `external_id` | `VARCHAR(100)` | Có | `NULL` |  | ID nguồn tại nhà cung cấp của bản ghi đang xử lý. |
| `message` | `TEXT` | Không | Không |  | Nội dung mô tả sự kiện hoặc lỗi. |
| `details` | `JSONB` | Có | `NULL` |  | Dữ liệu payload chi tiết hoặc stack trace lỗi dạng JSON. |
| `created_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm ghi log. |

---

#### 21. Bảng `audit_logs`
Ghi vết lịch sử bảo mật (Audit Trail) cho toàn bộ các hành động trọng yếu của hệ thống.

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Mô tả & Nghiệp vụ |
|---|---|:---:|---|:---:|---|
| `id` | `UUID` | Không | Không | PK | Mã bản ghi audit. |
| `actor_user_id` | `UUID` | Có | `NULL` | FK | Tài khoản thực hiện hành động (`users.id`, `NULL` nếu là hệ thống/khách). |
| `action` | `VARCHAR(100)` | Không | Không |  | Tên hành động (`USER_LOGIN`, `USER_LOCKED`, `SQUAD_DELETED`, `SYNC_STARTED`). |
| `resource_type` | `VARCHAR(80)` | Không | Không |  | Loại tài nguyên bị tác động (`USER`, `SQUAD`, `SHORTLIST`, `SYNC_JOB`). |
| `resource_id` | `UUID` | Có | `NULL` |  | ID của tài nguyên bị tác động. |
| `result` | `VARCHAR(30)` | Không | Không |  | Kết quả thực thi (`SUCCESS`, `FAILED`, `DENIED`). |
| `correlation_id`| `UUID` | Có | `NULL` |  | Request ID / Trace ID dùng để trace request xuyên suốt hệ thống. |
| `ip_address` | `VARCHAR(64)` | Có | `NULL` |  | Địa chỉ IP client (Hỗ trợ IPv4 & IPv6). |
| `user_agent` | `TEXT` | Có | `NULL` |  | Thông tin trình duyệt / thiết bị của client. |
| `metadata` | `JSONB` | Có | `NULL` |  | Dữ liệu ngữ cảnh bổ sung (đã lọc bỏ password và secret). |
| `created_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm phát sinh hành động. |

---

## 🔒 5. CÁC RÀNG BUỘC TOÀN VẸN (DATABASE CONSTRAINTS)

```sql
-- 1. Chống trùng lặp dữ liệu đồng bộ từ API bên ngoài
CREATE UNIQUE INDEX uq_competitions_external_identity ON competitions (external_provider, external_id);
CREATE UNIQUE INDEX uq_seasons_external_identity ON seasons (external_provider, external_id);
CREATE UNIQUE INDEX uq_teams_external_identity ON teams (external_provider, external_id);
CREATE UNIQUE INDEX uq_players_external_identity ON players (external_provider, external_id);
CREATE UNIQUE INDEX uq_matches_external_identity ON matches (external_provider, external_id);

-- 2. Đảm bảo tính duy nhất của mã mùa giải trong một giải đấu
ALTER TABLE seasons ADD CONSTRAINT uq_competition_season_code UNIQUE (competition_id, season_code);

-- 3. Khóa chính phức hợp bảng liên kết mùa giải - đội bóng
ALTER TABLE season_teams ADD CONSTRAINT pk_season_teams PRIMARY KEY (season_id, team_id);

-- 4. Chống trùng lặp cầu thủ trong một danh sách shortlist
ALTER TABLE shortlist_players ADD CONSTRAINT uq_shortlist_player UNIQUE (shortlist_id, player_id);

-- 5. Chống trùng lặp cầu thủ trong một đội hình
ALTER TABLE squad_players ADD CONSTRAINT uq_squad_player UNIQUE (squad_id, player_id);

-- 6. Một vị trí đá chính trên sa bàn chỉ có đúng 1 cầu thủ (Partial Unique Index)
CREATE UNIQUE INDEX uq_squad_starter_slot ON squad_players (squad_id, slot_code) WHERE role = 'STARTER';

-- 7. Mỗi đội hình chỉ có duy nhất 1 đội trưởng (Partial Unique Index)
CREATE UNIQUE INDEX uq_squad_captain ON squad_players (squad_id) WHERE is_captain = TRUE;

-- 8. Thống kê mùa giải không bị trùng lặp theo phạm vi thi đấu
ALTER TABLE player_season_statistics ADD CONSTRAINT uq_player_season_stat UNIQUE (player_id, team_id, competition_id, season_id);

-- 9. Thống kê trận đấu không bị trùng lặp theo cầu thủ trong trận
ALTER TABLE player_match_statistics ADD CONSTRAINT uq_player_match_stat UNIQUE (match_id, player_id);
```

---

## ⚡ 6. INDEX TỐI ƯU HIỆU NĂNG TRUY VẤN (PERFORMANCE INDEXES)

```sql
-- Index tìm kiếm cầu thủ theo tên hỗ trợ Fuzzy Search (pg_trgm)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_players_name_trgm ON players USING GIN (normalized_name gin_trgm_ops);

-- Index lọc danh sách cầu thủ theo câu lạc bộ, vị trí chính và trạng thái
CREATE INDEX idx_players_team_position_status ON players (current_team_id, primary_position, status);

-- Index lọc và phân trang thống kê mùa giải của cầu thủ
CREATE INDEX idx_player_stats_comp_season_minutes ON player_season_statistics (competition_id, season_id, minutes_played);
CREATE INDEX idx_player_stats_player_id ON player_season_statistics (player_id);

-- Index thống kê theo trận đấu
CREATE INDEX idx_player_match_stats_player_id ON player_match_statistics (player_id);
CREATE INDEX idx_player_match_stats_match_id ON player_match_statistics (match_id);

-- Index phiên đăng nhập Refresh Token
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);

-- Index danh sách shortlist và đội hình người dùng theo thời gian cập nhật
CREATE INDEX idx_shortlists_owner ON shortlists (owner_id, updated_at DESC);
CREATE INDEX idx_squads_owner ON squads (owner_id, updated_at DESC);

-- Index theo dõi tiến trình đồng bộ và audit log
CREATE INDEX idx_sync_jobs_status_created ON data_sync_jobs (status, started_at DESC);
CREATE INDEX idx_audit_logs_created ON audit_logs (created_at DESC);
```

---

## 📦 7. THỨ TỰ MIGRATION TỔNG QUÁT (V1 → V23)

```text
V1  ── create table: users
V2  ── create table: roles
V3  ── create table: user_roles
V4  ── create table: refresh_tokens
V5  ── create table: competitions
V6  ── create table: seasons
V7  ── create table: teams
V8  ── create table: season_teams
V9  ── create table: players
V10 ── create table: player_positions
V11 ── create table: player_team_history
V12 ── create table: matches
V13 ── create table: player_match_statistics (kèm cột GK)
V14 ── create table: player_season_statistics (kèm cột GK)
V15 ── create table: shortlists
V16 ── create table: shortlist_players
V17 ── create table: squads
V18 ── create table: squad_players
V19 ── create table: data_sync_jobs
V20 ── create table: data_sync_logs
V21 ── create table: audit_logs
V22 ── create performance indexes & constraints
V23 ── seed initial data (roles: USER, ADMIN)
```

---

## 🌱 8. DỮ LIỆU SEED MẶC ĐỊNH

```sql
-- Khởi tạo các vai trò chuẩn của hệ thống
INSERT INTO roles (id, code, name, description, created_at)
VALUES
    (gen_random_uuid(), 'USER', 'Người dùng', 'Người dùng thông thường, tìm kiếm và tạo shortlist/squad', NOW()),
    (gen_random_uuid(), 'ADMIN', 'Quản trị viên', 'Quản trị hệ thống, quản lý người dùng và chạy job đồng bộ', NOW())
ON CONFLICT (code) DO NOTHING;
```
