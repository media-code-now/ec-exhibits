# Deployment Checklist - Netlify + Render

## Backend Deployment (Render)

### 1. Environment Variables

Set these in Render Dashboard → Environment:

```bash
# Database
DATABASE_URL=postgresql://neondb_owner:npg_ju3ndQHoK2GA@ep-wispy-sky-afxqrqfg-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require

# JWT Secret (MUST be 32+ characters)
JWT_SECRET=ec-exhibits-super-secret-jwt-key-change-in-production-32chars

# CORS Origins
ALLOWED_ORIGIN=http://localhost:5173
PROD_ORIGIN=https://ec-exhibits.netlify.app

# Client URL (for email links, etc)
CLIENT_URL=https://ec-exhibits.netlify.app

# Environment (CRITICAL for cookie settings)
NODE_ENV=production

# Server Port
PORT=4000
```

### 2. Verify Code Changes

✅ **Login route** (`server/index.js` line 166-171):
```javascript
res.cookie('token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // ← true in production
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // ← 'none' in production
  maxAge: 7 * 24 * 60 * 60 * 1000
});
```

✅ **Logout route** (`server/index.js` line 195-199):
```javascript
res.clearCookie('token', {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
});
```

✅ **CORS configuration** (`server/index.js` line 63):
```javascript
app.use(cors({
  origin: corsOriginHandler,
  credentials: true  // ← CRITICAL
}));
```

### 3. Deploy to Render

```bash
git add server/index.js
git commit -m "Configure CORS and cookies for cross-origin auth"
git push origin main
```

Render will auto-deploy from GitHub.

### 4. Verify Deployment

```bash
# Check backend is running
curl https://ec-exhibits.onrender.com/health

# Test CORS headers
curl -H "Origin: https://ec-exhibits.netlify.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://ec-exhibits.onrender.com/auth/login

# Should see:
# Access-Control-Allow-Origin: https://ec-exhibits.netlify.app
# Access-Control-Allow-Credentials: true
```

---

## Frontend Deployment (Netlify)

### 1. Environment Variables

Set in Netlify Dashboard → Site Settings → Environment Variables:

```bash
VITE_API_URL=https://ec-exhibits.onrender.com
```

### 2. Verify Code

✅ **All fetch calls have `credentials: 'include'`**:

```javascript
// LoginPage.jsx
fetch(`${API_URL}/auth/login`, {
  credentials: 'include'  // ← Check this
})

// App.jsx - checkAuth
fetch(`${API_URL}/auth/me`, {
  credentials: 'include'  // ← Check this
})

// App.jsx - logout
fetch(`${API_URL}/auth/logout`, {
  credentials: 'include'  // ← Check this
})
```

### 3. Build Locally (Optional)

```bash
cd client
npm run build

# Verify build success
# Check dist/ folder created
```

### 4. Deploy to Netlify

**Option A: Netlify CLI**
```bash
cd client
netlify deploy --prod
```

**Option B: Git Integration**
```bash
git add client/
git commit -m "Ready for production deployment"
git push origin main
```

Netlify will auto-deploy from GitHub.

### 5. Verify Deployment

```bash
# Open site
open https://ec-exhibits.netlify.app

# Check environment variable loaded
# DevTools → Console → Run:
console.log(import.meta.env.VITE_API_URL)
# Should show: https://ec-exhibits.onrender.com
```

---

## Testing Production

### 1. Test Login

1. Open https://ec-exhibits.netlify.app
2. Should see LoginPage
3. Enter credentials:
   - Email: `matan@ec-exhibits.com`
   - Password: `Password123!`
4. Click Login

**Expected**:
- ✅ Request succeeds
- ✅ Shows MainApp with user info
- ✅ Cookie is set (check DevTools)

### 2. Check Cookie

**Chrome/Edge DevTools**:
1. F12 → Application tab
2. Cookies → `https://ec-exhibits.onrender.com`
3. Find cookie named `token`

**Should see**:
```
Name: token
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Domain: ec-exhibits.onrender.com
Path: /
Expires: (7 days from now)
HttpOnly: ✓
Secure: ✓
SameSite: None
```

### 3. Test Auto-Login

1. While logged in, refresh page (F5)
2. Should see brief loading spinner
3. Should automatically show MainApp (not LoginPage)
4. Cookie keeps you logged in!

### 4. Test Logout

1. Click user avatar in header
2. Click "Sign out"
3. Should return to LoginPage
4. Refresh page
5. Should stay on LoginPage (cookie cleared)

### 5. Test Protected Routes

```bash
# Without login - should fail
curl https://ec-exhibits.onrender.com/auth/me
# Response: {"error":"Authentication required"}

# With cookie - should work
# (Copy cookie from browser DevTools)
curl -H "Cookie: token=YOUR_TOKEN_HERE" \
     https://ec-exhibits.onrender.com/auth/me
# Response: {"user":{...}}
```

---

## Troubleshooting Production

### Issue: Cookie not being set

**Symptoms**:
- Login succeeds but no cookie in DevTools
- Immediately logged out after login

**Checklist**:
- [ ] Backend has `NODE_ENV=production`
- [ ] Backend has `credentials: true` in CORS
- [ ] Frontend uses `credentials: 'include'`
- [ ] Both sites use HTTPS
- [ ] Cookie has `secure: true` and `sameSite: 'none'`

**Fix**:
```bash
# Check Render environment
# Should show: NODE_ENV=production
echo $NODE_ENV

# Restart Render service after setting environment variables
```

### Issue: CORS error in browser console

**Symptoms**:
```
Access to fetch at 'https://ec-exhibits.onrender.com/auth/login' 
from origin 'https://ec-exhibits.netlify.app' has been blocked by CORS policy
```

**Checklist**:
- [ ] Backend CORS allows Netlify origin
- [ ] Backend has `credentials: true`
- [ ] Backend is running

**Fix**:
```javascript
// Verify in server/index.js
const PROD_ORIGIN = process.env.PROD_ORIGIN || 'https://ec-exhibits.netlify.app';

app.use(cors({
  origin: corsOriginHandler,
  credentials: true
}));
```

### Issue: 401 Unauthorized on /auth/me

**Symptoms**:
- Login works
- Cookie is set
- But `/auth/me` returns 401

**Checklist**:
- [ ] Cookie name is 'token'
- [ ] JWT_SECRET matches on backend
- [ ] Token hasn't expired
- [ ] cookieParser middleware is applied

**Debug**:
```javascript
// Add logging to authRequired middleware
console.log('[DEBUG] Cookies:', req.cookies);
console.log('[DEBUG] Token:', req.cookies.token);
```

### Issue: Cookie cleared immediately

**Symptoms**:
- Cookie appears briefly then disappears
- Can't stay logged in

**Checklist**:
- [ ] `clearCookie` settings match `cookie` settings
- [ ] Not calling logout accidentally
- [ ] Cookie expiration is 7 days, not expired

**Fix**:
```javascript
// Ensure logout matches login
res.cookie('token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000
});

res.clearCookie('token', {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
});
```

### Issue: Environment variable not loading

**Symptoms**:
- `console.log(import.meta.env.VITE_API_URL)` shows undefined
- Requests go to wrong URL

**Fix**:
```bash
# Netlify: Set in dashboard and redeploy
# Variable name must start with VITE_
VITE_API_URL=https://ec-exhibits.onrender.com

# Trigger redeploy
git commit --allow-empty -m "Trigger redeploy"
git push origin main
```

---

## Pre-Deployment Checklist

### Backend (Render)

- [ ] All environment variables set
- [ ] `NODE_ENV=production`
- [ ] `PROD_ORIGIN=https://ec-exhibits.netlify.app`
- [ ] JWT_SECRET is secure (32+ chars)
- [ ] Database connected
- [ ] CORS has `credentials: true`
- [ ] Cookie settings use environment-based logic
- [ ] Code pushed to GitHub

### Frontend (Netlify)

- [ ] `VITE_API_URL=https://ec-exhibits.onrender.com` set in dashboard
- [ ] All fetch calls have `credentials: 'include'`
- [ ] Build succeeds locally
- [ ] Code pushed to GitHub

### Testing

- [ ] Backend health endpoint responds
- [ ] CORS headers present in OPTIONS request
- [ ] Login sets cookie with correct settings
- [ ] Auto-login works on refresh
- [ ] Logout clears cookie
- [ ] Protected routes require authentication

---

## Post-Deployment Monitoring

### Check Render Logs

```
Render Dashboard → Your Service → Logs

Look for:
✅ [INFO] Allowed origin (prod): https://ec-exhibits.netlify.app
✅ [INFO] User logged in: matan@ec-exhibits.com
❌ [ERROR] Login failed: ...
```

### Check Netlify Deploy Logs

```
Netlify Dashboard → Deploys → Latest Deploy → Deploy Log

Look for:
✅ Build succeeded
✅ Site is live
❌ Build failed
```

### Browser Network Tab

**Check request headers**:
```
Origin: https://ec-exhibits.netlify.app
Cookie: token=eyJhbGc...
```

**Check response headers**:
```
Access-Control-Allow-Origin: https://ec-exhibits.netlify.app
Access-Control-Allow-Credentials: true
Set-Cookie: token=...; HttpOnly; Secure; SameSite=None
```

---

## Rollback Plan

### If deployment fails:

**Backend (Render)**:
```bash
# Render auto-deploys from GitHub
# To rollback: revert commit and push
git revert HEAD
git push origin main
```

**Frontend (Netlify)**:
```
Netlify Dashboard → Deploys → Previous Deploy → Publish
```

### If environment variables wrong:

**Render**:
```
Dashboard → Environment → Edit Variable → Save
Service will auto-restart
```

**Netlify**:
```
Dashboard → Site Settings → Environment Variables → Edit
Trigger redeploy (or make empty commit)
```

---

## Success Criteria

✅ **User can login from Netlify**
- No CORS errors
- Cookie is set
- MainApp shows user info

✅ **User stays logged in on refresh**
- Cookie persists
- Auto-login works
- No flash of login page

✅ **User can logout**
- Cookie is cleared
- Returns to LoginPage
- Can't access protected routes

✅ **Security verified**
- Cookie has HttpOnly flag
- Cookie has Secure flag
- Cookie has SameSite=None
- Only Netlify origin allowed

---

## Quick Test Script

```bash
#!/bin/bash
# test-production.sh

BACKEND="https://ec-exhibits.onrender.com"
FRONTEND="https://ec-exhibits.netlify.app"

echo "Testing backend health..."
curl -s $BACKEND/health

echo -e "\nTesting CORS headers..."
curl -s -I -H "Origin: $FRONTEND" -X OPTIONS $BACKEND/auth/login | grep -i "access-control"

echo -e "\nTesting login..."
curl -s -X POST $BACKEND/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: $FRONTEND" \
  -d '{"email":"matan@ec-exhibits.com","password":"Password123!"}' \
  -c cookies.txt \
  | jq .

echo -e "\nTesting /auth/me with cookie..."
curl -s $BACKEND/auth/me \
  -b cookies.txt \
  | jq .

echo -e "\nDone! Check output above."
rm cookies.txt
```

Run:
```bash
chmod +x test-production.sh
./test-production.sh
```

---

## Summary

**Deploy in this order**:

1. ✅ Set Render environment variables (especially `NODE_ENV=production`)
2. ✅ Deploy backend to Render (push to GitHub)
3. ✅ Verify backend CORS headers
4. ✅ Set Netlify environment variables (`VITE_API_URL`)
5. ✅ Deploy frontend to Netlify (push to GitHub)
6. ✅ Test login → auto-login → logout flow
7. ✅ Monitor logs for errors

**Production is ready when**:
- No CORS errors in browser console
- Cookie appears in DevTools with correct settings
- Auto-login works on page refresh
- Logout clears cookie successfully

---

**You're ready to deploy!** 🚀

Follow this checklist step-by-step for a smooth production deployment.
