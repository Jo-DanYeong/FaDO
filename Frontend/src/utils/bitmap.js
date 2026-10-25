export const WIDTH = 128;

export const HEIGHT = 64;

export function makeBitmap(expression) {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH; canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'square';
  const line = points => { ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); };
  const eye = (x, y = 22, w = 6, h = 12) => ctx.fillRect(x, y, w, h);
  switch (expression) {
    case 'happy':
      line([[31,28],[31,24],[35,24],[35,20],[39,20],[39,24],[43,24],[43,28]]);
      line([[85,28],[85,24],[89,24],[89,20],[93,20],[93,24],[97,24],[97,28]]);
      line([[47,40],[47,45],[52,45],[52,49],[76,49],[76,45],[81,45],[81,40]]);
      ctx.fillRect(24,36,9,3); ctx.fillRect(95,36,9,3); break;
    case 'neutral': eye(34); eye(88); line([[53,44],[75,44]]); break;
    case 'sad':
      line([[30,24],[43,19]]);
      line([[85,19],[98,24]]);
      eye(35,29,5,7);
      eye(88,29,5,7);
      line([[52,49],[52,45],[57,45],[57,42],[71,42],[71,45],[76,45],[76,49]]);
      ctx.fillRect(98,33,3,9); ctx.fillRect(96,39,7,5); break;
    case 'angry':
      line([[29,18],[44,25]]); line([[84,25],[99,18]]); eye(36,29,5,6); eye(87,29,5,6);
      line([[51,48],[51,44],[77,44],[77,48]]); break;
    case 'surprised': eye(33,18,7,15); eye(88,18,7,15); ctx.strokeRect(58,40,12,15); break;
    case 'love':
      [29,83].forEach(x => { ctx.fillRect(x,19,7,6); ctx.fillRect(x+10,19,7,6); ctx.fillRect(x-3,23,23,7); ctx.fillRect(x,30,17,4); ctx.fillRect(x+4,34,9,4); ctx.fillRect(x+7,38,3,3); });
      line([[54,45],[54,49],[59,49],[59,52],[69,52],[69,49],[74,49],[74,45]]); break;
    default: return Array(WIDTH * HEIGHT).fill(0);
  }
  const data = ctx.getImageData(0,0,WIDTH,HEIGHT).data;
  return Array.from({ length: WIDTH * HEIGHT }, (_, i) => data[i * 4 + 3] > 100 ? 1 : 0);
}

export function drawBitmap(canvas, bitmap, color = '#b7f1c9') {
  const ctx = canvas.getContext('2d'); canvas.width = WIDTH; canvas.height = HEIGHT;
  ctx.clearRect(0,0,WIDTH,HEIGHT); ctx.fillStyle = color;
  bitmap.forEach((pixel,i) => { if (pixel) ctx.fillRect(i % WIDTH, Math.floor(i / WIDTH), 1, 1); });
}
