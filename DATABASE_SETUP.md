# EC-Exhibits Portal - Database Setup Guide

## 🚀 Quick Start with Neon Postgres

### Step 1: Create Neon Database

1. Go to [Neon Console](https://console.neon.tech)
2. Create a new project: "EC-Exhibits Portal"
3. Copy your connection string (it looks like this):
   ```
   postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### Step 2: Run SQL Migrations

In your Neon SQL Editor (or using `psql`), run these files in order:

```bash
# 1. Create all tables and indexes
# Copy/paste contents of: server/migrations/001_initial_schema.sql

# 2. Insert demo users and data (optional for development)
# Copy/paste contents of: server/migrations/002_seed_demo_data.sql
```

**Demo Users (password: `demo123`):**
- `olivia@exhibitcontrol.com` - Owner
- `samuel@exhibitcontrol.com` - Staff
- `skyler@exhibitcontrol.com` - Staff
- `cameron@client.com` - Client
- `callie@client.com` - Client

### Step 3: Install Prisma

```bash
cd server
npm install @prisma/client prisma bcrypt
npm install -D @types/bcrypt
```

### Step 4: Configure Environment

```bash
# Copy the example env file
cp .env.example .env

# Edit .env and add your Neon connection string
nano .env
```

Update `.env`:
```env
DATABASE_URL="postgresql://your-connection-string-from-neon"
JWT_SECRET="your-random-secret-at-least-32-chars"
```

### Step 5: Generate Prisma Client

```bash
npx prisma generate
```

### Step 6: Verify Connection

```bash
npx prisma db push
```

This should show "Database is already in sync" if migrations ran correctly.

---

## 🔧 Prisma Commands

```bash
# Generate Prisma Client after schema changes
npx prisma generate

# Open Prisma Studio to browse/edit data
npx prisma studio

# Sync schema without migrations (dev only)
npx prisma db push

# View current database schema
npx prisma db pull
```

---

## 📊 Database Schema Overview

### Core Tables:
- **users** - User accounts with authentication
- **projects** - Exhibit projects
- **project_members** - Many-to-many user ↔ project relationship
- **stages** - Project workflow stages
- **tasks** - Tasks within stages
- **toggles** - Checklist items
- **uploads** - File uploads
- **invoices** - Project invoices
- **messages** - Project chat messages
- **notifications** - User notifications
- **invites** - Project invitations
- **templates** - Saved workflow templates

### Key Features:
- UUID primary keys
- Cascade deletes for data integrity
- Indexes on foreign keys for performance
- JSONB columns for flexible data (permissions, stages)
- Timestamps with automatic updates

---

## 🔐 Password Hashing

Demo users use bcrypt with 10 rounds:
```javascript
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash('demo123', 10);
```

---

## 🚢 Deployment to Render

### Environment Variables on Render:

```
DATABASE_URL=<your-neon-connection-string>
JWT_SECRET=<generate-random-32-char-string>
ALLOWED_ORIGIN=http://localhost:5173
PROD_ORIGIN=https://your-app.netlify.app
CLIENT_URL=https://your-app.netlify.app
NODE_ENV=production
```

### Build Command:
```bash
npm install && npx prisma generate
```

### Start Command:
```bash
node index.js
```

---

## 📝 Migration Tips

1. **Always backup** before running migrations in production
2. Run migrations in Neon SQL Editor for visibility
3. Test with demo data first (002_seed_demo_data.sql)
4. Use `npx prisma studio` to verify data after migration
5. Keep `.env` out of git (already in .gitignore)

---

## 🔍 Troubleshooting

**Connection failed?**
- Check DATABASE_URL format includes `?sslmode=require`
- Verify IP allowlist in Neon (should allow all by default)
- Ensure connection string has correct password

**Prisma errors?**
- Run `npx prisma generate` after schema changes
- Delete `node_modules/.prisma` and regenerate if issues persist

**Demo login not working?**
- Verify seed data ran: `SELECT * FROM users;` in Neon
- Password for all demo users is `demo123`

---

## 📚 Next Steps

After database setup:
1. Update `server/stores/*` to use Prisma instead of Maps
2. Implement real authentication endpoints
3. Add proper error handling and validation
4. Set up production backups on Neon
5. Configure connection pooling for Render

---

**Need help?** Check Neon docs: https://neon.tech/docs/introduction
