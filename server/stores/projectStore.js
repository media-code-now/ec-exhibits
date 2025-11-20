import { randomUUID } from 'crypto';
import { getUser } from '../lib/users.js';
import { stageStore } from './stageStore.js';
import { invoiceStore } from './invoiceStore.js';

const projectData = new Map([
  [
    'proj-1',
    {
      id: 'proj-1',
      name: 'Flagship Exhibit Launch',
      show: 'Tech Summit 2024',
      size: '30x40 ft',
      moveInDate: '2024-09-15',
      openingDay: '2024-09-18',
      description: 'Main trade show build for Q3.',
      members: [
        { userId: 'user-owner', role: 'owner' },
        { userId: 'user-staff', role: 'staff' },
        { userId: 'user-client', role: 'client' }
      ],
      createdAt: new Date('2024-03-01').toISOString()
    }
  ],
  [
    'proj-2',
    {
      id: 'proj-2',
      name: 'Regional Pop-up Booth',
      show: 'Healthcare Expo 2024',
      size: '10x10 ft',
      moveInDate: '2024-10-01',
      openingDay: '2024-10-03',
      description: 'Portable booth concept for regional tour.',
      members: [
        { userId: 'user-owner', role: 'owner' },
        { userId: 'user-staff-2', role: 'staff' },
        { userId: 'user-client-2', role: 'client' }
      ],
      createdAt: new Date('2024-04-05').toISOString()
    }
  ]
]);

function serialise(project) {
  return {
    ...project,
    members: [...project.members]
  };
}

export const projectStore = {
  listForUser(userId) {
    return [...projectData.values()]
      .filter(project => project.members.some(member => member.userId === userId))
      .map(serialise);
  },
  get(projectId) {
    const project = projectData.get(projectId);
    return project ? serialise(project) : null;
  },
  members(projectId) {
    const project = projectData.get(projectId);
    return project ? [...project.members] : [];
  },
  create({ name, show, size, moveInDate, openingDay, description, ownerId, clientIds = [], staffIds = [] }) {
    if (!name) throw new Error('Project name is required');
    const id = `proj-${randomUUID().slice(0, 8)}`;
    const members = new Map();
    members.set(ownerId, { userId: ownerId, role: 'owner' });

    const applyMembers = (ids, role) => {
      ids.forEach(userId => {
        const user = getUser(userId);
        if (user && user.role === role) {
          members.set(userId, { userId, role });
        }
      });
    };

    applyMembers(clientIds, 'client');
    applyMembers(staffIds, 'staff');

    const project = {
      id,
      name,
      show: show ?? '',
      size: size ?? '',
      moveInDate: moveInDate ?? '',
      openingDay: openingDay ?? '',
      description: description ?? '',
      members: [...members.values()],
      createdAt: new Date().toISOString()
    };
    projectData.set(id, project);
    stageStore.seedProjectStages(id);
    invoiceStore.seedProjectInvoices(id);
    return serialise(project);
  },
  addMember({ projectId, userId, role }) {
    const project = projectData.get(projectId);
    if (!project) throw new Error('Project not found');
    const user = getUser(userId);
    if (!user) throw new Error('User not found');
    if (user.role !== role) throw new Error('Role mismatch for user');
    const exists = project.members.some(member => member.userId === userId);
    if (!exists) {
      project.members.push({ userId, role });
    }
    return serialise(project);
  },
  removeMember({ projectId, userId }) {
    const project = projectData.get(projectId);
    if (!project) throw new Error('Project not found');
    const member = project.members.find(candidate => candidate.userId === userId);
    if (!member) throw new Error('User does not belong to this project');
    if (member.role === 'owner') {
      throw new Error('Cannot remove an owner from the project');
    }
    project.members = project.members.filter(candidate => candidate.userId !== userId);
    return serialise(project);
  },
  removeUserFromAllProjects(userId) {
    const affected = [];
    projectData.forEach(project => {
      const member = project.members.find(candidate => candidate.userId === userId);
      if (!member) return;
      if (member.role === 'owner') {
        throw new Error('Cannot remove an owner from the project');
      }
      project.members = project.members.filter(candidate => candidate.userId !== userId);
      affected.push({
        projectId: project.id,
        projectName: project.name,
        role: member.role,
        memberIds: project.members.map(candidate => candidate.userId),
        project: serialise(project)
      });
    });
    return affected;
  }
};
