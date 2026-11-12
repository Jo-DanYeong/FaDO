import logging
import math
import time
from pathlib import Path
from threading import Lock

logger = logging.getLogger("fado.oled")
NEUTRAL = "neutral"
RECOGNIZED_EXPRESSIONS = {"angry", "happy", NEUTRAL, "sad", "surprised"}
WEB_HOLD_SECONDS = 10.0


class LocalExpressionDisplay:
    def __init__(self, directory: Path, show_image):
        self.lock = Lock()
        self._directory = directory
        self._show_image = show_image
        self._resume_at = 0.0
        self._hold_token = None
        self._retry_at = 0.0
        self._candidate = None
        self._last_displayed = None

    def _defer(self):
        now = time.monotonic()
        if now >= self._resume_at:
            self._hold_token = None
        self._resume_at = now + WEB_HOLD_SECONDS
        self._candidate = None
        self._last_displayed = None

    def defer_to_web(self):
        with self.lock:
            self._defer()

    def can_update(self):
        with self.lock:
            return time.monotonic() >= self._resume_at

    def show_from_web(self, path: Path, hold_token: str | None = None):
        with self.lock:
            if not path.is_file():
                raise FileNotFoundError(path)
            self._show_image(path)
            self._defer()
            self._hold_token = hold_token

    def renew_hold(self, hold_token: str) -> bool:
        with self.lock:
            now = time.monotonic()
            if hold_token != self._hold_token or now >= self._resume_at:
                return False
            self._resume_at = now + WEB_HOLD_SECONDS
            return True

    def observe(self, predictions):
        with self.lock:
            now = time.monotonic()
            if now < max(self._resume_at, self._retry_at):
                return

            face = max(predictions, key=lambda item: (item[2] - item[0]) * (item[3] - item[1]), default=None)
            expression_id = NEUTRAL
            if face:
                label, confidence = face[4].lower(), face[5]
                if label in RECOGNIZED_EXPRESSIONS and math.isfinite(confidence) and confidence >= 0.55:
                    # Require the same expression in two consecutive model results.
                    previous = self._candidate
                    self._candidate = label
                    if previous != label:
                        return
                    expression_id = label
                else:
                    self._candidate = None
            else:
                self._candidate = None

            path = self._directory / f"{expression_id}.png"
            if expression_id != NEUTRAL and not path.is_file():
                path = self._directory / f"{NEUTRAL}.png"
            try:
                # Detect an updated PNG even when its expression ID did not change.
                version = (path, path.stat().st_mtime_ns)
                if version != self._last_displayed:
                    self._show_image(path)
                    self._last_displayed = version
            except (OSError, RuntimeError):
                logger.exception("Could not show local expression on the OLED: %s", path.name)
                self._retry_at = now + 5.0
