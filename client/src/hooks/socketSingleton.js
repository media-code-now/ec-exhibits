import { io } from 'socket.io-client';

const sockets = new Map();

export function getSocket(token) {
  if (!token) return null;
  if (sockets.has(token)) return sockets.get(token);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  const socket = io(API_URL, {
    auth: { token }
  });
  sockets.set(token, socket);
  return socket;
}
