export const STORAGE_KEY = 'fado.workspace.v1';
export const defaultSettings = {
  deviceName: '나의 FaDO',
  host: '',
  brightness: 85,
  mirror: true,
  confidence: true,
};

function hasExpressionData(item) {
  return typeof item?.id === 'string'
    && typeof item.name === 'string'
    && Array.isArray(item.bitmap)
    && item.bitmap.length === 8192
    && item.bitmap.every(pixel => pixel === 0 || pixel === 1);
}

export function readWorkspace(storage = localStorage) {
  try {
    const data = JSON.parse(storage.getItem(STORAGE_KEY)) || {};
    const settings = { ...defaultSettings, ...data.settings };
    settings.brightness = Number.isFinite(Number(settings.brightness))
      ? Math.max(10, Math.min(100, Number(settings.brightness))) : 85;
    settings.deviceName = typeof settings.deviceName === 'string'
      ? settings.deviceName.slice(0, 30) : defaultSettings.deviceName;
    settings.host = typeof settings.host === 'string' ? settings.host : '';
    settings.mirror = typeof settings.mirror === 'boolean' ? settings.mirror : true;
    settings.confidence = typeof settings.confidence === 'boolean' ? settings.confidence : true;
    return {
      settings,
      selected: typeof data.selected === 'string' ? data.selected : 'happy',
      custom: Array.isArray(data.custom) ? data.custom.filter(item => hasExpressionData(item) && item.id.startsWith('custom-')).map(item => ({
        id: item.id,
        name: item.name.slice(0, 20),
        bitmap: item.bitmap,
        english: 'Custom',
        color: 'green',
        note: '내가 만든 작은 표정',
        custom: true,
      })) : [],
      presetEdits: Array.isArray(data.presetEdits) ? data.presetEdits.filter(item => hasExpressionData(item) && item.name.trim()).map(({ id, name, bitmap }) => ({
        id, name: name.trim().slice(0, 20), bitmap,
      })) : [],
    };
  } catch {
    return { settings: { ...defaultSettings }, custom: [], presetEdits: [], selected: 'happy' };
  }
}

export function saveWorkspace(state, storage = localStorage) {
  try {
    const presetEdits = state.builtins?.filter(item => item.modified).map(({ id, name, bitmap }) => ({ id, name, bitmap }));
    storage.setItem(STORAGE_KEY, JSON.stringify({
      settings: state.settings,
      custom: state.custom,
      selected: state.selected,
      ...(presetEdits?.length ? { presetEdits } : {}),
    }));
    return true;
  } catch {
    return false;
  }
}
