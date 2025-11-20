# Seed Test User - Documentation

## Overview

The `seedUser.js` script creates a test user in your Neon Postgres database with proper bcrypt password hashing.

---

## Script Location

```
server/seedUser.js
```

---

## Test User Credentials

| Field | Value |
|-------|-------|
| **Email** | matan@ec-exhibits.com |
| **Password** | Password123! |
| **Name** | Test User |
| **Role** | owner |

---

## How to Run

### Option 1: Direct Node Execution

```bash
cd server
node seedUser.js
```

### Option 2: With npm script (optional)

Add to `server/package.json`:

```json
{
  "scripts": {
    "seed:user": "node seedUser.js"
  }
}
```

Then run:

```bash
cd server
npm run seed:user
```

---

## Expected Output

```
🌱 Seeding test user...

📋 Test user details:
   Email: matan@ec-exhibits.com
   Name: Test User
   Role: owner

🔍 Checking if user already exists...
✅ User does not exist, creating...

🔒 Hashing password...
✅ Password hashed

💾 Creating user in database...
✅ User created successfully!

📊 User Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ID:           ab1980fb-bc99-4522-9878-13749cd4ee76
Email:        matan@ec-exhibits.com
Name:         Test User
Role:         owner
Created At:   2025-11-19T10:30:45.123Z
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔑 Login Credentials:
   Email:    matan@ec-exhibits.com
   Password: Password123!

🧪 Test with curl:
   curl -X POST http://localhost:4000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"matan@ec-exhibits.com","password":"Password123!"}'

✨ Done!
```

---

## What the Script Does

### 1. Loads Environment Variables

```javascript
import 'dotenv/config';
```

Reads `DATABASE_URL` from `.env` file to connect to Neon.

### 2. Checks for Existing User

```javascript
const existingUser = await prisma.user.findUnique({
  where: { email: testUser.email }
});
```

Prevents duplicate email errors.

### 3. Hashes Password with bcrypt

```javascript
const passwordHash = await bcrypt.hash(testUser.password, SALT_ROUNDS);
```

Uses 10 salt rounds (same as your registration route).

### 4. Creates User in Database

```javascript
const newUser = await prisma.user.create({
  data: {
    email: testUser.email,
    passwordHash: passwordHash,
    displayName: testUser.displayName,
    role: testUser.role
  }
});
```

Inserts into the `users` table with hashed password.

### 5. Displays Results

Shows the created user's ID and login instructions.

---

## Testing After Seeding

### Test Login with curl

```bash
curl -c cookies.txt -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"matan@ec-exhibits.com","password":"Password123!"}'
```

Expected response:

```json
{
  "success": true,
  "user": {
    "id": "ab1980fb-bc99-4522-9878-13749cd4ee76",
    "email": "matan@ec-exhibits.com",
    "displayName": "Test User",
    "role": "owner",
    "createdAt": "2025-11-19T10:30:45.123Z",
    "updatedAt": "2025-11-19T10:30:45.123Z"
  }
}
```

### Test Protected Route

```bash
curl -b cookies.txt http://localhost:4000/auth/me
```

Expected response:

```json
{
  "user": {
    "id": "ab1980fb-bc99-4522-9878-13749cd4ee76",
    "email": "matan@ec-exhibits.com",
    "name": "Test User",
    "role": "owner",
    "createdAt": "2025-11-19T10:30:45.123Z",
    "updatedAt": "2025-11-19T10:30:45.123Z"
  }
}
```

---

## Customizing the Script

### Change User Role

Edit line 26 in `seedUser.js`:

```javascript
role: 'staff'  // Options: 'owner', 'staff', 'client'
```

### Change Credentials

Edit lines 21-24:

```javascript
const testUser = {
  email: 'yourname@example.com',
  password: 'YourPassword123!',
  displayName: 'Your Name',
  role: 'owner'
};
```

---

## Handling Duplicate Users

If you run the script twice, you'll see:

```
⚠️  User already exists!
   ID: ab1980fb-bc99-4522-9878-13749cd4ee76
   Email: matan@ec-exhibits.com
   Name: Test User

💡 To recreate the user, delete it first:
   DELETE FROM users WHERE email = 'matan@ec-exhibits.com';
```

### Option 1: Delete via SQL (Neon Console)

```sql
DELETE FROM users WHERE email = 'matan@ec-exhibits.com';
```

### Option 2: Delete via Prisma Script

Create `server/deleteUser.js`:

```javascript
import 'dotenv/config';
import prisma from './lib/db.js';

const email = 'matan@ec-exhibits.com';

await prisma.user.delete({
  where: { email }
});

console.log(`✅ Deleted user: ${email}`);
await prisma.$disconnect();
```

Run:

```bash
node deleteUser.js
```

---

## Troubleshooting

### Error: Cannot find module 'dotenv/config'

**Solution**: Install dependencies

```bash
cd server
npm install
```

### Error: Cannot connect to database

**Solution**: Check `.env` file exists and has `DATABASE_URL`

```bash
cat .env | grep DATABASE_URL
```

Should show:

```
DATABASE_URL="postgresql://neondb_owner:...@ep-wispy-sky-afxqrqfg-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require"
```

### Error: User already exists

**Solution**: The user is already in the database. Either:

1. Use the existing user
2. Delete it first (see "Handling Duplicate Users" above)
3. Change the email in the script

### Error: Prisma Client not generated

**Solution**: Generate Prisma Client

```bash
cd server
npx prisma generate
```

---

## Seeding Multiple Users

Create `server/seedMultipleUsers.js`:

```javascript
import 'dotenv/config';
import bcrypt from 'bcrypt';
import prisma from './lib/db.js';

const SALT_ROUNDS = 10;

const users = [
  {
    email: 'matan@ec-exhibits.com',
    password: 'Password123!',
    displayName: 'Test User',
    role: 'owner'
  },
  {
    email: 'staff@ec-exhibits.com',
    password: 'Staff123!',
    displayName: 'Staff Member',
    role: 'staff'
  },
  {
    email: 'client@ec-exhibits.com',
    password: 'Client123!',
    displayName: 'Client User',
    role: 'client'
  }
];

for (const user of users) {
  try {
    const passwordHash = await bcrypt.hash(user.password, SALT_ROUNDS);
    
    const newUser = await prisma.user.create({
      data: {
        email: user.email,
        passwordHash,
        displayName: user.displayName,
        role: user.role
      }
    });
    
    console.log(`✅ Created: ${newUser.email} (${newUser.role})`);
  } catch (error) {
    console.log(`⚠️  Skipped: ${user.email} (${error.message})`);
  }
}

await prisma.$disconnect();
console.log('\n✨ Done!');
```

---

## Verify in Database

### Using Neon SQL Editor

```sql
SELECT id, email, display_name, role, created_at 
FROM users 
WHERE email = 'matan@ec-exhibits.com';
```

### Using Prisma Studio

```bash
cd server
npx prisma studio
```

Opens a web UI at http://localhost:5555 to view/edit data.

---

## Production Considerations

### Don't Commit Passwords

Never commit plain-text passwords to git:

```bash
# Add to .gitignore
seedUser.js  # If it contains real passwords
```

### Use Environment Variables for Production

```javascript
const testUser = {
  email: process.env.SEED_USER_EMAIL || 'matan@ec-exhibits.com',
  password: process.env.SEED_USER_PASSWORD || 'Password123!',
  displayName: process.env.SEED_USER_NAME || 'Test User',
  role: process.env.SEED_USER_ROLE || 'owner'
};
```

### Run Seeds on Render

Add to `package.json`:

```json
{
  "scripts": {
    "seed": "node seedUser.js",
    "deploy": "npm run seed && npm start"
  }
}
```

---

## Complete Test Flow

```bash
# 1. Seed the user
cd server
node seedUser.js

# 2. Start the server
node index.js

# 3. Test login (in another terminal)
curl -c cookies.txt -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"matan@ec-exhibits.com","password":"Password123!"}'

# 4. Test protected route
curl -b cookies.txt http://localhost:4000/auth/me

# 5. Create a project (if routes are updated with user_id)
curl -b cookies.txt -X POST http://localhost:4000/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"My First Project","description":"Testing user isolation"}'

# 6. Get user's projects
curl -b cookies.txt http://localhost:4000/projects
```

---

## Summary

### Quick Start

```bash
cd server
node seedUser.js
```

### Credentials

- **Email**: matan@ec-exhibits.com
- **Password**: Password123!
- **Role**: owner

### What It Does

1. ✅ Connects to Neon using `lib/db.js`
2. ✅ Checks if user already exists
3. ✅ Hashes password with bcrypt (10 salt rounds)
4. ✅ Creates user in database
5. ✅ Logs the new user ID and login instructions

### Next Steps

1. Run the seed script
2. Test login with curl or frontend
3. Use the test user to develop features
4. Create more test users as needed

**Ready to seed your test user!** 🌱

---

*Last Updated: 2025-11-19*  
*Database: Neon Postgres*  
*Backend: Node + Express*
