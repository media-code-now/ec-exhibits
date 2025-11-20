# 🚀 Quick Start Guide

## Current Status
✅ Dependencies installed
✅ Environment file created
❓ **Choose your path:**

---

## Option 1: Run with Mock Data (Easiest - 30 seconds)

Your app currently works with **in-memory data** - no database needed!

```bash
# From project root
./start.sh
# Choose option 2
```

**OR manually:**

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend  
cd client
npm run dev
```

Visit: **http://localhost:5173**

**Demo users (click to auto-login):**
- Olivia Owner
- Samuel Staff
- Cameron Client

⚠️ **Data resets on server restart**

---

## Option 2: Set Up Real Database (5 minutes)

Make it production-ready with **Neon Postgres**:

### Step 1: Create Neon Database
1. Go to: https://console.neon.tech
2. Sign up (free tier)
3. Create project: `ec-exhibits`
4. Copy your connection string

### Step 2: Run SQL Migrations
In Neon SQL Editor, paste and run:
1. `server/migrations/001_initial_schema.sql` (creates tables)
2. `server/migrations/002_seed_demo_data.sql` (adds demo data)

### Step 3: Configure Environment
```bash
cd server
nano .env
```

Update this line with your Neon connection string:
```env
DATABASE_URL="postgresql://your-connection-string-here"
```

### Step 4: Generate Prisma Client
```bash
cd server
npx prisma generate
```

### Step 5: Start Servers
```bash
# From project root
./start.sh
# Choose option 1
```

**Login with:**
- Email: `olivia@exhibitcontrol.com`
- Password: `demo123`

✅ **Data persists across restarts!**

---

## 🎯 Which Should I Choose?

| Feature | Mock Data | Neon Database |
|---------|-----------|---------------|
| Setup Time | 30 seconds | 5 minutes |
| Data Persistence | ❌ Resets on restart | ✅ Permanent |
| Multi-user | ❌ Same data for all | ✅ Real users |
| Production Ready | ❌ Dev only | ✅ Yes |
| Cost | Free | Free tier available |

**Recommendation:** 
- **Testing features?** → Use Mock Data (Option 1)
- **Real app/deployment?** → Use Neon (Option 2)

---

## 📚 Need More Help?

- **Full Setup:** See `PRODUCTION_SETUP.md`
- **Database Details:** See `DATABASE_SETUP.md`
- **Action Plan:** See `START_HERE.md`

---

## 🐛 Troubleshooting

**"Command not found: npm"**
```bash
# Make sure you're in the right directory
cd server  # for backend
cd client  # for frontend
```

**"Port already in use"**
```bash
# Kill existing processes
lsof -ti:4000 | xargs kill -9  # backend
lsof -ti:5173 | xargs kill -9  # frontend
```

**"Prisma errors"**
```bash
cd server
npx prisma generate
```

---

## ✅ You're Ready!

Choose your option and run `./start.sh` from the project root!
