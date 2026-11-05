"""Validate the deployable Pi TXT with fake models/camera; never open hardware."""
import concurrent.futures
import os
from pathlib import Path
import runpy
import sys
import threading
import types
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from fastapi.security import HTTPBasicCredentials

ROOT = Path(__file__).resolve().parents[1]
pipeline = types.ModuleType("RPiServer.Cam_test_Rpi")
pipeline.EXPRESSION_MODEL_PATH = Path("expression-model-not-opened")
pipeline.FACE_MODEL_PATH = Path("face-model-not-opened")
pipeline.draw_predictions = lambda *args: None
pipeline.open_camera = lambda *args: (_ for _ in ()).throw(AssertionError("Do not open camera"))
pipeline.predict_expressions = lambda *args: []
with patch.dict(sys.modules, {
    "cv2": types.ModuleType("cv2"),
    "ultralytics": types.SimpleNamespace(YOLO=None),
    "RPiServer.Cam_test_Rpi": pipeline,
}):
    module = runpy.run_path(str(ROOT / "docs" / "camera_stream.py.txt"))

Service = module["CameraStreamService"]


class CameraDetectionTests(unittest.TestCase):
    def test_cached_predictions_are_not_reused_for_consecutive_confirmation(self):
        service = Service()
        service._publish_predictions([(0, 0, 50, 50, "happy", 0.95)])
        waiting = threading.Event()
        original_wait = service._condition.wait_for

        def wait_for(predicate, timeout=None):
            waiting.set()
            return original_wait(predicate, timeout)

        with patch.object(service, "subscribe"), patch.object(service, "unsubscribe") as unsubscribe:
            with patch.object(service._condition, "wait_for", side_effect=wait_for):
                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                    future = pool.submit(service.detect_once, 1.0)
                    self.assertTrue(waiting.wait(1.0))
                    self.assertFalse(future.done(), "The cached happy result must not satisfy a new request")
                    service._publish_predictions([(5, 10, 90, 100, "sad", 0.8)])
                    self.assertEqual(future.result(timeout=1.0), {
                        "detections": [{"className": "sad", "confidence": 0.8, "box": [5, 10, 90, 100]}],
                    })
            unsubscribe.assert_called_once()

    def test_new_empty_prediction_is_a_real_no_face_result(self):
        service = Service()
        original_wait = service._condition.wait_for

        def publish_empty(predicate, timeout=None):
            service._publish_predictions([])
            return original_wait(predicate, timeout)

        with patch.object(service, "subscribe"), patch.object(service, "unsubscribe") as unsubscribe:
            with patch.object(service._condition, "wait_for", side_effect=publish_empty):
                self.assertEqual(service.detect_once(0.1), {"detections": []})
            unsubscribe.assert_called_once()

    def test_timeout_and_camera_error_release_the_subscription(self):
        for error, expected in [(None, 504), ("No camera", 503)]:
            service = Service()
            service._error = error
            with patch.object(service, "subscribe"), patch.object(service, "unsubscribe") as unsubscribe:
                with self.assertRaises(HTTPException) as caught:
                    service.detect_once(timeout=0.01)
                self.assertEqual(caught.exception.status_code, expected)
                unsubscribe.assert_called_once()

    def test_detection_route_keeps_existing_basic_auth(self):
        route = next(route for route in module["router"].routes if route.path == "/camera/detect")
        self.assertIn("POST", route.methods)
        self.assertTrue(any(dep.call is module["require_camera_auth"] for dep in route.dependant.dependencies))
        auth = module["require_camera_auth"]
        with patch.dict(os.environ, {"FADO_CAMERA_USER": "", "FADO_CAMERA_PASSWORD": ""}):
            with self.assertRaises(HTTPException) as caught:
                auth(None)
            self.assertEqual(caught.exception.status_code, 503)
        with patch.dict(os.environ, {"FADO_CAMERA_USER": "test-user", "FADO_CAMERA_PASSWORD": "test-password"}):
            with self.assertRaises(HTTPException) as caught:
                auth(HTTPBasicCredentials(username="test-user", password="wrong"))
            self.assertEqual(caught.exception.status_code, 401)
            auth(HTTPBasicCredentials(username="test-user", password="test-password"))


if __name__ == "__main__":
    unittest.main()
