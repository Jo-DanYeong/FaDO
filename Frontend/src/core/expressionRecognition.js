export const recognitionPolicy = Object.freeze({ minConfidence: 0.55, confirmations: 2, intervalMs: 750 });
const expressionIds = new Set(['angry', 'happy', 'neutral', 'sad', 'surprised']);

function area(box) {
  if (!Array.isArray(box) || box.length !== 4 || !box.every(Number.isFinite)) return 0;
  const [x1, y1, x2, y2] = box;
  return x2 > x1 && y2 > y1 ? (x2 - x1) * (y2 - y1) : 0;
}

// Only the largest face controls the device. Missing/uncertain faces reset the streak.
export function createExpressionTracker() {
  let previous = null;
  let count = 0;
  return {
    observe(detections) {
      const face = detections.reduce((largest, item) =>
        area(item.box) > area(largest?.box) ? item : largest, null);
      let reason = 'confirming';
      if (!face) reason = detections.length ? 'invalid-box' : 'no-face';
      else if (!expressionIds.has(face.className)) reason = 'unsupported';
      else if (face.confidence < recognitionPolicy.minConfidence) reason = 'low-confidence';
      if (reason !== 'confirming') {
        previous = null;
        count = 0;
        return { reason, id: null, count };
      }
      count = face.className === previous ? Math.min(count + 1, recognitionPolicy.confirmations) : 1;
      previous = face.className;
      return {
        reason: count >= recognitionPolicy.confirmations ? 'stable' : 'confirming',
        id: previous,
        count,
      };
    },
  };
}
