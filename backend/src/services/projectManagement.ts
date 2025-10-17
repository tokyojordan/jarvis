import { db } from './firebase';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { v4 as uuid } from 'uuid';

/**
 * Minimal interfaces (scoped to this service).
 * If you already have model files, you can replace these imports accordingly.
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
  organizationId: ID;
  name: string;
  description?: string;
}

export interface Team extends BaseDoc {
  workspaceId: ID;
  name: string;
  description?: string;
  memberIds: ID[];
}

export interface PortfolioStatus {
  completionPercentage: number;
  totalTasks: number;
  completedTasks: number;
  projects: { id: ID; name: string; completionPercentage: number }[];
}

export interface Portfolio extends BaseDoc {
  workspaceId: ID;
  name: string;
  description?: string;
  projectIds: ID[];
  status?: PortfolioStatus;
}

export type ProjectStatus = 'not_started' | 'in_progress' | 'completed';

export interface Project extends BaseDoc {
  portfolioId: ID;
  teamId?: ID;
  name: string;
  description?: string;
  status: ProjectStatus;
  completionPercentage: number; // 0..100
  sectionIds: ID[];
}

export interface Section extends BaseDoc {
  projectId: ID;
  name: string;
  taskIds: ID[];
}

export type TaskStatus = 'not_started' | 'in_progress' | 'completed';

export interface Subtask {
  id: ID;
  title: string;
  status: TaskStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Task extends BaseDoc {
  sectionId: ID;
  projectId: ID;
  title: string;
  description?: string;
  assigneeId?: ID;
  tags?: string[];
  customFields?: Record<string, string>;
  subtasks?: Subtask[];
  dependencies?: ID[];
  status: TaskStatus;
}

/** ---------- Helpers ---------- */

function now() {
  return Timestamp.now();
}

async function createDoc<T extends BaseDoc>(col: string, data: Omit<T, keyof BaseDoc> & { userId: string }): Promise<ID> {
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

async function listDocs<T>(col: string, userId: string, filters: Record<string, any> = {}): Promise<T[]> {
  let ref: FirebaseFirestore.Query = db.collection(col).where('userId', '==', userId);
  for (const [k, v] of Object.entries(filters)) {
    ref = ref.where(k, '==', v);
  }
  const snap = await ref.orderBy('createdAt', 'desc').get();
  return snap.docs.map(d => d.data() as T);
}

async function updateDoc<T>(col: string, id: ID, userId: string, updates: Partial<T>): Promise<void> {
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

export async function updateOrganization(id: ID, updates: Partial<Pick<Organization, 'name'>>, userId: string) {
  return updateDoc<Organization>(COL_ORGS, id, userId, updates);
}

export async function deleteOrganizationById(id: ID, userId: string) {
  return deleteDoc(COL_ORGS, id, userId);
}

/** ---------- Workspaces ---------- */

const COL_WORKSPACES = 'workspaces';

export async function createWorkspace(input: { organizationId: ID; name: string; description?: string }, userId: string) {
  if (!input?.organizationId || !input?.name) throw new Error('Validation: organizationId and name required');
  return createDoc<Workspace>(COL_WORKSPACES, { ...input, userId });
}

export async function listWorkspaces(userId: string, filters?: { organizationId?: ID }) {
  return listDocs<Workspace>(COL_WORKSPACES, userId, filters || {});
}

export async function getWorkspace(id: ID, userId: string) {
  return getDoc<Workspace>(COL_WORKSPACES, id, userId);
}

export async function updateWorkspace(id: ID, updates: Partial<Pick<Workspace, 'name' | 'description'>>, userId: string) {
  return updateDoc<Workspace>(COL_WORKSPACES, id, userId, updates);
}

export async function deleteWorkspaceById(id: ID, userId: string) {
  return deleteDoc(COL_WORKSPACES, id, userId);
}

/** ---------- Teams ---------- */

const COL_TEAMS = 'teams';

export async function createTeam(input: { workspaceId: ID; name: string; description?: string; memberIds?: ID[] }, userId: string) {
  if (!input?.workspaceId || !input?.name) throw new Error('Validation: workspaceId and name required');
  return createDoc<Team>(COL_TEAMS, { memberIds: [], ...input, userId });
}

export async function listTeams(userId: string, filters?: { workspaceId?: ID }) {
  return listDocs<Team>(COL_TEAMS, userId, filters || {});
}

export async function getTeam(id: ID, userId: string) {
  return getDoc<Team>(COL_TEAMS, id, userId);
}

export async function updateTeam(id: ID, updates: Partial<Pick<Team, 'name' | 'description' | 'memberIds'>>, userId: string) {
  return updateDoc<Team>(COL_TEAMS, id, userId, updates);
}

export async function deleteTeamById(id: ID, userId: string) {
  return deleteDoc(COL_TEAMS, id, userId);
}

/** ---------- Portfolios ---------- */

const COL_PORTFOLIOS = 'portfolios';

export async function createPortfolio(input: { workspaceId: ID; name: string; description?: string }, userId: string) {
  if (!input?.workspaceId || !input?.name) throw new Error('Validation: workspaceId and name required');
  return createDoc<Portfolio>(COL_PORTFOLIOS, { projectIds: [], ...input, userId });
}

export async function listPortfolios(userId: string, filters?: { workspaceId?: ID }) {
  return listDocs<Portfolio>(COL_PORTFOLIOS, userId, filters || {});
}

export async function getPortfolio(id: ID, userId: string) {
  return getDoc<Portfolio>(COL_PORTFOLIOS, id, userId);
}

export async function updatePortfolio(id: ID, updates: Partial<Pick<Portfolio, 'name' | 'description' | 'projectIds'>>, userId: string) {
  return updateDoc<Portfolio>(COL_PORTFOLIOS, id, userId, updates);
}

export async function deletePortfolioById(id: ID, userId: string) {
  return deleteDoc(COL_PORTFOLIOS, id, userId);
}

/** ---------- Projects ---------- */

const COL_PROJECTS = 'projects';

export async function createProject(input: { portfolioId: ID; name: string; description?: string; teamId?: ID }, userId: string) {
  if (!input?.portfolioId || !input?.name) throw new Error('Validation: portfolioId and name required');
  const projectId = await createDoc<Project>(COL_PROJECTS, {
    ...input,
    userId,
    status: 'not_started',
    completionPercentage: 0,
    sectionIds: [],
  });
  // Optionally add to the portfolio.projectIds list
  await db.collection(COL_PORTFOLIOS).doc(input.portfolioId).update({
    projectIds: FieldValue.arrayUnion(projectId),
    updatedAt: now(),
  });
  return projectId;
}

export async function listProjects(userId: string, filters?: { portfolioId?: ID; teamId?: ID }) {
  return listDocs<Project>(COL_PROJECTS, userId, filters || {});
}

export async function getProject(id: ID, userId: string) {
  return getDoc<Project>(COL_PROJECTS, id, userId);
}

export async function updateProject(
  id: ID,
  updates: Partial<Pick<Project, 'name' | 'description' | 'status' | 'completionPercentage' | 'sectionIds' | 'teamId'>>,
  userId: string
) {
  return updateDoc<Project>(COL_PROJECTS, id, userId, updates);
}

export async function deleteProjectById(id: ID, userId: string) {
  // Optionally remove from any portfolio.projectIds
  const proj = await getProject(id, userId);
  if (proj?.portfolioId) {
    await db.collection(COL_PORTFOLIOS).doc(proj.portfolioId).update({
      projectIds: FieldValue.arrayRemove(id),
      updatedAt: now(),
    });
  }
  return deleteDoc(COL_PROJECTS, id, userId);
}

/** ---------- Sections ---------- */

const COL_SECTIONS = 'sections';

export async function createSection(input: { projectId: ID; name: string }, userId: string) {
  if (!input?.projectId || !input?.name) throw new Error('Validation: projectId and name required');
  const sectionId = await createDoc<Section>(COL_SECTIONS, { ...input, taskIds: [], userId });
  // Append to project.sectionIds
  await db.collection(COL_PROJECTS).doc(input.projectId).update({
    sectionIds: FieldValue.arrayUnion(sectionId),
    updatedAt: now(),
  });
  return sectionId;
}

export async function listSections(userId: string, filters?: { projectId?: ID }) {
  return listDocs<Section>(COL_SECTIONS, userId, filters || {});
}

export async function getSection(id: ID, userId: string) {
  return getDoc<Section>(COL_SECTIONS, id, userId);
}

export async function updateSection(id: ID, updates: Partial<Pick<Section, 'name' | 'taskIds'>>, userId: string) {
  return updateDoc<Section>(COL_SECTIONS, id, userId, updates);
}

export async function deleteSectionById(id: ID, userId: string) {
  const section = await getSection(id, userId);
  if (section?.projectId) {
    await db.collection(COL_PROJECTS).doc(section.projectId).update({
      sectionIds: FieldValue.arrayRemove(id),
      updatedAt: now(),
    });
  }
  return deleteDoc(COL_SECTIONS, id, userId);
}

/** ---------- Tasks ---------- */

const COL_TASKS = 'tasks';

export async function createTask(input: {
  sectionId: ID;
  projectId: ID;
  title: string;
  description?: string;
  assigneeId?: ID;
  tags?: string[];
  customFields?: Record<string, string>;
  subtasks?: { title: string; status?: TaskStatus }[];
  dependencies?: ID[];
}, userId: string) {
  if (!input?.sectionId || !input?.projectId || !input?.title) {
    throw new Error('Validation: sectionId, projectId, title required');
  }
  const subtasks: Subtask[] = (input.subtasks || []).map(s => ({
    id: uuid(),
    title: s.title,
    status: s.status || 'not_started',
    createdAt: now(),
    updatedAt: now(),
  }));

  const taskId = await createDoc<Task>(COL_TASKS, {
    ...input,
    userId,
    tags: input.tags || [],
    customFields: input.customFields || {},
    subtasks,
    dependencies: input.dependencies || [],
    status: 'not_started',
  });

  // Append to section.taskIds
  await db.collection(COL_SECTIONS).doc(input.sectionId).update({
    taskIds: FieldValue.arrayUnion(taskId),
    updatedAt: now(),
  });

  return taskId;
}

export async function listTasks(userId: string, filters?: Partial<Pick<Task, 'projectId' | 'sectionId' | 'assigneeId' | 'status'>>) {
  return listDocs<Task>(COL_TASKS, userId, filters || {});
}

export async function getTask(id: ID, userId: string) {
  return getDoc<Task>(COL_TASKS, id, userId);
}

export async function updateTask(
  id: ID,
  updates: Partial<Pick<Task, 'title' | 'description' | 'assigneeId' | 'tags' | 'customFields' | 'subtasks' | 'dependencies' | 'status'>>,
  userId: string
) {
  return updateDoc<Task>(COL_TASKS, id, userId, updates);
}

export async function deleteTaskById(id: ID, userId: string) {
  // Remove from parent section.taskIds
  const task = await getTask(id, userId);
  if (task?.sectionId) {
    await db.collection(COL_SECTIONS).doc(task.sectionId).update({
      taskIds: FieldValue.arrayRemove(id),
      updatedAt: now(),
    });
  }
  return deleteDoc(COL_TASKS, id, userId);
}

/** ---------- Portfolio Rollup (optional helper) ---------- */
export async function calculatePortfolioStatus(portfolioId: ID, userId: string): Promise<PortfolioStatus> {
  // Ensure the portfolio belongs to the user
  const portfolio = await getPortfolio(portfolioId, userId);
  if (!portfolio) throw new Error('NotFound');

  const projectsSnap = await db.collection(COL_PROJECTS)
    .where('userId', '==', userId)
    .where('portfolioId', '==', portfolioId)
    .get();

  let totalTasks = 0;
  let completedTasks = 0;
  const projectSummaries: PortfolioStatus['projects'] = [];

  for (const projDoc of projectsSnap.docs) {
    const proj = projDoc.data() as Project;
    const tasksSnap = await db.collection(COL_TASKS)
      .where('userId', '==', userId)
      .where('projectId', '==', proj.id)
      .get();

    const projectTaskCount = tasksSnap.size;
    const projectCompleted = tasksSnap.docs.filter(d => (d.data() as Task).status === 'completed').length;

    totalTasks += projectTaskCount;
    completedTasks += projectCompleted;

    const completion = projectTaskCount > 0 ? (projectCompleted / projectTaskCount) * 100 : 0;
    projectSummaries.push({ id: proj.id, name: proj.name, completionPercentage: completion });
  }

  const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const status: PortfolioStatus = {
    completionPercentage,
    totalTasks,
    completedTasks,
    projects: projectSummaries,
  };

  // Persist snapshot to the portfolio document (optional)
  await db.collection(COL_PORTFOLIOS).doc(portfolioId).update({
    status,
    updatedAt: now(),
  });

  return status;
}
