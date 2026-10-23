import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { getExpressions, getSelectedExpression } from '../core/workspace.js';
import { exportExpressionJson, exportExpressionPng } from '../services/export.js';
import {sendExpression} from "../services/api.js";

export function useExpressionActions(openEditor) {
  const { state, dispatch } = useWorkspace();
  const notify = useToast();
  const find = id => getExpressions(state).find(item => item.id === id);

  return {
      async select(id) {
      try {
        await sendExpression(id);
        dispatch({ type: 'select', id });
      } catch (error) {
        notify(error.message || '표정을 전송하지 못했어요.');
      }
    },
    edit(id) {
      const expression = id ? find(id) : undefined;
      if (id && !expression) return;
      dispatch({ type: 'stop-demo' });
      openEditor(expression);
    },
    save(expression) {
      dispatch({ type: 'save-expression', expression });
      notify('새로운 마음을 저장했어요. 라이브러리에서 만나보세요.');
    },
    remove(id) {
      const expression = state.custom.find(item => item.id === id);
      if (!expression) return;
      dispatch({ type: 'delete-expression', id });
      notify(`${expression.name} 표정을 삭제했어요.`);
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
