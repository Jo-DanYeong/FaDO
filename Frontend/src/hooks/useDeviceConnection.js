import { useEffect, useState } from 'react';
import { checkDeviceConnection, connectionPolicy } from '../services/connection.js';

export function useDeviceConnection() {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let active = true;
    let timer;
    let timeout;
    let controller;

    async function check() {
      controller = new AbortController();
      let timedOut = false;
      timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
        if (active) setStatus('disconnected');
      }, connectionPolicy.timeoutMs);
      try {
        const connected = await checkDeviceConnection({ signal: controller.signal });
        if (active && !timedOut) setStatus(connected ? 'connected' : 'disconnected');
      } catch {
        if (active) setStatus('disconnected');
      } finally {
        clearTimeout(timeout);
        // Schedule after completion so slow requests never overlap.
        if (active) timer = setTimeout(check, connectionPolicy.intervalMs);
      }
    }

    check();
    return () => {
      active = false;
      clearTimeout(timer);
      clearTimeout(timeout);
      controller?.abort();
    };
  }, []);

  return status;
}
