import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import axios from 'axios';
import clsx from 'clsx';

export function FilesCard({ projectId, onDeleteFile }) {
  const { data, refetch } = useQuery({
    queryKey: ['uploads', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data } = await axios.get(`/projects/${projectId}/uploads`);
      return data.uploads ?? [];
    },
    enabled: Boolean(projectId),
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  const uploads = data ?? [];
  
  // Filter to show only active rendering files
  const activeRenderingFiles = useMemo(() => {
    const filtered = uploads.filter(file => {
      // Check for multiple possible truthy values
      return file.isActiveRendering === true || 
             file.isActiveRendering === 'true' || 
             file.isActiveRendering === 1;
    });
    return filtered;
  }, [uploads]);

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

  const handleDelete = async (file) => {
    if (!window.confirm(`Are you sure you want to delete "${file.fileName}"?`)) {
      return;
    }
    
    try {
      await onDeleteFile(file.id);
    } catch (error) {
      console.error('Delete failed', error);
      window.alert('Failed to delete file. Please try again.');
    }
  };

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 space-y-4">
      <header>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Display Active Rendering</h3>
            <p className="text-sm text-slate-500">Current active rendering file</p>
          </div>
        </div>
      </header>
      
      <div className="space-y-3">
        {activeRenderingFiles.map(file => (
          <article key={file.id} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 bg-gradient-to-r from-indigo-50 to-white">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate break-all" title={file.fileName}>
                {file.fileName}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mt-1">
                <span className="whitespace-nowrap">Uploaded {new Date(file.uploadedAt).toLocaleString()}</span>
                {file.uploadedBy && (
                  <span className="whitespace-nowrap">· by {file.uploadedBy.displayName}</span>
                )}
                {file.label && <span className="truncate">· {file.label}</span>}
              </div>
              {file.remarks && (
                <p className="text-xs text-slate-600 mt-1 italic line-clamp-2">{file.remarks}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-center">
              <span
                className={clsx(
                  'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap',
                  file.requiresReview ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                )}
              >
                {file.requiresReview ? 'Needs Review' : 'Ready'}
              </span>
              <button
                type="button"
                onClick={() => handleDownload(file)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors whitespace-nowrap"
              >
                Download
              </button>
              <button
                type="button"
                onClick={() => handleDelete(file)}
                className="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-colors whitespace-nowrap"
              >
                Delete
              </button>
            </div>
          </article>
        ))}
        {activeRenderingFiles.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-8">
            No active rendering file uploaded yet.
          </p>
        )}
      </div>
    </section>
  );
}
