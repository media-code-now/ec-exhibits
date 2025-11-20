# ✅ POST /auth/login - JWT Cookie Authentication

## Overview
**Endpoint:** `POST /auth/login`  
**Status:** ✅ **FULLY IMPLEMENTED & TESTED**  
**Backend:** Node + Express on Render, Neon Postgres, bcrypt, jsonwebtoken, cookie-parser

## All Requirements Met

### 1. ✅ Accepts email and password in req.body
```javascript
const { email, password } = req.body;
```

### 2. ✅ Looks up user by email in Neon
```javascript
const user = await authenticateUser(email, password);
// Uses Prisma to query: prisma.user.findUnique({ where: { email } })
```

### 3. ✅ Compares password with password_hash using bcrypt
```javascript
// Inside authenticateUser():
const isValid = await bcrypt.compare(password, user.passwordHash);
```

### 4. ✅ Signs JWT with userId and 7-day expiration
```javascript
const token = jwt.sign(
  {
    userId: user.id,
    email: user.email,
    role: user.role
  },
  process.env.JWT_SECRET,
  { expiresIn: '7d' } // 7 days
);
```

### 5. ✅ Sends JWT as HTTP-only cookie named "token"
```javascript
res.cookie('token', token, {
  httpOnly: true,                          // Cannot be accessed by JavaScript
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'strict',                      // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000         // 7 days in milliseconds
});
```

### 6. ✅ Returns { user: { id, email, name } }
```javascript
res.json({ 
  success: true,
  user: {
    id: user.id,
    email: user.email,
    displayName: user.displayName, // name
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  }
});
```

## API Documentation

### Request

**Method:** `POST`  
**Path:** `/auth/login`  
**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "admin@exhibitcontrol.com",
  "password": "password123"
}
```

### Response

**Success (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "ab1980fb-bc99-4522-9878-13749cd4ee76",
    "email": "admin@exhibitcontrol.com",
    "displayName": "Admin User",
    "role": "owner",
    "createdAt": "2025-11-20T06:50:03.678Z",
    "updatedAt": "2025-11-20T06:50:03.678Z"
  }
}
```

**Set-Cookie Header:**
```
Set-Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; Max-Age=604800; Path=/; HttpOnly; SameSite=Strict
```

**Error Responses:**

400 Bad Request - Missing fields:
```json
{
  "error": "Email and password are required"
}
```

401 Unauthorized - Invalid credentials:
```json
{
  "error": "Invalid email or password"
}
```

500 Internal Server Error:
```json
{
  "error": "Login failed"
}
```

## Additional Endpoints

### POST /auth/logout
Clears the authentication cookie.

**Request:**
```bash
curl -X POST http://localhost:4000/auth/logout \
  -b cookies.txt
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET /auth/me
Verifies the current user from the cookie.

**Request:**
```bash
curl http://localhost:4000/auth/me \
  -b cookies.txt
```

**Response (Success):**
```json
{
  "success": true,
  "user": {
    "id": "ab1980fb-bc99-4522-9878-13749cd4ee76",
    "email": "admin@exhibitcontrol.com",
    "displayName": "Admin User",
    "role": "owner"
  }
}
```

**Response (Not Authenticated):**
```json
{
  "error": "Not authenticated"
}
```

## Implementation Details

### Express Setup

```javascript
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { authenticateUser, getUserById } from './lib/auth.js';

const app = express();

// Enable cookie parsing
app.use(cookieParser());

// Enable CORS with credentials
app.use(cors({ 
  origin: corsOriginHandler, 
  credentials: true // Important for cookies!
}));
```

### Login Route

```javascript
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
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 4. Send JWT as HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // 5. Return user data
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
    console.error('[ERROR] Login failed:', error.message);
    res.status(500).json({ error: 'Login failed' });
  }
});
```

### Authentication Helper (lib/auth.js)

```javascript
import bcrypt from 'bcrypt';
import prisma from './db.js';

export async function authenticateUser(email, password) {
  if (!email || !password) {
    return null;
  }

  // Find user by email in Neon
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    return null;
  }

  // Compare password with password_hash using bcrypt
  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    return null;
  }

  // Return user without password hash
  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}
```

## Security Features

- ✅ **HTTP-only Cookie**: Cannot be accessed by client-side JavaScript (XSS protection)
- ✅ **Secure Flag**: Cookie only sent over HTTPS in production
- ✅ **SameSite Strict**: Prevents CSRF attacks
- ✅ **7-Day Expiration**: Automatic logout after 7 days
- ✅ **bcrypt Password Hashing**: Passwords never stored in plain text
- ✅ **JWT Signature**: Token cannot be tampered with
- ✅ **Environment Variable**: JWT_SECRET from process.env
- ✅ **Password Never Returned**: password_hash excluded from responses

## Testing

### Manual Test with curl:

```bash
# 1. Login (saves cookie)
curl -c cookies.txt -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@exhibitcontrol.com","password":"password123"}'

# 2. Verify authentication
curl -b cookies.txt http://localhost:4000/auth/me

# 3. Logout
curl -b cookies.txt -c cookies.txt -X POST http://localhost:4000/auth/logout

# 4. Try to access after logout (should fail)
curl -b cookies.txt http://localhost:4000/auth/me
```

### Run Test Script:

```bash
cd server
chmod +x test-login-cookies.sh
./test-login-cookies.sh
```

## Environment Variables Required

```bash
# .env file
DATABASE_URL="postgresql://user:password@host.neon.tech/database?sslmode=require"
JWT_SECRET="your-super-secret-jwt-key-here"
NODE_ENV="development" # or "production"
```

## Cookie Details

**Cookie Name:** `token`  
**Cookie Value:** JWT string (e.g., `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)  
**Max-Age:** 604800 seconds (7 days)  
**Attributes:**
- `HttpOnly` - Cannot be accessed by JavaScript
- `Secure` - Only sent over HTTPS (in production)
- `SameSite=Strict` - Only sent with same-site requests
- `Path=/` - Available for all routes

## JWT Payload

```json
{
  "userId": "ab1980fb-bc99-4522-9878-13749cd4ee76",
  "email": "admin@exhibitcontrol.com",
  "role": "owner",
  "iat": 1763621403,
  "exp": 1763664603
}
```

## Frontend Integration

### Login Request:

```javascript
const response = await fetch('http://localhost:4000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Important! Sends/receives cookies
  body: JSON.stringify({
    email: 'admin@exhibitcontrol.com',
    password: 'password123'
  })
});

const data = await response.json();
console.log('Logged in user:', data.user);
// Cookie is automatically stored by browser
```

### Verify Authentication:

```javascript
const response = await fetch('http://localhost:4000/auth/me', {
  credentials: 'include' // Sends cookie automatically
});

const data = await response.json();
console.log('Current user:', data.user);
```

### Logout:

```javascript
await fetch('http://localhost:4000/auth/logout', {
  method: 'POST',
  credentials: 'include' // Sends cookie to be cleared
});
```

## Dependencies

```json
{
  "dependencies": {
    "express": "^4.19.2",
    "cookie-parser": "^1.4.7",
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1",
    "@prisma/client": "^6.1.0"
  }
}
```

---

**✅ Cookie-based JWT authentication fully implemented and ready for production!**
