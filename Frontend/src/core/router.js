export const pageLabels = {
  studio: '라이브 스튜디오',
  library: '표정 라이브러리',
  settings: '연결 및 설정',
  guide: '사용 가이드',
};

export function resolvePage(hash) {
  const name = hash.replace(/^#/, '');
  return Object.hasOwn(pageLabels, name) ? name : 'studio';
}

