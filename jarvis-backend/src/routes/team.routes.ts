import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { teamController } from '../controllers/team.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Teams
 *   description: Team management endpoints
 */

// Create team
router.post('/', authenticate, (req, res) => teamController.create(req as any, res));

// Get all teams (filtered by workspaceId or organizationId)
router.get('/', authenticate, (req, res) => teamController.getAll(req as any, res));

// Get team by ID
router.get('/:id', authenticate, (req, res) => teamController.getById(req as any, res));

// Update team
router.patch('/:id', authenticate, (req, res) => teamController.update(req as any, res));

// Delete team
router.delete('/:id', authenticate, (req, res) => teamController.delete(req as any, res));

// Add member to team
router.post('/:id/members', authenticate, (req, res) => teamController.addMember(req as any, res));

// Remove member from team
router.delete('/:id/members/:userId', authenticate, (req, res) => teamController.removeMember(req as any, res));

export default router;