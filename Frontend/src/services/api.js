import { createExpressionPng } from './png.js';

export async function sendExpression(expressionId) {
  const response = await fetch('/api/v1/expression', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expressionId }),
  });

  if (!response.ok) {
    throw new Error(`표정 전송 실패: ${response.status}`);
  }
}

export async function uploadExpressionPng(expression) {
  const png = await createExpressionPng(expression);
  const formData = new FormData();
  formData.append('expressionId', expression.id);
  formData.append('name', expression.name);
  formData.append('file', png, `fado-${expression.id}.png`);

  const response = await fetch('/api/v1/expression/image', {
    method: 'POST',
    // The browser supplies Content-Type with the multipart boundary.
    body: formData,
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
