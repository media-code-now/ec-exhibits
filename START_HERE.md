# 🎯 NEXT STEPS - Make It Functional

You now have a **production-ready database schema** set up! Here's what to do next:

---

## ✅ What's Done

1. **Database Schema** - 15 tables with proper relationships
2. **Prisma ORM** - Type-safe database client
3. **Migrations** - SQL files ready to run
4. **Demo Data** - 5 users, 2 projects, 2 templates
5. **Documentation** - Complete setup guides

---

## 🚀 ACTION PLAN

### Step 1: Set Up Neon Database (5 minutes)

```bash
# 1. Go to https://console.neon.tech
# 2. Create project: "ec-exhibits"
# 3. Copy connection string
# 4. Open Neon SQL Editor
# 5. Run: server/migrations/001_initial_schema.sql
# 6. Run: server/migrations/002_seed_demo_data.sql
```

### Step 2: Configure Your Server (2 minutes)

```bash
cd server

# Copy environment template
cp .env.example .env

# Edit and add your DATABASE_URL
nano .env
```

Paste your Neon connection string:
```env
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
JWT_SECRET="your-random-secret-here"
```

Generate JWT secret:
```bash
openssl rand -base64 32
```

### Step 3: Install Dependencies (2 minutes)

```bash
# Install Prisma and bcrypt
npm install

# Generate Prisma Client
npm run db:generate

# Verify connection
npm run setup-db
```

### Step 4: Test It! (1 minute)

```bash
# Start server
npm run dev

# Open Prisma Studio (in another terminal)
npm run db:studio
```

**Server:** http://localhost:4000
**Prisma Studio:** http://localhost:5555

**Login with:**
- Email: `olivia@exhibitcontrol.com`
- Password: `demo123`

---

## 📋 TO-DO: Make It Functional

Your server currently uses **in-memory Maps**. To make it truly functional with the database:

### Priority 1: Replace User Store

**File:** `server/lib/users.js`

Replace with Prisma queries:
```javascript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function getUser(id) {
  return await prisma.user.findUnique({ where: { id } });
}

export async function getUserByEmail(email) {
  return await prisma.user.findUnique({ where: { email } });
}

export async function listUsers() {
  return await prisma.user.findMany();
}
```

### Priority 2: Add Real Authentication

**File:** `server/index.js` (add new endpoints)

```javascript
import bcrypt from 'bcrypt';

// Registration
app.post('/auth/register', async (req, res) => {
  const { email, password, displayName, role } = req.body;
  
  const passwordHash = await bcrypt.hash(password, 10);
  
  const user = await prisma.user.create({
    data: { email, passwordHash, displayName, role }
  });
  
  const token = issueToken(user);
  res.json({ token, user });
});

// Login
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  
  const token = issueToken(user);
  res.json({ token, user });
});
```

### Priority 3: Update Project Store

**File:** `server/stores/projectStore.js`

```javascript
export const projectStore = {
  async listForUser(userId) {
    return await prisma.project.findMany({
      where: {
        members: { some: { userId } }
      },
      include: { members: { include: { user: true } } }
    });
  },
  
  async get(projectId) {
    return await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: { include: { user: true } } }
    });
  },
  
  async create(data) {
    return await prisma.project.create({
      data: {
        ...data,
        members: {
          create: [
            { userId: data.ownerId, role: 'owner' },
            ...data.clientIds.map(id => ({ userId: id, role: 'client' })),
            ...data.staffIds.map(id => ({ userId: id, role: 'staff' }))
          ]
        }
      },
      include: { members: { include: { user: true } } }
    });
  }
};
```

### Priority 4: Update Stage Store

**File:** `server/stores/stageStore.js`

```javascript
export const stageStore = {
  async seedProjectStages(projectId) {
    const template = await this.getTemplateDefinition();
    
    for (const [index, stageTemplate] of template.entries()) {
      await prisma.stage.create({
        data: {
          projectId,
          templateSlug: stageTemplate.slug,
          name: stageTemplate.name,
          description: stageTemplate.description,
          status: index === 0 ? 'in_progress' : 'not_started',
          permissions: stageTemplate.permissions,
          position: index,
          tasks: {
            create: stageTemplate.tasks.map((task, taskIndex) => ({
              templateSlug: task.slug,
              title: task.title,
              ownerRole: task.ownerRole,
              requiresClientInput: task.requiresClientInput,
              position: taskIndex
            }))
          }
        }
      });
    }
  },
  
  async list(projectId) {
    return await prisma.stage.findMany({
      where: { projectId },
      include: { tasks: true, toggles: true },
      orderBy: { position: 'asc' }
    });
  }
};
```

---

## 🎯 Quick Win: Test Database Connection

Create `server/test-db.js`:

```javascript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Testing database connection...\n');
  
  const users = await prisma.user.findMany();
  console.log(`✅ Found ${users.length} users:`);
  users.forEach(u => console.log(`   - ${u.displayName} (${u.email})`));
  
  const projects = await prisma.project.findMany();
  console.log(`\n✅ Found ${projects.length} projects:`);
  projects.forEach(p => console.log(`   - ${p.name}`));
  
  const templates = await prisma.template.findMany();
  console.log(`\n✅ Found ${templates.length} templates:`);
  templates.forEach(t => console.log(`   - ${t.name} (${t.stageCount} stages)`));
  
  await prisma.$disconnect();
  console.log('\n✅ Connection successful!');
}

main().catch(console.error);
```

Run it:
```bash
node server/test-db.js
```

---

## 📚 Documentation Reference

| Guide | When to Use |
|-------|-------------|
| `QUICKSTART.md` | Setting up Neon for first time |
| `PRODUCTION_SETUP.md` | Complete deployment guide |
| `DATABASE_SETUP.md` | SQL schema details |
| `DATABASE_README.md` | Overview of what's created |

---

## 🎉 You're Ready!

**What you have:**
- ✅ Production database schema
- ✅ Demo data loaded
- ✅ Prisma ORM configured
- ✅ Complete documentation

**What's next:**
1. Set up Neon (5 min)
2. Run migrations (1 min)
3. Test connection (1 min)
4. Start replacing stores with Prisma queries

**Start here:** Open `QUICKSTART.md` → Follow Step 1

---

**Need help?** All documentation includes troubleshooting sections!
