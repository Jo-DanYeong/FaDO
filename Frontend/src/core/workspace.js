function applyPresetEdit(original, { name, bitmap }) {
  if (name === original.name && bitmap.every((pixel, index) => pixel === original.bitmap[index])) return original;
  return { ...original, name, bitmap, modified: true };
}

export function createInitialWorkspace(saved, originalBuiltins) {
  const { presetEdits = [], ...preferences } = saved;
  const editsById = new Map(presetEdits.map(edit => [edit.id, edit]));
  const builtins = originalBuiltins.map(original => {
    const edit = editsById.get(original.id);
    return edit ? applyPresetEdit(original, edit) : original;
  });
  const selected = [...builtins, ...saved.custom].some(item => item.id === saved.selected)
    ? saved.selected : builtins[0].id;
  return {
    ...preferences,
    originalBuiltins,
    builtins,
    selected,
    persistedSelected: selected,
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
      return { ...state, selected: action.id, persistedSelected: action.id };
    case 'recognize-expression':
      if (!state.builtins.some(item => item.id === action.id)) return state;
      return { ...state, selected: action.id };
    case 'save-expression': {
      const expression = action.expression;
      const original = state.originalBuiltins.find(item => item.id === expression.id);
      if (original) {
        return {
          ...state,
          builtins: state.builtins.map(item => item.id === original.id ? applyPresetEdit(original, expression) : item),
          selected: original.id,
          persistedSelected: original.id,
        };
      }
      const exists = state.custom.some(item => item.id === expression.id);
      return {
        ...state,
        custom: exists ? state.custom.map(item => item.id === expression.id ? expression : item) : [...state.custom, expression],
        selected: expression.id,
        persistedSelected: expression.id,
      };
    }
    case 'restore-preset': {
      const original = state.originalBuiltins.find(item => item.id === action.id);
      if (!original || !state.builtins.some(item => item.id === action.id && item.modified)) return state;
      return {
        ...state,
        builtins: state.builtins.map(item => item.id === original.id ? original : item),
        selected: original.id,
        persistedSelected: original.id,
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
