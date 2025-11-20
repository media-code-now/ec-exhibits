import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import axios from 'axios';
import clsx from 'clsx';

const FILE_CATEGORIES = [
  { id: 'invoices', label: 'Invoices & Estimates', icon: '💰' },
  { id: 'production', label: 'Production Files', icon: '📐' },
  { id: 'furniture', label: 'Furniture', icon: '🪑' },
  { id: 'graphics', label: 'Graphics', icon: '🎨' },
  { id: 'prebuild', label: 'Pre-build', icon: '🔨' },
  { id: 'other', label: 'Other', icon: '📄' }
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
  const fileName = (file.fileName || '').toLowerCase();
  const label = (file.label || '').toLowerCase();
  const combined = `${fileName} ${label}`;
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => combined.includes(keyword))) {
      return category;
    }
  }
  
  return 'other';
}

export function FilesCard({ projectId }) {
  const [activeCategory, setActiveCategory] = useState('all');
  
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
  
  // Group files by category
  const filesByCategory = useMemo(() => {
    const grouped = {
      invoices: [],
      production: [],
      furniture: [],
      graphics: [],
      prebuild: [],
      other: []
    };
    
    uploads.forEach(file => {
      const category = categorizeFile(file);
      grouped[category].push(file);
    });
    
    return grouped;
  }, [uploads]);
  
  // Get counts for each category
  const categoryCounts = useMemo(() => {
    const counts = {};
    FILE_CATEGORIES.forEach(cat => {
      counts[cat.id] = filesByCategory[cat.id]?.length || 0;
    });
    return counts;
  }, [filesByCategory]);
  
  // Filter files based on active category
  const displayedFiles = useMemo(() => {
    if (activeCategory === 'all') return uploads;
    return filesByCategory[activeCategory] || [];
  }, [activeCategory, uploads, filesByCategory]);

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
    <section className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 space-y-4">
      <header>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Files</h3>
            <p className="text-sm text-slate-500">Shared documents organized by topic</p>
          </div>
        </div>
        
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={clsx(
              'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition',
              activeCategory === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            <span>All Files</span>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{uploads.length}</span>
          </button>
          
          {FILE_CATEGORIES.map(category => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={clsx(
                'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition',
                activeCategory === category.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              <span>{category.icon}</span>
              <span>{category.label}</span>
              {categoryCounts[category.id] > 0 && (
                <span className={clsx(
                  'rounded-full px-2 py-0.5 text-xs',
                  activeCategory === category.id ? 'bg-white/20' : 'bg-slate-200'
                )}>
                  {categoryCounts[category.id]}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>
      
      <div className="space-y-3">
        {displayedFiles.map(file => (
          <article key={file.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">{file.fileName}</p>
              <p className="text-xs text-slate-500">
                Uploaded {new Date(file.uploadedAt).toLocaleString()}
                {file.label && <span> · {file.label}</span>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={clsx(
                  'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold',
                  file.requiresReview ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                )}
              >
                {file.requiresReview ? 'Needs Review' : 'Ready'}
              </span>
              <button
                type="button"
                onClick={() => handleDownload(file)}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
              >
                Download
              </button>
            </div>
          </article>
        ))}
        {displayedFiles.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-8">
            {activeCategory === 'all' 
              ? 'No documents uploaded yet.' 
              : `No files in ${FILE_CATEGORIES.find(c => c.id === activeCategory)?.label || 'this category'} yet.`}
          </p>
        )}
      </div>
    </section>
  );
}
