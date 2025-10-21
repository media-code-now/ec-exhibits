import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import clsx from 'clsx';

export function ChecklistPanel({ projectId, stages = [], canEdit = false }) {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState({});

  const stageChecklist = useMemo(() => {
    return stages.map(stage => ({
      stageId: stage.id,
      stageName: stage.name,
      toggles: (stage.toggles ?? []).filter(item => !item.templateToggleId)
    }));
  }, [stages]);

  const toggleMutation = useMutation({
    mutationFn: ({ stageId, toggleId, value }) =>
      axios
        .patch(`/projects/${projectId}/stages/${stageId}/toggles/${toggleId}`, { value })
        .then(({ data }) => data.toggle),
    onSuccess: () => {
      queryClient.invalidateQueries(['stages', projectId]);
    }
  });

  const addMutation = useMutation({
    mutationFn: ({ stageId, label }) =>
      axios
        .post(`/projects/${projectId}/stages/${stageId}/toggles`, { label })
        .then(({ data }) => data.toggle),
    onSuccess: (_data, variables) => {
      setDrafts(prev => ({ ...prev, [variables.stageId]: '' }));
      queryClient.invalidateQueries(['stages', projectId]);
    }
  });

  const removeMutation = useMutation({
    mutationFn: ({ stageId, toggleId }) =>
      axios
        .delete(`/projects/${projectId}/stages/${stageId}/toggles/${toggleId}`)
        .then(({ data }) => data.toggle),
    onSuccess: () => {
      queryClient.invalidateQueries(['stages', projectId]);
    }
  });

  const handleDraftChange = (stageId, value) => {
    setDrafts(prev => ({ ...prev, [stageId]: value }));
  };

  return (
    <section className="space-y-6">
      <header className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <h2 className="text-xl font-semibold text-slate-900">Show Checklist</h2>
        <p className="text-sm text-slate-500">
          Owners and staff can customise requirements for each stage. Clients can view progress.
        </p>
      </header>

      {stageChecklist.length === 0 && (
        <p className="text-sm text-slate-500">This project template does not define any checklist items.</p>
      )}

      {stageChecklist.map(section => (
        <article key={section.stageId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Stage</p>
              <h3 className="text-lg font-semibold text-slate-900">{section.stageName}</h3>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {section.toggles.length} item{section.toggles.length === 1 ? '' : 's'}
            </span>
          </header>

          <div className="space-y-3">
            {section.toggles.map(item => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                  <p className="text-xs text-slate-400">Status visible to clients and internal team.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold',
                      item.value ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    )}
                  >
                    {item.value ? 'Yes' : 'No'}
                  </span>
                  {canEdit && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          toggleMutation.mutate({
                            stageId: section.stageId,
                            toggleId: item.templateToggleId ?? item.id,
                            value: !item.value
                          })
                        }
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
                        disabled={toggleMutation.isPending}
                      >
                        {toggleMutation.isPending ? 'Saving…' : 'Toggle'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          removeMutation.mutate({
                            stageId: section.stageId,
                            toggleId: item.templateToggleId ?? item.id
                          })
                        }
                        className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-600 hover:bg-rose-50"
                        disabled={removeMutation.isPending}
                      >
                        {removeMutation.isPending ? 'Removing…' : 'Remove'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {canEdit && (
            <form
              className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3"
              onSubmit={event => {
                event.preventDefault();
                const label = (drafts[section.stageId] ?? '').trim();
                if (!label) return;
                addMutation.mutate({ stageId: section.stageId, label });
              }}
            >
              <label className="flex-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                New item label
                <input
                  value={drafts[section.stageId] ?? ''}
                  onChange={event => handleDraftChange(section.stageId, event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  placeholder="e.g. Client signage approved"
                />
              </label>
              <button
                type="submit"
                className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
                disabled={addMutation.isPending}
              >
                {addMutation.isPending ? 'Adding…' : 'Add Item'}
              </button>
            </form>
          )}
        </article>
      ))}
    </section>
  );
}

export default ChecklistPanel;
