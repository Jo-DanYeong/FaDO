
import time
from pathlib import Path

import cv2
from ultralytics import YOLO

# =============================
# 경로 설정
# =============================
MODEL_DIR = Path(r"C:\FaDO\RPiServer\models")

IMAGE_PATH = Path(
    r"C:\Users\daram\OneDrive\사진\카메라 앨범\test.jpg"
)

FACE_MODEL_PATH = MODEL_DIR / "face_detector.pt"
EXPRESSION_MODEL_PATH = MODEL_DIR / "expression.pt"

# =============================
# 모델 로딩
# =============================
face_model = YOLO(str(FACE_MODEL_PATH))
expression_model = YOLO(str(EXPRESSION_MODEL_PATH))

# =============================
# 테스트 이미지 로딩
# =============================
image = cv2.imread(str(IMAGE_PATH))

if image is None:
    raise FileNotFoundError(f"이미지를 불러올 수 없습니다: {IMAGE_PATH}")

height, width = image.shape[:2]

# =============================
# 추론 시작
# =============================
start = time.perf_counter()

# 1. 얼굴 객체 탐지
results = face_model.predict(
    source=image,
    imgsz=416,
    conf=0.35,
    device="cpu",
    verbose=False
)

detection = results[0]
detect_obj = 0

# =============================
# 2. 얼굴별 표정 분류
# =============================
if detection.boxes is not None:
    for box in detection.boxes:

        class_id = int(box.cls.item())
        class_name = detection.names[class_id]

        if class_name.lower() != "face":
            continue

        # 얼굴 좌표 추출
        x1, y1, x2, y2 = map(
            int,
            box.xyxy[0].tolist()
        )

        # 이미지 범위를 벗어나지 않게 보정
        x1 = max(0, min(x1, width))
        y1 = max(0, min(y1, height))
        x2 = max(0, min(x2, width))
        y2 = max(0, min(y2, height))

        if x2 <= x1 or y2 <= y1:
            continue

        face_image = image[y1:y2, x1:x2]

        # 3. 표정 분류 모델 실행
        expression_result = expression_model.predict(
            source=face_image,
            imgsz=160,
            device="cpu",
            verbose=False
        )[0]

        if expression_result.probs is None:
            continue

        expression_id = int(expression_result.probs.top1)
        expression_name = expression_result.names[expression_id]

        confidence = float(
            expression_result.probs.top1conf.item()
        )

        detect_obj += 1

        # 결과 출력
        print(f"\n얼굴 객체 {detect_obj}")
        print(f"표정 : {expression_name}")
        print(f"신뢰도 : {confidence:.3%}")

        # 이미지에 얼굴 박스 표시
        cv2.rectangle(
            image,
            (x1, y1),
            (x2, y2),
            (0, 255, 0),
            2
        )

        cv2.putText(
            image,
            f"{expression_name} {confidence:.8%}",
            (x1, max(y1 - 10, 20)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (0, 255, 0),
            2
        )

# =============================
# 결과 정리
# =============================
elapsed = time.perf_counter() - start

print("\nYOLO 추론 성공!")
print(f"총 추론 시간: {elapsed:.3f}초")
print(f"탐지된 얼굴 수: {detect_obj}")
