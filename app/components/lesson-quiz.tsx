import { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  CheckCircle2,
  HelpCircle,
  XCircle,
  Trophy,
  RotateCcw,
} from "lucide-react";

type Quiz = {
  id: number;
  title: string;
  passingScore: number;
  questions: QuizQuestion[];
};

type QuizQuestion = {
  id: number;
  questionText: string;
  questionType: string;
  position: number;
  options: Array<{ id: number; optionText: string }>;
};

type QuestionResult = {
  questionId: number;
  correct: boolean;
  selectedOptionId: number | null;
  correctOptionId: number | null;
};

type QuizResult = {
  attemptId: number;
  score: number;
  passed: boolean;
  grade: string;
  totalCorrect: number;
  totalQuestions: number;
  questionResults: QuestionResult[];
};

type QuizFetcher = ReturnType<typeof useFetcher>;

function useQuizResultToast(quizResult: QuizResult | null, retaking: boolean) {
  useEffect(() => {
    if (quizResult && !retaking) {
      const score = Math.round(quizResult.score * 100);
      if (quizResult.passed) {
        toast.success(`Quiz passed! Score: ${score}%`);
      } else {
        toast.error(`Quiz not passed. Score: ${score}%`);
      }
    }
  }, [quizResult, retaking]);
}

type QuizSectionProps = {
  quiz: Quiz;
  bestAttempt: { score: number; passed: boolean } | null;
  quizResult: QuizResult | null;
  quizFetcher: QuizFetcher;
  isSubmitting: boolean;
};

export function QuizSection({
  quiz,
  bestAttempt,
  quizResult,
  quizFetcher,
  isSubmitting,
}: QuizSectionProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<number, number>
  >({});
  const [showQuiz, setShowQuiz] = useState(!bestAttempt?.passed);
  const [retaking, setRetaking] = useState(false);
  useQuizResultToast(quizResult, retaking);

  if (quizResult && !retaking) {
    return (
      <QuizResultCard
        quiz={quiz}
        result={quizResult}
        onRetake={() => {
          setSelectedAnswers({});
          setRetaking(true);
        }}
      />
    );
  }

  if (!showQuiz && bestAttempt?.passed) {
    return (
      <QuizPassedSummary
        title={quiz.title}
        bestScore={bestAttempt.score}
        onRetake={() => setShowQuiz(true)}
      />
    );
  }

  return (
    <QuizForm
      quiz={quiz}
      quizFetcher={quizFetcher}
      isSubmitting={isSubmitting}
      selectedAnswers={selectedAnswers}
      onSelect={(questionId, optionId) =>
        setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionId }))
      }
      onSubmit={() => setRetaking(false)}
    />
  );
}

function QuizHeading({ title }: { title: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <HelpCircle className="size-5 text-primary" />
      <h2 className="text-xl font-semibold">{title}</h2>
    </div>
  );
}

function QuizResultCard({
  quiz,
  result,
  onRetake,
}: {
  quiz: Quiz;
  result: QuizResult;
  onRetake: () => void;
}) {
  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <QuizHeading title={quiz.title} />
        <QuizScoreBanner result={result} />

        <div className="space-y-4">
          {quiz.questions.map((question, qIndex) => (
            <QuestionReview
              key={question.id}
              question={question}
              number={qIndex + 1}
              result={result.questionResults.find(
                (r) => r.questionId === question.id
              )}
            />
          ))}
        </div>

        {!result.passed && (
          <div className="mt-6">
            <Button variant="outline" onClick={onRetake}>
              <RotateCcw className="mr-2 size-4" />
              Retake Quiz
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuizScoreBanner({ result }: { result: QuizResult }) {
  return (
    <div
      className={`mb-6 rounded-lg p-4 ${result.passed ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950"}`}
    >
      <div className="flex items-center gap-3">
        {result.passed ? (
          <Trophy className="size-8 text-green-600" />
        ) : (
          <XCircle className="size-8 text-red-600" />
        )}
        <div>
          <p
            className={`text-lg font-semibold ${result.passed ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}
          >
            {result.passed ? "You passed!" : "Not quite — try again!"}
          </p>
          <p className="text-sm text-muted-foreground">
            Score: {result.totalCorrect}/{result.totalQuestions} (
            {Math.round(result.score * 100)}%) — Grade: {result.grade}
          </p>
        </div>
      </div>
    </div>
  );
}

function QuestionReview({
  question,
  number,
  result,
}: {
  question: QuizQuestion;
  number: number;
  result: QuestionResult | undefined;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-2 flex items-start gap-2">
        {result?.correct ? (
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-600" />
        ) : (
          <XCircle className="mt-0.5 size-5 shrink-0 text-red-600" />
        )}
        <p className="font-medium">
          {number}. {question.questionText}
        </p>
      </div>
      <div className="ml-7 space-y-1">
        {question.options.map((option) => {
          const isSelected = result?.selectedOptionId === option.id;
          const isCorrect = result?.correctOptionId === option.id;
          let className = "text-sm";
          if (isCorrect)
            className += " font-medium text-green-700 dark:text-green-400";
          else if (isSelected && !result?.correct)
            className += " text-red-600 dark:text-red-400 line-through";
          return (
            <p key={option.id} className={className}>
              {isCorrect ? "✓ " : isSelected ? "✗ " : "  "}
              {option.optionText}
            </p>
          );
        })}
      </div>
    </div>
  );
}

function QuizPassedSummary({
  title,
  bestScore,
  onRetake,
}: {
  title: string;
  bestScore: number;
  onRetake: () => void;
}) {
  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="size-5 text-green-600" />
            <span className="font-medium">{title}</span>
            <span className="text-sm text-muted-foreground">
              — Best score: {Math.round(bestScore * 100)}%
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={onRetake}>
            <RotateCcw className="mr-2 size-4" />
            Retake
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function QuizForm({
  quiz,
  quizFetcher,
  isSubmitting,
  selectedAnswers,
  onSelect,
  onSubmit,
}: {
  quiz: Quiz;
  quizFetcher: QuizFetcher;
  isSubmitting: boolean;
  selectedAnswers: Record<number, number>;
  onSelect: (questionId: number, optionId: number) => void;
  onSubmit: () => void;
}) {
  const allAnswered = quiz.questions.every(
    (q) => selectedAnswers[q.id] !== undefined
  );

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <QuizHeading title={quiz.title} />
        <p className="mb-6 text-sm text-muted-foreground">
          Answer all questions and submit. Passing score:{" "}
          {Math.round(quiz.passingScore * 100)}%.
        </p>

        <quizFetcher.Form method="post" onSubmit={onSubmit}>
          <input type="hidden" name="intent" value="submit-quiz" />
          <input type="hidden" name="quizId" value={quiz.id} />

          <div className="space-y-6">
            {quiz.questions.map((question, qIndex) => (
              <QuestionInput
                key={question.id}
                question={question}
                number={qIndex + 1}
                selectedOptionId={selectedAnswers[question.id]}
                onSelect={(optionId) => onSelect(question.id, optionId)}
              />
            ))}
          </div>

          <QuizSubmit allAnswered={allAnswered} isSubmitting={isSubmitting} />
        </quizFetcher.Form>
      </CardContent>
    </Card>
  );
}

function QuizSubmit({
  allAnswered,
  isSubmitting,
}: {
  allAnswered: boolean;
  isSubmitting: boolean;
}) {
  return (
    <div className="mt-6">
      <Button type="submit" disabled={!allAnswered || isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit Quiz"}
      </Button>
      {!allAnswered && (
        <p className="mt-2 text-sm text-muted-foreground">
          Please answer all questions before submitting.
        </p>
      )}
    </div>
  );
}

function QuestionInput({
  question,
  number,
  selectedOptionId,
  onSelect,
}: {
  question: QuizQuestion;
  number: number;
  selectedOptionId: number | undefined;
  onSelect: (optionId: number) => void;
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="mb-3 font-medium">
        {number}. {question.questionText}
      </p>
      <div className="space-y-2">
        {question.options.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-muted"
          >
            <input
              type="radio"
              name={`question-${question.id}`}
              value={option.id}
              checked={selectedOptionId === option.id}
              onChange={() => onSelect(option.id)}
              className="size-4 accent-primary"
            />
            <span className="text-sm">{option.optionText}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
