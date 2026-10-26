import { drawBitmap, WIDTH, HEIGHT } from '../utils/bitmap.js';

// Generate the same full-brightness, opaque image for downloads and uploads.
export function createExpressionPng(expression) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      reject(new Error('PNG 이미지를 만들 수 없는 환경이에요.'));
      return;
    }

    drawBitmap(canvas, expression.bitmap, '#ffffff');
    context.globalCompositeOperation = 'destination-over';
    context.fillStyle = '#000000';
    context.fillRect(0, 0, WIDTH, HEIGHT);
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('이미지 생성에 실패했어요. 다시 시도해주세요.'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
}
