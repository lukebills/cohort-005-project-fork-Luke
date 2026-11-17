import { deriveNoteEditorState } from "./lib/editor-state";

export type { NoteEditorState, NoteEditorStatus } from "./lib/editor-state";

/**
 * What the lesson's note editor shows for the draft a Student is typing:
 * the character count, whether Save is offered, and the status line.
 * Pure, so the component holds only the draft.
 */
export function noteEditorState(input: {
  draft: string;
  savedBody: string | null;
  maxLength: number;
  saving: boolean;
}) {
  return deriveNoteEditorState(input);
}
