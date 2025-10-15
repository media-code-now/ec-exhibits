import express from 'express';
import cors from 'cors';
import http from 'http';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { authMiddleware, issueToken } from './middleware/auth.js';
import { getUser, listUsers, addUser, removeUser } from './lib/users.js';
import { emailService } from './lib/email.js';
import { projectStore } from './stores/projectStore.js';
import { stageStore, stageStatuses, taskStatuses } from './stores/stageStore.js';
import { inviteStore } from './stores/inviteStore.js';
import { messageStore } from './stores/messageStore.js';
import { notificationStore } from './stores/notificationStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const uploadDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

let io;

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

function emitNotificationSummary(userId) {
  if (!io) return;
  const summary = notificationStore.summary(userId);
  io.to(`user:${userId}`).emit('notification:update', { summary });
}

function emitNotificationSummaries(userIds) {
  [...new Set(userIds)].forEach(emitNotificationSummary);
}

app.use(cors({ origin: ALLOWED_ORIGIN, credentials: true }));
app.use(express.json());

// Demo endpoint to get tokens for mock users
app.post('/auth/token', (req, res) => {
  const { userId } = req.body ?? {};
  const user = getUser(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const token = issueToken(user);
  return res.json({ token, user });
});

// Protect everything below
app.use(authMiddleware.http);

app.get('/users', (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json({ users: listUsers() });
});

app.post('/users', (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const { displayName, role, email } = req.body ?? {};
    const user = addUser({ displayName, role, email });
    const ownerRecipients = listUsers()
      .filter(candidate => candidate.role === 'owner' && candidate.id !== req.user.id)
      .map(candidate => candidate.id);
    if (ownerRecipients.length > 0) {
      notificationStore.bumpUserChange({
        recipients: ownerRecipients,
        actorId: req.user.id,
        actorName: req.user.displayName,
        targetName: user.displayName,
        role: role ?? user.role,
        action: 'user_added'
      });
      emitNotificationSummaries(ownerRecipients);
    }
    res.status(201).json({ user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/users/:userId', (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { userId } = req.params;
  const record = getUser(userId);
  if (!record) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (record.role === 'owner') {
    return res.status(400).json({ error: 'Owners cannot be deleted' });
  }
  try {
    const affectedProjects = projectStore.removeUserFromAllProjects(userId);
    const removed = removeUser(userId);

    const summaryTargets = new Set();

    affectedProjects.forEach(({ projectName, memberIds, role }) => {
      const recipients = memberIds.filter(id => id !== req.user.id);
      if (recipients.length === 0) return;
      notificationStore.bumpUserChange({
        recipients,
        actorId: req.user.id,
        actorName: req.user.displayName,
        projectName,
        targetName: removed.displayName,
        role,
        action: 'user_removed'
      });
      recipients.forEach(id => summaryTargets.add(id));
    });

    const ownerRecipients = listUsers()
      .filter(candidate => candidate.role === 'owner' && candidate.id !== req.user.id)
      .map(candidate => candidate.id);
    if (ownerRecipients.length > 0) {
      notificationStore.bumpUserChange({
        recipients: ownerRecipients,
        actorId: req.user.id,
        actorName: req.user.displayName,
        targetName: removed.displayName,
        role: removed.role,
        action: 'user_deleted'
      });
      ownerRecipients.forEach(id => summaryTargets.add(id));
    }

    emitNotificationSummary(req.user.id);
    if (summaryTargets.size > 0) {
      emitNotificationSummaries([...summaryTargets]);
    }

    res.json({
      removedUser: { id: removed.id, displayName: removed.displayName, role: removed.role },
      projects: affectedProjects.map(item => item.project)
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/me', (req, res) => {
  res.json({ user: req.user, projects: projectStore.listForUser(req.user.id) });
});

app.post('/projects', (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Only owners can create projects' });
  }
  try {
    const { name, description, clientIds = [], staffIds = [] } = req.body ?? {};
    const project = projectStore.create({
      name,
      description,
      ownerId: req.user.id,
      clientIds,
      staffIds
    });
    // Seed with initial planning stage
    if (stageStore.list(project.id).length === 0) {
      stageStore.create({ projectId: project.id, name: 'Planning', dueDate: null });
    }

    const inviteTargets = [...new Set([...clientIds, ...staffIds])];
    const inviteMeta = inviteTargets.map(targetId => {
      const recipient = getUser(targetId);
      const roleForInvite = recipient?.role ?? 'client';
      const invite = inviteStore.create({
        projectId: project.id,
        invitedUserId: targetId,
        invitedById: req.user.id,
        role: roleForInvite
      });
        if (recipient?.email) {
          const inviteLink = `${CLIENT_URL.replace(/\/$/, '')}/invite/${invite.id}`;
        emailService.sendInvite({
          to: recipient.email,
          projectName: project.name,
          inviteLink,
          role: recipient.role
        });
      }
      return {
        userId: targetId,
        role: roleForInvite,
        displayName: recipient?.displayName ?? 'New member'
      };
    });

    if (inviteMeta.length > 0) {
      const summaryTargets = new Set();

      inviteMeta.forEach(({ userId, role: roleForInvite }) => {
        notificationStore.bumpUserChange({
          recipients: [userId],
          actorId: req.user.id,
          actorName: req.user.displayName,
          projectName: project.name,
          role: roleForInvite,
          action: 'project_invite'
        });
        summaryTargets.add(userId);
      });

      const memberIds = project.members.map(member => member.userId);
      inviteMeta.forEach(({ userId, role: roleForInvite, displayName }) => {
        const others = memberIds.filter(candidate => candidate !== userId);
        if (others.length === 0) return;
        notificationStore.bumpUserChange({
          recipients: others,
          actorId: req.user.id,
          actorName: req.user.displayName,
          projectName: project.name,
          targetName: displayName,
          role: roleForInvite,
          action: 'user_joined'
        });
        others.forEach(id => summaryTargets.add(id));
      });

      if (summaryTargets.size > 0) {
        emitNotificationSummaries([...summaryTargets]);
      }
    }

    res.status(201).json({ project });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/projects/:projectId/invite', (req, res) => {
  const { projectId } = req.params;
  const { userId, role } = req.body ?? {};
  const project = projectStore.get(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const isOwner = project.members.some(member => member.userId === req.user.id && member.role === 'owner');
  if (!isOwner) {
    return res.status(403).json({ error: 'Only project owners can invite members' });
  }
  const alreadyMember = project.members.some(member => member.userId === userId);
  if (alreadyMember) {
    return res.status(409).json({ error: 'User already belongs to this project' });
  }
  try {
    const updated = projectStore.addMember({ projectId, userId, role });
    const invite = inviteStore.create({
      projectId,
      invitedUserId: userId,
      invitedById: req.user.id,
      role
    });
    const recipient = getUser(userId);
    if (recipient?.email) {
      const inviteLink = `${CLIENT_URL.replace(/\/$/, '')}/invite/${invite.id}`;
      emailService.sendInvite({
        to: recipient.email,
        projectName: updated.name,
        inviteLink,
        role
      });
    }
    notificationStore.bumpUserChange({
      recipients: [userId],
      actorId: req.user.id,
      actorName: req.user.displayName,
      projectName: updated.name,
      role,
      action: 'project_invite'
    });

    const otherMembers = updated.members.map(member => member.userId).filter(candidate => candidate !== userId);
    const summaryTargets = new Set([userId]);
    if (otherMembers.length > 0) {
      notificationStore.bumpUserChange({
        recipients: otherMembers,
        actorId: req.user.id,
        actorName: req.user.displayName,
        projectName: updated.name,
        targetName: recipient?.displayName ?? 'New member',
        role,
        action: 'user_joined'
      });
      otherMembers.forEach(id => summaryTargets.add(id));
    }

    emitNotificationSummaries([...summaryTargets]);
    res.json({ project: updated, invite });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/projects/:projectId/members/:memberId', (req, res) => {
  const { projectId, memberId } = req.params;
  const project = projectStore.get(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const actorMembership = project.members.find(item => item.userId === req.user.id);
  if (!actorMembership || actorMembership.role !== 'owner') {
    return res.status(403).json({ error: 'Only project owners can remove members' });
  }
  const target = project.members.find(item => item.userId === memberId);
  if (!target) {
    return res.status(404).json({ error: 'User not assigned to this project' });
  }
  if (target.role === 'owner') {
    return res.status(400).json({ error: 'Cannot remove a project owner' });
  }
  const targetUser = getUser(memberId);
  try {
    const updated = projectStore.removeMember({ projectId, userId: memberId });
    const remainingIds = updated.members.map(member => member.userId);
    const remainingRecipients = remainingIds.filter(id => id !== req.user.id);
    const summaryTargets = new Set([...remainingRecipients, memberId]);

    if (remainingRecipients.length > 0) {
      notificationStore.bumpUserChange({
        recipients: remainingRecipients,
        actorId: req.user.id,
        actorName: req.user.displayName,
        projectName: project.name,
        targetName: targetUser?.displayName ?? 'A member',
        role: target.role,
        action: 'user_removed'
      });
    }

    notificationStore.bumpUserChange({
      recipients: [memberId],
      actorId: req.user.id,
      actorName: req.user.displayName,
      projectName: project.name,
      targetName: targetUser?.displayName ?? 'You',
      role: target.role,
      action: 'removed_from_project'
    });

    emitNotificationSummary(req.user.id);
    emitNotificationSummaries([...summaryTargets]);
    res.json({ project: updated });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/projects/:projectId/stages', (req, res) => {
  const { projectId } = req.params;
  const project = projectStore.get(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const members = project.members.map(member => member.userId);
  if (!members.includes(req.user.id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const stages = stageStore.list(projectId);
  res.json({ stages, statuses: stageStatuses, taskStatuses });
});

app.patch('/projects/:projectId/stages/:stageId', (req, res) => {
  const { projectId, stageId } = req.params;
  const { status } = req.body ?? {};
  const project = projectStore.get(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const member = project.members.find(item => item.userId === req.user.id);
  if (!member || member.role === 'client') {
    return res.status(403).json({ error: 'Only owners or staff can change stage status' });
  }
  try {
    const stage = stageStore.updateStatus({ projectId, stageId, status });
    const memberIds = project.members.map(member => member.userId);
    notificationStore.bumpProjectChange({
      projectId,
      projectName: project.name,
      actorId: req.user.id,
      actorName: req.user.displayName,
      memberIds,
      change: { type: 'stage_status', stageName: stage.name, status }
    });
    const recipients = memberIds.filter(id => id !== req.user.id);
    if (recipients.length > 0) {
      emitNotificationSummaries(recipients);
    }
    emitNotificationSummary(req.user.id);
    res.json({ stage });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/projects/:projectId/stages/:stageId/tasks', (req, res) => {
  const { projectId, stageId } = req.params;
  const { title, dueDate, assignee } = req.body ?? {};
  const project = projectStore.get(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const member = project.members.find(item => item.userId === req.user.id);
  if (!member || member.role === 'client') {
    return res.status(403).json({ error: 'Only owners or staff can manage tasks' });
  }
  try {
    const stageSnapshot = stageStore.list(projectId).find(item => item.id === stageId);
    const stageName = stageSnapshot?.name ?? 'Stage';
    const task = stageStore.addTask({ projectId, stageId, title, dueDate, assignee });
    const memberIds = project.members.map(member => member.userId);
    notificationStore.bumpProjectChange({
      projectId,
      projectName: project.name,
      actorId: req.user.id,
      actorName: req.user.displayName,
      memberIds,
      change: { type: 'task_created', stageName, taskTitle: task.title }
    });
    const recipients = memberIds.filter(id => id !== req.user.id);
    if (recipients.length > 0) {
      emitNotificationSummaries(recipients);
    }
    emitNotificationSummary(req.user.id);
    res.status(201).json({ task });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/projects/:projectId/stages/:stageId/tasks/:taskId', (req, res) => {
  const { projectId, stageId, taskId } = req.params;
  const { state } = req.body ?? {};
  const project = projectStore.get(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const member = project.members.find(item => item.userId === req.user.id);
  if (!member || member.role === 'client') {
    return res.status(403).json({ error: 'Only owners or staff can manage tasks' });
  }
  try {
    const stageSnapshot = stageStore.list(projectId).find(item => item.id === stageId);
    const taskSnapshot = stageSnapshot?.tasks?.find(item => item.id === taskId);
    const stageName = stageSnapshot?.name ?? 'Stage';
    const taskTitle = taskSnapshot?.title ?? 'Task';
    const task = stageStore.updateTaskStatus({ projectId, stageId, taskId, state });
    const memberIds = project.members.map(member => member.userId);
    notificationStore.bumpProjectChange({
      projectId,
      projectName: project.name,
      actorId: req.user.id,
      actorName: req.user.displayName,
      memberIds,
      change: { type: 'task_status', stageName, taskTitle, status: state }
    });
    const recipients = memberIds.filter(id => id !== req.user.id);
    if (recipients.length > 0) {
      emitNotificationSummaries(recipients);
    }
    emitNotificationSummary(req.user.id);
    res.json({ task });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/projects/:projectId/messages', (req, res) => {
  const { projectId } = req.params;
  const history = messageStore.history(projectId, req.user.id);
  res.json({ messages: history });
});

app.get('/notifications', (req, res) => {
  const summary = notificationStore.summary(req.user.id);
  res.json(summary);
});

app.post('/notifications/read', (req, res) => {
  const { category, projectId } = req.body ?? {};
  if (!category) {
    return res.status(400).json({ error: 'category is required' });
  }

  if (category === 'messages') {
    if (projectId) {
      notificationStore.markMessageRead({ userId: req.user.id, projectId });
    } else {
      notificationStore.markAllMessagesRead(req.user.id);
    }
  } else if (['uploads', 'projects', 'users'].includes(category)) {
    notificationStore.markCategoryRead({ userId: req.user.id, category });
  } else {
    return res.status(400).json({ error: 'Unsupported category' });
  }

  emitNotificationSummary(req.user.id);
  res.sendStatus(204);
});

app.post('/projects/:projectId/messages/read', (req, res) => {
  const { projectId } = req.params;
  notificationStore.markMessageRead({ userId: req.user.id, projectId });
  emitNotificationSummary(req.user.id);
  res.sendStatus(204);
});

const uploadsByProject = new Map();
function ensureUploadBucket(projectId) {
  if (!uploadsByProject.has(projectId)) {
    uploadsByProject.set(projectId, []);
  }
  return uploadsByProject.get(projectId);
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

app.get('/projects/:projectId/uploads', (req, res) => {
  const { projectId } = req.params;
  const project = projectStore.get(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const members = project.members.map(member => member.userId);
  if (!members.includes(req.user.id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const uploads = ensureUploadBucket(projectId);
  res.json({ uploads });
});

app.post('/projects/:projectId/uploads', upload.array('files'), (req, res) => {
  const { projectId } = req.params;
  const project = projectStore.get(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const members = project.members.map(member => member.userId);
  if (!members.includes(req.user.id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const meta = JSON.parse(req.body.meta ?? '[]');
  const bucket = ensureUploadBucket(projectId);
  const entries = req.files.map((file, index) => {
    const record = {
      id: file.filename,
      projectId,
      uploadedBy: req.user,
      fileName: file.originalname,
      storedName: file.filename,
      storagePath: path.relative(__dirname, path.join(uploadDir, file.filename)),
      size: file.size,
      contentType: file.mimetype,
      label: meta[index]?.label ?? '',
      remarks: meta[index]?.remarks ?? '',
      requiresReview: Boolean(meta[index]?.requiresReview),
      uploadedAt: new Date().toISOString()
    };
    bucket.push(record);
    return record;
  });

  notificationStore.bumpUploads({
    projectId,
    projectName: project.name,
    actorId: req.user.id,
    actorName: req.user.displayName,
    memberIds: members,
    count: entries.length,
    fileNames: entries.map(entry => entry.fileName)
  });

  const recipients = members.filter(id => id !== req.user.id);
  if (recipients.length > 0) {
    emitNotificationSummaries(recipients);
  }
  emitNotificationSummary(req.user.id);

  res.json({ uploaded: entries });
});

const httpServer = http.createServer(app);
io = new Server(httpServer, {
  cors: { origin: ALLOWED_ORIGIN, credentials: true }
});
io.use(authMiddleware.socket);

io.on('connection', socket => {
  const user = socket.data.user;
  socket.join(`user:${user.id}`);
  emitNotificationSummary(user.id);

  socket.on('project:join', ({ projectId }) => {
    const project = projectStore.get(projectId);
    if (!project) return;
    const members = project.members.map(member => member.userId);
    if (!members.includes(user.id)) return;
    socket.join(projectId);

    const history = messageStore.history(projectId, user.id);
    socket.emit('project:bootstrapped', { projectId, history });
    const unread = notificationStore.unreadForProject({ userId: user.id, projectId });
    socket.emit('badge:sync', { projectId, unread });
  });

  socket.on('message:send', payload => {
    const { projectId, body, attachments = [], clientMessageId } = payload;
    const project = projectStore.get(projectId);
    if (!project) return;
    const members = project.members.map(member => member.userId);
    if (!members.includes(user.id)) return;

    const message = messageStore.create({ projectId, user, body, attachments, clientMessageId });
    io.to(projectId).emit('message:new', message);

    const updates = notificationStore.bumpMessageUnread({
      projectId,
      projectName: project.name,
      authorId: user.id,
      authorName: user.displayName,
      messagePreview: body,
      memberIds: members
    });

    updates.forEach(update => {
      io.to(`user:${update.userId}`).emit('badge:sync', {
        projectId: update.projectId,
        unread: update.unread
      });
    });
    emitNotificationSummaries(updates.map(update => update.userId));
    emitNotificationSummary(user.id);

    socket.emit('message:ack', {
      clientMessageId,
      messageId: message.id
    });
  });

  socket.on('message:read', ({ projectId }) => {
    notificationStore.markMessageRead({ userId: user.id, projectId });
    const unread = notificationStore.unreadForProject({ userId: user.id, projectId });
    socket.emit('badge:sync', { projectId, unread });
    emitNotificationSummary(user.id);
  });
});

const PORT = process.env.PORT ?? 4000;
httpServer.listen(PORT, () => {
  console.log(`Real-time server listening on http://localhost:${PORT}`);
  console.log('Demo users:', listUsers().map(u => `${u.displayName} (${u.id})`).join(', '));
});
