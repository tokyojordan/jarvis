import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { workspaceController } from '../controllers/workspace.controller';

const router = Router();

// Create workspace
router.post('/', authenticate, (req, res) => workspaceController.create(req as any, res));

// Get all workspaces (requires organizationId query param)
router.get('/', authenticate, (req, res) => workspaceController.getAll(req as any, res));

// Get workspace by ID
router.get('/:id', authenticate, (req, res) => workspaceController.getById(req as any, res));

// Update workspace
router.patch('/:id', authenticate, (req, res) => workspaceController.update(req as any, res));

// Delete workspace
router.delete('/:id', authenticate, (req, res) => workspaceController.delete(req as any, res));

export default router;