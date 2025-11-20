# 🚀 Neon Database Setup - Visual Guide

## 📋 Overview

This guide will help you set up a production Neon Postgres database in **5 minutes**.

---

## 🎯 Step-by-Step Instructions

### **Step 1: Run the Setup Script**

```bash
# From project root
./setup-neon.sh
```

This interactive script will guide you through the entire process!

**OR follow the manual steps below:**

---

### **Step 2: Create Neon Account & Project**

#### 2.1 Go to Neon Console
Open: **https://console.neon.tech**

#### 2.2 Sign Up / Log In
- Free tier available (no credit card required)
- Sign in with GitHub, Google, or email

#### 2.3 Create New Project
Click the **"New Project"** button

Fill in:
- **Name:** `ec-exhibits`
- **Region:** Choose closest to your location
- **Postgres version:** 15 or 16 (default)

Click **"Create Project"**

#### 2.4 Get Connection String
After project creation:
1. Click on your **"ec-exhibits"** project
2. Go to **"Connection Details"** or **"Dashboard"**
3. Find the **"Connection string"** section
4. Copy the full string (should include `?sslmode=require`)

**Example format:**
```
postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

---

### **Step 3: Configure Environment**

#### 3.1 Open your `.env` file
```bash
cd server
nano .env
```

#### 3.2 Update the DATABASE_URL
Replace the placeholder with your actual Neon connection string:

```env
DATABASE_URL="postgresql://your-actual-connection-string-here"
```

Save and close (`Ctrl+X`, then `Y`, then `Enter`)

---

### **Step 4: Run SQL Migrations in Neon**

#### 4.1 Open Neon SQL Editor
1. Go back to **https://console.neon.tech**
2. Click on your **"ec-exhibits"** project
3. Click **"SQL Editor"** in the left sidebar (or **"Query"** tab)

#### 4.2 Run First Migration (Create Tables)

**File:** `server/migrations/001_initial_schema.sql`

1. Open the file in your code editor
2. **Copy ALL contents** (it's a long file - make sure you get everything!)
3. Paste into Neon SQL Editor
4. Click **"Run"** button
5. Wait for success message (should see "Query executed successfully")

**This creates 15 tables, indexes, and triggers**

#### 4.3 Run Second Migration (Add Demo Data)

**File:** `server/migrations/002_seed_demo_data.sql`

1. Open the file in your code editor
2. **Copy ALL contents**
3. Paste into Neon SQL Editor
4. Click **"Run"** button
5. Wait for success message

**This adds:**
- 5 demo users
- 2 sample projects
- 2 workflow templates

---

### **Step 5: Generate Prisma Client**

```bash
cd server

# Install dependencies (if not already done)
npm install

# Generate Prisma Client
npx prisma generate
```

You should see:
```
✔ Generated Prisma Client
```

---

### **Step 6: Test Database Connection**

#### Option A: Use Prisma Studio (Visual)
```bash
cd server
npx prisma studio
```

Opens at **http://localhost:5555** - browse your database visually!

#### Option B: Quick CLI Test
```bash
cd server
node -e "import('@prisma/client').then(({PrismaClient})=>{const p=new PrismaClient();p.user.findMany().then(u=>{console.log(u.length+' users found');p.\$disconnect();})})"
```

---

### **Step 7: Restart Your Servers**

Now your app will use the real database!

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

Visit: **http://localhost:5173**

---

## 🎉 Success! You Can Now:

### **Login with Demo Users**

| Email | Password | Role |
|-------|----------|------|
| olivia@exhibitcontrol.com | demo123 | Owner |
| samuel@exhibitcontrol.com | demo123 | Staff |
| cameron@client.com | demo123 | Client |

### **What Changed?**

✅ **Before:** Data stored in memory (resets on restart)
✅ **After:** Data persisted in Neon Postgres database

### **Key Benefits:**

- ✅ Data persists across server restarts
- ✅ Real user accounts with password hashing
- ✅ Multi-user support (users don't share data)
- ✅ Production-ready architecture
- ✅ Can deploy to Render/Vercel/Netlify

---

## 🔍 Verify Setup

### Check Users Table
```bash
cd server
npx prisma studio
```

Click on **"user"** table - you should see 5 users

### Check Projects Table
Click on **"project"** table - you should see 2 projects

### Check Templates Table
Click on **"template"** table - you should see 2 templates

---

## 🐛 Troubleshooting

### Error: "Connection refused" or "timeout"

**Cause:** DATABASE_URL incorrect or Neon project suspended

**Fix:**
1. Verify DATABASE_URL in `server/.env`
2. Check Neon project is active in console
3. Make sure connection string includes `?sslmode=require`

### Error: "Relation 'users' does not exist"

**Cause:** Migrations not run or failed

**Fix:**
1. Go to Neon SQL Editor
2. Run `SELECT * FROM users;`
3. If error, re-run `001_initial_schema.sql`
4. Then run `002_seed_demo_data.sql`

### Error: "Prisma Client not found"

**Cause:** Prisma Client not generated

**Fix:**
```bash
cd server
npx prisma generate
```

### Error: "Invalid connection string"

**Cause:** Missing `?sslmode=require` or incorrect format

**Fix:**
Your DATABASE_URL should look like:
```
postgresql://user:pass@host.neon.tech/dbname?sslmode=require
```

### SQL Migration Errors

**Cause:** Previous failed migration left partial state

**Fix:**
1. In Neon SQL Editor, run:
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   ```
2. Re-run both migrations from scratch

---

## 📚 Next Steps

### Update Stores (Optional - for full database functionality)

Your app currently uses **in-memory stores** for some data. To make it fully database-backed:

1. Update `server/stores/projectStore.js` → Use Prisma
2. Update `server/stores/stageStore.js` → Use Prisma
3. Update `server/lib/users.js` → Use Prisma

**See:** `START_HERE.md` for code examples

### Deploy to Production

Once database is set up:
1. Deploy backend to **Render**
2. Deploy frontend to **Netlify**
3. Update CORS settings
4. Configure environment variables

**See:** `PRODUCTION_SETUP.md` for deployment guide

---

## 🎯 Quick Reference

| Command | Purpose |
|---------|---------|
| `npx prisma studio` | Visual database browser |
| `npx prisma generate` | Regenerate Prisma Client |
| `npx prisma db push` | Sync schema to database |
| `npx prisma db pull` | Pull schema from database |

---

## ✅ You're Done!

Your EC-Exhibits Portal now has a real production database!

**Login at:** http://localhost:5173

**Browse data:** `cd server && npx prisma studio`

**Documentation:** See `DATABASE_SETUP.md` for schema details
