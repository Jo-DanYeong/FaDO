import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialWorkspace, workspaceReducer, getSelectedExpression, getVisibleExpressions } from '../src/core/workspace.js';
import { resolvePage } from '../src/core/router.js';
import { readWorkspace, saveWorkspace, STORAGE_KEY } from '../src/services/storage.js';
import { serializeExpression } from '../src/services/export.js';

const bitmap = Array(8192).fill(0);
const builtin = { id: 'happy', name: '행복해요', english: 'Happy', bitmap };
const custom = { id: 'custom-one', name: '나의 표정', english: 'Custom', custom: true, bitmap };
const memoryStorage = contents => ({
  getItem: () => contents,
  setItem(key, value) { assert.equal(key, STORAGE_KEY); contents = value; },
});

test('saved data remains compatible and transient UI state is not persisted', () => {
  const storage = memoryStorage(JSON.stringify({ custom: [custom], selected: custom.id, settings: { host: 'http://pi.local:8000' } }));
  const saved = readWorkspace(storage);
  assert.equal(saved.custom[0].id, custom.id);
  assert.equal(saved.settings.host, 'http://pi.local:8000');
  const state = createInitialWorkspace(saved, [builtin]);
  assert.equal(getSelectedExpression(state).id, custom.id);
  assert.equal(saveWorkspace({ ...state, camera: { self: 'not serializable in production' } }, storage), true);
  const output = JSON.parse(storage.getItem());
  assert.deepEqual(Object.keys(output).sort(), ['custom', 'selected', 'settings']);
});

test('corrupt storage, malformed bitmaps and invalid settings recover safely', () => {
  assert.equal(readWorkspace(memoryStorage('{')).selected, 'happy');
  const saved = readWorkspace(memoryStorage(JSON.stringify({
    settings: { brightness: 300, mirror: 'false', confidence: null },
    custom: [null, { ...custom, bitmap: [1] }, { ...custom, bitmap: Array(8192).fill(2) }, custom],
  })));
  assert.equal(saved.custom.length, 1);
  assert.equal(saved.settings.brightness, 100);
  assert.equal(saved.settings.mirror, true);
  assert.equal(saved.settings.confidence, true);
});

test('stale selection falls back and search/filter can compose', () => {
  const saved = { ...readWorkspace(memoryStorage(null)), selected: 'missing', custom: [custom] };
  let state = createInitialWorkspace(saved, [builtin]);
  assert.equal(getSelectedExpression(state).id, builtin.id);
  state = workspaceReducer(state, { type: 'set-search', search: '  HAPPY  ' });
  assert.deepEqual(getVisibleExpressions(state).map(item => item.id), ['happy']);
  state = workspaceReducer(state, { type: 'set-filter', filter: 'custom' });
  state = workspaceReducer(state, { type: 'set-search', search: '나의' });
  assert.deepEqual(getVisibleExpressions(state).map(item => item.id), [custom.id]);
  state = workspaceReducer(state, { type: 'set-filter', filter: 'preset' });
  assert.equal(getVisibleExpressions(state).length, 0);
});

test('reducer changes state without mutating earlier React state', () => {
  const initial = createInitialWorkspace(readWorkspace(memoryStorage(null)), [builtin]);
  const state = workspaceReducer(initial, { type: 'save-expression', expression: custom });
  assert.equal(initial.custom.length, 0);
  assert.equal(initial.selected, 'happy');
  assert.equal(state.custom.length, 1);
  assert.equal(state.selected, custom.id);
  assert.equal(state.persistedSelected, custom.id);
  const removed = workspaceReducer(state, { type: 'delete-expression', id: custom.id });
  assert.equal(removed.selected, 'happy');
  assert.equal(removed.persistedSelected, 'happy');
  assert.equal(state.custom.length, 1);
});

test('demo selection is temporary and manual selection stops playback', () => {
  const neutral = { ...builtin, id: 'neutral' };
  let state = createInitialWorkspace(readWorkspace(memoryStorage(null)), [builtin, neutral]);
  state = workspaceReducer(state, { type: 'toggle-demo' });
  state = workspaceReducer(state, { type: 'demo-tick' });
  assert.equal(state.selected, 'neutral');
  assert.equal(state.persistedSelected, 'happy');
  state = workspaceReducer(state, { type: 'select', id: 'neutral' });
  assert.equal(state.playing, false);
  assert.equal(state.mode, 'manual');
  assert.equal(state.persistedSelected, 'neutral');
});

test('storage quota errors are reported without throwing', () => {
  assert.equal(saveWorkspace({}, { setItem() { throw new Error('quota'); } }), false);
});

test('unknown route names fall back without accepting inherited object keys', () => {
  assert.equal(resolvePage('#settings'), 'settings');
  assert.equal(resolvePage('#constructor'), 'studio');
  assert.equal(resolvePage('#main-content'), 'studio');
});

test('export keeps the 128 by 64 row-major contract', () => {
  const output = JSON.parse(serializeExpression(custom));
  assert.equal(output.width, 128);
  assert.equal(output.height, 64);
  assert.equal(output.pixels.length, 8192);
  assert.equal(output.format, 'row-major-binary');
  assert.equal(output.name, custom.name);
});
