# Kế hoạch nâng cấp kiến trúc CARE-MATCH

## 1. Mục tiêu

Kế hoạch này hướng tới các mục tiêu sau:

- Bảo vệ dữ liệu người dùng, dữ liệu y tế, CCCD và giao dịch.
- Chặn truy cập chéo tài khoản, giả mạo vai trò và lạm dụng API.
- Giảm truy vấn lặp vào PostgreSQL và giảm chi phí Gemini.
- Giữ thời gian phản hồi ổn định khi số người dùng tăng.
- Tách các phần nghiệp vụ để dễ bảo trì và triển khai.
- Kiểm chứng thay đổi bằng test tự động, test tải, backtest và kiểm tra production-like.

## 2. Phạm vi hiện tại

Hệ thống hiện gồm:

- Frontend React/Vite trong `src/`.
- Backend Express tập trung trong `server/server.js`.
- PostgreSQL/Supabase và pgvector.
- Gemini API cho chatbot, matching, tóm tắt nhật ký, eKYC và RAG.
- FastAPI AI service tùy chọn trong `ai-service/`.
- Pipeline QLoRA trong `training/`.
- Bộ kiểm thử AI và bảo mật trong `evals/`.

Các rủi ro kiến trúc chính là backend monolith lớn, nhiều script migration/seed, cache và rate limit phụ thuộc memory process, nhiều route cần tiếp tục rà soát quyền và chưa có test tải đầy đủ.

## 3. Nguyên tắc triển khai

- Mỗi thay đổi phải có rollback rõ ràng.
- Không sửa trực tiếp production database ngoài migration đã version hóa.
- Không đưa dữ liệu bệnh nhân thật vào bộ dữ liệu huấn luyện.
- Không dùng dữ liệu do frontend gửi để xác định quyền truy cập.
- Không triển khai thay đổi bảo mật cùng lúc với thay đổi nghiệp vụ lớn nếu chưa có test riêng.
- Đo số liệu trước và sau khi tối ưu.
- Giữ nguyên API contract hoặc tạo version mới nếu cần thay đổi breaking change.

## 4. Lộ trình thực hiện

### Giai đoạn 0 — Chuẩn bị và chụp trạng thái ban đầu

Thời gian dự kiến: 1–2 ngày.

Việc cần làm:

1. Tạo nhánh nâng cấp và tag phiên bản hiện tại.
2. Sao lưu database và kiểm tra khả năng restore.
3. Kiểm tra toàn bộ secrets trong Git, CI/CD, Railway, Vercel và Supabase.
4. Ghi nhận baseline:
   - thời gian tải trang ban đầu;
   - kích thước JavaScript bundle;
   - p50, p95 latency API;
   - số truy vấn trung bình mỗi request;
   - số kết nối database;
   - tỷ lệ lỗi HTTP 4xx/5xx;
   - token và chi phí AI mỗi request;
   - kích thước các bảng log và vector.
5. Chạy:

```powershell
npm run build
npm run test:security
npm run test:eval
```

Tiêu chí hoàn thành:

- Có bản backup đã thử restore.
- Có file baseline JSON được lưu cùng phiên bản.
- Security suite và LLM eval hiện tại đều chạy được.

### Giai đoạn 1 — Khóa các rủi ro bảo mật còn lại

Thời gian dự kiến: 3–5 ngày.

Việc cần làm:

1. Bắt buộc `AUTH_SECRET` và `FIELD_ENCRYPTION_KEY` trong production.
2. Xóa hoàn toàn mật khẩu admin hardcode.
3. Chặn mọi giá trị đăng ký `role` ngoài `family` và `caregiver`.
4. Kiểm tra tất cả route bằng `requireAuth` hoặc `createApiAccessGuard`.
5. Rà soát IDOR cho profile, schedule, care log, message, payment, upload, subscription và review.
6. Cấu hình trusted proxy để không tin `X-Forwarded-For` giả từ client.
7. Bắt buộc HTTPS production.
8. Kiểm tra CSP và loại bỏ dần `unsafe-inline`.
9. Bổ sung giới hạn độ dài chuỗi, số lượng phần tử và phạm vi số cho các body request.
10. Giới hạn quyền database user theo nguyên tắc tối thiểu.

Kiểm thử bắt buộc:

- Guest gọi API riêng tư phải nhận `401`.
- Family gọi API admin phải nhận `403`.
- User A đổi mọi ID thành User B phải nhận `403` hoặc `404` an toàn.
- Token hết hạn, sửa payload, replay refresh token và token sau logout phải bị từ chối.
- Đăng ký `role=admin` phải bị từ chối.
- Upload sai MIME, sai magic bytes và file quá lớn phải bị chặn.

### Giai đoạn 2 — Chuẩn hóa xác thực và dữ liệu nhạy cảm

Thời gian dự kiến: 3–5 ngày.

Việc cần làm:

1. Băm toàn bộ mật khẩu bằng bcrypt hoặc Argon2id.
2. Tạo migration kiểm tra và chuyển dữ liệu mật khẩu cũ.
3. Không trả `password_hash` về frontend.
4. Thiết lập chính sách mật khẩu, khóa tạm thời khi brute force và MFA cho admin.
5. Mã hóa các trường CCCD, giấy tờ và dữ liệu nhạy cảm cần bảo vệ.
6. Tách dữ liệu hiển thị công khai khỏi dữ liệu riêng tư bằng DTO hoặc serializer.
7. Thiết lập retention policy cho:
   - audit logs;
   - AI metrics;
   - training logs;
   - ảnh eKYC;
   - file upload.
8. Tạo job xóa hoặc archive dữ liệu hết hạn.

Tiêu chí hoàn thành:

- Không còn mật khẩu plain text.
- API public không trả email, điện thoại, CCCD hoặc địa chỉ riêng tư.
- Dữ liệu mã hóa có thể giải mã sau backup và restore.
- Có quy trình rotate encryption key.

### Giai đoạn 3 — Tối ưu database và giảm chi phí AI

Thời gian dự kiến: 4–7 ngày.

#### Tối ưu database

1. Chuẩn hóa migration thành một hệ thống duy nhất.
2. Không chạy migration và seed trong lúc server production khởi động.
3. Thay `SELECT *` bằng danh sách cột cụ thể.
4. Thêm index cho các trường thường dùng:
   - `users.email`, `users.username`;
   - `elderly_profiles.user_id`;
   - `schedules.family_user_id`;
   - `schedules.caregiver_user_id`;
   - `patient_care_logs.family_user_id`;
   - `patient_care_logs.caregiver_user_id`;
   - `transactions.family_user_id`;
   - `transactions.caregiver_user_id`;
   - các trường `status`, `created_at`, `schedule_date`.
5. Dùng `EXPLAIN ANALYZE` cho 20 truy vấn quan trọng nhất.
6. Bắt buộc phân trang và giới hạn tối đa cho mọi danh sách.
7. Dùng transaction cho đăng ký, đặt lịch, thanh toán và giải ngân.
8. Giảm kích thước connection pool phù hợp với Supabase pooler.
9. Dùng bảng tổng hợp hoặc job nền cho dashboard admin.

#### Giảm chi phí AI

1. Chỉ gửi các cột cần thiết cho Gemini.
2. Cắt lịch sử chatbot theo số lượt và số token.
3. Cache câu hỏi công khai.
4. Không cache nội dung có dữ liệu cá nhân.
5. Dùng model nhẹ cho phân loại hoặc tác vụ đơn giản.
6. Đặt giới hạn token theo user, IP và ngày.
7. Không gọi embedding lại nếu nội dung chưa thay đổi.
8. Chỉ reindex vector khi knowledge base hoặc hồ sơ có thay đổi.
9. Tách AI metrics khỏi request chính bằng queue hoặc job nền khi lưu lượng tăng.

Tiêu chí hoàn thành:

- Giảm ít nhất 30% số truy vấn lặp ở các màn hình thường dùng.
- Không có truy vấn không phân trang trong các bảng dữ liệu lớn.
- Chi phí token trung bình mỗi câu hỏi giảm tối thiểu 20% trên bộ dữ liệu baseline.

### Giai đoạn 4 — Tách backend monolith

Thời gian dự kiến: 1–2 tuần.

Không cần tách thành microservices ngay. Trước tiên tách theo module trong cùng một ứng dụng:

```text
server/
  routes/
  controllers/
  services/
  repositories/
  middleware/
  validators/
  jobs/
  db/
```

Thứ tự tách:

1. `auth` và session.
2. `users`, `family`, `caregiver`.
3. `schedules` và `care-logs`.
4. `payments`.
5. `messages` và `communities`.
6. `ai` và `rag`.
7. admin và audit.

Mỗi module cần có:

- route;
- validation;
- authorization;
- service nghiệp vụ;
- repository truy cập database;
- test riêng.

Tiêu chí hoàn thành:

- `server/server.js` chỉ còn bootstrap và đăng ký route.
- Không thay đổi hành vi API đã dùng bởi frontend.
- Mỗi module có thể test độc lập.

### Giai đoạn 5 — Tối ưu frontend

Thời gian dự kiến: 3–5 ngày.

1. Lazy-load các màn hình admin, thanh toán, AI Studio và quản lý cộng đồng.
2. Tách bundle theo route.
3. Chỉ tải chatbot sau khi người dùng mở.
4. Chuẩn hóa API client dùng chung cho token, lỗi và retry.
5. Loại bỏ các request lặp khi component mount.
6. Thêm loading, empty state và error state thống nhất.
7. Kiểm tra mobile và mạng chậm.

Mục tiêu:

- Giảm kích thước JavaScript tải ban đầu tối thiểu 25%.
- Không request dữ liệu màn hình chưa mở.
- First Contentful Paint và Largest Contentful Paint không tăng sau refactor.

### Giai đoạn 6 — Vận hành và mở rộng

Thời gian dự kiến: 3–5 ngày.

1. Đưa cache, rate limit và token quota sang Redis khi chạy nhiều instance.
2. Dùng queue cho audit, metrics, email và reindex vector.
3. Thiết lập health check cho API, database, Redis và Gemini.
4. Thiết lập cảnh báo lỗi, latency, database connections và AI cost.
5. Thiết lập backup tự động và diễn tập restore định kỳ.
6. Dùng rolling deploy hoặc canary deploy.
7. Có runbook cho sự cố token, database, AI quota và rò rỉ dữ liệu.

## 5. Ma trận kiểm thử

### Kiểm thử đơn vị

Phạm vi:

- token signing và verification;
- password hashing;
- IDOR guard;
- PII redaction;
- AES encryption/decryption;
- medical emergency rules;
- AI output schemas;
- cache key isolation;
- upload magic bytes.

Mục tiêu coverage cho phần bảo mật và nghiệp vụ quan trọng: tối thiểu 85%.

### Kiểm thử tích hợp

Kiểm tra:

- đăng ký, đăng nhập, refresh, logout;
- ownership của từng vai trò;
- đặt lịch và hủy lịch;
- thanh toán, escrow và payout;
- upload và eKYC;
- chatbot và tool calling;
- RAG và vector reindex;
- training log và export dataset.

### Kiểm thử bảo mật

Các nhóm bắt buộc:

- authentication bypass;
- privilege escalation;
- IDOR;
- SQL injection;
- prompt injection;
- XSS trong nội dung chat và knowledge base;
- CSRF nếu dùng cookie;
- brute force;
- rate limit bypass;
- upload file giả;
- rò rỉ PII;
- replay refresh token.

### Kiểm thử tải

Chạy ở môi trường staging với database clone:

| Kịch bản | Mức thử ban đầu | Tiêu chí |
|---|---:|---:|
| Health/API đọc | 50 request/giây | p95 dưới 500 ms |
| Danh sách chuyên viên | 20 request/giây | p95 dưới 800 ms |
| Chatbot có cache | 10 request/giây | p95 dưới 1 giây |
| Chatbot gọi Gemini | 2–5 request/giây | không vượt quota, lỗi dưới 2% |
| Đặt lịch | 5 request/giây | không tạo bản ghi trùng |
| Thanh toán | 2 request/giây | transaction nhất quán |
| Upload ảnh | 2 request/giây | không vượt memory limit |

Tăng tải theo từng nấc 25%, 50%, 75% và 100%. Dừng khi p95 vượt ngưỡng, error rate vượt 2% hoặc database connection pool gần cạn.

## 6. Backtest trước khi triển khai

### Backtest dữ liệu và quyền truy cập

Tạo dữ liệu giả lập gồm:

- 100 gia đình;
- 100 chuyên viên;
- 500 hồ sơ người cao tuổi;
- 2.000 lịch chăm sóc;
- 5.000 nhật ký chăm sóc;
- 5.000 giao dịch;
- 10.000 tin nhắn.

Chạy tự động các trường hợp:

1. User A đọc dữ liệu User B.
2. Caregiver đọc hồ sơ gia đình không liên quan.
3. Family sửa lịch của người khác.
4. Client gửi role admin.
5. Client gửi ID giả.
6. Token hết hạn hoặc bị sửa.
7. Replay refresh token.
8. Gọi API hàng loạt từ một IP.

Kết quả mong muốn là không có trường hợp lộ dữ liệu hoặc ghi sai ownership.

### Backtest nghiệp vụ

So sánh phiên bản cũ và mới trên cùng dataset:

- số lịch tạo thành công;
- số lịch bị trùng;
- số giao dịch giữ ký quỹ;
- số payout;
- số log chăm sóc;
- số thông báo;
- trạng thái eKYC;
- dữ liệu dashboard.

Hai phiên bản phải cho kết quả nghiệp vụ tương đương, ngoại trừ các trường hợp cố tình bị chặn vì bảo mật.

### Backtest AI

Dùng `evals/golden_dataset.json` và bổ sung tối thiểu:

- 100 câu hỏi chăm sóc y tế;
- 50 prompt injection tiếng Việt và tiếng Anh;
- 50 câu hỏi truy cập dữ liệu riêng tư;
- 50 câu hỏi tìm chuyên viên;
- 30 trường hợp AI trả JSON sai;
- 30 trường hợp database rỗng;
- 30 trường hợp dữ liệu sức khỏe thiếu.

Đo các chỉ số:

- tool-call accuracy;
- grounded answer rate;
- hallucinated ID rate;
- medical emergency recall;
- prompt injection block rate;
- schema validation pass rate;
- cache hit rate;
- p50/p95 latency;
- tokens/request;
- chi phí/request.

Ngưỡng đề xuất:

- hallucinated caregiver ID: 0%.
- dữ liệu riêng tư bị lộ: 0%.
- prompt injection vượt guardrail: 0% trong bộ test đã biết.
- cảnh báo cấp cứu bỏ sót: 0% trong bộ tình huống bắt buộc.
- schema output hợp lệ: ít nhất 99%.
- tool-call accuracy: ít nhất 95%.
- error rate API: dưới 1% ở tải mục tiêu.

### Backtest hiệu năng

Chạy cùng kịch bản trước và sau tối ưu, so sánh:

- số query/database request;
- thời gian query;
- số connection đồng thời;
- RAM và CPU backend;
- kích thước bundle;
- latency frontend;
- token và chi phí Gemini.

Chỉ chấp nhận thay đổi khi không làm tăng lỗi nghiệp vụ và đạt tối thiểu một trong các mục tiêu giảm tài nguyên.

## 7. Giới hạn phải công bố

Hệ thống cần công bố và thực thi các giới hạn sau:

- Kích thước request JSON tối đa.
- Kích thước và loại file upload được phép.
- Số request AI mỗi phút.
- Số token AI mỗi user mỗi ngày.
- Độ dài tin nhắn và lịch sử chat.
- Số dòng tối đa trong một lần truy vấn.
- Số lần thử đăng nhập và OTP.
- Thời gian sống access token và refresh token.
- Thời gian lưu audit log, ảnh và training log.
- Thời gian tối đa của một request AI.
- Số lượt tool calling tối đa cho mỗi câu hỏi.

Khi vượt giới hạn, API cần trả mã phù hợp như `400`, `401`, `403`, `413`, `429` hoặc `503`, kèm thông báo dễ hiểu và không tiết lộ thông tin nội bộ.

## 8. Quy trình release và rollback

1. Tạo migration và test migration trên database clone.
2. Chạy unit, integration, security, load và AI backtest.
3. Build frontend và kiểm tra bundle.
4. Deploy staging.
5. Chạy smoke test qua các luồng đăng nhập, đặt lịch, thanh toán và AI.
6. Chạy canary với một phần traffic.
7. Theo dõi lỗi, latency, cost và database connections.
8. Mở rộng traffic nếu đạt ngưỡng.
9. Rollback code và migration nếu vi phạm ngưỡng.
10. Kiểm tra lại dữ liệu sau rollback.

## 9. Điều kiện hoàn thành toàn bộ kế hoạch

Chỉ xem kế hoạch hoàn tất khi:

- Security suite đạt 100%.
- Không có lỗi IDOR trong toàn bộ route đã lập danh sách.
- Không còn mật khẩu plain text.
- Backup và restore thành công.
- Database migration chạy độc lập và có rollback.
- p95 API nằm trong ngưỡng đã thống nhất.
- AI không bịa ID hoặc lộ dữ liệu riêng tư trong bộ backtest.
- Có dashboard theo dõi lỗi, latency, quota và chi phí.
- Có tài liệu runbook cho sự cố bảo mật và sự cố database.

## 10. Thứ tự ưu tiên thực tế

Nếu nguồn lực hạn chế, thực hiện theo thứ tự:

1. Xác thực, RBAC, IDOR và secrets.
2. Mật khẩu, mã hóa PII và backup/restore.
3. Index, phân trang, transaction và migration.
4. Rate limit, upload limit và AI quota.
5. Security suite và backtest dữ liệu.
6. Redis, queue và observability nâng cao.
7. Tách module backend.
8. Tối ưu bundle frontend.
