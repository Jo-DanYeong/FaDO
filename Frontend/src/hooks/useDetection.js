import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '../context/ToastContext.jsx';
import { captureCameraFrame, detectCameraFrame } from '../services/detection.js';
import { createExpressionTracker, recognitionPolicy } from '../core/expressionRecognition.js';

const messages = {
  'no-face': '얼굴을 찾지 못했어요. 마지막 표정을 유지해요.',
  'invalid-box': '얼굴 위치를 확인할 수 없어요. 인식 서버 응답을 확인해주세요.',
  unsupported: '지원하지 않는 표정이에요. 라파의 얼굴·표정 모델을 확인해주세요.',
  'low-confidence': `신뢰도가 ${recognitionPolicy.minConfidence * 100}%보다 낮아요. 마지막 표정을 유지해요.`,
  confirming: '같은 표정이 이어지는지 확인하고 있어요.',
  stable: '표정이 유지되고 있어요.',
};

export function useDetection(camera, selectExpression) {
  const [detections, setDetections] = useState(null);
  const [pending, setPending] = useState(false);
  const [live, setLive] = useState(false);
  const [liveMessage, setLiveMessage] = useState('');
  const [lastSentId, setLastSentId] = useState(null);
  const current = useRef(null);
  const notify = useToast();

  const cancel = useCallback(() => {
    const run = current.current;
    current.current = null;
    if (run) {
      clearTimeout(run.timer);
      run.controller.abort();
    }
  }, []);

  const stopLive = useCallback(() => {
    cancel();
    setLive(false);
    setPending(false);
    setLiveMessage('자동 표시를 중지했어요. 마지막 OLED 표정은 유지돼요.');
  }, [cancel]);

  useEffect(() => {
    setDetections(null);
    setPending(false);
    setLive(false);
    setLiveMessage('');
    setLastSentId(null);
    window.addEventListener('pagehide', stopLive);
    const tracks = camera?.getTracks() || [];
    tracks.forEach(track => track.addEventListener?.('ended', stopLive));
    return () => {
      window.removeEventListener('pagehide', stopLive);
      tracks.forEach(track => track.removeEventListener?.('ended', stopLive));
      cancel();
    };
  }, [camera, cancel, stopLive]);

  function start(video, continuous) {
    if (!camera || current.current) return;
    const run = { controller: new AbortController(), timer: null };
    const tracker = createExpressionTracker();
    let sentId = null;
    current.current = run;
    setDetections(null);
    setLive(continuous);
    if (continuous) {
      setLastSentId(null);
      setLiveMessage('인식을 시작했어요. 첫 요청은 모델 로딩으로 시간이 걸릴 수 있어요.');
    }
    const isCurrent = () => current.current === run && !run.controller.signal.aborted;

    async function tick() {
      if (!isCurrent()) return;
      setPending(true);
      try {
        const frame = await captureCameraFrame(video);
        if (!isCurrent()) return;
        const result = await detectCameraFrame(frame, { signal: run.controller.signal });
        if (!isCurrent()) return;
        setDetections(result);
        if (continuous) {
          const candidate = tracker.observe(result);
          setLiveMessage(messages[candidate.reason]);
          if (candidate.reason === 'stable' && candidate.id !== sentId) {
            setLiveMessage('표정 PNG를 저장하고 OLED 표시 명령을 보내고 있어요.');
            const success = await selectExpression(candidate.id, { signal: run.controller.signal, source: 'camera' });
            if (!isCurrent()) return;
            if (!success) {
              stopLive();
              setLiveMessage('OLED 전송에 실패해 자동 표시를 중지했어요. 연결을 확인하고 다시 시작해주세요.');
              return;
            }
            sentId = candidate.id;
            setLastSentId(sentId);
            setLiveMessage('OLED 표시 명령을 전송했어요. 다음 표정을 인식하고 있어요.');
          }
        }
      } catch (error) {
        if (!isCurrent()) return;
        notify(error.message || '인식 서버에 연결하지 못했어요.');
        stopLive();
        setLiveMessage(continuous ? '인식에 실패해 자동 표시를 중지했어요. 연결을 확인하고 다시 시작해주세요.' : '');
      } finally {
        if (isCurrent()) {
          setPending(false);
          // Wait for inference AND OLED delivery; never accumulate old camera frames.
          if (continuous) run.timer = setTimeout(tick, recognitionPolicy.intervalMs);
          else current.current = null;
        }
      }
    }
    tick();
  }

  return {
    detections, detectionPending: pending, live, liveMessage, lastSentId,
    detect: video => start(video, false),
    startLive: video => start(video, true),
    stopLive,
  };
}
