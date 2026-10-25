
from io import BytesIO
from pathlib import Path
from threading import Lock

from fastapi import APIRouter, UploadFile, File, HTTPException
from PIL import Image, ImageOps, UnidentifiedImageError
from ultralytics import YOLO


router = APIRouter(prefix="/yolo", tags=["YOLO"])

MODEL_PATH = (
    Path(__file__).resolve().parent
    / "models"
    / "yolo26n_ncnn_model"
)

model = None
model_lock = Lock()

MAX_SIZE = 10 * 1024 * 1024


@router.post("/predict")
def predict(file: UploadFile = File(...)):
    global model

    if file.content_type not in ("image/jpeg", "image/png"):
        raise HTTPException(415, "JPEG/PNG만 지원합니다.")

    data = file.file.read(MAX_SIZE + 1)

    if len(data) > MAX_SIZE:
        raise HTTPException(413, "파일 크기 초과")

    try:
        with Image.open(BytesIO(data)) as raw:
            if raw.width * raw.height > 16_000_000:
                raise HTTPException(413, "이미지 해상도 초과")
            image = ImageOps.exif_transpose(raw).convert("RGB")
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(400, "올바르지 않은 이미지")

    # 최초 요청 시 모델 로딩, 이후 재사용
    with model_lock:
        if model is None:
            model = YOLO(str(MODEL_PATH))

        result = model.predict(
            source=image,
            imgsz=320,
            conf=0.25,
            device="cpu",
            verbose=False
        )[0]

    detections = []

    for box in result.boxes:
        class_id = int(box.cls.item())

        detections.append({
            "classId": class_id,
            "className": result.names[class_id],
            "confidence": float(box.conf.item()),
            "box": box.xyxy[0].tolist()
        })

    return {
        "success": True,
        "count": len(detections),
        "detections": detections
    }
