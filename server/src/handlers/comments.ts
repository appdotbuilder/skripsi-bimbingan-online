import { db } from '../db';
import { commentsTable, guidanceSessionsTable, submissionsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { 
  type CreateCommentInput, 
  type Comment,
  type GetCommentsInput
} from '../schema';

export async function createComment(input: CreateCommentInput): Promise<Comment> {
  try {
    // Verify guidance session exists
    const guidanceSession = await db.select()
      .from(guidanceSessionsTable)
      .where(eq(guidanceSessionsTable.id, input.guidance_session_id))
      .execute();

    if (guidanceSession.length === 0) {
      throw new Error('Guidance session not found');
    }

    // Verify submission exists if submission_id is provided
    if (input.submission_id) {
      const submission = await db.select()
        .from(submissionsTable)
        .where(eq(submissionsTable.id, input.submission_id))
        .execute();

      if (submission.length === 0) {
        throw new Error('Submission not found');
      }
    }

    // Insert comment record
    const result = await db.insert(commentsTable)
      .values({
        guidance_session_id: input.guidance_session_id,
        submission_id: input.submission_id,
        sender_id: input.sender_id,
        receiver_id: input.receiver_id,
        content: input.content,
        comment_type: input.comment_type
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Comment creation failed:', error);
    throw error;
  }
}

export async function getCommentsBySession(input: GetCommentsInput): Promise<Comment[]> {
  try {
    const results = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.guidance_session_id, input.guidance_session_id))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch comments by session:', error);
    throw error;
  }
}

export async function getCommentsBySubmission(submissionId: number): Promise<Comment[]> {
  try {
    const results = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.submission_id, submissionId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch comments by submission:', error);
    throw error;
  }
}

export async function deleteComment(id: number): Promise<boolean> {
  try {
    const result = await db.delete(commentsTable)
      .where(eq(commentsTable.id, id))
      .returning()
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('Comment deletion failed:', error);
    throw error;
  }
}