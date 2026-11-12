import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { getExpressions, getSelectedExpression } from '../core/workspace.js';
import { exportExpressionJson, exportExpressionPng } from '../services/export.js';
import { deleteExpressionPng, expressionHoldIntervalMs, renewExpressionHold, sendExpression, uploadExpressionPng } from '../services/api.js';
import { createExpressionId } from '../utils/id.js';

export function useExpressionActions(openEditor) {
  const { state, dispatch, manualDisplayHold, setManualDisplayHold, setAutoDisplayEnabled } = useWorkspace();
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

  useEffect(() => {
    if (!manualDisplayHold) return;
    const controller = new AbortController();
    const { token } = manualDisplayHold;
    let timer;
    async function renew() {
      try {
        const renewed = await renewExpressionHold(token, { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!renewed) {
          setManualDisplayHold(hold => hold?.token === token ? null : hold);
          return;
        }
      } catch {
        // Retry temporary failures. The device expires the hold if renewals stop.
      }
      if (!controller.signal.aborted) timer = setTimeout(renew, expressionHoldIntervalMs);
    }
    function stop() {
      clearTimeout(timer);
      controller.abort();
    }
    timer = setTimeout(renew, expressionHoldIntervalMs);
    window.addEventListener('pagehide', stop);
    return () => {
      window.removeEventListener('pagehide', stop);
      stop();
    };
  }, [manualDisplayHold, setManualDisplayHold]);

  // Save, select and delete in event order so a late upload cannot undo a delete.
  const enqueue = useCallback(task => {
    const next = requestQueue.current.then(() => active.current ? task() : false);
    requestQueue.current = next.catch(() => {});
    return next;
  }, []);

  const showExpression = useCallback(async (id, { signal, source = 'manual' } = {}) => {
    const holdToken = source === 'manual' ? createExpressionId() : undefined;
    await sendExpression(id, { signal, holdToken });
    if (active.current && !signal?.aborted) {
      setManualDisplayHold(holdToken ? { id, token: holdToken } : null);
    }
  }, [setManualDisplayHold]);

  const select = useCallback((id, { signal, source = 'manual' } = {}) => {
    const expression = expressions.get(id);
    if (!expression || pendingDelete.current === id || signal?.aborted) return Promise.resolve(false);
    if (source === 'manual') setAutoDisplayEnabled(false);
    const saveVersion = localSaveVersion.current;
    return enqueue(async () => {
      if (signal?.aborted) return false;
      setUploadingId(id);
      try {
        await uploadExpressionPng(expression, { signal });
        if (!active.current || signal?.aborted) return false;
        await showExpression(id, { signal, source });
        // Preserve a newer editor save while this older request was pending.
        if (active.current && !signal?.aborted && localSaveVersion.current === saveVersion) {
          dispatch({ type: source === 'camera' ? 'recognize-expression' : 'select', id });
        }
        return active.current && !signal?.aborted;
      } catch (error) {
        if (active.current && !signal?.aborted) notify(error.message || '표정을 전송하지 못했어요.');
        return false;
      } finally {
        if (active.current) setUploadingId(null);
      }
    });
  }, [expressions, enqueue, dispatch, notify, setAutoDisplayEnabled, showExpression]);

  function persist(expression, { applyToOled = false, successMessage = '표정을 저장했어요.' } = {}) {
    if (applyToOled) setAutoDisplayEnabled(false);
    return enqueue(async () => {
      setUploadingId(expression.id);
      let uploaded = false;
      try {
        await uploadExpressionPng(expression);
        uploaded = true;
        if (!active.current) return false;
        if (applyToOled) await showExpression(expression.id);
        if (active.current) notify(successMessage);
        return true;
      } catch (error) {
        if (active.current) {
          const reason = uploaded ? 'OLED에 표시하지 못했어요.' : '표정을 서버에 저장하지 못했어요.';
          notify(`${reason} 표정을 다시 선택해주세요. (${error.message || '연결 오류'})`);
        }
        return false;
      } finally {
        if (active.current) setUploadingId(null);
      }
    });
  }

  return {
    select,
    uploadingId,
    deletingId,
    create() {
      openEditor({ mode: 'create' });
    },
    edit(id) {
      const expression = find(id);
      if (!expression || pendingDelete.current === id) return;
      openEditor({ mode: 'edit', expression });
    },
    save(expression) {
      // Keep the drawing locally even when the backend is unavailable.
      localSaveVersion.current += 1;
      dispatch({ type: 'save-expression', expression });
      return expression.custom ? persist(expression)
        : persist(expression, { applyToOled: true, successMessage: '수정한 기본 표정을 OLED에 적용했어요.' });
    },
    restorePreset(id) {
      const original = state.originalBuiltins.find(item => item.id === id);
      if (!original || !find(id)?.modified) return;
      localSaveVersion.current += 1;
      dispatch({ type: 'restore-preset', id });
      return persist(original, { applyToOled: true, successMessage: '기본 표정을 원본으로 복원했어요.' });
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
            setManualDisplayHold(hold => hold?.id === id ? null : hold);
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
