import React from 'react';
import { PageHeading } from '../../components/PageHeading.jsx';
import { BitmapCanvas } from '../../components/BitmapCanvas.jsx';
import { Icon } from '../../components/Icon.jsx';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';

export function GuidePage({ actions }) {
  const { state } = useWorkspace();
  const happy = state.builtins.find(item => item.id === 'happy');
  const go = page => { window.location.hash = page; };
  const steps = [
    { number: '01', icon: 'studio', title: '표정을 만나보세요', text: '라이브 스튜디오에서 여섯 가지 기본 표정을 눌러보세요. 키보드 1~6으로도 빠르게 바꿀 수 있어요.', label: '스튜디오로 가기', action: () => go('studio') },
    { number: '02', icon: 'pencil', title: '나만의 마음을 그려요', text: '새 표정 만들기를 열어 128 × 64 픽셀 캔버스에 그려보세요. 지우개와 되돌리기로 자유롭게 수정할 수 있어요.', label: '첫 표정 그리기', action: () => actions.edit() },
    { number: '03', icon: 'chip', title: '하드웨어 연결을 준비해요', text: '기기 이름과 Raspberry Pi 서버 주소를 저장하세요. 실제 표정 인식과 OLED 전송은 별도의 백엔드 연결이 필요해요.', label: '연결 설정 열기', action: () => go('settings') },
  ];
  return (
    <>
      <PageHeading eyebrow="SAY HELLO TO YOUR FaDO" title="표정으로 시작하는 새로운 소통" description="FaDO는 당신의 표정을 작은 OLED 속 마음으로 전하는 프로젝트입니다." />
      <section className="guide-intro"><div className="guide-mascot"><BitmapCanvas bitmap={happy.bitmap} color="#52725d" aria-label="웃는 FaDO" /><span>HELLO, HUMAN!</span></div><div><span className="eyebrow">FACE + DISPLAY + OLED</span><h2>당신이 웃으면,<br />FaDO도 함께 웃어요.</h2><p>라즈베리 파이 카메라로 표정을 인식하고, OLED에 마음을 보여줘요. 웹에서는 직접 표정을 고르고 새로운 표정을 그릴 수 있어요.</p></div></section>
      <div className="guide-steps">{steps.map(step => <article key={step.number} className="card guide-step"><div className="guide-step-top"><span className="stat-icon green"><Icon name={step.icon} /></span><span>{step.number}</span></div><h3>{step.title}</h3><p>{step.text}</p><button className="text-link" onClick={step.action}>{step.label}<Icon name="arrow" /></button></article>)}</div>
      <section className="card guide-faq">
        <h2>시작하기 전에 알아두세요</h2>
        <details open><summary>지금 사용할 수 있는 기능은 무엇인가요?</summary><p>표정 수동 선택, 자동 데모, 픽셀 편집·저장·삭제, JSON 내보내기, PNG 저장, 로컬 카메라 확인을 사용할 수 있어요. 실제 머신러닝 표정 인식과 기기 제어는 포함되지 않습니다.</p></details>
        <details><summary>저장한 표정은 어디에 보관되나요?</summary><p>이 브라우저의 로컬 저장소에 보관돼요. 다른 기기와 동기화되지 않으며 브라우저 데이터를 삭제하면 사라집니다. 중요한 표정은 라이브러리에서 JSON으로 내보내 보관해주세요.</p></details>
        <details><summary>픽셀 편집기를 키보드로 사용할 수 있나요?</summary><p>픽셀 캔버스에 초점을 맞춘 후 방향키로 이동하고 Space 키로 그릴 수 있어요. Tab 키로 브러시와 지우개, 되돌리기 등 도구에 이동할 수 있습니다.</p></details>
      </section>
    </>
  );
}
