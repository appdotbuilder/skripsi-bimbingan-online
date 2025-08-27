import { serial, text, pgTable, timestamp, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums
export const userRoleEnum = pgEnum('user_role', ['STUDENT', 'LECTURER', 'ADMIN']);
export const thesisStatusEnum = pgEnum('thesis_status', ['PROPOSAL', 'IN_PROGRESS', 'REVISION', 'COMPLETED']);
export const commentTypeEnum = pgEnum('comment_type', ['GENERAL', 'FILE_COMMENT']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Students table
export const studentsTable = pgTable('students', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  student_id: text('student_id').notNull().unique(),
  full_name: text('full_name').notNull(),
  phone: text('phone'),
  address: text('address'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Lecturers table
export const lecturersTable = pgTable('lecturers', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  lecturer_id: text('lecturer_id').notNull().unique(),
  full_name: text('full_name').notNull(),
  phone: text('phone'),
  specialization: text('specialization'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Theses table
export const thesesTable = pgTable('theses', {
  id: serial('id').primaryKey(),
  student_id: integer('student_id').notNull().references(() => studentsTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  status: thesisStatusEnum('status').notNull().default('PROPOSAL'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Thesis Lecturers junction table (many-to-many)
export const thesisLecturersTable = pgTable('thesis_lecturers', {
  id: serial('id').primaryKey(),
  thesis_id: integer('thesis_id').notNull().references(() => thesesTable.id, { onDelete: 'cascade' }),
  lecturer_id: integer('lecturer_id').notNull().references(() => lecturersTable.id, { onDelete: 'cascade' }),
  is_primary: boolean('is_primary').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Guidance Sessions table
export const guidanceSessionsTable = pgTable('guidance_sessions', {
  id: serial('id').primaryKey(),
  thesis_id: integer('thesis_id').notNull().references(() => thesesTable.id, { onDelete: 'cascade' }),
  session_date: timestamp('session_date').defaultNow().notNull(),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Submissions table
export const submissionsTable = pgTable('submissions', {
  id: serial('id').primaryKey(),
  guidance_session_id: integer('guidance_session_id').notNull().references(() => guidanceSessionsTable.id, { onDelete: 'cascade' }),
  file_name: text('file_name').notNull(),
  file_path: text('file_path').notNull(),
  file_size: integer('file_size').notNull(),
  uploaded_by: integer('uploaded_by').notNull().references(() => usersTable.id),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Comments table
export const commentsTable = pgTable('comments', {
  id: serial('id').primaryKey(),
  guidance_session_id: integer('guidance_session_id').notNull().references(() => guidanceSessionsTable.id, { onDelete: 'cascade' }),
  submission_id: integer('submission_id').references(() => submissionsTable.id, { onDelete: 'cascade' }),
  sender_id: integer('sender_id').notNull().references(() => usersTable.id),
  receiver_id: integer('receiver_id').references(() => usersTable.id),
  content: text('content').notNull(),
  comment_type: commentTypeEnum('comment_type').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Define relations
export const usersRelations = relations(usersTable, ({ one }) => ({
  student: one(studentsTable, {
    fields: [usersTable.id],
    references: [studentsTable.user_id],
  }),
  lecturer: one(lecturersTable, {
    fields: [usersTable.id],
    references: [lecturersTable.user_id],
  }),
}));

export const studentsRelations = relations(studentsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [studentsTable.user_id],
    references: [usersTable.id],
  }),
  theses: many(thesesTable),
}));

export const lecturersRelations = relations(lecturersTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [lecturersTable.user_id],
    references: [usersTable.id],
  }),
  thesisLecturers: many(thesisLecturersTable),
}));

export const thesesRelations = relations(thesesTable, ({ one, many }) => ({
  student: one(studentsTable, {
    fields: [thesesTable.student_id],
    references: [studentsTable.id],
  }),
  thesisLecturers: many(thesisLecturersTable),
  guidanceSessions: many(guidanceSessionsTable),
}));

export const thesisLecturersRelations = relations(thesisLecturersTable, ({ one }) => ({
  thesis: one(thesesTable, {
    fields: [thesisLecturersTable.thesis_id],
    references: [thesesTable.id],
  }),
  lecturer: one(lecturersTable, {
    fields: [thesisLecturersTable.lecturer_id],
    references: [lecturersTable.id],
  }),
}));

export const guidanceSessionsRelations = relations(guidanceSessionsTable, ({ one, many }) => ({
  thesis: one(thesesTable, {
    fields: [guidanceSessionsTable.thesis_id],
    references: [thesesTable.id],
  }),
  submissions: many(submissionsTable),
  comments: many(commentsTable),
}));

export const submissionsRelations = relations(submissionsTable, ({ one, many }) => ({
  guidanceSession: one(guidanceSessionsTable, {
    fields: [submissionsTable.guidance_session_id],
    references: [guidanceSessionsTable.id],
  }),
  uploader: one(usersTable, {
    fields: [submissionsTable.uploaded_by],
    references: [usersTable.id],
  }),
  comments: many(commentsTable),
}));

export const commentsRelations = relations(commentsTable, ({ one }) => ({
  guidanceSession: one(guidanceSessionsTable, {
    fields: [commentsTable.guidance_session_id],
    references: [guidanceSessionsTable.id],
  }),
  submission: one(submissionsTable, {
    fields: [commentsTable.submission_id],
    references: [submissionsTable.id],
  }),
  sender: one(usersTable, {
    fields: [commentsTable.sender_id],
    references: [usersTable.id],
  }),
  receiver: one(usersTable, {
    fields: [commentsTable.receiver_id],
    references: [usersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Student = typeof studentsTable.$inferSelect;
export type NewStudent = typeof studentsTable.$inferInsert;
export type Lecturer = typeof lecturersTable.$inferSelect;
export type NewLecturer = typeof lecturersTable.$inferInsert;
export type Thesis = typeof thesesTable.$inferSelect;
export type NewThesis = typeof thesesTable.$inferInsert;
export type ThesisLecturer = typeof thesisLecturersTable.$inferSelect;
export type NewThesisLecturer = typeof thesisLecturersTable.$inferInsert;
export type GuidanceSession = typeof guidanceSessionsTable.$inferSelect;
export type NewGuidanceSession = typeof guidanceSessionsTable.$inferInsert;
export type Submission = typeof submissionsTable.$inferSelect;
export type NewSubmission = typeof submissionsTable.$inferInsert;
export type Comment = typeof commentsTable.$inferSelect;
export type NewComment = typeof commentsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  students: studentsTable,
  lecturers: lecturersTable,
  theses: thesesTable,
  thesisLecturers: thesisLecturersTable,
  guidanceSessions: guidanceSessionsTable,
  submissions: submissionsTable,
  comments: commentsTable,
};