import { randomUUID } from 'crypto';
import dayjs from 'dayjs';
import { projectStore } from './projectStore.js';

const messagesByProject = new Map();

function ensureProject(projectId) {
  if (!messagesByProject.has(projectId)) {
    messagesByProject.set(projectId, []);
  }
  return messagesByProject.get(projectId);
}

export const messageStore = {
  history(projectId, userId) {
    const project = projectStore.get(projectId);
    if (!project) return [];
    const isMember = project.members.some(member => member.userId === userId);
    if (!isMember) return [];
    return ensureProject(projectId);
  },
  create({ projectId, user, body, attachments = [], clientMessageId }) {
    const project = projectStore.get(projectId);
    if (!project) {
      throw new Error('Project not found');
    }
    const message = {
      id: randomUUID(),
      clientMessageId,
      projectId,
      body,
      attachments,
      author: {
        id: user.id,
        displayName: user.displayName,
        role: user.role
      },
      createdAt: dayjs().toISOString()
    };
    const bucket = ensureProject(projectId);
    bucket.push(message);
    return message;
  }
};
