import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, studentsTable, thesesTable, guidanceSessionsTable } from '../db/schema';
import { 
  type CreateGuidanceSessionInput, 
  type GetGuidanceSessionsInput
} from '../schema';
import { 
  createGuidanceSession, 
  getGuidanceSessionsByThesis, 
  getGuidanceSessionById,
  updateGuidanceSession 
} from '../handlers/guidance_sessions';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  username: 'teststudent',
  email: 'student@test.com',
  password_hash: 'hashedpassword123',
  role: 'STUDENT' as const
};

const testStudent = {
  student_id: 'STU001',
  full_name: 'Test Student',
  phone: '123-456-7890',
  address: '123 Test Street'
};

const testThesis = {
  title: 'Test Thesis',
  description: 'A thesis for testing guidance sessions',
  status: 'IN_PROGRESS' as const
};

describe('Guidance Sessions Handlers', () => {
  let userId: number;
  let studentId: number;
  let thesisId: number;

  beforeEach(async () => {
    await createDB();

    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create test student
    const studentResult = await db.insert(studentsTable)
      .values({
        ...testStudent,
        user_id: userId
      })
      .returning()
      .execute();
    studentId = studentResult[0].id;

    // Create test thesis
    const thesisResult = await db.insert(thesesTable)
      .values({
        ...testThesis,
        student_id: studentId
      })
      .returning()
      .execute();
    thesisId = thesisResult[0].id;
  });

  afterEach(resetDB);

  describe('createGuidanceSession', () => {
    it('should create a guidance session with all fields', async () => {
      const sessionDate = new Date('2024-01-15T10:00:00Z');
      const input: CreateGuidanceSessionInput = {
        thesis_id: thesisId,
        session_date: sessionDate,
        notes: 'First guidance session to discuss thesis outline'
      };

      const result = await createGuidanceSession(input);

      expect(result.id).toBeDefined();
      expect(result.thesis_id).toEqual(thesisId);
      expect(result.session_date).toEqual(sessionDate);
      expect(result.notes).toEqual('First guidance session to discuss thesis outline');
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should create a guidance session with default session_date when not provided', async () => {
      const input: CreateGuidanceSessionInput = {
        thesis_id: thesisId,
        notes: 'Session with default date'
      };

      const beforeTime = new Date();
      const result = await createGuidanceSession(input);
      const afterTime = new Date();

      expect(result.session_date).toBeInstanceOf(Date);
      expect(result.session_date.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(result.session_date.getTime()).toBeLessThanOrEqual(afterTime.getTime());
      expect(result.notes).toEqual('Session with default date');
    });

    it('should create a guidance session with null notes', async () => {
      const input: CreateGuidanceSessionInput = {
        thesis_id: thesisId,
        notes: null
      };

      const result = await createGuidanceSession(input);

      expect(result.notes).toBeNull();
      expect(result.thesis_id).toEqual(thesisId);
    });

    it('should save guidance session to database', async () => {
      const input: CreateGuidanceSessionInput = {
        thesis_id: thesisId,
        notes: 'Test session for database verification'
      };

      const result = await createGuidanceSession(input);

      const savedSession = await db.select()
        .from(guidanceSessionsTable)
        .where(eq(guidanceSessionsTable.id, result.id))
        .execute();

      expect(savedSession).toHaveLength(1);
      expect(savedSession[0].thesis_id).toEqual(thesisId);
      expect(savedSession[0].notes).toEqual('Test session for database verification');
      expect(savedSession[0].session_date).toBeInstanceOf(Date);
    });

    it('should throw error when thesis does not exist', async () => {
      const input: CreateGuidanceSessionInput = {
        thesis_id: 99999, // Non-existent thesis ID
        notes: 'This should fail'
      };

      await expect(createGuidanceSession(input))
        .rejects.toThrow(/Thesis with ID 99999 does not exist/i);
    });
  });

  describe('getGuidanceSessionsByThesis', () => {
    it('should return empty array when no sessions exist', async () => {
      const input: GetGuidanceSessionsInput = {
        thesis_id: thesisId
      };

      const result = await getGuidanceSessionsByThesis(input);

      expect(result).toEqual([]);
    });

    it('should return all sessions for a thesis ordered by date (newest first)', async () => {
      // Create multiple sessions with different dates
      const session1Date = new Date('2024-01-10T10:00:00Z');
      const session2Date = new Date('2024-01-15T14:00:00Z');
      const session3Date = new Date('2024-01-12T09:00:00Z');

      await createGuidanceSession({
        thesis_id: thesisId,
        session_date: session1Date,
        notes: 'First session'
      });

      await createGuidanceSession({
        thesis_id: thesisId,
        session_date: session2Date,
        notes: 'Second session'
      });

      await createGuidanceSession({
        thesis_id: thesisId,
        session_date: session3Date,
        notes: 'Third session'
      });

      const input: GetGuidanceSessionsInput = {
        thesis_id: thesisId
      };

      const result = await getGuidanceSessionsByThesis(input);

      expect(result).toHaveLength(3);
      
      // Should be ordered by session_date descending (newest first)
      expect(result[0].session_date).toEqual(session2Date); // 2024-01-15
      expect(result[0].notes).toEqual('Second session');
      
      expect(result[1].session_date).toEqual(session3Date); // 2024-01-12
      expect(result[1].notes).toEqual('Third session');
      
      expect(result[2].session_date).toEqual(session1Date); // 2024-01-10
      expect(result[2].notes).toEqual('First session');
    });

    it('should only return sessions for the specified thesis', async () => {
      // Create another thesis
      const anotherThesisResult = await db.insert(thesesTable)
        .values({
          title: 'Another Thesis',
          student_id: studentId,
          status: 'PROPOSAL'
        })
        .returning()
        .execute();
      const anotherThesisId = anotherThesisResult[0].id;

      // Create sessions for both theses
      await createGuidanceSession({
        thesis_id: thesisId,
        notes: 'Session for first thesis'
      });

      await createGuidanceSession({
        thesis_id: anotherThesisId,
        notes: 'Session for second thesis'
      });

      const input: GetGuidanceSessionsInput = {
        thesis_id: thesisId
      };

      const result = await getGuidanceSessionsByThesis(input);

      expect(result).toHaveLength(1);
      expect(result[0].thesis_id).toEqual(thesisId);
      expect(result[0].notes).toEqual('Session for first thesis');
    });
  });

  describe('getGuidanceSessionById', () => {
    it('should return guidance session when found', async () => {
      const createdSession = await createGuidanceSession({
        thesis_id: thesisId,
        notes: 'Session to retrieve by ID'
      });

      const result = await getGuidanceSessionById(createdSession.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(createdSession.id);
      expect(result!.thesis_id).toEqual(thesisId);
      expect(result!.notes).toEqual('Session to retrieve by ID');
      expect(result!.session_date).toBeInstanceOf(Date);
    });

    it('should return null when session not found', async () => {
      const result = await getGuidanceSessionById(99999);

      expect(result).toBeNull();
    });
  });

  describe('updateGuidanceSession', () => {
    it('should update guidance session notes', async () => {
      const createdSession = await createGuidanceSession({
        thesis_id: thesisId,
        notes: 'Original notes'
      });

      const originalUpdatedAt = createdSession.updated_at;
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 1));

      const result = await updateGuidanceSession(createdSession.id, 'Updated notes after discussion');

      expect(result.id).toEqual(createdSession.id);
      expect(result.notes).toEqual('Updated notes after discussion');
      expect(result.thesis_id).toEqual(thesisId);
      expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should save updated notes to database', async () => {
      const createdSession = await createGuidanceSession({
        thesis_id: thesisId,
        notes: 'Original notes'
      });

      await updateGuidanceSession(createdSession.id, 'Notes updated in database');

      const savedSession = await db.select()
        .from(guidanceSessionsTable)
        .where(eq(guidanceSessionsTable.id, createdSession.id))
        .execute();

      expect(savedSession).toHaveLength(1);
      expect(savedSession[0].notes).toEqual('Notes updated in database');
      expect(savedSession[0].updated_at.getTime()).toBeGreaterThan(createdSession.updated_at.getTime());
    });

    it('should throw error when session does not exist', async () => {
      await expect(updateGuidanceSession(99999, 'New notes'))
        .rejects.toThrow(/Guidance session with ID 99999 does not exist/i);
    });

    it('should handle empty notes string', async () => {
      const createdSession = await createGuidanceSession({
        thesis_id: thesisId,
        notes: 'Original notes'
      });

      const result = await updateGuidanceSession(createdSession.id, '');

      expect(result.notes).toEqual('');
    });
  });
});