import { z } from 'zod';

// Enum schemas
export const userRoleSchema = z.enum(['STUDENT', 'LECTURER', 'ADMIN']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const thesisStatusSchema = z.enum(['PROPOSAL', 'IN_PROGRESS', 'REVISION', 'COMPLETED']);
export type ThesisStatus = z.infer<typeof thesisStatusSchema>;

export const commentTypeSchema = z.enum(['GENERAL', 'FILE_COMMENT']);
export type CommentType = z.infer<typeof commentTypeSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  password_hash: z.string(),
  role: userRoleSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Student schema
export const studentSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  student_id: z.string(),
  full_name: z.string(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Student = z.infer<typeof studentSchema>;

// Lecturer schema
export const lecturerSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  lecturer_id: z.string(),
  full_name: z.string(),
  phone: z.string().nullable(),
  specialization: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Lecturer = z.infer<typeof lecturerSchema>;

// Thesis schema
export const thesisSchema = z.object({
  id: z.number(),
  student_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  status: thesisStatusSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Thesis = z.infer<typeof thesisSchema>;

// Thesis Lecturer (many-to-many relationship)
export const thesisLecturerSchema = z.object({
  id: z.number(),
  thesis_id: z.number(),
  lecturer_id: z.number(),
  is_primary: z.boolean(),
  created_at: z.coerce.date()
});

export type ThesisLecturer = z.infer<typeof thesisLecturerSchema>;

// Guidance Session schema
export const guidanceSessionSchema = z.object({
  id: z.number(),
  thesis_id: z.number(),
  session_date: z.coerce.date(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type GuidanceSession = z.infer<typeof guidanceSessionSchema>;

// Submission schema
export const submissionSchema = z.object({
  id: z.number(),
  guidance_session_id: z.number(),
  file_name: z.string(),
  file_path: z.string(),
  file_size: z.number(),
  uploaded_by: z.number(),
  description: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Submission = z.infer<typeof submissionSchema>;

// Comment schema
export const commentSchema = z.object({
  id: z.number(),
  guidance_session_id: z.number(),
  submission_id: z.number().nullable(),
  sender_id: z.number(),
  receiver_id: z.number().nullable(),
  content: z.string(),
  comment_type: commentTypeSchema,
  created_at: z.coerce.date()
});

export type Comment = z.infer<typeof commentSchema>;

// Input schemas for creating entities

// User registration input
export const createUserInputSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  role: userRoleSchema
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// User login input
export const loginInputSchema = z.object({
  username: z.string(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Student creation input
export const createStudentInputSchema = z.object({
  user_id: z.number(),
  student_id: z.string(),
  full_name: z.string(),
  phone: z.string().nullable(),
  address: z.string().nullable()
});

export type CreateStudentInput = z.infer<typeof createStudentInputSchema>;

// Lecturer creation input
export const createLecturerInputSchema = z.object({
  user_id: z.number(),
  lecturer_id: z.string(),
  full_name: z.string(),
  phone: z.string().nullable(),
  specialization: z.string().nullable()
});

export type CreateLecturerInput = z.infer<typeof createLecturerInputSchema>;

// Thesis creation input
export const createThesisInputSchema = z.object({
  student_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  status: thesisStatusSchema.optional(),
  lecturer_ids: z.array(z.number()).min(1)
});

export type CreateThesisInput = z.infer<typeof createThesisInputSchema>;

// Thesis update input
export const updateThesisInputSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  status: thesisStatusSchema.optional()
});

export type UpdateThesisInput = z.infer<typeof updateThesisInputSchema>;

// Guidance session creation input
export const createGuidanceSessionInputSchema = z.object({
  thesis_id: z.number(),
  session_date: z.coerce.date().optional(),
  notes: z.string().nullable()
});

export type CreateGuidanceSessionInput = z.infer<typeof createGuidanceSessionInputSchema>;

// Submission creation input
export const createSubmissionInputSchema = z.object({
  guidance_session_id: z.number(),
  file_name: z.string(),
  file_path: z.string(),
  file_size: z.number(),
  uploaded_by: z.number(),
  description: z.string().nullable()
});

export type CreateSubmissionInput = z.infer<typeof createSubmissionInputSchema>;

// Comment creation input
export const createCommentInputSchema = z.object({
  guidance_session_id: z.number(),
  submission_id: z.number().nullable(),
  sender_id: z.number(),
  receiver_id: z.number().nullable(),
  content: z.string(),
  comment_type: commentTypeSchema
});

export type CreateCommentInput = z.infer<typeof createCommentInputSchema>;

// Query input schemas
export const getThesesByStudentInputSchema = z.object({
  student_id: z.number()
});

export type GetThesesByStudentInput = z.infer<typeof getThesesByStudentInputSchema>;

export const getThesesByLecturerInputSchema = z.object({
  lecturer_id: z.number()
});

export type GetThesesByLecturerInput = z.infer<typeof getThesesByLecturerInputSchema>;

export const getGuidanceSessionsInputSchema = z.object({
  thesis_id: z.number()
});

export type GetGuidanceSessionsInput = z.infer<typeof getGuidanceSessionsInputSchema>;

export const getCommentsInputSchema = z.object({
  guidance_session_id: z.number()
});

export type GetCommentsInput = z.infer<typeof getCommentsInputSchema>;