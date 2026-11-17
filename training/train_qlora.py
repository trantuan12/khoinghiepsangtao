"""
QLoRA Fine-Tuning Script cho CareMatchAI (Open-Weight Domain Adaptation)
Huấn luyện Qwen2.5-3B-Instruct bằng 4-bit NF4 + LoRA trên dataset ChatML sinh từ CareMatch.
Phù hợp chạy trên Google Colab T4 GPU (16GB VRAM) hoặc GPU đơn.
"""

import argparse
from pathlib import Path

import torch
from datasets import load_dataset
from peft import LoraConfig, prepare_model_for_kbit_training
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig, TrainingArguments
from trl import SFTTrainer


def train(
    base_model: str,
    train_file: str,
    val_file: str,
    output_dir: str,
    epochs: int,
    learning_rate: float,
) -> None:
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16,
        bnb_4bit_use_double_quant=True,
    )

    tokenizer = AutoTokenizer.from_pretrained(base_model, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        base_model,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
    )
    model = prepare_model_for_kbit_training(model)

    lora_config = LoraConfig(
        r=16,
        lora_alpha=32,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    )

    data_files = {"train": train_file}
    if val_file and Path(val_file).exists() and Path(val_file).stat().st_size > 0:
        data_files["validation"] = val_file
    dataset = load_dataset("json", data_files=data_files)

    args = TrainingArguments(
        output_dir=output_dir,
        num_train_epochs=epochs,
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        learning_rate=learning_rate,
        warmup_ratio=0.05,
        logging_steps=5,
        save_strategy="epoch",
        eval_strategy="epoch" if "validation" in dataset else "no",
        fp16=not torch.cuda.is_bf16_supported(),
        bf16=torch.cuda.is_bf16_supported(),
        optim="paged_adamw_8bit",
        report_to="none",
    )

    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        args=args,
        train_dataset=dataset["train"],
        eval_dataset=dataset.get("validation"),
        peft_config=lora_config,
        max_seq_length=1536,
    )

    trainer.train()
    trainer.save_model(output_dir)
    tokenizer.save_pretrained(output_dir)
    print(f"Đã lưu QLoRA adapter tại: {output_dir}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="QLoRA Fine-Tuning for CareMatchAI")
    parser.add_argument("--base-model", default="Qwen/Qwen2.5-3B-Instruct")
    parser.add_argument("--train-file", default="data/train.jsonl")
    parser.add_argument("--val-file", default="data/val.jsonl")
    parser.add_argument("--output-dir", default="outputs/carematch-qwen2.5-3b-lora")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--lr", type=float, default=2e-4)
    opts = parser.parse_args()
    train(opts.base_model, opts.train_file, opts.val_file, opts.output_dir, opts.epochs, opts.lr)
