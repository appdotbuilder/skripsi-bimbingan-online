import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, lecturersTable } from '../db/schema';
import { type CreateLecturerInput } from '../schema';
import { createLecturer, getLecturers, getLecturerById, getLecturerByUserId } from '../handlers/lecturers';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  username: 'test.lecturer',
  email: 'lecturer@test.com',
  password_hash: 'hashed_password',
  role: 'LECTURER' as const
};

const testStudentUser = {
  username: 'test.student',
  email: 'student@test.com',
  password_hash: 'hashed_password',
  role: 'STUDENT' as const
};

// Test lecturer input
const testLecturerInput: CreateLecturerInput = {
  user_id: 1, // Will be set dynamically
  lecturer_id: 'LEC001',
  full_name: 'Dr. John Smith',
  phone: '+1234567890',
  specialization: 'Computer Science'
};

describe('Lecturer Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createLecturer', () => {
    it('should create a lecturer successfully', async () => {
      // Create prerequisite user
      const userResult = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();

      const input = {
        ...testLecturerInput,
        user_id: userResult[0].id
      };

      const result = await createLecturer(input);

      // Verify lecturer fields
      expect(result.id).toBeDefined();
      expect(result.user_id).toEqual(userResult[0].id);
      expect(result.lecturer_id).toEqual('LEC001');
      expect(result.full_name).toEqual('Dr. John Smith');
      expect(result.phone).toEqual('+1234567890');
      expect(result.specialization).toEqual('Computer Science');
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should create lecturer with null optional fields', async () => {
      // Create prerequisite user
      const userResult = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();

      const input = {
        user_id: userResult[0].id,
        lecturer_id: 'LEC002',
        full_name: 'Dr. Jane Doe',
        phone: null,
        specialization: null
      };

      const result = await createLecturer(input);

      expect(result.phone).toBeNull();
      expect(result.specialization).toBeNull();
      expect(result.full_name).toEqual('Dr. Jane Doe');
    });

    it('should save lecturer to database', async () => {
      // Create prerequisite user
      const userResult = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();

      const input = {
        ...testLecturerInput,
        user_id: userResult[0].id
      };

      const result = await createLecturer(input);

      // Verify in database
      const lecturers = await db.select()
        .from(lecturersTable)
        .where(eq(lecturersTable.id, result.id))
        .execute();

      expect(lecturers).toHaveLength(1);
      expect(lecturers[0].lecturer_id).toEqual('LEC001');
      expect(lecturers[0].full_name).toEqual('Dr. John Smith');
      expect(lecturers[0].user_id).toEqual(userResult[0].id);
    });

    it('should throw error for non-existent user', async () => {
      const input = {
        ...testLecturerInput,
        user_id: 99999 // Non-existent user ID
      };

      await expect(createLecturer(input)).rejects.toThrow(/user not found/i);
    });

    it('should throw error for user without LECTURER role', async () => {
      // Create user with STUDENT role
      const userResult = await db.insert(usersTable)
        .values(testStudentUser)
        .returning()
        .execute();

      const input = {
        ...testLecturerInput,
        user_id: userResult[0].id
      };

      await expect(createLecturer(input)).rejects.toThrow(/must have lecturer role/i);
    });

    it('should throw error for duplicate lecturer_id', async () => {
      // Create first lecturer
      const userResult1 = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();

      const input1 = {
        ...testLecturerInput,
        user_id: userResult1[0].id
      };

      await createLecturer(input1);

      // Try to create second lecturer with same lecturer_id
      const userResult2 = await db.insert(usersTable)
        .values({
          username: 'another.lecturer',
          email: 'another@test.com',
          password_hash: 'hashed_password',
          role: 'LECTURER' as const
        })
        .returning()
        .execute();

      const input2 = {
        ...testLecturerInput,
        user_id: userResult2[0].id // Same lecturer_id but different user
      };

      await expect(createLecturer(input2)).rejects.toThrow();
    });
  });

  describe('getLecturers', () => {
    it('should return empty array when no lecturers exist', async () => {
      const result = await getLecturers();
      expect(result).toEqual([]);
    });

    it('should return all lecturers', async () => {
      // Create users
      const userResult1 = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();

      const userResult2 = await db.insert(usersTable)
        .values({
          username: 'lecturer2',
          email: 'lecturer2@test.com',
          password_hash: 'hashed_password',
          role: 'LECTURER' as const
        })
        .returning()
        .execute();

      // Create lecturers
      await createLecturer({
        ...testLecturerInput,
        user_id: userResult1[0].id
      });

      await createLecturer({
        user_id: userResult2[0].id,
        lecturer_id: 'LEC002',
        full_name: 'Dr. Jane Doe',
        phone: null,
        specialization: 'Mathematics'
      });

      const result = await getLecturers();

      expect(result).toHaveLength(2);
      expect(result[0].lecturer_id).toEqual('LEC001');
      expect(result[1].lecturer_id).toEqual('LEC002');
    });
  });

  describe('getLecturerById', () => {
    it('should return null for non-existent lecturer', async () => {
      const result = await getLecturerById(99999);
      expect(result).toBeNull();
    });

    it('should return lecturer by ID', async () => {
      // Create prerequisite user
      const userResult = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();

      const input = {
        ...testLecturerInput,
        user_id: userResult[0].id
      };

      const createdLecturer = await createLecturer(input);
      const result = await getLecturerById(createdLecturer.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(createdLecturer.id);
      expect(result!.lecturer_id).toEqual('LEC001');
      expect(result!.full_name).toEqual('Dr. John Smith');
      expect(result!.user_id).toEqual(userResult[0].id);
    });
  });

  describe('getLecturerByUserId', () => {
    it('should return null for non-existent user ID', async () => {
      const result = await getLecturerByUserId(99999);
      expect(result).toBeNull();
    });

    it('should return lecturer by user ID', async () => {
      // Create prerequisite user
      const userResult = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();

      const input = {
        ...testLecturerInput,
        user_id: userResult[0].id
      };

      const createdLecturer = await createLecturer(input);
      const result = await getLecturerByUserId(userResult[0].id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(createdLecturer.id);
      expect(result!.lecturer_id).toEqual('LEC001');
      expect(result!.full_name).toEqual('Dr. John Smith');
      expect(result!.user_id).toEqual(userResult[0].id);
    });

    it('should return null for user without lecturer profile', async () => {
      // Create user without lecturer profile
      const userResult = await db.insert(usersTable)
        .values({
          username: 'no.lecturer',
          email: 'no.lecturer@test.com',
          password_hash: 'hashed_password',
          role: 'LECTURER' as const
        })
        .returning()
        .execute();

      const result = await getLecturerByUserId(userResult[0].id);
      expect(result).toBeNull();
    });
  });
});