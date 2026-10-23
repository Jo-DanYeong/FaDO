import React, { useEffect, useRef, useState } from 'react';
import { Icon, Logo } from './Icon.jsx';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { getExpressions } from '../core/workspace.js';
import { pageLabels } from '../core/router.js';

const navigation = [['studio', 'studio'], ['library', 'grid'], ['settings', 'settings']];

export function Layout({ page, children }) {
  const { state } = useWorkspace();
  const [menuOpen, setMenuOpen] = useState(false);
  const main = useRef(null);
  const closeMenu = () => setMenuOpen(false);
  useEffect(closeMenu, [page]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = event => { if (event.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [menuOpen]);

  function skipToContent(event) {
    event.preventDefault();
    main.current.focus();
    main.current.scrollIntoView({ block: 'start' });
  }

  return (
    <>
      <a className="skip-link" href="#main-content" onClick={skipToContent}>본문으로 이동</a>
      <div className={`app-shell ${menuOpen ? 'menu-open' : ''}`}>
        <button className="sidebar-backdrop" onClick={closeMenu} aria-label="메뉴 닫기" />
        <aside className="sidebar" aria-label="주 메뉴">
          <a className="brand" href="#studio" onClick={closeMenu} aria-label="FaDO 홈">
            <span className="brand-symbol"><Logo /></span><span>FaDO<span className="brand-dot">.</span></span><span className="beta">BETA</span>
          </a>
          <div className="workspace-label">나의 작은 표정 연구실</div>
          <div className="nav-caption">WORKSPACE</div>
          <nav>
            {navigation.map(([name, glyph]) => (
              <a key={name} href={`#${name}`} onClick={closeMenu} className={`nav-item ${page === name ? 'active' : ''}`} aria-current={page === name ? 'page' : undefined}>
                <Icon name={glyph} /><span>{pageLabels[name]}</span>
                {name === 'library' && <span className="nav-count">{getExpressions(state).length}</span>}
              </a>
            ))}
          </nav>
          <div className="sidebar-device">
            <div className="sidebar-device-icon"><Icon name="chip" /></div>
            <div><strong>{state.settings.deviceName}</strong><span><i className="status-dot muted-dot" />기기 미연결</span></div>
            <a href="#settings" onClick={closeMenu} className="tiny-link" aria-label="기기 설정"><Icon name="chevron" /></a>
          </div>
          <div className="sidebar-bottom">
            <div className="help-card"><div className="help-spark">✳</div><strong>처음 만나는 FaDO?</strong><p>작은 표정으로 시작하는<br />새로운 소통을 만나보세요.</p><a href="#guide" onClick={closeMenu}>사용 가이드 <Icon name="arrow" /></a></div>
            <div className="workspace-user"><span className="user-avatar">F</span><div><strong>나의 워크스페이스</strong><span>Personal workspace</span></div><span className="user-dot" /></div>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <div className="topbar-left">
              <button className="icon-button mobile-menu" onClick={() => setMenuOpen(value => !value)} aria-label="메뉴 열기" aria-expanded={menuOpen}><Icon name="menu" /></button>
              <span className="breadcrumb-parent">워크스페이스</span><Icon name="chevron" className="breadcrumb-arrow" /><span>{pageLabels[page]}</span>
            </div>
            <div className="topbar-right">
              <span className="demo-badge"><i className="status-dot" />프론트엔드 데모</span><span className="topbar-divider" />
              <button className="icon-button" onClick={() => { window.location.hash = 'guide'; }} aria-label="사용 가이드"><Icon name="help" /></button>
              <span className="topbar-avatar" aria-label="개인 워크스페이스">F</span>
            </div>
          </header>
          <main ref={main} id="main-content" tabIndex={-1}>{children}</main>
          <footer className="page-footer"><span>작은 표정, 더 가까운 마음.</span><span>Made with <Icon name="heart" /> FaDO <span className="footer-version">v0.1.0</span></span></footer>
        </div>
      </div>
    </>
  );
}
