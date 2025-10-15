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

    const handleBootstrap = ({ projectId: joinedId, history }) => {
      if (joinedId === projectId) setMessages(history);
    };
    const handleNewMessage = message => {
      if (message.projectId === projectId) setMessages(prev => [...prev, message]);
    };
    const handleAck = ({ clientMessageId, messageId }) => {
      setMessages(prev =>
        prev.map(msg => (msg.clientMessageId === clientMessageId ? { ...msg, id: messageId, pending: false } : msg))
      );
    };
    const handleBadge = ({ projectId: incoming, unread }) => {
      if (incoming === projectId) setBadge(unread);
    };

    socket.on('project:bootstrapped', handleBootstrap);
    socket.on('message:new', handleNewMessage);
    socket.on('message:ack', handleAck);
    socket.on('badge:sync', handleBadge);

    if (socket.connected) {
      socket.emit('project:join', { projectId });
    } else {
      socket.once('connect', () => {
        socket.emit('project:join', { projectId });
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
