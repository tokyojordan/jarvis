import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { taskController } from '../controllers/task.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Task management endpoints (supports multiple projects via projectIds array)
 */

// Create task
router.post('/', authenticate, (req, res) => taskController.create(req as any, res));

// Get all tasks (filtered by workspaceId, projectId, organizationId, assigneeId, or status)
router.get('/', authenticate, (req, res) => taskController.getAll(req as any, res));

// Get task by ID
router.get('/:id', authenticate, (req, res) => taskController.getById(req as any, res));

// Update task
router.patch('/:id', authenticate, (req, res) => taskController.update(req as any, res));

// Delete task
router.delete('/:id', authenticate, (req, res) => taskController.delete(req as any, res));

// Add task to project (atomic array operation)
router.post('/:id/projects/:projectId', authenticate, (req, res) => taskController.addToProject(req as any, res));

// Remove task from project (atomic array operation)
router.delete('/:id/projects/:projectId', authenticate, (req, res) => taskController.removeFromProject(req as any, res));

export default router;