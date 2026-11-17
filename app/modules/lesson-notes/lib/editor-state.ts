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

/**
 * What the lesson's note editor shows for the draft a Student is typing:
 * the character count, whether Save is offered, and the status line.
 * Pure, so the component holds only the draft.
 */
export function noteEditorState({
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
  // The save action trims the body, so judge what will actually be stored.
  const body = draft.trim();
  const length = body.length;
  const tooLong = length > maxLength;
  const blank = length === 0;
  const dirty = body !== (savedBody ?? "");

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
