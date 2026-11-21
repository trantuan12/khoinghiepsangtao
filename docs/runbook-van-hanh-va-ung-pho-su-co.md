# Runbook Vận Hành, Release/Rollback & Ứng Phó Sự Cố — CARE-MATCH

Tài liệu này cụ thể hóa **Giai đoạn 6**, **Mục 7 (Giới hạn công bố)** và **Mục 8 (Quy trình Release & Rollback)** trong [`docs/ke-hoach-nang-cap-kien-truc-va-kiem-thu.md`](ke-hoach-nang-cap-kien-truc-va-kiem-thu.md).

---

## 1. Bảng Giới Hạn Kỹ Thuật Công Bố & Thực Thi (System Limits)

Toàn bộ giới hạn dưới đây được cấu hình tại [`server/config/limits.js`](../server/config/limits.js), thực thi bởi [`server/validators/requestBoundsValidator.js`](../server/validators/requestBoundsValidator.js) và công bố công khai qua `GET /api/system/limits`:

| Hạng mục | Ngưỡng giới hạn | Mã phản hồi khi vượt ngưỡng |
|---|---|---|
| Kích thước JSON body thông thường | Tối đa `1.536 KB` (~1.5 MB) | `413 Payload Too Large` |
| Kích thước JSON body tải ảnh eKYC | Tối đa `6.144 KB` (6 MB) | `413 Payload Too Large` |
| Kích thước & định dạng tệp tải lên (`/api/upload`) | Tối đa `4 MB`, độ phân giải `<= 6000x6000 px`, kiểm tra chữ ký nhị phân (magic bytes) cho `PNG`, `JPEG`, `WEBP`, `PDF` | `400 Bad Request` / `413` |
| Kích thước ảnh AI Vision (`/api/ai/verify-document`) | Tối đa `3 MB`, chỉ nhận `PNG`, `JPEG`, `WEBP` hợp lệ | `400 Bad Request` / `413` |
| Độ dài chuỗi / mảng / độ sâu JSON | Chuỗi `<= 10.000` ký tự, mảng `<= 100` phần tử, độ sâu `<= 6` cấp | `400 Bad Request` |
| Tần suất gọi CareMatchAI (`/api/ai/*`) | `18 request / phút` và tối đa `3 request đồng thời` mỗi tài khoản/IP | `429 Too Many Requests` (`Retry-After`) |
| Hạn mức Token CareMatchAI mỗi ngày | `150.000 tokens / user (hoặc IP) / ngày` | `429 Too Many Requests` |
| Độ dài tin nhắn & lịch sử chat gửi lên AI | Tin nhắn `<= 4.000` ký tự; lịch sử cắt tối đa `6 lượt` gần nhất và `<= 2.400` ký tự | `200` (Guardrail cảnh báo) / tự động cắt gọn |
| Thời gian tối đa 1 request AI & số vòng gọi Tool | Timeout `18.000 ms` / model; tối đa `3 vòng` tool-calling | `504 Gateway Timeout` / fallback |
| Phân trang danh sách CSDL (`LIMIT / OFFSET`) | Mặc định `50 dòng/trang`, tối đa `100 dòng/lần truy vấn` | Tự động giới hạn + gắn header `X-Pagination-*` |
| Thử đăng nhập & xác thực OTP | Sai `5 lần` liên tiếp -> khóa tài khoản `15 phút` (`423 Locked`) hoặc hủy mã OTP | `401` / `423 Locked` / `429` (`15 req/phút`) |
| Thời gian sống Access Token & Refresh Token | Access Token: `15 phút` (gắn `token_version` + `jti`); Refresh Token: `7 ngày` (xoay vòng 1 lần dùng) | `401 Unauthorized` |
| Chính sách lưu trữ & tự động dọn dẹp (Retention) | `audit_logs`: `90 ngày`; `ai_metrics_logs`: `60 ngày`; `ai_training_logs` chưa duyệt: `30 ngày`; `auth_sessions` đã thu hồi: `7 ngày`; OTP hết hạn: `24 giờ` | Job `POST /api/admin/maintenance/run-retention` |

---

## 2. Quy Trình Release & Rollback (10 Bước Chuẩn)

### Trước khi Release
1. **Chạy Migration độc lập:**
   ```powershell
   node server/db/migrations.js
   ```
   Kiểm tra bảng `schema_migrations` đã ghi nhận phiên bản mới nhất (`20261119_01_indexes_and_security_hardening`).
2. **Chạy toàn bộ 3 bộ kiểm thử tự động (Security, AI Eval, Backtest & Load Test):**
   ```powershell
   npm run test:security
   npm run test:backtest
   npm run test:eval
   ```
3. **Build Frontend & kiểm tra Code-Splitting:**
   ```powershell
   npm run build
   ```
   Đảm bảo entry chunk `dist/assets/index-*.js` đã được tách nhỏ cùng các chunk `vendor-react`, `vendor-ui`, `vendor-icons` và các lazy route chunks.
4. **Kiểm tra Health-Check sau khi Deploy:**
   - `GET /api/health`
   - `GET /api/system/health-detailed`
   - `GET /api/system/limits`

### Khi cần Rollback khẩn cấp
1. **Rollback ứng dụng (Vercel / Git):**
   - Trên Vercel Dashboard → **Deployments** → chọn bản triển khai ổn định liền trước → bấm **Instant Rollback** (hoặc `git revert <commit_sha> && git push origin main`).
2. **Rollback Schema / Index nếu migration gây nghẽn:**
   - Toàn bộ thay đổi schema được thiết kế theo nguyên tắc **Backward-Compatible (Additive-Only)** (`ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).
   - Nếu cần gỡ index vừa tạo:
     ```sql
     DELETE FROM schema_migrations WHERE version = '20261119_01_indexes_and_security_hardening';
     ```
3. **Chạy lại `npm run test:security` sau rollback** để xác nhận không có lỗ hổng xác thực hoặc IDOR nào bị mở lại.

---

## 3. Quy Trình Ứng Phó Sự Cố (Incident Runbooks)

### 3.1. Sự cố nghi lộ `AUTH_SECRET` hoặc Token người dùng
1. Tạo `AUTH_SECRET` mới (64 ký tự hex ngẫu nhiên):
   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Cập nhật `AUTH_SECRET` trên **Vercel Environment Variables** và `server/.env`, sau đó Redeploy.
3. Thu hồi toàn bộ phiên đăng nhập hiện hành trong PostgreSQL:
   ```sql
   UPDATE users SET token_version = COALESCE(token_version, 1) + 1;
   UPDATE auth_sessions SET revoked_at = NOW() WHERE revoked_at IS NULL;
   ```
4. Kiểm tra `GET /api/admin/audit-logs` để rà soát các hành vi bất thường (`security.idor_blocked`, `auth.admin.login_failed`).

### 3.2. Quy trình Xoay Khóa Mã Hóa CCCD (`FIELD_ENCRYPTION_KEY` Rotation)
1. Đặt khóa hiện tại vào biến môi trường `FIELD_ENCRYPTION_KEY_OLD`.
2. Sinh khóa mới 64 ký tự hex và đặt vào `FIELD_ENCRYPTION_KEY`.
3. Gọi API quản trị (với quyền Admin):
   ```http
   POST /api/admin/maintenance/rotate-encryption-key
   ```
   Hệ thống sẽ tự động giải mã toàn bộ `id_number` trong `family_profiles` & `caregiver_profiles` bằng khóa cũ và mã hóa lại bằng khóa `AES-256-GCM` mới.
4. Xóa biến `FIELD_ENCRYPTION_KEY_OLD` sau khi hoàn tất.

### 3.3. Sự cố chạm giới hạn Quota AI (`429`) hoặc Chi phí tăng đột biến
1. Mở trang **Admin → Trung Tâm Tri Thức, Vector RAG & Giám Sát CareMatchAI** để kiểm tra số request, tổng token, tỷ lệ `cacheHits` và `guardrailBlocks`.
2. Hệ thống đã tự động:
   - Cô lập Response Cache cho câu hỏi phổ biến (`0ms` LLM cost khi trúng cache).
   - Bỏ qua gọi Embedding API cho các chunk không thay đổi nội dung (`skippedUnchanged`).
   - Giới hạn `18 req/phút` và `150.000 tokens/ngày` mỗi tài khoản/IP.
3. Nếu khóa `GEMINI_API_KEY` bị lộ hoặc hết quota, thay key mới trên Vercel mà không cần sửa code.

### 3.4. Sự cố Kết nối Cơ sở dữ liệu Supabase / Đầy bảng Log
1. Kiểm tra `GET /api/system/health-detailed` để xem `checks.database.latencyMs` và `memoryRssMb`.
2. Connection Pool đã được giới hạn an toàn (`max: 5` trên môi trường Serverless Vercel, `max: 10` trên Server thường) tương thích với Supabase Transaction Pooler (`port 6543`).
3. Chạy dọn dẹp dữ liệu hết hạn:
   ```http
   POST /api/admin/maintenance/run-retention
   ```
   để xóa các phiên đăng nhập hết hạn, OTP cũ và log quá thời hạn lưu trữ.
