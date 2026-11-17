# CareMatchAI QLoRA Fine-Tuning Pipeline

Quy trình huấn luyện domain-specific từ dữ liệu tương tác thực tế của CARE-MATCH (`ai_training_logs`).

## Bước 1: Xuất dataset từ CareMatch Admin

Vào trang Admin → **Cấu hình Hệ thống & Bất biến** → **Tải Dataset (.JSONL)** (hoặc tải từ `GET /api/ai/export-finetune-jsonl`) và lưu thành `training/carematch_vertex_finetune.jsonl`.

## Bước 2: Chuyển đổi sang ChatML & chia tập train/val

```bash
cd training
python prepare_dataset.py --input carematch_vertex_finetune.jsonl --train-out data/train.jsonl --val-out data/val.jsonl
```

## Bước 3: Chạy QLoRA Fine-Tuning (Colab T4 / GPU >= 16GB)

```bash
pip install -r requirements.txt
python train_qlora.py --base-model Qwen/Qwen2.5-3B-Instruct --epochs 3
```
