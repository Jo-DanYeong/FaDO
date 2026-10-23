import React from 'react';
import { Icon } from '../../components/Icon.jsx';
import { PageHeading } from '../../components/PageHeading.jsx';
import { BitmapCanvas } from '../../components/BitmapCanvas.jsx';
import { ExpressionCard } from '../../components/ExpressionCard.jsx';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { getExpressions, getSelectedExpression } from '../../core/workspace.js';

function RecognitionPanel({ state, expression, onPlay }) {
  const rows = [expression, ...state.builtins.filter(item => item.id !== expression.id)].slice(0, 3);
  const values = state.playing ? [96.8, 2.1, 1.1] : [98.2, 1.2, .6];
  return (
    <section className="card recognition-card" aria-labelledby="recognition-title">
      <div className="card-header"><h2 id="recognition-title"><Icon name="scan" />표정 인식</h2><span className="small-badge">DEMO</span></div>
      <div className="recognition-body">
        <div className="recognition-top">
          <div className={`emotion-orb ${expression.color}`}>
            <BitmapCanvas bitmap={expression.bitmap} color="#52725d" aria-label={`${expression.name} 표정`} /><span className="orb-spark spark-one">✦</span><span className="orb-spark spark-two">✧</span>
          </div>
          <div className="recognition-emotion"><span>지금 FaDO의 기분은</span><h3 title={expression.name}>{expression.name}<span className="emotion-period">!</span></h3><span className="recognition-caption">{state.playing ? '표정이 차례로 바뀌고 있어요' : '아래에서 표정을 선택해보세요'}</span></div>
        </div>
        <div className="probability-heading"><span>표정 분포 <span className="muted">예시</span></span>{state.settings.confidence && <span className="confidence-value">{values[0]}<small>%</small></span>}</div>
        <div className="probabilities">
          {rows.map((item, index) => (
            <div key={item.id} className="probability-row"><span>{item.name}</span><div className="probability-track"><div className={`probability-fill ${index === 0 ? 'primary' : ''}`} style={{ width: `${values[index]}%` }} /></div>{state.settings.confidence && <span className="probability-value">{values[index].toFixed(1)}%</span>}</div>
          ))}
        </div>
        <div className="recognition-divider" />
        <button className="button button-primary demo-play" onClick={onPlay}><Icon name={state.playing ? 'pause' : 'play'} />{state.playing ? '데모 일시정지' : '표정 데모 시작하기'}</button>
        <p className="recognition-note"><Icon name="info" />실제 카메라 인식 전, 예시로 체험해보세요.</p>
      </div>
    </section>
  );
}

export function StudioPage({ actions }) {
  const { state, dispatch } = useWorkspace();
  const expression = getSelectedExpression(state);
  const count = getExpressions(state).length;
  return (
    <>
      <PageHeading eyebrow="YOUR EXPRESSION, CONNECTED" title="마음을 전하는 작은 표정" description="당신의 표정을 담아, FaDO와 조금 더 가까워지는 시간." onCreate={() => actions.edit()} />
      <div className="overview-strip">
        <div className="overview-item"><span className="stat-icon green"><Icon name="scan" /></span><div><span className="stat-label">표정 컨트롤</span><strong>{state.mode === 'auto' ? '자동 데모' : '수동 선택'} <span className="stat-tag">{state.playing ? '재생 중' : '준비 완료'}</span></strong></div></div>
        <div className="overview-item"><span className="stat-icon stone"><Icon name="chip" /></span><div><span className="stat-label">OLED 디스플레이</span><strong>128 <span className="times">×</span> 64 <span className="stat-unit">px</span></strong></div><span className="outline-label">SSD1306</span></div>
        <div className="overview-item"><span className="stat-icon peach"><Icon name="grid" /></span><div><span className="stat-label">함께할 수 있는 표정</span><strong>{count}<span className="stat-unit">개의 표정</span></strong></div><a className="stat-arrow" href="#library" aria-label="표정 라이브러리 열기"><Icon name="arrow" /></a></div>
      </div>
      <div className="studio-grid">
        <section className="card preview-card" aria-labelledby="preview-title">
          <div className="card-header"><h2 id="preview-title"><Icon name="studio" />OLED 미리보기</h2><div className="card-header-right"><span className="subtle-status"><i className="status-dot" />PREVIEW</span><button className="icon-button" onClick={actions.exportPng} title="현재 표정 PNG 저장" aria-label="현재 표정 PNG 저장"><Icon name="download" /></button></div></div>
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
            <div className="segmented" aria-label="표정 제어 모드">
              <button className={state.mode === 'manual' ? 'active' : ''} onClick={() => dispatch({ type: 'set-mode', mode: 'manual' })} aria-pressed={state.mode === 'manual'}><Icon name="pencil" />수동 선택</button>
              <button className={state.mode === 'auto' ? 'active' : ''} onClick={() => dispatch({ type: 'set-mode', mode: 'auto' })} aria-pressed={state.mode === 'auto'}><Icon name="bolt" />자동 데모</button>
            </div>
            <div className="brightness-control"><Icon name="sun" /><label className="sr-only" htmlFor="brightness">OLED 미리보기 밝기</label><input id="brightness" type="range" min="10" max="100" value={state.settings.brightness} aria-valuetext={`${state.settings.brightness}%`} onChange={event => dispatch({ type: 'update-settings', patch: { brightness: Number(event.target.value) } })} /><span id="brightness-value">{state.settings.brightness}%</span></div>
          </div>
        </section>
        <RecognitionPanel state={state} expression={expression} onPlay={() => dispatch({ type: 'toggle-demo' })} />
      </div>
      <section className="quick-library" aria-labelledby="quick-title">
        <div className="section-heading"><div><h2 id="quick-title">어떤 마음을 전해볼까요? <span className="count-badge">{count}</span></h2><p>표정을 선택하면 OLED 미리보기에 바로 나타나요.</p></div><a className="text-link" href="#library">전체 라이브러리 <Icon name="arrow" /></a></div>
        <div className="expression-grid quick-grid">{state.builtins.map(item => <ExpressionCard key={item.id} expression={item} selected={state.selected} actions={actions} quick />)}</div>
      </section>
      <div className="bottom-note"><span className="note-icon"><Icon name="pencil" /></span><div><strong>세상에 하나뿐인, 나만의 표정</strong><p>픽셀을 그려 FaDO에게 새로운 표정을 선물해보세요.</p></div><button className="text-link" onClick={() => actions.edit()}>직접 그려보기 <Icon name="arrow" /></button><span className="note-decoration">✳</span></div>
    </>
  );
}
