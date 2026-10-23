import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { PageHeading } from '../../components/PageHeading.jsx';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useCamera } from '../../hooks/useCamera.js';

function SettingSwitch({ label, description, enabled, onChange }) {
  return <div className="setting-row separated"><div><strong>{label}</strong><p>{description}</p></div><button className={`toggle ${enabled ? 'on' : ''}`} role="switch" aria-checked={enabled} aria-label={label} onClick={onChange}><span /></button></div>;
}

export function SettingsPage() {
  const { state, dispatch } = useWorkspace();
  const settings = state.settings;
  const [draft, setDraft] = useState(() => ({ deviceName: settings.deviceName, host: settings.host }));
  const notify = useToast();
  const { camera, cameraPending, toggleCamera } = useCamera();
  const video = useRef(null);
  const updateSettings = patch => dispatch({ type: 'update-settings', patch });

  useEffect(() => {
    const element = video.current;
    element.srcObject = camera;
    return () => { element.srcObject = null; };
  }, [camera]);

  function saveConnection(event) {
    event.preventDefault();
    const deviceName = draft.deviceName.trim();
    const host = draft.host.trim();
    if (!deviceName) { notify('기기 이름을 입력해주세요.'); return; }
    if (host && !/^https?:\/\//i.test(host)) { notify('http:// 또는 https:// 주소를 입력해주세요.'); return; }
    setDraft({ deviceName, host });
    updateSettings({ deviceName, host });
    notify('연결 정보를 이 브라우저에 저장했어요.');
  }

  return (
    <>
      <PageHeading eyebrow="MAKE IT YOURS" title="FaDO와 연결되는 방법" description="내 기기의 연결 정보를 준비하고, 나에게 맞는 화면으로 설정하세요." />
      <div className="settings-grid">
        <section className="card settings-card">
          <div className="card-header"><h2><Icon name="chip" />기기 연결 정보</h2><span className="neutral-badge"><i className="status-dot muted-dot" />미연결</span></div>
          <form id="settings-form" className="settings-body" onSubmit={saveConnection}>
            <div className="info-box"><Icon name="info" /><p>현재는 프론트엔드 데모입니다. 연결 정보는 이 브라우저에 저장되며 실제 기기 통신은 백엔드 연동 후 사용할 수 있어요.</p></div>
            <label className="field">기기 이름<input name="deviceName" required maxLength={30} value={draft.deviceName} placeholder="나의 FaDO" onChange={event => setDraft(value => ({ ...value, deviceName: event.target.value }))} /></label>
            <label className="field">Raspberry Pi 서버 주소<input name="host" type="url" value={draft.host} placeholder="http://raspberrypi.local:8000" aria-label="Raspberry Pi 서버 주소" onChange={event => setDraft(value => ({ ...value, host: event.target.value }))} /><span className="field-hint">추후 연결할 API 서버의 전체 주소를 입력해주세요.</span></label>
            <div className="hardware-spec"><div><span>디스플레이</span><strong>SSD1306 OLED</strong></div><div><span>해상도</span><strong>128 × 64 px</strong></div><div><span>입력 장치</span><strong>Raspberry Pi Cam</strong></div></div>
            <button className="button button-primary" type="submit"><Icon name="check" />연결 정보 저장</button>
          </form>
        </section>
        <div className="settings-right">
          <section className="card settings-card">
            <div className="card-header"><h2><Icon name="sun" />화면 및 인식 설정</h2></div>
            <div className="settings-body">
              <div className="setting-row"><div><strong>미리보기 밝기</strong><p>OLED 미리보기의 밝기를 조절해요.</p></div><output id="settings-brightness-value">{settings.brightness}%</output></div>
              <input className="settings-range" id="settings-brightness" type="range" min="10" max="100" value={settings.brightness} aria-label="미리보기 밝기" onChange={event => updateSettings({ brightness: Number(event.target.value) })} />
              <SettingSwitch label="카메라 좌우 반전" description="거울을 보는 것처럼 자연스럽게." enabled={settings.mirror} onChange={() => updateSettings({ mirror: !settings.mirror })} />
              <SettingSwitch label="인식 신뢰도 표시" description="데모 표정의 예시 수치를 표시해요." enabled={settings.confidence} onChange={() => updateSettings({ confidence: !settings.confidence })} />
            </div>
          </section>
          <section className="card camera-card">
            <div className="card-header"><h2><Icon name="camera" />카메라 확인</h2><span className="small-badge">LOCAL</span></div>
            <div className={`camera-view ${camera ? 'has-camera' : ''}`}>
              <video ref={video} id="camera-video" className={settings.mirror ? 'mirrored' : ''} autoPlay muted playsInline hidden={!camera} aria-label="로컬 카메라 미리보기" />
              {!camera && <span className="camera-placeholder"><Icon name="camera" /><strong>카메라를 확인해보세요</strong><span>브라우저 카메라 미리보기</span></span>}
            </div>
            <div className="camera-footer"><p>영상은 전송·저장되지 않아요.<br /><span>표정 인식 모델은 아직 연결되지 않았어요.</span></p><button className="button button-secondary" onClick={toggleCamera} disabled={cameraPending}><Icon name={camera ? 'pause' : 'camera'} />{cameraPending ? '요청 중…' : camera ? '카메라 끄기' : '카메라 켜기'}</button></div>
          </section>
        </div>
      </div>
    </>
  );
}
