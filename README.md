# 🌿 CARE-MATCH (Khởi Nghiệp Sáng Tạo)

> **Nền tảng số kết nối người cao tuổi với người chăm sóc tại nhà, đồng hành bởi Nhân viên Công tác Xã hội.**

---

## 📌 Giới thiệu dự án

**CARE-MATCH** là giải pháp công nghệ toàn diện hỗ trợ các gia đình tìm kiếm, lựa chọn và kết nối với những người chăm sóc người cao tuổi có chuyên môn, đạo đức và uy tín. Hệ thống tích hợp quy trình thẩm định đa tầng (eKYC, lý lịch tư pháp, chứng chỉ y tế), đánh giá thang điểm độc lập **ADL** và hệ thống chấm điểm tín nhiệm độc quyền **CARE SCORE**.

---

## 🚀 Công nghệ sử dụng (Tech Stack)

### Frontend
- **Framework & Ngôn ngữ:** React 18, TypeScript, Vite
- **Giao diện & Styling:** TailwindCSS, Radix UI primitives, Lucide Icons, Framer Motion
- **Quản lý Routing & State:** Wouter, TanStack React Query, Hook Form

### Backend & Database
- **Runtime & Server:** Node.js, Express.js (RESTful API tại cổng `5000`)
- **Cơ sở dữ liệu:** MySQL 8.x / MariaDB (`mysql2/promise`)
- **Tự động chuyển đổi:** Hỗ trợ kết nối trực tiếp MySQL, tự động chuyển về In-Memory Store dự phòng nếu chưa bật database.

---

## 🛠️ Hướng dẫn cài đặt & Khởi động dự án

### 1. Cài đặt thư viện phụ thuộc
Mở terminal tại thư mục gốc của dự án:
```bash
npm install
```

### 2. Thiết lập Cơ sở dữ liệu MySQL
1. Mở **XAMPP Control Panel** (hoặc MySQL Workbench/Laragon) và bấm **Start** dịch vụ **MySQL** (cổng mặc định `3306`).
2. Tạo database và nhập dữ liệu mẫu:
   - Mở cửa sổ **Shell** trong XAMPP hoặc terminal và chạy 2 tệp script:
     ```bash
     # Tạo database & các bảng
     mysql -u root < server/schema.sql

     # Nạp dữ liệu mẫu ban đầu
     mysql -u root < server/seed.sql
     ```
   *(Xem hướng dẫn chi tiết tại [HUONG_DAN_CAI_DAT_MYSQL.md](HUONG_DAN_CAI_DAT_MYSQL.md)).*
3. Kiểm tra tệp cấu hình `server/.env`:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=care_match_db
   DB_PORT=3306
   ```

### 3. Khởi động hệ thống (Cần chạy cả 2 tiến trình)

Để hệ thống hoạt động đầy đủ tính năng kết nối dữ liệu, bạn cần mở **2 cửa sổ Terminal**:

* **Terminal 1 - Khởi động Backend API (Port 5000):**
  ```bash
  npm run server
  ```
  *(Khi kết nối thành công, console sẽ báo `✅ [MySQL] Đã kết nối thành công đến cơ sở dữ liệu: care_match_db`)*

* **Terminal 2 - Khởi động Giao diện Frontend (Port 3000):**
  ```bash
  npm run dev
  ```

👉 **Truy cập ứng dụng:** Mở trình duyệt tại [http://localhost:3000](http://localhost:3000)

---

## 👥 Tài khoản thử nghiệm có sẵn

| Vai trò | Email đăng nhập | Mật khẩu | Mô tả quyền hạn |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin@carematch.vn` | `123456` | Thẩm định hồ sơ, cấp chứng chỉ eKYC, quản trị người dùng |
| **Gia đình (Khách hàng)** | `mai.nguyen@example.com` | `123456` | Quản lý hồ sơ người thân, tìm kiếm và đặt lịch chăm sóc |
| **Người chăm sóc (Caregiver)** | `lananh.care@example.com` | `123456` | Quản lý lịch ca làm việc, hồ sơ năng lực, điểm CARE SCORE |

---

## 📁 Cấu trúc thư mục

```text
khoinghiepsangtao/
├── public/                 # Tài nguyên tĩnh, favicon, assets
├── server/                 # Mã nguồn Backend API & Database
│   ├── .env                # Biến môi trường kết nối MySQL
│   ├── schema.sql          # Cấu trúc bảng MySQL
│   ├── seed.sql            # Dữ liệu khởi tạo ban đầu
│   ├── migrate.js          # Script migrate dữ liệu tự động
│   └── server.js           # Server Express.js và API RESTful
├── src/                    # Mã nguồn Giao diện Frontend
│   ├── components/         # Các components dùng chung (UI, form, modal)
│   ├── pages/              # Các trang giao diện (Dashboard, Matching, Admin...)
│   ├── hooks/              # Custom React Hooks
│   ├── lib/                # Utilities, cấu hình query client
│   ├── App.tsx             # Điều hướng chính và xử lý luồng giao diện
│   └── main.tsx            # Điểm khởi đầu ứng dụng React
├── HUONG_DAN_CAI_DAT_MYSQL.md # Tài liệu chi tiết hướng dẫn thiết lập DB
├── package.json            # Scripts và danh sách thư viện
└── README.md               # Tài liệu hướng dẫn dự án
```

---

## 🌟 Các tính năng nổi bật
- **Matching thông minh:** Gợi ý người chăm sóc phù hợp dựa trên vị trí địa lý, kỹ năng và nhu cầu bệnh lý.
- **Thẩm định hồ sơ đa tầng (eKYC):** Kiểm duyệt CCCD, Phiếu lý lịch tư pháp số 2, Giấy khám sức khỏe.
- **Theo dõi lịch trình trực quan:** Quản lý ca chăm sóc theo thời gian thực giữa gia đình và người chăm sóc.
- **Đánh giá sức khỏe toàn diện:** Khảo sát sinh hoạt hàng ngày (ADL) giúp lập phác đồ chăm sóc cá nhân hóa.
