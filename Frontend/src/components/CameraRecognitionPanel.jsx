import React from 'react';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { recognitionPolicy } from '../core/expressionRecognition.js';
import { BitmapCanvas } from './BitmapCanvas.jsx';
import { Icon } from './Icon.jsx';
import { RaspberryCameraPreview } from './RaspberryCameraPreview.jsx';

export function CameraRecognitionPanel({ recognition, showSentPreview = true }) {
  const { state } = useWorkspace();
  const { settings, builtins } = state;
  const {
    video, camera, cameraPending, cameraReady, remoteCamera, toggleCamera, changeCameraSource,
    detections, detectionPending, detect, live, liveMessage, lastSentId, startLive, stopLive,
  } = recognition;
  const sentExpression = builtins.find(item => item.id === lastSentId);

  return (
    <section className="card camera-card" aria-labelledby="camera-recognition-title">
      <div className="card-header"><h2 id="camera-recognition-title"><Icon name="camera" />카메라 표정 인식</h2><span className="small-badge">{live ? '자동 표시 중' : '카메라'}</span></div>
      <div className="camera-source segmented" role="group" aria-label="인식 카메라 선택">
        <button className={!remoteCamera ? 'active' : ''} aria-pressed={!remoteCamera} onClick={() => changeCameraSource('local')}>노트북 카메라</button>
        <button className={remoteCamera ? 'active' : ''} aria-pressed={remoteCamera} onClick={() => changeCameraSource('raspberry')}>라파 카메라</button>
      </div>
      <div hidden={remoteCamera} className={remoteCamera ? undefined : `camera-view ${camera ? 'has-camera' : ''}`}>
        <video ref={video} id="camera-video" className={settings.mirror ? 'mirrored' : ''} autoPlay muted playsInline hidden={remoteCamera || !camera} aria-label="로컬 카메라 미리보기" />
        {!camera && <span className="camera-placeholder"><Icon name="camera" /><strong>노트북 카메라를 켜주세요</strong><span>인식 테스트나 자동 표시를 시작하면 이미지를 전송해요.</span></span>}
      </div>
      {remoteCamera && <RaspberryCameraPreview />}
      <div className="camera-footer">
        <p>인식 테스트는 결과만 보여줘요.<br /><span>OLED 자동 표시를 시작하면 인식한 표정을 기기로 보내요.</span></p>
        <div className="camera-actions">
          {!remoteCamera && <button className="button button-secondary" onClick={toggleCamera} disabled={cameraPending}><Icon name={camera ? 'pause' : 'camera'} />{cameraPending ? '요청 중…' : camera ? '카메라 끄기' : '카메라 켜기'}</button>}
          <button className="button button-secondary" onClick={detect} disabled={!cameraReady || detectionPending || live} aria-busy={detectionPending && !live}><Icon name="scan" />{detectionPending && !live ? '인식 중…' : '카메라 인식 테스트'}</button>
          <button className="button button-primary" onClick={live ? stopLive : startLive} disabled={!cameraReady || (!live && detectionPending)} aria-pressed={live}><Icon name={live ? 'pause' : 'play'} />{live ? 'OLED 자동 표시 중지' : 'OLED 자동 표시 시작'}</button>
        </div>
      </div>
      <div className="camera-oled-status" role="status" aria-live="polite">
        <strong>{live ? '자동 인식 중' : 'OLED 자동 표시'}</strong>
        <p>{liveMessage || (remoteCamera ? '자동 표시를 시작하면 라파 카메라의 표정을 OLED로 보내요.' : '카메라를 켜고 자동 표시를 시작해주세요.')}</p>
        {sentExpression && <div className="camera-oled-preview">{showSentPreview && <BitmapCanvas bitmap={sentExpression.bitmap} color="#ffffff" aria-label={`마지막 전송 PNG: ${sentExpression.name}`} />}<span>마지막 전송 성공: {sentExpression.name}</span></div>}
        <p className="detection-note">가장 큰 얼굴 · 신뢰도 {recognitionPolicy.minConfidence * 100}% 이상 · 같은 표정 {recognitionPolicy.confirmations}회 연속<br />표정이 바뀔 때만 OLED에 보내요. 얼굴이 없으면 마지막 표정을 유지해요.</p>
      </div>
      <div className="detection-results" role="status" aria-live="polite">
        {detectionPending && !live && <p>라파에서 이미지를 분석하고 있어요. 첫 요청은 모델 로딩으로 시간이 걸릴 수 있어요.</p>}
        {!detections && !detectionPending && <p>아직 인식 결과가 없어요.</p>}
        {detections && (detections.length ? <><h3>실제 인식 결과 · 얼굴 {detections.length}개</h3><ul>{detections.map((item, index) => <li key={index}><span className="detection-label"><strong>{builtins.find(preset => preset.id === item.className)?.name || item.className}</strong><small>{item.className}</small></span>{settings.confidence && <span>{(item.confidence * 100).toFixed(1)}%</span>}</li>)}</ul></> : <p>얼굴을 찾지 못했어요. 얼굴이 카메라에 잘 보이도록 해주세요.</p>)}
      </div>
    </section>
  );
}
