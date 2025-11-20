import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import axios from 'axios';
import clsx from 'clsx';
import { FileDropzone } from './FileDropzone.jsx';

const FILE_CATEGORIES = [
  { id: 'invoices', label: 'Invoices & Estimates' },
  { id: 'production', label: 'Production Files' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'graphics', label: 'Graphics' },
  { id: 'prebuild', label: 'Pre-build' }
];

// Keywords to categorize files automatically
const CATEGORY_KEYWORDS = {
  invoices: ['invoice', 'estimate', 'budget', 'payment', 'receipt'],
  production: ['production', 'cad', 'render', 'design', 'drawing', 'spec', 'blueprint'],
  furniture: ['furniture', 'equipment', 'rental', 'inventory'],
  graphics: ['graphic', 'branding', 'logo', 'print', 'signage', 'proof'],
  prebuild: ['prebuild', 'pre-build', 'mockup', 'mock-up', 'qa', 'punchlist', 'punch']
};

function categorizeFile(file) {
  // First check if file has explicit category set
  if (file.category) {
    return file.category;
  }
  
  // Otherwise, use keyword-based categorization
  const fileName = (file.fileName || '').toLowerCase();
  const label = (file.label || '').toLowerCase();
  const combined = `${fileName} ${label}`;
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => combined.includes(keyword))) {
      return category;
    }
  }
  
  return null; // Don't categorize as 'other'
}

export function ProjectFilesCard({ projectId, canUpload = false }) {
  const { data } = useQuery({
    queryKey: ['uploads', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data } = await axios.get(`/projects/${projectId}/uploads`);
      return data.uploads ?? [];
    },
    enabled: Boolean(projectId)
  });

  const uploads = data ?? [];
  
  // Filter out active rendering files (those are shown in Display Active Rendering section)
  const projectFiles = useMemo(() => {
    return uploads.filter(file => !file.isActiveRendering);
  }, [uploads]);
  
  // Group files by category
  const filesByCategory = useMemo(() => {
    const grouped = {
      invoices: [],
      production: [],
      furniture: [],
      graphics: [],
      prebuild: []
    };
    
    projectFiles.forEach(file => {
      const category = categorizeFile(file);
      if (category && grouped[category]) {
        grouped[category].push(file);
      }
    });
    
    return grouped;
  }, [projectFiles]);

  const handleDownload = async file => {
    try {
      const response = await axios.get(`/projects/${projectId}/uploads/${file.id}`, {
        responseType: 'blob'
      });
      const contentType = response.headers['content-type'] ?? file.contentType ?? 'application/octet-stream';
      const blob = new Blob([response.data], { type: contentType });
      let filename = file.fileName ?? 'download';
      const disposition = response.headers['content-disposition'];
      if (disposition) {
        const match = disposition.match(/filename\*=UTF-8''(.+)|filename="?(.*?)"?$/);
        if (match) {
          filename = decodeURIComponent(match[1] ?? match[2] ?? filename);
        }
      }
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 0);
    } catch (error) {
      console.error('Download failed', error);
      window.alert('Unable to download that file. Please try again or refresh the page.');
    }
  };

  return (
    <div className="space-y-6">
      {FILE_CATEGORIES.map(category => {
        const files = filesByCategory[category.id] || [];
        
        return (
          <section key={category.id} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <header className="mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{category.label}</h3>
                  <p className="text-xs text-slate-500">
                    {files.length} {files.length === 1 ? 'file' : 'files'}
                  </p>
                </div>
              </div>
            </header>
            
            <div className="space-y-4">
              {/* File List */}
              {files.length > 0 && (
                <div className="space-y-3">
                  {files.map(file => (
                    <article key={file.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 bg-slate-50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{file.fileName}</p>
                        <p className="text-xs text-slate-500">
                          Uploaded {new Date(file.uploadedAt).toLocaleString()}
                          {file.label && <span> · {file.label}</span>}
                        </p>
                        {file.remarks && (
                          <p className="text-xs text-slate-600 mt-1 italic">{file.remarks}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {file.requiresReview && (
                          <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-amber-100 text-amber-700">
                            Needs Review
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDownload(file)}
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-white transition-colors"
                        >
                          Download
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              
              {/* Upload Section */}
              {canUpload && (
                <div className="pt-3 border-t border-slate-200">
                  <FileDropzone projectId={projectId} category={category.id} />
                </div>
              )}
              
              {/* Empty State */}
              {files.length === 0 && !canUpload && (
                <p className="text-sm text-slate-400 text-center py-6 italic">
                  No files in this category yet
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
