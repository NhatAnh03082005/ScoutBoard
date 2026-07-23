# ScoutBoard ⚽

**ScoutBoard** là ứng dụng Full-Stack hỗ trợ quản lý, theo dõi và phân tích dữ liệu tuyển trạch viên (football scouting) và cầu thủ bóng đá. 

---

## 🛠 Công nghệ sử dụng (Tech Stack)

### **Frontend**
- **Framework/Library:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool:** [Vite 8](https://vitejs.dev/)
- **Linter/Tooling:** [Oxlint](https://oxc.rs/docs/guide/usage/linter.html)

### **Backend**
- **Framework:** [NestJS 11](https://nestjs.com/) + [TypeScript](https://www.typescriptlang.org/)
- **Platform:** Express
- **Testing:** Jest

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
│   ├── src/                   # Modules, Controllers, Services
│   ├── test/                  # Test suites (e2e & unit)
│   ├── package.json
│   └── tsconfig.json
├── docs/                      # Tài liệu dự án
│   ├── 01-analysis/           # Phân tích yêu cầu & Nghiệp vụ
│   ├── 02-database/           # Thiết kế cơ sở dữ liệu & Schema
│   ├── 03-api/                # Cấu trúc API & Swagger Specs
│   ├── 04-architecture/       # Kiến trúc hệ thống & Sơ đồ thiết kế
│   ├── 05-testing/            # Kế hoạch & Báo cáo kiểm thử
│   └── 06-deployment/         # Hướng dẫn triển khai & Vận hành
├── infrastructure/            # Cấu hình hạ tầng (Nginx, Database configs, v.v.)
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
- **Docker** & **Docker Compose** (tuỳ chọn)

---

### **1. Chạy Backend (NestJS)**

```bash
# Di chuyển vào thư mục backend
cd backend

# Cài đặt dependencies (nếu chưa có)
npm install

# Khởi chạy chế độ Development (Auto-reload)
npm run start:dev
```
- Backend sẽ mặc định chạy tại: `http://localhost:3000`

---

### **2. Chạy Frontend (React + Vite)**

```bash
# Di chuyển vào thư mục frontend
cd frontend

# Cài đặt dependencies (nếu chưa có)
npm install

# Khởi chạy dev server
npm run dev
```
- Frontend sẽ chạy tại: `http://localhost:5173`

---

### **3. Lệnh kiểm tra & Build**

| Thành phần | Lệnh Lint | Lệnh Build | Lệnh Test |
| :--- | :--- | :--- | :--- |
| **Backend** | `npm run lint` | `npm run build` | `npm run test` |
| **Frontend** | `npm run lint` | `npm run build` | - |

---

## 📚 Tài liệu chi tiết

Mọi tài liệu thiết kế và đặc tả kỹ thuật chi tiết của dự án được lưu trữ trong thư mục `docs/`:
- [Phân tích nghiệp vụ](docs/01-analysis/README.md)
- [Thiết kế Cơ sở dữ liệu](docs/02-database/README.md)
- [Đặc tả API](docs/03-api/README.md)
- [Kiến trúc hệ thống](docs/04-architecture/README.md)
- [Kế hoạch Testing](docs/05-testing/README.md)
- [Hướng dẫn Deployment](docs/06-deployment/README.md)
