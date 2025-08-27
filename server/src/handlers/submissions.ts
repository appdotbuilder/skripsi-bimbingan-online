import { db } from '../db';
import { submissionsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { 
  type CreateSubmissionInput, 
  type Submission 
} from '../schema';

export async function createSubmission(input: CreateSubmissionInput): Promise<Submission> {
  try {
    const result = await db.insert(submissionsTable)
      .values({
        guidance_session_id: input.guidance_session_id,
        file_name: input.file_name,
        file_path: input.file_path,
        file_size: input.file_size,
        uploaded_by: input.uploaded_by,
        description: input.description
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Submission creation failed:', error);
    throw error;
  }
}

export async function getSubmissionsBySession(sessionId: number): Promise<Submission[]> {
  try {
    const results = await db.select()
      .from(submissionsTable)
      .where(eq(submissionsTable.guidance_session_id, sessionId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get submissions by session:', error);
    throw error;
  }
}

export async function getSubmissionById(id: number): Promise<Submission | null> {
  try {
    const results = await db.select()
      .from(submissionsTable)
      .where(eq(submissionsTable.id, id))
      .execute();

    return results[0] || null;
  } catch (error) {
    console.error('Failed to get submission by ID:', error);
    throw error;
  }
}

export async function deleteSubmission(id: number): Promise<boolean> {
  try {
    const result = await db.delete(submissionsTable)
      .where(eq(submissionsTable.id, id))
      .returning()
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('Submission deletion failed:', error);
    throw error;
  }
}