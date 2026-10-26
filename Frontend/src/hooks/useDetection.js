import { useEffect, useRef, useState } from 'react';
import { useToast } from '../context/ToastContext.jsx';
import { captureCameraFrame, detectCameraFrame } from '../services/detection.js';

export function useDetection(camera) {
  const [detections, setDetections] = useState(null);
  const [pending, setPending] = useState(false);
  const controller = useRef(null);
  const notify = useToast();

  useEffect(() => {
    setDetections(null);
    setPending(false);
    return () => {
      controller.current?.abort();
      controller.current = null;
    };
  }, [camera]);

  async function detect(video) {
    if (!camera || controller.current) return;
    const request = new AbortController();
    controller.current = request;
    setPending(true);
    setDetections(null);
    try {
      const frame = await captureCameraFrame(video);
      if (request.signal.aborted) return;
      const result = await detectCameraFrame(frame, { signal: request.signal });
      if (!request.signal.aborted) setDetections(result);
    } catch (error) {
      if (!request.signal.aborted) notify(error.message || '인식 서버에 연결하지 못했어요.');
    } finally {
      if (controller.current === request) {
        controller.current = null;
        setPending(false);
      }
    }
  }

  return { detections, detectionPending: pending, detect };
}
