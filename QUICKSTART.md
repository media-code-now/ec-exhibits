# 🎯 Quick Start - Production Database Setup

## 1️⃣ Create Neon Database (2 minutes)

1. Go to **https://console.neon.tech**
2. Click **"New Project"** → Name: `ec-exhibits`
3. Copy your connection string

## 2️⃣ Run SQL Migrations (1 minute)

In Neon SQL Editor, paste and run:

### Migration 1: Schema
```sql
-- Copy entire contents of: server/migrations/001_initial_schema.sql
-- This creates all tables, indexes, and triggers
```

### Migration 2: Demo Data (optional)
```sql
-- Copy entire contents of: server/migrations/002_seed_demo_data.sql
-- This adds 5 demo users and 2 sample projects
```

## 3️⃣ Configure Environment (1 minute)

```bash
cd server
cp .env.example .env
nano .env
```

Update:
```env
DATABASE_URL="your-neon-connection-string-here"
JWT_SECRET="$(openssl rand -base64 32)"
```

## 4️⃣ Install & Start (1 minute)

```bash
# Install dependencies
npm install

# Generate Prisma Client
npm run db:generate

# Start server
npm run dev
```

✅ **Server running on http://localhost:4000**

## 5️⃣ Login with Demo User

- Email: `olivia@exhibitcontrol.com`
- Password: `demo123`

---

## 🎉 That's it!

**Full documentation:** See `PRODUCTION_SETUP.md`

**View database:** Run `npm run db:studio`

**Deploy to Render:** See deployment section in `PRODUCTION_SETUP.md`
