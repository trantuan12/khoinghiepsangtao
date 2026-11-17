# CareMatchAI Python FastAPI Microservice

Microservice AI viết bằng **Python + FastAPI + Pydantic v2 + Async HTTPX + psycopg (pgvector)** phục vụ tách luồng xử lý AI khỏi Node.js backend khi mở rộng hạ tầng độc lập.

## Các Endpoint

- `GET /health` — Kiểm tra trạng thái service & kết nối Supabase.
- `POST /v1/guardrails/check` — Phát hiện Prompt Injection và che thông tin nhạy cảm PII (CCCD, SĐT, Email).
- `POST /v1/embeddings` — Sinh vector 768 chiều (`gemini-embedding-001`).
- `POST /v1/rag/search` — Truy vấn ngữ nghĩa trực tiếp từ bảng `ai_knowledge_chunks` trên Supabase `pgvector`.
- `POST /v1/chat` — Async chat completion kèm thống kê token usage & latency.

## Chạy local

```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Tài liệu Swagger UI tự động có tại: `http://localhost:8000/docs`.
