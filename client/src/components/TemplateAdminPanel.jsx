import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import clsx from 'clsx';

const EMPTY_STAGE = () => ({
  slug: '',
  name: '',
  description: '',
  defaultStageDueInDays: 0,
  permissions: {
    viewRoles: ['owner', 'staff', 'client'],
    taskUpdateRoles: ['owner', 'staff'],
    checklistEditRoles: ['owner', 'staff'],
    clientCanUpload: false
  },
  tasks: [],
  uploads: [],
  toggles: []
});

const emptyTask = () => ({
  slug: '',
  title: 'New Task',
  ownerRole: 'staff',
  defaultDueInDays: 0,
  requiresClientInput: false,
  requiredUploadIds: []
});

const emptyUpload = () => ({
  uploadId: '',
  label: 'New Requirement',
  acceptedTypes: [],
  acceptedTypesText: '',
  maxFiles: 1,
  required: false
});

const formatAcceptedTypes = value => (Array.isArray(value) ? value.join(', ') : '');

const parseAcceptedTypes = text =>
  text
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

export function TemplateAdminPanel({ canEdit }) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['template-stages'],
    queryFn: async () => {
      const { data } = await axios.get('/template/stages');
      return data;
    }
  });

  const templateStages = data?.template?.stages ?? [];
  const [draftStages, setDraftStages] = useState([]);
  const [newTemplateName, setNewTemplateName] = useState('');

  useEffect(() => {
    setDraftStages(
      templateStages.map(stage => ({
        ...stage,
        defaultStageDueInDays: stage.defaultStageDueInDays ?? 0,
        tasks: stage.tasks.map(task => ({ ...task })),
        uploads: stage.uploads.map(upload => ({
          ...upload,
          acceptedTypesText: formatAcceptedTypes(upload.acceptedTypes ?? [])
        })),
        toggles: stage.toggles.map(toggle => ({ ...toggle }))
      }))
    );
  }, [templateStages]);

  const updateTemplateMutation = useMutation({
    mutationFn: payload => axios.put('/template/stages', payload).then(({ data: response }) => response),
    onSuccess: () => {
      queryClient.invalidateQueries(['template-stages']);
    }
  });

  const saveAsTemplateMutation = useMutation({
    mutationFn: async ({ name, stages }) => {
      const response = await axios.post('/template/saved', { name, stages });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['saved-templates']);
      setNewTemplateName('');
    }
  });

  const preparedStages = useMemo(
    () =>
      draftStages.map(stage => ({
        slug: stage.slug,
        name: stage.name,
        description: stage.description,
        defaultStageDueInDays: Number(stage.defaultStageDueInDays) || 0,
        permissions: stage.permissions,
        tasks: stage.tasks.map(task => ({
          slug: task.slug,
          title: task.title,
          ownerRole: task.ownerRole,
          defaultDueInDays: Number(task.defaultDueInDays) || 0,
          requiresClientInput: Boolean(task.requiresClientInput),
          requiredUploadIds: Array.isArray(task.requiredUploadIds) ? task.requiredUploadIds : []
        })),
        uploads: stage.uploads.map(upload => ({
          uploadId: upload.uploadId,
          label: upload.label,
          acceptedTypes: Array.isArray(upload.acceptedTypes)
            ? upload.acceptedTypes
            : parseAcceptedTypes(upload.acceptedTypesText ?? ''),
          maxFiles: Math.max(1, Number(upload.maxFiles) || 1),
          required: Boolean(upload.required)
        })),
        toggles: stage.toggles.map(toggle => ({
          toggleId: toggle.toggleId,
          label: toggle.label,
          defaultValue: Boolean(toggle.defaultValue)
        }))
      })),
    [draftStages]
  );

  const hasChanges = useMemo(() => {
    if (!templateStages.length && !draftStages.length) return false;
    try {
      return JSON.stringify(preparedStages) !== JSON.stringify(templateStages);
    } catch {
      return true;
    }
  }, [preparedStages, templateStages, draftStages.length]);

  const handleStageChange = (index, updates) => {
    setDraftStages(prev =>
      prev.map((stage, idx) => (idx === index ? { ...stage, ...updates } : stage))
    );
  };

  const handleTaskChange = (stageIndex, taskIndex, updates) => {
    setDraftStages(prev =>
      prev.map((stage, idx) => {
        if (idx !== stageIndex) return stage;
        return {
          ...stage,
          tasks: stage.tasks.map((task, tIdx) => (tIdx === taskIndex ? { ...task, ...updates } : task))
        };
      })
    );
  };

  const handleUploadChange = (stageIndex, uploadIndex, updates) => {
    const nextUpdates =
      Object.prototype.hasOwnProperty.call(updates, 'acceptedTypesText')
        ? {
            ...updates,
            acceptedTypes: parseAcceptedTypes(updates.acceptedTypesText ?? '')
          }
        : updates;
    setDraftStages(prev =>
      prev.map((stage, idx) => {
        if (idx !== stageIndex) return stage;
        return {
          ...stage,
          uploads: stage.uploads.map((upload, uIdx) =>
            uIdx === uploadIndex ? { ...upload, ...nextUpdates } : upload
          )
        };
      })
    );
  };

  const handleAddStage = () => {
    setDraftStages(prev => [...prev, EMPTY_STAGE()]);
  };

  const handleRemoveStage = index => {
    setDraftStages(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleAddTask = stageIndex => {
    setDraftStages(prev =>
      prev.map((stage, idx) =>
        idx === stageIndex ? { ...stage, tasks: [...stage.tasks, emptyTask()] } : stage
      )
    );
  };

  const handleRemoveTask = (stageIndex, taskIndex) => {
    setDraftStages(prev =>
      prev.map((stage, idx) =>
        idx === stageIndex
          ? { ...stage, tasks: stage.tasks.filter((_, tIdx) => tIdx !== taskIndex) }
          : stage
      )
    );
  };

  const handleAddUpload = stageIndex => {
    setDraftStages(prev =>
      prev.map((stage, idx) =>
        idx === stageIndex ? { ...stage, uploads: [...stage.uploads, emptyUpload()] } : stage
      )
    );
  };

  const handleRemoveUpload = (stageIndex, uploadIndex) => {
    setDraftStages(prev =>
      prev.map((stage, idx) =>
        idx === stageIndex
          ? { ...stage, uploads: stage.uploads.filter((_, uIdx) => uIdx !== uploadIndex) }
          : stage
      )
    );
  };

  const handleReset = () => {
    setDraftStages(
      templateStages.map(stage => ({
        ...stage,
        defaultStageDueInDays: stage.defaultStageDueInDays ?? 0,
        tasks: stage.tasks.map(task => ({ ...task })),
        uploads: stage.uploads.map(upload => ({
          ...upload,
          acceptedTypesText: formatAcceptedTypes(upload.acceptedTypes ?? [])
        })),
        toggles: stage.toggles.map(toggle => ({ ...toggle }))
      }))
    );
  };

  const handleSave = event => {
    event.preventDefault();
    if (!canEdit || !hasChanges) return;
    updateTemplateMutation.mutate({ stages: preparedStages });
  };

  const handleSaveAsTemplate = event => {
    event.preventDefault();
    if (!canEdit || !newTemplateName.trim()) return;
    if (!window.confirm(`Save current configuration as "${newTemplateName.trim()}"?`)) return;
    saveAsTemplateMutation.mutate({ 
      name: newTemplateName.trim(), 
      stages: preparedStages 
    });
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Project Template Admin</h2>
          <p className="mt-1 text-sm text-slate-600">
            Manage the master stage, task, and file upload definitions used when new projects are
            created.
          </p>
          {!canEdit && (
            <p className="mt-2 inline-flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
              View Only — Owner role required to make changes
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={updateTemplateMutation.isPending || !hasChanges}
          >
            Reset Changes
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={clsx(
              'rounded-full px-5 py-2 text-sm font-semibold text-white shadow-sm transition',
              canEdit && hasChanges && !updateTemplateMutation.isPending
                ? 'bg-emerald-600 hover:bg-emerald-500'
                : 'bg-slate-400 cursor-not-allowed'
            )}
            disabled={!canEdit || !hasChanges || updateTemplateMutation.isPending}
          >
            {updateTemplateMutation.isPending ? 'Saving…' : 'Save Template'}
          </button>
        </div>
      </header>

      {updateTemplateMutation.error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {updateTemplateMutation.error?.response?.data?.error ?? 'Unable to save template changes.'}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error?.message ?? 'Unable to load template.'}
        </div>
      )}

      {/* Save As New Template Section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Save Current Configuration as New Template</h3>
        <p className="text-sm text-slate-600 mb-4">
          Create a saved template from the current stage configuration to reuse later.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[240px]">
            <label htmlFor="template-name" className="block text-sm font-medium text-slate-700 mb-1.5">
              Template Name
            </label>
            <input
              id="template-name"
              type="text"
              value={newTemplateName}
              onChange={e => setNewTemplateName(e.target.value)}
              placeholder="e.g., Standard 5-Stage Project"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
              disabled={!canEdit || saveAsTemplateMutation.isPending}
            />
          </div>
          <button
            type="button"
            onClick={handleSaveAsTemplate}
            className={clsx(
              'rounded-full px-5 py-2 text-sm font-semibold text-white shadow-sm transition',
              canEdit && newTemplateName.trim() && !saveAsTemplateMutation.isPending
                ? 'bg-blue-600 hover:bg-blue-500'
                : 'bg-slate-400 cursor-not-allowed'
            )}
            disabled={!canEdit || !newTemplateName.trim() || saveAsTemplateMutation.isPending}
          >
            {saveAsTemplateMutation.isPending ? 'Saving…' : 'Save As Template'}
          </button>
        </div>
        {saveAsTemplateMutation.isSuccess && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            ✓ Template saved successfully!
          </div>
        )}
        {saveAsTemplateMutation.error && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {saveAsTemplateMutation.error?.response?.data?.error ?? 'Unable to save template.'}
          </div>
        )}
      </section>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Loading template…
        </div>
      ) : (
        draftStages.map((stage, stageIndex) => (
          <article
            key={`${stage.slug || 'new-stage'}-${stageIndex}`}
            className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
                    Stage {stageIndex + 1}
                  </p>
                  {stage.slug && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
                      {stage.slug}
                    </span>
                  )}
                </div>
                <div className="mt-2 grid gap-3 md:grid-cols-2">
                  <label className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-700">Stage name</span>
                    <input
                      value={stage.name}
                      onChange={event => handleStageChange(stageIndex, { name: event.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-100"
                      placeholder="e.g. Files & Paperwork"
                      disabled={!canEdit}
                    />
                  </label>
                  <label className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-700">Stage due offset (days)</span>
                    <input
                      type="number"
                      min="0"
                      value={stage.defaultStageDueInDays}
                      onChange={event =>
                        handleStageChange(stageIndex, {
                          defaultStageDueInDays: Number(event.target.value)
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-100"
                      disabled={!canEdit}
                    />
                  </label>
                </div>
                <label className="mt-3 block text-sm text-slate-600">
                  <span className="font-semibold text-slate-700">Description</span>
                  <textarea
                    value={stage.description}
                    onChange={event =>
                      handleStageChange(stageIndex, { description: event.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-100"
                    rows={2}
                    placeholder="Explain the purpose of this stage"
                    disabled={!canEdit}
                  />
                </label>
              </div>
              <div className="flex flex-col items-end gap-2">
                <p className="text-xs uppercase tracking-wide text-slate-400">Client uploads</p>
                <span
                  className={clsx(
                    'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                    stage.permissions?.clientCanUpload
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                  )}
                >
                  {stage.permissions?.clientCanUpload ? 'Allowed' : 'Staff only'}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveStage(stageIndex)}
                  className="mt-3 rounded-full border border-rose-200 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!canEdit || draftStages.length <= 1}
                >
                  Remove Stage
                </button>
              </div>
            </header>

            <section className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Tasks
                </h3>
                <button
                  type="button"
                  onClick={() => handleAddTask(stageIndex)}
                  className="rounded-full border border-indigo-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-600 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!canEdit}
                >
                  Add Task
                </button>
              </div>
              <div className="space-y-3">
                {stage.tasks.length === 0 && (
                  <p className="text-xs text-slate-500">No tasks defined yet.</p>
                )}
                {stage.tasks.map((task, taskIndex) => (
                  <div
                    key={`${task.slug || 'new-task'}-${taskIndex}`}
                    className="rounded-lg border border-white bg-white p-3 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex-1">
                        <input
                          value={task.title}
                          onChange={event =>
                            handleTaskChange(stageIndex, taskIndex, { title: event.target.value })
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:outline-none disabled:bg-slate-100"
                          placeholder="Task title"
                          disabled={!canEdit}
                        />
                        <p className="mt-1 text-xs text-slate-400">
                          {task.slug ? `ID: ${task.slug}` : 'ID assigned automatically'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTask(stageIndex, taskIndex)}
                        className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={!canEdit}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Owner role
                        <input
                          value={task.ownerRole}
                          onChange={event =>
                            handleTaskChange(stageIndex, taskIndex, {
                              ownerRole: event.target.value
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-100"
                          disabled={!canEdit}
                        />
                      </label>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Due offset (days)
                        <input
                          type="number"
                          min="0"
                          value={task.defaultDueInDays}
                          onChange={event =>
                            handleTaskChange(stageIndex, taskIndex, {
                              defaultDueInDays: Number(event.target.value)
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-100"
                          disabled={!canEdit}
                        />
                      </label>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Requires client input?
                        <select
                          value={task.requiresClientInput ? 'yes' : 'no'}
                          onChange={event =>
                            handleTaskChange(stageIndex, taskIndex, {
                              requiresClientInput: event.target.value === 'yes'
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-100"
                          disabled={!canEdit}
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  File Requirements
                </h3>
                <button
                  type="button"
                  onClick={() => handleAddUpload(stageIndex)}
                  className="rounded-full border border-indigo-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-600 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!canEdit}
                >
                  Add Requirement
                </button>
              </div>
              <div className="space-y-3">
                {stage.uploads.length === 0 && (
                  <p className="text-xs text-slate-500">No file requirements configured.</p>
                )}
                {stage.uploads.map((upload, uploadIndex) => (
                  <div
                    key={`${upload.uploadId || 'new-upload'}-${uploadIndex}`}
                    className="rounded-lg border border-white bg-white p-3 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex-1">
                        <input
                          value={upload.label}
                          onChange={event =>
                            handleUploadChange(stageIndex, uploadIndex, {
                              label: event.target.value
                            })
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:outline-none disabled:bg-slate-100"
                          placeholder="Requirement label"
                          disabled={!canEdit}
                        />
                        <p className="mt-1 text-xs text-slate-400">
                          {upload.uploadId ? `ID: ${upload.uploadId}` : 'ID assigned automatically'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Required?
                          <input
                            type="checkbox"
                            checked={upload.required}
                            onChange={event =>
                              handleUploadChange(stageIndex, uploadIndex, {
                                required: event.target.checked
                              })
                            }
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:bg-slate-100"
                            disabled={!canEdit}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRemoveUpload(stageIndex, uploadIndex)}
                          className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={!canEdit}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Accepted types (comma separated)
                        <input
                          value={upload.acceptedTypesText ?? ''}
                          onChange={event =>
                            handleUploadChange(stageIndex, uploadIndex, {
                              acceptedTypesText: event.target.value
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-100"
                          placeholder="pdf, docx"
                          disabled={!canEdit}
                        />
                      </label>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Max files
                        <input
                          type="number"
                          min="1"
                          value={upload.maxFiles}
                          onChange={event =>
                            handleUploadChange(stageIndex, uploadIndex, {
                              maxFiles: Number(event.target.value)
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-100"
                          disabled={!canEdit}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </article>
        ))
      )}

      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleAddStage}
          className="rounded-full border border-indigo-300 px-5 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canEdit}
        >
          Add Stage
        </button>
      </div>
    </section>
  );
}

export default TemplateAdminPanel;
