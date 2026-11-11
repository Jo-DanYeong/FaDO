export const DEVICE_HEALTH_URL = '/api/v1/raspberry/health';
export const connectionPolicy = { intervalMs: 5000, timeoutMs: 3000 };

function isPiUp(health) {
  return health?.Service === 'RPiServer' && health.Status === 'UP';
}

export async function checkDeviceConnection({ signal } = {}) {
  const response = await fetch(DEVICE_HEALTH_URL, { cache: 'no-store', signal });
  if (!response.ok) return false;
  const health = await response.json();
  if (health?.deviceName !== 'RaspberryPi') return isPiUp(health);
  if (health.status === 'UP') return true;
  if (typeof health.status !== 'string') return false;

  // The previous Java DTO wrapped the Pi's JSON in a string.
  try { return isPiUp(JSON.parse(health.status)); }
  catch { return false; }
}
