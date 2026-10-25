let sequence = 0;

export function createExpressionId(crypto = globalThis.crypto) {
  if (typeof crypto?.randomUUID === 'function') return `custom-${crypto.randomUUID()}`;

  // getRandomValues is also available on HTTP LAN origins.
  if (typeof crypto?.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return `custom-${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // Expression IDs are local identifiers, not authentication tokens.
  sequence += 1;
  return `custom-${Date.now().toString(36)}-${sequence.toString(36)}-${Math.random().toString(36).slice(2)}`;
}
