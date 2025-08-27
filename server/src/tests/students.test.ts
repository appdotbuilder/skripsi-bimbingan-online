import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { studentsTable, usersTable } from '../db/schema';
import { type CreateStudentInput } from '../schema';
import { createStudent, getStudents, getStudentById, getStudentByUserId } from '../handlers/students';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  username: 'student1',
  email: 'student1@university.edu',
  password_hash: 'hashedpassword123',
  role: 'STUDENT' as const
};

const testLecturerUser = {
  username: 'lecturer1',
  email: 'lecturer1@university.edu',
  password_hash: 'hashedpassword123',
  role: 'LECTURER' as const
};

const testStudentInput: CreateStudentInput = {
  user_id: 0, // Will be set after user creation
  student_id: 'STU2024001',
  full_name: 'John Doe',
  phone: '+1234567890',
  address: '123 University Street'
};

describe('Student handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createStudent', () => {
    it('should create a student with all fields', async () => {
      // Create prerequisite user
      const userResult = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();

      const userId = userResult[0].id;

      const input = { ...testStudentInput, user_id: userId };
      const result = await createStudent(input);

      // Validate returned data
      expect(result.user_id).toEqual(userId);
      expect(result.student_id).toEqual('STU2024001');
      expect(result.full_name).toEqual('John Doe');
      expect(result.phone).toEqual('+1234567890');
      expect(result.address).toEqual('123 University Street');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should create a student with nullable fields as null', async () => {
      // Create prerequisite user
      const userResult = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();

      const userId = userResult[0].id;

      const input: CreateStudentInput = {
        user_id: userId,
        student_id: 'STU2024002',
        full_name: 'Jane Smith',
        phone: null,
        address: null
      };

      const result = await createStudent(input);

      expect(result.user_id).toEqual(userId);
      expect(result.student_id).toEqual('STU2024002');
      expect(result.full_name).toEqual('Jane Smith');
      expect(result.phone).toBeNull();
      expect(result.address).toBeNull();
      expect(result.id).toBeDefined();
    });

    it('should save student to database', async () => {
      // Create prerequisite user
      const userResult = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();

      const userId = userResult[0].id;

      const input = { ...testStudentInput, user_id: userId };
      const result = await createStudent(input);

      // Query database to verify
      const students = await db.select()
        .from(studentsTable)
        .where(eq(studentsTable.id, result.id))
        .execute();

      expect(students).toHaveLength(1);
      expect(students[0].user_id).toEqual(userId);
      expect(students[0].student_id).toEqual('STU2024001');
      expect(students[0].full_name).toEqual('John Doe');
      expect(students[0].phone).toEqual('+1234567890');
      expect(students[0].address).toEqual('123 University Street');
    });

    it('should throw error when user does not exist', async () => {
      const input = { ...testStudentInput, user_id: 999 };

      await expect(createStudent(input)).rejects.toThrow(/user not found/i);
    });

    it('should throw error when user is not a student role', async () => {
      // Create user with LECTURER role
      const userResult = await db.insert(usersTable)
        .values(testLecturerUser)
        .returning()
        .execute();

      const userId = userResult[0].id;

      const input = { ...testStudentInput, user_id: userId };

      await expect(createStudent(input)).rejects.toThrow(/user must have student role/i);
    });

    it('should enforce unique student_id constraint', async () => {
      // Create two users
      const user1Result = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();

      const user2Result = await db.insert(usersTable)
        .values({ ...testUser, username: 'student2', email: 'student2@university.edu' })
        .returning()
        .execute();

      // Create first student
      const input1 = { ...testStudentInput, user_id: user1Result[0].id };
      await createStudent(input1);

      // Try to create second student with same student_id
      const input2 = { ...testStudentInput, user_id: user2Result[0].id };

      await expect(createStudent(input2)).rejects.toThrow();
    });
  });

  describe('getStudents', () => {
    it('should return empty array when no students exist', async () => {
      const result = await getStudents();
      expect(result).toHaveLength(0);
    });

    it('should return all students', async () => {
      // Create test users and students
      const user1Result = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();

      const user2Result = await db.insert(usersTable)
        .values({ ...testUser, username: 'student2', email: 'student2@university.edu' })
        .returning()
        .execute();

      const student1Input = { ...testStudentInput, user_id: user1Result[0].id };
      const student2Input = { 
        ...testStudentInput, 
        user_id: user2Result[0].id, 
        student_id: 'STU2024002',
        full_name: 'Jane Smith'
      };

      await createStudent(student1Input);
      await createStudent(student2Input);

      const result = await getStudents();

      expect(result).toHaveLength(2);
      expect(result[0].full_name).toEqual('John Doe');
      expect(result[1].full_name).toEqual('Jane Smith');

      // Verify all students have required fields
      result.forEach(student => {
        expect(student.id).toBeDefined();
        expect(student.user_id).toBeDefined();
        expect(student.student_id).toBeDefined();
        expect(student.full_name).toBeDefined();
        expect(student.created_at).toBeInstanceOf(Date);
        expect(student.updated_at).toBeInstanceOf(Date);
      });
    });
  });

  describe('getStudentById', () => {
    it('should return null when student does not exist', async () => {
      const result = await getStudentById(999);
      expect(result).toBeNull();
    });

    it('should return student when found', async () => {
      // Create prerequisite user
      const userResult = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();

      const userId = userResult[0].id;

      // Create student
      const input = { ...testStudentInput, user_id: userId };
      const createdStudent = await createStudent(input);

      // Test retrieval
      const result = await getStudentById(createdStudent.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(createdStudent.id);
      expect(result!.user_id).toEqual(userId);
      expect(result!.student_id).toEqual('STU2024001');
      expect(result!.full_name).toEqual('John Doe');
      expect(result!.phone).toEqual('+1234567890');
      expect(result!.address).toEqual('123 University Street');
    });
  });

  describe('getStudentByUserId', () => {
    it('should return null when student does not exist for user', async () => {
      // Create a user but no student profile
      const userResult = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();

      const result = await getStudentByUserId(userResult[0].id);
      expect(result).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      const result = await getStudentByUserId(999);
      expect(result).toBeNull();
    });

    it('should return student when found by user ID', async () => {
      // Create prerequisite user
      const userResult = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();

      const userId = userResult[0].id;

      // Create student
      const input = { ...testStudentInput, user_id: userId };
      const createdStudent = await createStudent(input);

      // Test retrieval by user ID
      const result = await getStudentByUserId(userId);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(createdStudent.id);
      expect(result!.user_id).toEqual(userId);
      expect(result!.student_id).toEqual('STU2024001');
      expect(result!.full_name).toEqual('John Doe');
      expect(result!.phone).toEqual('+1234567890');
      expect(result!.address).toEqual('123 University Street');
    });
  });

  describe('database integrity', () => {
    it('should handle foreign key constraints properly', async () => {
      // Try to create student with non-existent user_id
      const input = { ...testStudentInput, user_id: 999 };

      await expect(createStudent(input)).rejects.toThrow(/user not found/i);
    });

    it('should handle cascading deletes', async () => {
      // Create user and student
      const userResult = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();

      const userId = userResult[0].id;

      const input = { ...testStudentInput, user_id: userId };
      const createdStudent = await createStudent(input);

      // Delete the user (should cascade delete student)
      await db.delete(usersTable)
        .where(eq(usersTable.id, userId))
        .execute();

      // Student should no longer exist
      const result = await getStudentById(createdStudent.id);
      expect(result).toBeNull();
    });
  });
});