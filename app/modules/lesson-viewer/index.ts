/**
 * The lesson page's pure rules: which capability each action intent needs,
 * the action's input schemas, and the course's lessons in reading order.
 */
export { lessonRef, INTENT_CAPABILITY } from "./lib/intents";
export { flattenCourseLessons, type FlatLesson } from "./lib/curriculum";
export {
  createCommentSchema,
  editCommentSchema,
  saveNoteSchema,
  deleteCommentSchema,
} from "./lib/schemas";
