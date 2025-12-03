import { useState } from 'react';
import clsx from 'clsx';

const labelMap = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed'
};

const taskLabelMap = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  completed: 'Completed'
};

// Helper function to get default due date (7 days from today)
const getDefaultDueDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
};

const emptyDraft = () => ({ title: '', dueDate: getDefaultDueDate(), assignee: '' });

export function ProgressStages({
  stages = [],
  statuses = [],
  taskStatuses = [],
  progressSummary = null,
  canEdit = false,
  onStatusChange,
  onTaskStatusChange,
  onTaskCreate,
  onTaskDelete
}) {
  if (!stages.length) return null;

  const [drafts, setDrafts] = useState({});

  const getDraft = stageId => drafts[stageId] ?? emptyDraft();

  const updateDraft = (stageId, updates) => {
    setDrafts(prev => {
      const current = prev[stageId] ?? emptyDraft();
      return { ...prev, [stageId]: { ...current, ...updates } };
    });
  };

  const resetDraft = stageId => {
    setDrafts(prev => ({ ...prev, [stageId]: emptyDraft() }));
  };

  const handleCreateTask = stageId => {
    const draft = getDraft(stageId);
    console.log('[ProgressStages] handleCreateTask called');
    console.log('[ProgressStages] stageId:', stageId);
    console.log('[ProgressStages] draft:', draft);
    
    if (!draft.title.trim()) {
      console.log('[ProgressStages] No title, returning');
      return;
    }
    
    console.log('[ProgressStages] Calling onTaskCreate with:', stageId, draft);
    onTaskCreate?.(stageId, draft);
    resetDraft(stageId);
  };

  const completed = stages.filter(stage => stage.status === 'completed').length;
  const percentFallback = Math.round((completed / stages.length) * 100) || 0;
  const percent = progressSummary?.percentComplete ?? percentFallback;
  const taskSummaryLabel = (() => {
    if (progressSummary && progressSummary.totalTasks > 0) {
      return `${progressSummary.completedTasks}/${progressSummary.totalTasks} tasks complete · ${progressSummary.completedStages}/${progressSummary.totalStages} stages finished`;
    }
    if (stages.length) {
      return `Completed ${completed} of ${stages.length} stages`;
    }
    return 'Track each stage through completion';
  })();

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Project Progress</h2>
          <p className="text-sm text-slate-500">{taskSummaryLabel}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-600">
          {percent}% Complete
        </span>
      </header>
      <div className="relative h-3 w-full rounded-full bg-slate-200">
        <span className="absolute inset-y-0 left-0 rounded-full bg-indigo-500" style={{ width: `${percent}%` }} />
      </div>
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
        {stages.map(stage => (
          <details key={stage.id} className="group">
            <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-slate-700">
              <div>
                <p>{stage.name}</p>
                <p className="text-xs text-slate-500">
                  {stage.dueDate ? `Due ${new Date(stage.dueDate).toLocaleDateString()}` : 'No due date'}
                </p>
                {stage.progress && stage.progress.overdueTasks > 0 && (
                  <p className="flex items-center gap-1 text-xs font-semibold text-rose-600">
                    <span aria-hidden>⚠️</span>
                    {stage.progress.overdueTasks} overdue
                  </p>
                )}
                {stage.progress && stage.progress.totalTasks > 0 && (
                  <p className="text-xs text-slate-400">
                    {stage.progress.completedTasks}/{stage.progress.totalTasks} tasks complete
                  </p>
                )}
              </div>
              {canEdit ? (
                <select
                  value={stage.status}
                  onChange={event => onStatusChange?.(stage.id, event.target.value)}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 focus:border-indigo-500 focus:outline-none"
                >
                  {statuses.map(option => (
                    <option key={option} value={option}>
                      {labelMap[option] ?? option}
                    </option>
                  ))}
                </select>
              ) : (
                <span
                  className={clsx(
                    'rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide',
                    stage.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-700'
                      : stage.status === 'in_progress'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {labelMap[stage.status] ?? stage.status}
                </span>
              )}
            </summary>
            <div className="space-y-3 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              {stage.progress && stage.progress.totalTasks > 0 && (
                <div>
                  <div className="mb-2 h-2 w-full rounded-full bg-white">
                    <span
                      className="block h-2 rounded-full bg-indigo-400"
                      style={{ width: `${stage.progress.percentComplete}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    {stage.progress.completedTasks}/{stage.progress.totalTasks} tasks complete · {stage.progress.percentComplete}%
                  </p>
                </div>
              )}
              {stage.tasks?.length ? (
                stage.tasks.map(task => (
                  <div
                    key={task.id}
                    className={clsx(
                      'flex flex-wrap items-center justify-between gap-3 rounded-lg border p-2 transition',
                      task.isOverdue
                        ? 'border-rose-300 bg-rose-50 hover:border-rose-400'
                        : 'border-transparent hover:border-slate-200'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={clsx(
                          'inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold',
                          task.state === 'completed'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-600'
                            : task.state === 'blocked'
                              ? 'border-rose-300 bg-rose-50 text-rose-600'
                              : task.state === 'in_progress'
                                ? 'border-amber-300 bg-amber-50 text-amber-700'
                                : 'border-slate-300 bg-white text-slate-600'
                        )}
                      >
                        {task.state === 'completed' ? '✓' : ''}
                      </span>
                      <div>
                        <p className="font-medium text-slate-700">{task.title}</p>
                        {task.dueDate && (
                          <p className={clsx('text-xs', task.isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-500')}>
                            Due {new Date(task.dueDate).toLocaleDateString()}
                          </p>
                        )}
                        {task.isOverdue && (
                          <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-rose-600">
                            <span aria-hidden>⏰</span> Overdue
                          </p>
                        )}
                      </div>
                    </div>
                    {task.isOverdue && (
                      <div className="w-full rounded-lg border border-rose-300 bg-rose-100 px-3 py-2 text-sm text-rose-800" role="alert">
                        <strong className="font-semibold">⚠️ Alert:</strong> This task is overdue and requires immediate attention!
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      {task.assignee && <span className="text-xs text-slate-400">{task.assignee}</span>}
                      {canEdit ? (
                        <>
                          <select
                            value={task.state}
                            onChange={event => onTaskStatusChange?.(stage.id, task.id, event.target.value)}
                            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 focus:border-indigo-500 focus:outline-none"
                          >
                            {taskStatuses.map(option => (
                              <option key={option} value={option}>
                                {taskLabelMap[option] ?? option}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Delete task "${task.title}"?`)) {
                                onTaskDelete?.(stage.id, task.id);
                              }
                            }}
                            className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-600 hover:bg-rose-50 transition"
                            title="Delete task"
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <span className="text-xs uppercase tracking-wide text-slate-400">
                          {taskLabelMap[task.state] ?? task.state}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">No tasks listed for this stage.</p>
              )}

              {canEdit && (
                <div className="rounded-lg bg-white p-3 shadow-inner">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Add task</p>
                  <div className="mt-2 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Task Title *</label>
                      <input
                        value={getDraft(stage.id).title}
                        onChange={event => updateDraft(stage.id, { title: event.target.value })}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                        placeholder="Enter task title"
                      />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Due Date</label>
                        <input
                          type="date"
                          value={getDraft(stage.id).dueDate}
                          onChange={event => updateDraft(stage.id, { dueDate: event.target.value })}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Assignee</label>
                        <input
                          value={getDraft(stage.id).assignee}
                          onChange={event => updateDraft(stage.id, { assignee: event.target.value })}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                          placeholder="Enter assignee name"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleCreateTask(stage.id)}
                      className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-indigo-500"
                    >
                      Add task
                    </button>
                    <button
                      type="button"
                      onClick={() => resetDraft(stage.id)}
                      className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:border-slate-400"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
