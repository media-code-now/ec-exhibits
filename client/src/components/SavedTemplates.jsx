import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

export function SavedTemplates({ onLoadTemplate }) {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  
  const { data: templatesData, isLoading, error } = useQuery({
    queryKey: ['saved-templates'],
    queryFn: async () => {
      const { data } = await axios.get('/template/saved');
      return data;
    }
  });

  const loadTemplateMutation = useMutation({
    mutationFn: async (templateId) => {
      const { data } = await axios.get(`/template/saved/${templateId}`);
      return data.template;
    },
    onSuccess: async (template) => {
      try {
        // Update the main template with the loaded template stages
        await axios.put('/template/stages', { stages: template.stages });
        
        // Refresh all project stages to apply the new template
        await axios.post('/template/refresh-projects');
        
        // Invalidate queries to refresh all views
        queryClient.invalidateQueries(['template-stages']); // Refresh Template Admin Panel
        queryClient.invalidateQueries({ queryKey: ['stages'] }); // Refresh all project stages in Dashboard
        
        // Show success message
        setSuccessMessage(`Template "${template.name}" loaded successfully! ${template.stagesCount} stages have been applied.`);
        setErrorMessage(null);
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000);
        
        if (onLoadTemplate) {
          onLoadTemplate(template);
        }
      } catch (error) {
        setErrorMessage(`Failed to update template: ${error.response?.data?.error || error.message}`);
        setSuccessMessage(null);
      }
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      setErrorMessage(`Failed to load template: ${errorMsg}`);
      setSuccessMessage(null);
    }
  });

  const templates = templatesData?.templates ?? [];

  const handleLoadTemplate = (template) => {
    if (window.confirm(`Load "${template.name}"? This will replace the current template configuration.`)) {
      loadTemplateMutation.mutate(template.id);
    }
  };

  const handleDeleteTemplate = (templateId) => {
    // TODO: Implement template deletion functionality
    alert('Delete functionality coming soon!');
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Saved Templates</h3>
        <p className="text-sm text-slate-500">Loading templates...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Saved Templates</h3>
        <p className="text-sm text-red-500">Error loading templates: {error.response?.data?.error || error.message}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-2 text-xs text-indigo-600 hover:text-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900">Saved Templates</h3>
        <span className="text-xs text-slate-500">{templates.length} templates</span>
      </div>
      
      {/* Success Message */}
      {successMessage && (
        <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start justify-between">
          <p className="text-sm text-green-700">{successMessage}</p>
          <button 
            onClick={() => setSuccessMessage(null)}
            className="text-green-600 hover:text-green-800 ml-2 text-xs"
          >
            ✕
          </button>
        </div>
      )}
      
      {/* Error Message */}
      {errorMessage && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start justify-between">
          <p className="text-sm text-red-700">{errorMessage}</p>
          <button 
            onClick={() => setErrorMessage(null)}
            className="text-red-600 hover:text-red-800 ml-2 text-xs"
          >
            ✕
          </button>
        </div>
      )}
      
      {templates.length === 0 ? (
        <p className="text-sm text-slate-500">No saved templates yet.</p>
      ) : (
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {templates.map(template => (
            <div key={template.id} className="flex items-center justify-between p-2 rounded-lg border border-slate-100 hover:bg-slate-50">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{template.name}</p>
                <p className="text-xs text-slate-500 truncate">{template.stagesCount} stages</p>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={() => handleLoadTemplate(template)}
                  disabled={loadTemplateMutation.isPending}
                  className="px-2 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Load template"
                >
                  {loadTemplateMutation.isPending ? 'Loading...' : 'Load'}
                </button>
                <button
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                  title="Delete template"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}