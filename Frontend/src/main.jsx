import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { WorkspaceProvider } from './context/WorkspaceContext.jsx';

const root = createRoot(document.getElementById('app'));
root.render(<StrictMode><ToastProvider><WorkspaceProvider><App /></WorkspaceProvider></ToastProvider></StrictMode>);
if (import.meta.webpackHot) import.meta.webpackHot.dispose(() => root.unmount());
