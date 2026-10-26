from pathlib import Path

import torch
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parent

DATASET_DIR = BASE_DIR / "dataset"
RUNS_DIR = BASE_DIR / "runs"


def main():
    # GPU가 있으면 GPU, 없으면 CPU 사용
    device = 0 if torch.cuda.is_available() else "cpu"

    print(f"Using device: {device}")
    print(f"Dataset: {DATASET_DIR}")

    # 표정 분류 모델
    model = YOLO("yolo26n-cls.pt")

    model.train(
        data=str(DATASET_DIR),
        epochs=30,
        imgsz=224,
        batch=4,
        device=device,
        workers=0,
        patience=8,
        project=str(RUNS_DIR),
        name="expression_v1"
    )


if __name__ == "__main__":
    main()