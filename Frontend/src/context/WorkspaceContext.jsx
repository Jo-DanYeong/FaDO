import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { createInitialWorkspace, workspaceReducer } from '../core/workspace.js';
import { readWorkspace, saveWorkspace } from '../services/storage.js';
import { presets } from '../data/presets.js';
import { makeBitmap } from '../utils/bitmap.js';
import { useToast } from './ToastContext.jsx';

const WorkspaceContext = createContext(null);

function initialize() {
  return createInitialWorkspace(readWorkspace(), presets.map(item => ({ ...item, bitmap: makeBitmap(item.id) })));
}

export function WorkspaceProvider({ children, initialState }) {
  const [state, dispatch] = useReducer(workspaceReducer, initialState, value => value || initialize());
  const notify = useToast();
  const { settings, custom, persistedSelected } = state;

  useEffect(() => {
    if (!saveWorkspace({ settings, custom, selected: persistedSelected })) {
      notify('브라우저 저장 공간이 부족합니다. 표정을 JSON으로 내보내주세요.');
    }
  }, [settings, custom, persistedSelected, notify]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return workspace;
}
