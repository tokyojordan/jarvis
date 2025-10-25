import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { taskService, organizationService, workspaceService, projectService } from '../services';
import { CreateTaskRequest, UpdateTaskRequest, ApiResponse } from '../types';

/**
 * Task Controller
 * Handles HTTP requests for task operations
 * CRITICAL: Tasks can belong to MULTIPLE projects (projectIds array)
 */
export class TaskController {
  /**
   * @swagger
   * /api/tasks:
   *   post:
   *     summary: Create a new task
   *     description: Tasks can belong to multiple projects using projectIds array (child-knows-parent architecture)
   *     tags: [Tasks]
   *     security:
   *       - userAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - organizationId
   *               - workspaceId
   *               - projectIds
   *               - title
   *             properties:
   *               organizationId:
   *                 type: string
   *               workspaceId:
   *                 type: string
   *               projectIds:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Array of project IDs (child-knows-parent)
   *               title:
   *                 type: string
   *               description:
   *                 type: string
   *               assigneeId:
   *                 type: string
   *               reporterId:
   *                 type: string
   *               status:
   *                 type: string
   *                 enum: [todo, in_progress, review, blocked, done, archived]
   *               priority:
   *                 type: string
   *                 enum: [low, medium, high, critical]
   *               dueDate:
   *                 type: string
   *                 format: date-time
   *               estimatedHours:
   *                 type: number
   *               tags:
   *                 type: array
   *                 items:
   *                   type: string
   *               customFields:
   *                 type: object
   *               subtasks:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     title:
   *                       type: string
   *               dependencies:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     taskId:
   *                       type: string
   *                     type:
   *                       type: string
   *                       enum: [blocks, blocked_by, relates_to]
   *     responses:
   *       201:
   *         description: Task created successfully
   *       400:
   *         description: Validation error
   *       403:
   *         description: Forbidden
   */
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { 
        organizationId, 
        workspaceId, 
        projectIds,
        title,
        description,
        assigneeId,
        reporterId,
        status,
        priority,
        dueDate,
        estimatedHours,
        tags,
        customFields,
        subtasks,
        dependencies
      } = req.body as CreateTaskRequest;
      const userId = req.userId;

      if (!organizationId || !workspaceId || !projectIds || !Array.isArray(projectIds) || projectIds.length === 0 || !title) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'organizationId, workspaceId, projectIds (array), and title are required',
        } as ApiResponse);
        return;
      }

      // Check if user is member of organization
      const isMember = await organizationService.isMember(organizationId, userId);
      if (!isMember) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You must be a member of the organization',
        } as ApiResponse);
        return;
      }

      // Verify workspace belongs to organization
      const workspace = await workspaceService.getById(workspaceId);
      if (!workspace || workspace.organizationId !== organizationId) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid workspace for this organization',
        } as ApiResponse);
        return;
      }

      // Verify all projects exist and belong to the workspace
      for (const projectId of projectIds) {
        const project = await projectService.getById(projectId);
        if (!project || project.workspaceId !== workspaceId) {
          res.status(400).json({
            success: false,
            error: 'Validation Error',
            message: `Invalid project ${projectId} for this workspace`,
          } as ApiResponse);
          return;
        }
      }

      const taskId = await taskService.createTask(
        organizationId,
        workspaceId,
        projectIds, // ✅ Array of project IDs
        title,
        userId,
        description,
        assigneeId,
        reporterId,
        status,
        priority,
        dueDate,
        estimatedHours,
        tags,
        customFields,
        subtasks,
        dependencies
      );

      res.status(201).json({
        success: true,
        data: { taskId },
        message: 'Task created successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to create task',
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/tasks/{id}:
   *   get:
   *     summary: Get task by ID
   *     tags: [Tasks]
   *     security:
   *       - userAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Task details
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Task'
   *       404:
   *         description: Task not found
   *       403:
   *         description: Forbidden
   */
  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const task = await taskService.getById(id);

      if (!task) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Task not found',
        } as ApiResponse);
        return;
      }

      // Check if user is member of organization
      const isMember = await organizationService.isMember(task.organizationId, userId);
      if (!isMember) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You do not have access to this task',
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: task,
      } as ApiResponse);
    } catch (error) {
      console.error('Error getting task:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to get task',
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/tasks:
   *   get:
   *     summary: Get all tasks (filtered by workspaceId, projectId, or organizationId)
   *     description: Use projectId to query tasks in a specific project (uses array-contains)
   *     tags: [Tasks]
   *     security:
   *       - userAuth: []
   *     parameters:
   *       - in: query
   *         name: workspaceId
   *         schema:
   *           type: string
   *         description: Filter by workspace ID
   *       - in: query
   *         name: projectId
   *         schema:
   *           type: string
   *         description: Filter by project ID (array-contains query)
   *       - in: query
   *         name: organizationId
   *         schema:
   *           type: string
   *         description: Filter by organization ID
   *       - in: query
   *         name: assigneeId
   *         schema:
   *           type: string
   *         description: Filter by assignee ID
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *         description: Filter by status
   *     responses:
   *       200:
   *         description: List of tasks
   *       400:
   *         description: Validation error
   *       403:
   *         description: Forbidden
   */
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { workspaceId, projectId, organizationId, assigneeId, status } = req.query;
      const userId = req.userId;

      let tasks;

      if (projectId && typeof projectId === 'string') {
        // Query by project using array-contains (child-knows-parent)
        const project = await projectService.getById(projectId);
        if (!project) {
          res.status(404).json({
            success: false,
            error: 'Not Found',
            message: 'Project not found',
          } as ApiResponse);
          return;
        }

        const isMember = await organizationService.isMember(project.organizationId, userId);
        if (!isMember) {
          res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: 'You do not have access to this project',
          } as ApiResponse);
          return;
        }

        tasks = await taskService.getTasksByProject(projectId);
      } else if (workspaceId && typeof workspaceId === 'string') {
        const workspace = await workspaceService.getById(workspaceId);
        if (!workspace) {
          res.status(404).json({
            success: false,
            error: 'Not Found',
            message: 'Workspace not found',
          } as ApiResponse);
          return;
        }

        const isMember = await organizationService.isMember(workspace.organizationId, userId);
        if (!isMember) {
          res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: 'You do not have access to this workspace',
          } as ApiResponse);
          return;
        }

        tasks = await taskService.getTasksByWorkspace(workspaceId);
      } else if (assigneeId && typeof assigneeId === 'string') {
        tasks = await taskService.getTasksByAssignee(assigneeId);
      } else if (organizationId && typeof organizationId === 'string') {
        const isMember = await organizationService.isMember(organizationId, userId);
        if (!isMember) {
          res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: 'You do not have access to this organization',
          } as ApiResponse);
          return;
        }

        tasks = await taskService.getTasksByOrganization(organizationId);
      } else {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'workspaceId, projectId, assigneeId, or organizationId query parameter is required',
        } as ApiResponse);
        return;
      }

      // Apply additional filters if provided
      if (status && typeof status === 'string') {
        tasks = tasks.filter(task => task.status === status);
      }

      res.json({
        success: true,
        data: tasks,
      } as ApiResponse);
    } catch (error) {
      console.error('Error getting tasks:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to get tasks',
      } as ApiResponse);
    }
  }
  /**
   * @swagger
   * /api/tasks/{id}:
   *   patch:
   *     summary: Update task
   *     description: Can update projectIds array to add/remove project associations
   *     tags: [Tasks]
   *     security:
   *       - userAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               projectIds:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Update project associations
   *               title:
   *                 type: string
   *               description:
   *                 type: string
   *               assigneeId:
   *                 type: string
   *               reporterId:
   *                 type: string
   *               status:
   *                 type: string
   *                 enum: [todo, in_progress, review, blocked, done, archived]
   *               priority:
   *                 type: string
   *                 enum: [low, medium, high, critical]
   *               dueDate:
   *                 type: string
   *                 format: date-time
   *               estimatedHours:
   *                 type: number
   *               actualHours:
   *                 type: number
   *               tags:
   *                 type: array
   *                 items:
   *                   type: string
   *               customFields:
   *                 type: object
   *               subtasks:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                     title:
   *                       type: string
   *                     completed:
   *                       type: boolean
   *               dependencies:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     taskId:
   *                       type: string
   *                     type:
   *                       type: string
   *                       enum: [blocks, blocked_by, relates_to]
   *     responses:
   *       200:
   *         description: Task updated successfully
   *       404:
   *         description: Task not found
   *       403:
   *         description: Forbidden
   */
  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const updates = req.body as UpdateTaskRequest;

      const task = await taskService.getById(id);
      if (!task) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Task not found',
        } as ApiResponse);
        return;
      }

      // Check if user is member of organization
      const isMember = await organizationService.isMember(task.organizationId, userId);
      if (!isMember) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You do not have access to this task',
        } as ApiResponse);
        return;
      }

      // If updating projectIds, verify all projects exist and belong to workspace
      if (updates.projectIds && Array.isArray(updates.projectIds)) {
        for (const projectId of updates.projectIds) {
          const project = await projectService.getById(projectId);
          if (!project || project.workspaceId !== task.workspaceId) {
            res.status(400).json({
              success: false,
              error: 'Validation Error',
              message: `Invalid project ${projectId} for this workspace`,
            } as ApiResponse);
            return;
          }
        }
      }

      await taskService.update(id, updates, userId);

      res.json({
        success: true,
        message: 'Task updated successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to update task',
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/tasks/{id}:
   *   delete:
   *     summary: Delete task
   *     tags: [Tasks]
   *     security:
   *       - userAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Task deleted successfully
   *       404:
   *         description: Task not found
   *       403:
   *         description: Forbidden
   */
  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const task = await taskService.getById(id);
      if (!task) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Task not found',
        } as ApiResponse);
        return;
      }

      // Check if user is member of organization or task reporter/assignee
      const isMember = await organizationService.isMember(task.organizationId, userId);
      const isReporter = task.reporterId === userId;
      const isAssignee = task.assigneeId === userId;
      
      if (!isMember && !isReporter && !isAssignee) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You do not have permission to delete this task',
        } as ApiResponse);
        return;
      }

      await taskService.delete(id);

      res.json({
        success: true,
        message: 'Task deleted successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to delete task',
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/tasks/{id}/projects/{projectId}:
   *   post:
   *     summary: Add task to project
   *     description: Atomically add a project to the task's projectIds array
   *     tags: [Tasks]
   *     security:
   *       - userAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Task added to project successfully
   *       404:
   *         description: Task or project not found
   *       403:
   *         description: Forbidden
   */
  async addToProject(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id, projectId } = req.params;
      const userId = req.userId;

      const task = await taskService.getById(id);
      if (!task) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Task not found',
        } as ApiResponse);
        return;
      }

      const project = await projectService.getById(projectId);
      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Project not found',
        } as ApiResponse);
        return;
      }

      // Verify project belongs to same workspace
      if (project.workspaceId !== task.workspaceId) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Project must belong to the same workspace as the task',
        } as ApiResponse);
        return;
      }

      // Check if user is member of organization
      const isMember = await organizationService.isMember(task.organizationId, userId);
      if (!isMember) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You do not have access to this task',
        } as ApiResponse);
        return;
      }

      await taskService.addToProject(id, projectId, userId);

      res.json({
        success: true,
        message: 'Task added to project successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Error adding task to project:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to add task to project',
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/tasks/{id}/projects/{projectId}:
   *   delete:
   *     summary: Remove task from project
   *     description: Atomically remove a project from the task's projectIds array
   *     tags: [Tasks]
   *     security:
   *       - userAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Task removed from project successfully
   *       404:
   *         description: Task not found
   *       403:
   *         description: Forbidden
   */
  async removeFromProject(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id, projectId } = req.params;
      const userId = req.userId;

      const task = await taskService.getById(id);
      if (!task) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Task not found',
        } as ApiResponse);
        return;
      }

      // Check if user is member of organization
      const isMember = await organizationService.isMember(task.organizationId, userId);
      if (!isMember) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You do not have access to this task',
        } as ApiResponse);
        return;
      }

      await taskService.removeFromProject(id, projectId, userId);

      res.json({
        success: true,
        message: 'Task removed from project successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Error removing task from project:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to remove task from project',
      } as ApiResponse);
    }
  }
}

export const taskController = new TaskController();