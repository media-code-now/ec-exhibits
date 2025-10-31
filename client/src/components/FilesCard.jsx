import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import clsx from 'clsx';

export function FilesCard({ projectId }) {
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
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Display Active Rendering</h3>
          <p className="text-sm text-slate-500">Display Active Rendering</p>
        </div>
      </header>
      <div className="space-y-3">
        {(() => {
          // Filter to only show the most recent "active rendering" file
          const activeRenderingFiles = uploads.filter(file => 
            file.label === 'active-rendering' || file.category === 'active-rendering'
          );
          const latestFile = activeRenderingFiles.sort((a, b) => 
            new Date(b.uploadedAt) - new Date(a.uploadedAt)
          )[0];
          
          if (latestFile) {
            return (
              <article key={latestFile.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{latestFile.fileName}</p>
                  <p className="text-xs text-slate-500">Updated {new Date(latestFile.uploadedAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700">
                    Active Rendering
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDownload(latestFile)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
                  >
                    Download
                  </button>
                </div>
              </article>
            );
          } else {
            return <p className="text-sm text-slate-500">No active rendering uploaded yet.</p>;
          }
        })()}
      </div>
    </section>
  );
}
