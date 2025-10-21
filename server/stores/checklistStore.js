import { stageStore } from './stageStore.js';

export const checklistStore = {
  list(projectId) {
    return stageStore.list(projectId).map(stage => ({ id: stage.id, name: stage.name, toggles: stage.toggles }));
  },
  update({ projectId, stageId, toggleId, value }) {
    return stageStore.updateToggle({ projectId, stageId, toggleId, value });
  },
  create({ projectId, stageId, label, defaultValue }) {
    return stageStore.addToggle({ projectId, stageId, label, defaultValue });
  },
  remove({ projectId, stageId, toggleId }) {
    return stageStore.removeToggle({ projectId, stageId, toggleId });
  }
};
