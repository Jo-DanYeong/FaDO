import { WIDTH, HEIGHT } from '../../utils/bitmap.js';

export function createEditorModel(initial = Array(WIDTH * HEIGHT).fill(0)) {
  let pixels = [...initial];
  const history = [];

  const model = {
    get pixels() { return pixels; },
    get canUndo() { return history.length > 0; },
    checkpoint() {
      history.push([...pixels]);
      if (history.length > 30) history.shift();
    },
    paint(x, y, size, tool = 'pencil') {
      const startX = Math.floor(x / size) * size;
      const startY = Math.floor(y / size) * size;
      for (let dy = 0; dy < size; dy += 1) {
        for (let dx = 0; dx < size; dx += 1) {
          const px = startX + dx;
          const py = startY + dy;
          if (px >= 0 && px < WIDTH && py >= 0 && py < HEIGHT) {
            pixels[py * WIDTH + px] = tool === 'pencil' ? 1 : 0;
          }
        }
      }
    },
    paintLine(from, to, size, tool) {
      const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y), 1);
      for (let i = 0; i <= steps; i += 1) {
        model.paint(
          Math.round(from.x + (to.x - from.x) * i / steps),
          Math.round(from.y + (to.y - from.y) * i / steps),
          size,
          tool,
        );
      }
    },
    undo() { if (history.length) pixels = history.pop(); },
    clear() {
      model.checkpoint();
      pixels = Array(WIDTH * HEIGHT).fill(0);
    },
    snapshot() { return [...pixels]; },
    isEmpty() { return !pixels.some(Boolean); },
  };
  return model;
}
