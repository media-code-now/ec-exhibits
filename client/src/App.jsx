import { useEffect, useState } from 'react';
import axios from 'axios';
import { Dashboard } from './components/Dashboard.jsx';
import LoginPage from './components/LoginPage.jsx';
import CreateProjectForm from './components/CreateProjectForm.jsx';

// Use environment variable for API URL, fallback to localhost for development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
axios.defaults.baseURL = API_URL;
axios.defaults.withCredentials = true; // Important: Send cookies with requests

// Add axios interceptors for robust error handling
axios.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    console.error('[Axios Request Error]', error);
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle different types of errors gracefully
    if (error.response) {
      // Server responded with error status
      console.error('[Axios Response Error]', error.response.status, error.response.data);
    } else if (error.request) {
      // Request was made but no response received
      console.error('[Axios Network Error]', error.message);
    } else {
      // Something else happened
      console.error('[Axios Error]', error.message);
    }
    return Promise.reject(error);
  }
);

// Global error handler to suppress external extension errors (Solana, crypto wallets, etc.)
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    // Check if error is from a browser extension (Solana, Phantom, etc.)
    if (
      event.filename?.includes('solanaActionsContentScript') ||
      event.filename?.includes('chrome-extension://') ||
      event.filename?.includes('moz-extension://') ||
      event.message?.includes('solanaActionsContentScript')
    ) {
      console.warn('[App] Suppressed external extension error:', event.message);
      event.preventDefault(); // Prevent error from showing in console
      event.stopPropagation();
      return false;
    }
  });

  // Handle unhandled promise rejections from extensions
  window.addEventListener('unhandledrejection', (event) => {
    if (
      event.reason?.stack?.includes('solanaActionsContentScript') ||
      event.reason?.stack?.includes('chrome-extension://') ||
      event.reason?.stack?.includes('moz-extension://')
    ) {
      console.warn('[App] Suppressed external extension promise rejection');
      event.preventDefault();
      return false;
    }
  });
}

export default function App() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Check if user is already logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    console.log('[App] Checking authentication...');
    try {
      // Check if we have a token in localStorage
      const token = localStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('[App] Found token in localStorage, set in axios');
      }
      
      console.log('[App] Calling /auth/me...');
      const { data } = await axios.get('/auth/me');
      console.log('[App] Auth response:', data);
      if (data.user) {
        setUser(data.user);
        // Load projects for authenticated user
        try {
          console.log('[App] Loading projects...');
          const projectsData = await axios.get('/projects');
          console.log('[App] Projects loaded:', projectsData.data);
          setProjects(projectsData.data.projects || []);
          if (projectsData.data.projects?.length > 0) {
            setActiveProjectId(projectsData.data.projects[0].id);
          }
        } catch (err) {
          console.error('[App] Failed to load projects:', err);
        }
      }
    } catch (err) {
      // User not authenticated, will show login page
      console.log('[App] Not authenticated:', err.message);
      // Clear token if auth failed
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      console.log('[App] Setting loading to false');
      setLoading(false);
    }
  };

  const handleLogin = (userData, token) => {
    setUser(userData);
    setError(null);
    setActiveSection('dashboard');
    
    // Store token in localStorage for development (when cookies don't work cross-port)
    if (token) {
      localStorage.setItem('token', token);
      setToken(token);
      // Set default Authorization header for all axios requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log('[App] Token stored in localStorage and set in axios');
    }
    
    // Reload projects after login
    checkAuth();
  };

  const handleProjectCreated = project => {
    console.log('[App] handleProjectCreated called with:', project);
    console.log('[App] Current projects before update:', projects);
    setProjects(prev => {
      const updated = [...prev, project];
      console.log('[App] Updated projects:', updated);
      return updated;
    });
    setActiveProjectId(project.id);
    setShowCreateProject(false);
  };

  const handleProjectUpdated = project => {
    setProjects(prev => prev.map(item => (item.id === project.id ? project : item)));
  };

  const handleLogout = async () => {
    try {
      await axios.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Clear token from localStorage
      localStorage.removeItem('token');
      setToken(null);
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      setProjects([]);
      setActiveProjectId(null);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-500 shadow">
          Loading...
        </p>
      </div>
    );
  }

  // Not logged in - show login page
  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const activeProject = projects.find(project => project.id === activeProjectId);

  // Show create project form if explicitly opened (owner only)
  if (showCreateProject && user.role === 'owner') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-4">
        <CreateProjectForm 
          onProjectCreated={handleProjectCreated}
          onCancel={() => setShowCreateProject(false)}
        />
      </div>
    );
  }

  // If no projects, show waiting message for staff/clients
  if (!activeProject && projects.length === 0 && user.role !== 'owner') {
    // Staff/Client with no projects - show waiting message
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-md space-y-6 rounded-3xl bg-white p-8 text-center shadow-xl">
          {/* Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>

          {/* Welcome message */}
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Welcome, {user.name || user.displayName}!
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              You haven't been assigned to any projects yet.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Contact your project owner to be added to a project.
            </p>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  if (!activeProject) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-500 shadow">
          Loading your projects…
        </p>
      </div>
    );
  }

  return (
    <Dashboard
      user={user}
      project={activeProject}
      projects={projects}
      token={token}
      onProjectChange={setActiveProjectId}
      onProjectCreated={handleProjectCreated}
      onProjectUpdated={handleProjectUpdated}
      onLogout={handleLogout}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    />
  );
}
