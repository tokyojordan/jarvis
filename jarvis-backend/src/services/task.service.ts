import { BaseService } from './base.service';
import { Task, Subtask, TaskDependency } from '../types';
import { COLLECTIONS, Timestamp, FieldValue } from '../config';
import { v4 as uuidv4 } from 'uuid';

/**
 * Task Service
 * Handles all task-related database operations
 * CRITICAL: Tasks can belong to MULTIPLE projects (many-to-many)
 * Uses projectIds array (child-knows-parent architecture)
 */
export class TaskService extends BaseService<Task> {
  constructor() {
    super(COLLECTIONS.TASKS);
  }

  /**
   * Create a new task
   * IMPORTANT: projectIds is an array (can belong to multiple projects)
   */
  async createTask(
    projectIds: string[], // ✅ Array of project IDs
    title: string,
    userId: string,
    options?: {
      description?: string;
      assigneeId?: string;
      reporterId?: string;
      status?: 'todo' | 'in_progress' | 'review' | 'blocked' | 'done' | 'archived';
      priority?: 'low' | 'medium' | 'high' | 'critical';
      dueDate?: Date;
      estimatedHours?: number;
      tags?: string[];
      customFields?: Record<string, any>;
      subtasks?: Array<{ title: string }>;
      dependencies?: Array<{ taskId: string; type: 'blocks' | 'blocked_by' | 'relates_to' }>;
    }
  ): Promise<string> {
    // Process subtasks
    const subtasks: Subtask[] = (options?.subtasks || []).map(st => ({
      id: uuidv4(),
      title: st.title,
      completed: false,
    }));

    return await this.create(
      {
        projectIds, // ✅ Store array of project IDs
        title,
        description: options?.description,
        assigneeId: options?.assigneeId,
        reporterId: options?.reporterId || userId,
        status: options?.status || 'todo',
        priority: options?.priority || 'medium',
        dueDate: options?.dueDate ? Timestamp.fromDate(options.dueDate) : undefined,
        estimatedHours: options?.estimatedHours,
        tags: options?.tags || [],
        customFields: options?.customFields || {},
        subtasks,
        dependencies: options?.dependencies || [],
        attachments: [],
        createdBy: userId,
        updatedBy: userId,
      } as Omit<Task, 'id' | 'createdAt' | 'updatedAt'>,
      userId
    );
  }

  /**
   * Get all tasks in an organization
   */
  async getTasksByOrganization(organizationId: string): Promise<Task[]> {
    return await this.getByField('organizationId', organizationId);
  }

  /**
   * Get all tasks in a workspace
   */
  async getTasksByWorkspace(workspaceId: string): Promise<Task[]> {
    return await this.getByField('workspaceId', workspaceId);
  }

  /**
   * Get all tasks in a project
   * ✅ Uses array-contains query (child-knows-parent)
   */
  async getTasksByProject(projectId: string): Promise<Task[]> {
    return await this.getByArrayContains('projectIds', projectId);
  }

  /**
   * Get tasks assigned to user
   */
  async getTasksByAssignee(assigneeId: string): Promise<Task[]> {
    return await this.getByField('assigneeId', assigneeId);
  }

  /**
   * Get tasks reported by user
   */
  async getTasksByReporter(reporterId: string): Promise<Task[]> {
    return await this.getByField('reporterId', reporterId);
  }

  /**
   * Get tasks by status
   */
  async getTasksByStatus(
    organizationId: string,
    status: 'todo' | 'in_progress' | 'review' | 'blocked' | 'done' | 'archived'
  ): Promise<Task[]> {
    const snapshot = await this.getCollection()
      .where('organizationId', '==', organizationId)
      .where('status', '==', status)
      .get();
    return this.snapshotToEntities(snapshot);
  }

  /**
   * Add task to project (many-to-many)
   * ✅ Atomic array operation
   */
  async addToProject(taskId: string, projectId: string, userId: string): Promise<void> {
    await this.addToArray(taskId, 'projectIds', projectId, userId);
  }

  /**
   * Remove task from project (many-to-many)
   * ✅ Atomic array operation
   */
  async removeFromProject(taskId: string, projectId: string, userId: string): Promise<void> {
    await this.removeFromArray(taskId, 'projectIds', projectId, userId);
  }

  /**
   * Update task projects (replace entire array)
   */
  async updateProjects(taskId: string, projectIds: string[], userId: string): Promise<void> {
    await this.update(taskId, { projectIds } as Partial<Task>, userId);
  }

  /**
   * Update task status
   */
  async updateStatus(
    taskId: string,
    status: 'todo' | 'in_progress' | 'review' | 'blocked' | 'done' | 'archived',
    userId: string
  ): Promise<void> {
    await this.update(taskId, { status } as Partial<Task>, userId);
  }

  /**
   * Update task priority
   */
  async updatePriority(
    taskId: string,
    priority: 'low' | 'medium' | 'high' | 'critical',
    userId: string
  ): Promise<void> {
    await this.update(taskId, { priority } as Partial<Task>, userId);
  }

  /**
   * Assign task to user
   */
  async assignTask(taskId: string, assigneeId: string, userId: string): Promise<void> {
    await this.update(taskId, { assigneeId } as Partial<Task>, userId);
  }

  /**
   * Add tag to task
   */
  async addTag(taskId: string, tag: string, userId: string): Promise<void> {
    await this.addToArray(taskId, 'tags', tag, userId);
  }

  /**
   * Remove tag from task
   */
  async removeTag(taskId: string, tag: string, userId: string): Promise<void> {
    await this.removeFromArray(taskId, 'tags', tag, userId);
  }

  /**
   * Add subtask to task
   */
  async addSubtask(taskId: string, title: string, userId: string): Promise<string> {
    const subtask: Subtask = {
      id: uuidv4(),
      title,
      completed: false,
    };

    await this.getCollection().doc(taskId).update({
      subtasks: FieldValue.arrayUnion(subtask),
      updatedAt: Timestamp.now(),
      updatedBy: userId,
    });

    return subtask.id;
  }

  /**
   * Complete subtask
   */
  async completeSubtask(taskId: string, subtaskId: string, userId: string): Promise<void> {
    const task = await this.getById(taskId);
    if (!task) throw new Error('Task not found');

    const updatedSubtasks = task.subtasks?.map(st =>
      st.id === subtaskId
        ? { ...st, completed: true, completedAt: Timestamp.now(), completedBy: userId }
        : st
    );

    await this.update(taskId, { subtasks: updatedSubtasks } as Partial<Task>, userId);
  }

  /**
   * Uncomplete subtask
   */
  async uncompleteSubtask(taskId: string, subtaskId: string, userId: string): Promise<void> {
    const task = await this.getById(taskId);
    if (!task) throw new Error('Task not found');

    const updatedSubtasks = task.subtasks?.map(st =>
      st.id === subtaskId
        ? { ...st, completed: false, completedAt: undefined, completedBy: undefined }
        : st
    );

    await this.update(taskId, { subtasks: updatedSubtasks } as Partial<Task>, userId);
  }

  /**
   * Delete subtask
   */
  async deleteSubtask(taskId: string, subtaskId: string, userId: string): Promise<void> {
    const task = await this.getById(taskId);
    if (!task) throw new Error('Task not found');

    const updatedSubtasks = task.subtasks?.filter(st => st.id !== subtaskId);

    await this.update(taskId, { subtasks: updatedSubtasks } as Partial<Task>, userId);
  }

  /**
   * Add dependency to task
   */
  async addDependency(
    taskId: string,
    dependencyTaskId: string,
    type: 'blocks' | 'blocked_by' | 'relates_to',
    userId: string
  ): Promise<void> {
    const dependency: TaskDependency = {
      taskId: dependencyTaskId,
      type,
    };

    await this.getCollection().doc(taskId).update({
      dependencies: FieldValue.arrayUnion(dependency),
      updatedAt: Timestamp.now(),
      updatedBy: userId,
    });
  }

  /**
   * Remove dependency from task
   */
  async removeDependency(
    taskId: string,
    dependencyTaskId: string,
    userId: string
  ): Promise<void> {
    const task = await this.getById(taskId);
    if (!task) throw new Error('Task not found');

    const updatedDependencies = task.dependencies?.filter(dep => dep.taskId !== dependencyTaskId);

    await this.update(taskId, { dependencies: updatedDependencies } as Partial<Task>, userId);
  }

  /**
   * Log actual hours worked
   */
  async logHours(taskId: string, hours: number, userId: string): Promise<void> {
    const task = await this.getById(taskId);
    if (!task) throw new Error('Task not found');

    const newActualHours = (task.actualHours || 0) + hours;
    await this.update(taskId, { actualHours: newActualHours } as Partial<Task>, userId);
  }

  /**
   * Check if user is assigned to task
   */
  async isAssignee(taskId: string, userId: string): Promise<boolean> {
    const task = await this.getById(taskId);
    return task ? task.assigneeId === userId : false;
  }

  /**
   * Check if user is reporter of task
   */
  async isReporter(taskId: string, userId: string): Promise<boolean> {
    const task = await this.getById(taskId);
    return task ? task.reporterId === userId : false;
  }
}