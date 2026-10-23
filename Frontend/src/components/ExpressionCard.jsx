import React from 'react';
import { BitmapCanvas } from './BitmapCanvas.jsx';
import { Icon } from './Icon.jsx';

const faceColors = {
  green: '#54785e', stone: '#6b766a', blue: '#637b9b',
  pink: '#aa6d6d', yellow: '#9d864b', lavender: '#98738d',
};

export function ExpressionCard({ expression, selected, actions, quick = false }) {
  const active = expression.id === selected;
  return (
    <article className={`expression-card ${active ? 'selected' : ''} ${quick ? 'quick' : ''}`}>
      <button className="expression-select" onClick={() => actions.select(expression.id)} aria-label={`${expression.name} 표정 선택`} aria-pressed={active}>
        <span className={`expression-art ${expression.color}`}>
          <BitmapCanvas bitmap={expression.bitmap} color={faceColors[expression.color]} aria-hidden="true" />
          {active && <span className="selected-check"><Icon name="check" /></span>}
        </span>
        <span className="expression-info"><strong>{expression.name}</strong><span>{expression.english}</span></span>
        {quick ? <kbd>{expression.key}</kbd> : <span className="expression-note">{expression.note}</span>}
      </button>
      {!quick && (
        <div className="expression-actions">
          <span className="preset-tag">{expression.custom ? '내 표정' : '기본 표정'}</span>
          <div>
            <button className="icon-button" onClick={() => actions.edit(expression.id)} aria-label={`${expression.name} ${expression.custom ? '편집' : '복사해서 편집'}`}><Icon name="pencil" /></button>
            <button className="icon-button" onClick={() => actions.exportJson(expression.id)} aria-label={`${expression.name} JSON 내보내기`}><Icon name="download" /></button>
            {expression.custom && <button className="icon-button danger" onClick={() => actions.remove(expression.id)} aria-label={`${expression.name} 삭제`}><Icon name="trash" /></button>}
          </div>
        </div>
      )}
    </article>
  );
}
