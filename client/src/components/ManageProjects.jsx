import { useState } from 'react';
import axios from 'axios';

export default function ManageProjects({ projects, onProjectDeleted }) {
  const [deletingProjectId, setDeletingProjectId] = useState(null);
  const [selectedProjects, setSelectedProjects] = useState(new Set());
  const [isDeletingMultiple, setIsDeletingMultiple] = useState(false);

  const handleToggleProject = (projectId) => {
    setSelectedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const handleToggleAll = () => {
    if (selectedProjects.size === projects.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(projects.map(p => p.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedProjects.size === 0) return;

    const projectNames = projects
      .filter(p => selectedProjects.has(p.id))
      .map(p => p.name)
      .join(', ');

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedProjects.size} project${selectedProjects.size > 1 ? 's' : ''}?\n\n${projectNames}\n\nThis will permanently remove all project data including stages, tasks, files, and messages.\n\nThis action cannot be undone.`
    );
    
    if (!confirmed) return;

    setIsDeletingMultiple(true);
    
    try {
      // Delete all selected projects
      const deletePromises = Array.from(selectedProjects).map(projectId =>
        axios.delete(`/projects/${projectId}`)
      );
      
      await Promise.all(deletePromises);
      
      console.log('[ManageProjects] Successfully deleted', selectedProjects.size, 'projects');
      
      // Notify parent for each deleted project
      selectedProjects.forEach(projectId => {
        onProjectDeleted(projectId);
      });
      
      // Clear selection
      setSelectedProjects(new Set());
    } catch (error) {
      console.error('[ManageProjects] Failed to delete projects:', error);
      alert(error.response?.data?.error || 'Failed to delete some projects');
    } finally {
      setIsDeletingMultiple(false);
    }
  };

  const handleDeleteProject = async (projectId, projectName) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${projectName}"?\n\nThis will permanently remove all project data including stages, tasks, files, and messages.\n\nThis action cannot be undone.`
    );
    
    if (!confirmed) return;

    setDeletingProjectId(projectId);
    
    try {
      const response = await axios.delete(`/projects/${projectId}`);
      
      if (response.data.success) {
        console.log('[ManageProjects] Project deleted successfully:', projectId);
        onProjectDeleted(projectId);
      }
    } catch (error) {
      console.error('[ManageProjects] Failed to delete project:', error);
      alert(error.response?.data?.error || 'Failed to delete project');
    } finally {
      setDeletingProjectId(null);
    }
  };

  if (!projects || projects.length === 0) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow">
        <p className="text-slate-500">No projects found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-white shadow">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                All Projects ({projects.length})
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {selectedProjects.size > 0 
                  ? `${selectedProjects.size} project${selectedProjects.size > 1 ? 's' : ''} selected`
                  : 'Select projects to delete'
                }
              </p>
            </div>
            
            {selectedProjects.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={isDeletingMultiple}
                className={`
                  rounded-lg px-4 py-2 text-sm font-semibold transition-colors
                  ${isDeletingMultiple
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                  }
                `}
              >
                {isDeletingMultiple 
                  ? 'Deleting...' 
                  : `Delete ${selectedProjects.size} Project${selectedProjects.size > 1 ? 's' : ''}`
                }
              </button>
            )}
          </div>
          
          {projects.length > 0 && (
            <button
              onClick={handleToggleAll}
              className="mt-3 text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              {selectedProjects.size === projects.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-200">
          {projects.map((project) => (
            <div 
              key={project.id} 
              className={`
                flex items-center gap-4 px-6 py-4 transition-colors
                ${selectedProjects.has(project.id) ? 'bg-indigo-50' : 'hover:bg-slate-50'}
              `}
            >
              <input
                type="checkbox"
                checked={selectedProjects.has(project.id)}
                onChange={() => handleToggleProject(project.id)}
                className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              
              <div className="flex-1">
                <h3 className="text-sm font-medium text-slate-900">
                  {project.name}
                </h3>
                {(project.show || project.size) && (
                  <p className="mt-1 text-xs text-slate-500">
                    {[project.show, project.size].filter(Boolean).join(' • ')}
                  </p>
                )}
              </div>
              
              <button
                onClick={() => handleDeleteProject(project.id, project.name)}
                disabled={deletingProjectId === project.id || isDeletingMultiple}
                className={`
                  rounded-lg px-4 py-2 text-sm font-semibold transition-colors
                  ${deletingProjectId === project.id || isDeletingMultiple
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800'
                  }
                `}
              >
                {deletingProjectId === project.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
