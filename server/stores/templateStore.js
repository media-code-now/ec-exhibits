// Store for saved templates
const templates = new Map();

// Initialize with default templates
const defaultTemplates = [
  {
    id: 'template-standard',
    name: 'Standard Project Template',
    description: 'Complete workflow with all stages',
    stageCount: 5,
    isDefault: true,
    createdAt: new Date().toISOString(),
    stages: [
      {
        slug: 'planning',
        name: 'Planning & Design',
        description: 'Initial project planning and design phase',
        defaultStageDueInDays: 7,
        permissions: {
          viewRoles: ['owner', 'staff', 'client'],
          taskUpdateRoles: ['owner', 'staff'],
          checklistEditRoles: ['owner', 'staff'],
          clientCanUpload: false
        },
        tasks: [],
        uploads: [],
        toggles: []
      },
      {
        slug: 'production',
        name: 'Production',
        description: 'Create and prepare all materials',
        defaultStageDueInDays: 14,
        permissions: {
          viewRoles: ['owner', 'staff', 'client'],
          taskUpdateRoles: ['owner', 'staff'],
          checklistEditRoles: ['owner', 'staff'],
          clientCanUpload: false
        },
        tasks: [],
        uploads: [],
        toggles: []
      },
      {
        slug: 'shipping',
        name: 'Shipping & Logistics',
        description: 'Ship materials to venue',
        defaultStageDueInDays: 3,
        permissions: {
          viewRoles: ['owner', 'staff', 'client'],
          taskUpdateRoles: ['owner', 'staff'],
          checklistEditRoles: ['owner', 'staff'],
          clientCanUpload: false
        },
        tasks: [],
        uploads: [],
        toggles: []
      },
      {
        slug: 'installation',
        name: 'Installation',
        description: 'Onsite setup and installation',
        defaultStageDueInDays: 2,
        permissions: {
          viewRoles: ['owner', 'staff', 'client'],
          taskUpdateRoles: ['owner', 'staff'],
          checklistEditRoles: ['owner', 'staff'],
          clientCanUpload: false
        },
        tasks: [],
        uploads: [],
        toggles: []
      },
      {
        slug: 'closeout',
        name: 'Post-Show Closeout',
        description: 'Teardown and final wrap-up',
        defaultStageDueInDays: 3,
        permissions: {
          viewRoles: ['owner', 'staff', 'client'],
          taskUpdateRoles: ['owner', 'staff'],
          checklistEditRoles: ['owner', 'staff'],
          clientCanUpload: false
        },
        tasks: [],
        uploads: [],
        toggles: []
      }
    ]
  },
  {
    id: 'template-quick',
    name: 'Quick Setup Template',
    description: 'Simplified workflow for smaller projects',
    stageCount: 3,
    isDefault: false,
    createdAt: new Date().toISOString(),
    stages: [
      {
        slug: 'preparation',
        name: 'Preparation',
        description: 'Gather materials and prepare',
        defaultStageDueInDays: 5,
        permissions: {
          viewRoles: ['owner', 'staff', 'client'],
          taskUpdateRoles: ['owner', 'staff'],
          checklistEditRoles: ['owner', 'staff'],
          clientCanUpload: false
        },
        tasks: [],
        uploads: [],
        toggles: []
      },
      {
        slug: 'execution',
        name: 'Execution',
        description: 'Complete the project work',
        defaultStageDueInDays: 7,
        permissions: {
          viewRoles: ['owner', 'staff', 'client'],
          taskUpdateRoles: ['owner', 'staff'],
          checklistEditRoles: ['owner', 'staff'],
          clientCanUpload: false
        },
        tasks: [],
        uploads: [],
        toggles: []
      },
      {
        slug: 'completion',
        name: 'Completion',
        description: 'Final delivery and closeout',
        defaultStageDueInDays: 2,
        permissions: {
          viewRoles: ['owner', 'staff', 'client'],
          taskUpdateRoles: ['owner', 'staff'],
          checklistEditRoles: ['owner', 'staff'],
          clientCanUpload: false
        },
        tasks: [],
        uploads: [],
        toggles: []
      }
    ]
  }
];

// Initialize templates
defaultTemplates.forEach(template => {
  templates.set(template.id, template);
});

export function listTemplates() {
  return Array.from(templates.values()).map(template => ({
    id: template.id,
    name: template.name,
    description: template.description,
    stageCount: template.stageCount,
    isDefault: template.isDefault,
    createdAt: template.createdAt
  }));
}

export function getTemplate(id) {
  return templates.get(id);
}

export function getDefaultTemplate() {
  return Array.from(templates.values()).find(t => t.isDefault);
}

export function createTemplate({ name, description, stages }) {
  const id = `template-${Date.now()}`;
  const template = {
    id,
    name,
    description,
    stageCount: stages.length,
    isDefault: false,
    createdAt: new Date().toISOString(),
    stages
  };
  templates.set(id, template);
  return template;
}

export function updateTemplate(id, updates) {
  const template = templates.get(id);
  if (!template) {
    throw new Error('Template not found');
  }
  
  const updated = {
    ...template,
    ...updates,
    stageCount: updates.stages ? updates.stages.length : template.stageCount,
    updatedAt: new Date().toISOString()
  };
  
  templates.set(id, updated);
  return updated;
}

export function deleteTemplate(id) {
  const template = templates.get(id);
  if (!template) {
    throw new Error('Template not found');
  }
  if (template.isDefault) {
    throw new Error('Cannot delete the default template');
  }
  templates.delete(id);
  return true;
}

export function setDefaultTemplate(id) {
  const template = templates.get(id);
  if (!template) {
    throw new Error('Template not found');
  }
  
  // Remove default flag from all templates
  templates.forEach(t => {
    t.isDefault = false;
  });
  
  // Set this one as default
  template.isDefault = true;
  templates.set(id, template);
  return template;
}
