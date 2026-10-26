import os
from io import BytesIO
from pathlib import Path
from threading import Lock

from fastapi import APIRouter, File, HTTPException, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError
from ultralytics import YOLO

router = APIRouter(prefix="/yolo", tags=["Face expression"])
MODEL_DIR = Path(__file__).resolve().parent / "models"
MODEL_FORMAT = os.getenv("FADO_MODEL_FORMAT", "ncnn").lower()
EXPRESSION_NAMES = {"angry", "happy", "neutral", "sad", "surprised"}
MAX_SIZE = 10 * 1024 * 1024
face_model = None
expression_model = None
model_lock = Lock()


def load_models():
    global face_model, expression_model
    if MODEL_FORMAT == "ncnn":
        face_path = MODEL_DIR / "face_detector_ncnn_model"
        expression_path = MODEL_DIR / "expression_ncnn_model"
        for directory in (face_path, expression_path):
            for name in ("model.ncnn.param", "model.ncnn.bin", "metadata.yaml"):
                if not (directory / name).is_file():
                    raise HTTPException(503, f"Missing model file: {directory.name}/{name}")
    elif MODEL_FORMAT == "pt":
        face_path = MODEL_DIR / "face_detector.pt"
        expression_path = MODEL_DIR / "expression.pt"
        if not face_path.is_file() or not expression_path.is_file():
            raise HTTPException(503, "Missing face_detector.pt or expression.pt")
    else:
        raise HTTPException(503, "FADO_MODEL_FORMAT must be ncnn or pt")

    if face_model is None:
        face_model = YOLO(str(face_path), task="detect")
    if expression_model is None:
        expression_model = YOLO(str(expression_path), task="classify")


@router.get("/model-info")
def model_info():
    return {
        "pipeline": "face-expression",
        "format": MODEL_FORMAT,
        "loaded": face_model is not None and expression_model is not None,
        "expressions": sorted(EXPRESSION_NAMES),
    }


@router.post("/predict")
def predict(file: UploadFile = File(...)):
    if file.content_type not in ("image/jpeg", "image/png"):
        raise HTTPException(415, "JPEG/PNG required")
    data = file.file.read(MAX_SIZE + 1)
    if not data:
        raise HTTPException(400, "Empty image")
    if len(data) > MAX_SIZE:
        raise HTTPException(413, "Image exceeds 10MB")

    try:
        with Image.open(BytesIO(data)) as raw:
            if raw.width * raw.height > 16_000_000:
                raise HTTPException(413, "Image resolution too large")
            image = ImageOps.exif_transpose(raw).convert("RGB")
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as error:
        raise HTTPException(400, "Invalid image") from error

    detections = []
    try:
        # Keep loading and inference serialized for a single Raspberry Pi worker.
        with model_lock:
            load_models()
            faces = face_model.predict(
                source=image, imgsz=416, conf=0.35, device="cpu", verbose=False
            )[0]
            if faces.boxes is not None:
                for box in faces.boxes:
                    face_class = int(box.cls.item())
                    if str(faces.names[face_class]).lower() != "face":
                        continue
                    x1, y1, x2, y2 = (int(value) for value in box.xyxy[0].tolist())
                    x1, x2 = max(0, min(x1, image.width)), max(0, min(x2, image.width))
                    y1, y2 = max(0, min(y1, image.height)), max(0, min(y2, image.height))
                    if x2 - x1 < 16 or y2 - y1 < 16:
                        continue
                    with image.crop((x1, y1, x2, y2)) as crop:
                        result = expression_model.predict(
                            source=crop, imgsz=160, device="cpu", verbose=False
                        )[0]
                    if result.probs is None:
                        raise HTTPException(500, "Expression model must use task=classify")
                    class_id = int(result.probs.top1)
                    label = str(result.names[class_id]).lower()
                    if label not in EXPRESSION_NAMES:
                        raise HTTPException(500, "Unexpected expression label; check the loaded model")
                    detections.append({
                        "classId": class_id,
                        "className": label,
                        "confidence": float(result.probs.top1conf.item()),
                        "box": [x1, y1, x2, y2],
                    })
    finally:
        image.close()

    return {
        "success": True,
        "pipeline": "face-expression",
        "count": len(detections),
        "detections": detections,
    }
