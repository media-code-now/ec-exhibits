import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import clsx from 'clsx';

export function SavedTemplatesList({ projectId }) {
  const queryClient = useQueryClient();
  
  const { data, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const { data } = await axios.get('/templates');
      return data;
    }
  });

  const loadTemplateMutation = useMutation({
    mutationFn: async ({ templateId, applyToProject }) => {
      const { data } = await axios.get(`/templates/${templateId}`);
      // Load the template into the template editor by updating the template stages
      await axios.put('/template/stages', { stages: data.template.stages });
      
      // If applyToProject is true and we have a projectId, apply to the current project
      if (applyToProject && projectId) {
        await axios.post(`/projects/${projectId}/apply-template`, { 
          templateId 
        });
      }
      
      return { template: data.template, appliedToProject: applyToProject && projectId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['template-stages']);
      
      if (result.appliedToProject) {
        // Invalidate project stages to refresh dashboard and project tab
        queryClient.invalidateQueries(['stages', projectId]);
        alert('Template loaded and applied to this project! The stages have been updated in Dashboard and Project tabs.');
      } else {
        alert('Template loaded successfully! You can now view and edit it in the Template tab.');
      }
    },
    onError: (error) => {
      alert(`Failed to load template: ${error.response?.data?.error || error.message}`);
    }
  });

  const handleLoadTemplate = (templateId) => {
    if (projectId) {
      // Ask if they want to apply to current project
      const applyToProject = confirm(
        'Do you want to apply this template to the current project?\n\n' +
        'Click OK to apply it to this project (will update stages in Dashboard and Project tabs)\n' +
        'Click Cancel to just load it in the Template editor'
      );
      loadTemplateMutation.mutate({ templateId, applyToProject });
    } else {
      // No project context, just load into editor
      if (confirm('Load this template? This will replace the current template in the editor below.')) {
        loadTemplateMutation.mutate({ templateId, applyToProject: false });
      }
    }
  };

  const templates = data?.templates ?? [];
  
  if (isLoading) {
    return (
      <section className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <h3 className="text-base font-semibold text-slate-900 mb-4">Saved Templates</h3>
        <p className="text-sm text-slate-500">Loading...</p>
      </section>
    );
  }

  if (templates.length === 0) {
    return (
      <section className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <h3 className="text-base font-semibold text-slate-900 mb-4">Saved Templates</h3>
        <p className="text-sm text-slate-500 text-center py-6">
          No templates found. Create one using the editor below.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">Saved Templates</h3>
        <p className="text-xs text-slate-500 mt-1">
          {templates.length} {templates.length === 1 ? 'template' : 'templates'} available
        </p>
      </div>
      
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map(template => (
          <div
            key={template.id}
            className="border border-slate-200 rounded-xl p-4 hover:border-indigo-300 transition-colors bg-gradient-to-br from-white to-slate-50"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="text-sm font-semibold text-slate-900 flex-1">
                {template.name}
              </h4>
              {template.isDefault && (
                <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                  Default
                </span>
              )}
            </div>
            
            {template.description && (
              <p className="text-xs text-slate-600 mb-3 line-clamp-2">
                {template.description}
              </p>
            )}
            
            <div className="flex items-center justify-between gap-3">
              <div className="text-center">
                <div className="text-xl font-bold text-indigo-600">{template.stageCount}</div>
                <div className="text-xs text-slate-500">Stages</div>
              </div>
              
              <button
                type="button"
                onClick={() => handleLoadTemplate(template.id)}
                disabled={loadTemplateMutation.isPending}
                className={clsx(
                  'rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors',
                  loadTemplateMutation.isPending
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-500'
                )}
              >
                {loadTemplateMutation.isPending ? 'Loading...' : 'Load'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
