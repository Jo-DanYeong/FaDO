from __future__ import annotations

import asyncio
import logging
import os
import secrets
import threading
import time
from typing import Annotated

import cv2
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from ultralytics import YOLO

from RPiServer.Cam_test_Rpi import (
    EXPRESSION_MODEL_PATH,
    FACE_MODEL_PATH,
    draw_predictions,
    open_camera,
    predict_expressions,
)

logger = logging.getLogger("fado.camera")
router = APIRouter(tags=["Camera"])
http_basic = HTTPBasic(auto_error=False)

CAMERA_KIND = os.getenv("FADO_CAMERA_KIND", "csi").lower()  # usb | csi
CAMERA_INDEX = int(os.getenv("FADO_CAMERA_INDEX", "0"))
IDLE_STOP_SECONDS = 20.0
JPEG_QUALITY = 70


def require_camera_auth(
    credentials: Annotated[HTTPBasicCredentials | None, Depends(http_basic)],
) -> None:
    username = os.getenv("FADO_CAMERA_USER", "")
    password = os.getenv("FADO_CAMERA_PASSWORD", "")
    if not username or not password:
        raise HTTPException(
            status_code=503,
            detail="Camera credentials are not configured on the server",
        )
    user_ok = credentials is not None and secrets.compare_digest(
        credentials.username.encode("utf-8"), username.encode("utf-8")
    )
    pass_ok = credentials is not None and secrets.compare_digest(
        credentials.password.encode("utf-8"), password.encode("utf-8")
    )
    if not (user_ok and pass_ok):
        raise HTTPException(
            status_code=401,
            detail="Camera authentication required",
            headers={"WWW-Authenticate": 'Basic realm="FaDO Camera"'},
        )


class CameraStreamService:
    """One hardware capture/NCNN inference worker, shared by all HTTP clients."""
    def __init__(self) -> None:
        self._condition = threading.Condition()
        self._worker: threading.Thread | None = None
        self._stop = threading.Event()
        self._jpeg: bytes | None = None
        self._sequence = 0
        self._clients = 0
        self._last_without_clients = time.monotonic()
        self._error: str | None = None

    def subscribe(self) -> None:
        with self._condition:
            self._clients += 1
            self._last_without_clients = time.monotonic()
            if self._worker is None or not self._worker.is_alive():
                self._stop.clear()
                self._jpeg = None
                self._sequence = 0
                self._error = None
                self._worker = threading.Thread(
                    target=self._capture_loop,
                    name="fado-camera-worker",
                    daemon=True,
                )
                self._worker.start()

    def unsubscribe(self) -> None:
        with self._condition:
            self._clients = max(0, self._clients - 1)
            if self._clients == 0:
                self._last_without_clients = time.monotonic()

    def wait_for_frame(self, last_sequence: int, timeout: float = 5.0):
        with self._condition:
            self._condition.wait_for(
                lambda: self._sequence > last_sequence or self._error is not None,
                timeout=timeout,
            )
            return self._sequence, self._jpeg, self._error

    def status(self) -> dict:
        with self._condition:
            return {
                "camera": CAMERA_KIND,
                "running": bool(self._worker and self._worker.is_alive()),
                "clients": self._clients,
                "framesProduced": self._sequence,
                "error": self._error,
            }

    def _capture_loop(self) -> None:
        close_camera = None
        try:
            if not FACE_MODEL_PATH.is_dir() or not EXPRESSION_MODEL_PATH.is_dir():
                raise FileNotFoundError(
                    f"NCNN model folders missing: {FACE_MODEL_PATH}, {EXPRESSION_MODEL_PATH}"
                )
            if CAMERA_KIND not in ("usb", "csi"):
                raise ValueError("FADO_CAMERA_KIND must be 'usb' or 'csi'")

            logger.info("Loading face and expression NCNN models")
            face_model = YOLO(str(FACE_MODEL_PATH), task="detect")
            expression_model = YOLO(str(EXPRESSION_MODEL_PATH), task="classify")
            read_frame, close_camera = open_camera(CAMERA_KIND, CAMERA_INDEX)
            logger.info("Camera open: kind=%s index=%d", CAMERA_KIND, CAMERA_INDEX)
            frame_count = 0
            predictions = []

            while not self._stop.is_set():
                with self._condition:
                    idle = self._clients == 0
                    if idle and time.monotonic() - self._last_without_clients >= IDLE_STOP_SECONDS:
                        break
                if idle:
                    # Do not run expensive inference while nobody is watching.
                    time.sleep(0.2)
                    continue

                ok, frame = read_frame()
                if not ok or frame is None:
                    raise RuntimeError("Camera frame read failed")
                frame = cv2.flip(frame, 1)

                # Reuse the existing two-stage NCNN pipeline; infer every third frame.
                if frame_count % 3 == 0:
                    predictions = predict_expressions(frame, face_model, expression_model)
                frame_count += 1

                draw_predictions(frame, predictions)
                encoded, buffer = cv2.imencode(
                    ".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY]
                )
                if encoded:
                    with self._condition:
                        self._jpeg = buffer.tobytes()
                        self._sequence += 1
                        self._condition.notify_all()
                time.sleep(0.05)

        except Exception as exc:
            logger.exception("FaDO camera worker stopped with an error")
            with self._condition:
                self._error = f"{type(exc).__name__}: {exc}"
                self._condition.notify_all()
        finally:
            if close_camera is not None:
                try:
                    close_camera()
                except Exception:
                    logger.exception("Failed to release camera")
            logger.info("FaDO camera worker exited")


camera_service = CameraStreamService()

CAMERA_PAGE = """<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>FaDO Camera</title>
<style>
body{margin:0;background:#10161e;color:#f0f3f7;font-family:system-ui,sans-serif;padding:2rem}
main{max-width:900px;margin:auto}h1{font-size:1.5rem}img{width:100%;height:auto;background:#202b35;border-radius:12px}
p{color:#aeb9c5;line-height:1.6}a{color:#92c5ff}
</style></head><body><main>
<h1>FaDO | 얼굴 탐지 및 표정 분류</h1>
<img src="/camera/stream" alt="카메라 연결 또는 NCNN 모델 로딩 중">
<p>모델 로딩 중에는 영상이 바로 표시되지 않을 수 있습니다. 화면이 계속 비어 있다면 <a href="/camera/status">카메라 상태</a>를 확인하세요.</p>
<p>이 화면은 승인된 사용자만 이용하세요. 창을 닫으면 연결이 종료되고, 다른 사용자가 없으면 카메라도 자동으로 종료됩니다.</p>
</main></body></html>"""


@router.get("/camera", response_class=HTMLResponse)
def camera_page(_: Annotated[None, Depends(require_camera_auth)]):
    return HTMLResponse(CAMERA_PAGE, headers={"Cache-Control": "no-store"})


@router.get("/camera/status")
def camera_status(_: Annotated[None, Depends(require_camera_auth)]):
    return camera_service.status()


@router.get("/camera/stream")
async def camera_stream(
    request: Request,
    _: Annotated[None, Depends(require_camera_auth)],
):
    async def generate_frames():
        camera_service.subscribe()
        last_sequence = 0
        try:
            while True:
                if await request.is_disconnected():
                    break
                seq, jpeg, error = await asyncio.to_thread(
                    camera_service.wait_for_frame, last_sequence, 4.0
                )
                if error:
                    logger.warning("Closing camera stream: %s", error)
                    break
                if jpeg is None or seq <= last_sequence:
                    continue
                last_sequence = seq
                yield (
                    b"--frame\r\n"
                    + b"Content-Type: image/jpeg\r\n"
                    + f"Content-Length: {len(jpeg)}\r\n\r\n".encode("ascii")
                    + jpeg + b"\r\n"
                )
        finally:
            camera_service.unsubscribe()

    return StreamingResponse(
        generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "Pragma": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
