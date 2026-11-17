"""
CARE-MATCH Python FastAPI AI Microservice
Cung cấp các endpoint AI tách biệt (Embeddings, Semantic RAG trên Supabase pgvector,
Guardrails kiểm tra an toàn Prompt/PII, và Async Chat Gateway) bằng FastAPI + Pydantic v2 + httpx.
"""

import os
import re
import time
from typing import Any, Literal, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

try:
    import psycopg
except ImportError:
    psycopg = None

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "server", ".env"))

GEMINI_API_KEY = (os.getenv("GEMINI_API_KEY") or "").strip()
GEMINI_MODEL = (os.getenv("GEMINI_MODEL") or "gemini-3.1-flash-lite").strip()
EMBED_MODEL = "models/gemini-embedding-001"
DATABASE_URL = (os.getenv("DATABASE_URL") or "").strip()

INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions?", re.I),
    re.compile(r"(drop|truncate|delete\s+from|alter)\s+table", re.I),
    re.compile(r"system\s+prompt|developer\s+message", re.I),
]

app = FastAPI(
    title="CareMatchAI Python Microservice",
    version="1.0.0",
    description="Async FastAPI AI Gateway với Pydantic validation, Vector RAG (pgvector) và Safety Guardrails.",
)


class GuardrailRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)


class GuardrailResponse(BaseModel):
    safe: bool
    reason: Optional[str] = None
    redacted_text: str


class EmbedRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)
    task_type: Literal["RETRIEVAL_QUERY", "RETRIEVAL_DOCUMENT"] = "RETRIEVAL_QUERY"
    dimensions: int = Field(default=768, ge=128, le=3072)


class SemanticSearchRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=1000)
    source_types: Optional[list[str]] = None
    limit: int = Field(default=5, ge=1, le=20)


class ChatTurn(BaseModel):
    role: Literal["user", "model"]
    text: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    history: list[ChatTurn] = Field(default_factory=list)
    user_role: Literal["guest", "family", "caregiver", "admin"] = "guest"
    system_instruction: Optional[str] = None


def redact_pii(text: str) -> str:
    text = re.sub(r"\b0\d{9,10}\b", "[PHONE_REDACTED]", text)
    text = re.sub(r"\b\d{12}\b", "[CCCD_REDACTED]", text)
    text = re.sub(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", "[EMAIL_REDACTED]", text)
    return text


async def fetch_embedding(text: str, task_type: str = "RETRIEVAL_QUERY", dim: int = 768) -> list[float]:
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="Chưa cấu hình GEMINI_API_KEY")

    url = f"https://generativelanguage.googleapis.com/v1beta/{EMBED_MODEL}:embedContent"
    payload = {
        "model": EMBED_MODEL,
        "content": {"parts": [{"text": text[:4000]}]},
        "taskType": task_type,
        "outputDimensionality": dim,
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(url, params={"key": GEMINI_API_KEY}, json=payload)
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text[:300])
    values = resp.json().get("embedding", {}).get("values") or []
    return values


@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "carematchai-fastapi",
        "model": GEMINI_MODEL,
        "embedding_model": EMBED_MODEL,
        "pg_configured": bool(DATABASE_URL and psycopg is not None),
    }


@app.post("/v1/guardrails/check", response_model=GuardrailResponse)
async def check_guardrails(body: GuardrailRequest) -> GuardrailResponse:
    reason = None
    for rx in INJECTION_PATTERNS:
        if rx.search(body.text):
            reason = "prompt_injection"
            break
    return GuardrailResponse(
        safe=reason is None,
        reason=reason,
        redacted_text=redact_pii(body.text),
    )


@app.post("/v1/embeddings")
async def create_embedding(body: EmbedRequest) -> dict[str, Any]:
    t0 = time.perf_counter()
    vec = await fetch_embedding(body.text, body.task_type, body.dimensions)
    return {
        "dimensions": len(vec),
        "latency_ms": round((time.perf_counter() - t0) * 1000),
        "values": vec,
    }


@app.post("/v1/rag/search")
async def rag_search(body: SemanticSearchRequest) -> dict[str, Any]:
    if not DATABASE_URL or psycopg is None:
        raise HTTPException(status_code=503, detail="DATABASE_URL hoặc psycopg chưa sẵn sàng")

    t0 = time.perf_counter()
    vec = await fetch_embedding(body.query, task_type="RETRIEVAL_QUERY", dim=768)
    vec_literal = "[" + ",".join(f"{v:.6f}" for v in vec) + "]"

    sql = """
        SELECT source_type, source_id, title, content, metadata,
               (1 - (embedding <=> %s::vector))::float AS similarity
        FROM ai_knowledge_chunks
        WHERE embedding IS NOT NULL
    """
    params: list[Any] = [vec_literal]
    if body.source_types:
        sql += " AND source_type = ANY(%s)"
        params.append(body.source_types)
    sql += " ORDER BY embedding <=> %s::vector ASC LIMIT %s"
    params.extend([vec_literal, body.limit])

    async with await psycopg.AsyncConnection.connect(DATABASE_URL) as conn:
        async with conn.cursor() as cur:
            await cur.execute(sql, params)
            rows = await cur.fetchall()

    results = [
        {
            "source_type": r[0],
            "source_id": r[1],
            "title": r[2],
            "content": r[3],
            "metadata": r[4],
            "similarity": round(float(r[5]), 4),
        }
        for r in rows
    ]
    return {
        "query": body.query,
        "count": len(results),
        "latency_ms": round((time.perf_counter() - t0) * 1000),
        "results": results,
    }


@app.post("/v1/chat")
async def chat_completion(body: ChatRequest) -> dict[str, Any]:
    guard = await check_guardrails(GuardrailRequest(text=body.message))
    if not guard.safe:
        return {"reply": "Yêu cầu không hợp lệ do vi phạm chính sách an toàn dữ liệu.", "guardrail": guard.reason}

    if not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="Chưa cấu hình GEMINI_API_KEY")

    t0 = time.perf_counter()
    contents = [{"role": m.role, "parts": [{"text": m.text}]} for m in body.history[-8:]]
    contents.append({"role": "user", "parts": [{"text": body.message}]})

    payload: dict[str, Any] = {
        "contents": contents,
        "generationConfig": {"temperature": 0.35},
    }
    if body.system_instruction:
        payload["systemInstruction"] = {"parts": [{"text": body.system_instruction}]}

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(url, params={"key": GEMINI_API_KEY}, json=payload)

    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail="Lỗi gọi mô hình AI")

    data = resp.json()
    parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    reply = "".join(p.get("text", "") for p in parts).strip()
    usage = data.get("usageMetadata", {})

    return {
        "reply": reply,
        "latency_ms": round((time.perf_counter() - t0) * 1000),
        "usage": {
            "prompt_tokens": usage.get("promptTokenCount", 0),
            "candidates_tokens": usage.get("candidatesTokenCount", 0),
            "total_tokens": usage.get("totalTokenCount", 0),
        },
    }
