const initialStages = new Map([
  [
    'proj-1',
    [
      {
        id: 'stage-1',
        name: 'Discovery',
        status: 'completed',
        dueDate: '2024-04-12',
        tasks: [
          { id: 'task-1', title: 'Kickoff Call', state: 'completed', dueDate: '2024-04-01', assignee: 'Samuel Staff' },
          { id: 'task-2', title: 'Requirements Brief', state: 'completed', dueDate: '2024-04-05', assignee: 'Olivia Owner' }
        ]
      },
      {
        id: 'stage-2',
        name: 'Design',
        status: 'in_progress',
        dueDate: '2024-05-24',
        tasks: [
          { id: 'task-3', title: '3D Renderings', state: 'in_progress', dueDate: '2024-05-05', assignee: 'Samuel Staff' },
          { id: 'task-4', title: 'Client Feedback', state: 'blocked', dueDate: '2024-05-11', assignee: 'Cameron Client' }
        ]
      },
      {
        id: 'stage-3',
        name: 'Fabrication',
        status: 'not_started',
        dueDate: '2024-06-30',
        tasks: [
          { id: 'task-5', title: 'Material Ordering', state: 'not_started', dueDate: '2024-06-02', assignee: 'Olivia Owner' }
        ]
      }
    ]
  ],
  [
    'proj-2',
    [
      {
        id: 'stage-a',
        name: 'Planning',
        status: 'in_progress',
        dueDate: '2024-05-18',
        tasks: [
          { id: 'task-a1', title: 'Venue Approval', state: 'completed', dueDate: '2024-04-22', assignee: 'Skyler Staff' },
          { id: 'task-a2', title: 'Budget Sign-off', state: 'in_progress', dueDate: '2024-05-10', assignee: 'Callie Client' }
        ]
      }
    ]
  ]
]);

const allowedStatuses = new Set(['not_started', 'in_progress', 'completed']);
const allowedTaskStatuses = new Set(['not_started', 'in_progress', 'blocked', 'completed']);

function ensureStages(projectId) {
  if (!initialStages.has(projectId)) {
    initialStages.set(projectId, []);
  }
  return initialStages.get(projectId);
}

export const stageStore = {
  list(projectId) {
    return ensureStages(projectId).map(stage => ({ ...stage, tasks: stage.tasks.map(task => ({ ...task })) }));
  },
  updateStatus({ projectId, stageId, status }) {
    if (!allowedStatuses.has(status)) {
      throw new Error('Invalid status value');
    }
    const stages = ensureStages(projectId);
    const stage = stages.find(item => item.id === stageId);
    if (!stage) {
      throw new Error('Stage not found');
    }
    stage.status = status;
    return { ...stage, tasks: stage.tasks.map(task => ({ ...task })) };
  },
  create({ projectId, name, dueDate }) {
    const stages = ensureStages(projectId);
    const id = `${projectId}-stage-${stages.length + 1}`;
    const stage = {
      id,
      name,
      status: 'not_started',
      dueDate: dueDate ?? null,
      tasks: []
    };
    stages.push(stage);
    return { ...stage };
  },
  addTask({ projectId, stageId, title, dueDate, assignee }) {
    if (!title) throw new Error('Task title is required');
    const stages = ensureStages(projectId);
    const stage = stages.find(item => item.id === stageId);
    if (!stage) throw new Error('Stage not found');
    const id = `${stageId}-task-${stage.tasks.length + 1}`;
    const task = {
      id,
      title,
      state: 'not_started',
      dueDate: dueDate ?? null,
      assignee: assignee ?? ''
    };
    stage.tasks.push(task);
    return { ...task };
  },
  updateTaskStatus({ projectId, stageId, taskId, state }) {
    if (!allowedTaskStatuses.has(state)) {
      throw new Error('Invalid task state');
    }
    const stages = ensureStages(projectId);
    const stage = stages.find(item => item.id === stageId);
    if (!stage) throw new Error('Stage not found');
    const task = stage.tasks.find(item => item.id === taskId);
    if (!task) throw new Error('Task not found');
    task.state = state;
    return { ...task };
  }
};

export const stageStatuses = [...allowedStatuses];
export const taskStatuses = [...allowedTaskStatuses];
