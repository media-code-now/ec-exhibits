# GET /auth/me - Current User Route

## ✅ Complete Implementation

**Endpoint**: `GET /auth/me`  
**Authentication**: Required (JWT cookie)  
**Database**: Neon Postgres via Prisma

---

## Overview

Returns the currently authenticated user's information. Uses the `authRequired` middleware for authentication and queries Neon Postgres directly for user data.

---

## Implementation Details

### Route Handler

```javascript
app.get('/auth/me', authRequired, async (req, res) => {
  try {
    // authRequired middleware sets req.user = { id, email, role }
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
    
    // Handle case where user deleted after login
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Return with 'name' property
    res.json({ 
      user: {
        id: user.id,
        email: user.email,
        name: user.displayName, // mapped from displayName
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
```

### Key Features

1. **Uses authRequired Middleware**: Authentication handled by middleware, not in route
2. **Queries Neon Directly**: Uses `prisma.user.findUnique()` for database query
3. **Proper Status Codes**: Returns 404 if user not found (not 401)
4. **Clean Response**: Returns `name` field mapped from `displayName`
5. **Type-Safe**: Prisma ensures query correctness

---

## Request

### Headers

```
Cookie: token=<jwt-token>
```

The JWT cookie is automatically sent by the browser if previously set via `/auth/login`.

### Example Request (curl)

```bash
# Login first to get cookie
curl -c cookies.txt -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@exhibitcontrol.com","password":"password123"}'

# Access /auth/me with cookie
curl -b cookies.txt http://localhost:4000/auth/me
```

### Example Request (JavaScript fetch)

```javascript
fetch('http://localhost:4000/auth/me', {
  credentials: 'include' // Required to send cookies
})
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));
```

---

## Responses

### Success Response (200 OK)

**Condition**: User is authenticated and exists in database

```json
{
  "user": {
    "id": "ab1980fb-bc99-4522-9878-13749cd4ee76",
    "email": "admin@exhibitcontrol.com",
    "name": "Admin User",
    "role": "owner",
    "createdAt": "2025-11-20T06:50:03.678Z",
    "updatedAt": "2025-11-20T06:50:03.678Z"
  }
}
```

**Fields**:
- `id` (string): User's unique identifier (UUID)
- `email` (string): User's email address
- `name` (string): User's display name
- `role` (string): User's role (owner, admin, staff, client)
- `createdAt` (string): ISO 8601 timestamp when user was created
- `updatedAt` (string): ISO 8601 timestamp when user was last updated

### Error Response: Unauthorized (401)

**Condition**: No JWT cookie or invalid/expired JWT token

```json
{
  "message": "Authentication required"
}
```

This response comes from the `authRequired` middleware, not the route handler.

### Error Response: Not Found (404)

**Condition**: User was deleted after logging in (JWT valid but user doesn't exist)

```json
{
  "error": "User not found"
}
```

### Error Response: Internal Server Error (500)

**Condition**: Database query failed or other server error

```json
{
  "error": "Failed to fetch user data"
}
```

---

## Testing

### Run Test Suite

```bash
cd server
bash test-auth-me.sh
```

### Manual Tests

**Test 1**: Access without authentication (should fail)
```bash
curl http://localhost:4000/auth/me
# Expected: 401 Unauthorized
```

**Test 2**: Access with valid authentication (should succeed)
```bash
# Login first
curl -c cookies.txt -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@exhibitcontrol.com","password":"password123"}'

# Get current user
curl -b cookies.txt http://localhost:4000/auth/me
# Expected: 200 OK with user data
```

**Test 3**: Access after logout (should fail)
```bash
curl -c cookies.txt -b cookies.txt -X POST http://localhost:4000/auth/logout
curl -b cookies.txt http://localhost:4000/auth/me
# Expected: 401 Unauthorized
```

---

## Security Notes

1. **Cookie-Based Authentication**: More secure than localStorage, protected from XSS
2. **HTTP-Only Cookies**: JavaScript cannot access the JWT token
3. **SameSite=Strict**: Protects against CSRF attacks
4. **Secure Flag**: Cookies only sent over HTTPS in production
5. **7-Day Expiration**: Tokens automatically expire after 7 days
6. **Password Excluded**: User query never returns password_hash

---

## Frontend Integration

### React Example

```javascript
// Check if user is logged in on app load
useEffect(() => {
  fetch('http://localhost:4000/auth/me', {
    credentials: 'include' // Required for cookies
  })
    .then(res => {
      if (res.ok) return res.json();
      throw new Error('Not authenticated');
    })
    .then(data => {
      setUser(data.user);
      setIsAuthenticated(true);
    })
    .catch(() => {
      setIsAuthenticated(false);
      navigate('/login');
    });
}, []);
```

### Axios Example

```javascript
import axios from 'axios';

// Configure axios to send cookies
axios.defaults.withCredentials = true;

// Get current user
axios.get('http://localhost:4000/auth/me')
  .then(res => {
    console.log('Current user:', res.data.user);
  })
  .catch(err => {
    if (err.response?.status === 401) {
      console.log('Not authenticated');
      // Redirect to login
    }
  });
```

---

## Architecture Benefits

### Before (Manual JWT Verification)
- ❌ 30+ lines of duplicated authentication code
- ❌ Manual JWT verification in every protected route
- ❌ Inconsistent error messages
- ❌ Helper function layer (getUserById) adds complexity

### After (Using authRequired Middleware)
- ✅ 20 lines of focused business logic
- ✅ Authentication handled by reusable middleware
- ✅ Consistent error responses across all protected routes
- ✅ Direct Prisma query to Neon database
- ✅ Type-safe database queries
- ✅ Proper REST semantics (404 for missing resources)

---

## Related Endpoints

- **POST /auth/register** - Create new user account
- **POST /auth/login** - Authenticate and set JWT cookie
- **POST /auth/logout** - Clear JWT cookie
- **GET /auth/me** - Get current user (this endpoint)

---

## Database Query

The route uses this Prisma query:

```javascript
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
```

**Benefits**:
- Type-safe query with auto-completion
- Explicitly selects only needed fields
- Automatically excludes password_hash
- Uses connection pooling
- Handles database errors gracefully

---

## Status

✅ **Complete and Tested**

All tests pass:
- ✅ Uses authRequired middleware
- ✅ Queries Neon for user by req.user.id
- ✅ Returns { user: { id, email, name } }
- ✅ Handles missing authentication (401)
- ✅ Handles user not found (404)
- ✅ Handles server errors (500)

---

## Next Steps

1. ✅ Authentication system complete (register, login, logout, me)
2. ⬜ Replace in-memory stores with Prisma queries
3. ⬜ Update frontend to use new authentication endpoints
4. ⬜ Deploy to production (Render + Neon)

---

*Last Updated: 2025-11-20*  
*Backend: Node + Express + Neon Postgres*  
*Database: Neon Serverless PostgreSQL*
