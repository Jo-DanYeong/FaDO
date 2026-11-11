import React, { useCallback, useEffect } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { PageHeading } from '../../components/PageHeading.jsx';
import { BitmapCanvas } from '../../components/BitmapCanvas.jsx';
import { ExpressionCard } from '../../components/ExpressionCard.jsx';
import { CameraRecognitionPanel } from '../../components/CameraRecognitionPanel.jsx';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { getExpressions, getSelectedExpression } from '../../core/workspace.js';
import { useCameraRecognition } from '../../hooks/useCameraRecognition.js';

export function StudioPage({ actions, editorOpen }) {
  const { state, dispatch } = useWorkspace();
  const expression = getSelectedExpression(state);
  const count = getExpressions(state).length;
  const { select } = actions;
  const recognition = useCameraRecognition(select);
  const { live, stopLive } = recognition;
  const selectManually = useCallback(id => {
    if (live) stopLive();
    return select(id);
  }, [live, stopLive, select]);
  const create = () => {
    if (live) stopLive();
    actions.create();
  };

  useEffect(() => {
    const selectShortcut = event => {
      const focused = document.activeElement;
      const typing = /INPUT|TEXTAREA|SELECT/.test(focused?.tagName) || focused?.isContentEditable;
      if (editorOpen || typing || event.ctrlKey || event.metaKey || event.altKey) return;
      const preset = state.builtins.find(item => item.key === event.key);
      if (preset) { event.preventDefault(); selectManually(preset.id); }
    };
    document.addEventListener('keydown', selectShortcut);
    return () => document.removeEventListener('keydown', selectShortcut);
  }, [editorOpen, state.builtins, selectManually]);

  const previewStatus = actions.uploadingId ? '전송 중…' : recognition.lastSentId === expression.id && live ? '자동 전송 완료' : '미리보기';
  return (
    <>
      <PageHeading eyebrow="YOUR EXPRESSION, CONNECTED" title="마음을 전하는 작은 표정" description="당신의 표정을 담아, FaDO와 조금 더 가까워지는 시간." onCreate={create} />
      <div className="overview-strip">
        <div className="overview-item"><span className="stat-icon green"><Icon name="scan" /></span><div><span className="stat-label">표정 컨트롤</span><strong>{live ? '카메라 자동 인식' : '수동 선택'} <span className="stat-tag">{live ? '실행 중' : '대기 중'}</span></strong></div></div>
        <div className="overview-item"><span className="stat-icon stone"><Icon name="chip" /></span><div><span className="stat-label">OLED 디스플레이</span><strong>128 <span className="times">×</span> 64 <span className="stat-unit">px</span></strong></div><span className="outline-label">SSD1306</span></div>
        <div className="overview-item"><span className="stat-icon peach"><Icon name="grid" /></span><div><span className="stat-label">함께할 수 있는 표정</span><strong>{count}<span className="stat-unit">개의 표정</span></strong></div><a className="stat-arrow" href="#library" aria-label="표정 라이브러리 열기"><Icon name="arrow" /></a></div>
      </div>
      <div className="studio-grid">
        <section className="card preview-card" aria-labelledby="preview-title">
          <div className="card-header"><h2 id="preview-title"><Icon name="studio" />OLED 미리보기</h2><div className="card-header-right"><span className="subtle-status" role="status">{previewStatus}</span><button className="icon-button" onClick={actions.exportPng} title="현재 표정 PNG 저장" aria-label="현재 표정 PNG 저장"><Icon name="download" /></button></div></div>
          <div className="display-stage">
            <div className="display-stage-top"><span>FaDO DISPLAY</span><span>01 / EXPRESSION</span></div>
            <div className="oled-device">
              <i className="device-screw screw-tl" /><i className="device-screw screw-tr" />
              <div className="oled-screen"><div className="screen-grid" /><BitmapCanvas className="large-face" bitmap={expression.bitmap} style={{ opacity: state.settings.brightness / 100 }} aria-label={`현재 표정: ${expression.name}`} /></div>
              <i className="device-screw screw-bl" /><i className="device-screw screw-br" /><div className="device-pins"><i /><i /><i /><i /></div>
            </div>
            <div className="display-stage-bottom"><span className={`expression-chip ${expression.color}`}><i className="status-dot" />{expression.name}</span><span className="stage-label">{expression.english.toUpperCase()}</span></div>
          </div>
          <div className="preview-controls">
            <div className="brightness-control"><Icon name="sun" /><label className="sr-only" htmlFor="brightness">OLED 미리보기 밝기</label><input id="brightness" type="range" min="10" max="100" value={state.settings.brightness} aria-valuetext={`${state.settings.brightness}%`} onChange={event => dispatch({ type: 'update-settings', patch: { brightness: Number(event.target.value) } })} /><span id="brightness-value">{state.settings.brightness}%</span></div>
          </div>
        </section>
        <CameraRecognitionPanel recognition={recognition} showSentPreview={false} />
      </div>
      <section className="quick-library" aria-labelledby="quick-title">
        <div className="section-heading"><div><h2 id="quick-title">어떤 마음을 전해볼까요? <span className="count-badge">{count}</span></h2><p>직접 고르면 자동 인식을 중지하고 선택한 표정을 OLED로 보내요.</p></div><a className="text-link" href="#library">전체 라이브러리 <Icon name="arrow" /></a></div>
        <div className="expression-grid quick-grid">{state.builtins.map(item => <ExpressionCard key={item.id} expression={item} selected={state.selected} actions={{ ...actions, select: selectManually }} quick />)}</div>
      </section>
      <div className="bottom-note"><span className="note-icon"><Icon name="pencil" /></span><div><strong>세상에 하나뿐인, 나만의 표정</strong><p>픽셀을 그려 FaDO에게 새로운 표정을 선물해보세요.</p></div><button className="text-link" onClick={create}>직접 그려보기 <Icon name="arrow" /></button><span className="note-decoration">✳</span></div>
    </>
  );
}
