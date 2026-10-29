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
const originalSetTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;
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
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
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
    return new Response(JSON.stringify({ detections: [{ className: 'happy', confidence: 0.962, box: [0, 0, 100, 100] }] }));
  };
  const camera = await enableCamera();
  assert.equal(camera.video.srcObject, camera.stream);
  assert.equal(camera.video.hidden, false);
  assert.equal(requests.length, 0);
  await click(button('카메라 인식 테스트'));
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/api/v1/detect');
  assert.equal(requests[0].body.get('file').type, 'image/jpeg');
  assert.match(document.querySelector('.detection-results').textContent, /행복해요/);
  assert.match(document.querySelector('.detection-results').textContent, /happy/);
  assert.match(document.querySelector('.detection-results').textContent, /96\.2%/);
  await click(button('카메라 끄기'));
  assert.equal(camera.stopped(), 1);
  assert.equal(camera.video.hidden, true);
  assert.equal(button('카메라 인식 테스트').disabled, true);
  assert.doesNotMatch(document.querySelector('.detection-results').textContent, /행복해요/);
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

test('the five trained expression classes display Korean names and model labels', async () => {
  const labels = ['angry', 'happy', 'neutral', 'sad', 'surprised'];
  globalThis.fetch = async () => new Response(JSON.stringify({
    detections: labels.map(className => ({ className, confidence: 0.9, box: [10, 20, 110, 120] })),
  }));
  await enableCamera();
  await click(button('카메라 인식 테스트'));
  assert.deepEqual([...document.querySelectorAll('.detection-label strong')].map(item => item.textContent),
    ['화났어요', '행복해요', '평온해요', '슬퍼요', '놀랐어요']);
  assert.deepEqual([...document.querySelectorAll('.detection-label small')].map(item => item.textContent), labels);
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
  assert.match(document.querySelector('.detection-results').textContent, /얼굴을 찾지 못했어요/);
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

// Drive only the recognition delay; React and toast timers retain their real behavior.
function recognitionClock() {
  const timers = new Map();
  globalThis.setTimeout = (callback, delay, ...args) => {
    if (delay !== 750) return originalSetTimeout(callback, delay, ...args);
    const id = {};
    timers.set(id, callback);
    return id;
  };
  globalThis.clearTimeout = id => {
    if (!timers.delete(id)) originalClearTimeout(id);
  };
  return {
    get size() { return timers.size; },
    async next() {
      assert.equal(timers.size, 1, 'Exactly one future recognition frame should be scheduled');
      const [id, callback] = [...timers][0];
      timers.delete(id);
      await act(async () => { callback(); });
    },
  };
}

const detectedFace = (className, confidence = 0.95, box = [0, 0, 100, 100]) => ({ className, confidence, box });
function recognitionServer(frames) {
  let frame = 0;
  globalThis.fetch = async (url, options) => {
    requests.push({ url, ...options });
    return url === '/api/v1/detect'
      ? new Response(JSON.stringify({ detections: frames[Math.min(frame++, frames.length - 1)] }))
      : new Response(null, { status: 204 });
  };
}
const oledRequests = () => requests.filter(item => item.url !== '/api/v1/detect');

test('live camera recognition saves the preset PNG before the OLED command and sends only stable changes', async () => {
  const clock = recognitionClock();
  recognitionServer([
    [detectedFace('sad')], [detectedFace('sad')], [detectedFace('sad')],
    [], [detectedFace('happy', 0.4)], [detectedFace('person')],
    [detectedFace('happy', 0.99, [0, 0, 20, 20]), detectedFace('angry')],
    [detectedFace('angry'), detectedFace('happy', 0.99, [0, 0, 20, 20])],
  ]);
  await enableCamera();
  assert.equal(requests.length, 0);
  await click(button('OLED 자동 표시 시작'));
  assert.equal(oledRequests().length, 0);
  assert.equal(button('카메라 인식 테스트').disabled, true);
  assert.equal(button('OLED 자동 표시 중지').disabled, false);
  await clock.next();
  assert.deepEqual(oledRequests().map(item => item.url), ['/api/v1/expression/image', '/api/v1/expression']);
  assert.deepEqual(oledRequests().map(requestId), ['sad', 'sad']);
  assert.match(document.querySelector('.camera-oled-status').textContent, /마지막 전송 성공: 슬퍼요/);
  for (let i = 0; i < 5; i += 1) await clock.next();
  assert.equal(oledRequests().length, 2);
  await clock.next();
  assert.deepEqual(oledRequests().map(requestId), ['sad', 'sad', 'angry', 'angry']);
  assert.match(document.querySelector('.camera-oled-status').textContent, /마지막 전송 성공: 화났어요/);
  assert.equal(JSON.parse(localStorage.getItem('fado.workspace.v1')).selected, 'happy');
  await click(button('OLED 자동 표시 중지'));
  assert.equal(clock.size, 0);
  await navigate('studio');
  assert.equal(document.querySelector('.large-face').getAttribute('aria-label'), '현재 표정: 화났어요');
});

test('live recognition waits for OLED delivery before capturing another frame', async () => {
  const clock = recognitionClock();
  let delivered;
  globalThis.fetch = (url, options) => {
    requests.push({ url, ...options });
    if (url === '/api/v1/detect') return Promise.resolve(new Response(JSON.stringify({ detections: [detectedFace('happy')] })));
    if (url === '/api/v1/expression') return new Promise(resolve => { delivered = resolve; });
    return Promise.resolve(new Response(null, { status: 204 }));
  };
  await enableCamera();
  await click(button('OLED 자동 표시 시작'));
  await clock.next();
  assert.equal(clock.size, 0);
  assert.equal(requests.length, 4);
  assert.doesNotMatch(document.querySelector('.camera-oled-status').textContent, /마지막 전송 성공/);
  await act(async () => delivered(new Response(null, { status: 204 })));
  assert.equal(clock.size, 1);
  assert.match(document.querySelector('.camera-oled-status').textContent, /마지막 전송 성공: 행복해요/);
});

for (const failureUrl of ['/api/v1/expression/image', '/api/v1/expression']) {
  test(`live recognition stops on ${failureUrl} failure and can retry the same expression`, async () => {
    const clock = recognitionClock();
    let fail = true;
    globalThis.fetch = async (url, options) => {
      requests.push({ url, ...options });
      if (url === '/api/v1/detect') return new Response(JSON.stringify({ detections: [detectedFace('sad')] }));
      return new Response(null, { status: fail && url === failureUrl ? 502 : 204 });
    };
    await enableCamera();
    await click(button('OLED 자동 표시 시작'));
    await clock.next();
    assert.equal(clock.size, 0);
    assert.match(document.querySelector('.camera-oled-status').textContent, /전송에 실패/);
    assert.match(document.querySelector('#toast').textContent, /502/);
    assert.doesNotMatch(document.querySelector('.camera-oled-status').textContent, /마지막 전송 성공/);
    if (failureUrl.endsWith('/image')) assert.equal(requests.some(item => item.url === '/api/v1/expression'), false);
    fail = false;
    await click(button('OLED 자동 표시 시작'));
    await clock.next();
    assert.match(document.querySelector('.camera-oled-status').textContent, /마지막 전송 성공: 슬퍼요/);
  });
}

test('stopping and restarting live recognition ignores the older session result', async () => {
  const clock = recognitionClock();
  let previous;
  globalThis.fetch = (url, options) => {
    requests.push({ url, ...options });
    if (requests.length === 1) return new Promise(resolve => { previous = resolve; });
    return Promise.resolve(new Response(JSON.stringify({ detections: [detectedFace('sad')] })));
  };
  await enableCamera();
  await click(button('OLED 자동 표시 시작'));
  await click(button('OLED 자동 표시 중지'));
  assert.equal(requests[0].signal.aborted, true);
  await click(button('OLED 자동 표시 시작'));
  await act(async () => previous(new Response(JSON.stringify({ detections: [detectedFace('angry')] }))));
  assert.match(document.querySelector('.detection-results').textContent, /슬퍼요/);
  assert.doesNotMatch(document.querySelector('.detection-results').textContent, /화났어요/);
  assert.equal(oledRequests().length, 0);
  assert.equal(clock.size, 1);
});

test('turning off the camera during PNG upload aborts it and prevents the OLED command', async () => {
  const clock = recognitionClock();
  let uploaded;
  globalThis.fetch = (url, options) => {
    requests.push({ url, ...options });
    if (url === '/api/v1/detect') return Promise.resolve(new Response(JSON.stringify({ detections: [detectedFace('sad')] })));
    return new Promise(resolve => { uploaded = resolve; });
  };
  const camera = await enableCamera();
  await click(button('OLED 자동 표시 시작'));
  await clock.next();
  assert.equal(oledRequests().length, 1);
  await click(button('카메라 끄기'));
  assert.equal(oledRequests()[0].signal.aborted, true);
  assert.equal(camera.stopped(), 1);
  await act(async () => uploaded(new Response(null, { status: 204 })));
  assert.equal(oledRequests().length, 1);
  assert.equal(clock.size, 0);
  assert.equal(button('OLED 자동 표시 시작').disabled, true);
});

test('leaving settings during the OLED command aborts it and ignores a late success', async () => {
  const clock = recognitionClock();
  let delivered;
  globalThis.fetch = (url, options) => {
    requests.push({ url, ...options });
    if (url === '/api/v1/detect') return Promise.resolve(new Response(JSON.stringify({ detections: [detectedFace('sad')] })));
    if (url === '/api/v1/expression') return new Promise(resolve => { delivered = resolve; });
    return Promise.resolve(new Response(null, { status: 204 }));
  };
  const camera = await enableCamera();
  await click(button('OLED 자동 표시 시작'));
  await clock.next();
  await navigate('studio');
  assert.equal(requests.at(-1).signal.aborted, true);
  await act(async () => delivered(new Response(null, { status: 204 })));
  assert.equal(camera.stopped(), 1);
  assert.equal(clock.size, 0);
  assert.equal(document.querySelector('.large-face').getAttribute('aria-label'), '현재 표정: 행복해요');
});

test('live inference failure stops the loop and pagehide cancels a restarted loop', async () => {
  const clock = recognitionClock();
  globalThis.fetch = async () => new Response(null, { status: 503 });
  await enableCamera();
  await click(button('OLED 자동 표시 시작'));
  assert.equal(clock.size, 0);
  assert.match(document.querySelector('.camera-oled-status').textContent, /인식에 실패/);
  assert.equal(button('OLED 자동 표시 시작').disabled, false);
  recognitionServer([[detectedFace('happy')]]);
  await click(button('OLED 자동 표시 시작'));
  assert.equal(clock.size, 1);
  await act(async () => window.dispatchEvent(new window.Event('pagehide')));
  assert.equal(clock.size, 0);
  assert.equal(button('OLED 자동 표시 시작').disabled, true);
  assert.equal(oledRequests().length, 0);
});

test('stopping live mode skips a camera command queued behind an older manual selection', async () => {
  const clock = recognitionClock();
  let manualUploaded;
  globalThis.fetch = (url, options) => {
    requests.push({ url, ...options });
    if (requests.length === 1) return new Promise(resolve => { manualUploaded = resolve; });
    if (url === '/api/v1/detect') return Promise.resolve(new Response(JSON.stringify({ detections: [detectedFace('angry')] })));
    return Promise.resolve(new Response(null, { status: 204 }));
  };
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true, value: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) },
  });
  await mount();
  await click(button('슬퍼요 표정 선택'));
  await navigate('settings');
  await click(button('카메라 켜기'));
  Object.defineProperties(document.querySelector('#camera-video'), {
    readyState: { configurable: true, value: 4 }, videoWidth: { configurable: true, value: 640 }, videoHeight: { configurable: true, value: 480 },
  });
  await click(button('OLED 자동 표시 시작'));
  await clock.next();
  assert.equal(oledRequests().length, 1);
  await click(button('OLED 자동 표시 중지'));
  await act(async () => manualUploaded(new Response(null, { status: 204 })));
  assert.deepEqual(oledRequests().map(requestId), ['sad', 'sad']);
  assert.equal(clock.size, 0);
});
