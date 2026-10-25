import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Layout } from './components/Layout.jsx';
import { useWorkspace } from './context/WorkspaceContext.jsx';
import { useHashRoute } from './hooks/useHashRoute.js';
import { useDemo } from './hooks/useDemo.js';
import { useExpressionActions } from './features/useExpressionActions.js';
const StudioPage = lazy(() => import(/* webpackChunkName: "studio" */ './pages/studio/StudioPage.jsx').then(module => ({ default: module.StudioPage })));
const LibraryPage = lazy(() => import(/* webpackChunkName: "library" */ './pages/library/LibraryPage.jsx').then(module => ({ default: module.LibraryPage })));
const SettingsPage = lazy(() => import(/* webpackChunkName: "settings" */ './pages/settings/SettingsPage.jsx').then(module => ({ default: module.SettingsPage })));
const GuidePage = lazy(() => import(/* webpackChunkName: "guide" */ './pages/guide/GuidePage.jsx').then(module => ({ default: module.GuidePage })));
const ExpressionEditor = lazy(() => import(/* webpackChunkName: "editor" */ './features/editor/ExpressionEditor.jsx').then(module => ({ default: module.ExpressionEditor })));

const pages = { studio: StudioPage, library: LibraryPage, settings: SettingsPage, guide: GuidePage };

export function App() {
  const page = useHashRoute();
  const { state, dispatch } = useWorkspace();
  const [editor, setEditor] = useState(null);
  const nextEditorId = useRef(0);
  const actions = useExpressionActions(expression => setEditor({ expression, id: ++nextEditorId.current }));
  const { select } = actions;
  const Page = pages[page];
  useDemo(state.playing && page === 'studio', dispatch);

  useEffect(() => { if (page !== 'studio') dispatch({ type: 'stop-demo' }); }, [page, dispatch]);
  useEffect(() => {
    const stop = () => dispatch({ type: 'stop-demo' });
    window.addEventListener('pagehide', stop);
    return () => window.removeEventListener('pagehide', stop);
  }, [dispatch]);
  useEffect(() => {
    const selectShortcut = event => {
      const focused = document.activeElement;
      const typing = /INPUT|TEXTAREA|SELECT/.test(focused?.tagName) || focused?.isContentEditable;
      if (page !== 'studio' || editor || typing || event.ctrlKey || event.metaKey || event.altKey) return;
      const expression = state.builtins.find(item => item.key === event.key);
      if (expression) { event.preventDefault(); select(expression.id); }
    };
    document.addEventListener('keydown', selectShortcut);
    return () => document.removeEventListener('keydown', selectShortcut);
  }, [page, editor, state.builtins, select]);

  return (
    <>
      <Layout page={page}><Suspense fallback={<div className="page-loading" role="status">화면을 준비하고 있어요.</div>}><Page actions={actions} /></Suspense></Layout>
      <Suspense fallback={null}>{editor && <ExpressionEditor key={editor.id} expression={editor.expression} onClose={() => setEditor(null)} onSave={expression => { actions.save(expression); setEditor(null); }} />}</Suspense>
    </>
  );
}
