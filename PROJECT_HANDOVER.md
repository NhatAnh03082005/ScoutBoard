# 📋 TÀI LIỆU BÀN GIAO DỰ ÁN SCOUTBOARD (PROJECT HANDOVER DOCUMENT)

> **Dự án**: ScoutBoard — Nền tảng Tìm kiếm, So sánh chỉ số và Xây dựng Đội hình Cầu thủ Bóng đá  
> **Chủ sở hữu**: Lê Hoàng Nhật Anh (`anh367641@gmail.com` / GitHub: `NhatAnh03082005`)  
> **Thời gian cập nhật**: Tháng 9/2026  
> **Kho mã nguồn**: [https://github.com/NhatAnh03082005/ScoutBoard.git](https://github.com/NhatAnh03082005/ScoutBoard.git)

---

## 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG

ScoutBoard được xây dựng theo mô hình Monorepo:
* **Frontend (`/frontend`)**: React 18, Vite, TypeScript, Vitest, Vanilla CSS / Component-scoped styling.
* **Backend (`/backend`)**: NestJS 11, TypeScript, TypeORM, PostgreSQL, Passport JWT Auth, Throttler, Swagger Docs (`/api/docs`), Vercel Serverless Function adapter (`/api/index.ts`).
* **Database**: PostgreSQL 17 (chạy Docker ở local, chạy Supabase trên production).
* **Nhà cung cấp dữ liệu bóng đá**: API-Football (`api-sports.io`).

---

## 2. LINK TRIỂN KHAI PRODUCTION (DEPLOYMENT URLS)

| Thành phần | Nền tảng | Link trực tiếp | Trạng thái |
| :--- | :--- | :--- | :--- |
| **Frontend Web** | **Vercel** | [https://scout-board-three.vercel.app](https://scout-board-three.vercel.app) | 🟢 LIVE (100% hoạt động) |
| **Backend API (Vercel)** | **Vercel** | [https://scoutboard-backend.vercel.app/api](https://scoutboard-backend.vercel.app/api) | 🟢 LIVE (100% hoạt động) |
| **Backend API (Render - Cũ)** | **Render** | [https://scoutboard-backend.onrender.com](https://scoutboard-backend.onrender.com) | 🟢 Hoạt động dự phòng |
| **Swagger API Docs** | **Vercel** | [https://scoutboard-backend.vercel.app/api/docs](https://scoutboard-backend.vercel.app/api/docs) | 🟢 LIVE (Đầy đủ RESTful APIs) |
| **Database Cloud** | **Supabase** | `aws-0-ap-south-1.pooler.supabase.com:5432` | 🟢 LIVE (3.017 cầu thủ, 606 CLB, 21 migrations) |
| **Source Code** | **GitHub** | [https://github.com/NhatAnh03082005/ScoutBoard](https://github.com/NhatAnh03082005/ScoutBoard) | 🟢 Nhánh `main` & `dev` |

---

## 3. THÔNG TIN ĐĂNG NHẬP & TÀI KHOẢN CLOUD

### 3.1. Database Cloud (Supabase)
* **Nền tảng**: [https://supabase.com](https://supabase.com) (Đăng nhập qua GitHub `NhatAnh03082005`)
* **Project Name**: `scoutboard-db`
* **Project Ref**: `utpuxqpokpqnxpqqiens`
* **Region**: Asia-Pacific (Mumbai / `ap-south-1`)
* **Host kết nối IPv4 (Connection Pooler - Dùng cho Backend & Script)**:
  * **Host**: `aws-0-ap-south-1.pooler.supabase.com`
  * **Port**: `5432` (Session Mode) hoặc `6543` (Transaction Mode)
  * **Username**: `postgres.utpuxqpokpqnxpqqiens`
  * **Password**: `03082005Anhle@@`
  * **Database Name**: `postgres`
  * **SSL**: `true` (Bắt buộc `{ rejectUnauthorized: false }`)

### 3.2. Backend Hosting trên Vercel (Mới)
* **Nền tảng**: [https://vercel.com](https://vercel.com) (Đăng nhập qua GitHub `NhatAnh03082005`)
* **Project Name**: `scoutboard-backend`
* **Root Directory**: `backend` (⚠️ Bắt buộc chọn đúng thư mục `backend`)
* **Framework Preset**: `Other`
* **Build Command**: Để mặc định (hoặc `npm run build`)
* **Output Directory**: Để trống mặc định
* **Environment Variables trên Vercel (Backend)**:
  * `NODE_ENV` = `production`
  * `POSTGRES_HOST` = `aws-0-ap-south-1.pooler.supabase.com`
  * `POSTGRES_PORT` = `5432`
  * `POSTGRES_DB` = `postgres`
  * `POSTGRES_USER` = `postgres.utpuxqpokpqnxpqqiens`
  * `POSTGRES_PASSWORD` = `03082005Anhle@@`
  * `POSTGRES_SSL` = `true`
  * `JWT_SECRET` = `scoutboard_jwt_access_secret_production_2026_super_key`
  * `JWT_REFRESH_SECRET` = `scoutboard_jwt_refresh_secret_production_2026_super_key`
  * `FRONTEND_ORIGIN` = `https://scout-board-three.vercel.app`
  * `API_FOOTBALL_KEY` = `09b395257421d95a43fa4fd945df43b7`

### 3.3. Frontend Hosting trên Vercel
* **Nền tảng**: [https://vercel.com](https://vercel.com) (Đăng nhập qua GitHub `NhatAnh03082005`)
* **Project Name**: `scout-board`
* **Root Directory**: `frontend`
* **Framework**: `Vite`
* **Build Command**: `npm run build`
* **Output Directory**: `dist`
* **Environment Variables trên Vercel (Frontend)**:
  * `VITE_API_BASE_URL` = `https://[LINK-BACKEND-VERCEL-CUA-BAN]/api` (Loại: `Config`)

### 3.4. API Bóng Đá (API-Football)
* **Website**: [https://dashboard.api-football.com/](https://dashboard.api-football.com/)
* **Tài khoản**: `anh367641@gmail.com`
* **Gói cước**: Free (100 requests / ngày, reset vào 00:00 UTC = 07:00 sáng VN)
* **API Key**: `09b395257421d95a43fa4fd945df43b7`
* **Base URL**: `https://v3.football.api-sports.io`

---

## 4. CẤU HÌNH MÔI TRƯỜNG LOCAL (DEVELOPMENT)

### 4.1. Thư mục mã nguồn:
`d:\FullStack\Football\ScoutBoard`

### 4.2. Database Local (Docker PostgreSQL):
* **Container Name**: `scoutboard-postgres`
* **Host**: `localhost`
* **Port**: `5432`
* **User**: `postgres`
* **Password**: `postgres123`
* **Database**: `scoutboard_db`
* **pgAdmin**: `http://localhost:8080` (User: `admin@scoutboard.com`, Pass: `admin123`)

### 4.3. Chạy Backend ở Local:
```powershell
cd d:\FullStack\Football\ScoutBoard\backend
npm install
npm run start:dev
# API chạy tại: http://localhost:3000/api
# Swagger docs: http://localhost:3000/api/docs
```

### 4.4. Chạy Frontend ở Local:
```powershell
cd d:\FullStack\Football\ScoutBoard\frontend
npm install
npm run dev
# Web chạy tại: http://localhost:5173
```

---

## 5. HƯỚNG DẪN CÁC BƯỚC CHUYỂN BACKEND SANG VERCEL (100% HOÀN TẤT)

Code adapter Serverless (`backend/api/index.ts`), router rewrite (`backend/vercel.json`), và cấu hình tự động load Entity (`autoLoadEntities: true`) đã được tạo và đẩy lên nhánh `main` (commit `2a3e1a0`).

Các bước thực hiện trên giao diện web [vercel.com](https://vercel.com):
1. **Tạo Project Backend mới**:
   * Bấm **Add New...** ➔ **Project**.
   * Chọn repository **`ScoutBoard`**.
   * Đặt tên project: `scoutboard-backend`.
   * **Root Directory**: Bấm **Edit** ➔ chọn thư mục **`backend`** ➔ bấm **Continue**.
   * **Framework Preset**: Chọn **`Other`**.
2. **Điền Environment Variables (Biến môi trường)**:
   * Copy toàn bộ các biến ở mục **3.2** dán vào Vercel.
3. **Bấm Deploy**:
   * Chờ Vercel build khoảng 30 giây. Khi xong, Vercel sẽ cấp đường link dạng: `https://scoutboard-backend-xxx.vercel.app`.
4. **Cập nhật link Backend vào Frontend**:
   * Vào lại project Frontend (`scout-board`) trên Vercel.
   * Vào **Settings** ➔ **Environment Variables** ➔ sửa biến `VITE_API_BASE_URL` thành:
     `https://scoutboard-backend-xxx.vercel.app/api`
   * Bấm **Save** ➔ Sang tab **Deployments** bấm **Redeploy**.
