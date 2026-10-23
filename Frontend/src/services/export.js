import { drawBitmap, WIDTH, HEIGHT } from '../utils/bitmap.js';

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

export function exportExpressionPng(expression) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    drawBitmap(canvas, expression.bitmap, '#ffffff');
    const context = canvas.getContext('2d');
    context.globalCompositeOperation = 'destination-over';
    context.fillStyle = '#000000';
    context.fillRect(0, 0, WIDTH, HEIGHT);
    canvas.toBlob(blob => {
      if (!blob) { reject(new Error('이미지 생성에 실패했어요. 다시 시도해주세요.')); return; }
      download(`fado-${expression.id}.png`, blob);
      resolve();
    }, 'image/png');
  });
}
