# CORS and Cookies Setup for Netlify + Render

## Overview

Complete configuration for cross-origin authentication between:
- **Frontend**: Netlify (`https://ec-exhibits.netlify.app`)
- **Backend**: Render (`https://ec-exhibits.onrender.com`)

---

## The Challenge

When your frontend and backend are on different domains:
- Browsers block cookies by default (CORS policy)
- `sameSite: 'strict'` prevents cross-site cookies
- Must explicitly allow cross-origin requests with credentials

---

## Solution Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Frontend (Netlify)                                          │
│  https://ec-exhibits.netlify.app                             │
│                                                               │
│  fetch('/auth/login', {                                      │
│    credentials: 'include'  ← Sends cookies cross-origin     │
│  })                                                           │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     │ CORS Request with credentials
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│  Backend (Render)                                            │
│  https://ec-exhibits.onrender.com                            │
│                                                               │
│  cors({                                                       │
│    origin: 'https://ec-exhibits.netlify.app',               │
│    credentials: true  ← Allows cookies                      │
│  })                                                           │
│                                                               │
│  res.cookie('token', jwt, {                                  │
│    httpOnly: true,                                           │
│    secure: true,      ← HTTPS only                          │
│    sameSite: 'none'   ← Allows cross-site                   │
│  })                                                           │
└──────────────────────────────────────────────────────────────┘
```

---

## Backend Configuration

### 1. CORS Middleware

**File**: `server/index.js`

```javascript
import cors from 'cors';
import cookieParser from 'cookie-parser';

// Environment variables
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
const PROD_ORIGIN = process.env.PROD_ORIGIN || 'https://ec-exhibits.netlify.app';

// CORS origin handler - allows dev and prod origins
function corsOriginHandler(origin, callback) {
  // No origin (curl/postman) -> allow
  if (!origin) return callback(null, true);
  
  // Allow configured dev origin
  if (origin === ALLOWED_ORIGIN) return callback(null, true);
  
  // Allow configured prod origin
  if (origin === PROD_ORIGIN) return callback(null, true);
  
  // Allow localhost on any port (for local dev)
  if (/^https?:\/\/localhost(?::\d+)?$/.test(origin)) {
    return callback(null, true);
  }
  
  // Reject other origins
  return callback(new Error('Not allowed by CORS'), false);
}

// Apply CORS middleware
app.use(cors({
  origin: corsOriginHandler,
  credentials: true  // ← CRITICAL: Allows cookies
}));

// Apply cookie parser middleware
app.use(cookieParser());
```

**Key Points**:
- ✅ `credentials: true` - Allows cookies in cross-origin requests
- ✅ `corsOriginHandler` - Validates origin is allowed
- ✅ Supports both dev (`localhost`) and prod (`netlify.app`)

---

### 2. Login Route with Cookie

**File**: `server/index.js`

```javascript
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate and authenticate user
    const user = await authenticateUser(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set cookie with proper settings for cross-origin
    res.cookie('token', token, {
      httpOnly: true,  // ← Cannot be accessed by JavaScript (XSS protection)
      secure: process.env.NODE_ENV === 'production', // ← HTTPS only in production
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // ← 'none' for cross-site
      maxAge: 7 * 24 * 60 * 60 * 1000 // ← 7 days
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('[ERROR] Login failed:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});
```

**Cookie Settings Explained**:

| Setting | Value | Purpose |
|---------|-------|---------|
| `httpOnly` | `true` | Prevents JavaScript from accessing cookie (XSS protection) |
| `secure` | `true` (prod) | Requires HTTPS connection |
| `sameSite` | `'none'` (prod) | Allows cross-site requests (Netlify → Render) |
| `sameSite` | `'lax'` (dev) | Localhost doesn't need `'none'` |
| `maxAge` | 7 days | Cookie expiration time |

**Why `sameSite: 'none'` in production?**
- `'strict'` = Cookie only sent to same domain (blocks Netlify → Render)
- `'lax'` = Cookie sent on top-level navigation (blocks API calls)
- `'none'` = Cookie sent on all requests (requires `secure: true`)

---

### 3. Logout Route

**File**: `server/index.js`

```javascript
app.post('/auth/logout', (req, res) => {
  // Clear cookie with same settings as when it was set
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  });
  
  res.json({ success: true, message: 'Logged out successfully' });
});
```

**Important**: `clearCookie` settings must match `cookie` settings for it to work!

---

### 4. Auth Middleware

**File**: `server/middleware/authRequired.js`

```javascript
import jwt from 'jsonwebtoken';

export function authRequired(req, res, next) {
  try {
    // Read token from cookie
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user info to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    console.error('[ERROR] Auth verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

---

### 5. Protected Route Example

```javascript
app.get('/auth/me', authRequired, async (req, res) => {
  try {
    // req.user is populated by authRequired middleware
    const userId = req.user.id;
    
    // Fetch full user data from database
    const user = await getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
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
    console.error('[ERROR] Failed to get user:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});
```

---

## Frontend Configuration

### 1. Environment Variable

**File**: `client/.env` (for development)

```bash
VITE_API_URL=http://localhost:4000
```

**Netlify Environment Variables** (for production):
```bash
VITE_API_URL=https://ec-exhibits.onrender.com
```

---

### 2. Fetch with Credentials

**File**: `client/src/components/LoginPage.jsx`

```javascript
const API_URL = import.meta.env.VITE_API_URL || 'https://ec-exhibits.onrender.com';

async function handleLogin(email, password) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include', // ← CRITICAL: Sends/receives cookies
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();
  
  if (data.success) {
    return data.user;
  } else {
    throw new Error(data.error || 'Login failed');
  }
}
```

**Key Point**: `credentials: 'include'` tells the browser to:
- Send cookies with the request
- Store cookies from the response
- Works cross-origin when backend has `credentials: true` in CORS

---

### 3. Check Authentication on Mount

**File**: `client/src/App.jsx`

```javascript
useEffect(() => {
  async function checkAuth() {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        method: 'GET',
        credentials: 'include' // ← Sends cookie automatically
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.log('Not authenticated');
    } finally {
      setLoading(false);
    }
  }

  checkAuth();
}, []);
```

---

### 4. Logout

```javascript
async function handleLogout() {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include' // ← Clears cookie
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    setUser(null);
  }
}
```

---

## Environment Variables

### Backend (.env)

```bash
# Database
DATABASE_URL="postgresql://..."

# JWT Secret (32+ characters)
JWT_SECRET="your-secret-key-change-in-production"

# CORS Origins
ALLOWED_ORIGIN="http://localhost:5173"
PROD_ORIGIN="https://ec-exhibits.netlify.app"
CLIENT_URL="http://localhost:5173"

# Server Port
PORT=4000

# Environment (set to 'production' on Render)
NODE_ENV="production"
```

### Render Environment Variables

Set in Render Dashboard → Environment:

```bash
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key-32-chars-minimum
ALLOWED_ORIGIN=http://localhost:5173
PROD_ORIGIN=https://ec-exhibits.netlify.app
CLIENT_URL=https://ec-exhibits.netlify.app
NODE_ENV=production
PORT=4000
```

### Netlify Environment Variables

Set in Netlify Dashboard → Site Settings → Environment Variables:

```bash
VITE_API_URL=https://ec-exhibits.onrender.com
```

---

## Cookie Settings Summary

### Development (localhost → localhost)

```javascript
res.cookie('token', token, {
  httpOnly: true,
  secure: false,     // HTTP is fine for localhost
  sameSite: 'lax',   // Same-site is fine for localhost
  maxAge: 7 * 24 * 60 * 60 * 1000
});
```

### Production (Netlify → Render)

```javascript
res.cookie('token', token, {
  httpOnly: true,
  secure: true,      // ← HTTPS required
  sameSite: 'none',  // ← Cross-site allowed
  maxAge: 7 * 24 * 60 * 60 * 1000
});
```

---

## Security Considerations

### ✅ What's Secure

1. **httpOnly: true**
   - Cookie cannot be accessed by JavaScript
   - Protects against XSS attacks

2. **secure: true** (in production)
   - Cookie only sent over HTTPS
   - Protects against man-in-the-middle attacks

3. **sameSite: 'none'** (with secure)
   - Required for cross-origin cookies
   - Safe when combined with `secure: true`

4. **credentials: true** in CORS
   - Only allows cookies from whitelisted origins
   - Rejects requests from unknown domains

### 🔒 Additional Security

1. **JWT Expiration**
   ```javascript
   jwt.sign(payload, secret, { expiresIn: '7d' })
   ```
   - Tokens expire after 7 days
   - User must re-authenticate

2. **Origin Validation**
   ```javascript
   function corsOriginHandler(origin, callback) {
     if (origin === PROD_ORIGIN) return callback(null, true);
     return callback(new Error('Not allowed'), false);
   }
   ```
   - Only Netlify domain can call API
   - Blocks unauthorized origins

3. **Environment-Based Settings**
   ```javascript
   secure: process.env.NODE_ENV === 'production'
   ```
   - Different settings for dev/prod
   - Prevents insecure production deployment

---

## Testing

### Test Local Development

```bash
# Terminal 1: Start backend
cd server
node index.js

# Terminal 2: Start frontend
cd client
npm run dev

# Browser: http://localhost:5173
# Login with: matan@ec-exhibits.com / Password123!
```

**Expected**:
- ✅ Cookie set in browser (check DevTools → Application → Cookies)
- ✅ Cookie sent with subsequent requests
- ✅ `/auth/me` returns user data
- ✅ Logout clears cookie

### Test Production

```bash
# 1. Deploy backend to Render
# 2. Deploy frontend to Netlify
# 3. Visit https://ec-exhibits.netlify.app
# 4. Login with test credentials
```

**Expected**:
- ✅ Cookie set (check DevTools)
- ✅ Cookie has `secure: true` and `sameSite: none`
- ✅ Refresh page keeps user logged in
- ✅ Logout clears cookie

---

## Troubleshooting

### Cookie Not Being Set

**Symptom**: Login succeeds but no cookie in browser

**Check**:
1. Backend has `credentials: true` in CORS
2. Frontend uses `credentials: 'include'`
3. In production: `secure: true` and HTTPS
4. In production: `sameSite: 'none'`
5. Origin is in allowed list

### Cookie Not Being Sent

**Symptom**: Cookie exists but not sent with requests

**Check**:
1. All fetch calls use `credentials: 'include'`
2. Cookie domain matches API domain
3. Cookie hasn't expired
4. In production: `sameSite: 'none'`

### CORS Error

**Symptom**: "No 'Access-Control-Allow-Origin' header"

**Check**:
1. Backend has `cors()` middleware
2. Frontend origin is in allowed list
3. `credentials: true` in CORS config
4. Restart backend after changing CORS settings

### 401 Unauthorized

**Symptom**: `/auth/me` returns 401 even with cookie

**Check**:
1. JWT_SECRET matches on both deploy and dev
2. Cookie name is 'token'
3. Token hasn't expired
4. `authRequired` middleware is applied

---

## Browser DevTools Debugging

### Check Cookie in Browser

**Chrome/Edge**:
1. Open DevTools (F12)
2. Application tab → Cookies
3. Find cookie named `token`
4. Check: `httpOnly`, `secure`, `sameSite`, expiration

### Check Request Headers

**Chrome/Edge**:
1. Open DevTools (F12)
2. Network tab
3. Click on `/auth/login` request
4. Headers tab → Request Headers
5. Look for `Cookie: token=...`

### Check Response Headers

**Check CORS headers**:
1. Network tab → Click request
2. Headers tab → Response Headers
3. Should see:
   ```
   Access-Control-Allow-Origin: https://ec-exhibits.netlify.app
   Access-Control-Allow-Credentials: true
   Set-Cookie: token=...; HttpOnly; Secure; SameSite=None
   ```

---

## Complete Code Example

### Backend (server/index.js)

```javascript
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

const app = express();

// Environment configuration
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
const PROD_ORIGIN = process.env.PROD_ORIGIN || 'https://ec-exhibits.netlify.app';

// CORS configuration
function corsOriginHandler(origin, callback) {
  if (!origin) return callback(null, true);
  if (origin === ALLOWED_ORIGIN) return callback(null, true);
  if (origin === PROD_ORIGIN) return callback(null, true);
  if (/^https?:\/\/localhost(?::\d+)?$/.test(origin)) {
    return callback(null, true);
  }
  return callback(new Error('Not allowed by CORS'), false);
}

app.use(cors({
  origin: corsOriginHandler,
  credentials: true
}));

app.use(cookieParser());
app.use(express.json());

// Login endpoint
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  const user = await authenticateUser(email, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
  
  res.json({ success: true, user });
});

// Logout endpoint
app.post('/auth/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  });
  
  res.json({ success: true });
});

// Protected endpoint
app.get('/auth/me', authRequired, async (req, res) => {
  const user = await getUserById(req.user.id);
  res.json({ user });
});

app.listen(4000, () => console.log('Server running on port 4000'));
```

### Frontend (client/src/App.jsx)

```javascript
import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'https://ec-exhibits.onrender.com';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.log('Not authenticated');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(email, password) {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    if (data.success) {
      setUser(data.user);
    }
  }

  async function handleLogout() {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    
    setUser(null);
  }

  if (loading) return <div>Loading...</div>;
  if (!user) return <LoginPage onLogin={handleLogin} />;
  return <MainApp user={user} onLogout={handleLogout} />;
}
```

---

## Summary

### Backend Checklist

- ✅ `cors({ origin: ..., credentials: true })`
- ✅ `app.use(cookieParser())`
- ✅ `res.cookie('token', jwt, { httpOnly: true, secure: true, sameSite: 'none' })`
- ✅ `NODE_ENV=production` on Render
- ✅ `PROD_ORIGIN=https://ec-exhibits.netlify.app`

### Frontend Checklist

- ✅ `credentials: 'include'` on all fetch calls
- ✅ `VITE_API_URL=https://ec-exhibits.onrender.com` on Netlify
- ✅ No manual cookie management needed

### Production Requirements

- ✅ Both sites must use HTTPS
- ✅ Backend must allow frontend origin
- ✅ `sameSite: 'none'` requires `secure: true`
- ✅ Environment variables set correctly

---

**Your cross-origin authentication is now configured!** 🎉

The cookie will work seamlessly between Netlify and Render with proper security settings.

---

*Last Updated: 2025-11-19*  
*Backend: Node + Express on Render*  
*Frontend: React + Vite on Netlify*
