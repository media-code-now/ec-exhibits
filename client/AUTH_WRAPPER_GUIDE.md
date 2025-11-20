# React Auth Wrapper - Complete Documentation

## Overview

A complete authentication wrapper for your React app that:
- Checks authentication on mount
- Shows loading state while checking
- Shows LoginPage if not authenticated
- Shows MainApp if authenticated
- Handles logout with cookie clearing

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  App.jsx (Auth Wrapper)                                     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  1. On Mount: Check Authentication                 │    │
│  │     GET /auth/me with credentials: 'include'       │    │
│  └────────────────────────────────────────────────────┘    │
│                         │                                    │
│            ┌────────────┴───────────┐                       │
│            ▼                        ▼                        │
│  ┌──────────────────┐    ┌─────────────────────┐          │
│  │  Loading State   │    │  User Authenticated │          │
│  │  "Loading..."    │    │                     │          │
│  └──────────────────┘    └─────────────────────┘          │
│                                     │                        │
│                        ┌────────────┴───────────┐          │
│                        ▼                        ▼           │
│            ┌──────────────────┐    ┌─────────────────┐    │
│            │   No User        │    │   User Found    │    │
│            │  <LoginPage />   │    │  <MainApp />    │    │
│            └──────────────────┘    └─────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Files Created

### 1. App-clean.jsx (New Auth Wrapper)

**Location**: `client/src/App-clean.jsx`

**Purpose**: Clean authentication wrapper that handles the auth flow

**Key Features**:
- ✅ Checks authentication on mount
- ✅ Shows loading spinner while checking
- ✅ Shows LoginPage if not authenticated
- ✅ Shows MainApp if authenticated
- ✅ Handles logout with cookie clearing
- ✅ Uses fetch with `credentials: 'include'`

### 2. MainApp.jsx (Main Application)

**Location**: `client/src/components/MainApp.jsx`

**Purpose**: Main application shown after successful authentication

**Key Features**:
- ✅ Header with logo and user menu
- ✅ User avatar (first letter of name)
- ✅ Dropdown menu with user info
- ✅ Logout button
- ✅ Welcome message
- ✅ User information display
- ✅ Placeholder for projects
- ✅ Responsive Tailwind CSS design

---

## Complete Code

### App-clean.jsx

```javascript
import { useEffect, useState } from 'react';
import LoginPage from './components/LoginPage.jsx';
import MainApp from './components/MainApp.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'https://ec-exhibits.onrender.com';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        method: 'GET',
        credentials: 'include', // Important: Send cookies
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setUser(data.user);
        }
      }
    } catch (err) {
      console.log('Not authenticated:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include', // Important: Send/clear cookies
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Clear user regardless of logout success
      setUser(null);
    }
  };

  // Loading state while checking authentication
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="mt-4 text-sm font-medium text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in - show login page
  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Logged in - show main app
  return <MainApp user={user} onLogout={handleLogout} />;
}
```

---

## How It Works

### 1. Authentication Check on Mount

```javascript
useEffect(() => {
  checkAuth();
}, []);

const checkAuth = async () => {
  const response = await fetch(`${API_URL}/auth/me`, {
    credentials: 'include' // ← Sends cookie with request
  });
  
  if (response.ok) {
    const data = await response.json();
    setUser(data.user);
  }
  
  setLoading(false);
};
```

**What happens**:
1. Component mounts
2. Calls `checkAuth()`
3. Makes GET request to `/auth/me` with cookies
4. If cookie is valid, backend returns user data
5. Sets `user` state with data
6. Sets `loading` to false

### 2. Loading State

```javascript
if (loading) {
  return <div>Loading...</div>;
}
```

Shows a spinner while checking authentication. Prevents flash of login page.

### 3. Conditional Rendering

```javascript
if (!user) {
  return <LoginPage onLogin={handleLogin} />;
}

return <MainApp user={user} onLogout={handleLogout} />;
```

**Logic**:
- `loading === true` → Show loading spinner
- `loading === false && user === null` → Show LoginPage
- `loading === false && user !== null` → Show MainApp

### 4. Logout Flow

```javascript
const handleLogout = async () => {
  // Call backend to clear cookie
  await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include'
  });
  
  // Clear user state (returns to login page)
  setUser(null);
};
```

---

## Props Interface

### LoginPage

```typescript
interface LoginPageProps {
  onLogin: (user: User) => void;
}
```

**onLogin**: Called when user successfully logs in. Receives user data from backend.

### MainApp

```typescript
interface MainAppProps {
  user: User;
  onLogout: () => void;
}

interface User {
  id: string;
  email: string;
  name?: string;
  displayName?: string;
  role: 'owner' | 'staff' | 'client';
  createdAt: string;
  updatedAt: string;
}
```

**user**: The authenticated user's data  
**onLogout**: Callback to handle logout

---

## Complete Authentication Flow

```
┌──────────────┐
│   Browser    │
│  Loads App   │
└──────┬───────┘
       │ 1. Component mounts
       │    useState(loading = true)
       ▼
┌──────────────┐
│   App.jsx    │  2. useEffect runs
│              │  3. Call checkAuth()
└──────┬───────┘
       │ 4. GET /auth/me
       │    credentials: 'include'
       ▼
┌──────────────┐
│   Backend    │  5. Check JWT cookie
│   (Render)   │  6. If valid, return user
└──────┬───────┘     If invalid, return 401
       │
       ▼
┌──────────────────────────────────────────┐
│  Response                                 │
│                                           │
│  ✅ 200 OK { user: {...} }               │
│     → setUser(data.user)                 │
│     → setLoading(false)                  │
│     → Show MainApp                       │
│                                           │
│  ❌ 401 Unauthorized                     │
│     → setUser(null)                      │
│     → setLoading(false)                  │
│     → Show LoginPage                     │
└───────────────────────────────────────────┘
```

---

## Usage

### Replace Your Current App.jsx

**Option 1: Rename and use**
```bash
cd client/src
mv App.jsx App-old.jsx
mv App-clean.jsx App.jsx
```

**Option 2: Copy the code**
Copy the contents of `App-clean.jsx` into your `App.jsx`

### Import MainApp

Make sure MainApp.jsx is in the right location:
```
client/src/components/MainApp.jsx
```

### Set Environment Variable

Create `client/.env`:
```bash
VITE_API_URL=https://ec-exhibits.onrender.com
```

### Run the App

```bash
cd client
npm run dev
```

---

## MainApp Component

### Features

**Header**:
- Logo and title
- User avatar (first letter of name)
- Dropdown menu with user info
- Logout button

**Content**:
- Welcome message with user's name
- User information card (email, role, ID)
- Placeholder for projects
- "Create Project" button (stub)

### Customization

#### Add More Content

```jsx
<main className="mx-auto max-w-7xl px-4 py-8">
  {/* Add your components here */}
  <ProjectsList />
  <FileManager />
  <MessagingPanel />
</main>
```

#### Replace with Your Dashboard

```jsx
// Instead of MainApp stub, use your existing Dashboard
return <Dashboard user={user} onLogout={handleLogout} />;
```

#### Add Navigation

```jsx
<nav className="flex gap-4">
  <button onClick={() => setSection('dashboard')}>Dashboard</button>
  <button onClick={() => setSection('projects')}>Projects</button>
  <button onClick={() => setSection('files')}>Files</button>
</nav>
```

---

## Environment Variables

### Development (.env)

```bash
VITE_API_URL=http://localhost:4000
```

### Production (Netlify)

Set in Netlify Dashboard → Site Settings → Environment Variables:
```bash
VITE_API_URL=https://ec-exhibits.onrender.com
```

---

## Testing

### Test Authentication Check

```bash
# 1. Start backend
cd server
node index.js

# 2. Start frontend
cd client
npm run dev

# 3. Open browser
open http://localhost:5173

# Should show:
# - Loading spinner (briefly)
# - LoginPage (if not logged in)
```

### Test Login Flow

```bash
# 1. Login with test credentials
Email: matan@ec-exhibits.com
Password: Password123!

# 2. Should see MainApp with:
# - User's name in header
# - Welcome message
# - User information
```

### Test Auto-Login

```bash
# 1. Login successfully
# 2. Refresh page (F5)
# 3. Should see:
#    - Loading spinner (briefly)
#    - MainApp (not LoginPage!)
# 4. Cookie keeps you logged in
```

### Test Logout

```bash
# 1. Click user avatar in header
# 2. Click "Sign out"
# 3. Should return to LoginPage
# 4. Refresh page
# 5. Should stay on LoginPage (cookie cleared)
```

---

## State Management

### Current Implementation

```javascript
const [user, setUser] = useState(null);
const [loading, setLoading] = useState(true);
```

Simple and effective for auth state.

### Optional: Context API

For sharing user state across deep components:

```javascript
// AuthContext.jsx
import { createContext, useContext } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  
  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

### Optional: React Query

For server state management:

```javascript
import { useQuery } from '@tanstack/react-query';

const { data: user, isLoading } = useQuery({
  queryKey: ['auth'],
  queryFn: checkAuth,
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

---

## Security Features

### HTTP-Only Cookies

```javascript
credentials: 'include'
```

- Cookie cannot be accessed by JavaScript
- Automatically sent with every request
- Protected from XSS attacks

### Auto-Logout on 401

```javascript
const checkAuth = async () => {
  const response = await fetch('/auth/me', {
    credentials: 'include'
  });
  
  if (!response.ok) {
    setUser(null); // Auto-logout if unauthorized
  }
};
```

### Secure Logout

```javascript
const handleLogout = async () => {
  await fetch('/auth/logout', {
    method: 'POST',
    credentials: 'include'
  });
  
  setUser(null); // Clear state even if request fails
};
```

---

## Troubleshooting

### Loading Never Ends

**Symptom**: Stuck on "Loading..." forever

**Solution**: Check backend is running and `/auth/me` endpoint works
```bash
curl http://localhost:4000/auth/me
```

### Auto-Login Not Working

**Symptom**: Logged in but refreshing shows login page

**Check**:
1. Backend sets cookie correctly
2. `credentials: 'include'` in fetch
3. CORS allows credentials
4. Cookie not expired

### Logout Not Working

**Symptom**: Logout but still shows MainApp

**Check**:
1. `setUser(null)` is called
2. Backend clears cookie
3. No state caching issues

---

## Comparison with Current App.jsx

### Current App.jsx

```javascript
// Uses axios
import axios from 'axios';
axios.defaults.withCredentials = true;

// Has project management logic
const [projects, setProjects] = useState([]);
const [activeProjectId, setActiveProjectId] = useState(null);

// Shows Dashboard directly
return <Dashboard user={user} projects={projects} ... />;
```

### App-clean.jsx

```javascript
// Uses fetch
credentials: 'include'

// Only handles auth
const [user, setUser] = useState(null);

// Delegates to MainApp
return <MainApp user={user} onLogout={handleLogout} />;
```

**Benefits of App-clean.jsx**:
- ✅ Cleaner separation of concerns
- ✅ Auth logic isolated
- ✅ Easier to test
- ✅ No axios dependency for auth
- ✅ Simpler state management

---

## Integration with Existing Code

### Option 1: Use MainApp Stub

Keep the simple MainApp.jsx and build from there.

### Option 2: Use Existing Dashboard

```javascript
// In App-clean.jsx
import { Dashboard } from './components/Dashboard.jsx';

// Replace MainApp with Dashboard
return <Dashboard user={user} onLogout={handleLogout} />;
```

### Option 3: Hybrid Approach

```javascript
// In MainApp.jsx
import { Dashboard } from './Dashboard.jsx';

export default function MainApp({ user, onLogout }) {
  return <Dashboard user={user} onLogout={onLogout} />;
}
```

---

## Deployment

### Build Frontend

```bash
cd client
npm run build
```

### Deploy to Netlify

```bash
netlify deploy --prod
```

### Set Environment Variable

Netlify Dashboard:
- `VITE_API_URL` = `https://ec-exhibits.onrender.com`

### Verify CORS

Backend must allow your Netlify domain:

```javascript
app.use(cors({
  origin: 'https://your-app.netlify.app',
  credentials: true
}));
```

---

## Summary

### Files Created

1. ✅ **App-clean.jsx** - Clean auth wrapper
2. ✅ **MainApp.jsx** - Main application component

### Key Features

✅ **Check auth on mount** - GET `/auth/me` with `credentials: 'include'`  
✅ **Loading state** - Animated spinner while checking  
✅ **Conditional rendering** - LoginPage vs MainApp  
✅ **Logout handling** - POST `/auth/logout` + clear state  
✅ **Cookie-based auth** - Secure, automatic  
✅ **Auto-login** - Stays logged in on refresh  
✅ **Clean architecture** - Separation of concerns  

### Ready to Use

```bash
# 1. Replace App.jsx
mv App-clean.jsx App.jsx

# 2. Set environment variable
echo "VITE_API_URL=https://ec-exhibits.onrender.com" > .env

# 3. Run app
npm run dev
```

**Your React auth wrapper is complete!** 🎉

---

*Last Updated: 2025-11-19*  
*Frontend: React + Vite + Tailwind CSS on Netlify*  
*Backend: Node + Express on Render*
