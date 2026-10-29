import test from 'node:test';
import assert from 'node:assert/strict';
import { createExpressionTracker, recognitionPolicy } from '../src/core/expressionRecognition.js';

const face = (className = 'happy', confidence = 0.9, box = [0, 0, 100, 100]) => ({ className, confidence, box });

test('recognition waits for two consecutive confident predictions of the same expression', () => {
  const tracker = createExpressionTracker();
  assert.equal(tracker.observe([face()]).reason, 'confirming');
  assert.equal(tracker.observe([face('sad')]).reason, 'confirming');
  assert.deepEqual(tracker.observe([face('sad')]), { reason: 'stable', id: 'sad', count: 2 });
  assert.equal(tracker.observe([face('sad')]).reason, 'stable');
});

test('the largest face controls the device even when a smaller face has higher confidence', () => {
  const tracker = createExpressionTracker();
  const faces = [face('happy', 0.99, [0, 0, 30, 30]), face('angry', 0.8)];
  tracker.observe(faces);
  assert.equal(tracker.observe([...faces].reverse()).id, 'angry');
  assert.equal(tracker.observe([face('happy', 0.99, [0, 0, 30, 30]), face('sad', 0.4)]).reason, 'low-confidence');
});

test('missing, uncertain and unsupported faces interrupt confirmation without inventing a neutral result', () => {
  for (const [detections, reason] of [
    [[], 'no-face'], [[face('happy', 0.64)], 'low-confidence'],
    [[face('love')], 'unsupported'], [[face('person')], 'unsupported'],
    [[face('happy', 0.9, [0, 0, 0, 100])], 'invalid-box'],
    [[face('happy', 0.9, [0, 0, Infinity, 100])], 'invalid-box'],
    [[{ className: 'sad', confidence: 0.9 }], 'invalid-box'],
  ]) {
    const tracker = createExpressionTracker();
    tracker.observe([face()]);
    const result = tracker.observe(detections);
    assert.equal(result.reason, reason);
    assert.equal(result.id, null);
    assert.equal(tracker.observe([face()]).reason, 'confirming');
  }
  for (const id of ['angry', 'happy', 'neutral', 'sad', 'surprised']) {
    const tracker = createExpressionTracker();
    tracker.observe([face(id, recognitionPolicy.minConfidence)]);
    assert.equal(tracker.observe([face(id, recognitionPolicy.minConfidence)]).id, id);
  }
});
