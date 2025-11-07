import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

export function SavedTemplates({ onLoadTemplate }) {
  const queryClient = useQueryClient();
  
  const { data: templatesData, isLoading, error } = useQuery({
    queryKey: ['saved-templates'],
    queryFn: async () => {
      try {
        console.log('Fetching saved templates list...');
        const { data } = await axios.get('/template/saved');
        console.log('Saved templates fetched:', data);
        return data;
      } catch (error) {
        console.error('Error fetching saved templates:', error.response?.data || error.message);
        throw error;
      }
    }
  });

  const loadTemplateMutation = useMutation({
    mutationFn: async (templateId) => {
      try {
        console.log('Fetching template with ID:', templateId);
        const { data } = await axios.get(`/template/saved/${templateId}`);
        console.log('Template fetched successfully:', data);
        return data.template;
      } catch (error) {
        console.error('Error fetching template:', error.response?.data || error.message);
        throw error;
      }
    },
    onSuccess: async (template) => {
      console.log('Template loaded successfully, updating stages:', template);
      try {
        // Update the main template with the loaded template stages
        await axios.put('/template/stages', { stages: template.stages });
        console.log('Template stages updated successfully');
        
        // Invalidate the template-stages query to refresh the TemplateAdminPanel
        queryClient.invalidateQueries(['template-stages']);
        
        // Show success message
        alert(`✅ Template "${template.name}" loaded successfully!\n\n${template.stagesCount} stages have been loaded into the Template Admin Panel.`);
        
        if (onLoadTemplate) {
          onLoadTemplate(template);
        }
      } catch (error) {
        console.error('Failed to update template stages:', error.response?.data || error.message);
        alert(`Failed to update template: ${error.response?.data?.error || error.message}`);
      }
    },
    onError: (error) => {
      console.error('Template loading failed:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      alert(`Failed to load template: ${errorMessage}`);
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
    console.log('Deleting template:', templateId);
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