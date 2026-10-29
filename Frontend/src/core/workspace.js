export function createInitialWorkspace(saved, builtins) {
  const selected = [...builtins, ...saved.custom].some(item => item.id === saved.selected)
    ? saved.selected : builtins[0].id;
  return {
    ...saved,
    builtins,
    selected,
    persistedSelected: selected,
    mode: 'manual',
    playing: false,
    filter: 'all',
    search: '',
  };
}

export function getExpressions(state) {
  return [...state.builtins, ...state.custom];
}

export function getSelectedExpression(state) {
  return getExpressions(state).find(item => item.id === state.selected) || state.builtins[0];
}

export function getVisibleExpressions(state) {
  const query = state.search.toLocaleLowerCase().trim();
  return getExpressions(state).filter(item => {
    const matchesFilter = state.filter === 'all' || (state.filter === 'custom' ? item.custom : !item.custom);
    return matchesFilter && `${item.name} ${item.english}`.toLocaleLowerCase().includes(query);
  });
}

export function workspaceReducer(state, action) {
  switch (action.type) {
    case 'select':
      if (!getExpressions(state).some(item => item.id === action.id)) return state;
      return { ...state, selected: action.id, persistedSelected: action.id, mode: 'manual', playing: false };
    case 'recognize-expression':
      if (!state.builtins.some(item => item.id === action.id)) return state;
      return { ...state, selected: action.id, mode: 'manual', playing: false };
    case 'save-expression': {
      const expression = action.expression;
      const exists = state.custom.some(item => item.id === expression.id);
      return {
        ...state,
        custom: exists ? state.custom.map(item => item.id === expression.id ? expression : item) : [...state.custom, expression],
        selected: expression.id,
        persistedSelected: expression.id,
        mode: 'manual',
        playing: false,
      };
    }
    case 'delete-expression': {
      if (!state.custom.some(item => item.id === action.id)) return state;
      return {
        ...state,
        custom: state.custom.filter(item => item.id !== action.id),
        selected: state.selected === action.id ? state.builtins[0].id : state.selected,
        persistedSelected: state.persistedSelected === action.id ? state.builtins[0].id : state.persistedSelected,
      };
    }
    case 'set-mode':
      return { ...state, mode: action.mode, playing: false };
    case 'toggle-demo':
      return { ...state, playing: !state.playing, mode: state.playing ? state.mode : 'auto' };
    case 'stop-demo':
      return state.playing ? { ...state, playing: false } : state;
    case 'demo-tick': {
      if (!state.playing) return state;
      const next = (state.builtins.findIndex(item => item.id === state.selected) + 1) % state.builtins.length;
      return { ...state, selected: state.builtins[next].id };
    }
    case 'update-settings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'set-filter':
      return { ...state, filter: action.filter };
    case 'set-search':
      return { ...state, search: action.search };
    default:
      return state;
  }
}
