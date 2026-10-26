from pathlib import Path

import cv2
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"
FACE_MODEL_PATH = MODEL_DIR / "face_detector.pt"
EXPRESSION_MODEL_PATH = MODEL_DIR / "expression.pt"

DEVICE = "cpu"
CAMERA_INDEX = 0
FRAME_SKIP = 3  # Run AI on every third frame to reduce CPU load.


def open_webcam():
    camera = cv2.VideoCapture(CAMERA_INDEX, cv2.CAP_DSHOW)
    if not camera.isOpened():
        camera.release()
        camera = cv2.VideoCapture(CAMERA_INDEX)

    if not camera.isOpened():
        raise RuntimeError(
            "Cannot open webcam. Close other camera apps or try CAMERA_INDEX = 1."
        )

    camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    return camera


def main():
    for model_path in (FACE_MODEL_PATH, EXPRESSION_MODEL_PATH):
        if not model_path.is_file():
            raise FileNotFoundError(f"Model file not found: {model_path}")

    face_model = YOLO(str(FACE_MODEL_PATH))
    expression_model = YOLO(str(EXPRESSION_MODEL_PATH))

    print("Face classes:", face_model.names)
    print("Expression classes:", expression_model.names)
    print("Press Q or Esc to quit.")

    camera = open_webcam()
    frame_number = 0
    predictions = []

    try:
        while True:
            ok, frame = camera.read()
            if not ok:
                print("Webcam frame read failed.")
                break

            frame = cv2.flip(frame, 1)
            image_height, image_width = frame.shape[:2]

            if frame_number % FRAME_SKIP == 0:
                predictions = []

                detection = face_model.predict(
                    source=frame,
                    imgsz=416,
                    conf=0.35,
                    device=DEVICE,
                    verbose=False,
                )[0]

                for box in detection.boxes:
                    class_id = int(box.cls.item())
                    class_name = str(detection.names[class_id]).lower()
                    if class_name != "face":
                        continue

                    x1, y1, x2, y2 = (int(v) for v in box.xyxy[0].tolist())
                    x1 = max(0, min(x1, image_width))
                    x2 = max(0, min(x2, image_width))
                    y1 = max(0, min(y1, image_height))
                    y2 = max(0, min(y2, image_height))
                    if x2 - x1 < 16 or y2 - y1 < 16:
                        continue

                    face_crop = frame[y1:y2, x1:x2]
                    result = expression_model.predict(
                        source=face_crop,
                        imgsz=160,
                        device=DEVICE,
                        verbose=False,
                    )[0]
                    if result.probs is None:
                        continue

                    expression_id = int(result.probs.top1)
                    expression_name = str(result.names[expression_id])
                    confidence = float(result.probs.top1conf.item())
                    predictions.append((x1, y1, x2, y2, expression_name, confidence))

            for x1, y1, x2, y2, expression_name, confidence in predictions:
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                label = f"{expression_name}: {confidence:.1%}"
                label_y = y1 - 10 if y1 >= 25 else min(y2 + 20, image_height - 5)
                cv2.putText(
                    frame,
                    label,
                    (x1, label_y),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    (0, 255, 0),
                    2,
                    cv2.LINE_AA,
                )

            cv2.imshow("FaDO - Face & Expression Test", frame)
            key = cv2.waitKey(1) & 0xFF
            if key in (ord("q"), 27):
                break
            frame_number += 1

    finally:
        camera.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
