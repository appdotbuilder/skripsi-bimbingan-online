import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  studentsTable, 
  thesesTable, 
  guidanceSessionsTable,
  submissionsTable,
  commentsTable 
} from '../db/schema';
import { 
  createComment, 
  getCommentsBySession, 
  getCommentsBySubmission, 
  deleteComment 
} from '../handlers/comments';
import { eq } from 'drizzle-orm';
import type { 
  CreateCommentInput,
  GetCommentsInput 
} from '../schema';

describe('Comments Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testStudentId: number;
  let testThesisId: number;
  let testGuidanceSessionId: number;
  let testSubmissionId: number;
  let testReceiverId: number;

  beforeEach(async () => {
    // Create test user (sender)
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testsender',
        email: 'sender@test.com',
        password_hash: 'hash123',
        role: 'STUDENT'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test user (receiver)
    const receiverResult = await db.insert(usersTable)
      .values({
        username: 'testreceiver',
        email: 'receiver@test.com',
        password_hash: 'hash456',
        role: 'LECTURER'
      })
      .returning()
      .execute();
    testReceiverId = receiverResult[0].id;

    // Create test student
    const studentResult = await db.insert(studentsTable)
      .values({
        user_id: testUserId,
        student_id: 'STU001',
        full_name: 'Test Student'
      })
      .returning()
      .execute();
    testStudentId = studentResult[0].id;

    // Create test thesis
    const thesisResult = await db.insert(thesesTable)
      .values({
        student_id: testStudentId,
        title: 'Test Thesis',
        description: 'A test thesis',
        status: 'IN_PROGRESS'
      })
      .returning()
      .execute();
    testThesisId = thesisResult[0].id;

    // Create test guidance session
    const sessionResult = await db.insert(guidanceSessionsTable)
      .values({
        thesis_id: testThesisId,
        notes: 'Test session'
      })
      .returning()
      .execute();
    testGuidanceSessionId = sessionResult[0].id;

    // Create test submission
    const submissionResult = await db.insert(submissionsTable)
      .values({
        guidance_session_id: testGuidanceSessionId,
        file_name: 'test.pdf',
        file_path: '/uploads/test.pdf',
        file_size: 1024,
        uploaded_by: testUserId,
        description: 'Test file'
      })
      .returning()
      .execute();
    testSubmissionId = submissionResult[0].id;
  });

  describe('createComment', () => {
    it('should create a general comment', async () => {
      const input: CreateCommentInput = {
        guidance_session_id: testGuidanceSessionId,
        submission_id: null,
        sender_id: testUserId,
        receiver_id: testReceiverId,
        content: 'This is a general comment',
        comment_type: 'GENERAL'
      };

      const result = await createComment(input);

      expect(result.id).toBeDefined();
      expect(result.guidance_session_id).toEqual(testGuidanceSessionId);
      expect(result.submission_id).toBeNull();
      expect(result.sender_id).toEqual(testUserId);
      expect(result.receiver_id).toEqual(testReceiverId);
      expect(result.content).toEqual('This is a general comment');
      expect(result.comment_type).toEqual('GENERAL');
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should create a file-specific comment', async () => {
      const input: CreateCommentInput = {
        guidance_session_id: testGuidanceSessionId,
        submission_id: testSubmissionId,
        sender_id: testUserId,
        receiver_id: testReceiverId,
        content: 'This is a comment on the file',
        comment_type: 'FILE_COMMENT'
      };

      const result = await createComment(input);

      expect(result.id).toBeDefined();
      expect(result.guidance_session_id).toEqual(testGuidanceSessionId);
      expect(result.submission_id).toEqual(testSubmissionId);
      expect(result.sender_id).toEqual(testUserId);
      expect(result.receiver_id).toEqual(testReceiverId);
      expect(result.content).toEqual('This is a comment on the file');
      expect(result.comment_type).toEqual('FILE_COMMENT');
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should create a comment without receiver', async () => {
      const input: CreateCommentInput = {
        guidance_session_id: testGuidanceSessionId,
        submission_id: null,
        sender_id: testUserId,
        receiver_id: null,
        content: 'Public comment',
        comment_type: 'GENERAL'
      };

      const result = await createComment(input);

      expect(result.id).toBeDefined();
      expect(result.receiver_id).toBeNull();
      expect(result.content).toEqual('Public comment');
    });

    it('should save comment to database', async () => {
      const input: CreateCommentInput = {
        guidance_session_id: testGuidanceSessionId,
        submission_id: null,
        sender_id: testUserId,
        receiver_id: testReceiverId,
        content: 'Database test comment',
        comment_type: 'GENERAL'
      };

      const result = await createComment(input);

      // Verify in database
      const comments = await db.select()
        .from(commentsTable)
        .where(eq(commentsTable.id, result.id))
        .execute();

      expect(comments).toHaveLength(1);
      expect(comments[0].content).toEqual('Database test comment');
      expect(comments[0].sender_id).toEqual(testUserId);
      expect(comments[0].receiver_id).toEqual(testReceiverId);
      expect(comments[0].comment_type).toEqual('GENERAL');
    });

    it('should throw error for non-existent guidance session', async () => {
      const input: CreateCommentInput = {
        guidance_session_id: 99999,
        submission_id: null,
        sender_id: testUserId,
        receiver_id: testReceiverId,
        content: 'Test comment',
        comment_type: 'GENERAL'
      };

      await expect(createComment(input)).rejects.toThrow(/guidance session not found/i);
    });

    it('should throw error for non-existent submission', async () => {
      const input: CreateCommentInput = {
        guidance_session_id: testGuidanceSessionId,
        submission_id: 99999,
        sender_id: testUserId,
        receiver_id: testReceiverId,
        content: 'Test comment',
        comment_type: 'FILE_COMMENT'
      };

      await expect(createComment(input)).rejects.toThrow(/submission not found/i);
    });
  });

  describe('getCommentsBySession', () => {
    beforeEach(async () => {
      // Create test comments
      await db.insert(commentsTable)
        .values([
          {
            guidance_session_id: testGuidanceSessionId,
            submission_id: null,
            sender_id: testUserId,
            receiver_id: testReceiverId,
            content: 'First comment',
            comment_type: 'GENERAL'
          },
          {
            guidance_session_id: testGuidanceSessionId,
            submission_id: testSubmissionId,
            sender_id: testReceiverId,
            receiver_id: testUserId,
            content: 'File comment',
            comment_type: 'FILE_COMMENT'
          }
        ])
        .execute();
    });

    it('should return all comments for a guidance session', async () => {
      const input: GetCommentsInput = {
        guidance_session_id: testGuidanceSessionId
      };

      const result = await getCommentsBySession(input);

      expect(result).toHaveLength(2);
      expect(result[0].content).toEqual('First comment');
      expect(result[0].comment_type).toEqual('GENERAL');
      expect(result[1].content).toEqual('File comment');
      expect(result[1].comment_type).toEqual('FILE_COMMENT');
      expect(result[1].submission_id).toEqual(testSubmissionId);
    });

    it('should return empty array for session with no comments', async () => {
      // Create another guidance session
      const sessionResult = await db.insert(guidanceSessionsTable)
        .values({
          thesis_id: testThesisId,
          notes: 'Empty session'
        })
        .returning()
        .execute();

      const input: GetCommentsInput = {
        guidance_session_id: sessionResult[0].id
      };

      const result = await getCommentsBySession(input);

      expect(result).toHaveLength(0);
    });
  });

  describe('getCommentsBySubmission', () => {
    beforeEach(async () => {
      // Create test comments
      await db.insert(commentsTable)
        .values([
          {
            guidance_session_id: testGuidanceSessionId,
            submission_id: testSubmissionId,
            sender_id: testUserId,
            receiver_id: testReceiverId,
            content: 'File feedback 1',
            comment_type: 'FILE_COMMENT'
          },
          {
            guidance_session_id: testGuidanceSessionId,
            submission_id: testSubmissionId,
            sender_id: testReceiverId,
            receiver_id: testUserId,
            content: 'File feedback 2',
            comment_type: 'FILE_COMMENT'
          },
          {
            guidance_session_id: testGuidanceSessionId,
            submission_id: null,
            sender_id: testUserId,
            receiver_id: testReceiverId,
            content: 'General comment',
            comment_type: 'GENERAL'
          }
        ])
        .execute();
    });

    it('should return only comments for specific submission', async () => {
      const result = await getCommentsBySubmission(testSubmissionId);

      expect(result).toHaveLength(2);
      expect(result[0].content).toEqual('File feedback 1');
      expect(result[0].submission_id).toEqual(testSubmissionId);
      expect(result[1].content).toEqual('File feedback 2');
      expect(result[1].submission_id).toEqual(testSubmissionId);
    });

    it('should return empty array for submission with no comments', async () => {
      // Create another submission
      const submissionResult = await db.insert(submissionsTable)
        .values({
          guidance_session_id: testGuidanceSessionId,
          file_name: 'empty.pdf',
          file_path: '/uploads/empty.pdf',
          file_size: 512,
          uploaded_by: testUserId
        })
        .returning()
        .execute();

      const result = await getCommentsBySubmission(submissionResult[0].id);

      expect(result).toHaveLength(0);
    });
  });

  describe('deleteComment', () => {
    let testCommentId: number;

    beforeEach(async () => {
      // Create test comment
      const commentResult = await db.insert(commentsTable)
        .values({
          guidance_session_id: testGuidanceSessionId,
          submission_id: null,
          sender_id: testUserId,
          receiver_id: testReceiverId,
          content: 'Comment to delete',
          comment_type: 'GENERAL'
        })
        .returning()
        .execute();
      testCommentId = commentResult[0].id;
    });

    it('should delete existing comment', async () => {
      const result = await deleteComment(testCommentId);

      expect(result).toBe(true);

      // Verify deletion in database
      const comments = await db.select()
        .from(commentsTable)
        .where(eq(commentsTable.id, testCommentId))
        .execute();

      expect(comments).toHaveLength(0);
    });

    it('should return false for non-existent comment', async () => {
      const result = await deleteComment(99999);

      expect(result).toBe(false);
    });

    it('should not affect other comments', async () => {
      // Create another comment
      const otherCommentResult = await db.insert(commentsTable)
        .values({
          guidance_session_id: testGuidanceSessionId,
          submission_id: null,
          sender_id: testUserId,
          receiver_id: testReceiverId,
          content: 'Other comment',
          comment_type: 'GENERAL'
        })
        .returning()
        .execute();

      // Delete first comment
      await deleteComment(testCommentId);

      // Verify other comment still exists
      const comments = await db.select()
        .from(commentsTable)
        .where(eq(commentsTable.id, otherCommentResult[0].id))
        .execute();

      expect(comments).toHaveLength(1);
      expect(comments[0].content).toEqual('Other comment');
    });
  });
});