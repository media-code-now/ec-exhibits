import { useEffect, useMemo, useRef, useState } from 'react';
import { getSocket } from './socketSingleton.js';

export function useProjectSocket({ projectId, token }) {
  const [messages, setMessages] = useState([]);
  const [badge, setBadge] = useState(0);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token || !projectId) return undefined;
    const socket = getSocket(token);
    socketRef.current = socket;

    if (!socket) {
      console.warn('[SOCKET-CLIENT] No socket created, token may be invalid');
      return undefined;
    }

    const handleBootstrap = ({ projectId: joinedId, history }) => {
      console.log('[SOCKET-CLIENT] project:bootstrapped', { joinedId, historyLength: history?.length });
      if (joinedId === projectId) setMessages(history);
    };
    const handleNewMessage = message => {
      console.log('[SOCKET-CLIENT] message:new', message);
      if (message.projectId === projectId) setMessages(prev => [...prev, message]);
    };
    const handleAck = ({ clientMessageId, messageId }) => {
      console.log('[SOCKET-CLIENT] message:ack', { clientMessageId, messageId });
      setMessages(prev =>
        prev.map(msg => (msg.clientMessageId === clientMessageId ? { ...msg, id: messageId, pending: false } : msg))
      );
    };
    const handleBadge = ({ projectId: incoming, unread }) => {
      console.log('[SOCKET-CLIENT] badge:sync', { projectId: incoming, unread });
      if (incoming === projectId) setBadge(unread);
    };

    socket.on('project:bootstrapped', handleBootstrap);
    socket.on('message:new', handleNewMessage);
    socket.on('message:ack', handleAck);
    socket.on('badge:sync', handleBadge);

    const doJoin = () => {
      console.log('[SOCKET-CLIENT] Emitting project:join', { projectId });
      socket.emit('project:join', { projectId });
    };
    if (socket.connected) {
      doJoin();
    } else {
      socket.once('connect', () => {
        doJoin();
      });
    }

    return () => {
      socket.off('project:bootstrapped', handleBootstrap);
      socket.off('message:new', handleNewMessage);
      socket.off('message:ack', handleAck);
      socket.off('badge:sync', handleBadge);
    };
  }, [projectId, token]);

  const sendMessage = useMemo(() => {
    return body => {
      if (!body || !socketRef.current) return;
      const optimistic = {
        clientMessageId: crypto.randomUUID(),
        body,
        projectId,
        pending: true,
        author: { id: 'me', displayName: 'You' },
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, optimistic]);
      console.log('[SOCKET-CLIENT] Emitting message:send', { projectId, clientMessageId: optimistic.clientMessageId });
      socketRef.current.emit('message:send', {
        projectId,
        body,
        clientMessageId: optimistic.clientMessageId
      });
    };
  }, [projectId]);

  const markRead = useMemo(() => {
    return () => {
      if (!socketRef.current) return;
      socketRef.current.emit('message:read', { projectId });
    };
  }, [projectId]);

  return { messages, sendMessage, markRead, badge };
}
