import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { organizationService } from '../services';
import { CreateOrganizationRequest, UpdateOrganizationRequest, ApiResponse } from '../types';

/**
 * Organization Controller
 * Handles HTTP requests for organization operations
 */
export class OrganizationController {
  /**
   * Create a new organization
   * POST /api/organizations
   */
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, description, settings } = req.body as CreateOrganizationRequest;
      const userId = req.userId;

      if (!name) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Organization name is required',
        } as ApiResponse);
        return;
      }

      const organizationId = await organizationService.createOrganization(
        name,
        userId,
        description,
        settings
      );

      res.status(201).json({
        success: true,
        data: { organizationId },
        message: 'Organization created successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Error creating organization:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to create organization',
      } as ApiResponse);
    }
  }

  /**
   * Get organization by ID
   * GET /api/organizations/:id
   */
  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const organization = await organizationService.getById(id);

      if (!organization) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Organization not found',
        } as ApiResponse);
        return;
      }

      // Check if user is a member
      const isMember = await organizationService.isMember(id, userId);
      if (!isMember) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You do not have access to this organization',
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: organization,
      } as ApiResponse);
    } catch (error) {
      console.error('Error getting organization:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to get organization',
      } as ApiResponse);
    }
  }

  /**
   * Get all organizations for current user
   * GET /api/organizations
   */
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;

      const organizations = await organizationService.getOrganizationsByMember(userId);

      res.json({
        success: true,
        data: organizations,
      } as ApiResponse);
    } catch (error) {
      console.error('Error getting organizations:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to get organizations',
      } as ApiResponse);
    }
  }

  /**
   * Update organization
   * PATCH /api/organizations/:id
   */
  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const updates = req.body as UpdateOrganizationRequest;

      // Check if user is owner
      const isOwner = await organizationService.isOwner(id, userId);
      if (!isOwner) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Only the organization owner can update it',
        } as ApiResponse);
        return;
      }

      await organizationService.update(id, updates, userId);

      res.json({
        success: true,
        message: 'Organization updated successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Error updating organization:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to update organization',
      } as ApiResponse);
    }
  }

  /**
   * Delete organization
   * DELETE /api/organizations/:id
   */
  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;

      // Check if user is owner
      const isOwner = await organizationService.isOwner(id, userId);
      if (!isOwner) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Only the organization owner can delete it',
        } as ApiResponse);
        return;
      }

      await organizationService.delete(id);

      res.json({
        success: true,
        message: 'Organization deleted successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Error deleting organization:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to delete organization',
      } as ApiResponse);
    }
  }

  /**
   * Add member to organization
   * POST /api/organizations/:id/members
   */
  async addMember(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { userId: memberUserId } = req.body;
      const userId = req.userId;

      if (!memberUserId) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'userId is required',
        } as ApiResponse);
        return;
      }

      // Check if current user is owner
      const isOwner = await organizationService.isOwner(id, userId);
      if (!isOwner) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Only the organization owner can add members',
        } as ApiResponse);
        return;
      }

      await organizationService.addMember(id, memberUserId, userId);

      res.json({
        success: true,
        message: 'Member added successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Error adding member:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to add member',
      } as ApiResponse);
    }
  }

  /**
   * Remove member from organization
   * DELETE /api/organizations/:id/members/:userId
   */
  async removeMember(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id, userId: memberUserId } = req.params;
      const userId = req.userId;

      // Check if current user is owner
      const isOwner = await organizationService.isOwner(id, userId);
      if (!isOwner) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Only the organization owner can remove members',
        } as ApiResponse);
        return;
      }

      // Prevent owner from removing themselves
      if (memberUserId === userId) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Owner cannot remove themselves from the organization',
        } as ApiResponse);
        return;
      }

      await organizationService.removeMember(id, memberUserId, userId);

      res.json({
        success: true,
        message: 'Member removed successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Error removing member:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to remove member',
      } as ApiResponse);
    }
  }
}

export const organizationController = new OrganizationController();