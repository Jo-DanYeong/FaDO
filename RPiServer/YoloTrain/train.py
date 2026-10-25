
from pathlib import Path
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parent

def main():
    model = YOLO("yolo26n-cls.pt")

    model.train(
        data=str(BASE_DIR / "dataset"),
        epochs=50,
        imgsz=224,
        batch=4,
        device="cpu",
        workers=0,
        patience=10,
        project=str(BASE_DIR / "runs"),
        name="expression_v1"
    )

if __name__ == "__main__":
    main()
