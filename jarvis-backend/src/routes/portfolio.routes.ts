import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { portfolioController } from '../controllers/portfolio.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Portfolios
 *   description: Portfolio management endpoints
 */

// Create portfolio
router.post('/', authenticate, (req, res) => portfolioController.create(req as any, res));

// Get all portfolios (filtered by workspaceId or organizationId)
router.get('/', authenticate, (req, res) => portfolioController.getAll(req as any, res));

// Get portfolio by ID
router.get('/:id', authenticate, (req, res) => portfolioController.getById(req as any, res));

// Update portfolio
router.patch('/:id', authenticate, (req, res) => portfolioController.update(req as any, res));

// Delete portfolio
router.delete('/:id', authenticate, (req, res) => portfolioController.delete(req as any, res));

export default router;