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
LOCAL_BASE_MODEL = (os.getenv("LOCAL_BASE_MODEL") or "unsloth/Qwen2.5-1.5B-Instruct-bnb-4bit").strip()
LOCAL_LORA_ADAPTER_PATH = (os.getenv("LOCAL_LORA_ADAPTER_PATH") or "").strip()
USE_LOCAL_LORA = (os.getenv("USE_LOCAL_LORA") or "").strip().lower() in ("1", "true", "yes")

DEFAULT_SYSTEM_PROMPT = (
    "Bạn là CareMatchAI — trợ lý ảo chính thức của nền tảng kết nối chăm sóc người cao tuổi CARE-MATCH tại Việt Nam. "
    "Luôn trả lời bằng tiếng Việt ấm áp, súc tích, không tự bịa số liệu, bảo vệ tuyệt đối thông tin cá nhân và quyền riêng tư tài khoản, "
    "từ chối mọi yêu cầu vượt quyền hoặc khai thác dữ liệu hệ thống, và luôn ưu tiên hướng dẫn gọi cấp cứu 115 khi phát hiện dấu hiệu nguy kịch."
)

INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions?", re.I),
    re.compile(r"(drop|truncate|delete\s+from|alter)\s+table", re.I),
    re.compile(r"system\s+prompt|developer\s+message|hidden\s+instructions?", re.I),
    re.compile(r"(bỏ\s*qua|quên\s*hết)\s+(chỉ\s*thị|hướng\s*dẫn|quy\s*tắc)", re.I),
    re.compile(r"(liệt\s*kê|in\s*ra|show|dump|reveal|tiết\s*lộ)\s+.{0,30}(tool|function|schema|database|bảng|cột|api\s*key|token|env)", re.I),
    re.compile(r"(giả\s*vờ|nhập\s*vai|act\s+as|pretend\s+to\s+be)\s+.{0,30}(admin|quản\s*trị|developer|dan|root|system)", re.I),
    re.compile(r"(get_my_|get_patient_|get_caregiver_|ai_training_logs|admin_settings|care_logs|elderly_profiles)", re.I),
]

OUTPUT_SECRET_PATTERNS = [
    re.compile(r"\bAIza[0-9A-Za-z_-]{20,}\b"),
    re.compile(r"\bsk-[A-Za-z0-9]{20,}\b"),
    re.compile(r"postgres(ql)?://[^\s]+", re.I),
    re.compile(r"\b(vietqr_api_key|vietqr_client_id|AUTH_SECRET|SUPABASE_SERVICE_ROLE_KEY|GEMINI_API_KEY)\b", re.I),
    re.compile(r"\b(get_patient_care_logs|get_my_schedules|get_my_payments|get_my_elderly_profiles)\b"),
]

_LOCAL_LORA_CACHE: dict[str, Any] = {"model": None, "tokenizer": None, "adapter_path": None}

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


def inspect_output_safety(reply_text: str) -> tuple[bool, str]:
    text = str(reply_text or "")
    for rx in OUTPUT_SECRET_PATTERNS:
        if rx.search(text):
            return (
                False,
                "Xin lỗi, tôi không thể chia sẻ thông tin cấu hình kỹ thuật hoặc dữ liệu nội bộ của hệ thống. Tôi có thể hỗ trợ bạn tìm chuyên viên chăm sóc hoặc hướng dẫn sử dụng CARE-MATCH.",
            )
    return True, text


def _get_local_lora_bundle(adapter_path: str) -> tuple[Any, Any]:
    if (
        _LOCAL_LORA_CACHE["model"] is not None
        and _LOCAL_LORA_CACHE["tokenizer"] is not None
        and _LOCAL_LORA_CACHE["adapter_path"] == adapter_path
    ):
        return _LOCAL_LORA_CACHE["model"], _LOCAL_LORA_CACHE["tokenizer"]

    import torch
    from peft import PeftModel
    from transformers import AutoModelForCausalLM, AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(adapter_path)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    device_map = {"": 0} if torch.cuda.is_available() else "cpu"
    base_model = AutoModelForCausalLM.from_pretrained(
        LOCAL_BASE_MODEL,
        device_map=device_map,
        low_cpu_mem_usage=True,
    )
    model = PeftModel.from_pretrained(base_model, adapter_path)
    model.eval()
    _LOCAL_LORA_CACHE["model"] = model
    _LOCAL_LORA_CACHE["tokenizer"] = tokenizer
    _LOCAL_LORA_CACHE["adapter_path"] = adapter_path
    return model, tokenizer


def generate_local_lora_reply(body: ChatRequest, adapter_path: str) -> str:
    import torch

    if not adapter_path or not os.path.isdir(adapter_path):
        raise HTTPException(status_code=503, detail="Chưa tìm thấy LoRA adapter hợp lệ trên máy chủ.")

    model, tokenizer = _get_local_lora_bundle(adapter_path)
    sys_prompt = (body.system_instruction or DEFAULT_SYSTEM_PROMPT).strip()
    if body.user_role == "guest":
        sys_prompt += "\nNgười dùng hiện là KHÁCH vãng lai (chưa đăng nhập): chỉ được hướng dẫn chung và giới thiệu chuyên viên công khai, từ chối mọi yêu cầu xem dữ liệu cá nhân."

    messages = [{"role": "system", "content": sys_prompt}]
    for turn in body.history[-8:]:
        role = "assistant" if turn.role == "model" else "user"
        messages.append({"role": role, "content": turn.text})
    messages.append({"role": "user", "content": body.message})

    text_input = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    inputs = tokenizer(text_input, return_tensors="pt").to(device)
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=240,
            do_sample=False,
            repetition_penalty=1.08,
            pad_token_id=tokenizer.eos_token_id,
        )
    gen_ids = outputs[0][inputs["input_ids"].shape[1]:]
    return tokenizer.decode(gen_ids, skip_special_tokens=True).strip()


@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "carematchai-fastapi",
        "model": "CareMatchAI-Local-LoRA" if USE_LOCAL_LORA else GEMINI_MODEL,
        "embedding_model": EMBED_MODEL,
        "pg_configured": bool(DATABASE_URL and psycopg is not None),
        "local_lora_configured": bool(LOCAL_LORA_ADAPTER_PATH and os.path.isdir(LOCAL_LORA_ADAPTER_PATH)),
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


@app.post("/v1/chat/local")
async def chat_completion_local(body: ChatRequest) -> dict[str, Any]:
    guard = await check_guardrails(GuardrailRequest(text=body.message))
    if not guard.safe:
        return {
            "reply": "Xin lỗi, tôi không thể chia sẻ thông tin kỹ thuật nội bộ hay thực hiện yêu cầu vượt quyền. Tôi có thể hỗ trợ tìm chuyên viên chăm sóc hoặc hướng dẫn sử dụng CARE-MATCH.",
            "guardrail": guard.reason,
        }

    adapter_path = LOCAL_LORA_ADAPTER_PATH or os.path.join(
        os.path.dirname(__file__), "..", "training", "outputs", "carematch-qwen2.5-1.5b-lora"
    )
    t0 = time.perf_counter()
    raw_reply = generate_local_lora_reply(body, adapter_path)
    out_safe, safe_reply = inspect_output_safety(raw_reply)
    return {
        "reply": safe_reply,
        "engine": "local_qlora",
        "output_redacted": not out_safe,
        "latency_ms": round((time.perf_counter() - t0) * 1000),
    }


@app.post("/v1/chat")
async def chat_completion(body: ChatRequest) -> dict[str, Any]:
    guard = await check_guardrails(GuardrailRequest(text=body.message))
    if not guard.safe:
        return {
            "reply": "Xin lỗi, tôi không thể chia sẻ thông tin kỹ thuật nội bộ hay thực hiện yêu cầu vượt quyền. Tôi có thể hỗ trợ tìm chuyên viên chăm sóc hoặc hướng dẫn sử dụng CARE-MATCH.",
            "guardrail": guard.reason,
        }

    if USE_LOCAL_LORA:
        return await chat_completion_local(body)

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
    raw_reply = "".join(p.get("text", "") for p in parts).strip()
    out_safe, safe_reply = inspect_output_safety(raw_reply)
    usage = data.get("usageMetadata", {})

    return {
        "reply": safe_reply,
        "output_redacted": not out_safe,
        "latency_ms": round((time.perf_counter() - t0) * 1000),
        "usage": {
            "prompt_tokens": usage.get("promptTokenCount", 0),
            "candidates_tokens": usage.get("candidatesTokenCount", 0),
            "total_tokens": usage.get("totalTokenCount", 0),
        },
    }
