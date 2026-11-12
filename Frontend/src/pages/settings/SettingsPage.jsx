import React, { useState } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { PageHeading } from '../../components/PageHeading.jsx';
import { CameraRecognitionPanel } from '../../components/CameraRecognitionPanel.jsx';
import { DeviceConnectionStatus } from '../../components/DeviceConnectionStatus.jsx';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useCameraRecognition } from '../../hooks/useCameraRecognition.js';

function SettingSwitch({ label, description, enabled, onChange }) {
  return <div className="setting-row separated"><div><strong>{label}</strong><p>{description}</p></div><button className={`toggle ${enabled ? 'on' : ''}`} role="switch" aria-checked={enabled} aria-label={label} onClick={onChange}><span /></button></div>;
}

export function SettingsPage({ actions, connectionStatus }) {
  const { state, dispatch, cameraCredentials, setCameraCredentials } = useWorkspace();
  const settings = state.settings;
  const [draft, setDraft] = useState(() => ({ deviceName: settings.deviceName, host: settings.host }));
  const notify = useToast();
  const recognition = useCameraRecognition(actions.select);
  const updateSettings = patch => dispatch({ type: 'update-settings', patch });

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

  function saveCameraCredentials(event) {
    event.preventDefault();
    const fields = event.currentTarget.elements;
    const usernameInput = fields.namedItem('cameraUsername');
    const username = usernameInput.value.trim();
    const passwordInput = fields.namedItem('cameraPassword');
    const password = passwordInput.value;
    if (!username || username.includes(':') || !password) {
      notify('콜론(:)을 제외한 카메라 아이디와 비밀번호를 입력해주세요.');
      return;
    }
    setCameraCredentials({ username, password });
    usernameInput.value = username;
    passwordInput.value = '';
    notify('이 탭에서 라파 카메라 인증 정보를 사용할 수 있어요.');
  }

  return (
    <>
      <PageHeading eyebrow="MAKE IT YOURS" title="FaDO와 연결되는 방법" description="내 기기의 연결 정보를 준비하고, 나에게 맞는 화면으로 설정하세요." />
      <div className="settings-grid">
        <section className="card settings-card">
          <div className="card-header"><h2><Icon name="chip" />기기 연결 정보</h2><DeviceConnectionStatus status={connectionStatus} className="neutral-badge" prefix="" /></div>
          <form id="settings-form" className="settings-body" onSubmit={saveConnection}>
            <div className="info-box"><Icon name="info" /><p>아래 연결 정보는 이 브라우저에 보관됩니다. 카메라 인식 테스트는 Java 백엔드에 연결된 라파 서버를 사용해요.</p></div>
            <label className="field">기기 이름<input name="deviceName" required maxLength={30} value={draft.deviceName} placeholder="나의 FaDO" onChange={event => setDraft(value => ({ ...value, deviceName: event.target.value }))} /></label>
            <label className="field">Raspberry Pi 서버 주소<input name="host" type="url" value={draft.host} placeholder="http://raspberrypi.local:8000" aria-label="Raspberry Pi 서버 주소" onChange={event => setDraft(value => ({ ...value, host: event.target.value }))} /><span className="field-hint">이 주소는 메모용이며, 실제 연결 주소는 백엔드에서 설정해요.</span></label>
            <div className="hardware-spec"><div><span>디스플레이</span><strong>SSD1306 OLED</strong></div><div><span>해상도</span><strong>128 × 64 px</strong></div><div><span>카메라 입력</span><strong>{recognition.remoteCamera ? '라파에 연결된 카메라' : '노트북 · 브라우저 카메라'}</strong></div></div>
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
              <SettingSwitch label="인식 신뢰도 표시" description="카메라로 인식한 표정의 신뢰도를 표시해요." enabled={settings.confidence} onChange={() => updateSettings({ confidence: !settings.confidence })} />
            </div>
          </section>
          <section className="card settings-card" aria-labelledby="camera-credentials-title">
            <div className="card-header"><h2 id="camera-credentials-title"><Icon name="camera" />라파 카메라 인증</h2></div>
            <form id="camera-credentials-form" className="settings-body" onSubmit={saveCameraCredentials}>
              <label className="field">카메라 아이디<input name="cameraUsername" defaultValue={cameraCredentials?.username ?? ''} autoComplete="off" required maxLength={128} /></label>
              <label className="field">카메라 비밀번호<input name="cameraPassword" type="password" autoComplete="off" required maxLength={256} /></label>
              <p className="field-hint">{cameraCredentials ? '인증 정보가 설정됐어요. ' : ''}새로고침하거나 탭을 닫으면 인증 정보가 지워져요.</p>
              <button type="submit" className="button button-primary"><Icon name="check" />카메라 인증 정보 저장</button>
            </form>
          </section>
          <CameraRecognitionPanel recognition={recognition} />
        </div>
      </div>
    </>
  );
}
