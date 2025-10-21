import { useEffect, useState } from 'react';
import axios from 'axios';
import { Dashboard } from './components/Dashboard.jsx';
import logoMark from './assets/exhibit-control-logo.svg';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
axios.defaults.baseURL = API_URL;

// Vite exposes env vars on import.meta.env (VITE_ prefix preserved).
const BUILD_SHA = import.meta.env.VITE_BUILD_SHA || 'dev';

const demoUsers = [
  { id: 'user-owner', label: 'Olivia Owner' },
  { id: 'user-staff', label: 'Samuel Staff' },
  { id: 'user-client', label: 'Cameron Client' }
];

export default function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [error, setError] = useState(null);

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

  const handleLogin = async userId => {
    try {
      const { data } = await axios.post('/auth/token', { userId });
      setToken(data.token);
      setUser(data.user);
      setError(null);
      setActiveSection('dashboard');
    } catch (err) {
      setError('Unable to sign in. Make sure the server is running.');
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-md space-y-6 rounded-3xl bg-white p-8 text-center shadow-xl">
          <div className="flex flex-col items-center gap-3">
            <img src={logoMark} alt="Exhibit Control" className="h-16 w-auto" />
            <h1 className="text-2xl font-semibold text-slate-900">Client Portal</h1>
          </div>
          <p className="text-sm text-slate-500">
            Choose a demo persona to explore the dashboard prototype.
          </p>
          <div className="grid gap-3">
            {demoUsers.map(demo => (
              <button
                key={demo.id}
                type="button"
                onClick={() => handleLogin(demo.id)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-indigo-400 hover:text-indigo-600"
              >
                {demo.label}
              </button>
            ))}
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <p className="text-xs text-slate-400">
            Start the server with <code>npm run dev</code> inside <code>server/</code>
          </p>
          <p className="mt-2 text-[10px] text-slate-300">BUILD: {BUILD_SHA}</p>
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
