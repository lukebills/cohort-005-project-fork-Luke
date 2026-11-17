import { MAX_NOTE_LENGTH } from "~/lib/notes";
import { z } from "zod";

export const createCommentSchema = z.object({
  intent: z.literal("create-comment"),
  body: z.string(),
  parentId: z.coerce.number().int().optional(),
});

export const editCommentSchema = z.object({
  intent: z.literal("edit-comment"),
  commentId: z.coerce.number().int(),
  body: z.string(),
});

export const saveNoteSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write something before saving your note.")
    .max(
      MAX_NOTE_LENGTH,
      `Your note is over ${MAX_NOTE_LENGTH.toLocaleString("en")} characters, so it was not saved.`
    ),
});

export const deleteCommentSchema = z.object({
  intent: z.literal("delete-comment"),
  commentId: z.coerce.number().int(),
});

const id = z.coerce.number().int().positive();

export const lessonIdSchema = z.object({
  lessonId: z.string().min(1).pipe(id),
});

export const submitQuizSchema = z.object({
  intent: z.literal("submit-quiz"),
  quizId: z.string().min(1).pipe(id),
});

const quizAnswerSchema = z.object({
  questionId: z.string().min(1).pipe(id),
  optionId: z.string().min(1).pipe(id),
});

/**
 * The quiz form names each answer field `question-{questionId}` with the
 * chosen option id as its value. A malformed pair is dropped, so the question
 * scores as unanswered.
 */
export function parseQuizAnswers(formData: FormData): Record<number, number> {
  const answers: Record<number, number> = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("question-")) continue;
    const parsed = quizAnswerSchema.safeParse({
      questionId: key.slice("question-".length),
      optionId: value,
    });
    if (parsed.success) {
      answers[parsed.data.questionId] = parsed.data.optionId;
    }
  }
  return answers;
}
