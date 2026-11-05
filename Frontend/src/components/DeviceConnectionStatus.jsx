import React from 'react';

export function DeviceConnectionStatus({ status, className, prefix = '기기 ' }) {
  const connected = status === 'connected';
  const label = status === 'checking' ? '연결 확인 중' : connected ? `${prefix}연결됨` : `${prefix}미연결`;
  return (
    <span className={className} role="status" aria-live="polite">
      <i className={`status-dot ${connected ? 'connected-dot' : 'muted-dot'}`} aria-hidden="true" />{label}
    </span>
  );
}
