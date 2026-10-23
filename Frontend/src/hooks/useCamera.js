import { useEffect, useMemo, useState } from 'react';
import { createCamera } from '../services/camera.js';
import { useToast } from '../context/ToastContext.jsx';

export function useCamera() {
  const [state, setState] = useState({ camera: null, cameraPending: false });
  const notify = useToast();
  const service = useMemo(() => createCamera({ onChange: setState, notify }), [notify]);
  useEffect(() => {
    window.addEventListener('pagehide', service.stop);
    return () => {
      window.removeEventListener('pagehide', service.stop);
      service.stop();
    };
  }, [service]);
  return { ...state, toggleCamera: service.toggle };
}
