import { useCallback, useEffect, useRef } from 'react';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { useCamera } from './useCamera.js';
import { useDetection } from './useDetection.js';

export function useCameraRecognition(selectExpression, autoStart = false) {
  const { autoDisplayEnabled, setAutoDisplayEnabled, setManualDisplayHold } = useWorkspace();
  const shouldAutoStart = autoStart && autoDisplayEnabled;
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
    setManualDisplayHold(null);
    start(video.current, true);
  }, [camera, setManualDisplayHold, start]);
  const stopLive = useCallback(() => {
    autoStartHandled.current = true;
    pendingStart.current = null;
    setAutoDisplayEnabled(false);
    stopDetection();
  }, [setAutoDisplayEnabled, stopDetection]);
  const switchToRaspberryCamera = useCallback(() => {
    if (camera) {
      pendingStart.current = shouldAutoStart || live || pendingStart.current === 'local' ? 'raspberry' : null;
      stopDetection();
    } else if (cameraPending) {
      pendingStart.current = null;
    } else {
      return;
    }
    stopCamera();
  }, [shouldAutoStart, camera, cameraPending, live, stopCamera, stopDetection]);

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
        : pendingStart.current === 'raspberry' || (shouldAutoStart && !autoStartHandled.current);
      if (shouldStart) startLive();
    });
    return () => { active = false; };
  }, [camera, shouldAutoStart, startLive]);

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
    startLive: () => {
      setAutoDisplayEnabled(true);
      startLive();
    },
    stopLive,
  };
}
