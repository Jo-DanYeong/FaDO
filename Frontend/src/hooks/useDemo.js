import { useEffect } from 'react';
import { createDemo } from '../services/demo.js';

export function useDemo(enabled, dispatch) {
  useEffect(() => {
    if (!enabled) return undefined;
    const demo = createDemo(() => dispatch({ type: 'demo-tick' }));
    demo.start();
    return () => demo.stop();
  }, [enabled, dispatch]);
}
