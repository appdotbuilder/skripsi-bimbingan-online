import { db } from '../db';
import { studentsTable, usersTable } from '../db/schema';
import { type CreateStudentInput, type Student } from '../schema';
import { eq } from 'drizzle-orm';

export async function createStudent(input: CreateStudentInput): Promise<Student> {
  try {
    // Verify that the user exists and has the correct role
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    if (user[0].role !== 'STUDENT') {
      throw new Error('User must have STUDENT role');
    }

    // Insert student record
    const result = await db.insert(studentsTable)
      .values({
        user_id: input.user_id,
        student_id: input.student_id,
        full_name: input.full_name,
        phone: input.phone,
        address: input.address
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Student creation failed:', error);
    throw error;
  }
}

export async function getStudents(): Promise<Student[]> {
  try {
    const result = await db.select()
      .from(studentsTable)
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to fetch students:', error);
    throw error;
  }
}

export async function getStudentById(id: number): Promise<Student | null> {
  try {
    const result = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, id))
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Failed to fetch student by ID:', error);
    throw error;
  }
}

export async function getStudentByUserId(userId: number): Promise<Student | null> {
  try {
    const result = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.user_id, userId))
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Failed to fetch student by user ID:', error);
    throw error;
  }
}