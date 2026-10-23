export function createCamera({ onChange, notify, mediaDevices = navigator.mediaDevices }) {
  let stream = null;
  let pending = false;
  let requestId = 0;

  function publish() { onChange({ camera: stream, cameraPending: pending }); }
  function stopTracks(value) { value?.getTracks().forEach(track => track.stop()); }

  function stop() {
    requestId += 1;
    stopTracks(stream);
    stream = null;
    pending = false;
    publish();
  }

  async function toggle() {
    if (stream) { stop(); return; }
    if (pending) return;
    if (!mediaDevices?.getUserMedia) {
      notify('카메라를 사용할 수 없어요. localhost 또는 HTTPS에서 열어주세요.');
      return;
    }
    const id = ++requestId;
    pending = true;
    publish();
    try {
      const result = await mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      if (id !== requestId) { stopTracks(result); return; }
      stream = result;
    } catch (error) {
      if (id !== requestId) return;
      const messages = {
        NotAllowedError: '카메라 권한이 허용되지 않았어요. 브라우저 권한 설정을 확인해주세요.',
        NotFoundError: '사용 가능한 카메라를 찾지 못했어요.',
      };
      notify(messages[error.name] || '카메라를 열 수 없어요. 다른 앱에서 사용 중인지 확인해주세요.');
    } finally {
      if (id === requestId) { pending = false; publish(); }
    }
  }

  return { toggle, stop };
}
