# ✅ authRequired Middleware - Implementation Complete

## Overview
**File:** `middleware/authRequired.js`  
**Status:** ✅ **FULLY IMPLEMENTED**  
**Backend:** Node + Express on Render, jsonwebtoken

## Requirements Met

### 1. ✅ Reads the token from req.cookies.token
```javascript
const token = req.cookies.token;
```

### 2. ✅ Verifies it using JWT_SECRET
```javascript
const JWT_SECRET = process.env.JWT_SECRET;
const decoded = jwt.verify(token, JWT_SECRET);
```

### 3. ✅ If valid, sets req.user = { id: userId }
```javascript
req.user = {
  id: decoded.userId,
  email: decoded.email,
  role: decoded.role
};
next(); // Continue to next middleware/route
```

### 4. ✅ If missing or invalid, returns 401 with JSON
```javascript
return res.status(401).json({ 
  message: 'Authentication required' 
});
```

### 5. ✅ Exported from middleware/authRequired.js
```javascript
export function authRequired(req, res, next) { ... }
export default authRequired;
```

## Full Implementation

```javascript
import jwt from 'jsonwebtoken';

/**
 * Authentication middleware that verifies JWT token from HTTP-only cookie
 * 
 * Reads token from req.cookies.token
 * Verifies using JWT_SECRET
 * Sets req.user = { id: userId, email, role } if valid
 * Returns 401 if missing or invalid
 */
export function authRequired(req, res, next) {
  try {
    // 1. Read token from cookies
    const token = req.cookies.token;

    // 2. Check if token exists
    if (!token) {
      return res.status(401).json({ 
        message: 'Authentication required' 
      });
    }

    // 3. Verify token using JWT_SECRET
    const JWT_SECRET = process.env.JWT_SECRET;
    
    if (!JWT_SECRET) {
      console.error('[ERROR] JWT_SECRET not configured');
      return res.status(500).json({ 
        message: 'Server configuration error' 
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // 4. Set req.user with decoded token data
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    // 5. Continue to next middleware/route handler
    next();

  } catch (error) {
    // Token is invalid, expired, or malformed
    console.error('[ERROR] Token verification failed:', error.message);
    
    return res.status(401).json({ 
      message: 'Authentication required' 
    });
  }
}

export default authRequired;
```

## Usage Examples

### Protect a Single Route

```javascript
import { authRequired } from './middleware/authRequired.js';

// Protected route - requires authentication
app.get('/api/profile', authRequired, (req, res) => {
  // req.user is available here
  res.json({
    message: 'Welcome to your profile',
    user: req.user
  });
});
```

### Protect Multiple Routes

```javascript
import { authRequired } from './middleware/authRequired.js';

// Apply to all routes below this point
app.use('/api/protected', authRequired);

app.get('/api/protected/dashboard', (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/protected/settings', (req, res) => {
  res.json({ user: req.user });
});
```

### Protect All Routes After Certain Point

```javascript
import { authRequired } from './middleware/authRequired.js';

// Public routes
app.post('/auth/login', loginHandler);
app.post('/auth/register', registerHandler);

// Protect everything below
app.use(authRequired);

// All routes below require authentication
app.get('/users', getAllUsers);
app.get('/projects', getAllProjects);
```

## Request Flow

### With Valid Cookie:

```
1. Client Request → GET /api/profile
   Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

2. authRequired Middleware:
   ✅ Token found in cookies
   ✅ Token verified with JWT_SECRET
   ✅ req.user = { id: "abc123", email: "user@example.com", role: "owner" }
   ✅ next() called

3. Route Handler:
   res.json({ user: req.user })

4. Response → 200 OK
   { "user": { "id": "abc123", "email": "user@example.com", "role": "owner" } }
```

### Without Cookie:

```
1. Client Request → GET /api/profile
   (No cookie sent)

2. authRequired Middleware:
   ❌ No token in cookies
   ❌ Return 401

3. Response → 401 Unauthorized
   { "message": "Authentication required" }
```

### With Invalid Token:

```
1. Client Request → GET /api/profile
   Cookie: token=invalid.token.here

2. authRequired Middleware:
   ❌ Token found but verification fails
   ❌ jwt.verify() throws error
   ❌ Return 401

3. Response → 401 Unauthorized
   { "message": "Authentication required" }
```

### With Expired Token:

```
1. Client Request → GET /api/profile
   Cookie: token=eyJ... (expired)

2. authRequired Middleware:
   ❌ Token found but expired
   ❌ jwt.verify() throws TokenExpiredError
   ❌ Return 401

3. Response → 401 Unauthorized
   { "message": "Authentication required" }
```

## Response Format

### Success (middleware passes):
- No response sent by middleware
- `req.user` is populated
- `next()` is called
- Route handler sends response

### Failure (401 Unauthorized):
```json
{
  "message": "Authentication required"
}
```

## req.user Object

After successful authentication, `req.user` contains:

```javascript
{
  id: "ab1980fb-bc99-4522-9878-13749cd4ee76",  // userId from JWT
  email: "admin@exhibitcontrol.com",            // email from JWT
  role: "owner"                                 // role from JWT
}
```

## Error Handling

The middleware catches all JWT verification errors:

- `JsonWebTokenError` - Token is malformed
- `TokenExpiredError` - Token has expired
- `NotBeforeError` - Token not yet valid
- Missing token - No cookie present
- Invalid signature - Token tampered with

All errors result in the same response for security:
```json
{
  "message": "Authentication required"
}
```

## Integration with Existing Auth

### Update /auth/me Route

```javascript
import { authRequired } from './middleware/authRequired.js';

// Before: manually verified token
app.get('/auth/me', async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json(...);
  // ... manual verification
});

// After: use middleware
app.get('/auth/me', authRequired, async (req, res) => {
  // req.user already populated by middleware
  const user = await getUserById(req.user.id);
  res.json({ success: true, user });
});
```

## Testing

### Run Test Script:

```bash
cd server
chmod +x test-auth-middleware.sh
./test-auth-middleware.sh
```

### Manual Test:

```bash
# 1. Login to get cookie
curl -c cookies.txt -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@exhibitcontrol.com","password":"password123"}'

# 2. Access protected route with cookie (should succeed)
curl -b cookies.txt http://localhost:4000/auth/me

# 3. Access without cookie (should fail)
curl http://localhost:4000/auth/me

# Response: {"message":"Authentication required"}
```

## Security Features

- ✅ **HTTP-only Cookie**: Token can't be accessed by JavaScript
- ✅ **JWT Verification**: Ensures token hasn't been tampered with
- ✅ **Expiration Check**: Automatically rejects expired tokens
- ✅ **Secret Validation**: Uses environment variable JWT_SECRET
- ✅ **Consistent Error**: Same error message for all auth failures (security best practice)
- ✅ **No Timing Attacks**: Constant-time comparison via jwt.verify()

## Environment Variables Required

```bash
JWT_SECRET="your-super-secret-jwt-key-here"
```

## Dependencies

```json
{
  "jsonwebtoken": "^9.0.2",
  "cookie-parser": "^1.4.7"
}
```

Note: `cookie-parser` middleware must be configured in Express before using `authRequired`:

```javascript
import cookieParser from 'cookie-parser';
app.use(cookieParser());
```

## Files Created

- ✅ `server/middleware/authRequired.js` - Middleware implementation
- ✅ `server/test-auth-middleware.sh` - Test script
- ✅ `server/MIDDLEWARE_AUTH_REQUIRED.md` - This documentation

---

**✅ authRequired middleware fully implemented and ready to use!**
