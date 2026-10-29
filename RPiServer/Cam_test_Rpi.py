"""FaDO Raspberry Pi camera test: NCNN face detection + expression classification.

Examples:
    python RPiServer/webcam_test.py --camera usb --headless
    python RPiServer/webcam_test.py --camera csi --headless
    python RPiServer/webcam_test.py --camera usb --snapshot /tmp/fado_preview.jpg
"""

import argparse
import os
import time
from pathlib import Path

import cv2
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"
FACE_MODEL_PATH = MODEL_DIR / "face_detector_ncnn_model"
EXPRESSION_MODEL_PATH = MODEL_DIR / "expression_ncnn_model"

DEVICE = "cpu"
FRAME_SKIP = 3
DETECT_IMAGE_SIZE = 416
EXPRESSION_IMAGE_SIZE = 160


def open_camera(kind: str, index: int):
    """Return a (read, close) pair; frames are OpenCV BGR arrays."""
    if kind == "usb":
        camera = cv2.VideoCapture(index, cv2.CAP_V4L2)
        if not camera.isOpened():
            camera.release()
            camera = cv2.VideoCapture(index)
        if not camera.isOpened():
            camera.release()
            raise RuntimeError(f"Cannot open USB camera: /dev/video{index}")

        camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        camera.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        return camera.read, camera.release

    try:
        from picamera2 import Picamera2
    except ImportError as exc:
        raise RuntimeError(
            "Picamera2 is not available in this Python environment. "
            "Install python3-picamera2 and check your venv access."
        ) from exc

    picam2 = Picamera2()
    configuration = picam2.create_video_configuration(
        main={"size": (640, 480), "format": "RGB888"}
    )
    picam2.configure(configuration)
    picam2.start()

    # Picamera2 RGB888 capture_array() has B,G,R byte order: suitable for OpenCV.
    def read():
        return True, picam2.capture_array()

    def close():
        picam2.stop()
        picam2.close()

    return read, close


def predict_expressions(frame, face_model, expression_model):
    height, width = frame.shape[:2]
    predictions = []

    detection = face_model.predict(
        source=frame,
        imgsz=DETECT_IMAGE_SIZE,
        conf=0.35,
        max_det=3,
        device=DEVICE,
        verbose=False,
    )[0]

    if detection.boxes is None:
        return predictions

    for box in detection.boxes:
        class_id = int(box.cls.item())
        class_name = str(detection.names[class_id]).lower()
        if class_name != "face":
            continue

        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
        x1, x2 = max(0, min(x1, width)), max(0, min(x2, width))
        y1, y2 = max(0, min(y1, height)), max(0, min(y2, height))
        if x2 - x1 < 16 or y2 - y1 < 16:
            continue

        face_crop = frame[y1:y2, x1:x2]
        result = expression_model.predict(
            source=face_crop,
            imgsz=EXPRESSION_IMAGE_SIZE,
            device=DEVICE,
            verbose=False,
        )[0]
        if result.probs is None:
            continue

        expression_id = int(result.probs.top1)
        expression_name = str(result.names[expression_id])
        confidence = float(result.probs.top1conf.item())
        predictions.append((x1, y1, x2, y2, expression_name, confidence))

    return predictions


def draw_predictions(frame, predictions):
    height, _ = frame.shape[:2]
    for x1, y1, x2, y2, name, confidence in predictions:
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        label_y = y1 - 10 if y1 >= 25 else min(y2 + 20, height - 5)
        cv2.putText(
            frame,
            f"{name}: {confidence:.1%}",
            (x1, label_y),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (0, 255, 0),
            2,
            cv2.LINE_AA,
        )
    return frame


def main():
    parser = argparse.ArgumentParser(description="FaDO NCNN expression webcam test")
    parser.add_argument("--camera", choices=("usb", "csi"), default="usb")
    parser.add_argument("--index", type=int, default=0, help="USB camera index")
    parser.add_argument("--headless", action="store_true", help="Disable GUI window")
    parser.add_argument("--snapshot", type=Path, help="Optional preview JPEG path")
    args = parser.parse_args()

    for path in (FACE_MODEL_PATH, EXPRESSION_MODEL_PATH):
        if not path.is_dir():
            raise FileNotFoundError(f"Missing NCNN model directory: {path}")

    print("Loading NCNN models...", flush=True)
    face_model = YOLO(str(FACE_MODEL_PATH), task="detect")
    expression_model = YOLO(str(EXPRESSION_MODEL_PATH), task="classify")
    print("Face classes:", face_model.names, flush=True)
    print("Expression classes:", expression_model.names, flush=True)

    gui = not args.headless and bool(
        os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY")
    )
    print("Camera:", args.camera, "GUI:", gui, flush=True)
    if gui:
        print("Press Q or Esc to quit.", flush=True)
    else:
        print("Headless mode: results appear in terminal; Ctrl+C to stop.", flush=True)

    read_frame, close_camera = open_camera(args.camera, args.index)
    frame_number = 0
    predictions = []
    last_log = 0.0
    last_snapshot = 0.0

    try:
        while True:
            ok, frame = read_frame()
            if not ok:
                print("Camera frame read failed.", flush=True)
                break
            frame = cv2.flip(frame, 1)

            if frame_number % FRAME_SKIP == 0:
                predictions = predict_expressions(frame, face_model, expression_model)

            now = time.monotonic()
            if not gui and now - last_log >= 2:
                summary = [f"{name} ({score:.1%})" for *_, name, score in predictions]
                print(f"Faces: {len(predictions)} | Expressions: {summary}", flush=True)
                last_log = now

            if gui or args.snapshot:
                draw_predictions(frame, predictions)

            if args.snapshot and now - last_snapshot >= 10:
                args.snapshot.parent.mkdir(parents=True, exist_ok=True)
                cv2.imwrite(str(args.snapshot), frame)
                last_snapshot = now

            if gui:
                cv2.imshow("FaDO - Face & Expression (Raspberry Pi)", frame)
                key = cv2.waitKey(1) & 0xFF
                if key in (ord("q"), 27):
                    break

            frame_number += 1
    except KeyboardInterrupt:
        print("Stopped.", flush=True)
    finally:
        close_camera()
        if gui:
            cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
