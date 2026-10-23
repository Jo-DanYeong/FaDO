import React, { StrictMode, act } from 'react';
import test, { afterEach } from 'node:test';
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
  fillRect() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, strokeRect() {},
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
let root;

async function mount(page = 'studio') {
  localStorage.clear();
  window.history.replaceState(null, '', `#${page}`);
  document.body.replaceChildren(document.createElement('div'));
  root = createRoot(document.body.firstElementChild);
  const state = createInitialWorkspace({ settings: { ...defaultSettings }, custom: [], selected: 'happy' }, builtins);
  await act(async () => root.render(<StrictMode><ToastProvider><WorkspaceProvider initialState={state}><App /></WorkspaceProvider></ToastProvider></StrictMode>));
}

afterEach(async () => {
  if (root) { await act(async () => root.unmount()); root = undefined; }
  document.body.replaceChildren();
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

test('React selection and shortcuts update the preview and saved workspace', async () => {
  await mount();
  await click(button('슬퍼요 표정 선택'));
  assert.equal(button('슬퍼요 표정 선택').getAttribute('aria-pressed'), 'true');
  assert.equal(document.querySelector('.large-face').getAttribute('aria-label'), '현재 표정: 슬퍼요');
  await act(async () => document.dispatchEvent(new window.KeyboardEvent('keydown', { key: '6', bubbles: true })));
  assert.equal(button('좋아해요 표정 선택').getAttribute('aria-pressed'), 'true');
  assert.equal(JSON.parse(localStorage.getItem('fado.workspace.v1')).selected, 'love');
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
  await click(button('React 테스트 표정 삭제'));
  assert.equal(document.querySelectorAll('.expression-card').length, 0);
  assert.equal(JSON.parse(localStorage.getItem('fado.workspace.v1')).custom.length, 0);
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
