import { io } from 'socket.io-client';

const sockets = new Map();

// Use environment variable for socket URL, fallback to localhost for development
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export function getSocket(token) {
  if (!token) return null;
  if (sockets.has(token)) return sockets.get(token);
  const socket = io(SOCKET_URL, {
    auth: { token }
  });
  sockets.set(token, socket);
  return socket;
}
