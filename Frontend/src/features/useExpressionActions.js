import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { getExpressions, getSelectedExpression } from '../core/workspace.js';
import { exportExpressionJson, exportExpressionPng } from '../services/export.js';
import { deleteExpressionPng, sendExpression, uploadExpressionPng } from '../services/api.js';

export function useExpressionActions(openEditor) {
  const { state, dispatch } = useWorkspace();
  const notify = useToast();
  const requestQueue = useRef(Promise.resolve());
  const active = useRef(true);
  const pendingDelete = useRef(null);
  const localSaveVersion = useRef(0);
  const [uploadingId, setUploadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const expressions = useMemo(() => new Map(getExpressions(state).map(item => [item.id, item])), [state.builtins, state.custom]);
  const find = id => expressions.get(id);

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  // Save, select and delete in event order so a late upload cannot undo a delete.
  const enqueue = useCallback(task => {
    const next = requestQueue.current.then(() => active.current ? task() : false);
    requestQueue.current = next.catch(() => {});
    return next;
  }, []);

  const select = useCallback(id => {
    const expression = expressions.get(id);
    if (!expression || pendingDelete.current === id) return Promise.resolve(false);
    const saveVersion = localSaveVersion.current;
    dispatch({ type: 'stop-demo' });
    return enqueue(async () => {
      setUploadingId(id);
      try {
        await uploadExpressionPng(expression);
        if (!active.current) return false;
        await sendExpression(id);
        // Preserve a newer editor save while this older request was pending.
        if (active.current && localSaveVersion.current === saveVersion) dispatch({ type: 'select', id });
        return true;
      } catch (error) {
        if (active.current) notify(error.message || '표정을 전송하지 못했어요.');
        return false;
      } finally {
        if (active.current) setUploadingId(null);
      }
    });
  }, [expressions, enqueue, dispatch, notify]);

  return {
    select,
    uploadingId,
    deletingId,
    edit(id) {
      const expression = id ? find(id) : undefined;
      if (id && !expression) return;
      dispatch({ type: 'stop-demo' });
      openEditor(expression);
    },
    save(expression) {
      // Keep the drawing locally even when the backend is unavailable.
      localSaveVersion.current += 1;
      dispatch({ type: 'save-expression', expression });
      return enqueue(async () => {
        setUploadingId(expression.id);
        try {
          await uploadExpressionPng(expression);
          if (active.current) notify('표정을 저장했어요.');
          return true;
        } catch (error) {
          if (active.current) notify(`표정을 서버에 저장하지 못했어요. 다시 저장하거나 선택해주세요. (${error.message || '연결 오류'})`);
          return false;
        } finally {
          if (active.current) setUploadingId(null);
        }
      });
    },
    remove(id) {
      if (pendingDelete.current) return;
      const expression = state.custom.find(item => item.id === id);
      if (!expression) return;
      pendingDelete.current = id;
      setDeletingId(id);
      return enqueue(async () => {
        try {
          await deleteExpressionPng(id);
          if (active.current) {
            dispatch({ type: 'delete-expression', id });
            notify(`"${expression.name}" 표정을 삭제했어요.`);
          }
        } catch (error) {
          if (active.current) notify(error.message || '표정을 삭제하지 못했어요.');
        } finally {
          pendingDelete.current = null;
          if (active.current) setDeletingId(null);
        }
      });
    },
    exportJson(id) {
      const expression = find(id);
      if (!expression) return;
      exportExpressionJson(expression);
      notify('표정 픽셀 데이터를 JSON으로 저장했어요.');
    },
    async exportPng() {
      try {
        await exportExpressionPng(getSelectedExpression(state));
        notify('128 × 64 PNG로 저장했어요.');
      } catch (error) { notify(error.message); }
    },
  };
}
