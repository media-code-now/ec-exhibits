import { randomUUID } from 'crypto';

const userStore = [
  { id: 'user-owner', displayName: 'Olivia Owner', role: 'owner', email: 'olivia.owner@example.com' },
  { id: 'user-staff', displayName: 'Samuel Staff', role: 'staff', email: 'samuel.staff@example.com' },
  { id: 'user-staff-2', displayName: 'Skyler Staff', role: 'staff', email: 'skyler.staff@example.com' },
  { id: 'user-client', displayName: 'Cameron Client', role: 'client', email: 'cameron.client@example.com' },
  { id: 'user-client-2', displayName: 'Callie Client', role: 'client', email: 'callie.client@example.com' }
];

const allowedRoles = new Set(['owner', 'staff', 'client']);

export function listUsers() {
  return userStore.map(user => ({ ...user }));
}

export function getUser(userId) {
  return userStore.find(user => user.id === userId) ?? null;
}

export function addUser({ displayName, role, email }) {
  if (!displayName) throw new Error('Display name is required');
  if (!email) throw new Error('Email is required');
  if (!allowedRoles.has(role)) throw new Error('Invalid role');
  const normalisedEmail = email.trim().toLowerCase();
  const existing = userStore.find(user => user.email.toLowerCase() === normalisedEmail);
  if (existing) throw new Error('Email already exists');

  const id = `user-${role}-${randomUUID().slice(0, 8)}`;
  const user = { id, displayName: displayName.trim(), role, email: normalisedEmail };
  userStore.push(user);
  return { ...user };
}

export function removeUser(userId) {
  const index = userStore.findIndex(user => user.id === userId);
  if (index === -1) {
    throw new Error('User not found');
  }
  const [removed] = userStore.splice(index, 1);
  return { ...removed };
}
