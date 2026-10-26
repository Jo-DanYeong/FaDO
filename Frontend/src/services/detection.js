export function captureCameraFrame(video) {
  return new Promise((resolve, reject) => {
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      reject(new Error('카메라 영상이 준비되지 않았어요. 영상이 보이면 다시 눌러주세요.'));
      return;
    }
    const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) { reject(new Error('카메라 이미지를 만들 수 없어요.')); return; }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) { reject(new Error('카메라 캡처에 실패했어요. 다시 시도해주세요.')); return; }
      resolve(blob);
    }, 'image/jpeg', 0.85);
  });
}

export async function detectCameraFrame(frame, { signal } = {}) {
  const body = new FormData();
  body.append('file', frame, 'camera-frame.jpg');
  const response = await fetch('/api/v1/detect', { method: 'POST', body, signal });
  if (!response.ok) {
    let detail;
    try {
      const error = await response.json();
      detail = typeof error.detail === 'string' ? error.detail : typeof error.message === 'string' ? error.message : '';
    } catch { /* Some proxies return a plain-text error body. */ }
    throw new Error(`인식 요청 실패: ${response.status}${detail ? ` (${detail})` : ''}`);
  }
  const result = await response.json();
  if (!Array.isArray(result?.detections) || result.detections.some(item =>
    typeof item?.className !== 'string' || !Number.isFinite(item.confidence)
    || item.confidence < 0 || item.confidence > 1
  )) {
    throw new Error('인식 서버의 응답 형식을 확인해주세요.');
  }
  return result.detections;
}
