import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import clsx from 'clsx';
import { getSocket } from '../hooks/socketSingleton.js';

const emptySummary = {
  messages: { total: 0, byProject: {} },
  uploads: { total: 0 },
  projects: { total: 0 },
  users: { total: 0 },
  feed: []
};

const categoryLabels = {
  messages: 'Message',
  uploads: 'File upload',
  projects: 'Project update',
  users: 'User notice'
};

export function NotificationBell({ token, projects = [] }) {
  const [summary, setSummary] = useState(emptySummary);
  const [open, setOpen] = useState(false);

  const projectLookup = useMemo(
    () => Object.fromEntries(projects.map(project => [project.id, project.name])),
    [projects]
  );

  const refreshSummary = useCallback(async () => {
    if (!token) return;
    const { data } = await axios.get('/notifications');
    setSummary(data);
  }, [token]);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;

    refreshSummary().catch(() => {});

    const socket = getSocket(token);
    const handleNotificationUpdate = payload => {
      if (cancelled) return;
      if (payload?.summary) {
        setSummary(payload.summary);
      }
    };

    const handleBadgeSync = () => {
      refreshSummary().catch(() => {});
    };

    socket.on('notification:update', handleNotificationUpdate);
    socket.on('badge:sync', handleBadgeSync);

    return () => {
      cancelled = true;
      socket.off('notification:update', handleNotificationUpdate);
      socket.off('badge:sync', handleBadgeSync);
    };
  }, [token, refreshSummary]);

  useEffect(() => {
    if (!token) {
      setSummary(emptySummary);
      setOpen(false);
    }
  }, [token]);

  const activity = Array.isArray(summary.feed) ? summary.feed.slice(0, 8) : [];
  const unreadActivity = activity.filter(item => item && item.read === false).length;
  const feedExtras = (summary.feed ?? []).filter(
    item => item && item.countsTowardsTotal === false && item.read === false
  ).length;

  const feedUnreadByCategory = useMemo(() => {
    const tally = { messages: 0, uploads: 0, projects: 0, users: 0 };
    (summary.feed ?? []).forEach(item => {
      if (!item || item.read || !item.category) return;
      if (Object.prototype.hasOwnProperty.call(tally, item.category)) {
        tally[item.category] += 1;
      }
    });
    return tally;
  }, [summary.feed]);

  const hasUnreadMessages = (summary.messages?.total ?? 0) > 0 || feedUnreadByCategory.messages > 0;
  const hasUnreadUploads = (summary.uploads?.total ?? 0) > 0 || feedUnreadByCategory.uploads > 0;
  const hasUnreadProjects = (summary.projects?.total ?? 0) > 0 || feedUnreadByCategory.projects > 0;
  const hasUnreadUsers = (summary.users?.total ?? 0) > 0 || feedUnreadByCategory.users > 0;
  const messageCountDisplay =
    summary.messages?.total && summary.messages.total > 0
      ? summary.messages.total
      : feedUnreadByCategory.messages;
  const uploadCountDisplay =
    summary.uploads?.total && summary.uploads.total > 0 ? summary.uploads.total : feedUnreadByCategory.uploads;
  const projectCountDisplay =
    summary.projects?.total && summary.projects.total > 0 ? summary.projects.total : feedUnreadByCategory.projects;
  const userCountDisplay =
    summary.users?.total && summary.users.total > 0 ? summary.users.total : feedUnreadByCategory.users;

  const total =
    (summary.messages?.total ?? 0) +
    (summary.uploads?.total ?? 0) +
    (summary.projects?.total ?? 0) +
    (summary.users?.total ?? 0) +
    feedExtras;

  const formatTimestamp = createdAt => {
    if (!createdAt) return '';
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString();
  };

  const toggleOpen = () => {
    if (!token) return;
    setOpen(prev => !prev);
  };

  const postClear = async payload => {
    await axios.post('/notifications/read', payload);
  };

  const clearCategory = async category => {
    await postClear({ category });
    await refreshSummary();
  };

  const clearProjectMessages = async projectId => {
    await postClear({ category: 'messages', projectId });
    await refreshSummary();
  };

  const clearAll = async () => {
    await postClear({ category: 'messages' });
    await postClear({ category: 'uploads' });
    await postClear({ category: 'projects' });
    await postClear({ category: 'users' });
    await refreshSummary();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm text-slate-600 transition hover:text-indigo-600"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span aria-hidden className="text-lg">🔔</span>
        {total > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-semibold text-white">
            {total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-3 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <header className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
            {total > 0 && (
              <button
                type="button"
                className="text-xs font-semibold uppercase tracking-wide text-indigo-600 hover:text-indigo-500"
                onClick={() => {
                  clearAll().catch(() => {});
                }}
              >
                Clear all
              </button>
            )}
          </header>

          <div className="space-y-4 text-sm">
            <section className="rounded-xl border border-slate-100 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-800">Recent activity</p>
                  <p className="text-xs text-slate-500">Live project updates and actions</p>
                </div>
                {activity.length > 0 && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    {unreadActivity > 0 ? `${unreadActivity} new` : `${activity.length}`}
                  </span>
                )}
              </div>
              {activity.length > 0 ? (
                <ul className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
                  {activity.map(item => (
                    <li
                      key={item.id}
                      className={clsx(
                        'rounded-lg border px-3 py-2 text-xs transition',
                        item?.read
                          ? 'border-slate-200 bg-slate-50 text-slate-600'
                          : 'border-indigo-200 bg-indigo-50 text-indigo-700'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-semibold">
                            {item?.title ?? categoryLabels[item?.category] ?? 'Update'}
                          </p>
                          {item?.body && <p className="text-[11px] text-slate-500">{item.body}</p>}
                          {item?.projectName && (
                            <p className="text-[10px] uppercase tracking-wide text-slate-400">
                              {item.projectName}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 text-[10px] text-slate-400">
                          <span>{categoryLabels[item?.category] ?? 'Update'}</span>
                          <time>{formatTimestamp(item?.createdAt)}</time>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-slate-400">All quiet. Your project activity arrives here.</p>
              )}
            </section>

            <section className="rounded-xl border border-slate-100 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-800">Messages</p>
                  <p className="text-xs text-slate-500">Unread threads across projects</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                  {messageCountDisplay ?? 0}
                </span>
              </div>
              {summary.messages?.total > 0 ? (
                <ul className="mt-2 space-y-2">
                  {Object.entries(summary.messages.byProject ?? {}).map(([projectId, count]) => (
                    <li key={projectId} className="flex items-center justify-between text-xs text-slate-600">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-700">
                          {projectLookup[projectId] ?? projectId}
                        </span>
                        <span className="text-[11px] text-slate-400">{count} unread message(s)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          clearProjectMessages(projectId).catch(() => {});
                        }}
                        className="text-[11px] font-semibold uppercase tracking-wide text-indigo-500 hover:text-indigo-600"
                      >
                        Mark read
                      </button>
                    </li>
                  ))}
                </ul>
              ) : hasUnreadMessages ? (
                <p className="mt-2 text-xs text-slate-400">
                  No unread threads, but recent chat activity is recorded in the activity feed above.
                </p>
              ) : (
                <p className="mt-2 text-xs text-slate-400">No unread messages.</p>
              )}
              {hasUnreadMessages && (
                <button
                  type="button"
                  onClick={() => {
                    clearCategory('messages').catch(() => {});
                  }}
                  className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-indigo-500 hover:text-indigo-600"
                >
                  Mark all message notifications as read
                </button>
              )}
            </section>

            <section className="rounded-xl border border-slate-100 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">File uploads</p>
                  <p className="text-xs text-slate-500">New documents shared with your team</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                  {uploadCountDisplay ?? 0}
                </span>
              </div>
              {hasUnreadUploads ? (
                <button
                  type="button"
                  onClick={() => {
                    clearCategory('uploads').catch(() => {});
                  }}
                  className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-indigo-500 hover:text-indigo-600"
                >
                  Mark uploads as reviewed
                </button>
              ) : (
                <p className="mt-2 text-xs text-slate-400">You're up to date on uploads.</p>
              )}
            </section>

            <section className="rounded-xl border border-slate-100 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">Project updates</p>
                  <p className="text-xs text-slate-500">Task status or stage changes</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                  {projectCountDisplay ?? 0}
                </span>
              </div>
              {hasUnreadProjects ? (
                <button
                  type="button"
                  onClick={() => {
                    clearCategory('projects').catch(() => {});
                  }}
                  className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-indigo-500 hover:text-indigo-600"
                >
                  Mark project updates as read
                </button>
              ) : (
                <p className="mt-2 text-xs text-slate-400">No pending project changes.</p>
              )}
            </section>

            <section className="rounded-xl border border-slate-100 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">User notices</p>
                  <p className="text-xs text-slate-500">Invites or directory changes</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                  {userCountDisplay ?? 0}
                </span>
              </div>
              {hasUnreadUsers ? (
                <button
                  type="button"
                  onClick={() => {
                    clearCategory('users').catch(() => {});
                  }}
                  className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-indigo-500 hover:text-indigo-600"
                >
                  Dismiss user updates
                </button>
              ) : (
                <p className="mt-2 text-xs text-slate-400">No user changes waiting.</p>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
