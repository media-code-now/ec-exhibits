import { randomUUID } from 'crypto';

const notificationsByUser = new Map();
const FEED_LIMIT = 25;

const statusLabels = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
  blocked: 'Blocked'
};

function defaultState() {
  return {
    messages: {
      byProject: new Map()
    },
    uploads: 0,
    projects: 0,
    users: 0,
    feed: []
  };
}

function ensureState(userId) {
  if (!notificationsByUser.has(userId)) {
    notificationsByUser.set(userId, defaultState());
  }
  return notificationsByUser.get(userId);
}

function truncate(value, max = 140) {
  if (!value) return '';
  const safe = String(value).trim();
  if (safe.length <= max) return safe;
  return `${safe.slice(0, max - 1)}…`;
}

function pushFeedEvent(state, event) {
  const { countsTowardsTotal = true, ...rest } = event ?? {};
  const entry = {
    id: randomUUID(),
    read: false,
    countsTowardsTotal,
    createdAt: new Date().toISOString(),
    ...rest
  };
  state.feed = [entry, ...state.feed].slice(0, FEED_LIMIT);
}

function serialiseMessages(messages) {
  const byProject = Object.fromEntries(
    [...messages.byProject.entries()].map(([projectId, data]) => [projectId, data.count])
  );
  const total = Object.values(byProject).reduce((sum, value) => sum + value, 0);
  return { total, byProject };
}

function serialiseState(state) {
  return {
    messages: serialiseMessages(state.messages),
    uploads: { total: state.uploads },
    projects: { total: state.projects },
    users: { total: state.users },
    feed: state.feed.map(event => ({ ...event }))
  };
}

function formatProjectChange(change) {
  if (!change) return 'Project updated.';
  if (change.type === 'stage_status') {
    const label = statusLabels[change.status] ?? change.status;
    return `Stage "${change.stageName}" marked ${label}.`;
  }
  if (change.type === 'task_created') {
    return `New task "${change.taskTitle}" added to ${change.stageName}.`;
  }
  if (change.type === 'task_status') {
    const label = statusLabels[change.status] ?? change.status;
    return `Task "${change.taskTitle}" marked ${label}.`;
  }
  return 'Project updated.';
}

function buildUserNotice({ action, actorName, targetName, projectName, role }) {
  if (action === 'project_invite') {
    const roleLabel = role ? role.replace(/_/g, ' ') : 'member';
    return {
      title: projectName ? `Invited to ${projectName}` : 'New project invitation',
      body: `${actorName ?? 'Someone'} invited you to ${projectName ?? 'a project'} as ${roleLabel}.`
    };
  }
  if (action === 'user_added') {
    const roleLabel = role ? role.replace(/_/g, ' ') : 'member';
    return {
      title: 'Directory updated',
      body: `${actorName ?? 'Someone'} added ${targetName ?? 'a new user'} as ${roleLabel}.`
    };
  }
  if (action === 'user_joined') {
    const roleLabel = role ? role.replace(/_/g, ' ') : 'member';
    return {
      title: 'Team update',
      body: `${targetName ?? 'Someone'} joined ${projectName ?? 'the project'} as ${roleLabel}.`
    };
  }
  if (action === 'user_removed') {
    const roleLabel = role ? role.replace(/_/g, ' ') : 'member';
    return {
      title: 'Team update',
      body: `${actorName ?? 'Someone'} removed ${targetName ?? 'a team member'} (${roleLabel}) from ${projectName ?? 'the project'}.`
    };
  }
  if (action === 'removed_from_project') {
    const roleLabel = role ? role.replace(/_/g, ' ') : 'member';
    return {
      title: 'Access changed',
      body: `${actorName ?? 'Someone'} removed you (${roleLabel}) from ${projectName ?? 'the project'}.`
    };
  }
  if (action === 'user_deleted') {
    const roleLabel = role ? role.replace(/_/g, ' ') : 'member';
    return {
      title: 'Directory update',
      body: `${actorName ?? 'Someone'} deleted ${targetName ?? 'a team member'} (${roleLabel}) from the directory.`
    };
  }
  return {
    title: 'User notice',
    body: 'Your user directory has been updated.'
  };
}

function markFeedCategory(state, category, predicate = () => true) {
  state.feed.forEach(event => {
    if (event.category === category && predicate(event)) {
      event.read = true;
    }
  });
}

export const notificationStore = {
  bumpMessageUnread({ projectId, projectName, authorId, authorName, messagePreview, memberIds }) {
    const updates = [];
    const description = truncate(messagePreview);
    const uniqueMemberIds = [...new Set(memberIds)];
    uniqueMemberIds.forEach(memberId => {
      const state = ensureState(memberId);
      if (memberId !== authorId) {
        const current = state.messages.byProject.get(projectId) ?? { count: 0, lastMessageId: null };
        const next = {
          count: current.count + 1,
          lastMessageId: new Date().toISOString()
        };
        state.messages.byProject.set(projectId, next);
        updates.push({ userId: memberId, projectId, unread: next.count });
      }

      pushFeedEvent(state, {
        category: 'messages',
        projectId,
        projectName,
        actorId: authorId,
        actorName: authorName,
        title: `${authorName ?? 'Someone'} posted in ${projectName ?? 'a project'}`,
        body: description,
        countsTowardsTotal: memberId !== authorId
      });
    });
    return updates;
  },
  bumpUploads({ projectId, projectName, actorId, actorName, memberIds, count = 1, fileNames = [] }) {
    const uniqueMemberIds = [...new Set(memberIds)];
    const title = `${actorName ?? 'Someone'} uploaded ${count === 1 ? 'a file' : `${count} files`} to ${projectName ?? 'a project'}`;
    const body =
      fileNames.length > 0
        ? truncate(fileNames.slice(0, 4).join(', ') + (fileNames.length > 4 ? '…' : ''), 120)
        : '';

    uniqueMemberIds.forEach(memberId => {
      const state = ensureState(memberId);
      if (memberId !== actorId) {
        state.uploads += count;
      }
      pushFeedEvent(state, {
        category: 'uploads',
        projectId,
        projectName,
        actorId,
        actorName,
        title,
        body,
        countsTowardsTotal: memberId !== actorId
      });
    });
  },
  bumpProjectChange({ projectId, projectName, actorId, actorName, memberIds, change }) {
    const summary = formatProjectChange(change);
    const uniqueMemberIds = [...new Set(memberIds)];

    uniqueMemberIds.forEach(memberId => {
      const state = ensureState(memberId);
      if (memberId !== actorId) {
        state.projects += 1;
      }
      pushFeedEvent(state, {
        category: 'projects',
        projectId,
        projectName,
        actorId,
        actorName,
        title: `${actorName ?? 'Someone'} updated ${projectName ?? 'a project'}`,
        body: summary,
        countsTowardsTotal: memberId !== actorId
      });
    });
  },
  bumpUserChange({ recipients = [], actorId, actorName, targetName, projectName, role, action = 'user_notice' }) {
    const uniqueRecipients = [...new Set(recipients)];
    uniqueRecipients.forEach(userId => {
      const state = ensureState(userId);
      state.users += 1;
      const { title, body } = buildUserNotice({ action, actorName, targetName, projectName, role });
      pushFeedEvent(state, {
        category: 'users',
        projectName,
        actorId,
        actorName,
        title,
        body
      });
    });
  },
  markMessageRead({ userId, projectId }) {
    const state = ensureState(userId);
    if (projectId) {
      state.messages.byProject.delete(projectId);
      markFeedCategory(state, 'messages', event => event.projectId === projectId);
    }
  },
  markAllMessagesRead(userId) {
    const state = ensureState(userId);
    state.messages.byProject = new Map();
    markFeedCategory(state, 'messages');
  },
  markCategoryRead({ userId, category }) {
    const state = ensureState(userId);
    if (category === 'uploads') state.uploads = 0;
    if (category === 'projects') state.projects = 0;
    if (category === 'users') state.users = 0;
    markFeedCategory(state, category);
  },
  unreadForProject({ userId, projectId }) {
    const state = ensureState(userId);
    return state.messages.byProject.get(projectId)?.count ?? 0;
  },
  summary(userId) {
    const state = ensureState(userId);
    return serialiseState(state);
  }
};
