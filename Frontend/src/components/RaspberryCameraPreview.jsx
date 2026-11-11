import React, { useCallback, useEffect, useRef, useState } from 'react';
import { streamCameraPreview } from '../services/cameraPreview.js';
import { Icon } from './Icon.jsx';

export function RaspberryCameraPreview() {
  const [showForm, setShowForm] = useState(false);
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState('');
  const image = useRef(null);
  const request = useRef(null);
  const imageUrl = useRef(null);

  const cancel = useCallback(() => {
    const active = request.current;
    request.current = null;
    active?.abort();
    image.current?.removeAttribute('src');
    if (imageUrl.current) URL.revokeObjectURL(imageUrl.current);
    imageUrl.current = null;
  }, []);

  const stop = useCallback(() => {
    cancel();
    setPhase('idle');
    setShowForm(false);
  }, [cancel]);

  useEffect(() => {
    window.addEventListener('pagehide', stop);
    return () => {
      window.removeEventListener('pagehide', stop);
      cancel();
    };
  }, [cancel, stop]);

  async function start(event) {
    event.preventDefault();
    if (request.current) return;
    const form = event.currentTarget;
    const username = form.elements.namedItem('cameraUsername').value.trim();
    const passwordInput = form.elements.namedItem('cameraPassword');
    const password = passwordInput.value;
    if (!username || username.includes(':') || !password) {
      setError('카메라 아이디와 비밀번호를 입력해주세요.');
      return;
    }
    passwordInput.value = '';
    const controller = new AbortController();
    request.current = controller;
    setError('');
    setShowForm(false);
    setPhase('opening');
    let receivedFrame = false;
    try {
      await streamCameraPreview({ username, password, signal: controller.signal, onFrame: frame => {
        if (request.current !== controller || !image.current) return;
        const previous = imageUrl.current;
        const next = URL.createObjectURL(frame);
        imageUrl.current = next;
        image.current.src = next;
        if (previous) URL.revokeObjectURL(previous);
        if (!receivedFrame) {
          receivedFrame = true;
          setPhase('viewing');
        }
      } });
    } catch (failure) {
      if (request.current !== controller) return;
      cancel();
      setPhase('idle');
      setShowForm(true);
      setError(failure instanceof TypeError ? '영상 서버에 연결할 수 없어요. 연결 상태를 확인해주세요.' : failure.message);
    }
  }

  return (
    <div className="raspberry-camera-preview">
      <div className={`camera-view ${phase === 'viewing' ? 'has-camera' : ''}`}>
        <img ref={image} alt="라파 카메라 실시간 영상" hidden={phase !== 'viewing'} />
        {phase !== 'viewing' && <div className="camera-placeholder"><Icon name="camera" /><strong>{phase === 'opening' ? '라파 카메라 연결 중…' : '라파 카메라 영상 미리보기'}</strong><span>{phase === 'opening' ? '첫 영상이 도착할 때까지 기다려주세요.' : '미리보기를 켜면 라파에서 영상을 받아와요.'}</span></div>}
      </div>
      <div className="raspberry-preview-controls">
        {phase === 'idle' && !showForm && <button type="button" className="button button-secondary" onClick={() => setShowForm(true)}>라파 영상 켜기</button>}
        {phase !== 'idle' && <button type="button" className="button button-secondary" onClick={stop}>라파 영상 끄기</button>}
        {showForm && <form className="raspberry-preview-form" onSubmit={start}>
          <label className="field">카메라 아이디<input name="cameraUsername" autoComplete="off" required maxLength={128} /></label>
          <label className="field">카메라 비밀번호<input name="cameraPassword" type="password" autoComplete="off" required maxLength={256} /></label>
          <div className="camera-actions"><button type="submit" className="button button-primary">영상 연결</button><button type="button" className="button button-secondary" onClick={() => { setError(''); setShowForm(false); }}>취소</button></div>
        </form>}
        {error && <p className="raspberry-preview-error" role="alert">{error}</p>}
      </div>
    </div>
  );
}
