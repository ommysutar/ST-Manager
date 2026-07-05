export type {
  CreateProjectInput,
  ProjectProgress,
  ProjectSource,
  ProjectStatus,
  ProjectTask,
  StudioProject,
  TaskStatus,
  CreatedProject,
} from "./types";

export {
  createProject,
  createProjectFromInquiry,
  getProject,
  listProjects,
  updateProject,
  updateProjectTasks,
  initializeProjectSnapshots,
} from "./storage";

export {
  calculateProjectProgress,
  calculateTaskProgress,
  getCurrentTaskIndex,
  getPrimaryEngineer,
} from "./progress";

export {
  createCustomTask,
  deleteTaskFromList,
  generateTasksFromServices,
  reorderTasks,
  sortTasks,
  updateTaskInList,
} from "./tasks";

export { PROJECTS_STORAGE_KEY } from "./types";
