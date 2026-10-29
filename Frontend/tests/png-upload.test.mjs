import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createExpressionPng } from '../src/services/png.js';
import { deleteExpressionPng, sendExpression, uploadExpressionPng } from '../src/services/api.js';

const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
const originalFetch = globalThis.fetch;
const bitmap = Array(128 * 64).fill(0);
bitmap[0] = 1;
bitmap[bitmap.length - 1] = 1;
const expression = { id: 'custom-png-test', name: '직접 그린 표정', bitmap };
let canvas;
let rectangles;
let png;

beforeEach(() => {
  rectangles = [];
  png = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });
  const context = {
    clearRect() {},
    fillRect(...coordinates) {
      rectangles.push({ color: this.fillStyle, operation: this.globalCompositeOperation, coordinates });
    },
  };
  canvas = {
    getContext: () => context,
    toBlob(callback, type) {
      assert.equal(type, 'image/png');
      callback(png);
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

test('PNG generation preserves corner pixels at 128 by 64 and fills an opaque black background', async () => {
  assert.equal(await createExpressionPng(expression), png);
  assert.equal(canvas.width, 128);
  assert.equal(canvas.height, 64);
  assert.deepEqual(rectangles, [
    { color: '#ffffff', operation: undefined, coordinates: [0, 0, 1, 1] },
    { color: '#ffffff', operation: undefined, coordinates: [127, 63, 1, 1] },
    { color: '#000000', operation: 'destination-over', coordinates: [0, 0, 128, 64] },
  ]);
});

test('upload sends the generated PNG bytes and metadata as multipart without a manual Content-Type', async () => {
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, ...options };
    return new Response(null, { status: 204 });
  };
  await uploadExpressionPng(expression);
  assert.equal(request.url, '/api/v1/expression/image');
  assert.equal(request.method, 'POST');
  assert.equal(request.headers, undefined);
  assert.ok(request.body instanceof FormData);
  assert.equal(request.body.get('expressionId'), expression.id);
  assert.equal(request.body.get('name'), expression.name);
  const file = request.body.get('file');
  assert.equal(file.name, 'fado-custom-png-test.png');
  assert.equal(file.type, 'image/png');
  assert.deepEqual(await file.arrayBuffer(), await png.arrayBuffer());
});

test('PNG generation failures prevent any upload', async () => {
  globalThis.fetch = () => assert.fail('Failed PNG generation must not send a request');
  canvas.toBlob = callback => callback(null);
  await assert.rejects(uploadExpressionPng(expression), /이미지 생성에 실패/);
  canvas.getContext = () => null;
  await assert.rejects(createExpressionPng(expression), /만들 수 없는 환경/);
});

test('upload reports HTTP and network failures to its caller', async () => {
  globalThis.fetch = async () => new Response(null, { status: 503 });
  await assert.rejects(uploadExpressionPng(expression), /PNG 전송 실패: 503/);
  globalThis.fetch = async () => { throw new TypeError('network offline'); };
  await assert.rejects(uploadExpressionPng(expression), /network offline/);
});

test('stopping during PNG encoding prevents upload and an aborted command is never sent', async () => {
  const controller = new AbortController();
  let encoded;
  let calls = 0;
  canvas.toBlob = callback => { encoded = callback; };
  globalThis.fetch = async () => { calls += 1; return new Response(null, { status: 204 }); };
  const pending = uploadExpressionPng(expression, { signal: controller.signal });
  controller.abort();
  encoded(png);
  await assert.rejects(pending, { name: 'AbortError' });
  await assert.rejects(sendExpression('happy', { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(calls, 0);
});

test('PNG uploads and OLED commands share the live session abort signal', async () => {
  const controller = new AbortController();
  const signals = [];
  globalThis.fetch = async (url, options) => {
    signals.push(options.signal);
    return new Response(null, { status: 204 });
  };
  await uploadExpressionPng(expression, { signal: controller.signal });
  await sendExpression('happy', { signal: controller.signal });
  assert.deepEqual(signals, [controller.signal, controller.signal]);
});

test('delete sends an encoded expressionId query parameter without a multipart body', async () => {
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, ...options };
    return new Response(null, { status: 204 });
  };
  await deleteExpressionPng('custom-a&b?c');
  const url = new URL(request.url, 'http://localhost');
  assert.equal(url.pathname, '/api/v1/expression/image');
  assert.deepEqual([...url.searchParams], [['expressionId', 'custom-a&b?c']]);
  assert.equal(request.method, 'DELETE');
  assert.equal(request.body, undefined);
  assert.equal(request.headers, undefined);
});

test('delete propagates server and network errors, including a missing API endpoint', async () => {
  for (const status of [404, 503]) {
    globalThis.fetch = async () => new Response(null, { status });
    await assert.rejects(deleteExpressionPng(expression.id), new RegExp(`PNG 삭제 실패: ${status}`));
  }
  globalThis.fetch = async () => { throw new TypeError('network offline'); };
  await assert.rejects(deleteExpressionPng(expression.id), /network offline/);
});
