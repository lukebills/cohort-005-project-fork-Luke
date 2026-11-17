/**
 * Data and rules behind the lesson page: the course, lesson and progress
 * reads, the Discussion thread and quiz grading. The pure rules are in `index.ts`.
 */
export {
  getCourseWithDetails,
  getLessonById,
  getModuleById,
  getUserById,
  getLessonProgress,
  getLessonProgressForCourse,
  markLessonComplete,
  markLessonInProgress,
  getLastWatchPosition,
  calculateWatchProgress,
  getCommentById,
} from "./lib/lesson-data.server";
export { getLessonThread, renderThread } from "./lib/thread.server";
export {
  getQuizByLessonId,
  getQuizWithQuestions,
  getBestAttempt,
  computeResult,
} from "./lib/quiz.server";
