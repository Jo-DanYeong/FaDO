import React from 'react';
import { Icon } from './Icon.jsx';

export function PageHeading({ eyebrow, title, description, onCreate }) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}<span className="title-dot">.</span></h1>
        <p>{description}</p>
      </div>
      {onCreate && <button className="button button-primary" onClick={onCreate}><Icon name="plus" />새 표정 만들기</button>}
    </div>
  );
}
