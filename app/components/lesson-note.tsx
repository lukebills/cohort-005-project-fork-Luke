import { useState } from "react";
import { useFetcher } from "react-router";
import { Check, Lock, NotebookPen } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";
import { cn, formatRelativeTime } from "~/lib/utils";
import { MAX_NOTE_LENGTH } from "~/lib/notes";
import { noteEditorState, type NoteEditorStatus } from "~/modules/lesson-notes";

export function LessonNote({
  note,
}: {
  note: { body: string; updatedAt: string } | null;
}) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>();
  const [draft, setDraft] = useState(note?.body ?? "");
  const saving = fetcher.state !== "idle";
  const serverError = fetcher.data?.error;

  const { length, tooLong, canSave, status } = noteEditorState({
    draft,
    savedBody: note?.body ?? null,
    maxLength: MAX_NOTE_LENGTH,
    saving,
  });

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <LessonNoteHeader />

        <fetcher.Form method="post" className="space-y-2">
          <input type="hidden" name="intent" value="save-note" />
          <Textarea
            name="body"
            rows={4}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Jot down key ideas, questions, or code to revisit..."
            aria-label="Your notes on this lesson"
            className="resize-y"
          />

          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={!canSave}>
              {saving ? "Saving..." : "Save note"}
            </Button>
            {serverError && status.kind !== "saving" ? (
              <span className="text-sm text-destructive">{serverError}</span>
            ) : (
              <NoteStatus status={status} updatedAt={note?.updatedAt} />
            )}
            <NoteLength length={length} tooLong={tooLong} />
          </div>
        </fetcher.Form>
      </CardContent>
    </Card>
  );
}

function LessonNoteHeader() {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <NotebookPen className="size-5 text-primary" />
        <h2 className="text-xl font-semibold">Your Notes</h2>
      </div>
      <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
        <Lock className="size-3" />
        Private to you
      </span>
    </div>
  );
}

function NoteLength({ length, tooLong }: { length: number; tooLong: boolean }) {
  return (
    <span
      className={cn(
        "ml-auto text-xs",
        tooLong ? "text-destructive" : "text-muted-foreground"
      )}
    >
      {length} / {MAX_NOTE_LENGTH}
    </span>
  );
}

function NoteStatus({
  status,
  updatedAt,
}: {
  status: NoteEditorStatus;
  updatedAt: string | undefined;
}) {
  switch (status.kind) {
    case "saved":
      return (
        <span
          suppressHydrationWarning
          className="flex items-center gap-1 text-xs text-muted-foreground"
        >
          <Check className="size-3.5 text-green-600" />
          Saved{updatedAt ? ` · edited ${formatRelativeTime(updatedAt)}` : ""}
        </span>
      );
    case "unsaved":
      return (
        <span className="text-xs text-muted-foreground">Unsaved changes</span>
      );
    case "too-long":
      return (
        <span className="text-xs text-destructive">
          {status.over} characters over the limit
        </span>
      );
    case "saving":
    case "empty":
      return null;
  }
}
