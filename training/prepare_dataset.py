"""
Chuẩn bị dữ liệu Supervised Fine-Tuning (SFT) từ file export Vertex AI JSONL của CareMatch
sang định dạng `messages` chuẩn HuggingFace / TRL SFTTrainer, tự động lọc mẫu chất lượng và chia train/val.
"""

import argparse
import json
import random
from pathlib import Path


def convert_vertex_to_chatml(raw_path: Path, train_out: Path, val_out: Path, val_ratio: float = 0.15, seed: int = 42) -> None:
    samples = []
    with raw_path.open("r", encoding="utf-8") as f:
        for line_no, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            sys_text = ""
            sys_parts = row.get("systemInstruction", {}).get("parts", [])
            if sys_parts:
                sys_text = "\n".join(p.get("text", "") for p in sys_parts).strip()

            messages = []
            if sys_text:
                messages.append({"role": "system", "content": sys_text})

            for turn in row.get("contents", []):
                role = "assistant" if turn.get("role") == "model" else "user"
                text = "\n".join(p.get("text", "") for p in turn.get("parts", [])).strip()
                if text:
                    messages.append({"role": role, "content": text})

            if len(messages) >= 2:
                samples.append({"messages": messages})
            else:
                print(f"Bỏ qua dòng {line_no}: thiếu cặp user/assistant hợp lệ")

    random.Random(seed).shuffle(samples)
    val_count = max(1, int(len(samples) * val_ratio)) if len(samples) >= 5 else 0
    val_samples = samples[:val_count]
    train_samples = samples[val_count:] if val_count else samples

    train_out.parent.mkdir(parents=True, exist_ok=True)
    with train_out.open("w", encoding="utf-8") as ft:
        for item in train_samples:
            ft.write(json.dumps(item, ensure_ascii=False) + "\n")

    with val_out.open("w", encoding="utf-8") as fv:
        for item in val_samples:
            fv.write(json.dumps(item, ensure_ascii=False) + "\n")

    print(f"Hoàn tất chuẩn bị dataset: {len(train_samples)} train, {len(val_samples)} validation.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert CareMatch JSONL to ChatML SFT train/val splits")
    parser.add_argument("--input", type=Path, default=Path("carematch_vertex_finetune.jsonl"))
    parser.add_argument("--train-out", type=Path, default=Path("data/train.jsonl"))
    parser.add_argument("--val-out", type=Path, default=Path("data/val.jsonl"))
    parser.add_argument("--val-ratio", type=float, default=0.15)
    args = parser.parse_args()
    convert_vertex_to_chatml(args.input, args.train_out, args.val_out, args.val_ratio)
