import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '../context/ToastContext.jsx';
import { captureCameraFrame, detectCameraFrame, detectRaspberryCamera, isCameraFrameReady } from '../services/detection.js';
import { createExpressionTracker, neutralExpressionId, recognitionPolicy } from '../core/expressionRecognition.js';

const messages = {
  'no-face': '얼굴을 찾지 못했어요. 평온 표정을 표시해요.',
  'invalid-box': '얼굴 위치를 확인할 수 없어요. 인식 서버 응답을 확인해주세요.',
  unsupported: '지원하지 않는 표정이에요. 라파의 얼굴·표정 모델을 확인해주세요.',
  'low-confidence': `표정이 잘 인식되지 않았어요.`,
  confirming: '같은 표정이 이어지는지 확인하고 있어요.',
  stable: '표정이 유지되고 있어요.',
};

export function useDetection(camera, selectExpression, source = 'raspberry') {
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
    setLiveMessage('자동 표시를 중지했어요.');
  }, [cancel]);

  useEffect(() => {
    setDetections(null);
    setPending(false);
    setLive(false);
    setLiveMessage('');
    setLastSentId(null);
    window.addEventListener('pagehide', stopLive);
    return () => {
      window.removeEventListener('pagehide', stopLive);
      cancel();
    };
  }, [camera, source, cancel, stopLive]);

  const start = useCallback((video, continuous) => {
    if ((source === 'local' && !camera) || current.current) return;
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

    async function display(id) {
      if (id === sentId) return true;
      const success = await selectExpression(id, { signal: run.controller.signal, source: 'camera' });
      if (!isCurrent()) return false;
      if (!success) {
        stopLive();
        setLiveMessage('OLED 전송에 실패해 자동 표시를 중지했어요. 연결을 확인하고 다시 시작해주세요.');
        return false;
      }
      sentId = id;
      setLastSentId(id);
      return true;
    }

    async function tick() {
      if (!isCurrent()) return;
      setPending(true);
      try {
        if (continuous && source === 'local' && !isCameraFrameReady(video)) {
          // Some browsers do not emit loadeddata. Check readiness again on the next tick.
          setLiveMessage('노트북 카메라 영상을 기다리고 있어요.');
          return;
        }
        if (continuous && sentId === null && !await display(neutralExpressionId)) return;
        let result;
        if (source === 'raspberry') {
          result = await detectRaspberryCamera({ signal: run.controller.signal });
        } else {
          const frame = await captureCameraFrame(video);
          if (!isCurrent()) return;
          result = await detectCameraFrame(frame, { signal: run.controller.signal });
        }
        if (!isCurrent()) return;
        setDetections(result);
        if (continuous) {
          const candidate = tracker.observe(result);
          setLiveMessage(messages[candidate.reason]);
          const id = candidate.reason === 'stable' ? candidate.id
            : candidate.reason === 'confirming' ? sentId : neutralExpressionId;
          if (id !== sentId && await display(id) && candidate.reason === 'stable') {
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
  }, [camera, source, selectExpression, stopLive, notify]);

  return {
    detections, detectionPending: pending, live, liveMessage, lastSentId,
    start,
    stopLive,
  };
}
