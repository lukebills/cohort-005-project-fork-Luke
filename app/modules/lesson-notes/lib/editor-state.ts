export type NoteEditorStatus =
  | { kind: "empty" }
  | { kind: "too-long"; over: number }
  | { kind: "unsaved" }
  | { kind: "saving" }
  | { kind: "saved" };

export type NoteEditorState = {
  length: number;
  tooLong: boolean;
  canSave: boolean;
  status: NoteEditorStatus;
};

export function deriveNoteEditorState({
  draft,
  savedBody,
  maxLength,
  saving,
}: {
  draft: string;
  savedBody: string | null;
  maxLength: number;
  saving: boolean;
}): NoteEditorState {
  const length = draft.length;
  const tooLong = length > maxLength;
  const blank = draft.trim().length === 0;
  const dirty = draft !== (savedBody ?? "");

  const status: NoteEditorStatus = saving
    ? { kind: "saving" }
    : tooLong
      ? { kind: "too-long", over: length - maxLength }
      : dirty
        ? { kind: "unsaved" }
        : savedBody === null
          ? { kind: "empty" }
          : { kind: "saved" };

  return {
    length,
    tooLong,
    // The save action rejects a blank body, so the button never offers one.
    canSave: !saving && !blank && !tooLong && dirty,
    status,
  };
}
