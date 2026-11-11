const PREVIEW_URL = '/api/v1/raspberry/camera/stream';
const HEADER_LIMIT = 4096;
const FRAME_LIMIT = 2 * 1024 * 1024;

function headerEnd(bytes) {
  for (let i = 0; i + 3 < bytes.length && i < HEADER_LIMIT; i++) {
    if (bytes[i] === 13 && bytes[i + 1] === 10 && bytes[i + 2] === 13 && bytes[i + 3] === 10) return i;
  }
  return -1;
}

export async function streamCameraPreview({ username, password, signal, onFrame }) {
  const credentials = new TextEncoder().encode(`${username}:${password}`);
  const authorization = `Basic ${btoa(Array.from(credentials, byte => String.fromCharCode(byte)).join(''))}`;
  const response = await fetch(PREVIEW_URL, {
    headers: { Authorization: authorization }, cache: 'no-store', redirect: 'error', signal,
  });
  if (response.status === 401 || response.status === 403) throw new Error('라파 카메라 아이디와 비밀번호를 확인해주세요.');
  if (response.status === 404) throw new Error('Java 서버에 카메라 미리보기 API가 아직 연결되지 않았어요.');
  if (!response.ok) throw new Error(`라파 카메라 영상을 열지 못했어요. (HTTP ${response.status})`);
  const type = response.headers.get('content-type') || '';
  const boundaryMatch = type.match(/;\s*boundary=(?:"([^"]+)"|([^;\s]+))/i);
  const boundary = boundaryMatch?.[1] || boundaryMatch?.[2];
  if (!type.toLowerCase().startsWith('multipart/x-mixed-replace;') || !boundary || !response.body) {
    await response.body?.cancel();
    throw new Error('라파가 영상 스트림을 반환하지 않았어요.');
  }

  const reader = response.body.getReader();
  const abortRead = () => { void reader.cancel().catch(() => {}); };
  signal?.addEventListener('abort', abortRead, { once: true });
  const decoder = new TextDecoder();
  let buffered = new Uint8Array();
  let frameLength = null;
  try {
    while (!signal?.aborted) {
      const { value, done } = await reader.read();
      if (done || signal?.aborted) break;
      const bytes = new Uint8Array(buffered.length + value.length);
      bytes.set(buffered);
      bytes.set(value, buffered.length);
      buffered = bytes;
      while (buffered.length) {
        if (frameLength === null) {
          const end = headerEnd(buffered);
          if (end < 0) {
            if (buffered.length > HEADER_LIMIT + 3) throw new Error('라파 영상 헤더가 올바르지 않아요.');
            break;
          }
          const header = decoder.decode(buffered.subarray(0, end)).trimStart();
          const length = Number(header.match(/^content-length:\s*(\d+)\s*$/im)?.[1]);
          if (!header.startsWith(`--${boundary}\r\n`) || !/^content-type:\s*image\/jpeg\s*$/im.test(header)
              || !Number.isInteger(length) || length < 1 || length > FRAME_LIMIT) {
            throw new Error('라파 영상 프레임 형식이 올바르지 않아요.');
          }
          frameLength = length;
          buffered = buffered.subarray(end + 4);
        }
        if (buffered.length < frameLength) break;
        if (signal?.aborted) return;
        onFrame(new Blob([buffered.subarray(0, frameLength)], { type: 'image/jpeg' }));
        buffered = buffered.subarray(frameLength);
        frameLength = null;
      }
      // Retain only the unfinished frame so consumed network chunks can be released.
      buffered = buffered.slice();
    }
  } finally {
    signal?.removeEventListener('abort', abortRead);
    try { await reader.cancel(); } catch { /* The HTTP connection may already be closed. */ }
    reader.releaseLock();
  }
  if (!signal?.aborted) throw new Error('라파 영상 연결이 종료됐어요.');
}
