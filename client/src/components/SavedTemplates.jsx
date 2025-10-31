import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

export function SavedTemplates({ onLoadTemplate }) {
  const queryClient = useQueryClient();
  
  const { data: templatesData, isLoading, error } = useQuery({
    queryKey: ['saved-templates'],
    queryFn: async () => {
      // Temporary mock data for testing while server connectivity issues are resolved
      console.log('Using mock templates data for testing...');
      return {
        templates: [
          {
            id: 1,
            name: "Standard Project Template",
            description: "Default template for standard projects (current setup)",
            createdAt: "2024-10-25T10:00:00Z",
            stagesCount: 5
          },
          {
            id: 2,
            name: "Quick Setup Template",
            description: "Invoices & Payments, Graphics & Branding, Furniture & Equipment",
            createdAt: "2024-10-20T15:30:00Z",
            stagesCount: 3
          },
          {
            id: 3,
            name: "Complex Project Template",
            description: "Comprehensive template for large projects",
            createdAt: "2024-10-15T09:15:00Z",
            stagesCount: 8
          }
        ]
      };
    }
  });

  const loadTemplateMutation = useMutation({
    mutationFn: async (templateId) => {
      // Temporary mock template loading for testing
      console.log('Mock loading template with ID:', templateId);
      
      const mockTemplates = {
        1: {
          id: 1,
          name: "Standard Project Template",
          stages: [] // This would be the current template stages
        },
        2: {
          id: 2,
          name: "Quick Setup Template", 
          stages: [
            {
              slug: 'invoices-payments',
              name: 'Invoices & Payments',
              description: 'Handle project invoicing and payment processing',
              defaultStageDueInDays: 7
            },
            {
              slug: 'graphics-branding',
              name: 'Graphics & Branding', 
              description: 'Design and branding materials creation',
              defaultStageDueInDays: 14
            },
            {
              slug: 'furniture-equipment',
              name: 'Furniture & Equipment',
              description: 'Furniture selection and equipment procurement', 
              defaultStageDueInDays: 21
            }
          ]
        }
      };
      
      const template = mockTemplates[templateId];
      if (!template) {
        throw new Error('Template not found');
      }
      
      return template;
    },
    onSuccess: (template) => {
      console.log('Mock template loaded successfully:', template.name);
      alert(`✅ Template "${template.name}" loaded successfully!\n\nThis is a demo - in production this would update the Template Admin Panel with ${template.stages.length} stages.`);
      
      if (onLoadTemplate) {
        onLoadTemplate(template);
      }
    },
    onError: (error) => {
      console.error('Template loading failed:', error.message);
      alert(`❌ Failed to load template: ${error.message}`);
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