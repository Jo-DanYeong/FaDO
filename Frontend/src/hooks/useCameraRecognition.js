import { useCallback, useEffect, useRef } from 'react';
import { useCamera } from './useCamera.js';
import { useDetection } from './useDetection.js';

export function useCameraRecognition(selectExpression, autoStart = false) {
  const { camera, cameraPending, toggleCamera, stopCamera } = useCamera();
  const remoteCamera = !camera;
  const detection = useDetection(camera, selectExpression, remoteCamera ? 'raspberry' : 'local');
  const video = useRef(null);
  const autoStartHandled = useRef(false);
  const pendingStart = useRef(null);
  const { live, start, stopLive: stopDetection } = detection;
  const startLive = useCallback(() => {
    autoStartHandled.current = true;
    if (camera || pendingStart.current === 'raspberry') pendingStart.current = null;
    start(video.current, true);
  }, [camera, start]);
  const stopLive = useCallback(() => {
    autoStartHandled.current = true;
    pendingStart.current = null;
    stopDetection();
  }, [stopDetection]);
  const switchToRaspberryCamera = useCallback(() => {
    if (camera) {
      pendingStart.current = autoStart || live || pendingStart.current === 'local' ? 'raspberry' : null;
      stopDetection();
    } else if (cameraPending) {
      pendingStart.current = null;
    } else {
      return;
    }
    stopCamera();
  }, [autoStart, camera, cameraPending, live, stopCamera, stopDetection]);

  useEffect(() => {
    const element = video.current;
    element.srcObject = camera;
    return () => { element.srcObject = null; };
  }, [camera]);

  useEffect(() => {
    if (!camera) return;
    const tracks = camera.getTracks();
    tracks.forEach(track => track.addEventListener?.('ended', switchToRaspberryCamera));
    return () => tracks.forEach(track => track.removeEventListener?.('ended', switchToRaspberryCamera));
  }, [camera, switchToRaspberryCamera]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const shouldStart = camera
        ? pendingStart.current === 'local'
        : pendingStart.current === 'raspberry' || (autoStart && !autoStartHandled.current);
      if (shouldStart) startLive();
    });
    return () => { active = false; };
  }, [camera, autoStart, startLive]);

  return {
    ...detection, video, camera, cameraPending, remoteCamera,
    switchToRaspberryCamera,
    toggleLaptopCamera: () => {
      if (camera) {
        switchToRaspberryCamera();
      } else if (!cameraPending) {
        pendingStart.current = 'local';
        toggleCamera();
      }
    },
    detect: () => {
      autoStartHandled.current = true;
      if (camera || pendingStart.current === 'raspberry') pendingStart.current = null;
      start(video.current, false);
    },
    startLive,
    stopLive,
  };
}
