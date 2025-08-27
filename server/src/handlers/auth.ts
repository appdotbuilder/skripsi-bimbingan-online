import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

// For password hashing - using Node.js built-in crypto
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';

// Simple JWT implementation using Node.js built-in crypto
import { createHmac } from 'crypto';

const JWT_SECRET = process.env['JWT_SECRET'] || 'your-secret-key-for-thesis-management';

// Helper function to hash passwords
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

// Helper function to verify passwords
function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split(':');
  const hashBuffer = Buffer.from(hash, 'hex');
  const verifyBuffer = scryptSync(password, salt, 64);
  return timingSafeEqual(hashBuffer, verifyBuffer);
}

// Simple JWT token implementation
function generateToken(userId: number): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = { 
    userId, 
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    iat: Date.now(), // Issue time with millisecond precision for uniqueness
    jti: randomBytes(8).toString('hex') // Random JWT ID for uniqueness
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  const signature = createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export async function registerUser(input: CreateUserInput): Promise<User> {
  try {
    // Check if username or email already exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (existingUser.length > 0) {
      throw new Error('Username already exists');
    }

    const existingEmail = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (existingEmail.length > 0) {
      throw new Error('Email already exists');
    }

    // Hash the password
    const hashedPassword = hashPassword(input.password);

    // Create the user
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        email: input.email,
        password_hash: hashedPassword,
        role: input.role
      })
      .returning()
      .execute();

    const user = result[0];
    return {
      ...user,
      // Don't include password_hash in response for security
      password_hash: ''
    };
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
}

export async function loginUser(input: LoginInput): Promise<{ user: User; token: string }> {
  try {
    // Find user by username
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = users[0];

    // Verify password
    if (!verifyPassword(input.password, user.password_hash)) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT token
    const token = generateToken(user.id);

    // Return user data (without password hash) and token
    return {
      user: {
        ...user,
        password_hash: '' // Don't include password_hash in response
      },
      token
    };
  } catch (error) {
    console.error('User login failed:', error);
    throw error;
  }
}