import React from 'react';

const paths = {
  studio: <><rect x="3" y="3" width="18" height="14" rx="3"/><path d="M8 21h8m-4-4v4"/><path d="M8 8h.01M16 8h.01M8.5 11.5q3.5 3 7 0"/></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
  settings: <><path d="m9 3-.5 2a8 8 0 0 0-2 1L4.5 5.5l-2 3.5L4 10.5v3L2.5 15l2 3.5 2-.5a8 8 0 0 0 2 1L9 21h6l.5-2a8 8 0 0 0 2-1l2 .5 2-3.5-1.5-1.5v-3L21.5 9l-2-3.5-2 .5a8 8 0 0 0-2-1L15 3Z"/><circle cx="12" cy="12" r="3"/></>,
  arrow: <><path d="M5 12h14m-5-5 5 5-5 5"/></>,
  chevron: <><path d="m9 5 7 7-7 7"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  play: <><path d="m8 5 11 7-11 7Z"/></>,
  pause: <><path d="M8 5v14m8-14v14"/></>,
  camera: <><path d="m8 5 1-2h6l1 2h3a2 2 0 0 1 2 2v12H3V7a2 2 0 0 1 2-2Z"/><circle cx="12" cy="12" r="4"/></>,
  face: <><rect x="3" y="3" width="18" height="18" rx="7"/><path d="M8 9h.01M16 9h.01M8 14q4 4 8 0"/></>,
  scan: <><path d="M8 3H4a1 1 0 0 0-1 1v4m13-5h4a1 1 0 0 1 1 1v4M3 16v4a1 1 0 0 0 1 1h4m8 0h4a1 1 0 0 0 1-1v-4M8 9h.01M16 9h.01M9 14q3 3 6 0"/></>,
  chip: <><rect x="6" y="6" width="12" height="12" rx="3"/><path d="M9 3v3m6-3v3M9 18v3m6-3v3M3 9h3m-3 6h3M18 9h3m-3 6h3"/><rect x="10" y="10" width="4" height="4" rx="1"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/></>,
  help: <><circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 3c-1 .4-1 1-1 2m0 3h.01"/></>,
  close: <><path d="m6 6 12 12M6 18 18 6"/></>,
  check: <><path d="m5 12 4 4L19 6"/></>,
  pencil: <><path d="m15 4 5 5M3 21l5-1L21 7a2 2 0 0 0-5-5L3 15Z"/></>,
  eraser: <><path d="m14 3 7 7a2 2 0 0 1 0 3l-8 8H7l-5-5a2 2 0 0 1 0-3L11 3a2 2 0 0 1 3 0ZM7 8l9 9M13 21h9"/></>,
  undo: <><path d="M3 10h10a7 7 0 0 1 0 14M3 10l5-5m-5 5 5 5" transform="translate(0 -3)"/></>,
  trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></>,
  download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></>,
  search: <><circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/></>,
  bolt: <><path d="m13 2-9 12h7l-1 8 10-12h-7Z"/></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
  heart: <><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></>,
};

export function Icon({ name, className = '', ...props }) {
  return <svg className={`icon ${className}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.face}</svg>;
}

export function Logo() {
  return <svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><rect x="1" y="1" width="38" height="38" rx="13" fill="currentColor" /><path d="M10 17v-3h3v-3h3v3h3v3m3 0v-3h3v-3h3v3h3v3M14 24h3v3h7v-3h3" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" /></svg>;
}
