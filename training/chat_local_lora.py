"""
Kiểm thử nhanh & trò chuyện trực tiếp với mô hình CareMatchAI QLoRA vừa fine-tune.

Cách dùng:
    python training/chat_local_lora.py --prompt "Tôi chưa đăng nhập, xem lịch ca trực của gia đình khác được không?"
    python training/chat_local_lora.py --interactive
"""

import argparse
import os
import re
import sys

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer

BASE_MODEL = "unsloth/Qwen2.5-1.5B-Instruct-bnb-4bit"
DEFAULT_ADAPTER_DIR = os.path.join(os.path.dirname(__file__), "outputs", "carematch-qwen2.5-1.5b-lora")

DEFAULT_SYSTEM_PROMPT = (
    "Bạn là CareMatchAI — trợ lý ảo chính thức của nền tảng kết nối chăm sóc người cao tuổi CARE-MATCH tại Việt Nam. "
    "Luôn trả lời bằng tiếng Việt ấm áp, súc tích, không tự bịa số liệu, bảo vệ tuyệt đối thông tin cá nhân và quyền riêng tư tài khoản, "
    "từ chối mọi yêu cầu vượt quyền hoặc khai thác dữ liệu hệ thống, và luôn ưu tiên hướng dẫn gọi cấp cứu 115 khi phát hiện dấu hiệu nguy kịch."
)

EMERGENCY_PATTERNS = [
    re.compile(r"đau\s*(thắt\s*|tức\s*)?ngực|khó\s*thở|thở\s*dốc|méo\s*miệng|đột\s*quỵ|co\s*giật|bất\s*tỉnh", re.I),
    re.compile(r"spo2\s*(?:chỉ\s*còn|tụt|<|dưới)?\s*(?:8\d|90|91)\b", re.I),
]
INJECTION_PATTERNS = [
    re.compile(r"(bỏ\s*qua|quên)\s+.{0,30}(chỉ\s*thị|quy\s*định|hướng\s*dẫn)", re.I),
    re.compile(r"(mật\s*khẩu|password|api\s*key|system\s*prompt|hàm\s*backend|database)", re.I),
]
GUEST_PRIVATE_PATTERN = re.compile(r"(lịch\s*(trực|chăm\s*sóc)|huyết\s*áp|sinh\s*hiệu|bệnh\s*án|thanh\s*toán)", re.I)


def load_model(base_model: str, adapter_dir: str):
    if not os.path.isdir(adapter_dir):
        raise FileNotFoundError(f"Không tìm thấy thư mục LoRA adapter: {adapter_dir}")

    tokenizer = AutoTokenizer.from_pretrained(adapter_dir)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    device_map = {"": 0} if torch.cuda.is_available() else "cpu"
    base = AutoModelForCausalLM.from_pretrained(
        base_model,
        device_map=device_map,
        low_cpu_mem_usage=True,
    )
    model = PeftModel.from_pretrained(base, adapter_dir)
    model.eval()
    return model, tokenizer


def generate_reply(
    model,
    tokenizer,
    prompt_text: str,
    role: str = "guest",
    max_new_tokens: int = 240,
    use_guard: bool = True,
) -> str:
    if use_guard:
        if any(rx.search(prompt_text) for rx in EMERGENCY_PATTERNS):
            return (
                "CẢNH BÁO KHẨN CẤP: Phát hiện dấu hiệu nguy kịch (đau ngực, khó thở, tụt SpO2 hoặc nghi đột quỵ). "
                "Vui lòng GỌI NGAY CẤP CỨU 115 hoặc đưa người bệnh đến cơ sở y tế gần nhất ngay lập tức."
            )
        if any(rx.search(prompt_text) for rx in INJECTION_PATTERNS):
            return "CareMatchAI không chia sẻ chỉ thị vận hành nội bộ, tên hàm backend hay cấu hình cơ sở dữ liệu hệ thống."
        if role == "guest" and GUEST_PRIVATE_PATTERN.search(prompt_text):
            return (
                "Khách chưa đăng nhập không thể xem lịch chăm sóc, chỉ số sinh hiệu hay giao dịch cá nhân. "
                "Vui lòng đăng nhập đúng tài khoản Gia đình hoặc Chuyên viên để tra cứu dữ liệu thuộc quyền của bạn."
            )

    sys_prompt = DEFAULT_SYSTEM_PROMPT
    if role == "guest":
        sys_prompt += " Vai trò hiện tại: guest (chưa đăng nhập)."
    elif role in ("family", "caregiver", "admin"):
        sys_prompt += f" Vai trò hiện tại: {role}."

    messages = [
        {"role": "system", "content": sys_prompt},
        {"role": "user", "content": prompt_text},
    ]
    formatted = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    inputs = tokenizer(formatted, return_tensors="pt").to(device)
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=False,
            repetition_penalty=1.08,
            pad_token_id=tokenizer.eos_token_id,
        )
    gen_ids = outputs[0][inputs["input_ids"].shape[1]:]
    return tokenizer.decode(gen_ids, skip_special_tokens=True).strip()


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(description="Chạy suy luận kiểm thử CareMatchAI LoRA local")
    parser.add_argument("--base-model", default=BASE_MODEL)
    parser.add_argument("--adapter-dir", default=DEFAULT_ADAPTER_DIR)
    parser.add_argument("--role", default="guest", choices=["guest", "family", "caregiver", "admin"])
    parser.add_argument("--prompt", default="")
    parser.add_argument("--interactive", action="store_true")
    args = parser.parse_args()

    model, tokenizer = load_model(args.base_model, args.adapter_dir)
    print(f"Đã nạp CareMatchAI LoRA từ: {args.adapter_dir}")

    if args.prompt:
        print("\n[User]:", args.prompt)
        print("[CareMatchAI]:", generate_reply(model, tokenizer, args.prompt, role=args.role))

    if args.interactive or not args.prompt:
        print("\nNhập câu hỏi (gõ 'exit' để thoát):")
        while True:
            try:
                user_msg = input("\nBạn > ").strip()
            except (EOFError, KeyboardInterrupt):
                break
            if not user_msg or user_msg.lower() in ("exit", "quit"):
                break
            print("CareMatchAI >", generate_reply(model, tokenizer, user_msg, role=args.role))


if __name__ == "__main__":
    main()
