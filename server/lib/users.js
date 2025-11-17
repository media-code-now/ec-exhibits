import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

// Default password for all demo users: "password123"
const defaultPasswordHash = bcrypt.hashSync('password123', 10);

const userStore = [
  { 
    id: 'user-owner', 
    displayName: 'Olivia Owner', 
    role: 'owner', 
    email: 'olivia@ecexhibits.com',
    passwordHash: defaultPasswordHash
  },
  { 
    id: 'user-staff', 
    displayName: 'Samuel Staff', 
    role: 'staff', 
    email: 'samuel@ecexhibits.com',
    passwordHash: defaultPasswordHash
  },
  { 
    id: 'user-staff-2', 
    displayName: 'Skyler Staff', 
    role: 'staff', 
    email: 'skyler@ecexhibits.com',
    passwordHash: defaultPasswordHash
  },
  { 
    id: 'user-client', 
    displayName: 'Cameron Client', 
    role: 'client', 
    email: 'cameron@client.com',
    passwordHash: defaultPasswordHash
  },
  { 
    id: 'user-client-2', 
    displayName: 'Callie Client', 
    role: 'client', 
    email: 'callie@client.com',
    passwordHash: defaultPasswordHash
  }
];

const allowedRoles = new Set(['owner', 'staff', 'client']);

export function listUsers() {
  return userStore.map(user => {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  });
}

export function getUser(userId) {
  const user = userStore.find(user => user.id === userId);
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

export function getUserByEmail(email) {
  const normalisedEmail = email.trim().toLowerCase();
  return userStore.find(user => user.email.toLowerCase() === normalisedEmail) ?? null;
}

export function validatePassword(user, password) {
  if (!user || !user.passwordHash) return false;
  return bcrypt.compareSync(password, user.passwordHash);
}

export function addUser({ displayName, role, email, password }) {
  if (!displayName) throw new Error('Display name is required');
  if (!email) throw new Error('Email is required');
  if (!password) throw new Error('Password is required');
  if (password.length < 6) throw new Error('Password must be at least 6 characters');
  if (!allowedRoles.has(role)) throw new Error('Invalid role');
  
  const normalisedEmail = email.trim().toLowerCase();
  const existing = userStore.find(user => user.email.toLowerCase() === normalisedEmail);
  if (existing) throw new Error('Email already exists');

  const id = `user-${role}-${randomUUID().slice(0, 8)}`;
  const passwordHash = bcrypt.hashSync(password, 10);
  const user = { 
    id, 
    displayName: displayName.trim(), 
    role, 
    email: normalisedEmail,
    passwordHash
  };
  userStore.push(user);
  
  const { passwordHash: _, ...safeUser } = user;
  return safeUser;
}

export function removeUser(userId) {
  const index = userStore.findIndex(user => user.id === userId);
  if (index === -1) {
    throw new Error('User not found');
  }
  const [removed] = userStore.splice(index, 1);
  return { ...removed };
}
