// Example: How to use authRequired middleware in your Express server

import express from 'express';
import { authRequired } from './middleware/authRequired.js';

const app = express();

// ==============================================================
// PUBLIC ROUTES (No authentication required)
// ==============================================================

app.post('/auth/login', loginHandler);
app.post('/auth/register', registerHandler);
app.get('/public/health', (req, res) => res.json({ status: 'ok' }));

// ==============================================================
// EXAMPLE 1: Protect a single route
// ==============================================================

app.get('/api/profile', authRequired, (req, res) => {
  // req.user is available here: { id, email, role }
  res.json({
    message: 'Your profile',
    user: req.user
  });
});

// ==============================================================
// EXAMPLE 2: Protect multiple routes in a group
// ==============================================================

// All routes under /api/admin require authentication
app.use('/api/admin', authRequired);

app.get('/api/admin/users', (req, res) => {
  // req.user available
  res.json({ users: [...], requestedBy: req.user });
});

app.delete('/api/admin/users/:id', (req, res) => {
  // req.user available
  res.json({ deleted: true, deletedBy: req.user });
});

// ==============================================================
// EXAMPLE 3: Protect all routes after a certain point
// ==============================================================

// Public routes above...

// Protect everything below this line
app.use(authRequired);

app.get('/dashboard', (req, res) => {
  res.json({ user: req.user });
});

app.get('/projects', (req, res) => {
  res.json({ projects: [...], userId: req.user.id });
});

// ==============================================================
// EXAMPLE 4: Optional authentication (check if logged in)
// ==============================================================

// Custom middleware that tries to authenticate but doesn't fail
function optionalAuth(req, res, next) {
  const token = req.cookies.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };
    } catch (error) {
      // Invalid token, but continue anyway
      req.user = null;
    }
  }
  next();
}

app.get('/api/posts', optionalAuth, (req, res) => {
  if (req.user) {
    // User is logged in - show personalized content
    res.json({ posts: [...], personalized: true });
  } else {
    // Not logged in - show public content
    res.json({ posts: [...], personalized: false });
  }
});

// ==============================================================
// EXAMPLE 5: Role-based access control
// ==============================================================

// Middleware to check if user has specific role
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
}

// First authenticate, then check role
app.delete('/api/users/:id', authRequired, requireRole('owner'), (req, res) => {
  // Only users with role='owner' can access this
  res.json({ deleted: true });
});

// ==============================================================
// EXAMPLE 6: Conditional middleware based on route
// ==============================================================

const conditionalAuth = (req, res, next) => {
  // Only require auth for certain HTTP methods
  if (req.method === 'GET') {
    // Public GET requests
    next();
  } else {
    // POST, PUT, DELETE require authentication
    authRequired(req, res, next);
  }
};

app.use('/api/posts', conditionalAuth);

app.get('/api/posts', (req, res) => {
  // No auth required for viewing posts
  res.json({ posts: [...] });
});

app.post('/api/posts', (req, res) => {
  // Auth required for creating posts (enforced by conditionalAuth)
  res.json({ created: true, author: req.user });
});

// ==============================================================
// EXAMPLE 7: Update existing /auth/me route to use middleware
// ==============================================================

// Before (manual token verification):
app.get('/auth/me', async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await getUserById(decoded.userId);
    res.json({ success: true, user });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// After (using authRequired middleware):
app.get('/auth/me', authRequired, async (req, res) => {
  // req.user already verified and populated
  const user = await getUserById(req.user.id);
  res.json({ success: true, user });
});

// ==============================================================
// EXAMPLE 8: Error handling with authenticated routes
// ==============================================================

app.get('/api/projects/:id', authRequired, async (req, res) => {
  try {
    const project = await getProject(req.params.id);
    
    // Check if user has access to this project
    if (!project.members.includes(req.user.id)) {
      return res.status(403).json({ 
        message: 'You do not have access to this project' 
      });
    }
    
    res.json({ project });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==============================================================
// EXAMPLE 9: Combining multiple middlewares
// ==============================================================

import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Multiple middlewares: rate limit, then auth, then route handler
app.post('/api/data', apiLimiter, authRequired, (req, res) => {
  res.json({ 
    data: 'sensitive data',
    user: req.user 
  });
});

// ==============================================================
// EXAMPLE 10: WebSocket authentication
// ==============================================================

import { Server } from 'socket.io';

const io = new Server(server);

io.use((socket, next) => {
  // Get token from handshake
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication required'));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.user.email);
  
  socket.on('message', (data) => {
    // socket.user available here
    console.log('Message from:', socket.user.id);
  });
});

export { app, io };
