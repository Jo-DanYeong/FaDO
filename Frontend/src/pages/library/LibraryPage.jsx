import React from 'react';
import { Icon } from '../../components/Icon.jsx';
import { PageHeading } from '../../components/PageHeading.jsx';
import { ExpressionCard } from '../../components/ExpressionCard.jsx';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { getExpressions, getVisibleExpressions } from '../../core/workspace.js';

export function LibraryPage({ actions }) {
  const { state, dispatch } = useWorkspace();
  const visible = getVisibleExpressions(state);
  const filters = [
    ['all', '모든 표정', getExpressions(state).length],
    ['preset', '기본 표정', state.builtins.length],
    ['custom', '내 표정', state.custom.length],
  ];
  const searching = Boolean(state.search);
  return (
    <>
      <PageHeading eyebrow="THE MANY FACES OF FaDO" title="작은 표정, 다채로운 마음" description="기본 표정부터 직접 만든 표정까지, 당신만의 FaDO를 채워보세요." onCreate={() => actions.edit()} />
      <div className="library-toolbar">
        <div className="filter-tabs" role="group" aria-label="표정 필터">{filters.map(([id, name, count]) => <button key={id} className={state.filter === id ? 'active' : ''} onClick={() => dispatch({ type: 'set-filter', filter: id })} aria-pressed={state.filter === id}>{name} <span>{count}</span></button>)}</div>
        <label className="search-field"><Icon name="search" /><input id="expression-search" type="search" placeholder="표정 검색하기" aria-label="표정 이름 검색" value={state.search} onChange={event => dispatch({ type: 'set-search', search: event.target.value })} /></label>
      </div>
      <div id="library-results" className="expression-grid library-grid">
        {visible.map(item => <ExpressionCard key={item.id} expression={item} selected={state.selected} actions={actions} />)}
        {!visible.length && <div className="empty-state"><span><Icon name={searching ? 'search' : 'pencil'} /></span><h2>{searching ? '일치하는 표정이 없어요' : '첫 번째 표정을 기다리고 있어요'}</h2><p>{searching ? '다른 이름으로 다시 찾아보세요.' : '작은 픽셀로 나만의 마음을 그려보세요.'}</p><button className="button button-primary" onClick={() => searching ? dispatch({ type: 'set-search', search: '' }) : actions.edit()}>{!searching && <Icon name="plus" />}{searching ? '검색 초기화' : '새 표정 만들기'}</button></div>}
        {visible.length > 0 && !state.search && state.filter !== 'preset' && <button className="new-expression-card" onClick={() => actions.edit()}><span><Icon name="plus" /></span><strong>새로운 마음 그리기</strong><p>나만의 표정을 만들어보세요</p></button>}
      </div>
      <div className="library-tip"><Icon name="info" />기본 표정을 복사해 편집하거나 새 표정을 그릴 수 있어요. JSON 내보내기로 픽셀 데이터도 저장해보세요.</div>
    </>
  );
}
