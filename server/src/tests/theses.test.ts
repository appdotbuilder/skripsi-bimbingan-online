import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, studentsTable, thesesTable } from '../db/schema';
import { type GetThesesByStudentInput } from '../schema';
import { getThesesByStudent } from '../handlers/theses';

describe('getThesesByStudent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return theses for a specific student', async () => {
    // Create prerequisite user
    const user = await db.insert(usersTable).values({
      username: 'student_user',
      email: 'student@test.com',
      password_hash: 'hashed_password',
      role: 'STUDENT'
    }).returning().execute();

    // Create student
    const student = await db.insert(studentsTable).values({
      user_id: user[0].id,
      student_id: 'STU001',
      full_name: 'John Doe',
      phone: null,
      address: null
    }).returning().execute();

    // Create test theses
    const thesis1 = await db.insert(thesesTable).values({
      student_id: student[0].id,
      title: 'First Thesis',
      description: 'First thesis description',
      status: 'PROPOSAL'
    }).returning().execute();

    const thesis2 = await db.insert(thesesTable).values({
      student_id: student[0].id,
      title: 'Second Thesis',
      description: 'Second thesis description',
      status: 'IN_PROGRESS'
    }).returning().execute();

    const input: GetThesesByStudentInput = {
      student_id: student[0].id
    };

    const result = await getThesesByStudent(input);

    expect(result).toHaveLength(2);
    expect(result[0].title).toEqual('First Thesis');
    expect(result[0].description).toEqual('First thesis description');
    expect(result[0].status).toEqual('PROPOSAL');
    expect(result[0].student_id).toEqual(student[0].id);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    expect(result[1].title).toEqual('Second Thesis');
    expect(result[1].description).toEqual('Second thesis description');
    expect(result[1].status).toEqual('IN_PROGRESS');
    expect(result[1].student_id).toEqual(student[0].id);
  });

  it('should return empty array when student has no theses', async () => {
    // Create prerequisite user
    const user = await db.insert(usersTable).values({
      username: 'student_user_no_thesis',
      email: 'nostudent@test.com',
      password_hash: 'hashed_password',
      role: 'STUDENT'
    }).returning().execute();

    // Create student
    const student = await db.insert(studentsTable).values({
      user_id: user[0].id,
      student_id: 'STU002',
      full_name: 'Jane Doe',
      phone: null,
      address: null
    }).returning().execute();

    const input: GetThesesByStudentInput = {
      student_id: student[0].id
    };

    const result = await getThesesByStudent(input);

    expect(result).toHaveLength(0);
  });

  it('should return only theses for specified student', async () => {
    // Create first user and student
    const user1 = await db.insert(usersTable).values({
      username: 'student1',
      email: 'student1@test.com',
      password_hash: 'hashed_password',
      role: 'STUDENT'
    }).returning().execute();

    const student1 = await db.insert(studentsTable).values({
      user_id: user1[0].id,
      student_id: 'STU001',
      full_name: 'Student One',
      phone: null,
      address: null
    }).returning().execute();

    // Create second user and student
    const user2 = await db.insert(usersTable).values({
      username: 'student2',
      email: 'student2@test.com',
      password_hash: 'hashed_password',
      role: 'STUDENT'
    }).returning().execute();

    const student2 = await db.insert(studentsTable).values({
      user_id: user2[0].id,
      student_id: 'STU002',
      full_name: 'Student Two',
      phone: null,
      address: null
    }).returning().execute();

    // Create theses for both students
    await db.insert(thesesTable).values({
      student_id: student1[0].id,
      title: 'Student 1 Thesis',
      description: 'First student thesis',
      status: 'PROPOSAL'
    }).execute();

    await db.insert(thesesTable).values({
      student_id: student2[0].id,
      title: 'Student 2 Thesis',
      description: 'Second student thesis',
      status: 'IN_PROGRESS'
    }).execute();

    // Query for student1's theses
    const input: GetThesesByStudentInput = {
      student_id: student1[0].id
    };

    const result = await getThesesByStudent(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Student 1 Thesis');
    expect(result[0].student_id).toEqual(student1[0].id);
  });

  it('should handle different thesis statuses correctly', async () => {
    // Create prerequisite user and student
    const user = await db.insert(usersTable).values({
      username: 'test_student',
      email: 'test@test.com',
      password_hash: 'hashed_password',
      role: 'STUDENT'
    }).returning().execute();

    const student = await db.insert(studentsTable).values({
      user_id: user[0].id,
      student_id: 'STU003',
      full_name: 'Test Student',
      phone: null,
      address: null
    }).returning().execute();

    // Create theses with different statuses
    await db.insert(thesesTable).values([
      {
        student_id: student[0].id,
        title: 'Proposal Thesis',
        description: null,
        status: 'PROPOSAL'
      },
      {
        student_id: student[0].id,
        title: 'In Progress Thesis',
        description: 'Work in progress',
        status: 'IN_PROGRESS'
      },
      {
        student_id: student[0].id,
        title: 'Revision Thesis',
        description: 'Needs revision',
        status: 'REVISION'
      },
      {
        student_id: student[0].id,
        title: 'Completed Thesis',
        description: 'Completed work',
        status: 'COMPLETED'
      }
    ]).execute();

    const input: GetThesesByStudentInput = {
      student_id: student[0].id
    };

    const result = await getThesesByStudent(input);

    expect(result).toHaveLength(4);
    
    // Verify all different statuses are returned
    const statuses = result.map(thesis => thesis.status);
    expect(statuses).toContain('PROPOSAL');
    expect(statuses).toContain('IN_PROGRESS');
    expect(statuses).toContain('REVISION');
    expect(statuses).toContain('COMPLETED');
  });

  it('should return theses with null descriptions correctly', async () => {
    // Create prerequisite user and student
    const user = await db.insert(usersTable).values({
      username: 'null_desc_student',
      email: 'nulldesc@test.com',
      password_hash: 'hashed_password',
      role: 'STUDENT'
    }).returning().execute();

    const student = await db.insert(studentsTable).values({
      user_id: user[0].id,
      student_id: 'STU004',
      full_name: 'Null Desc Student',
      phone: null,
      address: null
    }).returning().execute();

    // Create thesis with null description
    await db.insert(thesesTable).values({
      student_id: student[0].id,
      title: 'Thesis with Null Description',
      description: null,
      status: 'PROPOSAL'
    }).execute();

    const input: GetThesesByStudentInput = {
      student_id: student[0].id
    };

    const result = await getThesesByStudent(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Thesis with Null Description');
    expect(result[0].description).toBeNull();
    expect(result[0].status).toEqual('PROPOSAL');
  });
});