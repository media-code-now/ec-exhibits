# 🎯 NEON DATABASE SETUP - START HERE

## Two Options to Set Up Your Database

---

## ⚡ Option 1: Automated Setup (Recommended)

Run the interactive setup script that guides you through everything:

```bash
./setup-neon.sh
```

This script will:
- ✅ Configure your environment
- ✅ Guide you through Neon account creation
- ✅ Help you run migrations
- ✅ Generate Prisma Client
- ✅ Test the connection
- ✅ Show you demo login credentials

**Time:** 5 minutes

---

## 📖 Option 2: Manual Setup (Step-by-Step)

Follow the visual guide:

**Open:** `NEON_SETUP_GUIDE.md`

Includes:
- Screenshots and detailed instructions
- Troubleshooting section
- Verification steps
- Next steps after setup

**Time:** 5 minutes

---

## 📋 Quick Checklist

Before you start, make sure you have:
- [ ] A browser to access Neon Console
- [ ] Your email for Neon account signup
- [ ] Terminal access
- [ ] Node.js installed (`node --version`)

---

## 🚀 What Happens During Setup

### 1. Create Neon Account
- Free tier (no credit card needed)
- Sign up at console.neon.tech

### 2. Get Database Connection
- Create project: "ec-exhibits"
- Copy connection string

### 3. Run SQL Migrations
Two files in `server/migrations/`:
- `001_initial_schema.sql` - Creates 15 tables
- `002_seed_demo_data.sql` - Adds demo users & projects

### 4. Configure & Test
- Update `server/.env` with DATABASE_URL
- Generate Prisma Client
- Test connection

---

## 🎉 After Setup

You'll have:
- ✅ Persistent Postgres database on Neon
- ✅ 5 demo users (password: demo123)
- ✅ 2 sample projects
- ✅ 2 workflow templates
- ✅ Production-ready architecture

**Login at:** http://localhost:5173
**Email:** olivia@exhibitcontrol.com
**Password:** demo123

---

## 💡 Choose Your Path

### **Want it done fast?**
```bash
./setup-neon.sh
```

### **Want detailed explanations?**
Open `NEON_SETUP_GUIDE.md`

### **Having issues?**
Check troubleshooting in `NEON_SETUP_GUIDE.md`

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `setup-neon.sh` | Automated setup script |
| `NEON_SETUP_GUIDE.md` | Detailed visual guide |
| `server/migrations/001_initial_schema.sql` | Database schema |
| `server/migrations/002_seed_demo_data.sql` | Demo data |
| `server/prisma/schema.prisma` | Prisma models |
| `server/.env` | Your configuration |

---

## ⏱️ Time Estimate

- Account creation: 2 minutes
- Running migrations: 2 minutes  
- Configuration & testing: 1 minute
- **Total: 5 minutes**

---

## 🎯 Ready? Let's Go!

```bash
# Start the automated setup
./setup-neon.sh

# OR follow the guide manually
cat NEON_SETUP_GUIDE.md
```

**Questions?** See `DATABASE_SETUP.md` for technical details.
