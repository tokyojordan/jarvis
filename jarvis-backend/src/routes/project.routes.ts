import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { projectController } from '../controllers/project.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: Project management endpoints (supports multiple portfolios via portfolioIds array)
 */

// Create project
router.post('/', authenticate, (req, res) => projectController.create(req as any, res));

// Get all projects (filtered by workspaceId, portfolioId, organizationId, or teamId)
router.get('/', authenticate, (req, res) => projectController.getAll(req as any, res));

// Get project by ID
router.get('/:id', authenticate, (req, res) => projectController.getById(req as any, res));

// Update project
router.patch('/:id', authenticate, (req, res) => projectController.update(req as any, res));

// Delete project
router.delete('/:id', authenticate, (req, res) => projectController.delete(req as any, res));

// Add project to portfolio (atomic array operation)
router.post('/:id/portfolios/:portfolioId', authenticate, (req, res) => projectController.addToPortfolio(req as any, res));

// Remove project from portfolio (atomic array operation)
router.delete('/:id/portfolios/:portfolioId', authenticate, (req, res) => projectController.removeFromPortfolio(req as any, res));

export default router;