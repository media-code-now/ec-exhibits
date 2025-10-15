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

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Files</h3>
          <p className="text-sm text-slate-500">Shared documents for this project</p>
        </div>
      </header>
      <div className="space-y-3">
        {uploads.map(file => (
          <article key={file.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">{file.fileName}</p>
              <p className="text-xs text-slate-500">Uploaded {new Date(file.uploadedAt).toLocaleString()}</p>
            </div>
            <span
              className={clsx(
                'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold',
                file.requiresReview ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
              )}
            >
              {file.requiresReview ? 'Needs Review' : 'Ready'}
            </span>
          </article>
        ))}
        {uploads.length === 0 && <p className="text-sm text-slate-500">No documents uploaded yet.</p>}
      </div>
    </section>
  );
}
