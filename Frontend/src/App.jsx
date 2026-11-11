import React, { lazy, Suspense, useRef, useState } from 'react';
import { Layout } from './components/Layout.jsx';
import { useHashRoute } from './hooks/useHashRoute.js';
import { useExpressionActions } from './features/useExpressionActions.js';
import { useDeviceConnection } from './hooks/useDeviceConnection.js';
const StudioPage = lazy(() => import(/* webpackChunkName: "studio" */ './pages/studio/StudioPage.jsx').then(module => ({ default: module.StudioPage })));
const LibraryPage = lazy(() => import(/* webpackChunkName: "library" */ './pages/library/LibraryPage.jsx').then(module => ({ default: module.LibraryPage })));
const SettingsPage = lazy(() => import(/* webpackChunkName: "settings" */ './pages/settings/SettingsPage.jsx').then(module => ({ default: module.SettingsPage })));
const GuidePage = lazy(() => import(/* webpackChunkName: "guide" */ './pages/guide/GuidePage.jsx').then(module => ({ default: module.GuidePage })));
const ExpressionEditor = lazy(() => import(/* webpackChunkName: "editor" */ './features/editor/ExpressionEditor.jsx').then(module => ({ default: module.ExpressionEditor })));

const pages = { studio: StudioPage, library: LibraryPage, settings: SettingsPage, guide: GuidePage };

export function App() {
  const page = useHashRoute();
  const connectionStatus = useDeviceConnection();
  const [editor, setEditor] = useState(null);
  const nextEditorId = useRef(0);
  const actions = useExpressionActions(request => setEditor({ ...request, id: ++nextEditorId.current }));
  const Page = pages[page];

  return (
    <>
      <Layout page={page} connectionStatus={connectionStatus}><Suspense fallback={<div className="page-loading" role="status">화면을 준비하고 있어요.</div>}><Page actions={actions} connectionStatus={connectionStatus} editorOpen={Boolean(editor)} /></Suspense></Layout>
      <Suspense fallback={null}>{editor && <ExpressionEditor key={editor.id} mode={editor.mode} expression={editor.expression} onClose={() => setEditor(null)} onSave={expression => { actions.save(expression); setEditor(null); }} />}</Suspense>
    </>
  );
}
