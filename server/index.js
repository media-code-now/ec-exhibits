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
import { registerUser, authenticateUser, getUserById, getAllUsers as getAllUsersFromDb, updateUser, deleteUser as deleteUserFromDb } from './lib/auth.js';
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
const invoicesDir = path.join(uploadDir, 'invoices');

// Create upload directories if they don't exist
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(invoicesDir, { recursive: true });

console.log('[STARTUP] Upload directory:', uploadDir);
console.log('[STARTUP] Invoices directory:', invoicesDir);

let io;

// Allow local dev and the deployed Netlify site by default. Use env vars to override.
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
const PROD_ORIGIN = process.env.PROD_ORIGIN || 'https://ec-exhibits.netlify.app';
const CLIENT_URL = process.env.CLIENT_URL || ALLOWED_ORIGIN;

// Allow the configured origin and local dev origins (localhost on any port).
function corsOriginHandler(origin, callback) {
  console.log('[CORS] Request from origin:', origin);
  
  // No origin (curl/postman) -> allow
  if (!origin) return callback(null, true);
  if (origin === ALLOWED_ORIGIN) return callback(null, true);
  if (origin === PROD_ORIGIN) return callback(null, true);
  
  // Allow localhost on any port
  if (/^https?:\/\/localhost(?::\d+)?$/.test(origin)) return callback(null, true);
  
  // Allow local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x) for mobile testing
  if (/^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(?::\d+)?$/.test(origin)) {
    console.log('[CORS] Allowing local network origin:', origin);
    return callback(null, true);
  }
  
  console.log('[CORS] BLOCKED origin:', origin);
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

    console.log('[LOGIN] Attempt from email:', email);

    // 1. Validate required fields
    if (!email || !password) {
      console.log('[LOGIN] Missing email or password');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // 2. Look up user by email in Neon and verify password with bcrypt
    const user = await authenticateUser(email, password);

    if (!user) {
      console.log('[LOGIN] Authentication failed for:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('[LOGIN] Authentication successful for:', user.email, 'Role:', user.role);

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
        role: user.role,
        displayName: user.displayName
      },
      JWT_SECRET,
      { expiresIn: '7d' } // 7 days expiration
    );

    // 4. Send JWT as HTTP-only cookie
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,        // Cannot be accessed by client-side JavaScript
      secure: isProduction,  // HTTPS only in production
      sameSite: isProduction ? 'none' : 'lax', // 'none' for cross-site in production
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      path: '/'  // Cookie available for all paths
    };
    
    res.cookie('token', token, cookieOptions);
    
    console.log('[INFO] User logged in:', user.email);
    console.log('[INFO] User ID:', user.id);
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
      },
      // Always include token in response for client-side storage
      // Cookies don't work reliably cross-domain (Netlify -> Render)
      token: token
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
    console.log('[GET PROJECTS] Request from user:', req.user.email, 'ID:', userId);
    
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
    
    console.log('[GET PROJECTS] Found', projectMembers.length, 'project memberships');
    
    // Extract projects from project members
    const projects = projectMembers.map(pm => pm.project);
    
    console.log('[GET PROJECTS] Returning', projects.length, 'projects');
    if (projects.length > 0) {
      console.log('[GET PROJECTS] Project names:', projects.map(p => p.name).join(', '));
    }
    
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
    console.log('[PROJECT CREATE] Request received from user:', req.user?.email);
    console.log('[PROJECT CREATE] User ID:', req.user?.id);
    console.log('[PROJECT CREATE] Request body:', req.body);
    
    const userId = req.user.id;
    const { name, show, size, moveInDate, openingDay, description } = req.body;
    
    // Validate required fields
    if (!name || name.trim() === '') {
      console.log('[PROJECT CREATE] Validation failed: name is required');
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
    
    console.log('[INFO] User added as owner with userId:', userId);
    
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

// PUT /projects/:projectId - Update project details
app.put('/projects/:projectId', authRequired, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    const { name, show, size, moveInDate, openingDay, description } = req.body;

    console.log('[PROJECT UPDATE] Request to update project:', projectId, 'by user:', req.user.email);

    // Verify the project exists and user is a member
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: true
      }
    });

    if (!project) {
      return res.status(404).json({ 
        success: false,
        error: 'Project not found' 
      });
    }

    // Check if user is owner or project manager
    const membership = project.members.find(m => m.userId === userId);
    const canEdit = membership && ['owner', 'project_manager'].includes(req.user.role);
    
    if (!canEdit) {
      return res.status(403).json({ 
        success: false,
        error: 'Only owners and project managers can edit project details' 
      });
    }

    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (show !== undefined) updateData.show = show || null;
    if (size !== undefined) updateData.size = size || null;
    if (description !== undefined) updateData.description = description || null;
    
    // Handle dates
    if (moveInDate !== undefined) {
      updateData.moveInDate = moveInDate ? new Date(moveInDate) : null;
    }
    if (openingDay !== undefined) {
      updateData.openingDay = openingDay ? new Date(openingDay) : null;
    }

    console.log('[INFO] Updating project with data:', updateData);

    // Update the project
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
      include: {
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

    console.log('[SUCCESS] Project updated successfully');

    res.json({ 
      success: true, 
      project: updatedProject 
    });
  } catch (error) {
    console.error('[ERROR] Failed to update project:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update project' 
    });
  }
});

// DELETE /projects/:projectId - Delete a project and all related data
app.delete('/projects/:projectId', authRequired, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    
    console.log('[PROJECT DELETE] Request to delete project:', projectId, 'by user:', req.user.email);
    
    // Verify the project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: true
      }
    });
    
    if (!project) {
      return res.status(404).json({ 
        success: false,
        error: 'Project not found' 
      });
    }
    
    // Verify the user is the project owner
    const membership = project.members.find(m => m.userId === userId);
    if (!membership || membership.role !== 'owner') {
      return res.status(403).json({ 
        success: false,
        error: 'Only project owners can delete projects' 
      });
    }
    
    console.log('[INFO] Deleting project and all related data...');
    
    // Delete all related data in correct order (respecting foreign key constraints)
    // 1. Delete message reads
    await prisma.messageRead.deleteMany({
      where: { 
        message: { 
          projectId 
        } 
      }
    });
    console.log('[INFO] Deleted message reads');
    
    // 2. Delete messages
    await prisma.message.deleteMany({
      where: { projectId }
    });
    console.log('[INFO] Deleted messages');
    
    // 3. Delete notifications
    await prisma.notification.deleteMany({
      where: { projectId }
    });
    console.log('[INFO] Deleted notifications');
    
    // 4. Delete tasks
    await prisma.task.deleteMany({
      where: { 
        stage: { 
          projectId 
        } 
      }
    });
    console.log('[INFO] Deleted tasks');
    
    // 5. Delete toggles/checklist items
    await prisma.toggle.deleteMany({
      where: { 
        stage: { 
          projectId 
        } 
      }
    });
    console.log('[INFO] Deleted checklist items');
    
    // 6. Delete stages
    await prisma.stage.deleteMany({
      where: { projectId }
    });
    console.log('[INFO] Deleted stages');
    
    // 7. Delete uploads
    await prisma.upload.deleteMany({
      where: { projectId }
    });
    console.log('[INFO] Deleted uploads');
    
    // 8. Delete invoices
    await prisma.invoice.deleteMany({
      where: { projectId }
    });
    console.log('[INFO] Deleted invoices');
    
    // 9. Delete invites
    await prisma.invite.deleteMany({
      where: { projectId }
    });
    console.log('[INFO] Deleted invites');
    
    // 10. Delete project members
    await prisma.projectMember.deleteMany({
      where: { projectId }
    });
    console.log('[INFO] Deleted project members');
    
    // 11. Finally, delete the project itself
    await prisma.project.delete({
      where: { id: projectId }
    });
    
    console.log('[SUCCESS] Project deleted:', projectId);
    
    res.json({ 
      success: true,
      message: 'Project and all related data deleted successfully' 
    });
  } catch (error) {
    console.error('[ERROR] Failed to delete project:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete project' 
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

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// Separate storage configuration for invoices
const invoiceStorage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, path.join(uploadDir, 'invoices')),
  filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const invoiceUpload = multer({ storage: invoiceStorage });

app.get('/users', authRequired, async (req, res) => {
  try {
    if (!['owner', 'project_manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only owners and project managers can view users' });
    }

    // Get all users from database
    const users = await getAllUsersFromDb();
    
    res.json({ users });
  } catch (error) {
    console.error('[ERROR] Failed to fetch users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/users', authRequired, async (req, res) => {
  try {
    // Only owners and project managers can create users
    if (!['owner', 'project_manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only owners and project managers can create users' });
    }

    const { displayName, role, email } = req.body ?? {};

    // Validate input
    if (!displayName || !email) {
      return res.status(400).json({ error: 'Display name and email are required' });
    }

    if (!['owner', 'project_manager', 'staff', 'client'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user already exists in database
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create user in database (without password - will be set separately)
    // Use a random placeholder hash that will be replaced when password is generated
    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        displayName: displayName.trim(),
        role,
        passwordHash: 'PENDING_PASSWORD_SETUP' // Placeholder - will be replaced by set-password endpoint
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    console.log('[INFO] User created:', user.email, 'Role:', user.role);

    // Notify other owners
    const ownerRecipients = await prisma.user.findMany({
      where: {
        role: 'owner',
        id: { not: req.user.id }
      },
      select: { id: true }
    });

    if (ownerRecipients.length > 0) {
      const recipientIds = ownerRecipients.map(u => u.id);
      notificationStore.bumpUserChange({
        recipients: recipientIds,
        actorId: req.user.id,
        actorName: req.user.displayName,
        targetName: user.displayName,
        role: user.role,
        action: 'user_added'
      });
      emitNotificationSummaries(recipientIds);
    }

    res.status(201).json({ user });
  } catch (error) {
    console.error('[ERROR] Failed to create user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Set password for a user
app.post('/users/:userId/set-password', authRequired, async (req, res) => {
  try {
    // Only owners can set passwords
    if (req.user.role !== 'owner') {
      return res.status(403).json({ error: 'Only owners can set passwords' });
    }

    const { userId } = req.params;
    const { password } = req.body;

    console.log('[SET-PASSWORD] Request for userId:', userId);
    console.log('[SET-PASSWORD] Password length:', password?.length);

    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if user exists in database
    const existingUser = await getUserById(userId);
    if (!existingUser) {
      console.log('[SET-PASSWORD] User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('[SET-PASSWORD] Setting password for:', existingUser.email);

    // Update user with new password
    const updatedUser = await updateUser(userId, { password });

    console.log('[SET-PASSWORD] Password successfully set for user:', existingUser.email);
    console.log('[SET-PASSWORD] Updated user:', updatedUser);

    res.json({ 
      success: true,
      message: 'Password set successfully'
    });
  } catch (error) {
    console.error('[SET-PASSWORD ERROR]:', error);
    res.status(500).json({ error: 'Failed to set password' });
  }
});

app.delete('/users/:userId', authRequired, async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ error: 'Only owners can delete users' });
    }

    const { userId } = req.params;

    // Get user from database
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'owner') {
      return res.status(400).json({ error: 'Owners cannot be deleted' });
    }

    // Remove user from all projects
    await prisma.projectMember.deleteMany({
      where: { userId }
    });

    // Delete user from database
    const deleted = await deleteUserFromDb(userId);

    console.log('[INFO] User deleted:', deleted.email);

    // Notify other owners
    const ownerRecipients = await prisma.user.findMany({
      where: {
        role: 'owner',
        id: { not: req.user.id }
      },
      select: { id: true }
    });

    if (ownerRecipients.length > 0) {
      const recipientIds = ownerRecipients.map(u => u.id);
      notificationStore.bumpUserChange({
        recipients: recipientIds,
        actorId: req.user.id,
        actorName: req.user.displayName,
        targetName: deleted.displayName,
        role: deleted.role,
        action: 'user_deleted'
      });
      emitNotificationSummaries(recipientIds);
    }

    res.json({
      success: true,
      removedUser: { 
        id: deleted.id, 
        displayName: deleted.displayName, 
        role: deleted.role 
      }
    });
  } catch (error) {
    console.error('[ERROR] Failed to delete user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
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

app.post('/projects/:projectId/invite', authRequired, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, role } = req.body ?? {};

    if (!userId || !role) {
      return res.status(400).json({ error: 'User ID and role are required' });
    }

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
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

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if current user is project owner
    const isOwner = project.members.some(
      member => member.userId === req.user.id && member.role === 'owner'
    );

    if (!isOwner) {
      return res.status(403).json({ error: 'Only project owners can invite members' });
    }

    // Check if user is already a member
    const alreadyMember = project.members.some(member => member.userId === userId);
    if (alreadyMember) {
      return res.status(409).json({ error: 'User already belongs to this project' });
    }

    // Check if invited user exists
    const invitedUser = await getUserById(userId);
    if (!invitedUser) {
      return res.status(404).json({ error: 'Invited user not found' });
    }

    // Add member to project
    await prisma.projectMember.create({
      data: {
        projectId,
        userId,
        role
      }
    });

    console.log('[INFO] User added to project:', invitedUser.email, 'Role:', role);

    // Get updated project
    const updatedProject = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
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
        },
        stages: {
          orderBy: { position: 'asc' }
        }
      }
    });

    // Send notification to invited user
    notificationStore.bumpUserChange({
      recipients: [userId],
      actorId: req.user.id,
      actorName: req.user.displayName,
      projectName: project.name,
      role,
      action: 'project_invite'
    });

    // Notify other members
    const otherMembers = updatedProject.members
      .map(member => member.userId)
      .filter(id => id !== userId && id !== req.user.id);

    if (otherMembers.length > 0) {
      notificationStore.bumpUserChange({
        recipients: otherMembers,
        actorId: req.user.id,
        actorName: req.user.displayName,
        projectName: project.name,
        targetName: invitedUser.displayName,
        role,
        action: 'user_joined'
      });
    }

    const summaryTargets = [userId, ...otherMembers];
    if (summaryTargets.length > 0) {
      emitNotificationSummaries(summaryTargets);
    }

    res.json({ 
      success: true,
      project: updatedProject 
    });
  } catch (error) {
    console.error('[ERROR] Failed to invite user:', error);
    res.status(500).json({ error: 'Failed to invite user to project' });
  }
});

app.delete('/projects/:projectId/members/:memberId', authRequired, async (req, res) => {
  try {
    const { projectId, memberId } = req.params;
    
    // Get project from database with members
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: true
      }
    });
    
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
    console.error('[ERROR] Failed to remove member:', error);
    res.status(500).json({ error: 'Failed to remove member' });
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
    
    // Calculate progress based on BOTH stages and tasks
    const totalStages = project.stages.length;
    const completedStages = project.stages.filter(s => s.status === 'completed').length;
    
    const allTasks = project.stages.flatMap(stage => stage.tasks);
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => t.state === 'completed').length;
    
    // Calculate percentage: combine stages and tasks
    // If there are tasks, weight them equally with stages
    let percentComplete = 0;
    if (totalStages > 0 && totalTasks > 0) {
      // 50% weight for stages, 50% weight for tasks
      const stagePercent = (completedStages / totalStages) * 50;
      const taskPercent = (completedTasks / totalTasks) * 50;
      percentComplete = Math.round(stagePercent + taskPercent);
    } else if (totalStages > 0) {
      // Only stages, no tasks
      percentComplete = Math.round((completedStages / totalStages) * 100);
    } else if (totalTasks > 0) {
      // Only tasks, no stages (unlikely)
      percentComplete = Math.round((completedTasks / totalTasks) * 100);
    }
    
    const progress = {
      totalStages,
      completedStages,
      totalTasks,
      completedTasks,
      percentComplete
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
    
    console.log('[APPLY-TEMPLATE] Applying template:', template.name);
    console.log('[APPLY-TEMPLATE] Template has', template.stages.length, 'stages');
    console.log('[APPLY-TEMPLATE] Project:', projectId);
    
    // Delete existing stages for this project
    await prisma.stage.deleteMany({
      where: { projectId }
    });
    
    console.log('[APPLY-TEMPLATE] Existing stages deleted');
    
    // Create new stages from the template
    const createdStages = [];
    for (let i = 0; i < template.stages.length; i++) {
      const templateStage = template.stages[i];
      
      const newStage = await prisma.stage.create({
        data: {
          projectId,
          name: templateStage.name,
          position: i,
          status: 'not_started',
          description: templateStage.description || null
        }
      });
      
      console.log('[APPLY-TEMPLATE] Created stage:', newStage.name);
      createdStages.push(newStage);
      
      // Create tasks for this stage (from either 'tasks' or 'checklist' field for backwards compatibility)
      const tasksSource = templateStage.tasks || templateStage.checklist || [];
      
      if (tasksSource.length > 0) {
        for (const taskItem of tasksSource) {
          await prisma.task.create({
            data: {
              stageId: newStage.id,
              title: taskItem.title || taskItem.text || taskItem,
              state: 'not_started',
              position: taskItem.position || 0
            }
          });
        }
        console.log('[APPLY-TEMPLATE] Created', tasksSource.length, 'tasks for stage:', newStage.name);
      }
    }
    
    console.log('[APPLY-TEMPLATE] Successfully applied template with', createdStages.length, 'stages');
    
    // Notify all project members
    const memberIds = project.members.map(m => m.userId);
    notificationStore.bumpProjectChange({
      projectId,
      projectName: project.name,
      actorId: req.user.id,
      actorName: req.user.displayName,
      memberIds,
      change: { type: 'template_applied', templateName: template.name }
    });
    
    const recipients = memberIds.filter(id => id !== req.user.id);
    if (recipients.length > 0) {
      emitNotificationSummaries(recipients);
    }
    
    // Return success with the created stages
    res.json({ 
      success: true,
      message: `Template "${template.name}" applied successfully with ${createdStages.length} stages`,
      stages: createdStages,
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        stagesCount: createdStages.length
      }
    });
  } catch (error) {
    console.error('[ERROR] Apply template failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/projects/:projectId/stages/:stageId', authRequired, async (req, res) => {
  try {
    const { projectId, stageId } = req.params;
    const { status } = req.body ?? {};

    console.log('[STAGE UPDATE] Request to update stage:', stageId, 'Status:', status);

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Check if project exists and user has permission
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
      return res.status(403).json({ error: 'Only owners or staff can change stage status' });
    }

    // Get existing stage
    const existingStage = await prisma.stage.findUnique({
      where: { id: stageId }
    });

    if (!existingStage || existingStage.projectId !== projectId) {
      return res.status(404).json({ error: 'Stage not found' });
    }

    // Update stage status
    const stage = await prisma.stage.update({
      where: { id: stageId },
      data: { status }
    });

    console.log('[STAGE UPDATE] Stage updated:', stage.name, 'New status:', stage.status);

    // Calculate progress based on tasks (not stages)
    const allStages = await prisma.stage.findMany({
      where: { projectId },
      include: {
        tasks: true
      },
      orderBy: { position: 'asc' }
    });

    const allTasks = allStages.flatMap(stage => stage.tasks);
    const total = allTasks.length;
    const completed = allTasks.filter(t => t.state === 'completed').length;
    const progress = { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };

    // Get all project members for notifications
    const allMembers = await prisma.projectMember.findMany({
      where: { projectId },
      select: { userId: true }
    });

    const memberIds = allMembers.map(m => m.userId);
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
    console.error('[ERROR] Failed to update stage:', error);
    res.status(500).json({ error: 'Failed to update stage' });
  }
});

app.post('/projects/:projectId/stages/:stageId/tasks', authRequired, async (req, res) => {
  try {
    const { projectId, stageId } = req.params;
    const { title, dueDate, assignee } = req.body ?? {};

    console.log('[TASK CREATE] Request body:', req.body);
    console.log('[TASK CREATE] Parsed - title:', title, 'dueDate:', dueDate, 'assignee:', assignee);

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    // Check project and membership
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
      return res.status(403).json({ error: 'Only owners or staff can manage tasks' });
    }

    // Check if stage exists
    const stage = await prisma.stage.findUnique({
      where: { id: stageId }
    });

    if (!stage || stage.projectId !== projectId) {
      return res.status(404).json({ error: 'Stage not found' });
    }

    // Set default due date if not provided (7 days from today)
    let taskDueDate = null;
    if (dueDate) {
      // Parse date string as UTC midnight to avoid timezone shifts
      // Input format is YYYY-MM-DD from date input
      const [year, month, day] = dueDate.split('-').map(Number);
      taskDueDate = new Date(Date.UTC(year, month - 1, day));
    } else {
      // Default: 7 days from now at UTC midnight
      const defaultDate = new Date();
      defaultDate.setUTCDate(defaultDate.getUTCDate() + 7);
      defaultDate.setUTCHours(0, 0, 0, 0);
      taskDueDate = defaultDate;
    }

    // Create task
    const task = await prisma.task.create({
      data: {
        stageId,
        title: title.trim(),
        state: 'not_started',  // Fixed: use 'state' not 'status'
        dueDate: taskDueDate,
        assignee: assignee || null
      }
    });

    console.log('[INFO] Task created:', {
      id: task.id,
      title: task.title,
      dueDate: task.dueDate,
      assignee: task.assignee,
      state: task.state,
      stage: stage.name
    });

    // Get all project members for notifications
    const allMembers = await prisma.projectMember.findMany({
      where: { projectId },
      select: { userId: true }
    });

    const memberIds = allMembers.map(m => m.userId);

    notificationStore.bumpProjectChange({
      projectId,
      projectName: project.name,
      actorId: req.user.id,
      actorName: req.user.displayName,
      memberIds,
      change: { type: 'task_created', stageName: stage.name, taskTitle: task.title }
    });

    const recipients = memberIds.filter(id => id !== req.user.id);
    if (recipients.length > 0) {
      emitNotificationSummaries(recipients);
    }

    res.status(201).json({ task });
  } catch (error) {
    console.error('[ERROR] Failed to create task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.patch('/projects/:projectId/stages/:stageId/tasks/:taskId', authRequired, async (req, res) => {
  try {
    const { projectId, stageId, taskId } = req.params;
    const { state, status, dueDate, title, assignee } = req.body ?? {};

    // Accept both 'state' and 'status' for backwards compatibility
    const taskState = state || status;

    // Build update data object with only provided fields
    const updateData = {};
    if (taskState) updateData.state = taskState;
    if (dueDate !== undefined) {
      if (dueDate) {
        // Parse date string as UTC midnight to avoid timezone shifts
        const [year, month, day] = dueDate.split('-').map(Number);
        updateData.dueDate = new Date(Date.UTC(year, month - 1, day));
      } else {
        updateData.dueDate = null;
      }
    }
    if (title !== undefined) updateData.title = title.trim();
    if (assignee !== undefined) updateData.assignee = assignee || null;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    console.log('[TASK UPDATE] Updating task:', taskId, 'Update data:', updateData);

    // Check project and membership
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
      return res.status(403).json({ error: 'Only owners or staff can manage tasks' });
    }

    // Get existing task
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        stage: true
      }
    });

    if (!existingTask || existingTask.stageId !== stageId) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const wasCompleted = existingTask.state === 'completed';

    // Update task with provided fields
    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData
    });

    console.log('[TASK UPDATE] Task updated successfully:', task.title, 'Updated fields:', Object.keys(updateData));

    // Get all project members for notifications
    const allMembers = await prisma.projectMember.findMany({
      where: { projectId },
      select: { userId: true }
    });

    const memberIds = allMembers.map(m => m.userId);
    const changeType = (taskState === 'completed' && !wasCompleted) ? 'task_completed' : 'task_status';

    notificationStore.bumpProjectChange({
      projectId,
      projectName: project.name,
      actorId: req.user.id,
      actorName: req.user.displayName,
      memberIds,
      change: { 
        type: changeType, 
        stageName: existingTask.stage.name, 
        taskTitle: task.title, 
        status: task.state 
      }
    });

    const recipients = memberIds.filter(id => id !== req.user.id);
    if (recipients.length > 0) {
      emitNotificationSummaries(recipients);
    }

    res.json({ task });
  } catch (error) {
    console.error('[ERROR] Failed to update task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

app.delete('/projects/:projectId/stages/:stageId/tasks/:taskId', authRequired, async (req, res) => {
  try {
    const { projectId, stageId, taskId } = req.params;

    console.log('[TASK DELETE] Request to delete task:', taskId);

    // Check project and membership
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
      return res.status(403).json({ error: 'Only owners or staff can delete tasks' });
    }

    // Get existing task
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        stage: true
      }
    });

    if (!existingTask || existingTask.stageId !== stageId) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Delete task
    const task = await prisma.task.delete({
      where: { id: taskId }
    });

    console.log('[TASK DELETE] Task deleted successfully:', task.title);

    // Get all project members for notifications
    const allMembers = await prisma.projectMember.findMany({
      where: { projectId },
      select: { userId: true }
    });

    const memberIds = allMembers.map(m => m.userId);

    notificationStore.bumpProjectChange({
      projectId,
      projectName: project.name,
      actorId: req.user.id,
      actorName: req.user.displayName,
      memberIds,
      change: { 
        type: 'task_deleted', 
        stageName: existingTask.stage.name, 
        taskTitle: task.title
      }
    });

    const recipients = memberIds.filter(id => id !== req.user.id);
    if (recipients.length > 0) {
      emitNotificationSummaries(recipients);
    }

    res.json({ 
      success: true,
      task 
    });
  } catch (error) {
    console.error('[ERROR] Failed to delete task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

app.get('/projects/:projectId/checklist', authRequired, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Get project from database with members
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId: req.user.id }
        }
      }
    });
    
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.members.length === 0) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const checklist = checklistStore.list(projectId);
    res.json({ checklist });
  } catch (error) {
    console.error('[ERROR] Failed to get checklist:', error);
    res.status(500).json({ error: 'Failed to get checklist' });
  }
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

app.post('/projects/:projectId/invoices', invoiceUpload.single('file'), authRequired, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { type, amount, dueDate, description, status } = req.body;
    
    console.log('[INVOICE CREATE] User:', req.user?.email, 'Project:', projectId);
    console.log('[INVOICE CREATE] File uploaded?', !!req.file);
    console.log('[INVOICE CREATE] Body:', { type, amount, dueDate, description, status });
    
    // Get project with members
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: true
      }
    });
    
    if (!project) {
      console.log('[INVOICE CREATE] Project not found:', projectId);
      return res.status(404).json({ error: 'Project not found' });
    }
    
    console.log('[INVOICE CREATE] Project members:', project.members.length);
    
    // Check if user is owner or staff
    const member = project.members.find(m => m.userId === req.user.id);
    if (!member || member.role === 'client') {
      console.log('[INVOICE CREATE] User not authorized. Member:', member, 'Role:', member?.role);
      return res.status(403).json({ error: 'Only owners or staff can create invoices' });
    }
    
    // Prepare invoice data
    const invoiceData = {
      projectId,
      type,
      amount: parseFloat(amount),
      status: status || 'pending',
      description: description || null,
      dueDate: dueDate ? new Date(dueDate) : null
    };
    
    // If file was uploaded, add file info
    if (req.file) {
      const fileUrl = `uploads/invoices/${req.file.filename}`;
      invoiceData.fileUrl = fileUrl;
      invoiceData.fileName = req.file.originalname;
      invoiceData.fileSize = req.file.size;
      invoiceData.fileType = req.file.mimetype;
    }
    
    // Create invoice in database
    const invoice = await prisma.invoice.create({
      data: invoiceData
    });
    
    // Send notifications to all project members
    const memberIds = project.members.map(m => m.userId);
    notificationStore.bumpProjectChange({
      projectId,
      projectName: project.name,
      actorId: req.user.id,
      actorName: req.user.displayName,
      memberIds,
      change: {
        type: 'invoice_created',
        invoiceType: invoice.type,
        amount: invoice.amount.toString()
      }
    });
    
    const recipients = memberIds.filter(id => id !== req.user.id);
    if (recipients.length > 0) {
      emitNotificationSummaries(recipients);
    }
    emitNotificationSummary(req.user.id);
    
    res.json({ invoice });
  } catch (error) {
    console.error('[ERROR] Failed to create invoice:', error);
    console.error('[ERROR] Error stack:', error.stack);
    console.error('[ERROR] Request user:', req.user);
    console.error('[ERROR] Request file:', req.file);
    console.error('[ERROR] Request body:', req.body);
    res.status(500).json({ error: 'Failed to create invoice', details: error.message });
  }
});

app.get('/projects/:projectId/invoices/:invoiceId/download', authRequired, async (req, res) => {
  try {
    const { projectId, invoiceId } = req.params;
    
    console.log(`[INVOICE DOWNLOAD] User ${req.user.email} requesting invoice ${invoiceId} from project ${projectId}`);
    
    // Get project and invoice
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId: req.user.id }
        },
        invoices: {
          where: { id: invoiceId }
        }
      }
    });
    
    if (!project) {
      console.log('[INVOICE DOWNLOAD] Project not found:', projectId);
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Check if user is a member
    if (project.members.length === 0) {
      console.log('[INVOICE DOWNLOAD] User not a member of project:', req.user.email, projectId);
      return res.status(403).json({ error: 'You are not a member of this project' });
    }
    
    const invoice = project.invoices[0];
    if (!invoice) {
      console.log('[INVOICE DOWNLOAD] Invoice not found:', invoiceId);
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    if (!invoice.fileUrl) {
      console.log('[INVOICE DOWNLOAD] Invoice has no file:', invoiceId);
      return res.status(404).json({ error: 'This invoice has no file attached' });
    }
    
    // Construct absolute path - handle both old and new path formats
    // Old format: 'uploads/invoices/filename.pdf'
    // New format: 'invoices/filename.pdf' or just 'filename.pdf'
    let absolutePath;
    
    // Try different path combinations
    const pathsToTry = [];
    
    // Option 1: fileUrl is already a complete relative path from uploads/
    if (invoice.fileUrl.startsWith('uploads/')) {
      const withoutUploads = invoice.fileUrl.substring('uploads/'.length);
      pathsToTry.push(path.join(uploadDir, withoutUploads));
    }
    
    // Option 2: fileUrl is relative from uploadDir (like 'invoices/filename.pdf')
    pathsToTry.push(path.join(uploadDir, invoice.fileUrl));
    
    // Option 3: fileUrl is just the filename, assume it's in invoices/
    if (!invoice.fileUrl.includes('/')) {
      pathsToTry.push(path.join(uploadDir, 'invoices', invoice.fileUrl));
    }
    
    console.log('[INVOICE DOWNLOAD] Original fileUrl:', invoice.fileUrl);
    console.log('[INVOICE DOWNLOAD] uploadDir:', uploadDir);
    console.log('[INVOICE DOWNLOAD] Trying paths:', pathsToTry);
    
    // Find the first path that exists
    for (const tryPath of pathsToTry) {
      const resolvedPath = path.resolve(tryPath);
      const uploadsRoot = path.resolve(uploadDir);
      
      // Security check
      if (!resolvedPath.startsWith(uploadsRoot)) {
        console.log('[INVOICE DOWNLOAD] Path security violation, skipping:', resolvedPath);
        continue;
      }
      
      if (fs.existsSync(resolvedPath)) {
        absolutePath = resolvedPath;
        console.log('[INVOICE DOWNLOAD] ✅ Found file at:', absolutePath);
        break;
      }
    }
    
    if (!absolutePath) {
      console.log('[INVOICE DOWNLOAD] File does not exist at any expected location');
      return res.status(404).json({ error: 'File not found on server. It may have been deleted.' });
    }
    
    console.log('[INVOICE DOWNLOAD] ✅ Sending file:', invoice.fileName);
    // Send the file
    res.download(absolutePath, invoice.fileName || 'invoice.pdf');
  } catch (error) {
    console.error('[ERROR] Failed to download invoice:', error);
    res.status(500).json({ error: 'Failed to download invoice: ' + error.message });
  }
});

app.patch('/projects/:projectId/invoices/:invoiceId', authRequired, async (req, res) => {
  try {
    const { projectId, invoiceId } = req.params;
    const { status } = req.body ?? {};
    
    // Get project with members
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: true
      }
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Check if user is owner or staff
    const member = project.members.find(m => m.userId === req.user.id);
    if (!member || member.role === 'client') {
      return res.status(403).json({ error: 'Only owners or staff can update invoices' });
    }
    
    // Update invoice in database
    const invoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status }
    });
    
    // Send notifications
    const memberIds = project.members.map(m => m.userId);
    notificationStore.bumpProjectChange({
      projectId,
      projectName: project.name,
      actorId: req.user.id,
      actorName: req.user.displayName,
      memberIds,
      change: {
        type: 'invoice_status',
        invoiceType: invoice.type,
        status: invoice.status
      }
    });
    
    const recipients = memberIds.filter(id => id !== req.user.id);
    if (recipients.length > 0) {
      emitNotificationSummaries(recipients);
    }
    emitNotificationSummary(req.user.id);
    
    res.json({ invoice });
  } catch (error) {
    console.error('[ERROR] Failed to update invoice:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

app.delete('/projects/:projectId/invoices/:invoiceId', authRequired, async (req, res) => {
  try {
    const { projectId, invoiceId } = req.params;
    
    // Get project with members
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: true
      }
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Check if user is owner or staff
    const member = project.members.find(m => m.userId === req.user.id);
    if (!member || member.role === 'client') {
      return res.status(403).json({ error: 'Only owners or staff can delete invoices' });
    }
    
    // Get invoice before deletion to access file info
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    });
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    if (invoice.projectId !== projectId) {
      return res.status(403).json({ error: 'Invoice does not belong to this project' });
    }
    
    // Delete the file from filesystem if it exists
    if (invoice.fileUrl) {
      const filePath = path.join(__dirname, invoice.fileUrl);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('[INFO] Deleted invoice file:', filePath);
      }
    }
    
    // Delete invoice from database
    await prisma.invoice.delete({
      where: { id: invoiceId }
    });
    
    console.log('[INFO] Invoice deleted:', invoiceId);
    
    // Send notifications
    const memberIds = project.members.map(m => m.userId);
    notificationStore.bumpProjectChange({
      projectId,
      projectName: project.name,
      actorId: req.user.id,
      actorName: req.user.displayName,
      memberIds,
      change: {
        type: 'invoice_deleted',
        invoiceType: invoice.type,
        description: invoice.description
      }
    });
    
    const recipients = memberIds.filter(id => id !== req.user.id);
    if (recipients.length > 0) {
      emitNotificationSummaries(recipients);
    }
    
    res.json({ success: true, message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('[ERROR] Failed to delete invoice:', error);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

app.get('/projects/:projectId/messages', authRequired, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Verify user is a member of the project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: true
      }
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const isMember = project.members.some(member => member.userId === req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'Not a member of this project' });
    }

    // Load messages from database
    const messages = await prisma.message.findMany({
      where: { projectId },
      include: {
        sender: {
          select: {
            id: true,
            displayName: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Format messages for response
    const history = messages.map(msg => ({
      id: msg.id,
      projectId: msg.projectId,
      body: msg.content,
      author: {
        id: msg.sender.id,
        displayName: msg.sender.displayName,
        role: msg.sender.role
      },
      createdAt: msg.createdAt.toISOString()
    }));

    res.json({ messages: history });
  } catch (error) {
    console.error('[ERROR] Failed to load messages:', error);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

app.get('/notifications', authRequired, (req, res) => {
  const summary = notificationStore.summary(req.user.id);
  res.json(summary);
});

app.post('/notifications/read', authRequired, (req, res) => {
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

app.post('/projects/:projectId/messages/read', authRequired, (req, res) => {
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
    
    // Map database fields to frontend-expected fields
    const mappedUploads = project.uploads.map(upload => ({
      id: upload.id,
      fileName: upload.originalFilename,
      uploadedAt: upload.createdAt,
      uploadedBy: upload.uploader,
      label: upload.label,
      remarks: upload.remarks,
      requiresReview: upload.requiresReview,
      category: upload.category,
      isActiveRendering: upload.isActiveRendering,
      filePath: upload.filePath
    }));
    
    res.json({ uploads: mappedUploads });
  } catch (error) {
    console.error('[ERROR] Failed to fetch uploads:', error);
    res.status(500).json({ error: 'Failed to fetch uploads' });
  }
});

app.post('/projects/:projectId/uploads', upload.array('files'), authRequired, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    console.log('[FILE UPLOAD] User:', req.user?.email, 'Project:', projectId);
    console.log('[FILE UPLOAD] Files count:', req.files?.length || 0);
    console.log('[FILE UPLOAD] Body meta:', req.body.meta);
    console.log('[FILE UPLOAD] Category:', req.body.category);

    // Check project and membership
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId: req.user.id }
        }
      }
    });

    if (!project) {
      console.log('[FILE UPLOAD] Project not found:', projectId);
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.members.length === 0) {
      console.log('[FILE UPLOAD] User not a member of project');
      return res.status(403).json({ error: 'Forbidden' });
    }

    console.log('[FILE UPLOAD] User is member, proceeding with upload');

    // Allow all project members to upload files
    const meta = JSON.parse(req.body.meta ?? '[]');
    const category = req.body.category || null;
    const isActiveRendering = req.body.isActiveRendering === 'true';

    console.log('[FILE UPLOAD] Category:', category);
    console.log('[FILE UPLOAD] isActiveRendering:', isActiveRendering);

    // Create upload records in database
    const uploads = [];
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      // Store only the filename, we'll prepend uploadDir when accessing
      const filePath = file.filename;
      
      console.log('[FILE UPLOAD] Creating upload record for:', file.originalname);
      
      const upload = await prisma.upload.create({
        data: {
          projectId,
          uploaderId: req.user.id,
          filePath: filePath,
          originalFilename: file.originalname,
          label: meta[i]?.label ?? '',
          remarks: meta[i]?.remarks ?? '',
          requiresReview: Boolean(meta[i]?.requiresReview),
          category: category,
          isActiveRendering: isActiveRendering
        },
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
      });
      uploads.push(upload);
    }

    console.log('[INFO] Uploaded', uploads.length, 'file(s) to project:', project.name);

    // Get all project members for notifications
    const allMembers = await prisma.projectMember.findMany({
      where: { projectId },
      select: { userId: true }
    });

    const memberIds = allMembers.map(m => m.userId);

    notificationStore.bumpUploads({
      projectId,
      projectName: project.name,
      actorId: req.user.id,
      actorName: req.user.displayName,
      memberIds,
      count: uploads.length
    });

    const recipients = memberIds.filter(id => id !== req.user.id);
    if (recipients.length > 0) {
      emitNotificationSummaries(recipients);
    }
    emitNotificationSummary(req.user.id);

    res.json({ uploaded: uploads });
  } catch (error) {
    console.error('[ERROR] Failed to upload files:', error);
    console.error('[ERROR] Error stack:', error.stack);
    console.error('[ERROR] Request user:', req.user);
    console.error('[ERROR] Request files:', req.files?.length || 0);
    console.error('[ERROR] Request body:', req.body);
    res.status(500).json({ error: 'Failed to upload files', details: error.message });
  }
});

app.get('/projects/:projectId/uploads/:uploadId', authRequired, async (req, res) => {
  try {
    const { projectId, uploadId } = req.params;
    
    console.log('[FILE DOWNLOAD] User:', req.user.email, 'Upload ID:', uploadId);
    
    // Get upload from database
    const upload = await prisma.upload.findUnique({
      where: { id: uploadId },
      include: {
        project: {
          include: {
            members: {
              where: { userId: req.user.id }
            }
          }
        }
      }
    });
    
    if (!upload) {
      console.log('[FILE DOWNLOAD] Upload not found:', uploadId);
      return res.status(404).json({ error: 'File not found' });
    }
    
    if (!upload.project) {
      console.log('[FILE DOWNLOAD] Project not found for upload:', uploadId);
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (upload.project.members.length === 0) {
      console.log('[FILE DOWNLOAD] User not a member of project');
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Construct absolute path - handle both old and new formats
    // Old format: relative path from __dirname (e.g., 'uploads/filename.pdf')
    // New format: just the filename
    let absolutePath;
    const pathsToTry = [];
    
    // Option 1: New format - just filename
    pathsToTry.push(path.join(uploadDir, upload.filePath));
    
    // Option 2: Old format - already includes 'uploads/' prefix
    if (upload.filePath.startsWith('uploads/')) {
      const withoutUploads = upload.filePath.substring('uploads/'.length);
      pathsToTry.push(path.join(uploadDir, withoutUploads));
    }
    
    console.log('[FILE DOWNLOAD] Original filePath:', upload.filePath);
    console.log('[FILE DOWNLOAD] uploadDir:', uploadDir);
    console.log('[FILE DOWNLOAD] Trying paths:', pathsToTry);
    
    const uploadsRoot = path.resolve(uploadDir);
    
    // Find the first path that exists and is secure
    for (const tryPath of pathsToTry) {
      const resolvedPath = path.resolve(tryPath);
      
      // Security check
      if (!resolvedPath.startsWith(uploadsRoot)) {
        console.log('[FILE DOWNLOAD] Path security violation, skipping:', resolvedPath);
        continue;
      }
      
      try {
        await fs.promises.access(resolvedPath, fs.constants.R_OK);
        absolutePath = resolvedPath;
        console.log('[FILE DOWNLOAD] ✅ Found file at:', absolutePath);
        break;
      } catch {
        // File doesn't exist at this path, try next
      }
    }
    
    if (!absolutePath) {
      console.error('[FILE DOWNLOAD] File not accessible at any expected location');
      return res.status(404).json({ error: 'File not found on disk' });
    }

    console.log('[FILE DOWNLOAD] ✅ Sending file:', upload.originalFilename);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type, Content-Length');
    res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
    res.download(absolutePath, upload.originalFilename, err => {
      if (err) {
        console.error('[FILE DOWNLOAD] Error sending file:', err);
      }
    });
  } catch (error) {
    console.error('[ERROR] Failed to download file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// DELETE /projects/:projectId/uploads/:uploadId - Delete an uploaded file
app.delete('/projects/:projectId/uploads/:uploadId', authRequired, async (req, res) => {
  const { projectId, uploadId } = req.params;
  const user = req.user;

  console.log('[DELETE UPLOAD] Request received:', { 
    projectId, 
    uploadId, 
    userId: user.id,
    userEmail: user.email 
  });

  try {
    // Verify project membership
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: true
      }
    });

    if (!project) {
      console.log('[DELETE UPLOAD] Project not found:', projectId);
      return res.status(404).json({ error: 'Project not found' });
    }

    const isMember = project.members.some(member => member.userId === user.id);
    if (!isMember) {
      console.log('[DELETE UPLOAD] User not authorized:', { projectId, userId: user.id });
      return res.status(403).json({ error: 'Not authorized to delete files in this project' });
    }

    // Get upload record from database
    const upload = await prisma.upload.findUnique({
      where: { id: uploadId }
    });

    if (!upload) {
      console.log('[DELETE UPLOAD] Upload not found:', uploadId);
      return res.status(404).json({ error: 'File not found' });
    }

    if (upload.projectId !== projectId) {
      console.log('[DELETE UPLOAD] Upload does not belong to project:', { 
        uploadId, 
        uploadProjectId: upload.projectId, 
        requestProjectId: projectId 
      });
      return res.status(400).json({ error: 'File does not belong to this project' });
    }

    // Delete file from filesystem
    const filePath = path.join(uploadDir, upload.filePath);
    console.log('[DELETE UPLOAD] Attempting to delete file from disk:', filePath);

    try {
      await fs.promises.unlink(filePath);
      console.log('[DELETE UPLOAD] File deleted from disk:', filePath);
    } catch (fsError) {
      if (fsError.code === 'ENOENT') {
        console.warn('[DELETE UPLOAD] File not found on disk, continuing with database deletion:', filePath);
      } else {
        console.error('[DELETE UPLOAD] Failed to delete file from disk:', fsError);
        throw fsError;
      }
    }

    // Delete database record
    await prisma.upload.delete({
      where: { id: uploadId }
    });

    console.log('[DELETE UPLOAD] Database record deleted:', uploadId);

    // Send notifications to project members
    const memberIds = project.members.map(m => m.userId).filter(id => id !== user.id);
    const notifications = memberIds.map(userId => ({
      userId,
      projectId,
      type: 'file_deleted',
      message: `${user.displayName || user.email} deleted a file: ${upload.originalFilename}`
    }));

    if (notifications.length > 0) {
      await prisma.notification.createMany({ data: notifications });
      console.log('[DELETE UPLOAD] Notifications created:', notifications.length);
      
      for (const userId of memberIds) {
        emitNotificationSummary(userId);
      }
    }

    res.json({ 
      success: true, 
      message: 'File deleted successfully',
      deletedFile: {
        id: upload.id,
        fileName: upload.originalFilename
      }
    });
  } catch (error) {
    console.error('[ERROR] Failed to delete file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

const httpServer = http.createServer(app);
io = new Server(httpServer, {
  cors: { origin: corsOriginHandler, credentials: true }
});
io.use(authMiddleware.socket);

io.on('connection', socket => {
  const user = socket.data.user;
  console.log('[SOCKET] User connected:', { id: user.id, email: user.email, displayName: user.displayName });
  socket.join(`user:${user.id}`);
  emitNotificationSummary(user.id);

  socket.on('project:join', async ({ projectId }) => {
    console.log('[SOCKET] project:join received:', { projectId, userId: user.id });
    try {
      // Get project from database with members
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          members: true
        }
      });
      
      if (!project) {
        console.error('[SOCKET] project:join - Project not found:', projectId);
        return;
      }
      
      const members = project.members.map(member => member.userId);
      console.log('[SOCKET] project:join - Project members:', members);
      
      if (!members.includes(user.id)) {
        console.error('[SOCKET] project:join - User not a member:', { userId: user.id, projectId });
        return;
      }
      
      socket.join(projectId);
      console.log('[SOCKET] User joined project room:', { userId: user.id, projectId });

      // Load message history from database
      const messages = await prisma.message.findMany({
        where: { projectId },
        include: {
          sender: {
            select: {
              id: true,
              displayName: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      // Format messages to match client expectations
      const history = messages.map(msg => ({
        id: msg.id,
        projectId: msg.projectId,
        body: msg.content,
        author: {
          id: msg.sender.id,
          displayName: msg.sender.displayName,
          role: msg.sender.role
        },
        createdAt: msg.createdAt.toISOString()
      }));

      socket.emit('project:bootstrapped', { projectId, history });
      const unread = notificationStore.unreadForProject({ userId: user.id, projectId });
      socket.emit('badge:sync', { projectId, unread });
    } catch (error) {
      console.error('[ERROR] Failed to join project:', error);
    }
  });

  socket.on('message:send', async payload => {
    const { projectId, body, attachments = [], clientMessageId } = payload;
    
    console.log('[SOCKET] message:send received:', { projectId, body, clientMessageId, userId: user.id });
    
    try {
      // Get project from database with members
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          members: true
        }
      });
      
      if (!project) {
        console.error('[SOCKET] message:send - Project not found:', projectId);
        socket.emit('message:error', {
          clientMessageId,
          error: 'Project not found'
        });
        return;
      }
      
      const members = project.members.map(member => member.userId);
      console.log('[SOCKET] Project members:', members, 'Current user:', user.id);
      
      if (!members.includes(user.id)) {
        console.error('[SOCKET] message:send - User not a member:', { userId: user.id, projectId });
        socket.emit('message:error', {
          clientMessageId,
          error: 'Not a member of this project'
        });
        return;
      }

      // Save message to database
      console.log('[SOCKET] Saving message to database:', { projectId, senderId: user.id, content: body });
      const savedMessage = await prisma.message.create({
        data: {
          projectId,
          senderId: user.id,
          content: body
        },
        include: {
          sender: {
            select: {
              id: true,
              displayName: true,
              role: true
            }
          }
        }
      });
      console.log('[SOCKET] Message saved successfully:', savedMessage.id);

      // Format message for socket emission
      const message = {
        id: savedMessage.id,
        clientMessageId,
        projectId: savedMessage.projectId,
        body: savedMessage.content,
        author: {
          id: savedMessage.sender.id,
          displayName: savedMessage.sender.displayName,
          role: savedMessage.sender.role
        },
        createdAt: savedMessage.createdAt.toISOString()
      };

      console.log('[SOCKET] Emitting message:new to room:', projectId);
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

      console.log('[SOCKET] Sending message:ack:', { clientMessageId, messageId: message.id });
      socket.emit('message:ack', {
        clientMessageId,
        messageId: message.id
      });
      console.log('[SOCKET] message:send completed successfully');
    } catch (error) {
      console.error('[ERROR] Failed to send message:', error);
    }
  });

  socket.on('message:read', ({ projectId }) => {
    notificationStore.markMessageRead({ userId: user.id, projectId });
    const unread = notificationStore.unreadForProject({ userId: user.id, projectId });
    socket.emit('badge:sync', { projectId, unread });
    emitNotificationSummary(user.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[SOCKET] User disconnected:', { userId: user.id, email: user.email, reason });
  });
});

const PORT = process.env.PORT ?? 4000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all network interfaces
httpServer.listen(PORT, HOST, () => {
  console.log(`Real-time server listening on http://localhost:${PORT}`);
  console.log(`Network access: http://192.168.0.16:${PORT}`);
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
                actorId: 'system',
                actorName: 'System',
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
