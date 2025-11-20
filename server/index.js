import express from 'express';
import cors from 'cors';
import http from 'http';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { authMiddleware, issueToken } from './middleware/auth.js';
import { authRequired } from './middleware/authRequired.js';
import { getUser, listUsers, addUser, removeUser } from './lib/users.js';
import { registerUser, authenticateUser, getUserById, getAllUsers as getAllUsersFromDb } from './lib/auth.js';
import { emailService } from './lib/email.js';
import prisma, { query } from './lib/db.js';
import { projectStore } from './stores/projectStore.js';
import { stageStore, stageStatuses, taskStatuses } from './stores/stageStore.js';
import { checklistStore } from './stores/checklistStore.js';
import { invoiceStore } from './stores/invoiceStore.js';
import { inviteStore } from './stores/inviteStore.js';
import { messageStore } from './stores/messageStore.js';
import { notificationStore } from './stores/notificationStore.js';
import * as templateStore from './stores/templateStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const uploadDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

let io;

// Allow local dev and the deployed Netlify site by default. Use env vars to override.
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
const PROD_ORIGIN = process.env.PROD_ORIGIN || 'https://ec-exhibits.netlify.app';
const CLIENT_URL = process.env.CLIENT_URL || ALLOWED_ORIGIN;

// Allow the configured origin and local dev origins (localhost on any port).
function corsOriginHandler(origin, callback) {
  // No origin (curl/postman) -> allow
  if (!origin) return callback(null, true);
  if (origin === ALLOWED_ORIGIN) return callback(null, true);
  if (origin === PROD_ORIGIN) return callback(null, true);
  if (/^https?:\/\/localhost(?::\d+)?$/.test(origin)) return callback(null, true);
  return callback(new Error('Not allowed by CORS'), false);
}

function emitNotificationSummary(userId) {
  if (!io) return;
  const summary = notificationStore.summary(userId);
  io.to(`user:${userId}`).emit('notification:update', { summary });
}

function emitNotificationSummaries(userIds) {
  [...new Set(userIds)].forEach(emitNotificationSummary);
}

app.use(cors({ origin: corsOriginHandler, credentials: true }));

// Cookie parser middleware for reading/setting cookies
app.use(cookieParser());

// Debug middleware to log cookies on all requests
app.use((req, res, next) => {
  if (req.path.startsWith('/auth') || req.path.startsWith('/template')) {
    console.log(`[COOKIE DEBUG] ${req.method} ${req.path} - Cookies:`, Object.keys(req.cookies).length > 0 ? req.cookies : 'NONE');
  }
  next();
});

// Log effective origin configuration for debugging
console.log('[INFO] Allowed origin (dev):', ALLOWED_ORIGIN);
console.log('[INFO] Allowed origin (prod):', PROD_ORIGIN);
console.log('[INFO] Client URL:', CLIENT_URL);

// Use a small middleware that logs and parses the raw body for the /auth/token route
// This helps diagnose malformed JSON from clients. Other routes use the standard express.json().
const defaultJson = express.json();
app.use((req, res, next) => {
  if (req.method === 'POST' && req.url === '/auth/token') {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', chunk => (raw += chunk));
    req.on('end', () => {
      console.log('[DEBUG] /auth/token raw body:', raw);
      try {
        req.body = raw ? JSON.parse(raw) : {};
        next();
      } catch (err) {
        console.error('[DEBUG] JSON parse error for /auth/token:', err, 'raw:', raw);
        return res.status(400).json({ error: 'Invalid JSON' });
      }
    });
    req.on('error', err => {
      console.error('[DEBUG] req error on /auth/token:', err);
      return res.status(400).json({ error: 'Invalid request body' });
    });
  } else {
    return defaultJson(req, res, next);
  }
});

// Demo endpoint to get tokens for mock users
app.post('/auth/token', (req, res) => {
  const { userId } = req.body ?? {};
  const user = getUser(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const token = issueToken(user);
  return res.json({ token, user });
});

// User registration endpoint (no auth required)
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, displayName, role } = req.body;

    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'Email, password, and display name are required' });
    }

    const user = await registerUser({ email, password, displayName, role });
    const token = issueToken(user);

    console.log('[INFO] New user registered:', user.email);
    
    res.status(201).json({ 
      success: true,
      token, 
      user 
    });
  } catch (error) {
    console.error('[ERROR] Registration failed:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// User login endpoint (no auth required)
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // 2. Look up user by email in Neon and verify password with bcrypt
    const user = await authenticateUser(email, password);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 3. Sign JWT with userId and 7-day expiration
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error('[ERROR] JWT_SECRET not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '7d' } // 7 days expiration
    );

    // 4. Send JWT as HTTP-only cookie
    const cookieOptions = {
      httpOnly: true,        // Cannot be accessed by client-side JavaScript
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-site (Netlify -> Render)
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
    };
    
    res.cookie('token', token, cookieOptions);
    
    console.log('[INFO] User logged in:', user.email);
    console.log('[INFO] Cookie set with options:', cookieOptions);
    console.log('[INFO] Token length:', token.length);

    // 5. Return user data (without password_hash)
    res.json({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('[ERROR] Login failed:', error.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// User logout endpoint - clears the cookie
app.post('/auth/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  });
  
  res.json({ 
    success: true,
    message: 'Logged out successfully' 
  });
});

// GET /auth/me - Get current user from database
app.get('/auth/me', authRequired, async (req, res) => {
  try {
    // req.user is set by authRequired middleware: { id, email, role }
    // Query Neon for the user by req.user.id
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    // Handle case where user is not found (deleted after login)
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }
    
    // Return user data
    res.json({ 
      user: {
        id: user.id,
        email: user.email,
        name: user.displayName, // Return as 'name' per requirement
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('[ERROR] Failed to fetch user:', error.message);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// GET /projects - Get all projects for authenticated user
app.get('/projects', authRequired, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Query projects where user is a member
    const projectMembers = await prisma.projectMember.findMany({
      where: { userId },
      include: {
        project: {
          include: {
            stages: {
              orderBy: { position: 'asc' }
            },
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    displayName: true,
                    role: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    // Extract projects from project members
    const projects = projectMembers.map(pm => pm.project);
    
    res.json({ 
      success: true,
      projects 
    });
  } catch (error) {
    console.error('[ERROR] Failed to fetch projects:', error.message);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// POST /projects - Create a new project
app.post('/projects', authRequired, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, show, size, moveInDate, openingDay, description } = req.body;
    
    // Validate required fields
    if (!name || name.trim() === '') {
      return res.status(400).json({ 
        success: false,
        error: 'Project name is required' 
      });
    }
    
    console.log('[INFO] Creating project:', { name, show, size, userId });
    
    // Create project
    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        show: show?.trim() || null,
        size: size?.trim() || null,
        moveInDate: moveInDate ? new Date(moveInDate) : null,
        openingDay: openingDay ? new Date(openingDay) : null,
        description: description?.trim() || null
      }
    });
    
    console.log('[INFO] Project created:', project.id);
    
    // Add user as project owner
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId,
        role: 'owner'
      }
    });
    
    console.log('[INFO] User added as owner');
    
    // Create default stages
    const stages = [
      { templateSlug: 'planning', name: 'Planning', position: 0, status: 'in_progress' },
      { templateSlug: 'production', name: 'Production', position: 1, status: 'not_started' },
      { templateSlug: 'shipping', name: 'Shipping', position: 2, status: 'not_started' },
      { templateSlug: 'installation', name: 'Installation', position: 3, status: 'not_started' },
      { templateSlug: 'closeout', name: 'Closeout', position: 4, status: 'not_started' }
    ];
    
    for (const stage of stages) {
      await prisma.stage.create({
        data: { 
          projectId: project.id,
          ...stage
        }
      });
    }
    
    console.log('[INFO] Default stages created');
    
    // Return project with stages and members
    const fullProject = await prisma.project.findUnique({
      where: { id: project.id },
      include: { 
        stages: {
          orderBy: { position: 'asc' }
        },
        members: { 
          include: { 
            user: {
              select: {
                id: true,
                email: true,
                displayName: true,
                role: true
              }
            }
          } 
        }
      }
    });
    
    console.log('[SUCCESS] Project creation complete');
    
    res.json({ 
      success: true, 
      project: fullProject 
    });
  } catch (error) {
    console.error('[ERROR] Failed to create project:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create project' 
    });
  }
});

// Environment check endpoint (for debugging)
app.get('/env/check', (req, res) => {
  res.json({
    hasDatabase: !!process.env.DATABASE_URL,
    hasJWT: !!process.env.JWT_SECRET,
    nodeEnv: process.env.NODE_ENV,
    databaseUrlPrefix: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) + '...' : 'NOT SET'
  });
});

// Database connection test endpoint
app.get('/db/test', async (req, res) => {
  try {
    // Test 1: Raw SQL query
    const result = await query('SELECT 1 as test_value, NOW() as server_time');
    
    // Test 2: Count users with Prisma
    const userCount = await prisma.user.count();
    
    // Test 3: Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        createdAt: true
      }
    });
    
    res.json({ 
      success: true,
      message: 'Database connection successful!',
      tests: {
        rawQuery: result.rows[0],
        userCount,
        users
      }
    });
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// NOTE: We use authRequired middleware on individual routes that need authentication
// The old authMiddleware.http is NOT used anymore (it expects Authorization header, not cookies)

app.get('/users', authRequired, (req, res) => {
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

app.get('/template/stages', authRequired, (req, res) => {
  const template = stageStore.getTemplateDefinition();
  res.json({
    template: { stages: template },
    canEdit: req.user.role === 'owner'
  });
});

app.put('/template/stages', authRequired, (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Only owners can update the template' });
  }
  try {
    const { stages } = req.body ?? {};
    if (!Array.isArray(stages) || stages.length === 0) {
      throw new Error('A non-empty stages array is required');
    }
    const template = stageStore.replaceTemplateDefinition(stages);
    res.json({ template: { stages: template } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Template management endpoints
app.get('/templates', authRequired, (req, res) => {
  const templates = templateStore.listTemplates();
  res.json({ templates });
});

app.get('/templates/:id', authRequired, (req, res) => {
  const { id } = req.params;
  const template = templateStore.getTemplate(id);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }
  res.json({ template });
});

app.post('/templates', authRequired, (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Only owners can create templates' });
  }
  try {
    const { name, description, stages } = req.body;
    if (!name || !stages || !Array.isArray(stages) || stages.length === 0) {
      throw new Error('Name and stages are required');
    }
    const template = templateStore.createTemplate({ name, description, stages });
    res.json({ template });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/templates/:id', authRequired, (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Only owners can update templates' });
  }
  try {
    const { id } = req.params;
    const template = templateStore.updateTemplate(id, req.body);
    res.json({ template });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/templates/:id', authRequired, (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Only owners can delete templates' });
  }
  try {
    const { id } = req.params;
    templateStore.deleteTemplate(id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DISABLED: Duplicate POST /projects endpoint using in-memory store
// The database version at line 305 should be used instead
/*
app.post('/projects', (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Only owners can create projects' });
  }
  try {
    const { name, show, size, moveInDate, openingDay, description, clientIds = [], staffIds = [] } = req.body ?? {};
    const project = projectStore.create({
      name,
      show,
      size,
      moveInDate,
      openingDay,
      description,
      ownerId: req.user.id,
      clientIds,
      staffIds
    });

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
*/

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

app.get('/projects/:projectId/stages', authRequired, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Get project with stages from database
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        stages: {
          orderBy: { position: 'asc' },
          include: {
            tasks: {
              orderBy: { position: 'asc' }
            },
            uploadDefinitions: true,
            toggles: true
          }
        },
        members: {
          where: { userId: req.user.id }
        }
      }
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Check if user is a member
    if (project.members.length === 0) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Calculate progress
    const totalStages = project.stages.length;
    const completedStages = project.stages.filter(s => s.status === 'completed').length;
    const inProgressStages = project.stages.filter(s => s.status === 'in_progress').length;
    
    const progress = {
      total: totalStages,
      completed: completedStages,
      inProgress: inProgressStages,
      percentage: totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0
    };
    
    res.json({ 
      stages: project.stages, 
      statuses: stageStatuses, 
      taskStatuses, 
      progress 
    });
  } catch (error) {
    console.error('[ERROR] Failed to fetch stages:', error);
    res.status(500).json({ error: 'Failed to fetch stages' });
  }
});

app.post('/projects/:projectId/apply-template', authRequired, async (req, res) => {
  const { projectId } = req.params;
  const { templateId } = req.body ?? {};
  
  // Check if project exists in database
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        include: {
          user: true
        }
      }
    }
  });
  
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  // Check if user is a member with owner or staff role
  const member = project.members.find(m => m.userId === req.user.id);
  if (!member || (member.role !== 'owner' && member.role !== 'staff')) {
    return res.status(403).json({ error: 'Only owners or staff can apply templates' });
  }
  
  try {
    // Get the template from templateStore
    const template = templateStore.getTemplate(templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    console.log('[INFO] Template acknowledged:', template.name);
    console.log('[INFO] Template has', template.stages.length, 'stages');
    console.log('[INFO] Note: This project uses database storage. Template application is limited.');
    
    // Return success with a helpful message
    res.json({ 
      success: true,
      message: 'Template found. To add checklist items to your project, please use the Checklist tab to add them manually for each stage.',
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        stagesCount: template.stages.length
      }
    });
  } catch (error) {
    console.error('[ERROR] Apply template failed:', error);
    res.status(400).json({ error: error.message });
  }
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
    const progress = stageStore.projectProgress(projectId);
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
    res.json({ stage, progress });
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
    const updatedStage = stageStore.list(projectId).find(item => item.id === stageId);
    const progress = stageStore.projectProgress(projectId);
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
    res.status(201).json({ task, stage: updatedStage, progress });
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
    const wasCompleted = taskSnapshot?.state === 'completed';
    const task = stageStore.updateTaskStatus({ projectId, stageId, taskId, state });
    const updatedStage = stageStore.list(projectId).find(item => item.id === stageId);
    const progress = stageStore.projectProgress(projectId);
    const memberIds = project.members.map(member => member.userId);
    const changeType = state === 'completed' && !wasCompleted ? 'task_completed' : 'task_status';
    notificationStore.bumpProjectChange({
      projectId,
      projectName: project.name,
      actorId: req.user.id,
      actorName: req.user.displayName,
      memberIds,
      change: { type: changeType, stageName, taskTitle, status: state }
    });
    const recipients = memberIds.filter(id => id !== req.user.id);
    if (recipients.length > 0) {
      emitNotificationSummaries(recipients);
    }
    emitNotificationSummary(req.user.id);
    res.json({ task, stage: updatedStage, progress });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/projects/:projectId/checklist', (req, res) => {
  const { projectId } = req.params;
  const project = projectStore.get(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const members = project.members.map(member => member.userId);
  if (!members.includes(req.user.id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const checklist = checklistStore.list(projectId);
  res.json({ checklist });
});

app.patch('/projects/:projectId/stages/:stageId/toggles/:toggleId', authRequired, async (req, res) => {
  try {
    const { projectId, stageId, toggleId } = req.params;
    const { value } = req.body ?? {};
    
    if (typeof value !== 'boolean') {
      return res.status(400).json({ error: 'Value must be a boolean' });
    }
    
    // Check if project exists and user is a member
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId: req.user.id }
        }
      }
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (project.members.length === 0) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const member = project.members[0];
    if (member.role === 'client') {
      return res.status(403).json({ error: 'Only owners or staff can update the checklist' });
    }
    
    // Check if toggle exists
    const existingToggle = await prisma.toggle.findUnique({
      where: { id: toggleId }
    });
    
    if (!existingToggle || existingToggle.stageId !== stageId) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }
    
    // Update toggle
    const toggle = await prisma.toggle.update({
      where: { id: toggleId },
      data: { value }
    });
    
    console.log('[INFO] Toggle updated:', toggle.label, 'value:', toggle.value);
    
    res.json({ toggle });
  } catch (error) {
    console.error('[ERROR] Failed to update toggle:', error);
    res.status(500).json({ error: 'Failed to update checklist item' });
  }
});

app.post('/projects/:projectId/stages/:stageId/toggles', authRequired, async (req, res) => {
  try {
    const { projectId, stageId } = req.params;
    const { label, defaultValue = false } = req.body ?? {};
    
    if (!label || !label.trim()) {
      return res.status(400).json({ error: 'Label is required' });
    }
    
    // Check if project exists and user is a member
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId: req.user.id }
        }
      }
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (project.members.length === 0) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const member = project.members[0];
    if (member.role === 'client') {
      return res.status(403).json({ error: 'Only owners or staff can add checklist items' });
    }
    
    // Check if stage exists
    const stage = await prisma.stage.findUnique({
      where: { id: stageId }
    });
    
    if (!stage || stage.projectId !== projectId) {
      return res.status(404).json({ error: 'Stage not found' });
    }
    
    // Create toggle
    const toggle = await prisma.toggle.create({
      data: {
        stageId,
        label: label.trim(),
        value: defaultValue
      }
    });
    
    console.log('[INFO] Checklist item created:', toggle.label, 'for stage:', stage.name);
    
    res.status(201).json({ toggle });
  } catch (error) {
    console.error('[ERROR] Failed to create toggle:', error);
    res.status(500).json({ error: 'Failed to create checklist item' });
  }
});

app.delete('/projects/:projectId/stages/:stageId/toggles/:toggleId', authRequired, async (req, res) => {
  try {
    const { projectId, stageId, toggleId } = req.params;
    
    // Check if project exists and user is a member
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId: req.user.id }
        }
      }
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (project.members.length === 0) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const member = project.members[0];
    if (member.role === 'client') {
      return res.status(403).json({ error: 'Only owners or staff can remove checklist items' });
    }
    
    // Check if toggle exists
    const existingToggle = await prisma.toggle.findUnique({
      where: { id: toggleId }
    });
    
    if (!existingToggle || existingToggle.stageId !== stageId) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }
    
    // Delete toggle
    const toggle = await prisma.toggle.delete({
      where: { id: toggleId }
    });
    
    console.log('[INFO] Toggle deleted:', toggle.label);
    
    res.json({ toggle });
  } catch (error) {
    console.error('[ERROR] Failed to delete toggle:', error);
    res.status(500).json({ error: 'Failed to delete checklist item' });
  }
});

app.get('/projects/:projectId/invoices', authRequired, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Get project with invoices from database
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        invoices: {
          orderBy: { createdAt: 'desc' }
        },
        members: {
          where: { userId: req.user.id }
        }
      }
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Check if user is a member
    if (project.members.length === 0) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    res.json({ invoices: project.invoices });
  } catch (error) {
    console.error('[ERROR] Failed to fetch invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

app.patch('/projects/:projectId/invoices/:invoiceId', (req, res) => {
  const { projectId, invoiceId } = req.params;
  const { paymentConfirmed } = req.body ?? {};
  const project = projectStore.get(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const member = project.members.find(item => item.userId === req.user.id);
  if (!member || member.role === 'client') {
    return res.status(403).json({ error: 'Only owners or staff can update invoices' });
  }
  try {
    const invoice = invoiceStore.updateStatus({ projectId, invoiceId, paymentConfirmed });
    const memberIds = project.members.map(member => member.userId);
    notificationStore.bumpProjectChange({
      projectId,
      projectName: project.name,
      actorId: req.user.id,
      actorName: req.user.displayName,
      memberIds,
      change: {
        type: 'invoice_status',
        invoiceNumber: invoice.number,
        paymentConfirmed: invoice.paymentConfirmed
      }
    });
    const recipients = memberIds.filter(id => id !== req.user.id);
    if (recipients.length > 0) {
      emitNotificationSummaries(recipients);
    }
    emitNotificationSummary(req.user.id);
    res.json({ invoice });
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

app.get('/projects/:projectId/uploads', authRequired, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Get project with uploads from database
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        uploads: {
          orderBy: { createdAt: 'desc' },
          include: {
            uploader: {
              select: {
                id: true,
                email: true,
                displayName: true,
                role: true
              }
            }
          }
        },
        members: {
          where: { userId: req.user.id }
        }
      }
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Check if user is a member
    if (project.members.length === 0) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    res.json({ uploads: project.uploads });
  } catch (error) {
    console.error('[ERROR] Failed to fetch uploads:', error);
    res.status(500).json({ error: 'Failed to fetch uploads' });
  }
});

app.post('/projects/:projectId/uploads', upload.array('files'), (req, res) => {
  const { projectId } = req.params;
  const project = projectStore.get(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const members = project.members.map(member => member.userId);
  if (!members.includes(req.user.id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Only allow owner and staff to upload files
  if (req.user.role !== 'owner' && req.user.role !== 'staff') {
    return res.status(403).json({ error: 'Only administrators can upload files' });
  }

  const meta = JSON.parse(req.body.meta ?? '[]');
  const bucket = ensureUploadBucket(projectId);
  const isActiveRendering = req.body.isActiveRendering === 'true';
  const category = req.body.category || null;

  // If this is an active rendering upload, remove the old active rendering file
  if (isActiveRendering) {
    const oldActiveRendering = bucket.find(file => file.isActiveRendering);
    if (oldActiveRendering) {
      // Delete the physical file
      const filePath = path.join(__dirname, oldActiveRendering.storagePath);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.error('Failed to delete old active rendering file:', error);
      }
      // Remove from bucket
      const index = bucket.indexOf(oldActiveRendering);
      if (index > -1) {
        bucket.splice(index, 1);
      }
    }
  }

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
      isActiveRendering: isActiveRendering,
      category: category,
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

  if (req.user.role === 'client') {
    notificationStore.bumpProjectChange({
      projectId,
      projectName: project.name,
      actorId: req.user.id,
      actorName: req.user.displayName,
      memberIds: members,
      change: {
        type: 'client_upload',
        count: entries.length,
        fileNames: entries.map(entry => entry.fileName)
      }
    });
  }

  const recipients = members.filter(id => id !== req.user.id);
  if (recipients.length > 0) {
    emitNotificationSummaries(recipients);
  }
  emitNotificationSummary(req.user.id);

  res.json({ uploaded: entries });
});

app.get('/projects/:projectId/uploads/:uploadId', async (req, res) => {
  const { projectId, uploadId } = req.params;
  const project = projectStore.get(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const members = project.members.map(member => member.userId);
  if (!members.includes(req.user.id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const bucket = ensureUploadBucket(projectId);
  const record = bucket.find(item => item.id === uploadId);
  if (!record) {
    return res.status(404).json({ error: 'File not found' });
  }

  const absolutePath = path.resolve(uploadDir, record.storedName);
  const uploadsRoot = path.resolve(uploadDir);
  if (!absolutePath.startsWith(uploadsRoot)) {
    return res.status(400).json({ error: 'Invalid file path' });
  }

  try {
    await fs.promises.access(absolutePath, fs.constants.R_OK);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type, Content-Length');
    res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
    res.download(absolutePath, record.fileName, err => {
      if (err) {
        console.error('Download error', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Unable to download file' });
        } else {
          res.end();
        }
      }
    });
  } catch (error) {
    console.error('Download error', error);
    res.status(404).json({ error: 'File not found' });
  }
});

const httpServer = http.createServer(app);
io = new Server(httpServer, {
  cors: { origin: corsOriginHandler, credentials: true }
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
  
  // Start overdue task checker (runs every hour)
  startOverdueTaskChecker();
});

// Track which tasks we've already notified about to avoid spam
const notifiedOverdueTasks = new Set();

function checkOverdueTasks() {
  const allProjects = projectStore.listForUser('user-owner'); // Get all projects
  const now = Date.now();
  
  allProjects.forEach(project => {
    const stages = stageStore.list(project.id);
    const memberIds = project.members.map(m => m.userId);
    
    stages.forEach(stage => {
      stage.tasks?.forEach(task => {
        // Check if task is overdue and not completed
        if (task.dueDate && task.state !== 'completed') {
          const dueDate = new Date(task.dueDate);
          if (!isNaN(dueDate.getTime()) && dueDate.getTime() < now) {
            const taskKey = `${project.id}-${stage.id}-${task.id}`;
            
            // Only notify once per task (until it's completed or due date changes)
            if (!notifiedOverdueTasks.has(taskKey)) {
              notifiedOverdueTasks.add(taskKey);
              
              // Send notification to all project members
              notificationStore.bumpProjectChange({
                projectId: project.id,
                projectName: project.name,
                memberIds,
                change: {
                  type: 'task_overdue',
                  taskTitle: task.title,
                  stageName: stage.name,
                  dueDate: task.dueDate
                }
              });
              
              // Emit real-time notifications
              if (io) {
                emitNotificationSummaries(memberIds);
                io.to(project.id).emit('project:update', {
                  projectId: project.id,
                  stages: stageStore.list(project.id),
                  progress: stageStore.projectProgress(project.id)
                });
              }
              
              console.log(`[OVERDUE] Task "${task.title}" in project "${project.name}" is overdue (due: ${dueDate.toLocaleDateString()})`);
            }
          }
        }
      });
    });
  });
  
  // Clean up notifications for tasks that are no longer overdue or have been completed
  const currentOverdueTasks = new Set();
  allProjects.forEach(project => {
    const stages = stageStore.list(project.id);
    stages.forEach(stage => {
      stage.tasks?.forEach(task => {
        if (task.isOverdue && task.state !== 'completed') {
          currentOverdueTasks.add(`${project.id}-${stage.id}-${task.id}`);
        }
      });
    });
  });
  
  // Remove tasks that are no longer overdue from the notified set
  notifiedOverdueTasks.forEach(taskKey => {
    if (!currentOverdueTasks.has(taskKey)) {
      notifiedOverdueTasks.delete(taskKey);
    }
  });
}

function startOverdueTaskChecker() {
  // Check immediately on startup
  setTimeout(() => {
    console.log('[INFO] Running initial overdue task check...');
    checkOverdueTasks();
  }, 5000); // Wait 5 seconds after startup
  
  // Then check every hour
  setInterval(() => {
    console.log('[INFO] Running scheduled overdue task check...');
    checkOverdueTasks();
  }, 60 * 60 * 1000); // 1 hour
  
  console.log('[INFO] Overdue task checker started (runs every hour)');
}
