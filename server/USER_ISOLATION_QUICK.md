# Quick Reference: Add user_id to Projects

## 1. SQL Migration (Run in Neon)

```sql
ALTER TABLE projects 
ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX idx_projects_user_id ON projects(user_id);
```

---

## 2. Updated Express Routes

### GET /projects (Filter by user)

```javascript
app.get('/projects', authRequired, async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        userId: req.user.id  // ← Only return user's projects
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ projects });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});
```

### POST /projects (Auto-set user_id)

```javascript
app.post('/projects', authRequired, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const project = await prisma.project.create({
      data: {
        name,
        description,
        userId: req.user.id  // ← Automatically set from auth
      }
    });
    
    res.status(201).json({ project });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});
```

### GET /projects/:id (Verify ownership)

```javascript
app.get('/projects/:id', authRequired, async (req, res) => {
  try {
    const project = await prisma.project.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id  // ← Verify ownership
      }
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json({ project });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});
```

### PUT /projects/:id (Verify ownership before update)

```javascript
app.put('/projects/:id', authRequired, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Verify ownership first
    const existing = await prisma.project.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Update project
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { name, description }
    });
    
    res.json({ project });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});
```

### DELETE /projects/:id (Verify ownership before delete)

```javascript
app.delete('/projects/:id', authRequired, async (req, res) => {
  try {
    // Verify ownership first
    const existing = await prisma.project.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Delete project
    await prisma.project.delete({
      where: { id: req.params.id }
    });
    
    res.json({ message: 'Project deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});
```

---

## 3. Update Prisma Schema

Add to `server/prisma/schema.prisma`:

```prisma
model Project {
  // ... existing fields ...
  userId      String   @map("user_id") @db.Uuid  // ← Add this
  
  // Relations
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)  // ← Add this
  // ... other relations ...
  
  @@map("projects")
}

model User {
  // ... existing fields ...
  
  // Relations
  projects    Project[]  // ← Add this
  // ... other relations ...
  
  @@map("users")
}
```

Then run:
```bash
cd server
npx prisma generate
```

---

## Key Points

✅ **GET routes**: Add `authRequired`, filter by `userId: req.user.id`  
✅ **POST routes**: Add `authRequired`, set `userId: req.user.id`  
✅ **PUT/DELETE routes**: Verify ownership with `findFirst` before updating  
✅ **Security**: Users can only access their own data  

---

*See USER_ISOLATION_GUIDE.md for complete examples and testing*
