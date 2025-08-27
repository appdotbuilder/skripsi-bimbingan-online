import { db } from '../db';
import { lecturersTable, usersTable } from '../db/schema';
import { type CreateLecturerInput, type Lecturer } from '../schema';
import { eq } from 'drizzle-orm';

export async function createLecturer(input: CreateLecturerInput): Promise<Lecturer> {
  try {
    // Verify the user exists and has LECTURER role
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    if (user[0].role !== 'LECTURER') {
      throw new Error('User must have LECTURER role');
    }

    // Create lecturer record
    const result = await db.insert(lecturersTable)
      .values({
        user_id: input.user_id,
        lecturer_id: input.lecturer_id,
        full_name: input.full_name,
        phone: input.phone,
        specialization: input.specialization
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Lecturer creation failed:', error);
    throw error;
  }
}

export async function getLecturers(): Promise<Lecturer[]> {
  try {
    const result = await db.select()
      .from(lecturersTable)
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to fetch lecturers:', error);
    throw error;
  }
}

export async function getLecturerById(id: number): Promise<Lecturer | null> {
  try {
    const result = await db.select()
      .from(lecturersTable)
      .where(eq(lecturersTable.id, id))
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Failed to fetch lecturer by ID:', error);
    throw error;
  }
}

export async function getLecturerByUserId(userId: number): Promise<Lecturer | null> {
  try {
    const result = await db.select()
      .from(lecturersTable)
      .where(eq(lecturersTable.user_id, userId))
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Failed to fetch lecturer by user ID:', error);
    throw error;
  }
}