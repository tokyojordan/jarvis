import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { workspaceService, organizationService } from '../services';
import { CreateWorkspaceRequest, UpdateWorkspaceRequest, ApiResponse } from '../types';

/**
 * Workspace Controller
 */
export class WorkspaceController {
  /**
   * Create a new workspace
   * POST /api/workspaces
   */
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { organizationId, name, description, color, icon } = req.body as CreateWorkspaceRequest;
      const userId = req.userId;

      if (!organizationId || !name) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'organizationId and name are required',
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

      const workspaceId = await workspaceService.createWorkspace(
        organizationId,
        name,
        userId,
        description,
        color,
        icon
      );

      res.status(201).json({
        success: true,
        data: { workspaceId },
        message: 'Workspace created successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Error creating workspace:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to create workspace',
      } as ApiResponse);
    }
  }

  /**
   * Get workspace by ID
   * GET /api/workspaces/:id
   */
  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const workspace = await workspaceService.getById(id);

      if (!workspace) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Workspace not found',
        } as ApiResponse);
        return;
      }

      // Check if user is member of organization
      const isMember = await organizationService.isMember(workspace.organizationId, userId);
      if (!isMember) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You do not have access to this workspace',
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: workspace,
      } as ApiResponse);
    } catch (error) {
      console.error('Error getting workspace:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to get workspace',
      } as ApiResponse);
    }
  }

  /**
   * Get all workspaces in an organization
   * GET /api/workspaces?organizationId=xxx
   */
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.query;
      const userId = req.userId;

      if (!organizationId || typeof organizationId !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'organizationId query parameter is required',
        } as ApiResponse);
        return;
      }

      // Check if user is member of organization
      const isMember = await organizationService.isMember(organizationId, userId);
      if (!isMember) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You do not have access to this organization',
        } as ApiResponse);
        return;
      }

      const workspaces = await workspaceService.getWorkspacesByOrganization(organizationId);

      res.json({
        success: true,
        data: workspaces,
      } as ApiResponse);
    } catch (error) {
      console.error('Error getting workspaces:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to get workspaces',
      } as ApiResponse);
    }
  }

  /**
   * Update workspace
   * PATCH /api/workspaces/:id
   */
  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const updates = req.body as UpdateWorkspaceRequest;

      const workspace = await workspaceService.getById(id);
      if (!workspace) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Workspace not found',
        } as ApiResponse);
        return;
      }

      // Check if user is member of organization
      const isMember = await organizationService.isMember(workspace.organizationId, userId);
      if (!isMember) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You do not have access to this workspace',
        } as ApiResponse);
        return;
      }

      await workspaceService.updateWorkspace(id, updates, userId);

      res.json({
        success: true,
        message: 'Workspace updated successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Error updating workspace:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to update workspace',
      } as ApiResponse);
    }
  }

  /**
   * Delete workspace
   * DELETE /api/workspaces/:id
   */
  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const workspace = await workspaceService.getById(id);
      if (!workspace) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Workspace not found',
        } as ApiResponse);
        return;
      }

      // Check if user is owner of organization
      const isOwner = await organizationService.isOwner(workspace.organizationId, userId);
      if (!isOwner) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Only organization owners can delete workspaces',
        } as ApiResponse);
        return;
      }

      await workspaceService.delete(id);

      res.json({
        success: true,
        message: 'Workspace deleted successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Error deleting workspace:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to delete workspace',
      } as ApiResponse);
    }
  }
}

export const workspaceController = new WorkspaceController();