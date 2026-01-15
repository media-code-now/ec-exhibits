import bcrypt from 'bcrypt';
import prisma from './db.js';

const SALT_ROUNDS = 10;

/**
 * Register a new user
 * @param {Object} userData - User data
 * @param {string} userData.email - User email
 * @param {string} userData.password - Plain text password
 * @param {string} userData.displayName - User display name
 * @param {string} userData.role - User role (owner, project_manager, staff, client)
 * @returns {Promise<Object>} Created user (without password_hash)
 */
export async function registerUser({ email, password, displayName, role = 'client' }) {
  // Validate input
  if (!email || !password || !displayName) {
    throw new Error('Email, password, and display name are required');
  }

  if (!['owner', 'project_manager', 'staff', 'client'].includes(role)) {
    throw new Error('Invalid role. Must be owner, project_manager, staff, or client');
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName,
      role
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return user;
}

/**
 * Authenticate user with email and password
 * @param {string} email - User email
 * @param {string} password - Plain text password
 * @returns {Promise<Object|null>} User object if authenticated, null otherwise
 */
export async function authenticateUser(email, password) {
  if (!email || !password) {
    console.log('[AUTH] Missing email or password');
    return null;
  }

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    console.log('[AUTH] User not found:', email);
    return null;
  }

  console.log('[AUTH] User found:', user.email);
  console.log('[AUTH] Password hash exists:', !!user.passwordHash);
  console.log('[AUTH] Password hash value:', user.passwordHash);

  // Verify password
  const isValid = await bcrypt.compare(password, user.passwordHash);

  console.log('[AUTH] Password valid:', isValid);

  if (!isValid) {
    return null;
  }

  // Return user without password hash
  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User object or null
 */
export async function getUserById(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return user;
}

/**
 * Get user by email
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User object or null
 */
export async function getUserByEmail(email) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return user;
}

/**
 * List all users
 * @returns {Promise<Array>} Array of users
 */
export async function getAllUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return users;
}

/**
 * Update user
 * @param {string} userId - User ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated user
 */
export async function updateUser(userId, updates) {
  const { password, ...otherUpdates } = updates;

  const data = { ...otherUpdates };

  // Hash password if provided
  if (password) {
    data.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return user;
}

/**
 * Delete user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Deleted user
 */
export async function deleteUser(userId) {
  const user = await prisma.user.delete({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true
    }
  });

  return user;
}
