const EDIT_COLLAB_KEY = 'ergosense_edit_collab_id';

export function openCollaboratorEditor(id: string | null) {
  if (id) sessionStorage.setItem(EDIT_COLLAB_KEY, id);
  else sessionStorage.removeItem(EDIT_COLLAB_KEY);
}

export function takeCollaboratorEditorId(): string | null {
  const id = sessionStorage.getItem(EDIT_COLLAB_KEY);
  sessionStorage.removeItem(EDIT_COLLAB_KEY);
  return id;
}

export function peekCollaboratorEditorId(): string | null {
  return sessionStorage.getItem(EDIT_COLLAB_KEY);
}
