import React, { useEffect, useRef } from 'react';
import { drawBitmap, WIDTH, HEIGHT } from '../utils/bitmap.js';

export function BitmapCanvas({ bitmap, color, ...props }) {
  const canvas = useRef(null);
  useEffect(() => { drawBitmap(canvas.current, bitmap, color); }, [bitmap, color]);
  return <canvas ref={canvas} width={WIDTH} height={HEIGHT} {...props} />;
}
