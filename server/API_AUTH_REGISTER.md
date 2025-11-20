# POST /auth/register - User Registration API

## Overview
Backend: Node + Express on Render, Neon Postgres, bcrypt

## Endpoint
```
POST /auth/register
```

## Request

### Headers
```
Content-Type: application/json
```

### Body Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | Yes | User's email address (must be unique) |
| `password` | string | Yes | User's password (will be hashed with bcrypt) |
| `displayName` | string | Yes | User's display name |
| `role` | string | No | User role: 'owner', 'staff', or 'client' (default: 'client') |

### Example Request
```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securePassword123",
    "displayName": "John Doe",
    "role": "staff"
  }'
```

## Response

### Success Response (201 Created)
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "21481035-fdf0-42a2-8723-cd6c0a7e98d8",
    "email": "john@example.com",
    "displayName": "John Doe",
    "role": "staff",
    "createdAt": "2025-11-20T06:53:18.910Z",
    "updatedAt": "2025-11-20T06:53:18.910Z"
  }
}
```

### Error Responses

#### 400 Bad Request - Missing Fields
```json
{
  "error": "Email, password, and display name are required"
}
```

#### 400 Bad Request - Duplicate Email
```json
{
  "error": "User with this email already exists"
}
```

#### 400 Bad Request - Invalid Role
```json
{
  "error": "Invalid role. Must be owner, staff, or client"
}
```

## Implementation Details

### 1. Validation
- ✅ Validates that `email`, `password`, and `displayName` exist
- ✅ Validates that `role` is one of: 'owner', 'staff', 'client'

### 2. Duplicate Check
- ✅ Checks if email already exists in the `users` table
- ✅ Returns error if email is taken

### 3. Password Hashing
- ✅ Hashes password with **bcrypt** (10 salt rounds)
- ✅ Stores only the `password_hash`, never plain text

### 4. Database Insert
- ✅ Inserts new user into `users` table with:
  - `id` (UUID, auto-generated)
  - `email` (unique)
  - `password_hash` (bcrypt hash)
  - `display_name`
  - `role`
  - `created_at` (timestamp)
  - `updated_at` (timestamp)

### 5. Response
- ✅ Returns JSON with:
  - `user` object containing: `id`, `email`, `displayName`, `role`, `createdAt`, `updatedAt`
  - `token` (JWT for immediate authentication)
  - `success: true` flag
- ✅ **Does NOT return** `password_hash` in response

## Code Structure

### Route Handler (`server/index.js`)
```javascript
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, displayName, role } = req.body;

    // Validate required fields
    if (!email || !password || !displayName) {
      return res.status(400).json({ 
        error: 'Email, password, and display name are required' 
      });
    }

    // Call auth helper to register user
    const user = await registerUser({ email, password, displayName, role });
    
    // Issue JWT token for immediate login
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
```

### Auth Helper (`server/lib/auth.js`)
```javascript
export async function registerUser({ email, password, displayName, role = 'client' }) {
  // 1. Validate input
  if (!email || !password || !displayName) {
    throw new Error('Email, password, and display name are required');
  }

  if (!['owner', 'staff', 'client'].includes(role)) {
    throw new Error('Invalid role. Must be owner, staff, or client');
  }

  // 2. Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // 3. Hash password with bcrypt (10 salt rounds)
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // 4. Insert user into database
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName,
      role
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      createdAt: true,
      updatedAt: true
      // NOTE: passwordHash is NOT selected (security)
    }
  });

  return user;
}
```

### Database Helper (`server/lib/db.js`)
```javascript
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

// Prisma Client with Neon Postgres connection
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
```

## Database Schema

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'staff', 'client')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Security Features

- ✅ **Password Hashing**: bcrypt with 10 salt rounds
- ✅ **No Plain Text Storage**: Only stores `password_hash`
- ✅ **No Password in Response**: `password_hash` excluded from API response
- ✅ **Email Validation**: Checks for duplicates before insert
- ✅ **Input Validation**: Validates all required fields
- ✅ **Role Validation**: Enforces valid role values
- ✅ **SQL Injection Protection**: Prisma ORM provides parameterized queries
- ✅ **JWT Token**: Returns token for immediate authenticated access

## Testing

Run the comprehensive test suite:
```bash
cd server
./test-register.sh
```

Or test manually:
```bash
# Register a new user
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","displayName":"Test User"}'

# Verify in database
node test-db.js
```

## Environment Variables Required

```bash
DATABASE_URL="postgresql://user:password@host.neon.tech/database?sslmode=require"
JWT_SECRET="your-secret-key-here"
```

## Notes

- The route is **publicly accessible** (no authentication required to register)
- After registration, user receives a JWT token for immediate login
- Password must meet your application's security requirements (consider adding validation)
- Email is case-sensitive in the current implementation
- Default role is 'client' if not specified
