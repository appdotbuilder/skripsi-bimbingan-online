import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  studentsTable, 
  thesesTable, 
  guidanceSessionsTable,
  submissionsTable 
} from '../db/schema';
import { type CreateSubmissionInput } from '../schema';
import { 
  createSubmission, 
  getSubmissionsBySession, 
  getSubmissionById, 
  deleteSubmission 
} from '../handlers/submissions';
import { eq } from 'drizzle-orm';

describe('submissions handlers', () => {
  let testUserId: number;
  let testStudentId: number;
  let testThesisId: number;
  let testGuidanceSessionId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'STUDENT'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test student
    const studentResult = await db.insert(studentsTable)
      .values({
        user_id: testUserId,
        student_id: 'STU001',
        full_name: 'Test Student',
        phone: '1234567890',
        address: 'Test Address'
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
        status: 'PROPOSAL'
      })
      .returning()
      .execute();
    testThesisId = thesisResult[0].id;

    // Create test guidance session
    const sessionResult = await db.insert(guidanceSessionsTable)
      .values({
        thesis_id: testThesisId,
        session_date: new Date(),
        notes: 'Test session notes'
      })
      .returning()
      .execute();
    testGuidanceSessionId = sessionResult[0].id;
  });

  afterEach(resetDB);

  const testSubmissionInput: CreateSubmissionInput = {
    guidance_session_id: 0, // Will be set in tests
    file_name: 'thesis_draft.pdf',
    file_path: '/uploads/thesis_draft.pdf',
    file_size: 1024000,
    uploaded_by: 0, // Will be set in tests
    description: 'First draft of thesis'
  };

  describe('createSubmission', () => {
    it('should create a submission successfully', async () => {
      const input = {
        ...testSubmissionInput,
        guidance_session_id: testGuidanceSessionId,
        uploaded_by: testUserId
      };

      const result = await createSubmission(input);

      expect(result.id).toBeDefined();
      expect(result.guidance_session_id).toEqual(testGuidanceSessionId);
      expect(result.file_name).toEqual('thesis_draft.pdf');
      expect(result.file_path).toEqual('/uploads/thesis_draft.pdf');
      expect(result.file_size).toEqual(1024000);
      expect(result.uploaded_by).toEqual(testUserId);
      expect(result.description).toEqual('First draft of thesis');
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save submission to database', async () => {
      const input = {
        ...testSubmissionInput,
        guidance_session_id: testGuidanceSessionId,
        uploaded_by: testUserId
      };

      const result = await createSubmission(input);

      const submissions = await db.select()
        .from(submissionsTable)
        .where(eq(submissionsTable.id, result.id))
        .execute();

      expect(submissions).toHaveLength(1);
      expect(submissions[0].file_name).toEqual('thesis_draft.pdf');
      expect(submissions[0].file_size).toEqual(1024000);
      expect(submissions[0].uploaded_by).toEqual(testUserId);
    });

    it('should create submission with null description', async () => {
      const input = {
        ...testSubmissionInput,
        guidance_session_id: testGuidanceSessionId,
        uploaded_by: testUserId,
        description: null
      };

      const result = await createSubmission(input);

      expect(result.description).toBeNull();
    });

    it('should throw error for invalid guidance session', async () => {
      const input = {
        ...testSubmissionInput,
        guidance_session_id: 99999,
        uploaded_by: testUserId
      };

      await expect(createSubmission(input)).rejects.toThrow(/violates foreign key constraint/i);
    });

    it('should throw error for invalid uploaded_by user', async () => {
      const input = {
        ...testSubmissionInput,
        guidance_session_id: testGuidanceSessionId,
        uploaded_by: 99999
      };

      await expect(createSubmission(input)).rejects.toThrow(/violates foreign key constraint/i);
    });
  });

  describe('getSubmissionsBySession', () => {
    it('should return submissions for a session', async () => {
      // Create multiple submissions for the session
      const submission1Input = {
        ...testSubmissionInput,
        guidance_session_id: testGuidanceSessionId,
        uploaded_by: testUserId,
        file_name: 'draft1.pdf'
      };

      const submission2Input = {
        ...testSubmissionInput,
        guidance_session_id: testGuidanceSessionId,
        uploaded_by: testUserId,
        file_name: 'draft2.pdf'
      };

      await createSubmission(submission1Input);
      await createSubmission(submission2Input);

      const results = await getSubmissionsBySession(testGuidanceSessionId);

      expect(results).toHaveLength(2);
      expect(results[0].guidance_session_id).toEqual(testGuidanceSessionId);
      expect(results[1].guidance_session_id).toEqual(testGuidanceSessionId);
      
      const fileNames = results.map(s => s.file_name);
      expect(fileNames).toContain('draft1.pdf');
      expect(fileNames).toContain('draft2.pdf');
    });

    it('should return empty array for session with no submissions', async () => {
      const results = await getSubmissionsBySession(testGuidanceSessionId);
      expect(results).toHaveLength(0);
    });

    it('should return empty array for non-existent session', async () => {
      const results = await getSubmissionsBySession(99999);
      expect(results).toHaveLength(0);
    });
  });

  describe('getSubmissionById', () => {
    it('should return submission by ID', async () => {
      const input = {
        ...testSubmissionInput,
        guidance_session_id: testGuidanceSessionId,
        uploaded_by: testUserId
      };

      const created = await createSubmission(input);
      const result = await getSubmissionById(created.id);

      expect(result).toBeDefined();
      expect(result!.id).toEqual(created.id);
      expect(result!.file_name).toEqual('thesis_draft.pdf');
      expect(result!.file_path).toEqual('/uploads/thesis_draft.pdf');
      expect(result!.file_size).toEqual(1024000);
      expect(result!.uploaded_by).toEqual(testUserId);
      expect(result!.description).toEqual('First draft of thesis');
    });

    it('should return null for non-existent submission', async () => {
      const result = await getSubmissionById(99999);
      expect(result).toBeNull();
    });
  });

  describe('deleteSubmission', () => {
    it('should delete submission successfully', async () => {
      const input = {
        ...testSubmissionInput,
        guidance_session_id: testGuidanceSessionId,
        uploaded_by: testUserId
      };

      const created = await createSubmission(input);
      const deleteResult = await deleteSubmission(created.id);

      expect(deleteResult).toBe(true);

      // Verify submission is deleted
      const submissions = await db.select()
        .from(submissionsTable)
        .where(eq(submissionsTable.id, created.id))
        .execute();

      expect(submissions).toHaveLength(0);
    });

    it('should return false for non-existent submission', async () => {
      const result = await deleteSubmission(99999);
      expect(result).toBe(false);
    });

    it('should not affect other submissions when deleting one', async () => {
      const input1 = {
        ...testSubmissionInput,
        guidance_session_id: testGuidanceSessionId,
        uploaded_by: testUserId,
        file_name: 'file1.pdf'
      };

      const input2 = {
        ...testSubmissionInput,
        guidance_session_id: testGuidanceSessionId,
        uploaded_by: testUserId,
        file_name: 'file2.pdf'
      };

      const submission1 = await createSubmission(input1);
      const submission2 = await createSubmission(input2);

      await deleteSubmission(submission1.id);

      // Verify only the first submission is deleted
      const remaining = await getSubmissionsBySession(testGuidanceSessionId);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toEqual(submission2.id);
      expect(remaining[0].file_name).toEqual('file2.pdf');
    });
  });
});