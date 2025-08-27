import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type LoginInput } from '../schema';
import { registerUser, loginUser } from '../handlers/auth';
import { eq } from 'drizzle-orm';

// Test input data
const testUserInput: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
  role: 'STUDENT'
};

const testLecturerInput: CreateUserInput = {
  username: 'testlecturer',
  email: 'lecturer@example.com',
  password: 'securepass456',
  role: 'LECTURER'
};

const testLoginInput: LoginInput = {
  username: 'testuser',
  password: 'password123'
};

describe('Auth Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('registerUser', () => {
    it('should register a new user successfully', async () => {
      const result = await registerUser(testUserInput);

      // Verify returned user data
      expect(result.username).toEqual('testuser');
      expect(result.email).toEqual('test@example.com');
      expect(result.role).toEqual('STUDENT');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
      expect(result.password_hash).toEqual(''); // Should not return password hash
    });

    it('should save user to database with hashed password', async () => {
      const result = await registerUser(testUserInput);

      // Query database to verify user was saved
      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, result.id))
        .execute();

      expect(users).toHaveLength(1);
      const savedUser = users[0];
      expect(savedUser.username).toEqual('testuser');
      expect(savedUser.email).toEqual('test@example.com');
      expect(savedUser.role).toEqual('STUDENT');
      expect(savedUser.password_hash).not.toEqual('password123'); // Should be hashed
      expect(savedUser.password_hash.length).toBeGreaterThan(10); // Hashed password should be longer
      expect(savedUser.password_hash).toContain(':'); // Our hash format includes salt:hash
    });

    it('should register lecturer user correctly', async () => {
      const result = await registerUser(testLecturerInput);

      expect(result.username).toEqual('testlecturer');
      expect(result.email).toEqual('lecturer@example.com');
      expect(result.role).toEqual('LECTURER');
      expect(result.password_hash).toEqual(''); // Should not return password hash
    });

    it('should reject duplicate username', async () => {
      // Register first user
      await registerUser(testUserInput);

      // Try to register with same username but different email
      const duplicateUsernameInput: CreateUserInput = {
        ...testUserInput,
        email: 'different@example.com'
      };

      await expect(registerUser(duplicateUsernameInput))
        .rejects.toThrow(/username already exists/i);
    });

    it('should reject duplicate email', async () => {
      // Register first user
      await registerUser(testUserInput);

      // Try to register with same email but different username
      const duplicateEmailInput: CreateUserInput = {
        ...testUserInput,
        username: 'differentuser'
      };

      await expect(registerUser(duplicateEmailInput))
        .rejects.toThrow(/email already exists/i);
    });

    it('should handle admin role registration', async () => {
      const adminInput: CreateUserInput = {
        username: 'admin',
        email: 'admin@example.com',
        password: 'adminpass789',
        role: 'ADMIN'
      };

      const result = await registerUser(adminInput);

      expect(result.role).toEqual('ADMIN');
      expect(result.username).toEqual('admin');
    });
  });

  describe('loginUser', () => {
    beforeEach(async () => {
      // Register a test user for login tests
      await registerUser(testUserInput);
    });

    it('should login with valid credentials', async () => {
      const result = await loginUser(testLoginInput);

      // Verify user data
      expect(result.user.username).toEqual('testuser');
      expect(result.user.email).toEqual('test@example.com');
      expect(result.user.role).toEqual('STUDENT');
      expect(result.user.id).toBeDefined();
      expect(result.user.password_hash).toEqual(''); // Should not return password hash

      // Verify token
      expect(result.token).toBeDefined();
      expect(typeof result.token).toEqual('string');
      expect(result.token.length).toBeGreaterThan(10); // JWT tokens are lengthy
    });

    it('should reject invalid username', async () => {
      const invalidUsernameInput: LoginInput = {
        username: 'nonexistentuser',
        password: 'password123'
      };

      await expect(loginUser(invalidUsernameInput))
        .rejects.toThrow(/invalid credentials/i);
    });

    it('should reject invalid password', async () => {
      const invalidPasswordInput: LoginInput = {
        username: 'testuser',
        password: 'wrongpassword'
      };

      await expect(loginUser(invalidPasswordInput))
        .rejects.toThrow(/invalid credentials/i);
    });

    it('should login different user roles correctly', async () => {
      // Register a lecturer
      await registerUser(testLecturerInput);

      const lecturerLoginInput: LoginInput = {
        username: 'testlecturer',
        password: 'securepass456'
      };

      const result = await loginUser(lecturerLoginInput);

      expect(result.user.username).toEqual('testlecturer');
      expect(result.user.role).toEqual('LECTURER');
      expect(result.token).toBeDefined();
    });

    it('should generate different tokens for different logins', async () => {
      const result1 = await loginUser(testLoginInput);
      
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const result2 = await loginUser(testLoginInput);

      // Tokens should be different (they include timestamps)
      expect(result1.token).not.toEqual(result2.token);
    });

    it('should handle empty password gracefully', async () => {
      const emptyPasswordInput: LoginInput = {
        username: 'testuser',
        password: ''
      };

      await expect(loginUser(emptyPasswordInput))
        .rejects.toThrow(/invalid credentials/i);
    });
  });

  describe('Password Security', () => {
    it('should generate different hashes for same password', async () => {
      const user1 = await registerUser({
        username: 'user1',
        email: 'user1@example.com',
        password: 'samepassword',
        role: 'STUDENT'
      });

      const user2 = await registerUser({
        username: 'user2',
        email: 'user2@example.com',
        password: 'samepassword',
        role: 'STUDENT'
      });

      // Get actual hashed passwords from database
      const users = await db.select()
        .from(usersTable)
        .execute();

      const hash1 = users.find(u => u.id === user1.id)?.password_hash;
      const hash2 = users.find(u => u.id === user2.id)?.password_hash;

      expect(hash1).toBeDefined();
      expect(hash2).toBeDefined();
      expect(hash1).not.toEqual(hash2); // Different salts should create different hashes
    });

    it('should verify original password can still login after registration', async () => {
      const userInput: CreateUserInput = {
        username: 'securitytest',
        email: 'security@example.com',
        password: 'complexPassword123!',
        role: 'STUDENT'
      };

      await registerUser(userInput);

      const loginInput: LoginInput = {
        username: 'securitytest',
        password: 'complexPassword123!'
      };

      const result = await loginUser(loginInput);
      expect(result.user.username).toEqual('securitytest');
      expect(result.token).toBeDefined();
    });
  });
});