import React from 'react';
import { BitmapCanvas } from './BitmapCanvas.jsx';
import { Icon } from './Icon.jsx';

const faceColors = {
  green: '#54785e', stone: '#6b766a', blue: '#637b9b',
  pink: '#aa6d6d', yellow: '#9d864b', lavender: '#98738d',
};

export function ExpressionCard({ expression, selected, actions, quick = false }) {
  const active = expression.id === selected;
  const deleting = actions.deletingId === expression.id;
  const uploading = actions.uploadingId === expression.id;
  return (
    <article className={`expression-card ${active ? 'selected' : ''} ${quick ? 'quick' : ''}`} aria-busy={uploading || deleting}>
      <button className="expression-select" onClick={() => actions.select(expression.id)} disabled={deleting} aria-label={`${expression.name} 표정 선택`} aria-pressed={active}>
        <span className={`expression-art ${expression.color}`}>
          <BitmapCanvas bitmap={expression.bitmap} color={faceColors[expression.color]} aria-hidden="true" />
          {active && <span className="selected-check"><Icon name="check" /></span>}
        </span>
        <span className="expression-info"><strong>{expression.name}</strong><span>{expression.english}</span></span>
        {quick ? <kbd>{expression.key}</kbd> : <span className="expression-note">{expression.note}</span>}
      </button>
      {!quick && (
        <div className="expression-actions">
          <span className="preset-tag">{uploading ? '저장 중…' : expression.custom ? '내 표정' : expression.modified ? '기본 표정 · 수정됨' : '기본 표정'}</span>
          <div>
            <button className="expression-command" onClick={() => actions.edit(expression.id)} disabled={deleting} aria-label={`${expression.name} 수정`}>수정</button>
            {expression.modified && <button className="expression-command" onClick={() => actions.restorePreset(expression.id)} aria-label={`${expression.name} 원본 복원`} title="원본 복원 후 OLED에 적용">원본 복원</button>}
            <button className="icon-button" onClick={() => actions.exportJson(expression.id)} aria-label={`${expression.name} JSON 내보내기`}><Icon name="download" /></button>
            {expression.custom && <button className="icon-button danger" onClick={() => actions.remove(expression.id)} disabled={Boolean(actions.deletingId)} aria-busy={deleting} title={deleting ? '삭제 중…' : '표정과 서버 PNG 삭제'} aria-label={`${expression.name} 삭제`}><Icon name="trash" /></button>}
          </div>
        </div>
      )}
    </article>
  );
}
