# 🌿 CARE-MATCH — Nền Tảng Chăm Sóc Người Cao Tuổi Tích Hợp **CareMatchAI**

> **Nền tảng số kết nối gia đình với điều dưỡng & người chăm sóc người cao tuổi đã qua thẩm định eKYC, đồng hành bởi trợ lý trí tuệ nhân tạo CareMatchAI (Hybrid Vector RAG + Live Database Tool Calling + Observability + Evaluation Harness).**

---

## 📌 Tổng Quan Dự Án

**CARE-MATCH** giải quyết bài toán tìm kiếm, đặt lịch, thanh toán minh bạch và theo dõi sức khỏe người cao tuổi tại nhà theo thời gian thực cho 3 nhóm người dùng:

| Vai trò | Chức năng cốt lõi | Tính năng **CareMatchAI** tích hợp |
|---|---|---|
| **Gia đình (`family`)** | Tạo hồ sơ người thân (thang **ADL**), tìm & đặt ca chăm sóc, thanh toán qua hệ thống, nhắn tin 1-1, theo dõi nhật ký sinh hiệu & nâng cấp gói **Care+ VIP** | • **Chatbot bong bóng toàn trang & mục Tin nhắn** (SSE Streaming + hỏi đáp lịch/sinh hiệu thật)<br>• **Tư vấn tìm chuyên viên bằng CareMatchAI** (`AI Care Matcher`) |
| **Chuyên viên (`caregiver`)** | Nộp hồ sơ **eKYC** (CCCD, chứng chỉ y tế, lý lịch tư pháp), nhận ca trực, gửi báo cáo sinh hiệu sau ca, tích điểm tín nhiệm **CARE SCORE** & theo dõi thu nhập | • **Kiểm tra sơ bộ ảnh eKYC** bằng Vision OCR (kiểm tra độ nét & tự điền số CCCD)<br>• **Chuẩn hóa báo cáo bàn giao sau ca** từ sinh hiệu + ghi chú nhanh<br>• **Chatbot CareMatchAI** tra lịch nhận ca & thu nhập |
| **Quản trị viên (`admin`)** | Duyệt hồ sơ eKYC & lịch phỏng vấn, điều phối lịch toàn hệ thống, theo dõi sức khỏe sau ca, quản lý giao dịch/cộng đồng & cấu hình hệ thống | • **Phân tích xu hướng sinh hiệu bệnh nhân**<br>• **Trung tâm Tri thức, Vector RAG & Giám sát CareMatchAI** (cấu hình tri thức tức thì, KPI token/độ trễ/guardrail, đồng bộ `pgvector`, xuất `.JSONL`) |

---

## 🧠 Kiến Trúc **CareMatchAI** (AI Engineering Architecture)

Hệ thống AI được thiết kế theo mô hình **Production AI Gateway**, kết hợp truy xuất dữ liệu sống (live SQL), tìm kiếm ngữ nghĩa Vector, kiểm soát an toàn và đo lường tự động:

```mermaid
flowchart LR
    UI["React UI<br/>(Chat Bubble, /messages, Matcher, eKYC, Admin Studio)"] -->|"POST /api/ai/chat/stream (SSE)"| GW["Express AI Gateway<br/>(server/server.js)"]
    GW --> GR["Guardrails & PII Redaction<br/>(server/aiGuardrails.js)"]
    GR -->|"Blocked"| REFUSE["Safe Refusal + Metric Log"]
    GR -->|"Safe"| CACHE["Response Cache (TTL 10m)<br/>(server/aiCache.js)"]
    CACHE -->|"Cache Hit"| UI
    CACHE -->|"Cache Miss"| LLM["LLM Orchestrator & Fallback<br/>(server/ai.js)"]
    LLM <-->|"Function Calling (Max 3 Rounds + RBAC)"| TOOLS["8 Live SQL & RAG Tools<br/>(server/aiTools.js)"]
    TOOLS <-->|"SQL Filters + RBAC"| PG[("Supabase PostgreSQL")]
    TOOLS <-->|"768d Cosine Similarity (HNSW)"| VEC[("pgvector<br/>ai_knowledge_chunks")]
    LLM -->|"Tokens, Latency, Cost"| METRICS[("ai_metrics_logs &<br/>ai_training_logs")]
```

### Các kỹ thuật AI cốt lõi đã triển khai

1. **Agentic Multi-turn Tool Calling + RBAC ([server/ai.js](server/ai.js), [server/aiTools.js](server/aiTools.js))**
   - Vòng lặp gọi công cụ tối đa 3 bước (bảo toàn `thoughtSignature` qua các lượt), cho phép chatbot tự động gọi 8 công cụ theo phân quyền vai trò (`guest`, `family`, `caregiver`, `admin`):
     - `search_caregivers`, `get_caregiver_detail`, `search_knowledge_base`
     - `get_my_elderly_profiles`, `get_my_schedules`, `get_patient_care_logs`, `get_my_payments`, `get_platform_info`
   - Cô lập quyền truy cập: tài khoản `guest` không thể truy xuất dữ liệu cá nhân; `family` và `caregiver` chỉ đọc đúng bản ghi thuộc `userId` của mình.

2. **Hybrid Semantic RAG trên Supabase `pgvector` ([server/rag.js](server/rag.js))**
   - Sử dụng `models/gemini-embedding-001` (`768` chiều) kết hợp bảng `ai_knowledge_chunks` (`vector(768)` + index HNSW cosine similarity trên `pgvector`).
   - Phối hợp **Vector Search + SQL Metadata Filter** để khớp đúng ý nghĩa bệnh lý (ví dụ: tìm *"đột quỵ liệt nửa người"* vẫn tìm ra hồ sơ chuyên viên ghi *"tai biến mạch máu não, phục hồi chức năng"*).

3. **SSE Streaming & Response Cache ([server/aiCache.js](server/aiCache.js), [src/components/CareMatchChatbot.tsx](src/components/CareMatchChatbot.tsx))**
   - Streaming Server-Sent Events qua `POST /api/ai/chat/stream` phát trạng thái tiến trình (`event: status`), từng cụm từ (`event: chunk`) và metadata (`event: done`).
   - Cache trong bộ nhớ (TTL 10 phút) cho câu hỏi thông tin công khai; tự động bỏ qua cache khi truy vấn dữ liệu cá nhân.

4. **Safety Guardrails, HMAC Auth RBAC, Schema Validation & Observability ([server/auth.js](server/auth.js), [server/aiGuardrails.js](server/aiGuardrails.js), [server/aiSchemas.js](server/aiSchemas.js), [src/components/CareMatchAiStudioCard.tsx](src/components/CareMatchAiStudioCard.tsx))**
   - **Xác thực phiên HMAC (HS256):** Mọi thao tác truy xuất dữ liệu cá nhân, phân tích sinh hiệu, kiểm tra eKYC và quản trị tri thức/dataset Admin đều xác thực token từ server, chống giả mạo vai trò/ID từ trình duyệt.
   - **Prompt Injection Defense & PII Redaction:** Chặn yêu cầu vượt quyền/tiết lộ system prompt; che số điện thoại, CCCD/CMND, email, mã tài khoản & tên riêng (`[PHONE_REDACTED]`, `[ID_REDACTED]`, `[EMAIL_REDACTED]`, `[REDACTED]`) trước khi ghi vào `ai_training_logs` (`is_approved = FALSE` mặc định, Admin duyệt thủ công).
   - **Strict Output Schema Validation:** Kiểm tra cấu trúc JSON trả về từ AI cho từng tác vụ (từ chối phản hồi thiếu trường bắt buộc với HTTP `502` thay vì fallback sai).
   - **Observability Dashboard:** Lưu `prompt_tokens`, `candidates_tokens`, `total_tokens`, `estimated_cost_usd`, `latency_ms`, `tools_used`, `cache_hit`, `guardrail_triggered` vào bảng `ai_metrics_logs` (`GET /api/ai/metrics`).

5. **Automated LLM & Security Evaluation Harness ([evals/run_eval.mjs](evals/run_eval.mjs), [evals/golden_dataset.json](evals/golden_dataset.json))**
   - Bộ kiểm thử tự động **10 kịch bản + 5 kiểm tra hồi quy bảo mật** (`hybrid_pgvector_rag`, `sql_tool_calling`, `rbac_live_data`, `rbac_isolation`, `auth_spoof_defense`, `medical_safety`, `security_guardrail`, `cache_hit`, `no_fake_vitals`, `schema_validation`).
   - Kết quả đo thực tế gần nhất ([evals/latest_report.json](evals/latest_report.json)):
     - **Pass Rate:** `100%` (10/10) · **Tool Selection Accuracy:** `100%` · **Security Assertions:** `5/5 Passed`
     - **Cache Hit Check:** `Passed` (`1308ms` so với `4595ms` lúc gọi LLM)
     - **Vector Chunks Indexed:** `17` · **P50 / P95 Latency:** `4063ms` / `11055ms`

6. **Python FastAPI AI Microservice & QLoRA Fine-Tuning Pipeline**
   - **`ai-service/`:** Microservice Python bất đồng bộ (FastAPI + Pydantic v2 + `httpx` + `psycopg`), cung cấp `/health`, `/v1/guardrails/check`, `/v1/embeddings`, `/v1/rag/search`, `/v1/chat`.
   - **`training/`:** Pipeline chuyển đổi dataset `.jsonl` xuất từ Admin sang định dạng ChatML (`prepare_dataset.py`) và script huấn luyện 4-bit NF4 **QLoRA** (`train_qlora.py`) cho `Qwen/Qwen2.5-3B-Instruct` bằng `transformers` + `peft` + `trl`.

---

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript, Vite 5, Tailwind CSS, Radix UI, Wouter, TanStack React Query, Lucide Icons, Framer Motion
- **Backend API:** Node.js, Express 5 (`server/server.js`), Vercel Serverless Entry (`api/index.js`), Nodemailer
- **Database & Vector Store:** Supabase PostgreSQL (`pg`) + `pgvector` (21 bảng trong `server/schema_postgres.sql`)
- **AI & ML Stack:** Google Gemini API (`gemini-3.1-flash-lite`, `gemini-embedding-001`), Python FastAPI (`ai-service/`), PyTorch / HuggingFace `peft` / `trl` (`training/`)

---

## 📁 Cấu Trúc Thư Mục

```text
khoinghiepsangtao/
├── api/
│   └── index.js                      # Vercel Serverless wrapper cho Express backend
├── server/
│   ├── server.js                     # Express API chính (Auth, Caregivers, Schedules, Messages, Payments, AI)
│   ├── auth.js                       # Xác thực HMAC token (HS256) & middleware requireAuth
│   ├── db.js                         # PostgreSQL pool & adapter truy vấn
│   ├── schema_postgres.sql           # Schema 21 bảng + pgvector + triggers
│   ├── ai.js                         # LLM gateway, fallback chain, usage tracking, Vision helper
│   ├── aiSchemas.js                  # Schema validators cho phản hồi JSON của AI
│   ├── aiTools.js                    # 8 SQL/RAG tools có RBAC & knowledge loader
│   ├── aiGuardrails.js               # Prompt Injection Guard, PII Redaction, Metrics logger
│   ├── aiCache.js                    # Response Cache cô lập theo user cho truy vấn công khai
│   ├── rag.js                        # Embedding + Vector Sync + pgvector cosine search
│   └── .env.example                  # Mẫu biến môi trường backend
├── src/
│   ├── App.tsx                       # Toàn bộ ứng dụng React (3 portals + Messages + Admin)
│   └── components/
│       ├── CareMatchChatbot.tsx      # Bong bóng chat toàn trang & ô chat CareMatchAI trong /messages (SSE)
│       ├── CareMatchAiStudioCard.tsx # Trung tâm Tri thức, Vector RAG & Observability cho Admin
│       ├── AiCareMatcherModal.tsx    # Modal tư vấn tìm chuyên viên bằng CareMatchAI
│       ├── CareLogsView.tsx          # Theo dõi sinh hiệu & CareMatchAI phân tích xu hướng
│       ├── CareShiftReportModal.tsx  # Báo cáo sau ca & CareMatchAI chuẩn hóa nội dung
│       └── CaregiverPortal.tsx       # Cổng chuyên viên & kiểm tra ảnh eKYC bằng CareMatchAI
├── evals/
│   ├── golden_dataset.json           # Tập kịch bản benchmark chuẩn
│   ├── run_eval.mjs                  # Script chạy đánh giá tự động CareMatchAI
│   └── latest_report.json            # Báo cáo kết quả benchmark mới nhất
├── ai-service/
│   ├── main.py                       # Python FastAPI AI Microservice
│   └── requirements.txt
└── training/
    ├── prepare_dataset.py            # Chuẩn hóa .jsonl sang ChatML train/val
    ├── train_qlora.py                # Script fine-tuning QLoRA (Qwen2.5-3B-Instruct)
    └── requirements.txt
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Dự Án

### 1. Cài đặt thư viện Node.js
```bash
npm install
```

### 2. Cấu hình môi trường (`server/.env`)
Sao chép mẫu cấu hình và điền thông số Supabase PostgreSQL + Gemini API Key của bạn:
```bash
cp server/.env.example server/.env
```
Các biến quan trọng trong `server/.env`:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
CLIENT_URL=http://localhost:3000
AUTH_SECRET=replace_with_a_strong_random_secret_at_least_32_characters_long
FIELD_ENCRYPTION_KEY=replace_with_32_byte_random_hex_or_base64_key
ADMIN_REQUIRE_MFA=false

EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM="CareMatch Vietnam" <no-reply@carematch.vn>

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.1-flash-lite
```

### 3. Khởi tạo Schema trên Supabase PostgreSQL
Chạy nội dung tệp [`server/schema_postgres.sql`](server/schema_postgres.sql) trong **Supabase SQL Editor** (hoặc server tự khởi tạo bảng bổ sung khi kết nối).

### 4. Chạy Local (Mở 2 Terminal)
- **Terminal 1 — Backend Express API (`http://localhost:5000`):**
  ```bash
  npm run server
  ```
- **Terminal 2 — Frontend Vite React (`http://localhost:3000`):**
  ```bash
  npm run dev
  ```

### 5. Build Production & Deploy Vercel
```bash
npm run build
```
Khi deploy lên **Vercel**:
- Cấu hình định tuyến đã sẵn sàng trong [`vercel.json`](vercel.json) (`/api/*` trỏ về [`api/index.js`](api/index.js)).
- Thêm đầy đủ các biến `DATABASE_URL`, `AUTH_SECRET` (>= 32 ký tự ngẫu nhiên), `FIELD_ENCRYPTION_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.1-flash-lite`, `CLIENT_URL` và cấu hình email vào **Vercel → Settings → Environment Variables** cho môi trường **Production**, sau đó **Redeploy**.

---

## 🛡️ Bảo mật, An toàn Y tế & Kiểm thử Tự động

- **Xác thực & Phiên an toàn:** Mật khẩu băm `bcrypt` (tự động nâng cấp tài khoản cũ, chặn mật khẩu yếu, khóa tạm thời khi sai 5 lần, hỗ trợ MFA/OTP cho Admin), Access Token ngắn hạn 15 phút kèm `token_version` + `jti` revocation và Refresh Token Rotation lưu trong `HttpOnly`, `SameSite=Lax` cookie (không lưu JWT trong `localStorage`).
- **Chống IDOR & Least Privilege:** Middleware tập trung [`server/idorGuards.js`](server/idorGuards.js) xác thực quyền sở hữu trên toàn bộ API (`schedules`, `care-logs`, `elderly-profiles`, `payments`, `messages`, `family-profile`, `caregiver-profile`, `export`), mã hóa số CCCD bằng `AES-256-GCM` at-rest và ghi `audit_logs`.
- **An toàn AI & Dữ liệu Y khoa:** Rule Engine y khoa cố định ưu tiên cảnh báo gọi `115` trước AI, kiểm tra chữ ký nhị phân (magic bytes) tệp ảnh eKYC, ép Gemini JSON `responseSchema` + đối chiếu ID/giá/quận từ DB, không tự điền sinh hiệu mặc định và tách hoàn toàn dữ liệu bệnh án khỏi dataset fine-tuning.

### Chạy Automated Security Suite (10 nhóm kịch bản bảo mật) & LLM Eval Suite
```bash
# Kiểm thử tự động 10 nhóm kịch bản RBAC, IDOR, Token, Rate-Limit, Magic-Bytes & AI Safety
$env:VERCEL="1"; node evals/security_test.mjs

# Kiểm thử đánh giá chất lượng RAG, Function Calling & Guardrails của CareMatchAI
$env:VERCEL="1"; node evals/run_eval.mjs
```
Kết quả đánh giá được xuất tại [`evals/latest_report.json`](evals/latest_report.json).

### Chạy Python FastAPI AI Microservice (Tuỳ chọn tách service)
```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
Xem Swagger docs tại `http://localhost:8000/docs`.

### Chuẩn bị dữ liệu & Fine-Tune QLoRA
1. Tải file `.jsonl` từ **Admin → Cấu hình Hệ thống → Tải Dataset (.JSONL)** (hoặc endpoint `GET /api/ai/export-finetune-jsonl`).
2. Chuẩn hóa sang định dạng ChatML `train.jsonl` / `val.jsonl`:
   ```bash
   cd training
   python prepare_dataset.py --input carematch_vertex_finetune.jsonl --train-out data/train.jsonl --val-out data/val.jsonl
   ```
3. Huấn luyện QLoRA trên GPU (Colab T4 16GB+):
   ```bash
   pip install -r requirements.txt
   python train_qlora.py --base-model Qwen/Qwen2.5-3B-Instruct --epochs 3
   ```
