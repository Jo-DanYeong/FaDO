import { useEffect, useState } from 'react';
import { pageLabels, resolvePage } from '../core/router.js';

export function useHashRoute() {
  const [page, setPage] = useState(() => resolvePage(window.location.hash));
  useEffect(() => {
    const navigate = () => setPage(resolvePage(window.location.hash));
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);
  useEffect(() => {
    document.title = `${pageLabels[page]} · FaDO`;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [page]);
  return page;
}
