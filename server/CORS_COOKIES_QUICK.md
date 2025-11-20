# CORS + Cookies Quick Reference

## Backend Configuration

### 1. CORS Middleware

```javascript
import cors from 'cors';
import cookieParser from 'cookie-parser';

const PROD_ORIGIN = 'https://ec-exhibits.netlify.app';

app.use(cors({
  origin: PROD_ORIGIN,
  credentials: true  // ← CRITICAL for cookies
}));

app.use(cookieParser());
```

### 2. Login Route - Set Cookie

```javascript
app.post('/auth/login', async (req, res) => {
  const user = await authenticateUser(email, password);
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { 
    expiresIn: '7d' 
  });
  
  // Set cookie with cross-origin settings
  res.cookie('token', token, {
    httpOnly: true,      // ← XSS protection
    secure: true,        // ← HTTPS only
    sameSite: 'none',    // ← Cross-site allowed
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
  
  res.json({ success: true, user });
});
```

### 3. Logout Route - Clear Cookie

```javascript
app.post('/auth/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
  });
  
  res.json({ success: true });
});
```

### 4. Environment Variables

```bash
NODE_ENV=production
PROD_ORIGIN=https://ec-exhibits.netlify.app
JWT_SECRET=your-32-char-secret-key
```

---

## Frontend Configuration

### 1. Environment Variable

**Netlify**: Set in dashboard
```bash
VITE_API_URL=https://ec-exhibits.onrender.com
```

### 2. All Fetch Calls

```javascript
const API_URL = import.meta.env.VITE_API_URL;

// Login
await fetch(`${API_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',  // ← CRITICAL for cookies
  body: JSON.stringify({ email, password })
});

// Check auth
await fetch(`${API_URL}/auth/me`, {
  credentials: 'include'  // ← Sends cookie
});

// Logout
await fetch(`${API_URL}/auth/logout`, {
  method: 'POST',
  credentials: 'include'  // ← Clears cookie
});
```

---

## Cookie Settings Explained

| Setting | Value | Why |
|---------|-------|-----|
| `httpOnly` | `true` | JavaScript can't access it (XSS protection) |
| `secure` | `true` | HTTPS only (production requirement) |
| `sameSite` | `'none'` | Allows cross-site (Netlify → Render) |
| `maxAge` | 7 days | Cookie expiration |

---

## Key Points

✅ **Backend**: `credentials: true` in CORS  
✅ **Frontend**: `credentials: 'include'` in fetch  
✅ **Production**: `secure: true` + `sameSite: 'none'`  
✅ **Development**: `secure: false` + `sameSite: 'lax'`  

---

## Environment-Based Settings

```javascript
// Use this pattern for dev vs prod
res.cookie('token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000
});
```

---

## Troubleshooting

**Cookie not being set?**
- Check CORS has `credentials: true`
- Check fetch has `credentials: 'include'`
- In prod: must have `secure: true` and HTTPS

**Cookie not being sent?**
- Check all fetch calls have `credentials: 'include'`
- Check `sameSite: 'none'` in production

**CORS error?**
- Backend must allow Netlify origin
- Backend must have `credentials: true`
- Restart backend after changing CORS

---

## Testing

```bash
# Check cookie in browser
DevTools → Application → Cookies → token

# Should see:
✅ HttpOnly
✅ Secure (in production)
✅ SameSite: None (in production)
✅ Expires: 7 days from now
```

---

**That's it!** Your cross-origin authentication is configured. 🎉
