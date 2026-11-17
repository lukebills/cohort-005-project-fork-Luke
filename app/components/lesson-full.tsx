import { useState, useEffect, useCallback } from "react";
import { Link, useFetcher, useNavigate } from "react-router";
import { CommentThread } from "~/components/comment-thread";
import { LessonProgressStatus } from "~/db/schema";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Bookmark,
  BookmarkCheck,
  Github,
} from "lucide-react";
import { cn, formatDuration } from "~/lib/utils";
import { YouTubePlayer } from "~/components/youtube-player";
import { CurriculumSidebar } from "~/components/lesson-curriculum-sidebar";
import { LessonBreadcrumb } from "~/components/lesson-breadcrumb";
import { QuizSection } from "~/components/lesson-quiz";
import { LessonNote } from "~/components/lesson-note";
import type { LessonLoaderData } from "~/components/lesson-types";

const AUTOPLAY_KEY = "cadence-autoplay";

function useAutoplay() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    try {
      setEnabled(localStorage.getItem(AUTOPLAY_KEY) === "true");
    } catch {
      /* silently fail */
    }
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(AUTOPLAY_KEY, String(next));
      } catch {
        /* silently fail */
      }
      return next;
    });
  }, []);

  return [enabled, toggle] as const;
}

type FullLessonData = Extract<LessonLoaderData, { view: "full" }>;

export function FullLesson({ data }: { data: FullLessonData }) {
  const {
    course,
    curriculum,
    module: mod,
    lesson,
    enrolled,
    currentUserId,
    prevLesson,
    nextLesson,
    lessonProgressMap,
  } = data;
  const canTake = enrolled && !!currentUserId;

  return (
    <div className="flex">
      <CurriculumSidebar
        course={course}
        curriculum={curriculum}
        currentLessonId={lesson.id}
        lessonProgressMap={lessonProgressMap}
        enrolled={enrolled}
      />

      <div className="flex-1 p-6 lg:p-8">
        <LessonBreadcrumb
          course={course}
          mod={mod}
          lessonTitle={lesson.title}
        />

        <div className="mx-auto max-w-4xl">
          <LessonHeader data={data} />
          <LessonBody data={data} />

          {canTake && <LessonQuiz data={data} />}
          {canTake && <LessonCompletion data={data} />}

          {/* Questions & Discussion — confidential to people with access */}
          <CommentThread {...threadProps(data)} canPost />

          <LessonPager
            courseSlug={course.slug}
            courseTitle={course.title}
            prevLesson={prevLesson}
            nextLesson={nextLesson}
          />
        </div>
      </div>
    </div>
  );
}

function threadProps({
  comments,
  currentUserId,
  canModerate,
  instructorName,
}: FullLessonData) {
  return { comments, currentUserId, canModerate, instructorName };
}

function LessonQuiz({ data }: { data: FullLessonData }) {
  const { lesson, quiz, bestAttempt } = data;
  const quizFetcher = useFetcher({ key: `quiz-${lesson.id}` });
  if (!quiz) return null;
  return (
    <QuizSection
      quiz={quiz}
      bestAttempt={bestAttempt}
      quizResult={quizFetcher.data?.quizResult ?? null}
      quizFetcher={quizFetcher}
      isSubmitting={quizFetcher.state !== "idle"}
    />
  );
}

function LessonHeader({ data }: { data: FullLessonData }) {
  const { lesson, currentUserId, bookmarked } = data;
  return (
    <>
      <div className="mb-2 flex items-start justify-between gap-3">
        <h1 className="text-3xl font-bold">{lesson.title}</h1>
        {currentUserId && <BookmarkToggle bookmarked={bookmarked} />}
      </div>
      <div className="mb-6 flex items-center gap-3">
        {lesson.durationMinutes && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="size-4" />
            {formatDuration(lesson.durationMinutes, true, false, false)}
          </div>
        )}
        {lesson.githubRepoUrl && (
          <a
            href={lesson.githubRepoUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm">
              <Github className="mr-1.5 size-4" />
              Open Code
            </Button>
          </a>
        )}
      </div>
    </>
  );
}

function LessonBody({ data }: { data: FullLessonData }) {
  const {
    lesson,
    contentHtml,
    enrolled,
    currentUserId,
    lastWatchPosition,
    watchProgress,
    note,
  } = data;
  const [autoplay, toggleAutoplay] = useAutoplay();
  return (
    <>
      {lesson.videoUrl && (
        <YouTubePlayer
          videoUrl={lesson.videoUrl}
          lessonId={lesson.id}
          title={lesson.title}
          startPosition={lastWatchPosition}
          durationMinutes={lesson.durationMinutes}
          watchProgress={watchProgress}
          trackingEnabled={enrolled && !!currentUserId}
          autoplay={autoplay}
          onToggleAutoplay={toggleAutoplay}
        />
      )}

      {/* Note — under the video, so the Student can write while they watch */}
      {currentUserId && <LessonNote key={lesson.id} note={note} />}

      {contentHtml && (
        <div
          className="prose prose-neutral dark:prose-invert mb-8 max-w-none"
          // oxlint-disable-next-line react/no-danger -- the instructor wrote this Markdown
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      )}

      {!contentHtml && !lesson.videoUrl && (
        <Card className="mb-8">
          <CardContent className="py-12 text-center text-muted-foreground">
            No content has been added to this lesson yet.
          </CardContent>
        </Card>
      )}
    </>
  );
}

function LessonCompletion({ data }: { data: FullLessonData }) {
  const { course, lesson, lessonStatus, nextLesson } = data;
  const fetcher = useFetcher({ key: `mark-complete-${lesson.id}` });
  const navigate = useNavigate();

  const isMarking =
    fetcher.state !== "idle" &&
    fetcher.formData?.get("intent") === "mark-complete";
  const justCompleted = fetcher.data?.success;
  const isCompleted =
    lessonStatus === LessonProgressStatus.Completed || justCompleted;

  useEffect(() => {
    if (justCompleted && nextLesson) {
      navigate(`/courses/${course.slug}/lessons/${nextLesson.id}`);
    }
  }, [justCompleted, nextLesson, course.slug, navigate]);

  if (isCompleted) {
    return <CompletedNotice courseSlug={course.slug} nextLesson={nextLesson} />;
  }

  return (
    <fetcher.Form method="post" className="mb-8">
      <input type="hidden" name="intent" value="mark-complete" />
      <Button disabled={isMarking}>
        {nextLesson ? (
          isMarking ? (
            "Completing..."
          ) : (
            <>
              Up next: {nextLesson.title}
              <ChevronRight className="ml-1 size-4" />
            </>
          )
        ) : (
          <>
            <CheckCircle2 className="mr-2 size-4" />
            {isMarking ? "Marking..." : "Mark as Complete"}
          </>
        )}
      </Button>
    </fetcher.Form>
  );
}

function CompletedNotice({
  courseSlug,
  nextLesson,
}: {
  courseSlug: string;
  nextLesson: FullLessonData["nextLesson"];
}) {
  return (
    <div className="mb-8 flex items-center gap-3">
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle2 className="size-5" />
        <span className="font-medium">Lesson completed</span>
      </div>
      {nextLesson && (
        <Link to={`/courses/${courseSlug}/lessons/${nextLesson.id}`}>
          <Button variant="outline" size="sm">
            Up next: {nextLesson.title}
            <ChevronRight className="ml-1 size-4" />
          </Button>
        </Link>
      )}
    </div>
  );
}

function LessonPager({
  courseSlug,
  courseTitle,
  prevLesson,
  nextLesson,
}: {
  courseSlug: string;
  courseTitle: string;
  prevLesson: FullLessonData["prevLesson"];
  nextLesson: FullLessonData["nextLesson"];
}) {
  return (
    <div className="flex items-center justify-between border-t pt-6">
      {prevLesson ? (
        <PagerLink
          to={`/courses/${courseSlug}/lessons/${prevLesson.id}`}
          label="Previous"
          title={prevLesson.title}
          direction="back"
        />
      ) : (
        <div />
      )}

      {nextLesson ? (
        <PagerLink
          to={`/courses/${courseSlug}/lessons/${nextLesson.id}`}
          label="Next"
          title={nextLesson.title}
          direction="forward"
          alignRight
        />
      ) : (
        <PagerLink
          to={`/courses/${courseSlug}`}
          label="Back to"
          title={courseTitle}
          direction="forward"
        />
      )}
    </div>
  );
}

function PagerLink({
  to,
  label,
  title,
  direction,
  alignRight = false,
}: {
  to: string;
  label: string;
  title: string;
  direction: "back" | "forward";
  alignRight?: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground",
        alignRight && "text-right"
      )}
    >
      {direction === "back" && <ChevronLeft className="size-4" />}
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-medium text-foreground">{title}</div>
      </div>
      {direction === "forward" && <ChevronRight className="size-4" />}
    </Link>
  );
}

function BookmarkToggle({ bookmarked }: { bookmarked: boolean }) {
  const fetcher = useFetcher<{ ok: boolean }>();
  const isSaving = fetcher.state !== "idle";

  return (
    <fetcher.Form method="post">
      <input type="hidden" name="intent" value="toggle-bookmark" />
      <Button type="submit" variant="outline" size="sm" disabled={isSaving}>
        {bookmarked ? (
          <BookmarkCheck className="mr-1.5 size-4" />
        ) : (
          <Bookmark className="mr-1.5 size-4" />
        )}
        {bookmarked ? "Bookmarked" : "Bookmark"}
      </Button>
    </fetcher.Form>
  );
}
