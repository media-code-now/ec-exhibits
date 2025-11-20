# 🎯 EC-Exhibits Portal - Production Database Setup

## Overview

This guide will help you transition from mock data to a **real Neon Postgres database** for production use.

**Stack:**
- **Backend:** Node.js + Express on Render
- **Database:** Neon Postgres (serverless PostgreSQL)
- **ORM:** Prisma
- **Auth:** JWT + bcrypt password hashing

---

## 📋 Prerequisites

- [Neon account](https://neon.tech) (free tier available)
- Node.js 18+ installed
- Access to Neon SQL Editor or `psql` client

---

## 🚀 Quick Start (5 minutes)

### 1. Create Neon Database

1. Go to [Neon Console](https://console.neon.tech)
2. Click **"Create Project"**
3. Name it: `ec-exhibits-portal`
4. Copy your connection string - it looks like:
   ```
   postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### 2. Run SQL Migrations

Open your Neon SQL Editor and run these files **in order**:

**File 1:** `server/migrations/001_initial_schema.sql`
- Creates all tables (users, projects, stages, tasks, etc.)
- Adds indexes and constraints
- Sets up triggers for `updated_at` fields

**File 2 (Optional):** `server/migrations/002_seed_demo_data.sql`
- Adds 5 demo users
- Creates 2 sample projects
- Includes 2 default templates

### 3. Configure Environment

```bash
# Navigate to server directory
cd server

# Copy environment template
cp .env.example .env

# Edit .env and add your DATABASE_URL
nano .env
```

Update your `.env`:
```env
DATABASE_URL="postgresql://your-neon-connection-string-here"
JWT_SECRET="generate-a-random-32-character-secret"
```

**Generate JWT_SECRET:**
```bash
openssl rand -base64 32
```

### 4. Install Dependencies & Generate Prisma Client

```bash
# Install packages
npm install

# Generate Prisma Client
npm run db:generate

# Verify connection
npm run setup-db
```

### 5. Start Development Server

```bash
npm run dev
```

Server runs on **http://localhost:4000** ✅

---

## 👥 Demo Users (from seed data)

All demo users have password: **`demo123`**

| Email | Role | Name |
|-------|------|------|
| olivia@exhibitcontrol.com | Owner | Olivia Owner |
| samuel@exhibitcontrol.com | Staff | Samuel Staff |
| skyler@exhibitcontrol.com | Staff | Skyler Staff |
| cameron@client.com | Client | Cameron Client |
| callie@client.com | Client | Callie Client |

---

## 📊 Database Schema

### Main Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts with bcrypt passwords |
| `projects` | Exhibit projects |
| `project_members` | User-Project relationships (many-to-many) |
| `stages` | Workflow stages within projects |
| `tasks` | Tasks within stages |
| `uploads` | File uploads |
| `invoices` | Project invoices |
| `messages` | Chat messages |
| `notifications` | User notifications |
| `invites` | Project invitations |
| `templates` | Saved workflow templates |

### Key Features
- **UUID Primary Keys** for scalability
- **Cascade Deletes** for data integrity
- **JSONB Columns** for flexible nested data
- **Indexes** on all foreign keys
- **Auto-updating timestamps** via triggers

View full schema: `server/prisma/schema.prisma`

---

## 🛠️ Prisma Commands

```bash
# Generate Prisma Client (after schema changes)
npm run db:generate

# Open Prisma Studio (visual database browser)
npm run db:studio

# Sync schema to database (dev only)
npm run setup-db

# Pull current database schema
npx prisma db pull
```

---

## 🔐 Authentication Flow

### Current (Demo Mode)
Uses mock users from `lib/users.js` with auto-issued JWT tokens.

### Production Ready (After Migration)
1. **Registration:** Hash password with bcrypt → Store in `users` table
2. **Login:** Compare hashed password → Issue JWT
3. **Protected Routes:** Verify JWT → Load user from database

**Next Steps:**
- Replace `lib/users.js` with Prisma queries
- Add registration endpoint
- Update login to check database
- Add password reset flow

---

## 🚢 Deployment to Render

### Environment Variables

Set these in Render dashboard:

```
DATABASE_URL=<your-neon-connection-string>
JWT_SECRET=<your-32-char-secret>
NODE_ENV=production
ALLOWED_ORIGIN=http://localhost:5173
PROD_ORIGIN=https://your-app.netlify.app
CLIENT_URL=https://your-app.netlify.app
```

### Build Command
```bash
npm install && npx prisma generate
```

### Start Command
```bash
node index.js
```

### Health Check Path
```
/
```

---

## 📁 File Structure

```
server/
├── migrations/
│   ├── 001_initial_schema.sql    # Main database schema
│   └── 002_seed_demo_data.sql    # Demo users & projects
├── prisma/
│   └── schema.prisma              # Prisma model definitions
├── stores/
│   ├── projectStore.js            # → Migrate to Prisma
│   ├── stageStore.js              # → Migrate to Prisma
│   ├── userStore.js               # → Migrate to Prisma
│   └── ...                        # → Migrate to Prisma
├── lib/
│   ├── users.js                   # → Replace with Prisma
│   └── email.js                   # Keep as-is
├── .env.example                   # Environment template
└── index.js                       # Main server file
```

---

## 🔄 Migration Roadmap

### Phase 1: Database Setup ✅
- [x] Create SQL schema
- [x] Set up Prisma
- [x] Configure environment
- [x] Add seed data

### Phase 2: Replace Stores (Next)
- [ ] Update `stores/projectStore.js` → Prisma queries
- [ ] Update `stores/stageStore.js` → Prisma queries
- [ ] Update `stores/userStore.js` → Prisma queries
- [ ] Update `stores/messageStore.js` → Prisma queries
- [ ] Update `stores/notificationStore.js` → Prisma queries
- [ ] Update `stores/invoiceStore.js` → Prisma queries
- [ ] Update `stores/templateStore.js` → Prisma queries

### Phase 3: Authentication
- [ ] Add registration endpoint
- [ ] Update login with database check
- [ ] Add password reset
- [ ] Add email verification

### Phase 4: Production
- [ ] Deploy to Render
- [ ] Configure backups
- [ ] Set up monitoring
- [ ] Performance optimization

---

## 🧪 Testing Database Connection

```javascript
// test-db.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  const users = await prisma.user.findMany();
  console.log('Users:', users);
  await prisma.$disconnect();
}

test();
```

Run:
```bash
node test-db.js
```

---

## 🐛 Troubleshooting

### Connection Issues
**Error:** `Connection refused` or `timeout`
- ✅ Check DATABASE_URL includes `?sslmode=require`
- ✅ Verify connection string from Neon dashboard
- ✅ Check Neon project is active (not suspended)

### Prisma Errors
**Error:** `Prisma Client not found`
```bash
npm run db:generate
```

**Error:** `Schema out of sync`
```bash
npm run setup-db
```

### Demo Login Not Working
**Error:** `User not found`
- ✅ Run seed data: `002_seed_demo_data.sql`
- ✅ Verify users exist: `SELECT * FROM users;` in Neon

### Permission Denied
**Error:** `Permission denied for table`
- ✅ Check Neon role has correct permissions
- ✅ Re-run migrations as database owner

---

## 📚 Resources

- [Neon Documentation](https://neon.tech/docs/introduction)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Render Deployment Guide](https://render.com/docs)
- [JWT Best Practices](https://jwt.io/introduction)

---

## 💡 Tips

1. **Use Prisma Studio** for visual database management
2. **Backup Neon data** before major changes
3. **Use transactions** for multi-table operations
4. **Connection pooling** automatically handled by Prisma
5. **Monitor query performance** in Neon dashboard

---

## 🎉 Success!

If you can:
- ✅ Connect to Neon database
- ✅ See tables in Prisma Studio
- ✅ Login with demo users
- ✅ Create projects

**You're ready for production!** 🚀

---

**Questions?** Check `DATABASE_SETUP.md` for detailed SQL documentation.
