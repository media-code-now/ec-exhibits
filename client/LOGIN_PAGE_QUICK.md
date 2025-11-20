# React Login Page - Quick Reference

## ✅ Files Created

1. **`client/src/components/LoginPage.jsx`** - Login component
2. **`client/src/App.jsx`** - Updated with real authentication

---

## Component Code

**LoginPage.jsx** handles:
- Email/password form
- POST to `https://ec-exhibits.onrender.com/auth/login`
- `credentials: 'include'` for cookies
- Error display
- Calls `onLogin(user)` on success

---

## Usage in App.jsx

```javascript
import LoginPage from './components/LoginPage.jsx';

// Enable cookies
axios.defaults.withCredentials = true;

// Show login page when not authenticated
if (!user) {
  return <LoginPage onLogin={handleLogin} />;
}
```

---

## Test Credentials

```
Email:    matan@ec-exhibits.com
Password: Password123!
```

---

## Environment Variable

Create `client/.env`:

```bash
VITE_API_URL=https://ec-exhibits.onrender.com
```

For local development:
```bash
VITE_API_URL=http://localhost:4000
```

---

## Run Locally

```bash
# Terminal 1: Backend
cd server
node index.js

# Terminal 2: Frontend  
cd client
npm run dev
```

Visit http://localhost:5173 and login.

---

## Deploy to Netlify

1. **Set environment variable** in Netlify dashboard:
   - `VITE_API_URL` = `https://ec-exhibits.onrender.com`

2. **Build and deploy**:
   ```bash
   cd client
   npm run build
   netlify deploy --prod
   ```

---

## Key Features

✅ Cookie-based JWT authentication  
✅ Auto-login check on mount (`/auth/me`)  
✅ Error handling with user-friendly messages  
✅ Loading states during submission  
✅ Responsive Tailwind CSS design  
✅ Logout functionality  

---

## Backend CORS Required

Your Render backend must allow your Netlify domain:

```javascript
app.use(cors({
  origin: ['https://your-app.netlify.app', 'http://localhost:5173'],
  credentials: true  // ← Required for cookies!
}));
```

---

## Authentication Flow

1. User enters email/password
2. POST to `/auth/login` with `credentials: 'include'`
3. Backend validates and sets HTTP-only cookie
4. Backend returns user data
5. LoginPage calls `onLogin(user)`
6. App.jsx updates state, shows Dashboard
7. Subsequent requests include cookie automatically

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Failed to fetch" | Check `VITE_API_URL` is set correctly |
| Cookie not set | Backend must have `credentials: true` in CORS |
| Login success but redirects back | Set `axios.defaults.withCredentials = true` |
| Env var not working | Restart dev server after changing `.env` |

---

## Remove Test Credentials (Production)

Delete lines 115-122 in `LoginPage.jsx`:

```jsx
{/* Remove this section */}
<div className="border-t border-slate-200 pt-4">
  <p className="text-xs text-slate-500 text-center mb-2">Test Credentials:</p>
  ...
</div>
```

---

## Complete Documentation

See **LOGIN_PAGE_GUIDE.md** for:
- Complete authentication flow
- Security features
- Customization options
- Advanced troubleshooting

---

**Ready to login!** 🔐

*Test with: matan@ec-exhibits.com / Password123!*
