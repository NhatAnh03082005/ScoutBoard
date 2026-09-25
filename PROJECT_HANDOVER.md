# 📋 TÀI LIỆU BÀN GIAO TOÀN DIỆN DỰ ÁN SCOUTBOARD (MASTER PROJECT HANDOVER)

> **Dự án**: ScoutBoard — Football Player Search, Comparison, Analytics & Squad Building Platform  
> **Chủ sở hữu**: Lê Hoàng Nhật Anh (`anh367641@gmail.com` / GitHub: `NhatAnh03082005`)  
> **Thời gian cập nhật**: Tháng 9/2026  
> **Mục đích**: Tài liệu bàn giao đầy đủ cho Agent mới hoặc Developer tiếp quản dự án (bao gồm toàn bộ tài khoản, mật khẩu, link deploy, cấu trúc database, dữ liệu đã đồng bộ và các lưu ý kỹ thuật).

---

## 🌐 1. TOÀN BỘ LINK TRIỂN KHAI LIVE (DEPLOYMENT URLS)

| Thành phần | Nền tảng | Link trực tiếp | Trạng thái | Ghi chú |
| :--- | :--- | :--- | :---: | :--- |
| **Frontend Web** | **Vercel** | [https://scout-board-three.vercel.app](https://scout-board-three.vercel.app) | 🟢 LIVE | Web SPA React 19 + Vite, tự động deploy từ nhánh `main` |
| **Backend API** | **Vercel** | [https://scoutboard-backend.vercel.app/api](https://scoutboard-backend.vercel.app/api) | 🟢 LIVE | NestJS 11 chạy Serverless Function tại `/api/index.ts` |
| **Swagger API Docs** | **Vercel** | [https://scoutboard-backend.vercel.app/api/docs](https://scoutboard-backend.vercel.app/api/docs) | 🟢 LIVE | Tài liệu đặc tả OpenAPI 3.0 + Bearer JWT Auth |
| **Health Check API** | **Vercel** | [https://scoutboard-backend.vercel.app/api/health](https://scoutboard-backend.vercel.app/api/health) | 🟢 LIVE | Endpoint kiểm tra uptime máy chủ và kết nối database |
| **Source Code** | **GitHub** | [https://github.com/NhatAnh03082005/ScoutBoard](https://github.com/NhatAnh03082005/ScoutBoard) | 🟢 LIVE | Nhánh production: `main`, nhánh phát triển: `dev` |
| **Database Cloud** | **Supabase** | `aws-0-ap-south-1.pooler.supabase.com:5432` | 🟢 LIVE | PostgreSQL 17 Cloud Pooler (vùng Mumbai `ap-south-1`) |
| **Backend Render cũ** | **Render** | `https://scoutboard-backend.onrender.com` | ⚪ OFF | Đã giải thể và chuyển 100% sang Vercel Serverless |

---

## 🔑 2. TÀI KHOẢN, MẬT KHẨU & CHUỖI KẾT NỐI (CREDENTIALS & SECRETS)

### 2.1. Cơ sở dữ liệu Local (Local PostgreSQL qua Docker)
* **Host**: `localhost` hoặc `127.0.0.1`
* **Port**: `5432`
* **User**: `postgres`
* **Password**: `postgres123`
* **Database**: `scoutboard_db`
* **Chuỗi kết nối (Connection String)**:
  ```text
  postgresql://postgres:postgres123@localhost:5432/scoutboard_db?schema=public
  ```

### 2.2. Cơ sở dữ liệu Production (Supabase Cloud Database Pooler)
* **Nền tảng**: [https://supabase.com](https://supabase.com) (Đăng nhập qua GitHub `NhatAnh03082005`)
* **Project Name**: `scoutboard-db`
* **Project Ref**: `utpuxqpokpqnxpqqiens`
* **Host (IPv4 Pooler)**: `aws-0-ap-south-1.pooler.supabase.com`
* **Port Session Mode**: `5432` (Khuyên dùng cho script/backend vì giữ socket sống lâu hơn)
* **Port Transaction Mode**: `6543` (Dùng cho serverless query siêu nhanh)
* **User**: `postgres.utpuxqpokpqnxpqqiens`
* **Password**: `03082005Anhle@@`
* **Database Name**: `postgres`
* **SSL**: Bắt buộc bật SSL (`rejectUnauthorized: false`)
* **Chuỗi kết nối (Connection String)**:
  ```text
  postgresql://postgres.utpuxqpokpqnxpqqiens:03082005Anhle@@@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require
  ```

### 2.3. Dịch vụ API Bóng Đá (API-Football / API-Sports)
* **Trang quản trị**: [https://dashboard.api-football.com/](https://dashboard.api-football.com/)
* **Email đăng nhập**: `anh367641@gmail.com`
* **API Key**: `09b395257421d95a43fa4fd945df43b7`
* **Base URL**: `https://v3.football.api-sports.io`
* **Hạn mức (Quota)**: 100 requests / ngày (Gói Free, reset vào **00:00 UTC = 07:00 sáng giờ VN**).
* **Quy định Rate Limit**: Tối đa 10 requests / phút $\rightarrow$ **Bắt buộc delay $\ge 6.2$ giây giữa mỗi request** trong tất cả các script.

### 2.4. Khóa bí mật bảo mật (JWT Tokens & Auth)
* **Local Backend JWT**:
  * `JWT_SECRET`: `scoutboard_jwt_access_secret_key_2026_super_secure`
  * `JWT_REFRESH_SECRET`: `scoutboard_jwt_refresh_secret_key_2026_super_secure`
* **Production Vercel Backend JWT**:
  * `JWT_SECRET`: `scoutboard_jwt_access_secret_production_2026_super_key`
  * `JWT_REFRESH_SECRET`: `scoutboard_jwt_refresh_secret_production_2026_super_key`
* **Thời hạn Token**: Access Token: `15m`, Refresh Token: `7d` (được băm SHA-256 lưu trong bảng `refresh_tokens`).

---

## 🏗️ 3. TỔNG QUAN KIẾN TRÚC HỆ THỐNG

### 3.1. Sơ đồ luồng dữ liệu (Architecture Diagram)
```mermaid
graph TD
  User((Client Browser)) -->|HTTPS| VercelFE["Frontend SPA\n(React 19 + Vite)\nscout-board-three.vercel.app"]
  VercelFE -->|REST API / Bearer JWT| VercelBE["Backend Serverless\n(NestJS 11)\nscoutboard-backend.vercel.app/api"]
  VercelBE -->|TypeORM Connection Pooler\nSession Port 5432 / SSL| SupaDB[("Supabase PostgreSQL 17\n(aws-0-ap-south-1.pooler.supabase.com)")]
  
  subgraph Data_Sync_Pipeline ["Data Sync & Ingestion Pipeline"]
    SyncScript["Ingestion Scripts\n(backend/src/scripts/*.ts)"] -->|Rate Limit 6.2s\nFamily: 4 IPv4| APIFootball["API-Football\nv3.football.api-sports.io"]
    SyncScript -->|Dual Upsert| LocalDB[("Local PostgreSQL 17\nlocalhost:5432")]
    SyncScript -->|Dual Upsert / Auto-Reconnect| SupaDB
  end
```

### 3.2. Cấu trúc Backend (`/backend`)
Được thiết kế theo **Modular Monolith + Clean Architecture** (4 tầng độc lập):
* `src/modules/<feature>/domain`: Chứa Pure Entities, Value Objects, Domain Interfaces (không dính TypeORM hay NestJS).
* `src/modules/<feature>/application`: Chứa Use Cases, Application Services, Ports.
* `src/modules/<feature>/infrastructure`: Chứa TypeORM ORM Entities, Mappers, Repositories, Database Migrations.
* `src/modules/<feature>/presentation`: Chứa HTTP Controllers, DTOs (`class-validator`), Guards, Swagger Annotations.

### 3.3. Cấu hình Vercel Serverless Backend:
* File `backend/vercel.json`: Đóng gói `dist/**`, cấu hình CORS Edge Network cho `https://scout-board-three.vercel.app`.
* File `backend/api/index.ts`: Khởi tạo Express Serverless Adapter cho NestJS, xử lý preflight `OPTIONS` trong 5ms.
* File `backend/src/app.module.ts`: Sử dụng `autoLoadEntities: true` tương thích hoàn toàn môi trường Serverless.

---

## 📊 4. TRẠNG THÁI DỮ LIỆU ĐÃ ĐỒNG BỘ (TOP 5 GIẢI ĐẤU CHÂU ÂU)

Cả **Local PostgreSQL** và **Supabase Cloud Database** đều đạt **100% tính đồng nhất (Data Parity)**:

### 4.1. Bảng tổng kết số lượng bản ghi (Record Count Audit)
| Danh mục thực thể | Bảng Database | Số lượng bản ghi | Tình trạng đồng bộ |
| :--- | :--- | :---: | :---: |
| **Giải đấu (Competitions)** | `competitions` | **5** | ✅ Đầy đủ Top 5 giải lớn Châu Âu |
| **Mùa giải (Seasons)** | `seasons` | **21** | ✅ Có mùa 2024-2025 cho toàn bộ 5 giải |
| **Câu lạc bộ (Clubs/Teams)**| `teams` | **606** | ✅ Đủ 96/96 CLB Top 5 (Leverkusen, PSG, Real, Inter,...) |
| **Cầu thủ (Players)** | `players` | **3,017** | ✅ Có ảnh headshot CDN, vị trí thực tế, quốc tịch |
| **Vị trí chi tiết (Positions)**| `player_positions` | **3,017+** | ✅ Chuẩn hóa 4 nhóm vai trò (GK, DEF, MID, ATT) |
| **Lịch sử CLB (Transfers)** | `player_team_history` | **7,030** | ✅ 1.209 siêu sao có trọn vẹn lộ trình sự nghiệp |
| **Lịch thi đấu (Matches)** | `matches` | **1,756** | ✅ 100% toàn bộ lịch thi đấu mùa 2024–2025 của cả 5 giải |
| **Hiệu suất trận đấu** | `player_match_statistics` | **21,580+** | ✅ Chi tiết từng trận: bàn thắng, sút, kiến tạo, rating,... |
| **Chỉ số mùa giải (Radar)** | `player_season_statistics`| **1,278+** | ✅ Đầy đủ chỉ số tổng hợp & Per-90 benchmarks |

### 4.2. Danh sách 5 giải đấu & ID nội bộ (UUIDs)
1. **Premier League (Anh)**:
   * External ID: `39` | Comp UUID: `9cef6c96-c74e-432d-b0f2-7867ee7f3e07`
   * Season 2024/2025 UUID: `39202400-0000-4000-8000-000000002024` (Season code: `2024-2025`)
   * Trận đấu: 380/380 trận hoàn thành | 9.707 thống kê trận đấu.
2. **La Liga (Tây Ban Nha)**:
   * External ID: `140` | Comp UUID: `ad6261b7-7170-4824-aeed-edeb1e03a05f`
   * Season 2024/2025 UUID: `1a85c0bf-470c-40ca-b6bf-9d448f217bcf` (Season code: `2024-2025`)
   * Trận đấu: 380/380 trận hoàn thành | 9.310 thống kê trận đấu.
3. **Bundesliga (Đức)**:
   * External ID: `78` | Comp UUID: `3287afe2-608a-413c-a0b9-3f6b467586c4`
   * Season 2024/2025 UUID: `2142003f-889e-4119-955e-0876d4bfca8c` (Season code: `2024-2025`)
   * Trận đấu: 308/308 trận hoàn thành | 1.075+ thống kê trận đấu.
4. **Serie A (Ý)**:
   * External ID: `135` | Comp UUID: `aa209d46-caf3-40ea-ac88-fd516bb0dc18`
   * Season 2024/2025 UUID: `aa1f68b7-4c78-428d-b8d9-19e33b86611d` (Season code: `2024-2025`)
   * Trận đấu: 380/380 trận hoàn thành | 836+ thống kê trận đấu.
5. **Ligue 1 (Pháp)**:
   * External ID: `61` | Comp UUID: `974a6b13-5e12-4508-b45a-ac71a1098120`
   * Season 2024/2025 UUID: `d9c9b68b-2b3d-4a64-8ce3-3a1f2648a71f` (Season code: `2024-2025`)
   * Trận đấu: 308/308 trận hoàn thành | 652+ thống kê trận đấu.

---

## 🛠️ 5. QUY TRÌNH CHẠY DỰ ÁN LOCAL (DEVELOPMENT QUICKSTART)

### 5.1. Khởi động PostgreSQL Local (Docker)
```powershell
# Chạy container database local đã tạo sẵn
docker start scoutboard-postgres

# Hoặc nếu chưa có container:
cd d:\FullStack\Football\ScoutBoard
docker-compose up -d postgres
```

### 5.2. Chạy Backend (NestJS API)
```powershell
cd d:\FullStack\Football\ScoutBoard\backend
npm install
npm run start:dev
# API Local: http://localhost:3000/api
# Swagger Docs Local: http://localhost:3000/api/docs
```

### 5.3. Chạy Frontend (React 19 + Vite)
```powershell
cd d:\FullStack\Football\ScoutBoard\frontend
npm install
npm run dev
# Web Local: http://localhost:5173
```

---

## ⚡ 6. CÁC SCRIPT ĐỒNG BỘ DỮ LIỆU (`backend/package.json`)

Tất cả các script ingestion được lưu trong thư mục `backend/src/scripts/` và kích hoạt qua `npm run`:

| Lệnh Script | File thực thi | Mục đích |
| :--- | :--- | :--- |
| `npm run sync:top3-matches-stats` | `sync-top3-leagues-matches-and-stats.ts` | **Đồng bộ toàn bộ fixtures (996 trận) và kéo thống kê cầu thủ chi tiết cho Bundesliga, Serie A, Ligue 1.** (Đã có cơ chế auto-reconnect Supabase). |
| `npm run sync:next-transfers` | `sync-next-batch-transfers.ts` | Kéo lịch sử chuyển nhượng cho nhóm cầu thủ tiếp theo. |
| `npm run enrich:all-profiles` | `enrich-all-remaining-profiles.ts` | Bổ sung chiều cao, cân nặng, số áo cho các cầu thủ còn thiếu. |
| `npm run sync:top3-positions` | `sync-top3-leagues-positions.ts` | Chuẩn hóa vị trí thi đấu thực tế cho Đức, Ý, Pháp. |
| `npm run sync:missing-bundesliga` | `sync-missing-bundesliga-clubs.ts` | Kéo danh sách cầu thủ cho Leverkusen, Frankfurt, Hoffenheim, Augsburg. |

---

## ⚠️ 7. CÁC KINH NGHIỆM KỸ THUẬT & GOTCHAS CẦN BIẾT (QUAN TRỌNG)

### 7.1. Lỗi Supabase Pooler `Connection terminated unexpectedly`
* **Hiện tượng**: Khi chạy các script đồng bộ kéo dài nhiều phút (do phải sleep 6.2s giữa các request), cổng Transaction `6543` của Supabase pooler sẽ tự động ngắt kết nối idle TCP client.
* **Giải pháp đã áp dụng**:
  1. Đổi cổng kết nối Supabase sang **Port `5432` (Session Mode)** thay vì `6543`.
  2. Bật cờ `keepAlive: true` trong options của `pg.Client`.
  3. Bọc truy vấn bằng hàm `querySupabaseWithRetry(query, params)`: Tự động bắt lỗi ngắt kết nối, tạo lại client mới và retry trong 1 giây mà không làm gián đoạn tiến trình.

### 7.2. Lỗi `fetch failed` do Undici trên Node.js v25 (Windows)
* **Hiện tượng**: Khi gọi API-Football bằng `fetch()` mặc định của Node.js, connection pool ngầm của `undici` dễ bị drop socket sau 10-15 requests.
* **Giải pháp**:
  - Đặt `dns.setDefaultResultOrder('ipv4first');` ở đầu file.
  - Sử dụng module gốc `https.request` với tùy chọn `{ family: 4, timeout: 25000 }` để đảm bảo 100% kết nối qua IPv4 ổn định.

### 7.3. Ràng buộc NOT NULL của bảng `player_season_statistics` trên Cloud
* Các cột `goals_per_90`, `assists_per_90`, `key_passes_per_90`, `tackles_per_90`, `interceptions_per_90` trên Supabase có ràng buộc `NOT NULL DEFAULT 0`.
* Với các cầu thủ dự bị không thi đấu (0 phút), chỉ số Per-90 tính toán là `null`. Khi insert vào Supabase phải dùng `s.goals_per_90 ?? 0`.

### 7.4. Chuẩn hóa UUID mùa giải RFC 4122
* Toàn bộ `seasonId` khi gửi lên API Backend phải là UUID v4 hợp lệ theo RFC 4122 (không được chứa các chuỗi nhân tạo toàn số 0 như `39202400-0000-0000-0000-000000002024`). Mã chuẩn hiện tại là `39202400-0000-4000-8000-000000002024`.

---

## 🚀 8. CHECKLIST TIẾP QUẢN CHO AGENT TIẾP THEO

1. **Kiểm tra hạn mức API-Football**:
   ```powershell
   node -e "const https = require('https'); https.get({hostname: 'v3.football.api-sports.io', path: '/status', headers: {'x-apisports-key': '09b395257421d95a43fa4fd945df43b7'}}, r => { let b=''; r.on('data', d=>b+=d); r.on('end', ()=>console.log(b)); });"
   ```
2. **Kiểm tra trạng thái Live API**:
   ```powershell
   curl.exe -i "https://scoutboard-backend.vercel.app/api/health"
   curl.exe -i "https://scoutboard-backend.vercel.app/api/players?limit=5"
   ```
3. **Tiếp tục đồng bộ thống kê trận đấu (nếu người dùng yêu cầu)**:
   - Chạy `npm run sync:top3-matches-stats` trong thư mục `backend`. Script sẽ tự động nhận diện các trận đã có thống kê và chỉ kéo các trận còn lại.
4. **Deploy cập nhật mới**:
   - Chỉ cần commit và push lên nhánh `main`: `git push origin main`.
   - Vercel sẽ tự động build và deploy cả Frontend lẫn Backend trong vòng 60 giây.
