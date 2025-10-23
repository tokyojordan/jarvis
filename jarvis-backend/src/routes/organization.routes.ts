import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { organizationController } from '../controllers/organization.controller';

const router = Router();

/**
 * Organization Routes
 * All routes require authentication
 */

// Create organization
router.post('/', authenticate, (req, res) => organizationController.create(req as any, res));

// Get all organizations for current user
router.get('/', authenticate, (req, res) => organizationController.getAll(req as any, res));

// Get organization by ID
router.get('/:id', authenticate, (req, res) => organizationController.getById(req as any, res));

// Update organization
router.patch('/:id', authenticate, (req, res) => organizationController.update(req as any, res));

// Delete organization
router.delete('/:id', authenticate, (req, res) => organizationController.delete(req as any, res));

// Add member to organization
router.post('/:id/members', authenticate, (req, res) => organizationController.addMember(req as any, res));

// Remove member from organization
router.delete('/:id/members/:userId', authenticate, (req, res) => organizationController.removeMember(req as any, res));

export default router;