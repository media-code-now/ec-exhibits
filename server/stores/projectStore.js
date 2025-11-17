import { randomUUID } from 'crypto';
import { getUser } from '../lib/users.js';
import { stageStore } from './stageStore.js';
import { invoiceStore } from './invoiceStore.js';
import { saveDataAsync, loadData, mapToObject, objectToMap } from '../lib/dataStore.js';

const PROJECTS_FILE = 'projects.json';

// Initial seed data
const initialProjects = new Map([
  [
    'proj-1',
    {
      id: 'proj-1',
      name: 'Flagship Exhibit Launch',
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

// Load projects from disk or use seed data
let projectData = new Map();
const loadedData = loadData(PROJECTS_FILE);
if (loadedData) {
  projectData = objectToMap(loadedData);
  console.log(`[INFO] Loaded ${projectData.size} projects from disk`);
} else {
  projectData = new Map(initialProjects);
  console.log('[INFO] Using seed project data');
}

// Helper to persist data to disk
function persistProjects() {
  saveDataAsync(PROJECTS_FILE, mapToObject(projectData));
}

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
  create({ name, description, ownerId, clientIds = [], staffIds = [] }) {
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
      description: description ?? '',
      members: [...members.values()],
      createdAt: new Date().toISOString()
    };
    projectData.set(id, project);
    persistProjects(); // Save to disk
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
    persistProjects(); // Save to disk
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
    persistProjects(); // Save to disk
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
    if (affected.length > 0) {
      persistProjects(); // Save to disk
    }
    return affected;
  }
};
