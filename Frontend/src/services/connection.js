export const DEVICE_HEALTH_URL = '/api/v1/raspberry/health';
export const connectionPolicy = { intervalMs: 5000, timeoutMs: 3000 };

export async function checkDeviceConnection({ signal } = {}) {
  const response = await fetch(DEVICE_HEALTH_URL, { cache: 'no-store', signal });
  if (!response.ok) return false;
  const health = await response.json();
  return health?.Service === 'RPiServer' && health.Status === 'UP';
}
