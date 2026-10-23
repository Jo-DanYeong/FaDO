import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemo } from '../src/services/demo.js';
import { createCamera } from '../src/services/camera.js';

test('demo cannot create duplicate timers and can restart after stopping', () => {
  let created = 0;
  let cleared = 0;
  let ticks = 0;
  const demo = createDemo(() => { ticks += 1; }, {
    setInterval(callback, delay) {
      assert.equal(delay, 2800);
      callback();
      return created++;
    },
    clearInterval() { cleared += 1; },
  });
  demo.start();
  demo.start();
  assert.equal(ticks, 1);
  demo.stop();
  demo.stop();
  demo.start();
  demo.stop();
  assert.equal(created, 2);
  assert.equal(cleared, 2);
});

test('leaving a page while permission is pending stops a late camera stream', async () => {
  let resolve;
  let stopped = 0;
  let latest;
  const camera = createCamera({
    onChange: state => { latest = state; },
    notify: () => assert.fail('cancelled request should not notify'),
    mediaDevices: { getUserMedia: () => new Promise(done => { resolve = done; }) },
  });
  const pending = camera.toggle();
  assert.equal(latest.cameraPending, true);
  camera.stop();
  resolve({ getTracks: () => [{ stop() { stopped += 1; } }] });
  await pending;
  assert.equal(stopped, 1);
  assert.deepEqual(latest, { camera: null, cameraPending: false });
});

test('camera requests are local video only and toggling off stops every track', async () => {
  let stopped = 0;
  let latest;
  const camera = createCamera({
    onChange: state => { latest = state; },
    notify: () => assert.fail('unexpected camera error'),
    mediaDevices: {
      async getUserMedia(options) {
        assert.equal(options.audio, false);
        return { getTracks: () => [0, 1].map(() => ({ stop() { stopped += 1; } })) };
      },
    },
  });
  await camera.toggle();
  assert.equal(latest.cameraPending, false);
  assert.ok(latest.camera);
  await camera.toggle();
  assert.equal(stopped, 2);
  assert.equal(latest.camera, null);
});

test('permission errors leave the camera stopped and show a useful message', async () => {
  let latest;
  let message;
  const camera = createCamera({
    onChange: state => { latest = state; },
    notify: value => { message = value; },
    mediaDevices: { async getUserMedia() { throw Object.assign(new Error('denied'), { name: 'NotAllowedError' }); } },
  });
  await camera.toggle();
  assert.match(message, /권한/);
  assert.deepEqual(latest, { camera: null, cameraPending: false });
});
