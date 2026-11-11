import { useEffect, useRef, useState } from 'react';
import { useCamera } from './useCamera.js';
import { useDetection } from './useDetection.js';

export function useCameraRecognition(selectExpression) {
  const [source, setSource] = useState('local');
  const { camera, cameraPending, toggleCamera, stopCamera } = useCamera();
  const detection = useDetection(camera, selectExpression, source);
  const video = useRef(null);
  const remoteCamera = source === 'raspberry';

  useEffect(() => {
    const element = video.current;
    element.srcObject = camera;
    return () => { element.srcObject = null; };
  }, [camera]);

  function changeCameraSource(nextSource) {
    if (nextSource === source) return;
    detection.stopLive();
    stopCamera();
    setSource(nextSource);
  }

  return {
    ...detection, video, camera, cameraPending, remoteCamera, toggleCamera, changeCameraSource,
    cameraReady: remoteCamera || Boolean(camera),
    detect: () => detection.detect(video.current),
    startLive: () => detection.startLive(video.current),
  };
}
