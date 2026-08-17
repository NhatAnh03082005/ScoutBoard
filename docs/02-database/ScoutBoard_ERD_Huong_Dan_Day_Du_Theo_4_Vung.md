# HƯỚNG DẪN CHI TIẾT ERD – SCOUTBOARD

## 1. Mục đích tài liệu

Tài liệu này mô tả đầy đủ ERD của project **ScoutBoard** theo đúng thứ tự bốn vùng trong sơ đồ:

1. **Authentication & Authorization**
2. **Football Data**
3. **User-generated Data**
4. **Synchronization & Audit**

Mỗi bảng đều có:

- Bảng dùng để làm gì.
- Nguồn dữ liệu.
- Khóa chính và các quan hệ.
- Toàn bộ thuộc tính hiện có trong ERD.
- Kiểu dữ liệu PostgreSQL.
- Khả năng nhận `NULL`.
- Giá trị mặc định.
- Khóa và ràng buộc.
- Ý nghĩa nghiệp vụ.
- Quy tắc validation và ghi chú triển khai.

ERD hiện tại gồm **21 bảng**. Tài liệu không lược bỏ bảng hoặc thuộc tính nào trong sơ đồ.

---

# 2. TỔNG QUAN TOÀN BỘ RELATION GIỮA CÁC BẢNG

## 2.1. Danh sách bảng theo vùng

| Vùng | Nhóm dữ liệu | Danh sách bảng |
|---:|---|---|
| 1 | Authentication & Authorization | `users`, `roles`, `user_roles`, `refresh_tokens` |
| 2 | Football Data | `competitions`, `seasons`, `season_teams`, `teams`, `players`, `player_positions`, `player_team_history`, `matches`, `player_match_statistics`, `player_season_statistics` |
| 3 | User-generated Data | `shortlists`, `shortlist_players`, `squads`, `squad_players` |
| 4 | Synchronization & Audit | `data_sync_jobs`, `data_sync_logs`, `audit_logs` |

## 2.2. Bảng tổng hợp toàn bộ quan hệ

| STT | Bảng cha | Bảng con | Cardinality | Khóa ngoại ở bảng con | Ý nghĩa |
|---:|---|---|---|---|---|
| 1 | `users` | `user_roles` | 1–N | `user_roles.user_id` | Một tài khoản có thể có nhiều bản ghi gán vai trò (`HAS ROLE`). |
| 2 | `roles` | `user_roles` | 1–N | `user_roles.role_id` | Một vai trò có thể được gán cho nhiều tài khoản (`ASSIGNED TO`). |
| 3 | `users` | `refresh_tokens` | 1–N | `refresh_tokens.user_id` | Một tài khoản có thể có nhiều phiên đăng nhập (`OWNS`). |
| 4 | `competitions` | `seasons` | 1–N | `seasons.competition_id` | Một giải đấu có nhiều mùa giải (`HAS SEASONS`). |
| 5 | `seasons` | `season_teams` | 1–N | `season_teams.season_id` | Một mùa giải gồm nhiều đội bóng tham gia (`INCLUDES TEAMS`). |
| 6 | `teams` | `season_teams` | 1–N | `season_teams.team_id` | Một đội bóng tham gia vào nhiều mùa giải (`PARTICIPATES IN`). |
| 7 | `teams` | `players` | 1–N | `players.current_team_id` | Một đội có nhiều cầu thủ hiện tại (`HAS CURRENT PLAYER`); khóa ngoại có thể `NULL`. |
| 8 | `players` | `player_positions` | 1–N | `player_positions.player_id` | Một cầu thủ có thể thi đấu ở nhiều vị trí (`HAS POSITIONS`). |
| 9 | `players` | `player_team_history` | 1–N | `player_team_history.player_id` | Một cầu thủ có nhiều giai đoạn thuộc các đội khác nhau (`CAREER HISTORY`). |
| 10 | `teams` | `player_team_history` | 1–N | `player_team_history.team_id` | Một đội xuất hiện trong lịch sử của nhiều cầu thủ (`TEAM HISTORY`). |
| 11 | `competitions` | `matches` | 1–N | `matches.competition_id` | Một giải đấu có nhiều trận (`CONTAINS MATCHES`). |
| 12 | `seasons` | `matches` | 1–N | `matches.season_id` | Một mùa giải có nhiều trận (`CONTAINS MATCHES`). |
| 13 | `teams` | `matches` | 1–N | `matches.home_team_id` | Một đội có thể là đội nhà trong nhiều trận (`HOME TEAM`). |
| 14 | `teams` | `matches` | 1–N | `matches.away_team_id` | Một đội có thể là đội khách trong nhiều trận (`AWAY TEAM`). |
| 15 | `matches` | `player_match_statistics` | 1–N | `player_match_statistics.match_id` | Một trận có thống kê của nhiều cầu thủ (`HAS PLAYER STATS`). |
| 16 | `players` | `player_match_statistics` | 1–N | `player_match_statistics.player_id` | Một cầu thủ có thống kê ở nhiều trận (`RECORDED MATCH STATS`). |
| 17 | `teams` | `player_match_statistics` | 1–N | `player_match_statistics.team_id` | Một đội có nhiều thống kê cầu thủ theo trận (`MATCH STATS`). |
| 18 | `players` | `player_season_statistics` | 1–N | `player_season_statistics.player_id` | Một cầu thủ có thống kê ở nhiều mùa hoặc nhiều đội (`RECORDED SEASON STATS`). |
| 19 | `teams` | `player_season_statistics` | 1–N | `player_season_statistics.team_id` | Một đội có thống kê mùa của nhiều cầu thủ (`SEASON STATS`). |
| 20 | `competitions` | `player_season_statistics` | 1–N | `player_season_statistics.competition_id` | Một giải có nhiều bản ghi thống kê cầu thủ (`IN COMPETITION`). |
| 21 | `seasons` | `player_season_statistics` | 1–N | `player_season_statistics.season_id` | Một mùa có nhiều bản ghi thống kê cầu thủ (`IN SEASON`). |
| 22 | `users` | `shortlists` | 1–N | `shortlists.owner_id` | Một USER có nhiều shortlist (`CREATES`). |
| 23 | `shortlists` | `shortlist_players` | 1–N | `shortlist_players.shortlist_id` | Một shortlist chứa nhiều cầu thủ (`CONTAINS PLAYERS`). |
| 24 | `players` | `shortlist_players` | 1–N | `shortlist_players.player_id` | Một cầu thủ có thể nằm trong nhiều shortlist (`ADDED TO SHORTLIST`). |
| 25 | `users` | `squads` | 1–N | `squads.owner_id` | Một USER có thể tạo nhiều đội hình (`CREATES`). |
| 26 | `seasons` | `squads` | 1–N | `squads.season_id` | Một mùa có thể được nhiều đội hình tham chiếu (`APPLIES TO SEASON`); khóa ngoại có thể `NULL`. |
| 27 | `squads` | `squad_players` | 1–N | `squad_players.squad_id` | Một đội hình có nhiều cầu thủ (`CONTAINS PLAYERS`). |
| 28 | `players` | `squad_players` | 1–N | `squad_players.player_id` | Một cầu thủ có thể xuất hiện trong nhiều đội hình khác nhau (`PLACED IN SQUAD`). |
| 29 | `users` | `data_sync_jobs` | 1–N | `data_sync_jobs.initiated_by` | Một ADMIN có thể tạo nhiều job (`TRIGGERS`); khóa ngoại có thể `NULL` với scheduler. |
| 30 | `competitions` | `data_sync_jobs` | 1–N | `data_sync_jobs.competition_id` | Một giải đấu có thể được đồng bộ nhiều lần (`SYNCED BY`). |
| 31 | `seasons` | `data_sync_jobs` | 1–N | `data_sync_jobs.season_id` | Một mùa giải có thể được đồng bộ nhiều lần (`SYNCED BY`). |
| 32 | `data_sync_jobs` | `data_sync_logs` | 1–N | `data_sync_logs.job_id` | Một job có nhiều log chi tiết (`GENERATES LOGS`). |
| 33 | `users` | `audit_logs` | 1–N | `audit_logs.actor_user_id` | Một user có thể tạo nhiều audit log (`PERFORMS`); actor có thể `NULL`. |

## 2.3. Các quan hệ nhiều–nhiều

| Quan hệ nghiệp vụ | Bảng trung gian | Giải thích |
|---|---|---|
| `users` N–N `roles` | `user_roles` | Một user có thể có nhiều role và một role có thể được gán cho nhiều user. |
| `seasons` N–N `teams` | `season_teams` | Một mùa giải gồm nhiều đội bóng và một đội bóng có thể tham gia nhiều mùa giải. |
| `shortlists` N–N `players` | `shortlist_players` | Một shortlist có nhiều cầu thủ và một cầu thủ có thể nằm trong nhiều shortlist. |
| `squads` N–N `players` | `squad_players` | Một đội hình có nhiều cầu thủ và một cầu thủ có thể nằm trong nhiều đội hình. |

## 2.4. Sơ đồ quan hệ dạng văn bản

```text
VÙNG 1
users 1 ───── N user_roles N ───── 1 roles
users 1 ───── N refresh_tokens

VÙNG 2
competitions 1 ───── N seasons
seasons      1 ───── N season_teams N ───── 1 teams
competitions 1 ───── N matches
seasons      1 ───── N matches
teams        1 ───── N players
players      1 ───── N player_positions
players      1 ───── N player_team_history N ───── 1 teams
matches      1 ───── N player_match_statistics
players      1 ───── N player_match_statistics
teams        1 ───── N player_match_statistics
players      1 ───── N player_season_statistics
teams        1 ───── N player_season_statistics
competitions 1 ───── N player_season_statistics
seasons      1 ───── N player_season_statistics

VÙNG 3
users      1 ───── N shortlists
shortlists 1 ───── N shortlist_players N ───── 1 players
users      1 ───── N squads
seasons    1 ───── N squads
squads     1 ───── N squad_players N ───── 1 players

VÙNG 4
users          1 ───── N data_sync_jobs
competitions   1 ───── N data_sync_jobs
seasons        1 ───── N data_sync_jobs
data_sync_jobs 1 ───── N data_sync_logs
users          1 ───── N audit_logs
```

## 2.5. Quy ước

| Ký hiệu | Ý nghĩa |
|---|---|
| `PK` | Primary Key – khóa chính |
| `FK` | Foreign Key – khóa ngoại |
| `UNIQUE` | Giá trị hoặc tổ hợp giá trị không được trùng |
| `PARTIAL UNIQUE` | Unique index chỉ áp dụng khi thỏa điều kiện |
| `NULL` | Thuộc tính có thể chưa có giá trị |
| `UUID` | Mã định danh 128-bit |
| `TIMESTAMPTZ` | Ngày giờ có múi giờ |
| `JSONB` | Dữ liệu JSON dạng nhị phân trong PostgreSQL |

> **GUEST không có bảng riêng** vì đây là người dùng chưa đăng nhập. Khi đăng ký thành công, hệ thống tạo một bản ghi trong `users` và gán role `USER`.

---

# 3. ĐẶC TẢ CHI TIẾT THEO THỨ TỰ VÙNG 1 → 4


# VÙNG 1 – AUTHENTICATION & AUTHORIZATION

Vùng 1 quản lý tài khoản, vai trò, quan hệ phân quyền và phiên đăng nhập.


## 1. Bảng `users`

### 3.1.1. Bảng này là gì?

Lưu tài khoản đăng nhập của USER và ADMIN. GUEST không có bản ghi trong bảng này vì GUEST là người chưa đăng nhập.

- **Nguồn dữ liệu:** Dữ liệu do người dùng đăng ký hoặc ADMIN cập nhật trạng thái tài khoản.
- **Khóa chính:** `id`
- **Quan hệ:**
  - `users` 1–N `refresh_tokens`
  - `users` N–N `roles` thông qua `user_roles`
  - `users` 1–N `shortlists`
  - `users` 1–N `squads`
  - `users` 1–N `data_sync_jobs` thông qua `initiated_by`
  - `users` 1–N `audit_logs` thông qua `actor_user_id`

### 3.1.2. Đặc tả thuộc tính

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Đặc tả | Quy tắc/Validation |
|---|---|---:|---|---|---|---|
| `id` | `UUID` | Không | Không có | PK | Mã định danh duy nhất của tài khoản. Nên sinh bằng UUID v4 hoặc UUID v7 tại backend/database. | Không được thay đổi sau khi tạo. |
| `email` | `VARCHAR(255)` | Không | Không có | UNIQUE | Email dùng để đăng nhập và nhận diện tài khoản. | Chuẩn hóa về chữ thường; kiểm tra đúng định dạng; không được trùng. |
| `password_hash` | `VARCHAR(255)` | Không | Không có |  | Mật khẩu đã được băm bằng BCrypt hoặc Argon2. Không lưu mật khẩu dạng rõ. | Không trả về API; không ghi log; chỉ lưu chuỗi hash. |
| `full_name` | `VARCHAR(150)` | Không | Không có |  | Họ tên hiển thị của người dùng. | Nên loại bỏ khoảng trắng thừa; giới hạn độ dài. |
| `status` | `VARCHAR(30)` | Không | `ACTIVE` |  | Trạng thái hoạt động của tài khoản. | Giá trị đề xuất: `ACTIVE`, `DISABLED`, `LOCKED`. |
| `created_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm tạo tài khoản, có kèm múi giờ. | Chỉ ghi một lần khi tạo. |
| `updated_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm cập nhật tài khoản gần nhất. | Cập nhật sau mỗi lần thay đổi thông tin hoặc trạng thái. |

### 3.1.3. Lưu ý triển khai

- Mọi thao tác cập nhật phải kiểm tra quyền sở hữu hoặc quyền ADMIN ở backend; không tin dữ liệu role/owner gửi từ frontend.

---


## 2. Bảng `roles`

### 3.2.1. Bảng này là gì?

Lưu danh mục vai trò dùng cho phân quyền dựa trên role.

- **Nguồn dữ liệu:** Dữ liệu hệ thống được seed qua migration.
- **Khóa chính:** `id`
- **Quan hệ:**
  - `roles` N–N `users` thông qua `user_roles`

### 3.2.2. Đặc tả thuộc tính

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Đặc tả | Quy tắc/Validation |
|---|---|---:|---|---|---|---|
| `id` | `UUID` | Không | Không có | PK | Mã định danh của vai trò. | Ổn định, không nên thay đổi. |
| `code` | `VARCHAR(30)` | Không | Không có | UNIQUE | Mã vai trò được Spring Security sử dụng. | Trong MVP chỉ dùng `USER`, `ADMIN`. |
| `name` | `VARCHAR(100)` | Không | Không có |  | Tên mô tả dễ đọc của vai trò. | Ví dụ: `Người dùng`, `Quản trị viên`. |
| `created_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm vai trò được tạo. | Thường được tạo từ migration. |

### 3.2.3. Lưu ý triển khai

- Tạo index cho các khóa ngoại thường xuyên được dùng trong JOIN hoặc filter.

---


## 3. Bảng `user_roles`

### 3.3.1. Bảng này là gì?

Bảng liên kết nhiều–nhiều giữa tài khoản và vai trò. Một tài khoản có thể có một hoặc nhiều role.

- **Nguồn dữ liệu:** Được tạo khi đăng ký tài khoản hoặc khi ADMIN phân quyền.
- **Khóa chính:** Khóa chính ghép (`user_id`, `role_id`)
- **Quan hệ:**
  - `user_roles.user_id` → `users.id`
  - `user_roles.role_id` → `roles.id`

### 3.3.2. Đặc tả thuộc tính

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Đặc tả | Quy tắc/Validation |
|---|---|---:|---|---|---|---|
| `user_id` | `UUID` | Không | Không có | PK, FK | Tài khoản được gán vai trò. | Phải tồn tại trong `users`; nên xóa cascade khi user bị xóa vật lý. |
| `role_id` | `UUID` | Không | Không có | PK, FK | Vai trò được gán cho tài khoản. | Phải tồn tại trong `roles`. |
| `assigned_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm vai trò được gán. | Dùng để audit việc phân quyền. |

### 3.3.3. Lưu ý triển khai

- Tạo index cho các khóa ngoại thường xuyên được dùng trong JOIN hoặc filter.

---


## 4. Bảng `refresh_tokens`

### 3.4.1. Bảng này là gì?

Lưu refresh token theo từng phiên đăng nhập để cấp access token mới, hỗ trợ logout, rotation và chống reuse token.

- **Nguồn dữ liệu:** Backend tạo sau khi người dùng đăng nhập hoặc refresh phiên.
- **Khóa chính:** `id`
- **Quan hệ:**
  - `refresh_tokens.user_id` → `users.id`

### 3.4.2. Đặc tả thuộc tính

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Đặc tả | Quy tắc/Validation |
|---|---|---:|---|---|---|---|
| `id` | `UUID` | Không | Không có | PK | Mã bản ghi refresh token. | Sinh mới cho mỗi token hoặc mỗi lần rotation. |
| `user_id` | `UUID` | Không | Không có | FK | Chủ sở hữu refresh token. | Phải tồn tại trong `users`. |
| `token_hash` | `VARCHAR(255)` | Không | Không có | UNIQUE | Giá trị refresh token đã băm. | Không lưu token rõ; không trả lại từ DB; không ghi log. |
| `token_family_id` | `UUID` | Có | Không có |  | Nhóm token cùng một chuỗi rotation. | Dùng phát hiện reuse và thu hồi toàn bộ token family. |
| `expires_at` | `TIMESTAMPTZ` | Không | Không có |  | Thời điểm token hết hạn. | Phải lớn hơn `created_at`. |
| `last_used_at` | `TIMESTAMPTZ` | Có | `NULL` |  | Lần cuối token được sử dụng để refresh. | Cập nhật khi token được dùng thành công. |
| `revoked_at` | `TIMESTAMPTZ` | Có | `NULL` |  | Thời điểm token bị thu hồi. | `NULL` nghĩa là chưa bị revoke. |
| `created_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm tạo refresh token. | Không thay đổi sau khi tạo. |

### 3.4.3. Lưu ý triển khai

- Nên tạo index theo `user_id`, `expires_at` và `token_family_id` để kiểm tra phiên nhanh.
- Logout nên cập nhật `revoked_at` hoặc xóa bản ghi token tùy chiến lược.

---


# VÙNG 2 – FOOTBALL DATA – DỮ LIỆU ĐỒNG BỘ TỪ EXTERNAL API

Vùng 2 lưu toàn bộ dữ liệu bóng đá được đồng bộ từ external football API. USER và ADMIN không nhập tay hoặc sửa trực tiếp dữ liệu trong vùng này.


## 5. Bảng `competitions`

### 3.5.1. Bảng này là gì?

Lưu giải đấu hoặc cúp được đồng bộ từ external football API.

- **Nguồn dữ liệu:** Chỉ được tạo/cập nhật qua module synchronization.
- **Khóa chính:** `id`
- **Quan hệ:**
  - `competitions` 1–N `seasons`
  - `competitions` 1–N `matches`
  - `competitions` 1–N `player_season_statistics`
  - `competitions` 1–N `data_sync_jobs`

### 3.5.2. Đặc tả thuộc tính

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Đặc tả | Quy tắc/Validation |
|---|---|---:|---|---|---|---|
| `id` | `UUID` | Không | Không có | PK | Mã nội bộ của giải đấu trong ScoutBoard. | Không sử dụng external ID làm PK. |
| `external_provider` | `VARCHAR(50)` | Không | Không có |  | Tên nhà cung cấp dữ liệu. | Ví dụ: `API_FOOTBALL`, `FOOTBALL_DATA` hoặc `STATSBOMB`. |
| `external_id` | `VARCHAR(100)` | Không | Không có |  | Mã giải đấu tại nhà cung cấp. | Kết hợp với `external_provider` để chống trùng. |
| `name` | `VARCHAR(150)` | Không | Không có |  | Tên giải đấu. | Ví dụ: `Premier League`. |
| `country` | `VARCHAR(100)` | Có | `NULL` |  | Quốc gia hoặc khu vực tổ chức. | Có thể null với giải quốc tế. |
| `type` | `VARCHAR(30)` | Có | `NULL` |  | Loại giải đấu. | Giá trị đề xuất: `LEAGUE`, `CUP`, `INTERNATIONAL`. |
| `logo_url` | `TEXT` | Có | `NULL` |  | Đường dẫn logo từ nguồn dữ liệu. | Chỉ lưu khi giấy phép nguồn cho phép. |
| `data_updated_at` | `TIMESTAMPTZ` | Có | `NULL` |  | Thời điểm dữ liệu tại nguồn được cập nhật. | Khác với thời gian hệ thống đồng bộ. |
| `(external_provider, external_id)` | `—` | — | — | UNIQUE | Ràng buộc định danh duy nhất của giải đấu theo nhà cung cấp. | Là conflict target khi thực hiện PostgreSQL upsert. |

### 3.5.3. Lưu ý triển khai

- Bảng thuộc dữ liệu bóng đá đồng bộ. Không xây API cho USER hoặc ADMIN sửa trực tiếp dữ liệu nghiệp vụ của bảng.
- Khi đồng bộ, ưu tiên PostgreSQL `INSERT ... ON CONFLICT ... DO UPDATE` để upsert.

---


## 6. Bảng `seasons`

### 3.6.1. Bảng này là gì?

Lưu mùa giải thuộc một competition, ví dụ mùa 2025–2026 của Premier League.

- **Nguồn dữ liệu:** Chỉ được đồng bộ từ external football API.
- **Khóa chính:** `id`
- **Quan hệ:**
  - `seasons.competition_id` → `competitions.id`
  - `seasons` 1–N `season_teams`
  - `seasons` 1–N `matches`
  - `seasons` 1–N `player_season_statistics`
  - `seasons` 1–N `squads`
  - `seasons` 1–N `data_sync_jobs`

### 3.6.2. Đặc tả thuộc tính

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Đặc tả | Quy tắc/Validation |
|---|---|---:|---|---|---|---|
| `id` | `UUID` | Không | Không có | PK | Mã nội bộ của mùa giải. | Được tham chiếu bởi thống kê, trận đấu và đội hình. |
| `competition_id` | `UUID` | Không | Không có | FK | Giải đấu sở hữu mùa giải. | Phải tồn tại trong `competitions`. |
| `external_provider` | `VARCHAR(50)` | Không | Không có |  | Nhà cung cấp dữ liệu mùa giải. | Nên đồng nhất với competition. |
| `external_id` | `VARCHAR(100)` | Không | Không có |  | Mã mùa giải tại nhà cung cấp. | Dùng trong đồng bộ và truy vết nguồn. |
| `season_code` | `VARCHAR(30)` | Không | Không có |  | Mã hiển thị của mùa giải. | Ví dụ: `2025-2026`, `2026`. |
| `start_date` | `DATE` | Có | `NULL` |  | Ngày bắt đầu mùa giải. | Không bao gồm thời gian. |
| `end_date` | `DATE` | Có | `NULL` |  | Ngày kết thúc mùa giải. | Phải lớn hơn hoặc bằng `start_date`. |
| `is_current` | `BOOLEAN` | Không | `FALSE` |  | Đánh dấu mùa giải đang diễn ra. | Trong một competition nên chỉ có tối đa một mùa hiện tại. |
| `(competition_id, season_code)` | `—` | — | — | UNIQUE | Không cho phép trùng mã mùa trong cùng giải đấu. | Hỗ trợ tìm kiếm mùa theo giải. |

### 3.6.3. Lưu ý triển khai

- Bảng thuộc dữ liệu bóng đá đồng bộ. Không xây API cho USER hoặc ADMIN sửa trực tiếp dữ liệu nghiệp vụ của bảng.
- Khi đồng bộ, ưu tiên PostgreSQL `INSERT ... ON CONFLICT ... DO UPDATE` để upsert.

---

## 7. Bảng `season_teams`

### 3.7.1. Bảng này là gì?

Bảng liên kết nhiều–nhiều giữa mùa giải (`seasons`) và đội bóng (`teams`), xác định danh sách các đội tham gia trong một mùa giải cụ thể.

- **Nguồn dữ liệu:** Được đồng bộ tự động từ external football API qua module synchronization.
- **Khóa chính:** Khóa chính ghép (`season_id`, `team_id`)
- **Quan hệ:**
  - `season_teams.season_id` → `seasons.id` (`ON DELETE CASCADE`)
  - `season_teams.team_id` → `teams.id` (`ON DELETE CASCADE`)

### 3.7.2. Đặc tả thuộc tính

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Đặc tả | Quy tắc/Validation |
|---|---|---:|---|---|---|---|
| `season_id` | `UUID` | Không | Không có | PK, FK | Mùa giải tham gia. | Phải tồn tại trong `seasons`; xóa cascade khi mùa giải bị xóa. |
| `team_id` | `UUID` | Không | Không có | PK, FK | Đội bóng tham gia mùa giải. | Phải tồn tại trong `teams`; xóa cascade khi đội bóng bị xóa. |
| `created_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm thêm bản ghi. | Tự động sinh khi đồng bộ. |

### 3.7.3. Lưu ý triển khai

- Khóa chính ghép `(season_id, team_id)` đảm bảo không cho phép một đội bị thêm trùng vào cùng một mùa giải.
- Không chứa `competition_id` vì có thể suy ra thông qua `season.competition_id`.
- Bảng thuộc dữ liệu bóng đá đồng bộ. Không xây API cho USER hoặc ADMIN sửa trực tiếp dữ liệu nghiệp vụ của bảng.
- Khi đồng bộ, ưu tiên PostgreSQL `INSERT ... ON CONFLICT DO NOTHING` để upsert.

---


## 8. Bảng `teams`

### 3.8.1. Bảng này là gì?

Lưu câu lạc bộ hoặc đội tuyển được lấy từ external API.

- **Nguồn dữ liệu:** Chỉ được tạo/cập nhật qua synchronization.
- **Khóa chính:** `id`
- **Quan hệ:**
  - `teams` 1–N `season_teams`
  - `teams` 1–N `players` thông qua `current_team_id`
  - `teams` 1–N `player_team_history`
  - `teams` 1–N `matches` với vai trò đội nhà và đội khách
  - `teams` 1–N `player_match_statistics`
  - `teams` 1–N `player_season_statistics`

### 3.8.2. Đặc tả thuộc tính

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Đặc tả | Quy tắc/Validation |
|---|---|---:|---|---|---|---|
| `id` | `UUID` | Không | Không có | PK | Mã nội bộ của đội bóng. | Dùng trong toàn hệ thống thay cho external ID. |
| `external_provider` | `VARCHAR(50)` | Không | Không có |  | Nhà cung cấp dữ liệu. | Một đội có thể có ID khác nhau ở các provider khác nhau; MVP nên chọn một provider chính. |
| `external_id` | `VARCHAR(100)` | Không | Không có |  | Mã đội bóng tại provider. | Kết hợp provider để upsert. |
| `name` | `VARCHAR(180)` | Không | Không có |  | Tên đầy đủ của đội bóng. | Ví dụ: `Manchester City FC`. |
| `short_name` | `VARCHAR(80)` | Có | `NULL` |  | Tên rút gọn dùng trên giao diện. | Ví dụ: `Man City`. |
| `country` | `VARCHAR(100)` | Có | `NULL` |  | Quốc gia của đội. | Có thể null nếu nguồn không cung cấp. |
| `logo_url` | `TEXT` | Có | `NULL` |  | Đường dẫn logo đội. | Chỉ sử dụng theo giấy phép nguồn. |
| `status` | `VARCHAR(30)` | Không | `ACTIVE` |  | Trạng thái hiển thị của đội. | Giá trị đề xuất: `ACTIVE`, `INACTIVE`, `HIDDEN`. |
| `data_updated_at` | `TIMESTAMPTZ` | Có | `NULL` |  | Thời điểm dữ liệu nguồn được cập nhật. | Dùng hiển thị độ mới dữ liệu. |
| `(external_provider, external_id)` | `—` | — | — | UNIQUE | Định danh duy nhất của đội bóng theo provider. | Dùng cho upsert. |

### 3.7.3. Lưu ý triển khai

- Bảng thuộc dữ liệu bóng đá đồng bộ. Không xây API cho USER hoặc ADMIN sửa trực tiếp dữ liệu nghiệp vụ của bảng.
- Khi đồng bộ, ưu tiên PostgreSQL `INSERT ... ON CONFLICT ... DO UPDATE` để upsert.

---


## 9. Bảng `players`

### 3.9.1. Bảng này là gì?

Bảng trung tâm lưu hồ sơ cơ bản của cầu thủ.

- **Nguồn dữ liệu:** Chỉ đồng bộ từ external football API; USER và ADMIN không sửa tay dữ liệu cầu thủ.
- **Khóa chính:** `id`
- **Quan hệ:**
  - `players.current_team_id` → `teams.id`
  - `players` 1–N `player_positions`
  - `players` 1–N `player_team_history`
  - `players` 1–N `player_match_statistics`
  - `players` 1–N `player_season_statistics`
  - `players` N–N `shortlists` thông qua `shortlist_players`
  - `players` N–N `squads` thông qua `squad_players`

### 3.9.2. Đặc tả thuộc tính

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Đặc tả | Quy tắc/Validation |
|---|---|---:|---|---|---|---|
| `id` | `UUID` | Không | Không có | PK | Mã nội bộ của cầu thủ. | Được dùng trong API và các bảng liên kết. |
| `external_provider` | `VARCHAR(50)` | Không | Không có |  | Nhà cung cấp thông tin cầu thủ. | Phục vụ đồng bộ và audit nguồn. |
| `external_id` | `VARCHAR(100)` | Không | Không có |  | Mã cầu thủ tại provider. | Kết hợp provider để chống trùng. |
| `full_name` | `VARCHAR(200)` | Không | Không có |  | Họ tên đầy đủ của cầu thủ. | Là tên chính thức được hiển thị. |
| `normalized_name` | `VARCHAR(200)` | Không | Không có |  | Tên đã chuẩn hóa để hỗ trợ tìm kiếm. | Nên chuyển chữ thường, bỏ dấu/ký tự thừa tùy chiến lược search. |
| `date_of_birth` | `DATE` | Có | `NULL` |  | Ngày sinh cầu thủ. | Tuổi nên được tính động, không lưu trực tiếp. |
| `nationality` | `VARCHAR(100)` | Có | `NULL` |  | Quốc tịch cầu thủ. | MVP lưu một giá trị; đa quốc tịch có thể tách bảng sau. |
| `height_cm` | `INTEGER` | Có | `NULL` |  | Chiều cao tính bằng centimet. | Nên kiểm tra phạm vi hợp lý, ví dụ 120–230. |
| `preferred_foot` | `VARCHAR(20)` | Có | `NULL` |  | Chân thuận. | Giá trị đề xuất: `LEFT`, `RIGHT`, `BOTH`, `UNKNOWN`. |
| `primary_position` | `VARCHAR(50)` | Có | `NULL` |  | Vị trí chính được lưu dạng cache để tìm kiếm nhanh. | Nguồn chuẩn chi tiết nằm ở `player_positions`; cần đồng bộ nhất quán. |
| `current_team_id` | `UUID` | Có | `NULL` | FK | Đội bóng hiện tại của cầu thủ. | Có thể null khi cầu thủ tự do hoặc nguồn chưa có dữ liệu. |
| `status` | `VARCHAR(30)` | Không | `ACTIVE` |  | Trạng thái cầu thủ trong hệ thống. | Đề xuất: `ACTIVE`, `INACTIVE`, `RETIRED`, `HIDDEN`. |
| `image_url` | `TEXT` | Có | `NULL` |  | URL ảnh cầu thủ. | Phải tuân thủ giấy phép sử dụng. |
| `data_updated_at` | `TIMESTAMPTZ` | Có | `NULL` |  | Thời điểm dữ liệu cầu thủ được cập nhật ở nguồn. | Hiển thị “cập nhật lần cuối”. |
| `(external_provider, external_id)` | `—` | — | — | UNIQUE | Định danh duy nhất cho cầu thủ theo provider. | Conflict target của upsert. |

### 3.9.3. Lưu ý triển khai

- Bảng thuộc dữ liệu bóng đá đồng bộ. Không xây API cho USER hoặc ADMIN sửa trực tiếp dữ liệu nghiệp vụ của bảng.
- Khi đồng bộ, ưu tiên PostgreSQL `INSERT ... ON CONFLICT ... DO UPDATE` để upsert.
- Nên tạo GIN index dùng `pg_trgm` trên `normalized_name` để tìm gần đúng theo tên.
- Nên tạo index theo `current_team_id`, `primary_position`, `status` cho bộ lọc phổ biến.

---


## 10. Bảng `player_positions`

### 3.10.1. Bảng này là gì?

Lưu một hoặc nhiều vị trí thi đấu của từng cầu thủ.

- **Nguồn dữ liệu:** Đồng bộ từ external API hoặc được suy ra từ dữ liệu chuẩn hóa của provider.
- **Khóa chính:** `id`
- **Quan hệ:**
  - `player_positions.player_id` → `players.id`

### 3.10.2. Đặc tả thuộc tính

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Đặc tả | Quy tắc/Validation |
|---|---|---:|---|---|---|---|
| `id` | `UUID` | Không | Không có | PK | Mã của bản ghi vị trí. | Không mang ý nghĩa nghiệp vụ bên ngoài. |
| `player_id` | `UUID` | Không | Không có | FK | Cầu thủ sở hữu vị trí. | Phải tồn tại trong `players`. |
| `position_code` | `VARCHAR(50)` | Không | Không có |  | Mã vị trí chuẩn hóa. | Ví dụ: `GK`, `CB`, `LB`, `RB`, `DM`, `CM`, `AM`, `LW`, `RW`, `ST`. |
| `is_primary` | `BOOLEAN` | Không | `FALSE` |  | Xác định đây có phải vị trí chính. | Mỗi cầu thủ nên chỉ có tối đa một vị trí chính. |
| `display_order` | `INTEGER` | Có | `NULL` |  | Thứ tự hiển thị các vị trí. | Số nhỏ hiển thị trước. |
| `(player_id, position_code)` | `—` | — | — | UNIQUE | Không lưu trùng cùng vị trí cho một cầu thủ. | Bảo đảm dữ liệu sạch. |

### 3.10.3. Lưu ý triển khai

- Bảng thuộc dữ liệu bóng đá đồng bộ. Không xây API cho USER hoặc ADMIN sửa trực tiếp dữ liệu nghiệp vụ của bảng.
- Khi đồng bộ, ưu tiên PostgreSQL `INSERT ... ON CONFLICT ... DO UPDATE` để upsert.

---


## 11. Bảng `player_team_history`

### 3.11.1. Bảng này là gì?

Lưu lịch sử cầu thủ từng thuộc các đội bóng qua từng giai đoạn.

- **Nguồn dữ liệu:** Đồng bộ từ provider khi nguồn cung cấp lịch sử đội bóng.
- **Khóa chính:** `id`
- **Quan hệ:**
  - `player_team_history.player_id` → `players.id`
  - `player_team_history.team_id` → `teams.id`

### 3.10.2. Đặc tả thuộc tính

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Đặc tả | Quy tắc/Validation |
|---|---|---:|---|---|---|---|
| `id` | `UUID` | Không | Không có | PK | Mã bản ghi lịch sử. | Mỗi giai đoạn thuộc đội là một bản ghi. |
| `player_id` | `UUID` | Không | Không có | FK | Cầu thủ trong lịch sử. | Phải tồn tại trong `players`. |
| `team_id` | `UUID` | Không | Không có | FK | Đội bóng trong giai đoạn. | Phải tồn tại trong `teams`. |
| `joined_at` | `DATE` | Có | `NULL` |  | Ngày bắt đầu thuộc đội. | Có thể thiếu nếu provider không cung cấp. |
| `left_at` | `DATE` | Có | `NULL` |  | Ngày rời đội. | `NULL` thường biểu thị vẫn đang thuộc đội. |
| `shirt_number` | `INTEGER` | Có | `NULL` |  | Số áo trong giai đoạn. | Nên kiểm tra từ 1 đến 99 nếu có. |
| `is_current` | `BOOLEAN` | Không | `FALSE` |  | Đánh dấu đội hiện tại. | Cần thống nhất với `players.current_team_id`. |
| `created_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm bản ghi được tạo trong ScoutBoard. | Không phải ngày gia nhập đội. |

### 3.11.3. Lưu ý triển khai

- Bảng thuộc dữ liệu bóng đá đồng bộ. Không xây API cho USER hoặc ADMIN sửa trực tiếp dữ liệu nghiệp vụ của bảng.
- Khi đồng bộ, ưu tiên PostgreSQL `INSERT ... ON CONFLICT ... DO UPDATE` để upsert.

---


## 12. Bảng `matches`

### 3.12.1. Bảng này là gì?

Lưu thông tin trận đấu phục vụ phong độ gần đây và thống kê theo trận.

- **Nguồn dữ liệu:** Được đồng bộ từ external football API.
- **Khóa chính:** `id`
- **Quan hệ:**
  - `matches.competition_id` → `competitions.id`
  - `matches.season_id` → `seasons.id`
  - `matches.home_team_id` → `teams.id`
  - `matches.away_team_id` → `teams.id`
  - `matches` 1–N `player_match_statistics`

### 3.12.2. Đặc tả thuộc tính

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Đặc tả | Quy tắc/Validation |
|---|---|---:|---|---|---|---|
| `id` | `UUID` | Không | Không có | PK | Mã nội bộ trận đấu. | Được tham chiếu bởi thống kê theo trận. |
| `competition_id` | `UUID` | Không | Không có | FK | Giải đấu của trận. | Phải tồn tại trong `competitions`. |
| `season_id` | `UUID` | Không | Không có | FK | Mùa giải của trận. | Phải thuộc competition tương ứng. |
| `home_team_id` | `UUID` | Không | Không có | FK | Đội chủ nhà. | Không được trùng `away_team_id`. |
| `away_team_id` | `UUID` | Không | Không có | FK | Đội khách. | Không được trùng `home_team_id`. |
| `external_provider` | `VARCHAR(50)` | Không | Không có |  | Nhà cung cấp trận đấu. | Dùng với external ID. |
| `external_id` | `VARCHAR(100)` | Không | Không có |  | Mã trận tại provider. | Phục vụ upsert. |
| `kickoff_at` | `TIMESTAMPTZ` | Có | `NULL` |  | Thời gian bắt đầu trận. | Lưu theo UTC, chuyển múi giờ ở frontend. |
| `status` | `VARCHAR(30)` | Không | `SCHEDULED` |  | Trạng thái trận đấu. | Ví dụ: `SCHEDULED`, `LIVE`, `FINISHED`, `POSTPONED`, `CANCELLED`. |
| `home_score` | `INTEGER` | Có | `NULL` |  | Số bàn đội nhà. | Chỉ có khi trận đã diễn ra; không âm. |
| `away_score` | `INTEGER` | Có | `NULL` |  | Số bàn đội khách. | Chỉ có khi trận đã diễn ra; không âm. |
| `(external_provider, external_id)` | `—` | — | — | UNIQUE | Định danh duy nhất của trận đấu theo provider. | Dùng upsert. |

### 3.12.3. Lưu ý triển khai

- Bảng thuộc dữ liệu bóng đá đồng bộ. Không xây API cho USER hoặc ADMIN sửa trực tiếp dữ liệu nghiệp vụ của bảng.
- Khi đồng bộ, ưu tiên PostgreSQL `INSERT ... ON CONFLICT ... DO UPDATE` để upsert.

---


## 13. Bảng `player_match_statistics`

### 3.13.1. Bảng này là gì?

Lưu thống kê của một cầu thủ trong một trận đấu cụ thể.

- **Nguồn dữ liệu:** Đồng bộ từ external API; có thể không đầy đủ tùy gói dữ liệu.
- **Khóa chính:** `id`
- **Quan hệ:**
  - `player_match_statistics.match_id` → `matches.id`
  - `player_match_statistics.player_id` → `players.id`
  - `player_match_statistics.team_id` → `teams.id`

### 3.13.2. Đặc tả thuộc tính

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Đặc tả | Quy tắc/Validation |
|---|---|---:|---|---|---|---|
| `id` | `UUID` | Không | Không có | PK | Mã bản ghi thống kê theo trận. | Không dùng external ID làm PK. |
| `match_id` | `UUID` | Không | Không có | FK | Trận đấu được thống kê. | Phải tồn tại trong `matches`. |
| `player_id` | `UUID` | Không | Không có | FK | Cầu thủ được thống kê. | Phải tồn tại trong `players`. |
| `team_id` | `UUID` | Không | Không có | FK | Đội cầu thủ thi đấu trong trận. | Phải là một trong hai đội của trận. |
| `minutes_played` | `INTEGER` | Không | `0` |  | Số phút thi đấu. | Không âm; có thể lớn hơn 90 khi có hiệp phụ. |
| `goals` | `INTEGER` | Không | `0` |  | Số bàn thắng trong trận. | Không âm. |
| `assists` | `INTEGER` | Không | `0` |  | Số kiến tạo trong trận. | Không âm. |
| `shots` | `INTEGER` | Không | `0` |  | Số cú sút. | Không âm. |
| `passes_attempted` | `INTEGER` | Không | `0` |  | Tổng số đường chuyền thực hiện. | Không âm. |
| `passes_completed` | `INTEGER` | Không | `0` |  | Số đường chuyền thành công. | Không âm và không lớn hơn `passes_attempted`. |
| `tackles` | `INTEGER` | Không | `0` |  | Số lần tắc bóng. | Không âm. |
| `statistics` | `JSONB` | Có | `NULL` |  | Các chỉ số mở rộng phụ thuộc provider. | Chỉ lưu dữ liệu đã chuẩn hóa hoặc có version/schema rõ ràng. |
| `(match_id, player_id)` | `—` | — | — | UNIQUE | Mỗi cầu thủ chỉ có một bản ghi thống kê trong một trận. | Ngăn dữ liệu đồng bộ trùng. |

### 3.13.3. Lưu ý triển khai

- Bảng thuộc dữ liệu bóng đá đồng bộ. Không xây API cho USER hoặc ADMIN sửa trực tiếp dữ liệu nghiệp vụ của bảng.
- Khi đồng bộ, ưu tiên PostgreSQL `INSERT ... ON CONFLICT ... DO UPDATE` để upsert.

---


## 14. Bảng `player_season_statistics`

### 3.14.1. Bảng này là gì?

Lưu thống kê tổng hợp của cầu thủ theo đội, giải đấu và mùa giải. Đây là bảng chính cho Player Search, Player Detail và Comparison.

- **Nguồn dữ liệu:** Đồng bộ trực tiếp từ provider hoặc tổng hợp từ thống kê theo trận.
- **Khóa chính:** `id`
- **Quan hệ:**
  - `player_season_statistics.player_id` → `players.id`
  - `player_season_statistics.team_id` → `teams.id`
  - `player_season_statistics.competition_id` → `competitions.id`
  - `player_season_statistics.season_id` → `seasons.id`

### 3.14.2. Đặc tả thuộc tính

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Đặc tả | Quy tắc/Validation |
|---|---|---:|---|---|---|---|
| `id` | `UUID` | Không | Không có | PK | Mã bản ghi thống kê mùa. | Mỗi tổ hợp player/team/competition/season có một bản ghi. |
| `player_id` | `UUID` | Không | Không có | FK | Cầu thủ được thống kê. | Phải tồn tại trong `players`. |
| `team_id` | `UUID` | Không | Không có | FK | Đội của cầu thủ trong phạm vi thống kê. | Cho phép một cầu thủ có nhiều bản ghi trong mùa nếu chuyển đội. |
| `competition_id` | `UUID` | Không | Không có | FK | Giải đấu của thống kê. | Phải tồn tại trong `competitions`. |
| `season_id` | `UUID` | Không | Không có | FK | Mùa giải của thống kê. | Phải thuộc competition tương ứng. |
| `appearances` | `INTEGER` | Không | `0` |  | Số lần ra sân. | Không âm. |
| `starts` | `INTEGER` | Không | `0` |  | Số trận đá chính. | Không âm và không lớn hơn appearances. |
| `minutes_played` | `INTEGER` | Không | `0` |  | Tổng số phút thi đấu. | Dùng mẫu số tính chỉ số per 90. |
| `goals` | `INTEGER` | Không | `0` |  | Tổng số bàn thắng. | Không âm. |
| `assists` | `INTEGER` | Không | `0` |  | Tổng số kiến tạo. | Không âm. |
| `shots` | `INTEGER` | Không | `0` |  | Tổng số cú sút. | Không âm. |
| `shots_on_target` | `INTEGER` | Không | `0` |  | Số cú sút trúng đích. | Không âm và không lớn hơn shots. |
| `passes_attempted` | `INTEGER` | Không | `0` |  | Tổng số đường chuyền thực hiện. | Không âm. |
| `passes_completed` | `INTEGER` | Không | `0` |  | Số đường chuyền thành công. | Không âm và không lớn hơn `passes_attempted`. |
| `key_passes` | `INTEGER` | Không | `0` |  | Số đường chuyền tạo cơ hội. | Không âm. |
| `tackles` | `INTEGER` | Không | `0` |  | Tổng số pha tắc bóng. | Không âm. |
| `interceptions` | `INTEGER` | Không | `0` |  | Tổng số lần đánh chặn. | Không âm. |
| `duels_won` | `INTEGER` | Không | `0` |  | Số pha tranh chấp thắng. | Không âm. |
| `advanced_statistics` | `JSONB` | Có | `NULL` |  | Các chỉ số nâng cao chưa chuẩn hóa thành cột. | Ví dụ progressive passes; cần quản lý schema/version. |
| `(player_id, team_id, competition_id, season_id)` | `—` | — | — | UNIQUE | Không cho phép trùng thống kê cùng phạm vi. | Là conflict target khi upsert. |

### 3.14.3. Lưu ý triển khai

- Bảng thuộc dữ liệu bóng đá đồng bộ. Không xây API cho USER hoặc ADMIN sửa trực tiếp dữ liệu nghiệp vụ của bảng.
- Khi đồng bộ, ưu tiên PostgreSQL `INSERT ... ON CONFLICT ... DO UPDATE` để upsert.
- Cột `pass_accuracy` không lưu trực tiếp trong DB mà được tính động từ `passes_completed / passes_attempted * 100` (trả về `NULL` nếu `passes_attempted = 0`).
- Các chỉ số per 90 không nhất thiết phải lưu thành cột; có thể tính khi query: `metric * 90 / minutes_played`.
- Khi `minutes_played = 0`, backend phải tránh phép chia cho 0 và trả `NULL` hoặc 0 theo quy ước API.

---


# VÙNG 3 – USER-GENERATED DATA – SHORTLIST & SQUAD BUILDER

Vùng 3 lưu dữ liệu do USER tự tạo, gồm shortlist cá nhân và đội hình mơ ước.


## 15. Bảng `shortlists`

### 3.15.1. Bảng này là gì?

Lưu các danh sách cầu thủ cá nhân do USER tạo.

- **Nguồn dữ liệu:** Do USER tạo, đổi tên hoặc xóa.
- **Khóa chính:** `id`
- **Quan hệ:**
  - `shortlists.owner_id` → `users.id`
  - `shortlists` 1–N `shortlist_players`

### 3.15.2. Đặc tả thuộc tính

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Đặc tả | Quy tắc/Validation |
|---|---|---:|---|---|---|---|
| `id` | `UUID` | Không | Không có | PK | Mã shortlist. | Dùng trong API quản lý shortlist. |
| `owner_id` | `UUID` | Không | Không có | FK | USER sở hữu shortlist. | Backend phải kiểm tra ownership khi đọc/sửa/xóa. |
| `name` | `VARCHAR(150)` | Không | Không có |  | Tên shortlist. | Ví dụ: `U23 Midfielders`; không được để trống. |
| `description` | `TEXT` | Có | `NULL` |  | Mô tả mục đích của shortlist. | Có thể giới hạn độ dài ở API. |
| `visibility` | `VARCHAR(30)` | Không | `PRIVATE` |  | Phạm vi hiển thị shortlist. | MVP nên chỉ dùng `PRIVATE`; `PUBLIC` dành cho future improvement. |
| `created_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm tạo shortlist. | Không thay đổi. |
| `updated_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm cập nhật shortlist gần nhất. | Cập nhật khi đổi tên, mô tả hoặc thành viên. |

### 3.15.3. Lưu ý triển khai

- Mọi thao tác cập nhật phải kiểm tra quyền sở hữu hoặc quyền ADMIN ở backend; không tin dữ liệu role/owner gửi từ frontend.

---


## 16. Bảng `shortlist_players`

### 3.16.1. Bảng này là gì?

Bảng liên kết giữa shortlist và cầu thủ, đồng thời lưu ghi chú cá nhân.

- **Nguồn dữ liệu:** Do USER thêm hoặc xóa cầu thủ khỏi shortlist.
- **Khóa chính:** `id`
- **Quan hệ:**
  - `shortlist_players.shortlist_id` → `shortlists.id`
  - `shortlist_players.player_id` → `players.id`

### 3.16.2. Đặc tả thuộc tính

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Đặc tả | Quy tắc/Validation |
|---|---|---:|---|---|---|---|
| `id` | `UUID` | Không | Không có | PK | Mã bản ghi liên kết. | Có thể dùng khóa ghép nhưng UUID giúp API thao tác thuận tiện. |
| `shortlist_id` | `UUID` | Không | Không có | FK | Shortlist chứa cầu thủ. | Phải thuộc USER hiện tại khi thao tác. |
| `player_id` | `UUID` | Không | Không có | FK | Cầu thủ được lưu. | Không làm thay đổi dữ liệu gốc của cầu thủ. |
| `note` | `TEXT` | Có | `NULL` |  | Ghi chú ngắn của USER về cầu thủ. | Là dữ liệu riêng tư; nên giới hạn độ dài. |
| `added_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm cầu thủ được thêm. | Dùng sắp xếp theo mới nhất. |
| `(shortlist_id, player_id)` | `—` | — | — | UNIQUE | Một cầu thủ chỉ xuất hiện một lần trong cùng shortlist. | Ngăn thao tác thêm trùng. |

### 3.16.3. Lưu ý triển khai

- Khi xóa bản ghi, chỉ xóa liên kết khỏi shortlist; tuyệt đối không xóa cầu thủ trong `players`.

---


## 17. Bảng `squads`

### 3.17.1. Bảng này là gì?

Lưu đội hình mơ ước do USER tạo.

- **Nguồn dữ liệu:** Do USER tạo và chỉnh sửa qua Squad Builder.
- **Khóa chính:** `id`
- **Quan hệ:**
  - `squads.owner_id` → `users.id`
  - `squads.season_id` → `seasons.id`
  - `squads` 1–N `squad_players`

### 3.17.2. Đặc tả thuộc tính

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Đặc tả | Quy tắc/Validation |
|---|---|---:|---|---|---|---|
| `id` | `UUID` | Không | Không có | PK | Mã đội hình. | Dùng trong các endpoint `/api/squads/{id}`. |
| `owner_id` | `UUID` | Không | Không có | FK | USER sở hữu đội hình. | Backend phải kiểm tra ownership. |
| `season_id` | `UUID` | Có | `NULL` | FK | Mùa giải dùng để tính tổng quan đội hình. | Có thể null nếu đội hình không gắn mùa cụ thể. |
| `name` | `VARCHAR(150)` | Không | Không có |  | Tên đội hình. | Ví dụ: `Dream Team 2026`; không để trống. |
| `formation_code` | `VARCHAR(30)` | Không | Không có |  | Mã sơ đồ chiến thuật. | MVP: `4-3-3`, `4-2-3-1`, `4-4-2`, `3-5-2`, `3-4-3`. |
| `description` | `TEXT` | Có | `NULL` |  | Mô tả hoặc ghi chú về đội hình. | Dữ liệu do USER tạo. |
| `visibility` | `VARCHAR(30)` | Không | `PRIVATE` |  | Phạm vi hiển thị đội hình. | MVP nên dùng `PRIVATE`. |
| `created_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm tạo đội hình. | Không thay đổi. |
| `updated_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm chỉnh sửa gần nhất. | Cập nhật khi thay đổi sơ đồ hoặc cầu thủ. |

### 3.17.3. Lưu ý triển khai

- Mọi thao tác cập nhật phải kiểm tra quyền sở hữu hoặc quyền ADMIN ở backend; không tin dữ liệu role/owner gửi từ frontend.

---


## 18. Bảng `squad_players`

### 3.18.1. Bảng này là gì?

Lưu cầu thủ thuộc một đội hình, vị trí trên sân, vai trò đá chính/dự bị và trạng thái đội trưởng.

- **Nguồn dữ liệu:** Do USER thao tác trong Squad Builder.
- **Khóa chính:** `id`
- **Quan hệ:**
  - `squad_players.squad_id` → `squads.id`
  - `squad_players.player_id` → `players.id`

### 3.18.2. Đặc tả thuộc tính

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Đặc tả | Quy tắc/Validation |
|---|---|---:|---|---|---|---|
| `id` | `UUID` | Không | Không có | PK | Mã bản ghi cầu thủ trong đội hình. | Dùng cập nhật/xóa từng cầu thủ nếu cần. |
| `squad_id` | `UUID` | Không | Không có | FK | Đội hình chứa cầu thủ. | Phải thuộc USER hiện tại. |
| `player_id` | `UUID` | Không | Không có | FK | Cầu thủ được chọn. | Cầu thủ phải tồn tại trong `players`. |
| `slot_code` | `VARCHAR(30)` | Có | `NULL` |  | Vị trí cụ thể trên sơ đồ. | Ví dụ: `GK`, `CB-1`, `CM-2`; có thể null với cầu thủ dự bị. |
| `role` | `VARCHAR(30)` | Không | Không có |  | Vai trò trong đội hình. | Chỉ nhận `STARTER` hoặc `SUBSTITUTE`. |
| `is_captain` | `BOOLEAN` | Không | `FALSE` |  | Đánh dấu cầu thủ là đội trưởng. | Chỉ cầu thủ STARTER được làm đội trưởng. |
| `display_order` | `INTEGER` | Có | `NULL` |  | Thứ tự hiển thị dự bị hoặc danh sách cầu thủ. | Số nhỏ hiển thị trước. |
| `added_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm thêm vào đội hình. | Dùng audit hoặc sắp xếp. |
| `(squad_id, player_id)` | `—` | — | — | UNIQUE | Một cầu thủ chỉ xuất hiện một lần trong đội hình. | Áp dụng cả đá chính và dự bị. |
| `(squad_id, slot_code) WHERE role='STARTER'` | `—` | — | — | PARTIAL UNIQUE | Một slot đá chính chỉ có một cầu thủ. | Không áp dụng cho dự bị có slot null. |
| `squad_id WHERE is_captain=TRUE` | `—` | — | — | PARTIAL UNIQUE | Mỗi đội hình chỉ có một đội trưởng. | Kết hợp kiểm tra ở service và database. |

### 3.18.3. Lưu ý triển khai

- Các ràng buộc vị trí nên được kiểm tra ở cả service và database.
- Khi lưu toàn bộ lineup bằng `PUT`, nên xử lý trong một transaction.

---


# VÙNG 4 – SYNCHRONIZATION & AUDIT

Vùng 4 quản lý job đồng bộ, log chi tiết và lịch sử các hành động quan trọng.


## 19. Bảng `data_sync_jobs`

### 3.19.1. Bảng này là gì?

Lưu một lần chạy đồng bộ dữ liệu, phạm vi đồng bộ, người khởi tạo, tiến độ và kết quả.

- **Nguồn dữ liệu:** Được tạo khi ADMIN chạy thủ công hoặc scheduler kích hoạt.
- **Khóa chính:** `id`
- **Quan hệ:**
  - `data_sync_jobs.initiated_by` → `users.id`
  - `data_sync_jobs.competition_id` → `competitions.id`
  - `data_sync_jobs.season_id` → `seasons.id`
  - `data_sync_jobs` 1–N `data_sync_logs`

### 3.19.2. Đặc tả thuộc tính

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Đặc tả | Quy tắc/Validation |
|---|---|---:|---|---|---|---|
| `id` | `UUID` | Không | Không có | PK | Mã job đồng bộ. | Dùng theo dõi trạng thái qua API admin. |
| `initiated_by` | `UUID` | Có | `NULL` | FK | ADMIN khởi tạo job. | `NULL` nếu job do scheduler tự động tạo. |
| `competition_id` | `UUID` | Không | Không có | FK | Giải đấu cần đồng bộ. | Phải tồn tại trong `competitions` hoặc được ánh xạ từ cấu hình provider. |
| `season_id` | `UUID` | Không | Không có | FK | Mùa giải cần đồng bộ. | Phải thuộc competition tương ứng. |
| `provider` | `VARCHAR(50)` | Không | Không có |  | Nhà cung cấp dữ liệu. | Dùng chọn adapter/API client phù hợp. |
| `status` | `VARCHAR(30)` | Không | `PENDING` |  | Trạng thái job. | Đề xuất: `PENDING`, `RUNNING`, `SUCCESS`, `FAILED`, `PARTIAL_SUCCESS`. |
| `trigger_type` | `VARCHAR(30)` | Không | Không có |  | Nguồn kích hoạt job. | Chỉ nhận `MANUAL` hoặc `SCHEDULED`. |
| `processed_count` | `INTEGER` | Không | `0` |  | Tổng số bản ghi đã xử lý. | Không âm. |
| `created_count` | `INTEGER` | Không | `0` |  | Số bản ghi được tạo mới. | Không âm. |
| `updated_count` | `INTEGER` | Không | `0` |  | Số bản ghi được cập nhật. | Không âm. |
| `failed_count` | `INTEGER` | Không | `0` |  | Số bản ghi xử lý thất bại. | Không âm. |
| `started_at` | `TIMESTAMPTZ` | Có | `NULL` |  | Thời điểm job bắt đầu chạy. | Được gán khi chuyển sang RUNNING. |
| `completed_at` | `TIMESTAMPTZ` | Có | `NULL` |  | Thời điểm job kết thúc. | Chỉ có ở trạng thái cuối. |
| `error_message` | `TEXT` | Có | `NULL` |  | Thông báo lỗi tổng quát của job. | Không lưu secret, API key hoặc dữ liệu nhạy cảm. |

### 3.19.3. Lưu ý triển khai

- Không giữ transaction database mở trong suốt thời gian gọi external API.
- Trạng thái job phải được cập nhật ngay cả khi lỗi để tránh job bị kẹt ở `RUNNING`.

---


## 20. Bảng `data_sync_logs`

### 3.20.1. Bảng này là gì?

Lưu log chi tiết trong quá trình chạy một synchronization job.

- **Nguồn dữ liệu:** Module synchronization ghi tự động.
- **Khóa chính:** `id`
- **Quan hệ:**
  - `data_sync_logs.job_id` → `data_sync_jobs.id`

### 3.20.2. Đặc tả thuộc tính

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Đặc tả | Quy tắc/Validation |
|---|---|---:|---|---|---|---|
| `id` | `UUID` | Không | Không có | PK | Mã log đồng bộ. | Dùng xem chi tiết lỗi. |
| `job_id` | `UUID` | Không | Không có | FK | Job sở hữu log. | Phải tồn tại trong `data_sync_jobs`. |
| `level` | `VARCHAR(20)` | Không | Không có |  | Mức độ log. | Giá trị: `INFO`, `WARN`, `ERROR`. |
| `entity_type` | `VARCHAR(50)` | Có | `NULL` |  | Loại dữ liệu đang xử lý. | Ví dụ: `PLAYER`, `TEAM`, `MATCH`, `STATISTICS`. |
| `external_id` | `VARCHAR(100)` | Có | `NULL` |  | Mã bản ghi tại provider gây ra log. | Hỗ trợ truy vết lỗi nguồn. |
| `message` | `TEXT` | Không | Không có |  | Mô tả ngắn của sự kiện hoặc lỗi. | Không chứa token hoặc API key. |
| `details` | `JSONB` | Có | `NULL` |  | Chi tiết có cấu trúc về lỗi hoặc dữ liệu xử lý. | Cần lọc dữ liệu nhạy cảm; có thể lưu error code và field lỗi. |
| `created_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm log được ghi. | Dùng sắp xếp timeline. |

### 3.20.3. Lưu ý triển khai

- Có thể thiết lập chính sách xóa hoặc partition theo thời gian nếu số lượng log tăng lớn.

---


## 21. Bảng `audit_logs`

### 3.21.1. Bảng này là gì?

Lưu lịch sử hành động quan trọng của USER, ADMIN hoặc hệ thống để truy vết và kiểm tra bảo mật.

- **Nguồn dữ liệu:** Backend ghi tự động tại các thao tác quan trọng.
- **Khóa chính:** `id`
- **Quan hệ:**
  - `audit_logs.actor_user_id` → `users.id`

### 3.21.2. Đặc tả thuộc tính

| Thuộc tính | Kiểu dữ liệu | Cho phép NULL | Mặc định | Ràng buộc | Đặc tả | Quy tắc/Validation |
|---|---|---:|---|---|---|---|
| `id` | `UUID` | Không | Không có | PK | Mã audit log. | Bản ghi chỉ đọc, không cho người dùng sửa. |
| `actor_user_id` | `UUID` | Có | `NULL` | FK | Người thực hiện hành động. | `NULL` với tác vụ hệ thống hoặc khi tài khoản đã bị xóa. |
| `action` | `VARCHAR(100)` | Không | Không có |  | Tên hành động được audit. | Ví dụ: `USER_DISABLED`, `SYNC_JOB_STARTED`, `SQUAD_DELETED`. |
| `resource_type` | `VARCHAR(80)` | Không | Không có |  | Loại tài nguyên bị tác động. | Ví dụ: `USER`, `SQUAD`, `SHORTLIST`, `SYNC_JOB`. |
| `resource_id` | `UUID` | Có | `NULL` |  | ID tài nguyên bị tác động. | Không tạo FK cứng vì audit cần tồn tại sau khi tài nguyên bị xóa. |
| `result` | `VARCHAR(30)` | Không | Không có |  | Kết quả thao tác. | Đề xuất: `SUCCESS`, `FAILED`, `DENIED`. |
| `correlation_id` | `UUID` | Có | `NULL` |  | Mã liên kết các log trong cùng request/flow. | Hỗ trợ truy vết lỗi xuyên suốt request. |
| `ip_address` | `VARCHAR(64)` | Có | `NULL` |  | Địa chỉ IP của client. | Hỗ trợ IPv4/IPv6; cân nhắc chính sách riêng tư. |
| `user_agent` | `TEXT` | Có | `NULL` |  | Thông tin trình duyệt hoặc client. | Không dùng làm dữ liệu xác thực. |
| `metadata` | `JSONB` | Có | `NULL` |  | Thông tin bổ sung đã được làm sạch. | Không lưu mật khẩu, access token, refresh token hoặc secret. |
| `created_at` | `TIMESTAMPTZ` | Không | `NOW()` |  | Thời điểm hành động xảy ra. | Nên có index theo thời gian giảm dần. |

### 3.21.3. Lưu ý triển khai

- Audit log nên là append-only; không cung cấp chức năng chỉnh sửa nội dung log.
- Nên index `(created_at DESC)`, `actor_user_id`, `resource_type`, `resource_id`.

---



# 4. GIẢI THÍCH CÁC QUAN HỆ NGHIỆP VỤ QUAN TRỌNG

## 4.1. USER và Role

```text
users
  1
  |
  N
user_roles
  N
  |
  1
roles
```

`user_roles` giúp một tài khoản có thể mang nhiều role mà không phải lưu chuỗi role trực tiếp trong bảng `users`.

## 4.2. Competition và Season

```text
competitions 1 ───── N seasons
```

Một giải đấu có nhiều mùa giải. Mỗi mùa giải chỉ thuộc một giải đấu.

## 4.3. Player và Statistics

```text
players 1 ───── N player_match_statistics
players 1 ───── N player_season_statistics
```

- `player_match_statistics` lưu dữ liệu chi tiết từng trận.
- `player_season_statistics` lưu dữ liệu tổng hợp theo mùa, đội và giải đấu.
- Trong MVP có thể lấy `player_season_statistics` trực tiếp từ provider mà chưa cần tự cộng toàn bộ dữ liệu trận.

## 4.4. Shortlist

```text
users 1 ───── N shortlists
shortlists 1 ───── N shortlist_players
players 1 ───── N shortlist_players
```

`shortlist_players` giải quyết quan hệ nhiều–nhiều giữa shortlist và cầu thủ.

## 4.5. Squad Builder

```text
users 1 ───── N squads
squads 1 ───── N squad_players
players 1 ───── N squad_players
```

Một USER có nhiều đội hình. Mỗi đội hình có nhiều cầu thủ. Một cầu thủ có thể xuất hiện trong nhiều đội hình khác nhau, nhưng không được xuất hiện hai lần trong cùng một đội hình.

## 4.6. Synchronization

```text
data_sync_jobs 1 ───── N data_sync_logs
```

`data_sync_jobs` lưu kết quả tổng quan. `data_sync_logs` lưu chi tiết từng bước hoặc từng bản ghi lỗi.

## 4.7. Season và Team (Bảng season_teams)

```text
seasons 1 ───── N season_teams N ───── 1 teams
```

`season_teams` quản lý danh sách các đội tham gia từng mùa giải cụ thể mà không chứa thông tin thừa (`competition_id` được suy ra qua `season.competition_id`).

---

# 5. RÀNG BUỘC DATABASE NÊN CÓ

## 5.1. Chống trùng external data

```sql
CREATE UNIQUE INDEX uq_players_external_identity
ON players (external_provider, external_id);
```

Áp dụng tương tự cho:

- `teams`
- `competitions`
- `matches`

## 5.2. Không thêm trùng cầu thủ vào shortlist

```sql
ALTER TABLE shortlist_players
ADD CONSTRAINT uq_shortlist_player
UNIQUE (shortlist_id, player_id);
```

## 5.3. Không thêm trùng cầu thủ vào đội hình

```sql
ALTER TABLE squad_players
ADD CONSTRAINT uq_squad_player
UNIQUE (squad_id, player_id);
```

## 5.4. Một slot chỉ có một cầu thủ đá chính

```sql
CREATE UNIQUE INDEX uq_squad_starter_slot
ON squad_players (squad_id, slot_code)
WHERE role = 'STARTER';
```

## 5.5. Một đội hình chỉ có một đội trưởng

```sql
CREATE UNIQUE INDEX uq_squad_captain
ON squad_players (squad_id)
WHERE is_captain = TRUE;
```

## 5.6. Thống kê mùa không bị trùng

```sql
ALTER TABLE player_season_statistics
ADD CONSTRAINT uq_player_season_stat
UNIQUE (player_id, team_id, competition_id, season_id);
```

## 5.7. Không thêm trùng đội bóng vào cùng một mùa giải

```sql
ALTER TABLE season_teams
ADD CONSTRAINT pk_season_teams
PRIMARY KEY (season_id, team_id);
```

---

# 6. QUY TẮC XÓA DỮ LIỆU ĐỀ XUẤT

| Quan hệ | Hành vi đề xuất |
|---|---|
| Xóa `users` → `refresh_tokens` | `ON DELETE CASCADE` hoặc revoke token trước |
| Xóa `seasons` / `teams` → `season_teams` | `ON DELETE CASCADE` |
| Xóa `users` → `shortlists`, `squads` | Cân nhắc soft delete user; nếu xóa vật lý có thể cascade |
| Xóa `shortlists` → `shortlist_players` | `ON DELETE CASCADE` |
| Xóa `squads` → `squad_players` | `ON DELETE CASCADE` |
| Xóa `data_sync_jobs` → `data_sync_logs` | Thường không xóa; nếu xóa thì cascade |
| Xóa football data | Hạn chế xóa vật lý; ưu tiên cập nhật `status = HIDDEN/INACTIVE` |
| Xóa `users` → `audit_logs` | Nên giữ audit log và đặt `actor_user_id = NULL` bằng `ON DELETE SET NULL` |

---

# 7. INDEX ĐỀ XUẤT

```sql
CREATE INDEX idx_refresh_tokens_user
ON refresh_tokens (user_id);

CREATE INDEX idx_players_name_trgm
ON players
USING GIN (normalized_name gin_trgm_ops);

CREATE INDEX idx_players_team_position_status
ON players (current_team_id, primary_position, status);

CREATE INDEX idx_player_stats_comp_season_minutes
ON player_season_statistics
(competition_id, season_id, minutes_played);

CREATE INDEX idx_shortlists_owner
ON shortlists (owner_id, updated_at DESC);

CREATE INDEX idx_squads_owner
ON squads (owner_id, updated_at DESC);

CREATE INDEX idx_sync_jobs_status_created
ON data_sync_jobs (status, started_at DESC);

CREATE INDEX idx_audit_logs_created
ON audit_logs (created_at DESC);
```

---

# 8. THỨ TỰ MIGRATION ĐỀ XUẤT

```text
V1  create users
V2  create roles
V3  create user_roles
V4  create refresh_tokens

V5  create competitions
V6  create seasons
V7  create teams
V8  create season_teams
V9  create players
V10 create player_positions
V11 create player_team_history
V12 create matches
V13 create player_match_statistics
V14 create player_season_statistics

V15 create shortlists
V16 create shortlist_players
V17 create squads
V18 create squad_players

V19 create data_sync_jobs
V20 create data_sync_logs
V21 create audit_logs
V22 create indexes and additional constraints
V23 seed roles
```

Các bảng được tạo theo thứ tự này để bảng cha tồn tại trước khi tạo khóa ngoại ở bảng con.

---

# 9. DỮ LIỆU SEED TỐI THIỂU

```sql
INSERT INTO roles (id, code, name, created_at)
VALUES
    (gen_random_uuid(), 'USER', 'Người dùng', NOW()),
    (gen_random_uuid(), 'ADMIN', 'Quản trị viên', NOW());
```

Tài khoản ADMIN đầu tiên nên được tạo bằng migration riêng, command-line bootstrap hoặc biến môi trường an toàn. Không commit mật khẩu ADMIN rõ vào Git.

---

# 10. KẾT LUẬN

ERD của ScoutBoard được thiết kế theo bốn nhóm rõ ràng:

1. **Authentication & Authorization** quản lý tài khoản, role và phiên đăng nhập.
2. **Football Data** lưu dữ liệu chỉ đọc được đồng bộ từ external API.
3. **User-generated Data** lưu shortlist và đội hình mơ ước của từng USER.
4. **Synchronization & Audit** theo dõi quá trình đồng bộ và các hành động quan trọng.

Thiết kế này phù hợp với kiến trúc modular monolith và phạm vi MVP hiện tại. Các constraint ở database kết hợp validation tại Spring Boot giúp hạn chế dữ liệu trùng, vi phạm quyền sở hữu và đội hình không hợp lệ.