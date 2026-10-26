import { WIDTH, HEIGHT } from '../utils/bitmap.js';
import { createExpressionPng } from './png.js';

function download(name, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = Object.assign(document.createElement('a'), { href: url, download: name });
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function serializeExpression(expression) {
  return JSON.stringify({
    version: 1,
    name: expression.name,
    width: WIDTH,
    height: HEIGHT,
    format: 'row-major-binary',
    pixels: expression.bitmap,
  }, null, 2);
}

export function exportExpressionJson(expression) {
  download(`fado-${expression.id}.json`, new Blob([serializeExpression(expression)], { type: 'application/json' }));
}

export async function exportExpressionPng(expression) {
  const blob = await createExpressionPng(expression);
  download(`fado-${expression.id}.png`, blob);
}
