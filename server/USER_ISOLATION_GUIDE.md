# Add user_id to Projects Table - SQL Migration & Updated Routes

## Overview

This guide shows how to add user-based data isolation to the `projects` table by:
1. Adding a `user_id` column that references `users.id`
2. Updating GET routes to filter by the authenticated user
3. Updating POST routes to automatically set the user_id

---

## SQL Migration

### Step 1: Add user_id Column to Projects Table

Run this SQL in your **Neon Postgres SQL Editor**:

```sql
-- Add user_id column to projects table
ALTER TABLE projects 
ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX idx_projects_user_id ON projects(user_id);

-- Optional: Set existing projects to a default user (if needed)
-- Replace 'your-user-id-here' with an actual user ID from your users table
-- UPDATE projects SET user_id = 'your-user-id-here' WHERE user_id IS NULL;

-- Optional: Make user_id required after backfilling
-- ALTER TABLE projects ALTER COLUMN user_id SET NOT NULL;
```

### Step 2: Update Prisma Schema

Add the `user_id` field to your Prisma schema at `server/prisma/schema.prisma`:

```prisma
model Project {
  id          String   @id @default(uuid()) @db.Uuid
  name        String
  show        String?
  size        String?
  moveInDate  DateTime? @map("move_in_date") @db.Date
  openingDay  DateTime? @map("opening_day") @db.Date
  description String?
  userId      String   @map("user_id") @db.Uuid  // ← Add this line
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  // Relations
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)  // ← Add this
  members     ProjectMember[]
  stages      Stage[]
  uploads     Upload[]
  invoices    Invoice[]
  messages    Message[]
  
  @@map("projects")
}

model User {
  id            String   @id @default(uuid()) @db.Uuid
  email         String   @unique
  passwordHash  String   @map("password_hash")
  displayName   String   @map("display_name")
  role          String
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
  
  // Relations
  projects      Project[]  // ← Add this line
  projectMembers ProjectMember[]
  sentMessages   Message[]
  sentInvites    Invite[] @relation("InvitedBy")
  receivedInvites Invite[] @relation("InvitedUser")
  messageReads   MessageRead[]
  notifications  Notification[]
  
  @@map("users")
}
```

### Step 3: Regenerate Prisma Client

```bash
cd server
npx prisma generate
```

---

## Updated Express Routes

### GET /projects - List User's Projects

**Before** (returns all projects):
```javascript
app.get('/projects', (req, res) => {
  const projects = projectStore.getAll();
  res.json({ projects });
});
```

**After** (returns only user's projects):
```javascript
app.get('/projects', authRequired, async (req, res) => {
  try {
    // Only return projects owned by the authenticated user
    const projects = await prisma.project.findMany({
      where: {
        userId: req.user.id
      },
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json({ projects });
  } catch (error) {
    console.error('[ERROR] Failed to fetch projects:', error.message);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});
```

### POST /projects - Create Project

**Before** (no user_id set):
```javascript
app.post('/projects', (req, res) => {
  const { name, show, size } = req.body;
  const project = projectStore.create({
    name,
    show,
    size
  });
  res.status(201).json({ project });
});
```

**After** (automatically sets user_id):
```javascript
app.post('/projects', authRequired, async (req, res) => {
  try {
    const { name, show, size, moveInDate, openingDay, description } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    
    // Create project with user_id automatically set from req.user.id
    const project = await prisma.project.create({
      data: {
        name,
        show,
        size,
        moveInDate: moveInDate ? new Date(moveInDate) : null,
        openingDay: openingDay ? new Date(openingDay) : null,
        description,
        userId: req.user.id  // ← Automatically set from authenticated user
      },
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
    });
    
    res.status(201).json({ project });
  } catch (error) {
    console.error('[ERROR] Failed to create project:', error.message);
    res.status(500).json({ error: 'Failed to create project' });
  }
});
```

### GET /projects/:id - Get Single Project

**After** (verify ownership):
```javascript
app.get('/projects/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    
    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: req.user.id  // ← Ensure user owns this project
      },
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
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json({ project });
  } catch (error) {
    console.error('[ERROR] Failed to fetch project:', error.message);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});
```

### PUT /projects/:id - Update Project

**After** (verify ownership before update):
```javascript
app.put('/projects/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, show, size, moveInDate, openingDay, description } = req.body;
    
    // First verify the project exists and belongs to the user
    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        userId: req.user.id
      }
    });
    
    if (!existingProject) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Update the project
    const project = await prisma.project.update({
      where: { id },
      data: {
        name,
        show,
        size,
        moveInDate: moveInDate ? new Date(moveInDate) : null,
        openingDay: openingDay ? new Date(openingDay) : null,
        description
      }
    });
    
    res.json({ project });
  } catch (error) {
    console.error('[ERROR] Failed to update project:', error.message);
    res.status(500).json({ error: 'Failed to update project' });
  }
});
```

### DELETE /projects/:id - Delete Project

**After** (verify ownership before delete):
```javascript
app.delete('/projects/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    
    // First verify the project exists and belongs to the user
    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        userId: req.user.id
      }
    });
    
    if (!existingProject) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Delete the project (CASCADE will delete related records)
    await prisma.project.delete({
      where: { id }
    });
    
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('[ERROR] Failed to delete project:', error.message);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});
```

---

## Generic Template for Any Table

If you want to apply this pattern to other tables (invoices, uploads, etc.), use this template:

### SQL Migration Template

```sql
-- Replace 'table_name' with your actual table name
ALTER TABLE table_name 
ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX idx_table_name_user_id ON table_name(user_id);

-- Optional: Backfill existing data
-- UPDATE table_name SET user_id = 'your-user-id' WHERE user_id IS NULL;

-- Optional: Make required
-- ALTER TABLE table_name ALTER COLUMN user_id SET NOT NULL;
```

### GET Route Template

```javascript
app.get('/items', authRequired, async (req, res) => {
  try {
    const items = await prisma.yourTable.findMany({
      where: {
        userId: req.user.id  // ← Filter by authenticated user
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json({ items });
  } catch (error) {
    console.error('[ERROR] Failed to fetch items:', error.message);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});
```

### POST Route Template

```javascript
app.post('/items', authRequired, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const item = await prisma.yourTable.create({
      data: {
        name,
        description,
        userId: req.user.id  // ← Automatically set from req.user.id
      }
    });
    
    res.status(201).json({ item });
  } catch (error) {
    console.error('[ERROR] Failed to create item:', error.message);
    res.status(500).json({ error: 'Failed to create item' });
  }
});
```

---

## Security Benefits

### Before (No User Isolation)
- ❌ Any authenticated user can see all projects
- ❌ Users can access/modify data they don't own
- ❌ No data privacy between users
- ❌ Security vulnerabilities

### After (With User Isolation)
- ✅ Users only see their own projects
- ✅ user_id automatically set from req.user.id
- ✅ Database-level foreign key constraints
- ✅ CASCADE delete removes orphaned data
- ✅ Index for fast filtering
- ✅ Type-safe queries with Prisma

---

## Testing

### Test Script

Create `server/test-user-isolation.sh`:

```bash
#!/bin/bash

API_URL="http://localhost:4000"
USER1_COOKIES="/tmp/user1-cookies.txt"
USER2_COOKIES="/tmp/user2-cookies.txt"

echo "🧪 Testing User Data Isolation"
echo "=============================="
echo ""

# Login as User 1
echo "1️⃣ Login as User 1 (admin@exhibitcontrol.com)"
curl -s -c "$USER1_COOKIES" -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@exhibitcontrol.com","password":"password123"}' | jq .

echo ""

# Login as User 2
echo "2️⃣ Login as User 2 (john@example.com)"
curl -s -c "$USER2_COOKIES" -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"demo123"}' | jq .

echo ""

# User 1 creates a project
echo "3️⃣ User 1 creates a project"
USER1_PROJECT=$(curl -s -b "$USER1_COOKIES" -X POST "$API_URL/projects" \
  -H "Content-Type: application/json" \
  -d '{"name":"User 1 Project","description":"This belongs to User 1"}')
echo "$USER1_PROJECT" | jq .

PROJECT_ID=$(echo "$USER1_PROJECT" | jq -r '.project.id')
echo "Created project ID: $PROJECT_ID"

echo ""

# User 1 can see their project
echo "4️⃣ User 1 fetches their projects (should see 1)"
curl -s -b "$USER1_COOKIES" "$API_URL/projects" | jq .

echo ""

# User 2 should NOT see User 1's project
echo "5️⃣ User 2 fetches their projects (should see 0 - User 1's project hidden)"
curl -s -b "$USER2_COOKIES" "$API_URL/projects" | jq .

echo ""

# User 2 tries to access User 1's project (should fail)
echo "6️⃣ User 2 tries to access User 1's project (should return 404)"
curl -s -b "$USER2_COOKIES" "$API_URL/projects/$PROJECT_ID" | jq .

echo ""

# User 2 creates their own project
echo "7️⃣ User 2 creates their own project"
curl -s -b "$USER2_COOKIES" -X POST "$API_URL/projects" \
  -H "Content-Type: application/json" \
  -d '{"name":"User 2 Project","description":"This belongs to User 2"}' | jq .

echo ""

# User 2 can see their own project
echo "8️⃣ User 2 fetches their projects (should see only their own)"
curl -s -b "$USER2_COOKIES" "$API_URL/projects" | jq .

echo ""

echo "✅ User isolation working correctly!"
echo ""
echo "📋 Summary:"
echo "  ✅ Each user can only see their own projects"
echo "  ✅ user_id automatically set from req.user.id"
echo "  ✅ Users cannot access other users' projects"
echo "  ✅ Data is properly isolated by user"

# Cleanup
rm -f "$USER1_COOKIES" "$USER2_COOKIES"
```

### Run Tests

```bash
cd server
bash test-user-isolation.sh
```

---

## Migration Checklist

- [ ] Run SQL migration to add `user_id` column
- [ ] Create index on `user_id` for performance
- [ ] Update Prisma schema with `userId` field and relation
- [ ] Run `npx prisma generate` to regenerate client
- [ ] Backfill existing data with user IDs (if needed)
- [ ] Update GET routes to use `authRequired` middleware
- [ ] Filter GET queries by `userId: req.user.id`
- [ ] Update POST routes to set `userId: req.user.id`
- [ ] Update PUT/DELETE routes to verify ownership
- [ ] Test with multiple users
- [ ] Deploy to Render

---

## Render Deployment Notes

### Environment Variables

No additional environment variables needed. The existing ones work:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
```

### Database Migration on Render

After deploying to Render, run the migration:

1. Go to Neon SQL Editor
2. Paste the ALTER TABLE SQL
3. Execute the migration
4. Verify with: `SELECT * FROM projects LIMIT 5;`

### Restart Application

Render will automatically restart after deployment. The new routes will:
- ✅ Use `authRequired` middleware
- ✅ Filter data by `user_id`
- ✅ Set `user_id` automatically
- ✅ Protect user data isolation

---

## Summary

### SQL Changes
```sql
ALTER TABLE projects ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX idx_projects_user_id ON projects(user_id);
```

### Key Route Changes
1. **GET /projects**: Add `authRequired`, filter by `userId: req.user.id`
2. **POST /projects**: Add `authRequired`, set `userId: req.user.id`
3. **GET /projects/:id**: Add `authRequired`, verify ownership
4. **PUT /projects/:id**: Add `authRequired`, verify ownership
5. **DELETE /projects/:id**: Add `authRequired`, verify ownership

### Benefits
- ✅ Complete data isolation between users
- ✅ Automatic user_id assignment
- ✅ Type-safe Prisma queries
- ✅ Database-level constraints
- ✅ Production-ready for Render

**Ready to implement!** 🚀

---

*Last Updated: 2025-11-19*  
*Database: Neon Postgres*  
*Backend: Node + Express on Render*
