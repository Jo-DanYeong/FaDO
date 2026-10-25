
import time
from PIL import Image
from ultralytics import YOLO

# 모델 로딩
model = YOLO("yolo26n.pt")

# 테스트 이미지 생성
image = Image.new("RGB", (320, 320), "white")

# CPU 추론 테스트
start = time.perf_counter()

results = model.predict(
    source=image,
    imgsz=320,
    device="cpu",
    verbose=False
)

elapsed = time.perf_counter() - start

print("YOLO 추론 성공!")
print(f"첫 추론 시간: {elapsed:.3f}초")
print(f"탐지 객체 수: {len(results[0].boxes)}")
