# Seed User Script - Quick Reference

## ✅ Ready to Use

**Script**: `server/seedUser.js`

---

## Run the Script

```bash
cd server
node seedUser.js
```

---

## Test User Credentials

```
Email:    matan@ec-exhibits.com
Password: Password123!
Name:     Test User
Role:     owner
```

---

## What It Does

1. ✅ Connects to Neon using your `lib/db.js` helper
2. ✅ Checks if user already exists (prevents duplicates)
3. ✅ Hashes password with bcrypt (10 salt rounds)
4. ✅ Creates user in the `users` table
5. ✅ Logs the new user ID and login instructions

---

## Test Login

```bash
# Login
curl -c cookies.txt -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"matan@ec-exhibits.com","password":"Password123!"}'

# Get current user
curl -b cookies.txt http://localhost:4000/auth/me
```

---

## Customize

Edit `seedUser.js` line 21-26:

```javascript
const testUser = {
  email: 'yourname@example.com',     // Change email
  password: 'YourPassword123!',      // Change password
  displayName: 'Your Name',          // Change display name
  role: 'owner' // 'owner', 'staff', or 'client'
};
```

---

## If User Already Exists

The script will show:

```
⚠️  User already exists!
   ID: 05543ab4-79aa-42ba-b610-11fa8bbff5c2
   Email: matan@ec-exhibits.com

💡 To recreate, delete first:
   DELETE FROM users WHERE email = 'matan@ec-exhibits.com';
```

Delete via Neon SQL Editor or use the existing user.

---

## Test Results ✅

```
User ID: 05543ab4-79aa-42ba-b610-11fa8bbff5c2
Login:   ✅ Success
/auth/me: ✅ Returns user data
```

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| "Cannot find module" | Run `npm install` in server directory |
| "Cannot connect" | Check `.env` has `DATABASE_URL` |
| "User already exists" | User is already in database, use it or delete it first |
| "Prisma Client not generated" | Run `npx prisma generate` |

---

## Full Documentation

See `SEED_USER_GUIDE.md` for:
- Complete explanation
- Multiple users seeding
- Production considerations
- Advanced customization

---

**Ready to seed!** 🌱

*Run: `node seedUser.js`*
