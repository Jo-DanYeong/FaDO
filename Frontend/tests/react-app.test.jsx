import React, { StrictMode, act } from 'react';
import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:3000/#studio', pretendToBeVisual: true });
for (const key of ['window', 'document', 'navigator', 'localStorage', 'HTMLElement', 'HTMLCanvasElement', 'Event', 'MouseEvent', 'KeyboardEvent']) {
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.scrollTo = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};
window.HTMLDialogElement.prototype.showModal = function showModal() { this.open = true; };
window.HTMLDialogElement.prototype.close = function close() { this.open = false; };
window.HTMLCanvasElement.prototype.getContext = () => ({
  fillRect() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, strokeRect() {}, drawImage() {},
  getImageData: () => ({ data: new Uint8ClampedArray(8192 * 4) }),
});

const { createRoot } = await import('react-dom/client');
const { App } = await import('../src/App.jsx');
const { WorkspaceProvider } = await import('../src/context/WorkspaceContext.jsx');
const { ToastProvider } = await import('../src/context/ToastContext.jsx');
const { createInitialWorkspace } = await import('../src/core/workspace.js');
const { defaultSettings } = await import('../src/services/storage.js');
const { presets } = await import('../src/data/presets.js');
const builtins = presets.map(item => ({ ...item, bitmap: Array(8192).fill(0) }));
const customExpression = {
  id: 'custom-delete-test', name: '삭제 테스트 표정', english: 'Custom', color: 'green', custom: true,
  note: '삭제 테스트', bitmap: Array(8192).fill(1),
};
let root;
const originalFetch = globalThis.fetch;
const originalMediaDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
let requests;

beforeEach(() => {
  requests = [];
  window.HTMLCanvasElement.prototype.toBlob = (callback, type) => {
    callback(new Blob([new Uint8Array([137, 80, 78, 71])], { type }));
  };
  globalThis.fetch = async (url, options) => {
    requests.push({ url, ...options });
    return new Response(null, { status: 204 });
  };
});

async function mount(page = 'studio', custom = [], selected = 'happy') {
  localStorage.clear();
  window.history.replaceState(null, '', `#${page}`);
  document.body.replaceChildren(document.createElement('div'));
  root = createRoot(document.body.firstElementChild);
  const state = createInitialWorkspace({ settings: { ...defaultSettings }, custom, selected }, builtins);
  await act(async () => root.render(<StrictMode><ToastProvider><WorkspaceProvider initialState={state}><App /></WorkspaceProvider></ToastProvider></StrictMode>));
}

afterEach(async () => {
  try {
    if (root) { await act(async () => root.unmount()); root = undefined; }
    document.body.replaceChildren();
  } finally {
    globalThis.fetch = originalFetch;
    if (originalMediaDevices) Object.defineProperty(navigator, 'mediaDevices', originalMediaDevices);
    else delete navigator.mediaDevices;
  }
});

function button(name) {
  const match = [...document.querySelectorAll('button')].find(element => element.getAttribute('aria-label') === name || element.textContent.trim() === name);
  assert.ok(match, `Button missing: ${name}`);
  return match;
}
async function click(element) {
  await act(async () => element.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
}
async function fill(input, value) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}
async function navigate(page) {
  await act(async () => {
    window.history.replaceState(null, '', `#${page}`);
    window.dispatchEvent(new window.Event('hashchange'));
  });
}

const requestId = request => request.body instanceof FormData
  ? request.body.get('expressionId') : JSON.parse(request.body).expressionId;

async function saveDrawing(name) {
  await click(button('새 표정 만들기'));
  const canvas = document.querySelector('#pixel-editor');
  await act(async () => {
    canvas.focus();
    canvas.dispatchEvent(new window.KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
  });
  await fill(document.querySelector('#expression-name'), name);
  await act(async () => document.querySelector('#expression-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
  return JSON.parse(localStorage.getItem('fado.workspace.v1')).custom.find(item => item.name === name);
}

test('buttons and numeric shortcuts automatically save PNG before selecting the expression', async () => {
  await mount();
  await click(button('슬퍼요 표정 선택'));
  assert.equal(button('슬퍼요 표정 선택').getAttribute('aria-pressed'), 'true');
  assert.equal(document.querySelector('.large-face').getAttribute('aria-label'), '현재 표정: 슬퍼요');
  await act(async () => document.dispatchEvent(new window.KeyboardEvent('keydown', { key: '6', bubbles: true })));
  assert.equal(button('좋아해요 표정 선택').getAttribute('aria-pressed'), 'true');
  assert.equal(JSON.parse(localStorage.getItem('fado.workspace.v1')).selected, 'love');
  assert.deepEqual(requests.map(requestId), ['sad', 'sad', 'love', 'love']);
  assert.deepEqual(requests.map(request => request.url), [
    '/api/v1/expression/image', '/api/v1/expression',
    '/api/v1/expression/image', '/api/v1/expression',
  ]);
  for (const request of [requests[0], requests[2]]) {
    assert.equal(request.body.get('file').type, 'image/png');
    assert.equal(request.headers, undefined);
  }
  for (const request of [requests[1], requests[3]]) {
    assert.equal(request.method, 'POST');
    assert.equal(request.headers['Content-Type'], 'application/json');
  }
});

test('rapid selections are sent in order and the last selection stays selected', async () => {
  const pending = [];
  globalThis.fetch = (url, options) => new Promise(resolve => {
    pending.push({ url, id: requestId(options), resolve });
  });
  await mount();
  await click(button('슬퍼요 표정 선택'));
  await click(button('화났어요 표정 선택'));
  assert.deepEqual(pending.map(request => request.id), ['sad']);
  assert.equal(JSON.parse(localStorage.getItem('fado.workspace.v1')).selected, 'happy');

  await act(async () => pending[0].resolve(new Response(null, { status: 204 })));
  assert.deepEqual(pending.map(request => request.id), ['sad', 'sad']);
  assert.equal(pending[1].url, '/api/v1/expression');
  assert.equal(JSON.parse(localStorage.getItem('fado.workspace.v1')).selected, 'happy');
  await act(async () => pending[1].resolve(new Response(null, { status: 204 })));
  assert.deepEqual(pending.map(request => request.id), ['sad', 'sad', 'angry']);
  assert.equal(JSON.parse(localStorage.getItem('fado.workspace.v1')).selected, 'sad');
  await act(async () => pending[2].resolve(new Response(null, { status: 204 })));
  await act(async () => pending[3].resolve(new Response(null, { status: 204 })));
  assert.equal(button('화났어요 표정 선택').getAttribute('aria-pressed'), 'true');
  assert.equal(JSON.parse(localStorage.getItem('fado.workspace.v1')).selected, 'angry');
});

test('network and HTTP failures preserve selection and do not block later requests', async () => {
  globalThis.fetch = async (url, options) => {
    requests.push({ url, ...options });
    if (requests.length === 1) throw new TypeError('네트워크 연결 실패');
    return new Response(null, { status: requests.length === 2 ? 503 : 204 });
  };
  await mount();
  await click(button('슬퍼요 표정 선택'));
  assert.equal(JSON.parse(localStorage.getItem('fado.workspace.v1')).selected, 'happy');
  assert.match(document.querySelector('#toast').textContent, /네트워크 연결 실패/);
  await act(async () => document.dispatchEvent(new window.KeyboardEvent('keydown', { key: '6', bubbles: true })));
  assert.equal(JSON.parse(localStorage.getItem('fado.workspace.v1')).selected, 'happy');
  assert.match(document.querySelector('#toast').textContent, /503/);
  await click(button('화났어요 표정 선택'));
  assert.equal(JSON.parse(localStorage.getItem('fado.workspace.v1')).selected, 'angry');
  assert.deepEqual(requests.map(requestId), ['sad', 'love', 'angry', 'angry']);
});

test('unmount during PNG upload skips the selection command and subsequent queued work', async () => {
  const pending = [];
  globalThis.fetch = (url, options) => new Promise(resolve => {
    pending.push({ id: requestId(options), resolve });
  });
  await mount();
  await click(button('슬퍼요 표정 선택'));
  await click(button('화났어요 표정 선택'));
  await act(async () => root.unmount());
  root = undefined;
  await act(async () => pending[0].resolve(new Response(null, { status: 204 })));
  assert.deepEqual(pending.map(request => request.id), ['sad']);
  assert.equal(JSON.parse(localStorage.getItem('fado.workspace.v1')).selected, 'happy');
});

test('unmount during the selection command skips subsequent queued uploads', async () => {
  const pending = [];
  globalThis.fetch = (url, options) => new Promise(resolve => {
    pending.push({ url, id: requestId(options), resolve });
  });
  await mount();
  await click(button('슬퍼요 표정 선택'));
  await click(button('화났어요 표정 선택'));
  await act(async () => pending[0].resolve(new Response(null, { status: 204 })));
  assert.equal(pending[1].url, '/api/v1/expression');
  await act(async () => root.unmount());
  root = undefined;
  await act(async () => pending[1].resolve(new Response(null, { status: 204 })));
  assert.deepEqual(pending.map(request => request.id), ['sad', 'sad']);
  assert.equal(JSON.parse(localStorage.getItem('fado.workspace.v1')).selected, 'happy');
});

test('library selection automatically uploads presets without any upload button', async () => {
  let resolve;
  globalThis.fetch = (url, options) => {
    requests.push({ url, ...options });
    if (url === '/api/v1/expression') return Promise.resolve(new Response(null, { status: 204 }));
    return new Promise(done => { resolve = done; });
  };
  await mount();
  assert.equal(requests.length, 0);
  assert.ok(![...document.querySelectorAll('button')].some(element => /PNG 전송/.test(element.getAttribute('aria-label'))));
  await navigate('library');
  await click(button('슬퍼요 표정 선택'));
  assert.equal(requests.length, 1);
  assert.equal(requests[0].body.get('expressionId'), 'sad');
  assert.equal(requests[0].body.get('name'), '슬퍼요');
  assert.equal(requests[0].body.get('file').name, 'fado-sad.png');
  assert.match(button('슬퍼요 표정 선택').closest('article').textContent, /저장 중/);
  assert.equal(button('슬퍼요 표정 선택').getAttribute('aria-pressed'), 'false');
  await act(async () => resolve(new Response(null, { status: 204 })));
  assert.equal(requests.length, 2);
  assert.equal(JSON.parse(requests[1].body).expressionId, 'sad');
  assert.equal(JSON.parse(localStorage.getItem('fado.workspace.v1')).selected, 'sad');
  assert.ok(![...document.querySelectorAll('button')].some(element => /PNG 전송/.test(element.getAttribute('aria-label'))));
});

test('automatic PNG upload failures preserve selection and retry on the next selection', async () => {
  globalThis.fetch = async (url, options) => {
    requests.push({ url, ...options });
    return new Response(null, { status: requests.length === 1 ? 503 : 204 });
  };
  await mount();
  await click(button('슬퍼요 표정 선택'));
  assert.match(document.querySelector('#toast').textContent, /PNG 전송 실패: 503/);
  assert.equal(JSON.parse(localStorage.getItem('fado.workspace.v1')).selected, 'happy');
  assert.equal(requests.length, 1);
  await click(button('슬퍼요 표정 선택'));
  assert.equal(JSON.parse(localStorage.getItem('fado.workspace.v1')).selected, 'sad');
  assert.equal(requests.length, 3);
});

test('selection command failure after PNG success retains the previous selection', async () => {
  globalThis.fetch = async (url, options) => {
    requests.push({ url, ...options });
    return new Response(null, { status: requests.length === 2 ? 503 : 204 });
  };
  await mount();
  await click(button('슬퍼요 표정 선택'));
  assert.equal(requests.length, 2);
  assert.match(document.querySelector('#toast').textContent, /표정 전송 실패: 503/);
  assert.equal(JSON.parse(localStorage.getItem('fado.workspace.v1')).selected, 'happy');
  await click(button('슬퍼요 표정 선택'));
  assert.equal(requests.length, 4);
  assert.equal(JSON.parse(localStorage.getItem('fado.workspace.v1')).selected, 'sad');
});

test('delete waits for the server, prevents duplicates, and removes local state after success across navigation', async () => {
  let resolve;
  globalThis.fetch = (url, options) => {
    requests.push({ url, ...options });
    return new Promise(done => { resolve = done; });
  };
  await mount('library', [customExpression], customExpression.id);
  await click(button('삭제 테스트 표정 삭제'));
  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, 'DELETE');
  assert.equal(new URL(requests[0].url, 'http://localhost').searchParams.get('expressionId'), customExpression.id);
  assert.equal(button('삭제 테스트 표정 삭제').disabled, true);
  assert.equal(button('삭제 테스트 표정 삭제').getAttribute('aria-busy'), 'true');
  assert.equal(button('삭제 테스트 표정 편집').disabled, true);
  assert.equal(button(`${customExpression.name} 표정 선택`).disabled, true);
  await click(button('삭제 테스트 표정 삭제'));
  assert.equal(requests.length, 1);
  assert.equal(JSON.parse(localStorage.getItem('fado.workspace.v1')).custom.length, 1);
  await navigate('studio');
  assert.equal(document.querySelector('.large-face').getAttribute('aria-label'), '현재 표정: 삭제 테스트 표정');
  await act(async () => resolve(new Response(null, { status: 204 })));
  const saved = JSON.parse(localStorage.getItem('fado.workspace.v1'));
  assert.equal(saved.custom.length, 0);
  assert.equal(saved.selected, 'happy');
  assert.equal(document.querySelector('.large-face').getAttribute('aria-label'), '현재 표정: 행복해요');
  assert.match(document.querySelector('#toast').textContent, /표정을 삭제했어요/);
});

test('delete failures retain the expression and allow retry, including local-only expressions', async () => {
  globalThis.fetch = async (url, options) => {
    requests.push({ url, ...options });
    if (requests.length === 1) throw new TypeError('삭제 서버 연결 실패');
    return new Response(null, { status: requests.length === 2 ? 503 : 204 });
  };
  await mount('library', [customExpression], customExpression.id);
  for (const message of [/삭제 서버 연결 실패/, /PNG 삭제 실패: 503/]) {
    await click(button('삭제 테스트 표정 삭제'));
    assert.match(document.querySelector('#toast').textContent, message);
    assert.equal(button('삭제 테스트 표정 삭제').disabled, false);
    const saved = JSON.parse(localStorage.getItem('fado.workspace.v1'));
    assert.equal(saved.custom.length, 1);
    assert.equal(saved.selected, customExpression.id);
  }
  // A missing PNG is a successful 204 on the server, even if never uploaded.
  await click(button('삭제 테스트 표정 삭제'));
  assert.equal(JSON.parse(localStorage.getItem('fado.workspace.v1')).custom.length, 0);
  assert.equal(requests.length, 3);
  assert.ok(requests.every(request => request.method === 'DELETE'));
});

test('delete queues after automatic PNG upload and selection, without recreating the deleted file', async () => {
  let resolve;
  globalThis.fetch = (url, options) => {
    requests.push({ url, ...options });
    return new Promise(done => { resolve = done; });
  };
  await mount('library', [customExpression]);
  await click(button(`${customExpression.name} 표정 선택`));
  await click(button('삭제 테스트 표정 삭제'));
  assert.equal(button('삭제 테스트 표정 삭제').disabled, true);
  assert.equal(requests.length, 1);
  await act(async () => resolve(new Response(null, { status: 204 })));
  assert.deepEqual(requests.map(request => request.method), ['POST', 'POST']);
  await act(async () => resolve(new Response(null, { status: 204 })));
  assert.deepEqual(requests.map(request => request.method), ['POST', 'POST', 'DELETE']);
  await act(async () => resolve(new Response(null, { status: 204 })));
  assert.equal(JSON.parse(localStorage.getItem('fado.workspace.v1')).custom.length, 0);
});

test('StrictMode editor supports drawing, undo, saving and library search', async () => {
  await mount();
  await click(button('새 표정 만들기'));
  assert.equal(document.querySelector('dialog').open, true);
  const canvas = document.querySelector('#pixel-editor');
  await act(async () => {
    canvas.focus();
    canvas.dispatchEvent(new window.KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
  });
  await act(async () => canvas.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
  await act(async () => canvas.dispatchEvent(new window.KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })));
  await click(button('되돌리기'));
  await fill(document.querySelector('#expression-name'), 'React 테스트 표정');
  await act(async () => document.querySelector('#expression-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
  assert.equal(document.querySelector('dialog'), null);
  const saved = JSON.parse(localStorage.getItem('fado.workspace.v1'));
  assert.equal(saved.custom.length, 1);
  assert.equal(saved.custom[0].bitmap.reduce((sum, pixel) => sum + pixel, 0), 16);
  await navigate('library');
  await fill(document.querySelector('#expression-search'), 'React 테스트');
  assert.equal(document.querySelectorAll('.expression-card').length, 1);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].body.get('expressionId'), saved.custom[0].id);
  assert.equal(requests[0].body.get('name'), 'React 테스트 표정');
  assert.equal(requests[0].body.get('file').type, 'image/png');
  await click(button('React 테스트 표정 삭제'));
  assert.equal(requests[1].method, 'DELETE');
  assert.equal(new URL(requests[1].url, 'http://localhost').searchParams.get('expressionId'), saved.custom[0].id);
  assert.equal(document.querySelectorAll('.expression-card').length, 0);
  assert.equal(JSON.parse(localStorage.getItem('fado.workspace.v1')).custom.length, 0);
});

test('saving edits automatically uploads the updated expression using the same ID', async () => {
  await mount('library', [customExpression]);
  await click(button('삭제 테스트 표정 편집'));
  await click(button('지우개'));
  const canvas = document.querySelector('#pixel-editor');
  await act(async () => {
    canvas.focus();
    canvas.dispatchEvent(new window.KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
  });
  await fill(document.querySelector('#expression-name'), '수정한 표정');
  await act(async () => document.querySelector('#expression-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
  const saved = JSON.parse(localStorage.getItem('fado.workspace.v1')).custom[0];
  assert.equal(saved.id, customExpression.id);
  assert.equal(saved.bitmap.filter(pixel => pixel === 0).length, 16);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].body.get('expressionId'), customExpression.id);
  assert.equal(requests[0].body.get('name'), '수정한 표정');
  assert.match(document.querySelector('#toast').textContent, /표정을 저장했어요/);
});

test('a failed automatic editor upload preserves the drawing locally and selecting retries it', async () => {
  globalThis.fetch = async (url, options) => {
    requests.push({ url, ...options });
    return new Response(null, { status: requests.length === 1 ? 503 : 204 });
  };
  await mount();
  const saved = await saveDrawing('오프라인 표정');
  assert.equal(document.querySelector('dialog'), null);
  assert.equal(saved.bitmap.reduce((sum, pixel) => sum + pixel, 0), 16);
  assert.equal(requests.length, 1);
  assert.match(document.querySelector('#toast').textContent, /표정을 서버에 저장하지 못했어요/);
  await navigate('library');
  await click(button('오프라인 표정 표정 선택'));
  assert.equal(requests.length, 3);
  assert.deepEqual(requests.map(requestId), [saved.id, saved.id, saved.id]);
});

test('multiple editor saves are queued and a later delete runs after both uploads', async () => {
  let resolve;
  globalThis.fetch = (url, options) => {
    requests.push({ url, ...options });
    return new Promise(done => { resolve = done; });
  };
  await mount();
  const first = await saveDrawing('첫 번째');
  const second = await saveDrawing('두 번째');
  assert.equal(requests.length, 1);
  assert.equal(JSON.parse(localStorage.getItem('fado.workspace.v1')).custom.length, 2);
  await navigate('library');
  await click(button('첫 번째 삭제'));
  await act(async () => resolve(new Response(null, { status: 204 })));
  assert.equal(requests.length, 2);
  assert.equal(requestId(requests[0]), first.id);
  assert.equal(requestId(requests[1]), second.id);
  await act(async () => resolve(new Response(null, { status: 204 })));
  assert.equal(requests[2].method, 'DELETE');
  await act(async () => resolve(new Response(null, { status: 204 })));
  assert.deepEqual(JSON.parse(localStorage.getItem('fado.workspace.v1')).custom.map(item => item.id), [second.id]);
});

test('an earlier selection response cannot replace a newer drawing saved locally', async () => {
  let resolve;
  globalThis.fetch = (url, options) => {
    requests.push({ url, ...options });
    if (requests.length === 1) return new Promise(done => { resolve = done; });
    return Promise.resolve(new Response(null, { status: 204 }));
  };
  await mount();
  await click(button('슬퍼요 표정 선택'));
  const saved = await saveDrawing('새로 저장한 표정');
  assert.equal(JSON.parse(localStorage.getItem('fado.workspace.v1')).selected, saved.id);
  await act(async () => resolve(new Response(null, { status: 204 })));
  assert.deepEqual(requests.map(requestId), ['sad', 'sad', saved.id]);
  assert.equal(JSON.parse(localStorage.getItem('fado.workspace.v1')).selected, saved.id);
  assert.equal(document.querySelector('.large-face').getAttribute('aria-label'), '현재 표정: 새로 저장한 표정');
});

test('new expressions can be saved when crypto.randomUUID is unavailable', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  const crypto = globalThis.crypto;
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: { getRandomValues: crypto.getRandomValues.bind(crypto) },
  });
  try {
    await mount();
    await click(button('새 표정 만들기'));
    const canvas = document.querySelector('#pixel-editor');
    await act(async () => {
      canvas.focus();
      canvas.dispatchEvent(new window.KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
    });
    await fill(document.querySelector('#expression-name'), 'HTTP에서 만든 표정');
    await act(async () => document.querySelector('#expression-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
    const saved = JSON.parse(localStorage.getItem('fado.workspace.v1'));
    assert.equal(document.querySelector('dialog'), null);
    assert.equal(saved.custom.length, 1);
    assert.match(saved.custom[0].id, /^custom-[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
    assert.equal(saved.custom[0].name, 'HTTP에서 만든 표정');
    assert.equal(saved.custom[0].bitmap.reduce((sum, pixel) => sum + pixel, 0), 16);
  } finally {
    Object.defineProperty(globalThis, 'crypto', descriptor);
  }
});

test('controlled settings form retains its draft while another setting changes', async () => {
  await mount('settings');
  await fill(document.querySelector('input[name="deviceName"]'), '아직 저장하지 않은 이름');
  await click(button('인식 신뢰도 표시'));
  assert.equal(document.querySelector('input[name="deviceName"]').value, '아직 저장하지 않은 이름');
  assert.equal(button('인식 신뢰도 표시').getAttribute('aria-checked'), 'false');
  await act(async () => document.querySelector('#settings-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
  assert.equal(JSON.parse(localStorage.getItem('fado.workspace.v1')).settings.deviceName, '아직 저장하지 않은 이름');
});

test('demo effect has one timer and cleans it up on navigation and unmount', async () => {
  const start = globalThis.setInterval;
  const stop = globalThis.clearInterval;
  const active = new Map();
  let nextId = 1;
  globalThis.setInterval = callback => { const id = nextId++; active.set(id, callback); return id; };
  globalThis.clearInterval = id => active.delete(id);
  try {
    await mount();
    await click(button('표정 데모 시작하기'));
    assert.equal(active.size, 1);
    await act(async () => [...active.values()][0]());
    assert.equal(button('평온해요 표정 선택').getAttribute('aria-pressed'), 'true');
    assert.equal(requests.length, 0);
    assert.equal(JSON.parse(localStorage.getItem('fado.workspace.v1')).selected, 'happy');
    await navigate('library');
    assert.equal(active.size, 0);
    await navigate('studio');
    await click(button('표정 데모 시작하기'));
    assert.equal(active.size, 1);
    await act(async () => root.unmount());
    root = undefined;
    assert.equal(active.size, 0);
  } finally {
    if (root) { await act(async () => root.unmount()); root = undefined; }
    globalThis.setInterval = start;
    globalThis.clearInterval = stop;
  }
});

test('camera hook stops a permission result that arrives after leaving settings', async () => {
  let resolve;
  let stopped = 0;
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: () => new Promise(done => { resolve = done; }) } });
  await mount('settings');
  await click(button('카메라 켜기'));
  assert.equal(button('요청 중…').disabled, true);
  await navigate('library');
  await act(async () => resolve({ getTracks: () => [{ stop() { stopped += 1; } }] }));
  assert.equal(stopped, 1);
  assert.match(document.querySelector('h1').textContent, /다채로운 마음/);
  delete navigator.mediaDevices;
});

async function enableCamera({ ready = true } = {}) {
  let stopped = 0;
  const stream = { getTracks: () => [{ stop() { stopped += 1; } }] };
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => stream } });
  await mount('settings');
  await click(button('카메라 켜기'));
  const video = document.querySelector('#camera-video');
  if (ready) Object.defineProperties(video, {
    readyState: { configurable: true, value: 4 },
    videoWidth: { configurable: true, value: 1280 },
    videoHeight: { configurable: true, value: 720 },
  });
  return { video, stream, stopped: () => stopped };
}

test('laptop camera preview sends nothing until a single-frame inference test is requested', async () => {
  globalThis.fetch = async (url, options) => {
    requests.push({ url, ...options });
    return new Response(JSON.stringify({ detections: [{ className: 'person', confidence: 0.962, box: [0, 0, 10, 10] }] }));
  };
  const camera = await enableCamera();
  assert.equal(camera.video.srcObject, camera.stream);
  assert.equal(camera.video.hidden, false);
  assert.equal(requests.length, 0);
  await click(button('카메라 인식 테스트'));
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/api/v1/detect');
  assert.equal(requests[0].body.get('file').type, 'image/jpeg');
  assert.match(document.querySelector('.detection-results').textContent, /person/);
  assert.match(document.querySelector('.detection-results').textContent, /96\.2%/);
  await click(button('카메라 끄기'));
  assert.equal(camera.stopped(), 1);
  assert.equal(camera.video.hidden, true);
  assert.equal(button('카메라 인식 테스트').disabled, true);
  assert.doesNotMatch(document.querySelector('.detection-results').textContent, /person/);
});

test('stopping the camera aborts inference and ignores a late result', async () => {
  let resolve;
  globalThis.fetch = (url, options) => {
    requests.push({ url, ...options });
    return new Promise(done => { resolve = done; });
  };
  await enableCamera();
  await click(button('카메라 인식 테스트'));
  assert.equal(button('인식 중…').disabled, true);
  await click(button('인식 중…'));
  assert.equal(requests.length, 1);
  await click(button('카메라 끄기'));
  assert.equal(requests[0].signal.aborted, true);
  await act(async () => resolve(new Response(JSON.stringify({ detections: [{ className: 'late-person', confidence: 1 }] }))));
  assert.doesNotMatch(document.querySelector('.detection-results').textContent, /late-person/);
  assert.equal(button('카메라 인식 테스트').disabled, true);
});

test('inference failure allows retry and empty detections are displayed explicitly', async () => {
  globalThis.fetch = async (url, options) => {
    requests.push({ url, ...options });
    return requests.length === 1
      ? new Response(JSON.stringify({ detail: 'RPi offline' }), { status: 502 })
      : new Response(JSON.stringify({ detections: [] }));
  };
  await enableCamera();
  await click(button('카메라 인식 테스트'));
  assert.match(document.querySelector('#toast').textContent, /502.*RPi offline/);
  assert.equal(button('카메라 인식 테스트').disabled, false);
  await click(button('카메라 인식 테스트'));
  assert.equal(requests.length, 2);
  assert.match(document.querySelector('.detection-results').textContent, /인식된 대상이 없어요/);
});

test('leaving settings during frame encoding skips image transmission and stops the camera', async () => {
  let encoded;
  const camera = await enableCamera();
  window.HTMLCanvasElement.prototype.toBlob = callback => { encoded = callback; };
  await click(button('카메라 인식 테스트'));
  await navigate('library');
  assert.equal(camera.stopped(), 1);
  await act(async () => encoded(new Blob(['frame'], { type: 'image/jpeg' })));
  assert.equal(requests.length, 0);
});

test('leaving settings aborts an in-flight detection request without displaying stale results', async () => {
  let resolve;
  globalThis.fetch = (url, options) => {
    requests.push({ url, ...options });
    return new Promise(done => { resolve = done; });
  };
  const camera = await enableCamera();
  await click(button('카메라 인식 테스트'));
  await navigate('library');
  assert.equal(camera.stopped(), 1);
  assert.equal(requests[0].signal.aborted, true);
  await act(async () => resolve(new Response(JSON.stringify({ detections: [] }))));
  assert.equal(document.querySelector('.detection-results'), null);
});

test('camera readiness errors do not submit a frame or leave the test button pending', async () => {
  await enableCamera({ ready: false });
  await click(button('카메라 인식 테스트'));
  assert.equal(requests.length, 0);
  assert.match(document.querySelector('#toast').textContent, /카메라 영상이 준비되지/);
  assert.equal(button('카메라 인식 테스트').disabled, false);
});
