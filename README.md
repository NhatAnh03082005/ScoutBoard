# ScoutBoard ⚽

> **Football Player Search, Comparison and Squad Building Platform**

**ScoutBoard** là một nền tảng Web Full-Stack hỗ trợ người dùng tìm kiếm, phân tích, so sánh, quản lý danh sách theo dõi (shortlist) và xây dựng đội hình bóng đá mong muốn (Squad Builder) dựa trên thông tin cá nhân, câu lạc bộ, vị trí thi đấu và thống kê theo mùa giải.

---

## ✨ Tính năng chính (Core Features - MVP)

### 1. 🔐 Authentication & Phân quyền (RBAC)
- Đăng ký, đăng nhập, cấp và thu hồi **JWT Access Token & Refresh Token**.
- Phân quyền 3 cấp độ:
  - **GUEST:** Tim kiếm, xem chi tiết và so sánh cầu thủ.
  - **USER:** Tất cả quyền của GUEST + Quản lý Shortlist cá nhân & Xây dựng Đội hình (Squad Builder).
  - **ADMIN:** Tất cả quyền của USER + Lên lịch, vận hành và quản lý lỗi đồng bộ dữ liệu (Data Sync Job).

### 2. 🔍 Tìm kiếm cầu thủ nâng cao (HTTP `QUERY` Method)
- Bộ lọc đa tiêu chí: Tên, tuổi, quốc tịch, vị trí chính/phụ, chân thuận, câu lạc bộ, giải đấu, mùa giải, số phút thi đấu tối thiểu, chỉ số chuẩn hóa trên 90 phút (Goals/90, Assists/90, Key Passes/90, Tackles/90...).
- Tối ưu hiệu năng tìm kiếm với HTTP `QUERY` method (RFC 10008) và fallback endpoint `POST /api/players/search`.

### 3. 📊 So sánh cầu thủ (Player Comparison)
- So sánh song song tối đa **3 cầu thủ** trong cùng mùa giải.
- Tính toán **Mức độ phù hợp (Suitability Score)** theo trọng số tùy chỉnh do người dùng thiết lập.

### 4. 📋 Danh sách theo dõi (Personal Shortlists)
- Tạo, đổi tên, xóa các Shortlist cá nhân.
- Thêm/Xóa cầu thủ khỏi shortlist kèm ghi chú cá nhân (Notes).

### 5. ⚽ Xây dựng đội hình mong muốn (Squad Builder)
- Tạo và đặt tên đội hình cá nhân.
- Hỗ trợ các sơ đồ chiến thuật phổ biến: `4-3-3`, `4-2-3-1`, `4-4-2`, `3-5-2`, `3-4-3`.
- Xếp cầu thủ vào từng slot chính (Starter) hoặc dự bị (Substitute).
- Chọn Đội trưởng (Captain).
- Tự động kiểm tra quy tắc nghiệp vụ: Cảnh báo xếp cầu thủ trái vị trí sở trường (Position Warning), ngăn chặn cầu thủ trùng lặp.
- Tính toán chỉ số tổng quan đội hình: Tuổi trung bình, chiều cao trung bình, tổng bàn thắng/kiến tạo trong mùa giải.

### 6. 🔄 Đồng bộ dữ liệu tự động (External Data Synchronization)
- Đồng bộ tự động & định kỳ dữ liệu Cầu thủ, Câu lạc bộ, Giải đấu và Thống kê mùa giải từ **External Football API**.
- Admin Dashboard theo dõi trạng thái job, ghi log lịch sử và hỗ trợ **Retry** khi job thất bại.

---

## 🛠 Công nghệ sử dụng (Tech Stack)

### **Frontend**
- **Framework/Library:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool:** [Vite 8](https://vitejs.dev/)
- **Linter/Tooling:** [Oxlint](https://oxc.rs/docs/guide/usage/linter.html)

### **Backend**
- **Framework:** [NestJS 11](https://nestjs.com/) + [TypeScript](https://www.typescriptlang.org/)
- **Platform:** Express
- **Database:** PostgreSQL
- **Testing:** Jest (Unit & Integration test)

### **Infrastructure & DevOps**
- **Containerization:** Docker & Docker Compose (`docker-compose.yml`)
- **CI/CD:** GitHub Workflows (`.github/workflows/`)

---

## 📁 Cấu trúc thư mục (Project Structure)

```text
ScoutBoard/
├── frontend/                  # Mã nguồn ứng dụng Frontend (React + Vite + TS)
│   ├── src/                   # Source code chính của Frontend
│   ├── public/                # Tài nguyên tĩnh
│   ├── package.json
│   └── vite.config.ts
├── backend/                   # Mã nguồn API Backend (NestJS + TS)
│   ├── src/                   # Modules, Controllers, Services, Entities
│   ├── test/                  # Test suites (e2e & unit)
│   ├── package.json
│   └── tsconfig.json
├── docs/                      # Tài liệu thiết kế & quy trình dự án
│   ├── 01-analysis/           # Phân tích yêu cầu & Nghiệp vụ
│   ├── 02-database/           # Thiết kế cơ sở dữ liệu PostgreSQL & Indexing
│   ├── 03-api/                # Cấu trúc RESTful API, HTTP QUERY Specs
│   ├── 04-architecture/       # Kiến trúc hệ thống Modular Monolith
│   ├── 05-testing/            # Kế hoạch & Báo cáo kiểm thử
│   └── 06-deployment/         # Hướng dẫn triển khai Docker & CI/CD
├── infrastructure/            # Cấu hình hạ tầng (Database, Nginx, v.v.)
├── .github/
│   └── workflows/             # Cấu hình GitHub Actions CI/CD
├── docker-compose.yml         # Thiết lập môi trường Docker đa dịch vụ
└── README.md                  # Tài liệu tổng quan dự án
```

---

## 🚀 Hướng dẫn khởi chạy (Getting Started)

### **Yêu cầu môi trường**
- **Node.js** (v18 trở lên)
- **npm** (v9 trở lên) hoặc **pnpm** / **yarn**
- **Docker** & **Docker Compose**

---

### **1. Chạy Backend (NestJS)**

```bash
# Di chuyển vào thư mục backend
cd backend

# Cài đặt dependencies
npm install

# Khởi chạy chế độ Development (Auto-reload)
npm run start:dev
```
- Backend REST API chạy tại: `http://localhost:3000`

---

### **2. Chạy Frontend (React + Vite)**

```bash
# Di chuyển vào thư mục frontend
cd frontend

# Cài đặt dependencies
npm install

# Khởi chạy Dev Server
npm run dev
```
- Frontend Web App chạy tại: `http://localhost:5173`

---

### **3. Lệnh kiểm tra & Build**

| Thành phần | Lệnh Lint | Lệnh Build | Lệnh Test |
| :--- | :--- | :--- | :--- |
| **Backend** | `npm run lint` | `npm run build` | `npm run test` |
| **Frontend** | `npm run lint` | `npm run build` | - |

---

## 📚 Tài liệu kỹ thuật chi tiết

Các tài liệu nghiệp vụ và kiến trúc kỹ thuật chi tiết nằm trong thư mục `docs/`:
- [Phân tích nghiệp vụ & Yêu cầu](docs/01-analysis/README.md)
- [Thiết kế Cơ sở dữ liệu PostgreSQL](docs/02-database/README.md)
- [Đặc tả API & HTTP QUERY](docs/03-api/README.md)
- [Kiến trúc hệ thống](docs/04-architecture/README.md)
- [Kế hoạch Kiểm thử (Testing Plan)](docs/05-testing/README.md)
- [Triển khai & Vận hành (Deployment)](docs/06-deployment/README.md)
