import { describe, expect, it } from "vitest";
import { MAX_NOTE_LENGTH } from "~/lib/notes";
import {
  INTENT_CAPABILITY,
  createCommentSchema,
  deleteCommentSchema,
  editCommentSchema,
  flattenCourseLessons,
  lessonIdSchema,
  lessonRef,
  parseQuizAnswers,
  saveNoteSchema,
  submitQuizSchema,
} from "../index";

describe("flattenCourseLessons", () => {
  it("lists every lesson in module order, tagged with its module", () => {
    const flat = flattenCourseLessons({
      modules: [
        {
          id: 1,
          title: "Basics",
          lessons: [
            { id: 10, title: "Intro", moduleId: 1 },
            { id: 11, title: "Types", moduleId: 1 },
          ],
        },
        { id: 2, title: "Empty", lessons: [] },
        {
          id: 3,
          title: "Advanced",
          lessons: [{ id: 30, title: "Generics", moduleId: 3 }],
        },
      ],
    });

    expect(flat).toEqual([
      { id: 10, title: "Intro", moduleId: 1, moduleTitle: "Basics" },
      { id: 11, title: "Types", moduleId: 1, moduleTitle: "Basics" },
      { id: 30, title: "Generics", moduleId: 3, moduleTitle: "Advanced" },
    ]);
  });
});

describe("lessonRef", () => {
  it("names the course by slug, through the lesson", () => {
    expect(lessonRef({ slug: "ts", lessonId: "18" })).toEqual({
      slug: "ts",
      lessonId: "18",
    });
  });
});

describe("INTENT_CAPABILITY", () => {
  it("lets a viewer discuss, bookmark and take notes", () => {
    for (const intent of [
      "create-comment",
      "edit-comment",
      "delete-comment",
      "toggle-bookmark",
      "save-note",
    ]) {
      expect(INTENT_CAPABILITY[intent]).toBe("view");
    }
  });

  it("requires take for progress and quizzes", () => {
    expect(INTENT_CAPABILITY["mark-complete"]).toBe("take");
    expect(INTENT_CAPABILITY["submit-quiz"]).toBe("take");
  });

  it("names no capability for an unknown intent", () => {
    expect(INTENT_CAPABILITY["drop-table"]).toBeUndefined();
  });
});

describe("saveNoteSchema", () => {
  it("trims the note", () => {
    expect(saveNoteSchema.parse({ body: "  hi  " })).toEqual({ body: "hi" });
  });

  it("rejects a blank note", () => {
    const result = saveNoteSchema.safeParse({ body: "   " });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "Write something before saving your note."
    );
  });

  it("accepts a note at the limit and rejects one over it", () => {
    expect(
      saveNoteSchema.safeParse({ body: "a".repeat(MAX_NOTE_LENGTH) }).success
    ).toBe(true);
    const over = saveNoteSchema.safeParse({
      body: "a".repeat(MAX_NOTE_LENGTH + 1),
    });
    expect(over.success).toBe(false);
    expect(over.error?.issues[0]?.message).toBe(
      "Your note is over 2,000 characters, so it was not saved."
    );
  });
});

describe("comment schemas", () => {
  it("parses a new comment and coerces its parent id", () => {
    expect(
      createCommentSchema.parse({
        intent: "create-comment",
        body: "Why?",
        parentId: "4",
      })
    ).toEqual({ intent: "create-comment", body: "Why?", parentId: 4 });
  });

  it("parses an edit and coerces the comment id", () => {
    expect(
      editCommentSchema.parse({
        intent: "edit-comment",
        commentId: "7",
        body: "Fixed",
      })
    ).toEqual({ intent: "edit-comment", commentId: 7, body: "Fixed" });
  });

  it("parses a delete and coerces the comment id", () => {
    expect(
      deleteCommentSchema.parse({ intent: "delete-comment", commentId: "9" })
    ).toEqual({ intent: "delete-comment", commentId: 9 });
  });

  it("rejects a form posted with another intent", () => {
    expect(
      createCommentSchema.safeParse({ intent: "edit-comment", body: "x" })
        .success
    ).toBe(false);
    expect(
      editCommentSchema.safeParse({
        intent: "create-comment",
        commentId: "1",
        body: "x",
      }).success
    ).toBe(false);
    expect(
      deleteCommentSchema.safeParse({ intent: "edit-comment", commentId: "1" })
        .success
    ).toBe(false);
  });
});

describe("lessonIdSchema", () => {
  it("coerces the route's lesson id to a number", () => {
    expect(lessonIdSchema.parse({ lessonId: "18" })).toEqual({ lessonId: 18 });
  });

  it("rejects an empty or malformed id rather than reading it as 0", () => {
    expect(lessonIdSchema.safeParse({ lessonId: "" }).success).toBe(false);
    expect(lessonIdSchema.safeParse({ lessonId: "abc" }).success).toBe(false);
    expect(lessonIdSchema.safeParse({ lessonId: "1.5" }).success).toBe(false);
  });
});

describe("submitQuizSchema", () => {
  it("coerces the quiz id", () => {
    expect(
      submitQuizSchema.parse({ intent: "submit-quiz", quizId: "7" })
    ).toEqual({ intent: "submit-quiz", quizId: 7 });
  });

  it("rejects a missing or empty quiz id", () => {
    expect(submitQuizSchema.safeParse({ intent: "submit-quiz" }).success).toBe(
      false
    );
    expect(
      submitQuizSchema.safeParse({ intent: "submit-quiz", quizId: "" }).success
    ).toBe(false);
  });
});

describe("parseQuizAnswers", () => {
  it("maps each question-{id} field to the chosen option id", () => {
    const form = new FormData();
    form.set("intent", "submit-quiz");
    form.set("quizId", "7");
    form.set("question-3", "12");
    form.set("question-4", "15");
    expect(parseQuizAnswers(form)).toEqual({ 3: 12, 4: 15 });
  });

  it("skips answers whose question or option id is malformed or empty", () => {
    const form = new FormData();
    form.set("question-x", "12");
    form.set("question-5", "");
    form.set("question-6", "abc");
    form.set("question-8", "9");
    expect(parseQuizAnswers(form)).toEqual({ 8: 9 });
  });
});
