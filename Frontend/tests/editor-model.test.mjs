import test from 'node:test';
import assert from 'node:assert/strict';
import { createEditorModel } from '../src/features/editor/model.js';

test('each stroke is one undo step; dragging fills the line without gaps', () => {
  const editor = createEditorModel();
  editor.checkpoint();
  editor.paintLine({ x: 0, y: 0 }, { x: 12, y: 0 }, 4, 'pencil');
  assert.equal(editor.pixels.reduce((sum, pixel) => sum + pixel, 0), 64);
  editor.undo();
  assert.equal(editor.isEmpty(), true);
  assert.equal(editor.canUndo, false);
});

test('brush and eraser stay inside the display at all edges', () => {
  const editor = createEditorModel();
  editor.paint(127, 63, 8);
  assert.equal(editor.pixels.length, 8192);
  assert.equal(editor.pixels.reduce((sum, pixel) => sum + pixel, 0), 64);
  editor.paint(127, 63, 8, 'eraser');
  editor.paint(-8, -8, 4);
  assert.equal(editor.isEmpty(), true);
  assert.equal(editor.pixels.length, 8192);
});

test('editing and undoing clear do not mutate the saved expression', () => {
  const saved = Array(8192).fill(0);
  saved[0] = 1;
  const editor = createEditorModel(saved);
  editor.paint(4, 4, 2);
  editor.clear();
  assert.equal(editor.isEmpty(), true);
  editor.undo();
  assert.equal(editor.pixels.reduce((sum, pixel) => sum + pixel, 0), 5);
  assert.equal(saved.reduce((sum, pixel) => sum + pixel, 0), 1);
  const snapshot = editor.snapshot();
  editor.paint(8, 8, 2);
  assert.equal(snapshot.reduce((sum, pixel) => sum + pixel, 0), 5);
});
