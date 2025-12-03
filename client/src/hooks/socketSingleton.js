import { io } from 'socket.io-client';

const sockets = new Map();

// Use environment variable for socket URL, fallback to localhost for development
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export function getSocket(token) {
  if (!token || token === 'null' || token === 'undefined' || token.length < 50) {
    console.warn('[SOCKET-CLIENT] Invalid or missing token, not creating socket. Token:', token);
    return null;
  }
  if (sockets.has(token)) {
    console.log('[SOCKET-CLIENT] Returning existing socket for token');
    return sockets.get(token);
  }
  console.log('[SOCKET-CLIENT] Creating socket for token (len):', token?.length, 'First 20 chars:', token?.substring(0, 20));
  const socket = io(SOCKET_URL, {
    auth: { token }
  });

  socket.on('connect', () => console.log('[SOCKET-CLIENT] connected', socket.id));
  socket.on('connect_error', err => console.error('[SOCKET-CLIENT] connect_error', err && err.message));
  socket.on('disconnect', reason => console.log('[SOCKET-CLIENT] disconnected', reason));
  socket.on('reconnect_attempt', attempt => console.log('[SOCKET-CLIENT] reconnect attempt', attempt));

  sockets.set(token, socket);
  return socket;
}
