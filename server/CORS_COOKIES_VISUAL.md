# CORS + Cookies Visual Guide

## The Problem

```
❌ Default Browser Behavior (Blocks Cookies)

┌─────────────────────────┐
│  Netlify Frontend       │
│  ec-exhibits.netlify    │
│                         │
│  fetch('/login')        │  ← No credentials
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Render Backend         │
│  ec-exhibits.onrender   │
│                         │
│  ❌ CORS Error          │  ← Different origin
│  ❌ Cookie Blocked      │  ← No credentials
└─────────────────────────┘
```

## The Solution

```
✅ Configured CORS + Credentials

┌──────────────────────────────────────────┐
│  Netlify Frontend                        │
│  https://ec-exhibits.netlify.app         │
│                                          │
│  fetch('/login', {                       │
│    credentials: 'include'  ← Send cookie│
│  })                                      │
└───────────┬──────────────────────────────┘
            │
            │ 1. POST /auth/login
            │    { email, password }
            │    credentials: 'include'
            │
            ▼
┌──────────────────────────────────────────┐
│  Render Backend                          │
│  https://ec-exhibits.onrender.com        │
│                                          │
│  cors({                                  │
│    origin: 'ec-exhibits.netlify.app',   │
│    credentials: true  ← Accept cookies  │
│  })                                      │
│                                          │
│  res.cookie('token', jwt, {              │
│    httpOnly: true,                       │
│    secure: true,                         │
│    sameSite: 'none'  ← Cross-site OK    │
│  })                                      │
│                                          │
│  2. Response:                            │
│     Set-Cookie: token=jwt...             │
│     Access-Control-Allow-Credentials     │
└───────────┬──────────────────────────────┘
            │
            │ 3. Cookie stored in browser
            │
            ▼
┌──────────────────────────────────────────┐
│  Browser Cookie Storage                  │
│                                          │
│  ✅ token=eyJhbGc...                     │
│     Domain: ec-exhibits.onrender.com     │
│     HttpOnly: true                       │
│     Secure: true                         │
│     SameSite: None                       │
│     Expires: 7 days                      │
└──────────────────────────────────────────┘
```

---

## Authentication Flow

```
┌────────────┐
│  Browser   │
│  Opens App │
└─────┬──────┘
      │
      │ 1. GET https://ec-exhibits.netlify.app
      │
      ▼
┌─────────────────┐
│  React App      │
│  Loads          │
│                 │
│  useEffect(() => {
│    checkAuth()  ← 2. Check if logged in
│  })             │
└─────┬───────────┘
      │
      │ 3. GET /auth/me
      │    credentials: 'include'
      │
      ▼
┌─────────────────┐
│  Backend        │
│  authRequired   │ ← 4. Check cookie
│                 │
│  Cookie found?  │
└─────┬───────────┘
      │
      ├─── ✅ Yes ──→ Return user data ──→ Show MainApp
      │
      └─── ❌ No ───→ Return 401 ────────→ Show LoginPage
```

---

## Login Sequence

```
Step 1: User enters credentials
┌─────────────────────────┐
│  LoginPage              │
│  ┌────────────────────┐ │
│  │ Email:    matan@   │ │
│  │ Password: ********  │ │
│  │ [Login Button]     │ │
│  └────────────────────┘ │
└───────────┬─────────────┘
            │
            │ Click Login
            ▼

Step 2: POST to backend
fetch('https://ec-exhibits.onrender.com/auth/login', {
  method: 'POST',
  credentials: 'include',  ← Important!
  body: JSON.stringify({ email, password })
})
            │
            ▼

Step 3: Backend validates & creates JWT
┌─────────────────────────┐
│  Backend                │
│  1. Check password ✓    │
│  2. Create JWT          │
│  3. Set cookie          │
│     httpOnly: true      │
│     secure: true        │
│     sameSite: 'none'    │
└───────────┬─────────────┘
            │
            ▼

Step 4: Response with Set-Cookie header
HTTP/1.1 200 OK
Set-Cookie: token=eyJhbGc...; HttpOnly; Secure; SameSite=None
Access-Control-Allow-Credentials: true
{
  "success": true,
  "user": { ... }
}
            │
            ▼

Step 5: Browser stores cookie automatically
┌─────────────────────────┐
│  Browser Cookie Store   │
│  ✅ token saved         │
│  ✅ Domain: render.com  │
│  ✅ Expires: 7 days     │
└───────────┬─────────────┘
            │
            ▼

Step 6: Show authenticated UI
┌─────────────────────────┐
│  MainApp                │
│  Welcome, Matan!        │
│  [Your Projects]        │
│  [Logout]               │
└─────────────────────────┘
```

---

## Subsequent Requests

```
Every request automatically includes cookie:

┌──────────────────┐
│  React Component │
│                  │
│  fetch('/auth/me', {
│    credentials: 'include'  ← Auto sends cookie
│  })              │
└────────┬─────────┘
         │
         │ Cookie automatically attached:
         │ GET /auth/me
         │ Cookie: token=eyJhbGc...
         │
         ▼
┌────────────────────┐
│  Backend           │
│  authRequired      │ ← Reads req.cookies.token
│  Verify JWT ✓      │
│  req.user = {...}  │
│  Return user data  │
└────────┬───────────┘
         │
         │ Response:
         │ { user: { ... } }
         │
         ▼
┌────────────────────┐
│  React Component   │
│  setUser(data)     │
│  Show user info    │
└────────────────────┘

No manual token management needed!
```

---

## Logout Flow

```
Step 1: User clicks logout
┌─────────────────┐
│  MainApp        │
│  [Logout] ← Click
└────────┬────────┘
         │
         ▼

Step 2: POST to logout endpoint
fetch('/auth/logout', {
  method: 'POST',
  credentials: 'include'  ← Send cookie to clear it
})
         │
         ▼

Step 3: Backend clears cookie
┌─────────────────────────┐
│  Backend                │
│  res.clearCookie('token', {
│    httpOnly: true,      │
│    secure: true,        │
│    sameSite: 'none'     │
│  })                     │
└────────┬────────────────┘
         │
         ▼

Step 4: Response tells browser to delete cookie
HTTP/1.1 200 OK
Set-Cookie: token=; Expires=Thu, 01 Jan 1970 00:00:00 GMT
{
  "success": true
}
         │
         ▼

Step 5: Browser deletes cookie
┌─────────────────────────┐
│  Browser Cookie Store   │
│  ❌ token deleted       │
└────────┬────────────────┘
         │
         ▼

Step 6: Return to login page
┌─────────────────────────┐
│  LoginPage              │
│  Please log in          │
└─────────────────────────┘
```

---

## Cookie Settings Impact

### httpOnly: true

```
✅ Secure:
   Backend ─────── Cookie ─────── Browser Storage
                                  (inaccessible to JS)

❌ Without httpOnly:
   Backend ─────── Cookie ─────── Browser Storage
                                       │
                                       ▼
                                  document.cookie
                                  (accessible to malicious JS)
```

### secure: true

```
✅ Production (HTTPS):
   Browser ───(HTTPS)──→ Backend
           Cookie sent ✓

❌ Production without secure:
   Browser ───(HTTP)───→ Backend
           Cookie blocked ✗
```

### sameSite: 'none'

```
✅ With sameSite: 'none':
   Netlify ────────┐
   (origin A)     │
                  │ Cookie sent ✓
                  ▼
   Render Backend
   (origin B)

❌ With sameSite: 'strict':
   Netlify ────────┐
   (origin A)     │
                  │ Cookie blocked ✗
                  ▼
   Render Backend
   (origin B)
```

---

## CORS Configuration Impact

### With credentials: true

```
✅ Backend:
   app.use(cors({
     origin: 'https://ec-exhibits.netlify.app',
     credentials: true  ← Allows cookies
   }))

   Response Headers:
   Access-Control-Allow-Origin: https://ec-exhibits.netlify.app
   Access-Control-Allow-Credentials: true ← Critical!

   Browser: ✓ Cookie allowed
```

### Without credentials: true

```
❌ Backend:
   app.use(cors({
     origin: 'https://ec-exhibits.netlify.app'
     // No credentials: true
   }))

   Response Headers:
   Access-Control-Allow-Origin: https://ec-exhibits.netlify.app
   (No Access-Control-Allow-Credentials header)

   Browser: ✗ Cookie blocked
```

---

## Development vs Production

### Development (localhost → localhost)

```
┌──────────────────────┐
│  localhost:5173      │ ← Same origin
│  (Frontend)          │
│                      │
│  credentials:        │
│    'include' ✓       │
└──────────┬───────────┘
           │
           │ Cookie: token=...
           │
           ▼
┌──────────────────────┐
│  localhost:4000      │ ← Same origin
│  (Backend)           │
│                      │
│  httpOnly: true      │
│  secure: false  ✓    │ ← HTTP OK for localhost
│  sameSite: 'lax' ✓   │ ← Same-site OK for localhost
└──────────────────────┘
```

### Production (Netlify → Render)

```
┌───────────────────────────┐
│  ec-exhibits.netlify.app  │ ← Different origin
│  (Frontend)               │
│                           │
│  credentials:             │
│    'include' ✓            │
└──────────┬────────────────┘
           │
           │ Cookie: token=...
           │
           ▼
┌───────────────────────────┐
│  ec-exhibits.onrender.com │ ← Different origin
│  (Backend)                │
│                           │
│  httpOnly: true           │
│  secure: true  ✓          │ ← HTTPS required
│  sameSite: 'none' ✓       │ ← Cross-site required
└───────────────────────────┘
```

---

## Complete Request/Response Example

### Login Request

```
POST https://ec-exhibits.onrender.com/auth/login
Host: ec-exhibits.onrender.com
Origin: https://ec-exhibits.netlify.app
Content-Type: application/json

{
  "email": "matan@ec-exhibits.com",
  "password": "Password123!"
}
```

### Login Response

```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://ec-exhibits.netlify.app
Access-Control-Allow-Credentials: true
Set-Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; 
            HttpOnly; 
            Secure; 
            SameSite=None; 
            Max-Age=604800

{
  "success": true,
  "user": {
    "id": "05543ab4-79aa-42ba-b610-11fa8bbff5c2",
    "email": "matan@ec-exhibits.com",
    "displayName": "Matan",
    "role": "owner"
  }
}
```

### Subsequent Request (with cookie)

```
GET https://ec-exhibits.onrender.com/auth/me
Host: ec-exhibits.onrender.com
Origin: https://ec-exhibits.netlify.app
Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Subsequent Response

```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://ec-exhibits.netlify.app
Access-Control-Allow-Credentials: true

{
  "user": {
    "id": "05543ab4-79aa-42ba-b610-11fa8bbff5c2",
    "email": "matan@ec-exhibits.com",
    "displayName": "Matan",
    "role": "owner"
  }
}
```

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Security Layers                                        │
│                                                         │
│  1. CORS Origin Validation                              │
│     ✓ Only allows Netlify domain                       │
│     ✗ Blocks other domains                             │
│                                                         │
│  2. HTTPS Encryption                                    │
│     ✓ secure: true requires HTTPS                      │
│     ✗ Cookie not sent over HTTP                        │
│                                                         │
│  3. HttpOnly Cookie                                     │
│     ✓ JavaScript cannot access cookie                  │
│     ✗ Protects against XSS attacks                     │
│                                                         │
│  4. JWT Expiration                                      │
│     ✓ Token expires after 7 days                       │
│     ✗ Must re-authenticate after expiration            │
│                                                         │
│  5. Password Hashing                                    │
│     ✓ bcrypt with 10 salt rounds                       │
│     ✗ Plain passwords never stored                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Common Mistakes & Fixes

### Mistake 1: Missing credentials

```
❌ Wrong:
fetch('/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
})

✅ Correct:
fetch('/login', {
  method: 'POST',
  credentials: 'include',  ← Add this!
  body: JSON.stringify({ email, password })
})
```

### Mistake 2: Wrong sameSite in production

```
❌ Wrong:
res.cookie('token', jwt, {
  sameSite: 'strict'  ← Blocks cross-site
})

✅ Correct:
res.cookie('token', jwt, {
  sameSite: 'none'  ← Allows cross-site
})
```

### Mistake 3: Missing credentials in CORS

```
❌ Wrong:
app.use(cors({
  origin: 'https://ec-exhibits.netlify.app'
}))

✅ Correct:
app.use(cors({
  origin: 'https://ec-exhibits.netlify.app',
  credentials: true  ← Add this!
}))
```

### Mistake 4: Mismatched clearCookie settings

```
❌ Wrong:
// Set cookie:
res.cookie('token', jwt, { httpOnly: true, secure: true, sameSite: 'none' })

// Clear cookie:
res.clearCookie('token')  ← Settings don't match!

✅ Correct:
// Set cookie:
res.cookie('token', jwt, { httpOnly: true, secure: true, sameSite: 'none' })

// Clear cookie:
res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'none' })
```

---

## Summary Diagram

```
┌────────────────────────────────────────────────────────────┐
│  Complete Authentication System                           │
│                                                            │
│  Frontend (Netlify)                                        │
│  ├─ credentials: 'include'     ← Send cookies             │
│  ├─ VITE_API_URL=render.com    ← Backend URL              │
│  └─ Auto-login on mount        ← Check cookie exists      │
│                                                            │
│  Backend (Render)                                          │
│  ├─ cors({ credentials: true }) ← Accept cookies          │
│  ├─ httpOnly: true              ← XSS protection          │
│  ├─ secure: true                ← HTTPS only              │
│  ├─ sameSite: 'none'            ← Cross-site allowed      │
│  └─ JWT expires: 7 days         ← Auto logout             │
│                                                            │
│  Result: Secure cross-origin authentication! 🎉           │
└────────────────────────────────────────────────────────────┘
```

---

**Visual guide complete!** All diagrams show how CORS and cookies work together for secure cross-origin authentication.
