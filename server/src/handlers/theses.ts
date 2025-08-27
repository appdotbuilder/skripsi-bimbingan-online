import { 
  type CreateThesisInput, 
  type UpdateThesisInput, 
  type Thesis,
  type GetThesesByStudentInput,
  type GetThesesByLecturerInput
} from '../schema';
import { db } from '../db';
import { thesesTable, thesisLecturersTable } from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';

export async function createThesis(input: CreateThesisInput): Promise<Thesis> {
  try {
    // Insert the new thesis
    const result = await db.insert(thesesTable)
      .values({
        student_id: input.student_id,
        title: input.title,
        description: input.description,
        status: input.status || 'PROPOSAL',
      })
      .returning()
      .execute();

    const newThesis = result[0];

    // Insert thesis-lecturer relationships
    const thesisLecturerEntries = input.lecturer_ids.map((lecturerId, index) => ({
      thesis_id: newThesis.id,
      lecturer_id: lecturerId,
      is_primary: index === 0, // First lecturer is primary supervisor
    }));

    await db.insert(thesisLecturersTable)
      .values(thesisLecturerEntries)
      .execute();

    return newThesis;
  } catch (error) {
    console.error('Failed to create thesis:', error);
    throw error;
  }
}

export async function updateThesis(input: UpdateThesisInput): Promise<Thesis> {
  try {
    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date(),
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    const result = await db.update(thesesTable)
      .set(updateData)
      .where(eq(thesesTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Thesis with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Failed to update thesis:', error);
    throw error;
  }
}

export async function getThesesByStudent(input: GetThesesByStudentInput): Promise<Thesis[]> {
  try {
    const results = await db.select()
      .from(thesesTable)
      .where(eq(thesesTable.student_id, input.student_id))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch theses for student:', error);
    throw error;
  }
}

export async function getThesesByLecturer(input: GetThesesByLecturerInput): Promise<Thesis[]> {
  try {
    const results = await db.select({
      id: thesesTable.id,
      student_id: thesesTable.student_id,
      title: thesesTable.title,
      description: thesesTable.description,
      status: thesesTable.status,
      created_at: thesesTable.created_at,
      updated_at: thesesTable.updated_at,
    })
      .from(thesesTable)
      .innerJoin(
        thesisLecturersTable,
        eq(thesesTable.id, thesisLecturersTable.thesis_id)
      )
      .where(eq(thesisLecturersTable.lecturer_id, input.lecturer_id))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch theses for lecturer:', error);
    throw error;
  }
}

export async function getAllTheses(): Promise<Thesis[]> {
  try {
    const results = await db.select()
      .from(thesesTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch all theses:', error);
    throw error;
  }
}

export async function getThesisById(id: number): Promise<Thesis | null> {
  try {
    const results = await db.select()
      .from(thesesTable)
      .where(eq(thesesTable.id, id))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to fetch thesis by id:', error);
    throw error;
  }
}

export async function deleteThesis(id: number): Promise<boolean> {
  try {
    // The thesis-lecturer relationships will be cascade deleted automatically
    // due to the foreign key constraint with onDelete: 'cascade'
    const result = await db.delete(thesesTable)
      .where(eq(thesesTable.id, id))
      .returning()
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('Failed to delete thesis:', error);
    throw error;
  }
}