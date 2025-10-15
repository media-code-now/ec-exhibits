import { randomUUID } from 'crypto';

const invites = new Map(); // token -> invite

export const inviteStore = {
  create({ projectId, invitedUserId, invitedById, role }) {
    const token = randomUUID();
    const invite = {
      id: token,
      projectId,
      invitedUserId,
      invitedById,
      role,
      status: 'sent',
      createdAt: new Date().toISOString()
    };
    invites.set(token, invite);
    return invite;
  },
  get(token) {
    return invites.get(token) ?? null;
  },
  listForProject(projectId) {
    return [...invites.values()].filter(invite => invite.projectId === projectId);
  }
};
