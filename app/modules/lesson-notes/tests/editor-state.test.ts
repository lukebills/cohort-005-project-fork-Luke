import { describe, expect, it } from "vitest";
import { noteEditorState } from "../index";

const base = { savedBody: null, maxLength: 10, saving: false };

describe("noteEditorState", () => {
  it("is empty and cannot save before the Student writes anything", () => {
    const state = noteEditorState({ ...base, draft: "" });
    expect(state).toEqual({
      length: 0,
      tooLong: false,
      canSave: false,
      status: { kind: "empty" },
    });
  });

  it("offers Save for a new draft and marks it unsaved", () => {
    const state = noteEditorState({ ...base, draft: "hello" });
    expect(state.canSave).toBe(true);
    expect(state.length).toBe(5);
    expect(state.status).toEqual({ kind: "unsaved" });
  });

  it("does not offer Save for a draft that is only whitespace", () => {
    const state = noteEditorState({ ...base, draft: "   " });
    expect(state.canSave).toBe(false);
    expect(state.status).toEqual({ kind: "empty" });
  });

  it("reports saved and withholds Save when the draft matches the saved note", () => {
    const state = noteEditorState({
      ...base,
      savedBody: "hello",
      draft: "hello",
    });
    expect(state.canSave).toBe(false);
    expect(state.status).toEqual({ kind: "saved" });
  });

  it("reports saved when the draft differs from the saved note only by surrounding whitespace, since the server trims it", () => {
    const state = noteEditorState({
      ...base,
      savedBody: "hello",
      draft: "hello\n",
    });
    expect(state.canSave).toBe(false);
    expect(state.status).toEqual({ kind: "saved" });
  });

  it("counts and limits the trimmed draft, which is what the server stores", () => {
    const state = noteEditorState({ ...base, draft: ` ${"a".repeat(10)} ` });
    expect(state.length).toBe(10);
    expect(state.tooLong).toBe(false);
    expect(state.canSave).toBe(true);
  });

  it("marks an edited saved note as unsaved", () => {
    const state = noteEditorState({
      ...base,
      savedBody: "hello",
      draft: "hello!",
    });
    expect(state.canSave).toBe(true);
    expect(state.status).toEqual({ kind: "unsaved" });
  });

  it("allows exactly the maximum length", () => {
    const state = noteEditorState({ ...base, draft: "a".repeat(10) });
    expect(state.tooLong).toBe(false);
    expect(state.canSave).toBe(true);
  });

  it("refuses a draft over the maximum and says by how much", () => {
    const state = noteEditorState({ ...base, draft: "a".repeat(13) });
    expect(state.tooLong).toBe(true);
    expect(state.canSave).toBe(false);
    expect(state.status).toEqual({ kind: "too-long", over: 3 });
  });

  it("reports saving and withholds Save while a save is in flight", () => {
    const state = noteEditorState({
      ...base,
      draft: "a".repeat(13),
      saving: true,
    });
    expect(state.canSave).toBe(false);
    expect(state.status).toEqual({ kind: "saving" });
  });
});
