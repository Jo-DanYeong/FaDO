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
