import { randomUUID } from 'crypto';
import dayjs from 'dayjs';
import { projectStore } from './projectStore.js';
import { saveDataAsync, loadData, mapToObject, objectToMap } from '../lib/dataStore.js';

const MESSAGES_FILE = 'messages.json';

let messagesByProject = new Map();

// Load from disk
const loadedData = loadData(MESSAGES_FILE);
if (loadedData) {
  messagesByProject = objectToMap(loadedData);
  console.log(`[INFO] Loaded messages for ${messagesByProject.size} projects from disk`);
} else {
  console.log('[INFO] No message history found, starting fresh');
}

// Helper to persist data to disk
function persistMessages() {
  saveDataAsync(MESSAGES_FILE, mapToObject(messagesByProject));
}

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
    persistMessages(); // Save to disk
    return message;
  }
};
