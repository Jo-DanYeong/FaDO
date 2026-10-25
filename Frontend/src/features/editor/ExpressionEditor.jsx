import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { BitmapCanvas } from '../../components/BitmapCanvas.jsx';
import { WIDTH, HEIGHT } from '../../utils/bitmap.js';
import { createExpressionId } from '../../utils/id.js';
import { createEditorModel } from './model.js';

export function ExpressionEditor({ expression, onSave, onClose }) {
  const [model] = useState(() => createEditorModel(expression?.bitmap));
  const [revision, refresh] = useReducer(value => value + 1, 0);
  const [tool, setTool] = useState('pencil');
  const [brush, setBrush] = useState(4);
  const [name, setName] = useState(expression?.name || '');
  const [error, setError] = useState('');
  const [cursor, setCursor] = useState({ x: 64, y: 32 });
  const [focused, setFocused] = useState(false);
  const dialog = useRef(null);
  const canvas = useRef(null);
  const drawing = useRef(null);
  const preview = useMemo(() => model.snapshot(), [model, revision]);

  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);

  useEffect(() => {
    const element = canvas.current;
    const context = element.getContext('2d');
    context.fillStyle = '#18241f';
    context.fillRect(0, 0, element.width, element.height);
    context.fillStyle = '#b7f1c9';
    model.pixels.forEach((pixel, index) => {
      if (pixel) context.fillRect(index % WIDTH * 6, Math.floor(index / WIDTH) * 6, 6, 6);
    });
    context.strokeStyle = 'rgba(194,232,205,.07)';
    context.lineWidth = 1;
    context.beginPath();
    for (let x = 0; x <= element.width; x += 24) { context.moveTo(x + .5, 0); context.lineTo(x + .5, element.height); }
    for (let y = 0; y <= element.height; y += 24) { context.moveTo(0, y + .5); context.lineTo(element.width, y + .5); }
    context.stroke();
    if (focused) { context.strokeStyle = '#ffffff'; context.strokeRect(cursor.x * 6, cursor.y * 6, brush * 6, brush * 6); }
  }, [model, revision, cursor, focused, brush]);

  function position(event) {
    const bounds = canvas.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(WIDTH - 1, Math.floor((event.clientX - bounds.left) / bounds.width * WIDTH))),
      y: Math.max(0, Math.min(HEIGHT - 1, Math.floor((event.clientY - bounds.top) / bounds.height * HEIGHT))),
    };
  }
  function beginStroke(event) {
    event.preventDefault();
    canvas.current.focus();
    model.checkpoint();
    drawing.current = position(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    model.paint(drawing.current.x, drawing.current.y, brush, tool);
    refresh();
  }
  function continueStroke(event) {
    if (!drawing.current) return;
    const next = position(event);
    model.paintLine(drawing.current, next, brush, tool);
    drawing.current = next;
    refresh();
  }
  function handleKey(event) {
    const moves = { ArrowLeft: [-brush, 0], ArrowRight: [brush, 0], ArrowUp: [0, -brush], ArrowDown: [0, brush] };
    if (moves[event.key]) {
      event.preventDefault();
      const [dx, dy] = moves[event.key];
      setCursor(value => ({ x: Math.max(0, Math.min(WIDTH - brush, value.x + dx)), y: Math.max(0, Math.min(HEIGHT - brush, value.y + dy)) }));
    } else if (event.code === 'Space') {
      event.preventDefault();
      model.checkpoint();
      model.paint(cursor.x, cursor.y, brush, tool);
      refresh();
    }
  }
  function submit(event) {
    event.preventDefault();
    if (!name.trim()) { setError('표정 이름을 입력해주세요.'); return; }
    if (model.isEmpty()) { setError('표정을 먼저 그려주세요.'); return; }
    onSave({
      id: expression?.custom ? expression.id : createExpressionId(),
      name: name.trim(), bitmap: model.snapshot(), english: 'Custom', color: 'green', custom: true, note: '내가 만든 작은 표정',
    });
  }

  return (
    <dialog ref={dialog} id="editor-dialog" className="editor-dialog" aria-labelledby="editor-title" onCancel={event => { event.preventDefault(); onClose(); }}>
      <form id="expression-form" onSubmit={submit}>
        <div className="dialog-heading"><div><span className="eyebrow">A LITTLE FACE, MADE BY YOU</span><h2 id="editor-title">{expression?.custom ? '표정 편집하기' : '나만의 표정 만들기'}</h2><p>픽셀 하나에 마음을 담아보세요.</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="편집기 닫기"><Icon name="close" /></button></div>
        <div className="editor-body">
          <div className="editor-toolbar">
            <div className="tool-group">
              <button type="button" className={`tool ${tool === 'pencil' ? 'active' : ''}`} onClick={() => setTool('pencil')} title="그리기" aria-label="그리기" aria-pressed={tool === 'pencil'}><Icon name="pencil" /></button>
              <button type="button" className={`tool ${tool === 'eraser' ? 'active' : ''}`} onClick={() => setTool('eraser')} title="지우개" aria-label="지우개" aria-pressed={tool === 'eraser'}><Icon name="eraser" /></button>
              <span className="tool-divider" />
              <button type="button" className="tool" onClick={() => { model.undo(); refresh(); }} disabled={!model.canUndo} title="되돌리기" aria-label="되돌리기"><Icon name="undo" /></button>
              <button type="button" className="tool" onClick={() => { model.clear(); refresh(); }} title="모두 지우기" aria-label="모두 지우기"><Icon name="trash" /></button>
            </div>
            <label className="brush-label">브러시 <select id="brush-size" aria-label="브러시 크기" value={brush} onChange={event => { const size = Number(event.target.value); setBrush(size); setCursor(value => ({ x: Math.min(WIDTH - size, value.x), y: Math.min(HEIGHT - size, value.y) })); }}>{[2, 4, 8].map(size => <option key={size} value={size}>{size} px</option>)}</select></label>
          </div>
          <div className="drawing-wrap"><canvas ref={canvas} id="pixel-editor" className={tool === 'eraser' ? 'eraser-cursor' : ''} width={768} height={384} tabIndex={0} aria-label="128 × 64 픽셀 편집 영역. 마우스 또는 터치로 그리기. 키보드는 방향키로 이동, Space로 그리기." onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onKeyDown={handleKey} onPointerDown={beginStroke} onPointerMove={continueStroke} onPointerUp={() => { drawing.current = null; }} onPointerCancel={() => { drawing.current = null; }} onLostPointerCapture={() => { drawing.current = null; }} /></div>
          <div className="canvas-caption"><span><i className="status-dot" />128 × 64 px <span className="muted">· SSD1306</span></span><span>드래그해서 그려보세요</span></div>
          <div className="editor-fields"><label className="field">표정 이름 <input id="expression-name" maxLength={20} placeholder="예: 윙크하는 FaDO" required autoComplete="off" value={name} onChange={event => { setName(event.target.value); setError(''); }} /></label><div className="mini-preview"><span>OLED 미리보기</span><div><BitmapCanvas id="editor-preview" bitmap={preview} /></div></div></div>
          {error && <p className="editor-error" role="alert">{error}</p>}
          <p className="editor-hint"><Icon name="info" />저장한 표정은 이 브라우저의 표정 라이브러리에 보관됩니다.</p>
        </div>
        <div className="dialog-footer"><button type="button" className="button button-secondary" onClick={onClose}>취소</button><button type="submit" className="button button-primary"><Icon name="check" />표정 저장하기</button></div>
      </form>
    </dialog>
  );
}
