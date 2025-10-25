import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { workspaceService, organizationService } from '../services';
import { CreateWorkspaceRequest, UpdateWorkspaceRequest, ApiResponse } from '../types';

/**
 * @swagger
 * tags:
 *   name: Workspaces
 *   description: Workspace management endpoints (workspaces belong to organizations)
 */

/**
 * Workspace Controller
 */
export class WorkspaceController {
  /**
   * @swagger
   * /api/workspaces:
   *   post:
   *     summary: Create a new workspace
   *     description: Creates a new workspace within an organization. User must be a member of the organization.
   *     tags: [Workspaces]
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
   *               - name
   *             properties:
   *               organizationId:
   *                 type: string
   *                 description: Parent organization ID
   *                 example: "org-123abc"
   *               name:
   *                 type: string
   *                 description: Workspace name
   *                 example: "Engineering Workspace"
   *               description:
   *                 type: string
   *                 description: Workspace description
   *                 example: "All engineering teams and projects"
   *               color:
   *                 type: string
   *                 description: Color code for UI
   *                 example: "#4F46E5"
   *               icon:
   *                 type: string
   *                 description: Material Icon name (browse at https://fonts.google.com/icons)
   *                 example: "rocket_launch"
   *     responses:
   *       201:
   *         description: Workspace created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     workspaceId:
   *                       type: string
   *                       example: "workspace-456def"
   *                 message:
   *                   type: string
   *                   example: "Workspace created successfully"
   *       400:
   *         description: Validation error
   *       403:
   *         description: User is not a member of the organization
   *       500:
   *         description: Internal server error
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
   * @swagger
   * /api/workspaces/{id}:
   *   get:
   *     summary: Get workspace by ID
   *     description: Retrieves a specific workspace by its ID. User must be a member of the parent organization.
   *     tags: [Workspaces]
   *     security:
   *       - userAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Workspace ID
   *         example: "workspace-456def"
   *     responses:
   *       200:
   *         description: Workspace retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Workspace'
   *       403:
   *         description: User does not have access to this workspace
   *       404:
   *         description: Workspace not found
   *       500:
   *         description: Internal server error
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
   * @swagger
   * /api/workspaces:
   *   get:
   *     summary: Get all workspaces in an organization
   *     description: Retrieves all workspaces for a specific organization. User must be a member of the organization.
   *     tags: [Workspaces]
   *     security:
   *       - userAuth: []
   *     parameters:
   *       - in: query
   *         name: organizationId
   *         required: true
   *         schema:
   *           type: string
   *         description: Organization ID to filter workspaces
   *         example: "org-123abc"
   *     responses:
   *       200:
   *         description: Workspaces retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Workspace'
   *       400:
   *         description: organizationId query parameter is required
   *       403:
   *         description: User does not have access to this organization
   *       500:
   *         description: Internal server error
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
   * @swagger
   * /api/workspaces/{id}:
   *   patch:
   *     summary: Update workspace
   *     description: Updates workspace details. User must be a member of the parent organization.
   *     tags: [Workspaces]
   *     security:
   *       - userAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Workspace ID
   *         example: "workspace-456def"
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *                 example: "Engineering Workspace Updated"
   *               description:
   *                 type: string
   *                 example: "Updated description"
   *               color:
   *                 type: string
   *                 example: "#10B981"
   *               icon:
   *                 type: string
   *                 description: Material Icon name
   *                 example: "bolt"
   *     responses:
   *       200:
   *         description: Workspace updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Workspace updated successfully"
   *       403:
   *         description: User does not have access to this workspace
   *       404:
   *         description: Workspace not found
   *       500:
   *         description: Internal server error
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
   * @swagger
   * /api/workspaces/{id}:
   *   delete:
   *     summary: Delete workspace
   *     description: Deletes a workspace and all related data (teams, portfolios, projects, tasks). Only organization owners can delete workspaces.
   *     tags: [Workspaces]
   *     security:
   *       - userAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Workspace ID
   *         example: "workspace-456def"
   *     responses:
   *       200:
   *         description: Workspace deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Workspace deleted successfully"
   *       403:
   *         description: Only organization owners can delete workspaces
   *       404:
   *         description: Workspace not found
   *       500:
   *         description: Internal server error
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