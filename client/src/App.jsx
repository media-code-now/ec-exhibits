import { useEffect, useState } from 'react';
import axios from 'axios';
import { Dashboard } from './components/Dashboard.jsx';
import logoMark from './assets/exhibit-control-logo.svg';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
axios.defaults.baseURL = API_URL;

// Vite exposes env vars on import.meta.env (VITE_ prefix preserved).
const BUILD_SHA = import.meta.env.VITE_BUILD_SHA || 'dev';

export default function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [error, setError] = useState(null);
  
  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (!token) return;
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    axios
      .get('/me')
      .then(({ data }) => {
        setUser(data.user);
        setProjects(data.projects);
        setActiveProjectId(prev => prev ?? data.projects[0]?.id ?? null);
      })
      .catch(err => {
        setError(err.message);
      });
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoggingIn(true);
    
    try {
      const { data } = await axios.post('/auth/login', { email, password });
      setToken(data.token);
      setUser(data.user);
      setActiveSection('dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to sign in. Please check your credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleProjectCreated = project => {
    setProjects(prev => [...prev, project]);
    setActiveProjectId(project.id);
  };

  const handleProjectUpdated = project => {
    setProjects(prev => prev.map(item => (item.id === project.id ? project : item)));
  };

  if (!token || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
        <div className="w-full max-w-md space-y-6 rounded-3xl bg-white p-8 shadow-2xl">
          <div className="flex flex-col items-center gap-3">
            <img src={logoMark} alt="Exhibit Control" className="h-16 w-auto" />
            <h1 className="text-2xl font-bold text-slate-900">EC Exhibits Portal</h1>
            <p className="text-sm text-slate-600">Sign in to your account</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
                disabled={isLoggingIn}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={isLoggingIn}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
            
            {error && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isLoggingIn ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          
          <div className="border-t border-slate-200 pt-4">
            <p className="text-xs text-slate-500 text-center mb-2">Demo Accounts (Password: password123)</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="font-semibold text-slate-700">Owner</p>
                <p className="text-[11px]">olivia@ecexhibits.com</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="font-semibold text-slate-700">Staff</p>
                <p className="text-[11px]">samuel@ecexhibits.com</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="font-semibold text-slate-700">Staff</p>
                <p className="text-[11px]">skyler@ecexhibits.com</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="font-semibold text-slate-700">Client</p>
                <p className="text-[11px]">cameron@client.com</p>
              </div>
            </div>
          </div>
          
          <p className="mt-4 text-[10px] text-center text-slate-400">BUILD: {BUILD_SHA}</p>
        </div>
      </div>
    );
  }

  const activeProject = projects.find(project => project.id === activeProjectId);

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
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    />
  );
}
