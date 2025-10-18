import { db } from './firebase';
import { Timestamp } from 'firebase-admin/firestore';
import { v4 as uuid } from 'uuid';

/**
 * ID-based Project Management System
 * All relationships are stored as foreign keys only - no duplicate arrays
 * Subtasks are just tasks with a parentTaskId set
 */

export type ID = string;

export interface BaseDoc {
  id: ID;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Organization extends BaseDoc {
  name: string;
}

export interface Workspace extends BaseDoc {
  organizationId: ID;  // Foreign key only
  name: string;
  description?: string;
}

export interface Team extends BaseDoc {
  workspaceId: ID;  // Foreign key only
  name: string;
  description?: string;
  memberIds: ID[];  // Keep this as it's a many-to-many relationship
}

export interface Portfolio extends BaseDoc {
  workspaceId: ID;  // Foreign key only
  name: string;
  description?: string;
  status?: PortfolioStatus;
}

export type ProjectStatus = 'not_started' | 'in_progress' | 'completed';

export interface Project extends BaseDoc {
  portfolioId: ID;  // Foreign key only
  teamId?: ID;      // Foreign key only
  name: string;
  description?: string;
  status: ProjectStatus;
  completionPercentage: number;
}

export interface Section extends BaseDoc {
  projectId: ID;  // Foreign key only
  name: string;
}

export type TaskStatus = 'not_started' | 'in_progress' | 'completed';

export interface Task extends BaseDoc {
  sectionId: ID;   // Foreign key only
  projectId: ID;   // Foreign key only (denormalized for querying)
  parentTaskId?: ID;  // Foreign key to parent Task (if this is a subtask)
  title: string;
  description?: string;
  assigneeId?: ID;
  tags?: string[];
  customFields?: Record<string, string>;
  subtaskIds?: ID[];  // Array of child task IDs
  dependencies?: ID[];    // Array of task IDs this task depends on
  status: TaskStatus;
}

export interface TaskWithSubtasks extends Task {
  subtasks?: Task[];  // Populated via query, not stored
}

export interface PortfolioStatus {
  completionPercentage: number;
  totalTasks: number;
  completedTasks: number;
  projects: { id: ID; name: string; completionPercentage: number }[];
}

/** ---------- Helpers ---------- */

function now() {
  return Timestamp.now();
}

async function createDoc<T extends BaseDoc>(
  col: string,
  data: Omit<T, keyof BaseDoc> & { userId: string }
): Promise<ID> {
  const id = uuid();
  const doc: T = {
    id,
    userId: data.userId,
    createdAt: now(),
    updatedAt: now(),
    ...(data as any),
  };
  await db.collection(col).doc(id).set(doc);
  return id;
}

async function getDoc<T>(col: string, id: ID, userId: string): Promise<T | null> {
  const snap = await db.collection(col).doc(id).get();
  if (!snap.exists) return null;
  const data = snap.data() as T & { userId: string };
  if (data.userId !== userId) return null;
  return data as T;
}

async function listDocs<T>(
  col: string,
  userId: string,
  filters: Record<string, any> = {}
): Promise<T[]> {
  let ref: FirebaseFirestore.Query = db.collection(col).where('userId', '==', userId);
  for (const [k, v] of Object.entries(filters)) {
    ref = ref.where(k, '==', v);
  }
  const snap = await ref.orderBy('createdAt', 'desc').get();
  return snap.docs.map(d => d.data() as T);
}

async function updateDoc<T>(
  col: string,
  id: ID,
  userId: string,
  updates: Partial<T>
): Promise<void> {
  const ref = db.collection(col).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('NotFound');
  const data = snap.data() as { userId: string };
  if (data.userId !== userId) throw new Error('Forbidden');
  await ref.update({ ...updates, updatedAt: now() });
}

async function deleteDoc(col: string, id: ID, userId: string): Promise<void> {
  const ref = db.collection(col).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return;
  const data = snap.data() as { userId: string };
  if (data.userId !== userId) throw new Error('Forbidden');
  await ref.delete();
}

/** ---------- Organizations ---------- */

const COL_ORGS = 'organizations';

export async function createOrganization(input: { name: string }, userId: string) {
  if (!input?.name) throw new Error('Validation: name required');
  return createDoc<Organization>(COL_ORGS, { ...input, userId });
}

export async function getOrganization(id: ID, userId: string) {
  return getDoc<Organization>(COL_ORGS, id, userId);
}

export async function listOrganizations(userId: string) {
  return listDocs<Organization>(COL_ORGS, userId);
}

export async function updateOrganization(
  id: ID,
  updates: Partial<Pick<Organization, 'name'>>,
  userId: string
) {
  return updateDoc<Organization>(COL_ORGS, id, userId, updates);
}

export async function deleteOrganizationById(id: ID, userId: string) {
  return deleteDoc(COL_ORGS, id, userId);
}

/** ---------- Workspaces ---------- */

const COL_WORKSPACES = 'workspaces';

export async function createWorkspace(
  input: { organizationId: ID; name: string; description?: string },
  userId: string
) {
  if (!input?.organizationId || !input?.name) {
    throw new Error('Validation: organizationId and name required');
  }
  return createDoc<Workspace>(COL_WORKSPACES, { ...input, userId });
}

export async function listWorkspaces(userId: string, filters?: { organizationId?: ID }) {
  return listDocs<Workspace>(COL_WORKSPACES, userId, filters || {});
}

export async function getWorkspace(id: ID, userId: string) {
  return getDoc<Workspace>(COL_WORKSPACES, id, userId);
}

export async function updateWorkspace(
  id: ID,
  updates: Partial<Pick<Workspace, 'name' | 'description'>>,
  userId: string
) {
  return updateDoc<Workspace>(COL_WORKSPACES, id, userId, updates);
}

export async function deleteWorkspaceById(id: ID, userId: string) {
  return deleteDoc(COL_WORKSPACES, id, userId);
}

/** ---------- Teams ---------- */

const COL_TEAMS = 'teams';

export async function createTeam(
  input: {
    workspaceId: ID;
    name: string;
    description?: string;
    memberIds?: ID[];
  },
  userId: string
) {
  if (!input?.workspaceId || !input?.name) {
    throw new Error('Validation: workspaceId and name required');
  }
  return createDoc<Team>(COL_TEAMS, { memberIds: [], ...input, userId });
}

export async function listTeams(userId: string, filters?: { workspaceId?: ID }) {
  return listDocs<Team>(COL_TEAMS, userId, filters || {});
}

export async function getTeam(id: ID, userId: string) {
  return getDoc<Team>(COL_TEAMS, id, userId);
}

export async function updateTeam(
  id: ID,
  updates: Partial<Pick<Team, 'name' | 'description' | 'memberIds'>>,
  userId: string
) {
  return updateDoc<Team>(COL_TEAMS, id, userId, updates);
}

export async function deleteTeamById(id: ID, userId: string) {
  return deleteDoc(COL_TEAMS, id, userId);
}

/** ---------- Portfolios ---------- */

const COL_PORTFOLIOS = 'portfolios';

export async function createPortfolio(
  input: { workspaceId: ID; name: string; description?: string },
  userId: string
) {
  if (!input?.workspaceId || !input?.name) {
    throw new Error('Validation: workspaceId and name required');
  }
  return createDoc<Portfolio>(COL_PORTFOLIOS, { ...input, userId });
}

export async function listPortfolios(userId: string, filters?: { workspaceId?: ID }) {
  return listDocs<Portfolio>(COL_PORTFOLIOS, userId, filters || {});
}

export async function getPortfolio(id: ID, userId: string) {
  return getDoc<Portfolio>(COL_PORTFOLIOS, id, userId);
}

/**
 * Get portfolio with its projects populated
 */
export async function getPortfolioWithProjects(id: ID, userId: string) {
  const portfolio = await getPortfolio(id, userId);
  if (!portfolio) return null;

  const projects = await listProjects(userId, { portfolioId: id });

  return {
    ...portfolio,
    projects,
  };
}

export async function updatePortfolio(
  id: ID,
  updates: Partial<Pick<Portfolio, 'name' | 'description'>>,
  userId: string
) {
  return updateDoc<Portfolio>(COL_PORTFOLIOS, id, userId, updates);
}

export async function deletePortfolioById(id: ID, userId: string) {
  return deleteDoc(COL_PORTFOLIOS, id, userId);
}

/** ---------- Projects ---------- */

const COL_PROJECTS = 'projects';

export async function createProject(
  input: {
    portfolioId: ID;
    name: string;
    description?: string;
    teamId?: ID;
  },
  userId: string
) {
  if (!input?.portfolioId || !input?.name) {
    throw new Error('Validation: portfolioId and name required');
  }
  
  const projectId = await createDoc<Project>(COL_PROJECTS, {
    ...input,
    userId,
    status: 'not_started',
    completionPercentage: 0,
  });

  return projectId;
}

export async function listProjects(
  userId: string,
  filters?: { portfolioId?: ID; teamId?: ID }
) {
  return listDocs<Project>(COL_PROJECTS, userId, filters || {});
}

export async function getProject(id: ID, userId: string) {
  return getDoc<Project>(COL_PROJECTS, id, userId);
}

/**
 * Get project with its sections populated
 */
export async function getProjectWithSections(id: ID, userId: string) {
  const project = await getProject(id, userId);
  if (!project) return null;

  const sections = await listSections(userId, { projectId: id });

  return {
    ...project,
    sections,
  };
}

/**
 * Get project with full hierarchy (sections + tasks)
 */
export async function getProjectWithFullHierarchy(id: ID, userId: string) {
  const project = await getProject(id, userId);
  if (!project) return null;

  const sections = await listSections(userId, { projectId: id });
  
  const sectionsWithTasks = await Promise.all(
    sections.map(async (section) => ({
      ...section,
      tasks: await listTasks(userId, { sectionId: section.id }),
    }))
  );

  return {
    ...project,
    sections: sectionsWithTasks,
  };
}

export async function updateProject(
  id: ID,
  updates: Partial<Pick<Project, 'name' | 'description' | 'status' | 'completionPercentage' | 'teamId'>>,
  userId: string
) {
  return updateDoc<Project>(COL_PROJECTS, id, userId, updates);
}

export async function deleteProjectById(id: ID, userId: string) {
  return deleteDoc(COL_PROJECTS, id, userId);
}

/** ---------- Sections ---------- */

const COL_SECTIONS = 'sections';

export async function createSection(
  input: { projectId: ID; name: string },
  userId: string
) {
  if (!input?.projectId || !input?.name) {
    throw new Error('Validation: projectId and name required');
  }
  
  const sectionId = await createDoc<Section>(COL_SECTIONS, { ...input, userId });
  return sectionId;
}

export async function listSections(userId: string, filters?: { projectId?: ID }) {
  return listDocs<Section>(COL_SECTIONS, userId, filters || {});
}

export async function getSection(id: ID, userId: string) {
  return getDoc<Section>(COL_SECTIONS, id, userId);
}

/**
 * Get section with its tasks populated
 */
export async function getSectionWithTasks(id: ID, userId: string) {
  const section = await getSection(id, userId);
  if (!section) return null;

  const tasks = await listTasks(userId, { sectionId: id });

  return {
    ...section,
    tasks,
  };
}

export async function updateSection(
  id: ID,
  updates: Partial<Pick<Section, 'name'>>,
  userId: string
) {
  return updateDoc<Section>(COL_SECTIONS, id, userId, updates);
}

export async function deleteSectionById(id: ID, userId: string) {
  return deleteDoc(COL_SECTIONS, id, userId);
}

/** ---------- Tasks ---------- */

const COL_TASKS = 'tasks';

export async function createTask(
  input: {
    sectionId: ID;
    projectId: ID;
    parentTaskId?: ID;  // Optional: if provided, this task is a subtask
    title: string;
    description?: string;
    assigneeId?: ID;
    tags?: string[];
    customFields?: Record<string, string>;
    subtaskIds?: ID[];  // Optional: existing task IDs to link as subtasks
    dependencies?: ID[];
  },
  userId: string
) {
  if (!input?.sectionId || !input?.projectId || !input?.title) {
    throw new Error('Validation: sectionId, projectId, title required');
  }

  const taskId = await createDoc<Task>(COL_TASKS, {
    sectionId: input.sectionId,
    projectId: input.projectId,
    parentTaskId: input.parentTaskId,
    title: input.title,
    description: input.description,
    assigneeId: input.assigneeId,
    tags: input.tags || [],
    customFields: input.customFields || {},
    subtaskIds: input.subtaskIds || [],
    dependencies: input.dependencies || [],
    status: 'not_started',
    userId,
  });

  // If this task has a parent, add this task to parent's subtaskIds
  if (input.parentTaskId) {
    const parent = await getTask(input.parentTaskId, userId);
    if (parent) {
      const updatedSubtaskIds = [...(parent.subtaskIds || []), taskId];
      await updateTask(input.parentTaskId, { subtaskIds: updatedSubtaskIds }, userId);
    }
  }

  return taskId;
}

export async function listTasks(
  userId: string,
  filters?: Partial<Pick<Task, 'projectId' | 'sectionId' | 'assigneeId' | 'status' | 'parentTaskId'>>
) {
  return listDocs<Task>(COL_TASKS, userId, filters || {});
}

export async function getTask(id: ID, userId: string) {
  return getDoc<Task>(COL_TASKS, id, userId);
}

/**
 * Get task with its subtasks populated
 */
export async function getTaskWithSubtasks(id: ID, userId: string): Promise<TaskWithSubtasks | null> {
  const task = await getTask(id, userId);
  if (!task) return null;

  // Get subtasks by querying for tasks with this task as parent
  const subtasks = await listTasks(userId, { parentTaskId: id });

  return {
    ...task,
    subtasks,
  };
}

/**
 * Add a task as a subtask to another task
 */
export async function addSubtask(parentTaskId: ID, subtaskId: ID, userId: string): Promise<void> {
  const parent = await getTask(parentTaskId, userId);
  const subtask = await getTask(subtaskId, userId);
  
  if (!parent || !subtask) throw new Error('Task not found');
  
  // Update subtask to point to parent
  await updateTask(subtaskId, { parentTaskId }, userId);
  
  // Add subtask ID to parent's array
  const updatedSubtaskIds = [...(parent.subtaskIds || []), subtaskId];
  await updateTask(parentTaskId, { subtaskIds: updatedSubtaskIds }, userId);
}

/**
 * Remove a subtask from its parent task
 */
export async function removeSubtask(parentTaskId: ID, subtaskId: ID, userId: string): Promise<void> {
  const parent = await getTask(parentTaskId, userId);
  const subtask = await getTask(subtaskId, userId);
  
  if (!parent || !subtask) throw new Error('Task not found');
  
  // Remove parent reference from subtask
  await updateTask(subtaskId, { parentTaskId: undefined }, userId);
  
  // Remove subtask ID from parent's array
  const updatedSubtaskIds = (parent.subtaskIds || []).filter(id => id !== subtaskId);
  await updateTask(parentTaskId, { subtaskIds: updatedSubtaskIds }, userId);
}

export async function updateTask(
  id: ID,
  updates: Partial<Pick<Task, 'title' | 'description' | 'assigneeId' | 'tags' | 'customFields' | 'subtaskIds' | 'dependencies' | 'status' | 'parentTaskId'>>,
  userId: string
) {
  return updateDoc<Task>(COL_TASKS, id, userId, updates);
}

export async function deleteTaskById(id: ID, userId: string) {
  const task = await getTask(id, userId);
  if (!task) return;
  
  // If this task has subtasks, recursively delete them
  if (task.subtaskIds && task.subtaskIds.length > 0) {
    for (const subtaskId of task.subtaskIds) {
      await deleteTaskById(subtaskId, userId);
    }
  }
  
  // If this task has a parent, remove it from parent's subtaskIds
  if (task.parentTaskId) {
    const parent = await getTask(task.parentTaskId, userId);
    if (parent) {
      const updatedSubtaskIds = (parent.subtaskIds || []).filter(id => id !== task.id);
      await updateTask(task.parentTaskId, { subtaskIds: updatedSubtaskIds }, userId);
    }
  }
  
  // Delete the task
  return deleteDoc(COL_TASKS, id, userId);
}

/** ---------- Portfolio Rollup ---------- */

export async function calculatePortfolioStatus(
  portfolioId: ID,
  userId: string
): Promise<PortfolioStatus> {
  const portfolio = await getPortfolio(portfolioId, userId);
  if (!portfolio) throw new Error('NotFound');

  const projects = await listProjects(userId, { portfolioId });

  let totalTasks = 0;
  let completedTasks = 0;
  const projectSummaries: PortfolioStatus['projects'] = [];

  for (const proj of projects) {
    const tasks = await listTasks(userId, { projectId: proj.id });

    const projectTaskCount = tasks.length;
    const projectCompleted = tasks.filter(t => t.status === 'completed').length;

    totalTasks += projectTaskCount;
    completedTasks += projectCompleted;

    const completion = projectTaskCount > 0 ? (projectCompleted / projectTaskCount) * 100 : 0;
    projectSummaries.push({
      id: proj.id,
      name: proj.name,
      completionPercentage: completion,
    });
  }

  const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const status: PortfolioStatus = {
    completionPercentage,
    totalTasks,
    completedTasks,
    projects: projectSummaries,
  };

  await db.collection(COL_PORTFOLIOS).doc(portfolioId).update({
    status,
    updatedAt: now(),
  });

  return status;
}

/**
 * Calculate and update project completion percentage based on its tasks
 */
export async function calculateProjectCompletion(projectId: ID, userId: string): Promise<number> {
  const tasks = await listTasks(userId, { projectId });
  
  if (tasks.length === 0) return 0;
  
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const completionPercentage = (completedCount / tasks.length) * 100;
  
  await updateProject(projectId, { completionPercentage }, userId);
  
  return completionPercentage;
} 