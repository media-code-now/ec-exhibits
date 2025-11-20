# React Login Page - Documentation

## Overview

A complete React login page component that authenticates users with your Render backend using cookie-based JWT authentication.

---

## Component Location

```
client/src/components/LoginPage.jsx
```

---

## Features

✅ **Email/Password Login Form**  
✅ **Backend API Integration** - Connects to https://ec-exhibits.onrender.com  
✅ **Cookie-based Authentication** - Uses `credentials: 'include'`  
✅ **Error Handling** - Shows user-friendly error messages  
✅ **Loading States** - Disabled button while submitting  
✅ **Responsive Design** - Mobile-friendly layout  
✅ **Tailwind CSS Styling** - Matches your existing design  
✅ **Test Credentials Display** - Helper for development (remove in production)  

---

## How It Works

### 1. User Enters Credentials

```jsx
<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
```

### 2. Submit Calls Backend

```javascript
const response = await fetch(`${API_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // ← Sends/receives cookies
  body: JSON.stringify({ email, password }),
});
```

### 3. Backend Sets Cookie

Server responds with:
- HTTP-only JWT cookie (7-day expiration)
- User data: `{ success: true, user: { id, email, name, role } }`

### 4. App Updates State

```javascript
if (data.success && data.user) {
  onLogin(data.user); // ← Calls App.jsx's handleLogin
}
```

---

## Integration with App.jsx

### Updated App.jsx Features

**Before (Demo Login)**:
- Used mock token authentication
- Selected from preset demo users
- No real backend connection

**After (Real Login)**:
- Cookie-based JWT authentication
- Connects to Render backend
- Checks if user is already logged in on mount
- Handles logout properly

### Key Changes in App.jsx

```javascript
// 1. Import LoginPage
import LoginPage from './components/LoginPage.jsx';

// 2. Enable cookies in axios
axios.defaults.withCredentials = true;

// 3. Check authentication on mount
useEffect(() => {
  checkAuth();
}, []);

const checkAuth = async () => {
  try {
    const { data } = await axios.get('/auth/me');
    if (data.user) {
      setUser(data.user);
    }
  } catch (err) {
    console.log('Not authenticated');
  } finally {
    setLoading(false);
  }
};

// 4. Handle login from LoginPage
const handleLogin = (userData) => {
  setUser(userData);
  setError(null);
  setActiveSection('dashboard');
};

// 5. Handle logout
const handleLogout = async () => {
  try {
    await axios.post('/auth/logout');
  } finally {
    setUser(null);
  }
};

// 6. Show LoginPage when not authenticated
if (!user) {
  return <LoginPage onLogin={handleLogin} />;
}
```

---

## Environment Variables

### Client (.env or .env.local)

```bash
VITE_API_URL=https://ec-exhibits.onrender.com
```

### Development vs Production

**Development** (localhost):
```bash
VITE_API_URL=http://localhost:4000
```

**Production** (Netlify):
```bash
VITE_API_URL=https://ec-exhibits.onrender.com
```

---

## Test Credentials

Use the seeded test user:

```
Email:    matan@ec-exhibits.com
Password: Password123!
```

Or any other user you've created via:
- `node seedUser.js`
- POST /auth/register endpoint

---

## Usage

### Running Locally

```bash
# Terminal 1: Start backend
cd server
node index.js

# Terminal 2: Start frontend
cd client
npm run dev
```

Visit http://localhost:5173 and login with test credentials.

### Deploying to Netlify

1. **Set Environment Variable**:
   - Netlify Dashboard → Site Settings → Environment Variables
   - Add: `VITE_API_URL` = `https://ec-exhibits.onrender.com`

2. **Build and Deploy**:
   ```bash
   cd client
   npm run build
   netlify deploy --prod
   ```

3. **CORS Configuration** (Backend):
   Ensure your Render backend allows your Netlify domain:
   ```javascript
   // server/index.js
   app.use(cors({
     origin: ['https://your-app.netlify.app', 'http://localhost:5173'],
     credentials: true
   }));
   ```

---

## Component Props

### LoginPage

```typescript
interface LoginPageProps {
  onLogin: (user: User) => void;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'staff' | 'client';
  createdAt: string;
  updatedAt: string;
}
```

**onLogin**: Callback function called when login succeeds. Receives user data from backend.

---

## Styling

Uses **Tailwind CSS** classes matching your existing design system:

- **Container**: `rounded-3xl bg-white p-8 shadow-xl`
- **Inputs**: `rounded-lg border border-slate-300 focus:border-indigo-500`
- **Button**: `rounded-lg bg-indigo-600 hover:bg-indigo-700`
- **Error**: `rounded-lg bg-rose-50 border border-rose-200`

All styling is inline with Tailwind classes - no separate CSS file needed.

---

## Error Handling

### Display Errors

```jsx
{error && (
  <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3">
    <p className="text-sm text-rose-600">{error}</p>
  </div>
)}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid email or password" | Wrong credentials | Check email/password |
| "Unable to connect to server" | Backend down | Start backend server |
| "Failed to fetch" | CORS issue | Configure CORS on backend |
| "Network error" | Wrong API URL | Check VITE_API_URL |

---

## Authentication Flow

```
┌──────────────┐
│   Browser    │
│  (React App) │
└──────┬───────┘
       │ 1. User enters email/password
       │    and clicks "Sign In"
       ▼
┌──────────────┐
│  LoginPage   │  2. POST /auth/login
│  Component   │     { email, password }
└──────┬───────┘     credentials: 'include'
       │
       ▼
┌──────────────┐
│   Render     │  3. Validate credentials
│   Backend    │  4. Hash password with bcrypt
└──────┬───────┘  5. Generate JWT token
       │          6. Set HTTP-only cookie
       │          7. Return user data
       ▼
┌──────────────┐
│  LoginPage   │  8. Receive user data
│  Component   │  9. Call onLogin(user)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   App.jsx    │  10. Update user state
│              │  11. Show Dashboard
└──────────────┘
       │
       │ Subsequent requests include cookie automatically
       ▼
┌──────────────┐
│   Backend    │  authRequired middleware
│   (Protected │  verifies JWT from cookie
│    Routes)   │  populates req.user
└──────────────┘
```

---

## Security Features

### HTTP-Only Cookies

```javascript
credentials: 'include'
```

- Cookie cannot be accessed by JavaScript (XSS protection)
- Automatically sent with every request
- Managed by browser securely

### CORS with Credentials

Backend must allow credentials:

```javascript
app.use(cors({
  origin: 'https://your-app.netlify.app',
  credentials: true  // ← Required for cookies
}));
```

### Secure Flag in Production

Backend sets `secure: true` when `NODE_ENV=production`:

```javascript
res.cookie('token', jwt, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // ← HTTPS only
  sameSite: 'strict'
});
```

---

## Testing

### Test Login Flow

```bash
# 1. Start backend
cd server
node index.js

# 2. Start frontend
cd client
npm run dev

# 3. Open browser
open http://localhost:5173

# 4. Login with test user
Email: matan@ec-exhibits.com
Password: Password123!

# 5. Verify success
# Should see Dashboard or welcome message
```

### Test Authentication Persistence

```bash
# 1. Login successfully
# 2. Refresh the page (F5)
# 3. Should remain logged in (checkAuth on mount)
```

### Test Logout

```bash
# 1. Click logout button
# 2. Should return to login page
# 3. Cookie should be cleared
# 4. Refresh should show login page (not auto-login)
```

---

## Customization

### Remove Test Credentials Display

In `LoginPage.jsx`, delete lines 115-122:

```jsx
{/* Delete this section in production */}
<div className="border-t border-slate-200 pt-4">
  <p className="text-xs text-slate-500 text-center mb-2">Test Credentials:</p>
  <div className="space-y-1 text-xs text-slate-400 text-center">
    <p>Email: <code className="bg-slate-100 px-1 py-0.5 rounded">matan@ec-exhibits.com</code></p>
    <p>Password: <code className="bg-slate-100 px-1 py-0.5 rounded">Password123!</code></p>
  </div>
</div>
```

### Add "Remember Me" Checkbox

```jsx
const [rememberMe, setRememberMe] = useState(false);

// In form:
<label className="flex items-center gap-2">
  <input
    type="checkbox"
    checked={rememberMe}
    onChange={(e) => setRememberMe(e.target.checked)}
    className="rounded border-slate-300"
  />
  <span className="text-sm text-slate-600">Remember me</span>
</label>
```

### Add "Forgot Password" Link

```jsx
<div className="text-center">
  <a
    href="/forgot-password"
    className="text-sm text-indigo-600 hover:text-indigo-700"
  >
    Forgot your password?
  </a>
</div>
```

### Add "Sign Up" Link

```jsx
<p className="text-sm text-slate-600 text-center">
  Don't have an account?{' '}
  <a href="/register" className="text-indigo-600 hover:text-indigo-700 font-semibold">
    Sign up
  </a>
</p>
```

---

## Troubleshooting

### Login Button Does Nothing

**Check**: Console for errors
```javascript
// Open browser dev tools (F12)
// Look for network errors or CORS issues
```

### "Failed to fetch" Error

**Solution**: Check API URL
```javascript
// In LoginPage.jsx
console.log('API URL:', API_URL);

// Should be: https://ec-exhibits.onrender.com
// Not: http://localhost:4000 (unless testing locally)
```

### Cookie Not Being Set

**Check CORS Configuration**:
```javascript
// Backend must have:
app.use(cors({
  origin: 'https://your-netlify-app.netlify.app',
  credentials: true  // ← Must be true!
}));
```

### Login Succeeds But Redirects Back to Login

**Check**: `axios.defaults.withCredentials`
```javascript
// In App.jsx
axios.defaults.withCredentials = true; // ← Must be set!
```

### Environment Variable Not Working

**Vite requires VITE_ prefix**:
```bash
# ❌ Wrong
API_URL=https://ec-exhibits.onrender.com

# ✅ Correct
VITE_API_URL=https://ec-exhibits.onrender.com
```

**Restart dev server after changing .env**:
```bash
# Stop server (Ctrl+C)
npm run dev
```

---

## Complete Files

### LoginPage.jsx (130 lines)

Located at: `client/src/components/LoginPage.jsx`

Key features:
- Email/password form
- Backend API integration
- Cookie-based auth with `credentials: 'include'`
- Error handling
- Loading states
- Tailwind CSS styling

### App.jsx (Updated)

Key changes:
- Import LoginPage component
- Enable `axios.defaults.withCredentials = true`
- Check authentication on mount with `/auth/me`
- Handle login callback from LoginPage
- Show LoginPage when not authenticated

---

## Summary

### What You Have

✅ **LoginPage.jsx** - Complete login component  
✅ **App.jsx** - Updated with real authentication  
✅ **Cookie-based auth** - Secure, production-ready  
✅ **Error handling** - User-friendly messages  
✅ **Responsive design** - Works on all devices  

### How to Use

```bash
# 1. Set environment variable
echo "VITE_API_URL=https://ec-exhibits.onrender.com" > client/.env

# 2. Start frontend
cd client
npm run dev

# 3. Login with test user
Email: matan@ec-exhibits.com
Password: Password123!
```

### Deploy to Netlify

```bash
cd client
npm run build
netlify deploy --prod
```

Set `VITE_API_URL` in Netlify environment variables.

**Your React login page is ready!** 🚀

---

*Last Updated: 2025-11-19*  
*Frontend: React + Vite + Tailwind CSS*  
*Backend: Node + Express on Render*  
*Database: Neon Postgres*
