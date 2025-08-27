import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  createUserInputSchema,
  loginInputSchema,
  createStudentInputSchema,
  createLecturerInputSchema,
  createThesisInputSchema,
  updateThesisInputSchema,
  createGuidanceSessionInputSchema,
  createSubmissionInputSchema,
  createCommentInputSchema,
  getThesesByStudentInputSchema,
  getThesesByLecturerInputSchema,
  getGuidanceSessionsInputSchema,
  getCommentsInputSchema
} from './schema';

// Import handlers
import { registerUser, loginUser } from './handlers/auth';
import { createStudent, getStudents, getStudentById, getStudentByUserId } from './handlers/students';
import { createLecturer, getLecturers, getLecturerById, getLecturerByUserId } from './handlers/lecturers';
import { 
  createThesis, 
  updateThesis, 
  getThesesByStudent, 
  getThesesByLecturer, 
  getAllTheses, 
  getThesisById, 
  deleteThesis 
} from './handlers/theses';
import { 
  createGuidanceSession, 
  getGuidanceSessionsByThesis, 
  getGuidanceSessionById, 
  updateGuidanceSession 
} from './handlers/guidance_sessions';
import { 
  createSubmission, 
  getSubmissionsBySession, 
  getSubmissionById, 
  deleteSubmission 
} from './handlers/submissions';
import { 
  createComment, 
  getCommentsBySession, 
  getCommentsBySubmission, 
  deleteComment 
} from './handlers/comments';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  register: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => registerUser(input)),

  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),

  // Student management routes
  createStudent: publicProcedure
    .input(createStudentInputSchema)
    .mutation(({ input }) => createStudent(input)),

  getStudents: publicProcedure
    .query(() => getStudents()),

  getStudentById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getStudentById(input.id)),

  getStudentByUserId: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getStudentByUserId(input.userId)),

  // Lecturer management routes
  createLecturer: publicProcedure
    .input(createLecturerInputSchema)
    .mutation(({ input }) => createLecturer(input)),

  getLecturers: publicProcedure
    .query(() => getLecturers()),

  getLecturerById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getLecturerById(input.id)),

  getLecturerByUserId: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getLecturerByUserId(input.userId)),

  // Thesis management routes
  createThesis: publicProcedure
    .input(createThesisInputSchema)
    .mutation(({ input }) => createThesis(input)),

  updateThesis: publicProcedure
    .input(updateThesisInputSchema)
    .mutation(({ input }) => updateThesis(input)),

  getThesesByStudent: publicProcedure
    .input(getThesesByStudentInputSchema)
    .query(({ input }) => getThesesByStudent(input)),

  getThesesByLecturer: publicProcedure
    .input(getThesesByLecturerInputSchema)
    .query(({ input }) => getThesesByLecturer(input)),

  getAllTheses: publicProcedure
    .query(() => getAllTheses()),

  getThesisById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getThesisById(input.id)),

  deleteThesis: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteThesis(input.id)),

  // Guidance session routes
  createGuidanceSession: publicProcedure
    .input(createGuidanceSessionInputSchema)
    .mutation(({ input }) => createGuidanceSession(input)),

  getGuidanceSessionsByThesis: publicProcedure
    .input(getGuidanceSessionsInputSchema)
    .query(({ input }) => getGuidanceSessionsByThesis(input)),

  getGuidanceSessionById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getGuidanceSessionById(input.id)),

  updateGuidanceSession: publicProcedure
    .input(z.object({ id: z.number(), notes: z.string() }))
    .mutation(({ input }) => updateGuidanceSession(input.id, input.notes)),

  // Submission routes
  createSubmission: publicProcedure
    .input(createSubmissionInputSchema)
    .mutation(({ input }) => createSubmission(input)),

  getSubmissionsBySession: publicProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(({ input }) => getSubmissionsBySession(input.sessionId)),

  getSubmissionById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getSubmissionById(input.id)),

  deleteSubmission: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteSubmission(input.id)),

  // Comment routes
  createComment: publicProcedure
    .input(createCommentInputSchema)
    .mutation(({ input }) => createComment(input)),

  getCommentsBySession: publicProcedure
    .input(getCommentsInputSchema)
    .query(({ input }) => getCommentsBySession(input)),

  getCommentsBySubmission: publicProcedure
    .input(z.object({ submissionId: z.number() }))
    .query(({ input }) => getCommentsBySubmission(input.submissionId)),

  deleteComment: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteComment(input.id)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();