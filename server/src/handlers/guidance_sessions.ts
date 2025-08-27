import { db } from '../db';
import { guidanceSessionsTable, thesesTable } from '../db/schema';
import { 
  type CreateGuidanceSessionInput, 
  type GuidanceSession,
  type GetGuidanceSessionsInput
} from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function createGuidanceSession(input: CreateGuidanceSessionInput): Promise<GuidanceSession> {
  try {
    // Verify that the thesis exists before creating the session
    const thesisExists = await db.select({ id: thesesTable.id })
      .from(thesesTable)
      .where(eq(thesesTable.id, input.thesis_id))
      .execute();

    if (thesisExists.length === 0) {
      throw new Error(`Thesis with ID ${input.thesis_id} does not exist`);
    }

    // Insert new guidance session
    const result = await db.insert(guidanceSessionsTable)
      .values({
        thesis_id: input.thesis_id,
        session_date: input.session_date || new Date(),
        notes: input.notes
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Guidance session creation failed:', error);
    throw error;
  }
}

export async function getGuidanceSessionsByThesis(input: GetGuidanceSessionsInput): Promise<GuidanceSession[]> {
  try {
    // Fetch all guidance sessions for the specified thesis, ordered by session date (newest first)
    const result = await db.select()
      .from(guidanceSessionsTable)
      .where(eq(guidanceSessionsTable.thesis_id, input.thesis_id))
      .orderBy(desc(guidanceSessionsTable.session_date))
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to fetch guidance sessions:', error);
    throw error;
  }
}

export async function getGuidanceSessionById(id: number): Promise<GuidanceSession | null> {
  try {
    // Fetch specific guidance session by ID
    const result = await db.select()
      .from(guidanceSessionsTable)
      .where(eq(guidanceSessionsTable.id, id))
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Failed to fetch guidance session by ID:', error);
    throw error;
  }
}

export async function updateGuidanceSession(id: number, notes: string): Promise<GuidanceSession> {
  try {
    // Verify that the guidance session exists
    const existingSession = await getGuidanceSessionById(id);
    if (!existingSession) {
      throw new Error(`Guidance session with ID ${id} does not exist`);
    }

    // Update guidance session notes and updated_at timestamp
    const result = await db.update(guidanceSessionsTable)
      .set({
        notes: notes,
        updated_at: new Date()
      })
      .where(eq(guidanceSessionsTable.id, id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Failed to update guidance session:', error);
    throw error;
  }
}