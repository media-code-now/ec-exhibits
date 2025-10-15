import { io } from 'socket.io-client';

const sockets = new Map();

export function getSocket(token) {
  if (!token) return null;
  if (sockets.has(token)) return sockets.get(token);
  const socket = io('http://localhost:4000', {
    auth: { token }
  });
  sockets.set(token, socket);
  return socket;
}
