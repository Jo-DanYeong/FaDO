import test from 'node:test';
import assert from 'node:assert/strict';
import { streamCameraPreview } from '../src/services/cameraPreview.js';

const boundary = 'fado-test';
const header = { 'Content-Type': `multipart/x-mixed-replace; boundary="${boundary}"` };
const encoder = new TextEncoder();
const part = bytes => Buffer.concat([
  Buffer.from(`--${boundary}\r\nContent-Type: image/jpeg\r\nContent-Length: ${bytes.length}\r\n\r\n`),
  Buffer.from(bytes), Buffer.from('\r\n'),
]);
const options = { username: 'viewer', password: 'test#pass', onFrame() {} };

test('reads fragmented MJPEG frames through the authenticated same-origin relay and stops at abort', async t => {
  const frames = [[255, 216, 13, 10, 13, 10, 255, 217], [255, 216, 3, 255, 217]];
  const data = Buffer.concat(frames.map(part));
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) { for (let i = 0; i < data.length; i += 7) controller.enqueue(data.subarray(i, i + 7)); },
    cancel() { cancelled = true; },
  });
  const request = new AbortController();
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(url, '/api/v1/raspberry/camera/stream');
    assert.equal(init.headers.Authorization, `Basic ${btoa('viewer:test#pass')}`);
    assert.equal(init.redirect, 'error');
    assert.equal(init.signal, request.signal);
    return new Response(stream, { headers: header });
  });
  const blobs = [];
  await streamCameraPreview({ ...options, signal: request.signal, onFrame(frame) {
    blobs.push(frame);
    if (blobs.length === frames.length) request.abort();
  } });
  assert.equal(cancelled, true);
  assert.deepEqual(await Promise.all(blobs.map(async blob => Array.from(new Uint8Array(await blob.arrayBuffer())))), frames);
});

test('rejects auth failures and non-video proxy responses', async t => {
  let response = new Response(null, { status: 401 });
  t.mock.method(globalThis, 'fetch', async () => response);
  await assert.rejects(streamCameraPreview(options), /아이디와 비밀번호/);
  response = new Response(null, { status: 404 });
  await assert.rejects(streamCameraPreview(options), /아직 연결되지/);
  response = new Response('<html>proxy fallback</html>');
  await assert.rejects(streamCameraPreview(options), /영상 스트림/);
});

test('rejects an oversized frame before buffering its body', async t => {
  const frame = encoder.encode(`--${boundary}\r\nContent-Type: image/jpeg\r\nContent-Length: 2097153\r\n\r\n`);
  t.mock.method(globalThis, 'fetch', async () => new Response(frame, { headers: header }));
  await assert.rejects(streamCameraPreview(options), /프레임 형식/);
});
