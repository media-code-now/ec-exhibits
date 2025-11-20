import { useEffect, useState } from 'react';
import axios from 'axios';
import { Dashboard } from './components/Dashboard.jsx';
import LoginPage from './components/LoginPage.jsx';
import CreateProjectForm from './components/CreateProjectForm.jsx';

// Use environment variable for API URL, fallback to localhost for development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
axios.defaults.baseURL = API_URL;
axios.defaults.withCredentials = true; // Important: Send cookies with requests

export default function App() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateProject, setShowCreateProject] = useState(false);

  // Check if user is already logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    console.log('[App] Checking authentication...');
    try {
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
    } finally {
      console.log('[App] Setting loading to false');
      setLoading(false);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setError(null);
    setActiveSection('dashboard');
  };

  const handleProjectCreated = project => {
    setProjects(prev => [...prev, project]);
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

  // Show create project form or welcome message if no projects
  if (!activeProject && projects.length === 0) {
    if (showCreateProject) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-4">
          <CreateProjectForm 
            onProjectCreated={handleProjectCreated}
            onCancel={() => setShowCreateProject(false)}
          />
        </div>
      );
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-md space-y-6 rounded-3xl bg-white p-8 text-center shadow-xl">
          {/* Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
            <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>

          {/* Welcome message */}
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Welcome, {user.name || user.displayName}!
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Get started by creating your first project.
            </p>
          </div>

          {/* Create Project Button */}
          <button
            onClick={() => setShowCreateProject(true)}
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            Create Your First Project
          </button>

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
      onProjectChange={setActiveProjectId}
      onProjectCreated={handleProjectCreated}
      onProjectUpdated={handleProjectUpdated}
      onLogout={handleLogout}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    />
  );
}
