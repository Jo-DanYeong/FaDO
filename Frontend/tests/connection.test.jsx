import React, { StrictMode, act } from 'react';
import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { checkDeviceConnection } from '../src/services/connection.js';
import { useDeviceConnection } from '../src/hooks/useDeviceConnection.js';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:3000/' });
Object.defineProperty(globalThis, 'window', { configurable: true, value: dom.window });
Object.defineProperty(globalThis, 'document', { configurable: true, value: dom.window.document });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
const originalFetch = globalThis.fetch;
const originalSetTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;
let root;
let timers;
const healthy = () => Response.json({ deviceName: 'RaspberryPi', status: 'UP' });

beforeEach(() => {
  timers = new Map();
  globalThis.setTimeout = (callback, delay, ...args) => {
    if (![3000, 5000].includes(delay)) return originalSetTimeout(callback, delay, ...args);
    const id = {};
    timers.set(id, { callback, delay });
    return id;
  };
  globalThis.clearTimeout = id => {
    if (!timers.delete(id)) originalClearTimeout(id);
  };
});

afterEach(async () => {
  try {
    if (root) { await act(async () => root.unmount()); root = undefined; }
    document.body.replaceChildren();
    assert.equal(timers.size, 0, 'Unmount must clear all health timers');
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

function Status() { return <output>{useDeviceConnection()}</output>; }
async function mount() {
  document.body.replaceChildren(document.createElement('div'));
  root = createRoot(document.body.firstChild);
  await act(async () => root.render(<StrictMode><Status /></StrictMode>));
}
const status = () => document.querySelector('output').textContent;
async function advance(delay) {
  const found = [...timers].filter(([, timer]) => timer.delay === delay);
  assert.equal(found.length, 1, `Expected one ${delay}ms timer`);
  const [id, { callback }] = found[0];
  timers.delete(id);
  await act(async () => { callback(); });
}

test('health checks use the Java Raspberry endpoint without caching and accept the Pi UP response', async () => {
  const controller = new AbortController();
  let request;
  globalThis.fetch = async (url, options) => { request = { url, ...options }; return healthy(); };
  assert.equal(await checkDeviceConnection({ signal: controller.signal }), true);
  assert.equal(request.url, '/api/v1/raspberry/health');
  assert.equal(request.cache, 'no-store');
  assert.equal(request.signal, controller.signal);
});

test('health checks recognize the Pi while the Java DTO update is being rolled out', async () => {
  const piHealth = { Service: 'RPiServer', Status: 'UP' };
  for (const body of [piHealth, { deviceName: 'RaspberryPi', status: JSON.stringify(piHealth) }]) {
    globalThis.fetch = async () => Response.json(body);
    assert.equal(await checkDeviceConnection(), true);
  }
});

test('HTTP 200 alone cannot mark the Pi connected; non-UP, other services and malformed responses fail', async () => {
  for (const result of [null, {}, { deviceName: 'RaspberryPi', status: 'DOWN' }, { deviceName: 'Java', status: 'UP' },
    { deviceName: 'RaspberryPi', status: '라즈베리파이 서버 연결 실패' },
    { deviceName: 'RaspberryPi', status: '{"Service":"Other","Status":"UP"}' }]) {
    globalThis.fetch = async () => new Response(JSON.stringify(result));
    assert.equal(await checkDeviceConnection(), false);
  }
  globalThis.fetch = async () => Response.json({ deviceName: 'RaspberryPi', status: 'DOWN' }, { status: 503 });
  assert.equal(await checkDeviceConnection(), false);
  globalThis.fetch = async () => new Response('<html>proxy fallback</html>');
  await assert.rejects(checkDeviceConnection());
});

test('polling detects disconnection and recovery, including network and JSON failures', async () => {
  let reply = healthy;
  globalThis.fetch = async () => reply();
  await mount();
  assert.equal(status(), 'connected');
  reply = () => { throw new TypeError('offline'); };
  await advance(5000);
  assert.equal(status(), 'disconnected');
  reply = () => new Response('<html>not the health endpoint</html>');
  await advance(5000);
  assert.equal(status(), 'disconnected');
  reply = healthy;
  await advance(5000);
  assert.equal(status(), 'connected');
  assert.equal(timers.size, 1);
});

test('a slow health request times out, aborts and ignores late success before polling again', async () => {
  const requests = [];
  globalThis.fetch = (url, options) => new Promise(resolve => requests.push({ ...options, resolve }));
  await mount();
  assert.equal(status(), 'checking');
  assert.equal(requests.length, 2);
  assert.equal(requests[0].signal.aborted, true);
  assert.equal([...timers.values()].some(timer => timer.delay === 5000), false);
  await advance(3000);
  assert.equal(status(), 'disconnected');
  assert.equal(requests[1].signal.aborted, true);
  await act(async () => requests[1].resolve(healthy()));
  assert.equal(status(), 'disconnected');
  globalThis.fetch = async () => healthy();
  await advance(5000);
  assert.equal(status(), 'connected');
});

test('unmount aborts the active request and late results cannot restart polling', async () => {
  const requests = [];
  globalThis.fetch = (url, options) => new Promise(resolve => requests.push({ ...options, resolve }));
  await mount();
  await act(async () => root.unmount());
  root = undefined;
  assert.equal(requests.every(request => request.signal.aborted), true);
  await act(async () => { requests.forEach(request => request.resolve(healthy())); });
  assert.equal(timers.size, 0);
});
