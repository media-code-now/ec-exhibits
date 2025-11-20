# User Data Isolation - Visual Guide

## The Problem: No User Isolation

```
┌─────────────────────────────────────────────────────────┐
│  Before: projects table WITHOUT user_id                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┬─────────────┬───────────┐                │
│  │ id       │ name        │ owner_id  │                │
│  ├──────────┼─────────────┼───────────┤                │
│  │ abc-123  │ Project A   │ user-1    │  ← Anyone     │
│  │ def-456  │ Project B   │ user-2    │  ← can see    │
│  │ ghi-789  │ Project C   │ user-1    │  ← all these! │
│  └──────────┴─────────────┴───────────┘                │
│                                                          │
│  GET /projects → Returns ALL projects (❌ insecure)    │
│  POST /projects → Anyone can create for any user (❌)   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## The Solution: Add user_id Column

```
┌─────────────────────────────────────────────────────────┐
│  After: projects table WITH user_id                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┬─────────────┬─────────┬───────────┐      │
│  │ id       │ name        │ user_id │ owner_id  │      │
│  ├──────────┼─────────────┼─────────┼───────────┤      │
│  │ abc-123  │ Project A   │ user-1  │ user-1    │      │
│  │ def-456  │ Project B   │ user-2  │ user-2    │      │
│  │ ghi-789  │ Project C   │ user-1  │ user-1    │      │
│  └──────────┴─────────────┴─────────┴───────────┘      │
│                   ▲                                      │
│                   │                                      │
│          Foreign Key to users.id                        │
│          CASCADE DELETE                                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## How It Works

### 1. Database Level

```sql
ALTER TABLE projects 
ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
                    ▲                         ▲
                    │                         │
            Foreign Key Constraint    Delete projects when user deleted
```

### 2. Application Level - GET Route

```javascript
// User 1 logs in → req.user.id = "user-1"
app.get('/projects', authRequired, async (req, res) => {
  const projects = await prisma.project.findMany({
    where: {
      userId: req.user.id  // ← "user-1"
    }
  });
  // Returns: [Project A, Project C]  ← Only user-1's projects
});

// User 2 logs in → req.user.id = "user-2"
// Returns: [Project B]  ← Only user-2's projects
```

### 3. Application Level - POST Route

```javascript
// User 1 creates a project
app.post('/projects', authRequired, async (req, res) => {
  const project = await prisma.project.create({
    data: {
      name: req.body.name,
      userId: req.user.id  // ← Automatically set to "user-1"
    }
  });
  // Created project automatically belongs to user-1
});
```

---

## Authentication Flow

```
┌──────────────┐
│   Browser    │
└──────┬───────┘
       │ 1. POST /auth/login
       │    { email, password }
       ▼
┌──────────────┐
│   Express    │  2. Validate credentials
│   Server     │  3. Set JWT cookie
└──────┬───────┘
       │ 4. Response with cookie
       │    Set-Cookie: token=eyJ...
       ▼
┌──────────────┐
│   Browser    │  5. Stores cookie
└──────┬───────┘
       │ 6. GET /projects
       │    Cookie: token=eyJ...
       ▼
┌──────────────┐
│ authRequired │  7. Verify JWT token
│ Middleware   │  8. Set req.user = { id, email, role }
└──────┬───────┘
       │ 9. req.user.id = "user-1"
       ▼
┌──────────────┐
│ GET /projects│  10. Query WHERE userId = "user-1"
│    Route     │  11. Return only user's projects
└──────────────┘
```

---

## Before vs After Comparison

### Before: Insecure

```javascript
// ❌ Anyone can see all projects
app.get('/projects', (req, res) => {
  const projects = projectStore.getAll();
  res.json({ projects });  // Returns ALL projects
});

// ❌ No authentication required
// ❌ No user_id set
app.post('/projects', (req, res) => {
  const project = projectStore.create({
    name: req.body.name
    // Missing: userId
  });
  res.json({ project });
});
```

### After: Secure

```javascript
// ✅ Authentication required
// ✅ Only returns user's projects
app.get('/projects', authRequired, async (req, res) => {
  const projects = await prisma.project.findMany({
    where: {
      userId: req.user.id  // ← Filter by authenticated user
    }
  });
  res.json({ projects });
});

// ✅ Authentication required
// ✅ user_id automatically set
app.post('/projects', authRequired, async (req, res) => {
  const project = await prisma.project.create({
    data: {
      name: req.body.name,
      userId: req.user.id  // ← Automatically assigned
    }
  });
  res.json({ project });
});
```

---

## Multi-User Scenario

```
User 1 (Alice)                User 2 (Bob)
     │                             │
     │ POST /auth/login           │ POST /auth/login
     │ → Cookie: token_alice      │ → Cookie: token_bob
     │                             │
     │ POST /projects             │ POST /projects
     │ { name: "Alice Project" }  │ { name: "Bob Project" }
     │ → userId: alice-id         │ → userId: bob-id
     │                             │
     │ GET /projects              │ GET /projects
     │ → WHERE userId = alice-id  │ → WHERE userId = bob-id
     │                             │
     ▼                             ▼
┌─────────────────┐         ┌─────────────────┐
│ Alice sees:     │         │ Bob sees:       │
│ • Alice Project │         │ • Bob Project   │
│                 │         │                 │
│ (No Bob data!)  │         │ (No Alice data!)│
└─────────────────┘         └─────────────────┘
```

---

## Security Benefits

```
┌─────────────────────────────────────────────────────────┐
│  Database Layer                                          │
├─────────────────────────────────────────────────────────┤
│  ✅ Foreign key constraint (user_id → users.id)         │
│  ✅ CASCADE DELETE (delete projects when user deleted)  │
│  ✅ Index on user_id (fast filtering)                   │
│  ✅ Type safety with UUID                               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Application Layer                                       │
├─────────────────────────────────────────────────────────┤
│  ✅ authRequired middleware (verify JWT)                │
│  ✅ Filter queries by userId: req.user.id               │
│  ✅ Auto-set userId from authenticated user             │
│  ✅ Verify ownership before update/delete               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Result                                                  │
├─────────────────────────────────────────────────────────┤
│  ✅ Complete data isolation between users               │
│  ✅ Users cannot see/modify other users' data           │
│  ✅ Protection against unauthorized access              │
│  ✅ OWASP Top 10 compliance                             │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

```
Step 1: Database Migration
┌────────────────────────────────┐
│ Run SQL in Neon:               │
│ ALTER TABLE projects           │
│ ADD COLUMN user_id UUID        │
│ REFERENCES users(id)           │
│ ON DELETE CASCADE;             │
└────────────────────────────────┘
              │
              ▼
Step 2: Update Prisma Schema
┌────────────────────────────────┐
│ Add to schema.prisma:          │
│ userId String @map("user_id")  │
│ user User @relation(...)       │
└────────────────────────────────┘
              │
              ▼
Step 3: Regenerate Prisma Client
┌────────────────────────────────┐
│ npx prisma generate            │
└────────────────────────────────┘
              │
              ▼
Step 4: Update GET Routes
┌────────────────────────────────┐
│ Add authRequired middleware    │
│ Filter by userId: req.user.id  │
└────────────────────────────────┘
              │
              ▼
Step 5: Update POST Routes
┌────────────────────────────────┐
│ Add authRequired middleware    │
│ Set userId: req.user.id        │
└────────────────────────────────┘
              │
              ▼
Step 6: Test with Multiple Users
┌────────────────────────────────┐
│ Login as user 1                │
│ Create projects                │
│ Login as user 2                │
│ Verify isolation               │
└────────────────────────────────┘
```

---

## Quick Test

```bash
# Terminal 1: User 1
curl -c user1.txt -X POST http://localhost:4000/auth/login \
  -d '{"email":"alice@example.com","password":"pass123"}'

curl -b user1.txt -X POST http://localhost:4000/projects \
  -d '{"name":"Alice Project"}'

curl -b user1.txt http://localhost:4000/projects
# Returns: [Alice Project]

# Terminal 2: User 2
curl -c user2.txt -X POST http://localhost:4000/auth/login \
  -d '{"email":"bob@example.com","password":"pass456"}'

curl -b user2.txt http://localhost:4000/projects
# Returns: [] (empty - cannot see Alice's project!)
```

---

## Summary

| Feature | Before | After |
|---------|--------|-------|
| Authentication | ❌ Optional | ✅ Required |
| Data Isolation | ❌ None | ✅ Complete |
| user_id Column | ❌ Missing | ✅ Present |
| Foreign Key | ❌ None | ✅ References users.id |
| Auto-Assignment | ❌ Manual | ✅ Automatic |
| Security | ❌ Vulnerable | ✅ Secure |

**Result**: Complete user data isolation with automatic user_id assignment! 🔒

---

*See USER_ISOLATION_GUIDE.md for complete code examples*  
*See migrations/003_add_user_id_to_projects.sql for SQL*
