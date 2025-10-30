import { BaseService } from './base.service';
import { Task } from '../types';
import { COLLECTIONS } from '../config';

/**
 * Task Service (v2.0 - Child knows parent)
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
    projectIds: string[], // ✅ Array of project IDs (direct parent)
    userId: string,
    title: string,
    options?: {
      description?: string;
      assigneeId?: string;
      status?: 'not_started' | 'in_progress' | 'completed';
      tags?: string[];
      customFields?: { [key: string]: string };
      dependencies?: string[]; // Array of task IDs this task depends on
    }
  ): Promise<string> {
    return await this.create(
      {
        projectIds,
        userId,
        title,
        description: options?.description,
        assigneeId: options?.assigneeId,
        status: options?.status || 'not_started',
        tags: options?.tags || [],
        customFields: options?.customFields || {},
        dependencies: options?.dependencies || [],
      } as Omit<Task, 'id' | 'createdAt' | 'updatedAt'>,
      userId
    );
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
   * Get tasks created by user
   */
  async getTasksByUser(userId: string): Promise<Task[]> {
    return await this.getByField('userId', userId);
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
    status: 'not_started' | 'in_progress' | 'completed',
    userId: string
  ): Promise<void> {
    await this.update(taskId, { status } as Partial<Task>, userId);
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
   * Add task dependency
   */
  async addDependency(taskId: string, dependencyTaskId: string, userId: string): Promise<void> {
    await this.addToArray(taskId, 'dependencies', dependencyTaskId, userId);
  }

  /**
   * Remove task dependency
   */
  async removeDependency(taskId: string, dependencyTaskId: string, userId: string): Promise<void> {
    await this.removeFromArray(taskId, 'dependencies', dependencyTaskId, userId);
  }

  /**
   * Check if user is task creator
   */
  async isCreator(taskId: string, userId: string): Promise<boolean> {
    const task = await this.getById(taskId);
    return task ? task.userId === userId : false;
  }

  /**
   * Check if user is task assignee
   */
  async isAssignee(taskId: string, userId: string): Promise<boolean> {
    const task = await this.getById(taskId);
    return task ? task.assigneeId === userId : false;
  }
}