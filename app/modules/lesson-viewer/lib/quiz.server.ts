import { db } from "~/db";
import {
  quizzes,
  quizQuestions,
  quizOptions,
  quizAttempts,
  quizAnswers,
} from "~/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";

export function getQuizByLessonId(lessonId: number) {
  return db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId)).get();
}

/** The quiz, only if it belongs to this lesson; a quiz elsewhere is not found. */
export function getQuizForLesson(quizId: number, lessonId: number) {
  return db
    .select()
    .from(quizzes)
    .where(and(eq(quizzes.id, quizId), eq(quizzes.lessonId, lessonId)))
    .get();
}

export function getQuizWithQuestions(quizId: number) {
  const quiz = db.select().from(quizzes).where(eq(quizzes.id, quizId)).get();
  if (!quiz) return null;

  const questions = db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId))
    .orderBy(quizQuestions.position)
    .all();

  const options = getOptionsForQuestions(questions.map((q) => q.id));
  const questionsWithOptions = questions.map((question) => ({
    ...question,
    options: options.filter((o) => o.questionId === question.id),
  }));

  return { ...quiz, questions: questionsWithOptions };
}

function getOptionsForQuestions(questionIds: number[]) {
  if (questionIds.length === 0) return [];
  return db
    .select()
    .from(quizOptions)
    .where(inArray(quizOptions.questionId, questionIds))
    .all();
}

export function getBestAttempt(userId: number, quizId: number) {
  return db
    .select()
    .from(quizAttempts)
    .where(
      and(eq(quizAttempts.userId, userId), eq(quizAttempts.quizId, quizId))
    )
    .orderBy(desc(quizAttempts.score))
    .limit(1)
    .get();
}

export function calculateGrade(score: number): string {
  if (score >= 0.9) return "A";
  if (score >= 0.8) return "B";
  if (score >= 0.7) return "C";
  if (score >= 0.6) return "D";
  return "F";
}

export type QuestionResult = {
  questionId: number;
  correct: boolean;
  selectedOptionId: number | null;
  correctOptionId: number | null;
};

type GradedQuestion = { id: number };
type GradedOption = { id: number; questionId: number; isCorrect: boolean };

function gradeAnswers(
  questions: GradedQuestion[],
  options: GradedOption[],
  selectedAnswers: Record<number, number>
): QuestionResult[] {
  return questions.map((q) => {
    const selected = selectedAnswers[q.id];
    if (!selected) {
      return {
        questionId: q.id,
        correct: false,
        selectedOptionId: null,
        correctOptionId: null,
      };
    }
    const correctOptionId =
      options.find((o) => o.questionId === q.id && o.isCorrect)?.id ?? null;
    return {
      questionId: q.id,
      correct: selected === correctOptionId,
      selectedOptionId: selected,
      correctOptionId,
    };
  });
}

function saveAttempt(
  attempt: { userId: number; quizId: number; score: number; passed: boolean },
  questionResults: QuestionResult[]
) {
  return db.transaction((tx) => {
    const inserted = tx.insert(quizAttempts).values(attempt).returning().get();
    const answers = questionResults.flatMap((result) =>
      result.selectedOptionId === null
        ? []
        : [
            {
              attemptId: inserted.id,
              questionId: result.questionId,
              selectedOptionId: result.selectedOptionId,
            },
          ]
    );
    if (answers.length > 0) tx.insert(quizAnswers).values(answers).run();
    return inserted;
  });
}

export function computeResult(
  userId: number,
  quizId: number,
  selectedAnswers: Record<number, number>
) {
  try {
    const quiz = db.select().from(quizzes).where(eq(quizzes.id, quizId)).get();
    if (!quiz) {
      console.error("quiz not found");
      return null;
    }

    const questions = db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId))
      .orderBy(quizQuestions.position)
      .all();
    const options = getOptionsForQuestions(questions.map((q) => q.id));
    const questionResults = gradeAnswers(questions, options, selectedAnswers);

    const correct = questionResults.filter((r) => r.correct).length;
    const total = questions.length;
    const score = total > 0 ? correct / total : 0;
    const passed = score > 0.7;
    const attempt = saveAttempt(
      { userId, quizId, score, passed },
      questionResults
    );

    return {
      attemptId: attempt.id,
      score,
      passed,
      grade: calculateGrade(score),
      totalCorrect: correct,
      totalQuestions: total,
      questionResults,
    };
  } catch (error) {
    console.error(error);
    return null;
  }
}
