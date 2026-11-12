import React, { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react';
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
  const [cameraCredentials, setCameraCredentials] = useState(null);
  const [autoDisplayEnabled, setAutoDisplayEnabled] = useState(true);
  const [manualDisplayHold, setManualDisplayHold] = useState(null);
  const notify = useToast();
  const { settings, custom, builtins, persistedSelected } = state;

  useEffect(() => {
    if (!saveWorkspace({ settings, custom, builtins, selected: persistedSelected })) {
      notify('브라우저 저장 공간이 부족합니다. 표정을 JSON으로 내보내주세요.');
    }
  }, [settings, custom, builtins, persistedSelected, notify]);

  const value = useMemo(() => ({
    state, dispatch, cameraCredentials, setCameraCredentials, autoDisplayEnabled, setAutoDisplayEnabled,
    manualDisplayHold, setManualDisplayHold,
  }), [state, cameraCredentials, autoDisplayEnabled, manualDisplayHold]);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return workspace;
}
