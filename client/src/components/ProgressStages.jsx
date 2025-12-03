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
  onTaskDelete,
  onTaskUpdate
}) {
  if (!stages.length) return null;

  const [drafts, setDrafts] = useState({});
  const [editingTask, setEditingTask] = useState(null); // Track which task is being edited

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

  const handleEditTask = (task) => {
    setEditingTask({
      id: task.id,
      stageId: task.stageId,
      title: task.title,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      assignee: task.assignee || ''
    });
  };

  const handleSaveTask = (stageId, taskId) => {
    if (editingTask && editingTask.id === taskId) {
      onTaskUpdate?.(stageId, taskId, {
        title: editingTask.title,
        dueDate: editingTask.dueDate,
        assignee: editingTask.assignee
      });
      setEditingTask(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
  };

  const updateEditingTask = (updates) => {
    setEditingTask(prev => ({ ...prev, ...updates }));
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
                stage.tasks.map(task => {
                  const isEditing = editingTask?.id === task.id;
                  
                  return (
                  <div
                    key={task.id}
                    className={clsx(
                      'rounded-lg border p-3 transition',
                      task.isOverdue
                        ? 'border-rose-300 bg-rose-50'
                        : isEditing 
                          ? 'border-indigo-300 bg-indigo-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                    )}
                  >
                    {isEditing ? (
                      // Edit Mode
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Task Title</label>
                          <input
                            type="text"
                            value={editingTask.title}
                            onChange={e => updateEditingTask({ title: e.target.value })}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Due Date</label>
                            <input
                              type="date"
                              value={editingTask.dueDate}
                              onChange={e => updateEditingTask({ dueDate: e.target.value })}
                              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Assignee</label>
                            <input
                              type="text"
                              value={editingTask.assignee}
                              onChange={e => updateEditingTask({ assignee: e.target.value })}
                              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                              placeholder="Enter assignee name"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveTask(stage.id, task.id)}
                            className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white hover:bg-indigo-500"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:border-slate-400"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-start gap-2 flex-1">
                            <span
                              className={clsx(
                                'inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold flex-shrink-0 mt-0.5',
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
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-700">{task.title}</p>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                                {task.dueDate && (
                                  <p className={clsx('text-xs', task.isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-500')}>
                                    📅 Due {new Date(task.dueDate).toLocaleDateString()}
                                  </p>
                                )}
                                {task.assignee && (
                                  <p className="text-xs text-slate-500">
                                    👤 {task.assignee}
                                  </p>
                                )}
                              </div>
                              {task.isOverdue && (
                                <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-rose-600 mt-1">
                                  <span aria-hidden>⏰</span> Overdue
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {canEdit && (
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
                                  onClick={() => handleEditTask(task)}
                                  className="rounded-full border border-indigo-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-600 hover:bg-indigo-50 transition"
                                  title="Edit task"
                                >
                                  Edit
                                </button>
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
                            )}
                            {!canEdit && (
                              <span className="text-xs uppercase tracking-wide text-slate-400">
                                {taskLabelMap[task.state] ?? task.state}
                              </span>
                            )}
                          </div>
                        </div>
                        {task.isOverdue && (
                          <div className="mt-3 rounded-lg border border-rose-300 bg-rose-100 px-3 py-2 text-sm text-rose-800" role="alert">
                            <strong className="font-semibold">⚠️ Alert:</strong> This task is overdue and requires immediate attention!
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  );
                })
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
