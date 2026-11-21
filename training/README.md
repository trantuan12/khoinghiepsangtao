# CareMatchAI QLoRA Fine-Tuning Pipeline

Quy trình chuẩn hóa dữ liệu và huấn luyện QLoRA cho **CareMatchAI** (`Qwen2.5-1.5B-Instruct` trên GPU 6GB VRAM như RTX 4050, hoặc `Qwen2.5-3B-Instruct` trên GPU >= 12GB).

## Bước 1: Tạo & làm sạch Dataset chuẩn ChatML

Chạy script tổng hợp dữ liệu công khai từ PostgreSQL kèm bộ mẫu phân quyền RBAC, chống Jailbreak, cấp cứu y khoa 115 và cẩm nang chăm sóc:

```powershell
node training/build_curated_dataset.mjs
```

Lệnh này đồng thời:
- Loại bỏ dữ liệu bệnh án nhạy cảm khỏi `ai_training_logs` và đồng bộ `system_instruction` chuẩn hóa sạch.
- Xuất sẵn `training/data/carematch_sft_curated.jsonl`, `training/data/train.jsonl` và `training/data/val.jsonl`.
- Cập nhật nhóm câu hỏi chuẩn (`admin-curated`) vào Supabase cho chatbot live.

*(Nếu muốn chuyển đổi file `.jsonl` tải từ trang Admin `GET /api/ai/export-finetune-jsonl`, dùng thêm: `python training/prepare_dataset.py --input carematch_finetune_dataset.jsonl --train-out training/data/train.jsonl --val-out training/data/val.jsonl`).*

## Bước 2: Huấn luyện QLoRA (4-bit NF4 + RSLoRA + Cosine LR)

```powershell
python training/train_qlora.py --base-model unsloth/Qwen2.5-1.5B-Instruct-bnb-4bit --epochs 5 --lr 1.5e-4 --lora-r 16 --lora-alpha 32
```

Tham số đã tinh chỉnh cho GPU 6GB VRAM (`RTX 4050`):
- `assistant_only_loss=True` (chỉ tính loss ở lượt trả lời của `assistant`, tránh lặp `system prompt`)
- `r=16`, `lora_alpha=32`, `use_rslora=True`, `lora_dropout=0.05`
- `lr=1.5e-4`, `lr_scheduler_type="cosine"`, `warmup_steps=4`, `weight_decay=0.02`, tắt nhiễu NEFTune trên tập nhỏ (`63` mẫu chuẩn)
- `per_device_train_batch_size=1`, `gradient_accumulation_steps=4`, `max_seq_length=768`, `gradient_checkpointing=True`, `optim="paged_adamw_8bit"`
- Sau khi train xong, script tự động đánh giá `eval_loss`, lưu adapter tại `training/outputs/carematch-qwen2.5-1.5b-lora` kèm `evals/qlora_training_report.json` và chạy 4 smoke-test chưa từng gặp.

## Bước 3: Kiểm thử suy luận cục bộ kèm bộ lọc an toàn

```powershell
python training/chat_local_lora.py --prompt "Quy trình thẩm định eKYC chuyên viên gồm mấy bước?"
python training/chat_local_lora.py --interactive
```

*(Tùy chọn: thiết lập `USE_LOCAL_LORA=1` và `LOCAL_LORA_ADAPTER_PATH` trong `ai-service/main.py` để phục vụ endpoint `POST /v1/chat/local` qua FastAPI khi triển khai trên máy chủ có GPU).*
