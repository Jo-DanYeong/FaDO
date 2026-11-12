import { createExpressionPng } from './png.js';

export const expressionHoldIntervalMs = 4000;

export async function sendExpression(expressionId, { signal, holdToken } = {}) {
  signal?.throwIfAborted();
  const response = await fetch('/api/v1/expression', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expressionId, holdToken }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`표정 전송 실패: ${response.status}`);
  }
}

export async function renewExpressionHold(holdToken, { signal } = {}) {
  const response = await fetch(`/api/v1/expression/hold/${encodeURIComponent(holdToken)}`, {
    method: 'POST', signal,
  });
  if (response.status === 409) return false;
  if (!response.ok) throw new Error(`표정 유지 실패: ${response.status}`);
  return true;
}

export async function uploadExpressionPng(expression, { signal } = {}) {
  signal?.throwIfAborted();
  const png = await createExpressionPng(expression);
  signal?.throwIfAborted();
  const formData = new FormData();
  formData.append('expressionId', expression.id);
  formData.append('name', expression.name);
  formData.append('file', png, `fado-${expression.id}.png`);

  const response = await fetch('/api/v1/expression/image', {
    method: 'POST',
    // The browser supplies Content-Type with the multipart boundary.
    body: formData,
    signal,
  });

  if (!response.ok) {
    throw new Error(`PNG 전송 실패: ${response.status}`);
  }
}

export async function deleteExpressionPng(expressionId) {
  const query = new URLSearchParams({ expressionId });
  const response = await fetch(`/api/v1/expression/image?${query}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`PNG 삭제 실패: ${response.status}`);
  }
}
