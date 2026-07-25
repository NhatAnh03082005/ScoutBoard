# 🗄️ Database Setup & Management (PostgreSQL 17)

Tài liệu hướng dẫn cấu hình, khởi chạy và quản lý cơ sở dữ liệu PostgreSQL cho dự án **ScoutBoard**.

---

## 🛠 Thông tin cấu hình cơ bản

| Thống số | Giá trị mặc định |
| :--- | :--- |
| **Engine** | PostgreSQL 17 (Alpine) |
| **Host** | `localhost` (hoặc `postgres` khi chạy trong Docker) |
| **Port** | `5432` |
| **Database Name** | `scoutboard_db` |
| **User** | `postgres` |
| **Password** | `postgres123` |
| **pgAdmin Web UI** | `http://localhost:8080` (Email: `admin@scoutboard.com`, Pass: `admin123`) |

---

## 🚀 Hướng dẫn khởi chạy bằng Docker Compose

### 1. Khởi động Container (Background mode)
```bash
docker compose up -d
```

### 2. Kiểm tra trạng thái Container
```bash
docker compose ps
```

### 3. Xem log hoạt động của Database
```bash
docker compose logs -f postgres
```

### 4. Dừng và giữ nguyên dữ liệu
```bash
docker compose stop
```

### 5. Dừng và xoá container
```bash
docker compose down
```
*(Nếu muốn xoá toàn bộ dữ liệu database để khởi tạo lại từ đầu: `docker compose down -v`)*

---

## 🔗 Kết nối từ Backend (NestJS / TypeORM / Prisma)

**Connection String:**
```text
postgresql://postgres:postgres123@localhost:5432/scoutboard_db?schema=public
```
