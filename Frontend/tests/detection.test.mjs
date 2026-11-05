import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { captureCameraFrame, detectCameraFrame, detectRaspberryCamera } from '../src/services/detection.js';

const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
const originalFetch = globalThis.fetch;
let canvas;
let jpeg;
let drawn;
const video = { readyState: 4, videoWidth: 1280, videoHeight: 720 };

beforeEach(() => {
  drawn = [];
  jpeg = new Blob([new Uint8Array([255, 216, 255, 217])], { type: 'image/jpeg' });
  canvas = {
    getContext: () => ({ drawImage: (...args) => drawn.push(args) }),
    toBlob(callback, type, quality) {
      assert.equal(type, 'image/jpeg');
      assert.equal(quality, 0.85);
      callback(jpeg);
    },
  };
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { createElement: tag => { assert.equal(tag, 'canvas'); return canvas; } },
  });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
  else delete globalThis.document;
});

test('camera capture preserves aspect ratio and limits the longest edge to 640 pixels', async () => {
  assert.equal(await captureCameraFrame(video), jpeg);
  assert.equal(canvas.width, 640);
  assert.equal(canvas.height, 360);
  assert.deepEqual(drawn, [[video, 0, 0, 640, 360]]);
});

test('capture does not upscale small frames and rejects video that is not ready', async () => {
  await captureCameraFrame({ ...video, videoWidth: 320, videoHeight: 240 });
  assert.equal(canvas.width, 320);
  assert.equal(canvas.height, 240);
  for (const value of [null, { ...video, readyState: 1 }, { ...video, videoWidth: 0 }]) {
    await assert.rejects(captureCameraFrame(value), /카메라 영상이 준비되지/);
  }
});

test('capture reports unsupported canvas and encoding failure', async () => {
  canvas.toBlob = callback => callback(null);
  await assert.rejects(captureCameraFrame(video), /캡처에 실패/);
  canvas.getContext = () => null;
  await assert.rejects(captureCameraFrame(video), /이미지를 만들 수/);
});

test('inference sends one JPEG multipart file to Java and propagates the abort signal', async () => {
  const controller = new AbortController();
  const detections = [{ className: 'happy', confidence: 0.96, box: [0, 0, 100, 100] }];
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, ...options };
    return new Response(JSON.stringify({ detections }));
  };
  assert.deepEqual(await detectCameraFrame(jpeg, { signal: controller.signal }), detections);
  assert.equal(request.url, '/api/v1/detect');
  assert.equal(request.method, 'POST');
  assert.equal(request.signal, controller.signal);
  assert.equal(request.headers, undefined);
  assert.deepEqual([...request.body.keys()], ['file']);
  const file = request.body.get('file');
  assert.equal(file.name, 'camera-frame.jpg');
  assert.equal(file.type, 'image/jpeg');
  assert.deepEqual(await file.arrayBuffer(), await jpeg.arrayBuffer());
});

test('inference exposes server details and network failures for retry', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ detail: 'inference upstream unavailable' }), { status: 502 });
  await assert.rejects(detectCameraFrame(jpeg), /502.*inference upstream unavailable/);
  globalThis.fetch = async () => new Response('Bad Gateway', { status: 503 });
  await assert.rejects(detectCameraFrame(jpeg), /503/);
  globalThis.fetch = async () => { throw new TypeError('offline'); };
  await assert.rejects(detectCameraFrame(jpeg), /offline/);
});

test('inference accepts empty results and rejects malformed labels or confidence values', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ detections: [] }));
  assert.deepEqual(await detectCameraFrame(jpeg), []);
  for (const result of [{}, { detections: null }, { detections: [null] },
    { detections: [{ className: 'person', confidence: 1.1 }] },
    { detections: [{ className: 1, confidence: 0.5 }] }]) {
    globalThis.fetch = async () => new Response(JSON.stringify(result));
    await assert.rejects(detectCameraFrame(jpeg), /응답 형식/);
  }
});

test('Pi camera detection asks Java to capture on the Pi, without uploading a laptop image or credentials', async () => {
  const controller = new AbortController();
  const detections = [{ className: 'sad', confidence: 0.9, box: [0, 0, 120, 120] }];
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, ...options };
    return new Response(JSON.stringify({ detections }));
  };
  assert.deepEqual(await detectRaspberryCamera({ signal: controller.signal }), detections);
  assert.equal(request.url, '/api/v1/raspberry/camera/detect');
  assert.equal(request.method, 'POST');
  assert.equal(request.body, undefined);
  assert.equal(request.headers, undefined);
  assert.equal(request.cache, 'no-store');
  assert.equal(request.signal, controller.signal);
});

test('Pi detection exposes missing API, camera/auth failures and rejects invalid detection results', async () => {
  for (const status of [401, 404, 503, 504]) {
    globalThis.fetch = async () => new Response(JSON.stringify({ detail: 'camera unavailable' }), { status });
    await assert.rejects(detectRaspberryCamera(), new RegExp(`${status}.*camera unavailable`));
  }
  globalThis.fetch = async () => new Response(JSON.stringify({ detections: [{ className: 'happy', confidence: 2 }] }));
  await assert.rejects(detectRaspberryCamera(), /응답 형식/);
});
