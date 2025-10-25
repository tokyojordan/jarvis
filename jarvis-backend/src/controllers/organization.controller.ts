import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { organizationService } from '../services';
import { CreateOrganizationRequest, UpdateOrganizationRequest, ApiResponse } from '../types';

/**
 * @swagger
 * tags:
 *   name: Organizations
 *   description: Organization management endpoints
 */

/**
 * Organization Controller
 * Handles HTTP requests for organization operations
 */
export class OrganizationController {
  /**
   * @swagger
   * /api/organizations:
   *   post:
   *     summary: Create a new organization
   *     description: Creates a new organization with the authenticated user as the owner
   *     tags: [Organizations]
   *     security:
   *       - userAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *             properties:
   *               name:
   *                 type: string
   *                 description: Organization name
   *                 example: "Acme Corporation"
   *               description:
   *                 type: string
   *                 description: Organization description
   *                 example: "A leading software development company"
   *               settings:
   *                 type: object
   *                 description: Organization settings
   *                 example: { "timezone": "America/Los_Angeles", "locale": "en-US" }
   *     responses:
   *       201:
   *         description: Organization created successfully
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
   *                     organizationId:
   *                       type: string
   *                       example: "org-123abc"
   *                 message:
   *                   type: string
   *                   example: "Organization created successfully"
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Internal server error
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
   * @swagger
   * /api/organizations/{id}:
   *   get:
   *     summary: Get organization by ID
   *     description: Retrieves a specific organization by its ID. User must be a member.
   *     tags: [Organizations]
   *     security:
   *       - userAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Organization ID
   *         example: "org-123abc"
   *     responses:
   *       200:
   *         description: Organization retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Organization'
   *       403:
   *         description: User is not a member of this organization
   *       404:
   *         description: Organization not found
   *       500:
   *         description: Internal server error
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
   * @swagger
   * /api/organizations:
   *   get:
   *     summary: Get all organizations for current user
   *     description: Retrieves all organizations where the authenticated user is a member
   *     tags: [Organizations]
   *     security:
   *       - userAuth: []
   *     responses:
   *       200:
   *         description: Organizations retrieved successfully
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
   *                     $ref: '#/components/schemas/Organization'
   *       500:
   *         description: Internal server error
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
   * @swagger
   * /api/organizations/{id}:
   *   patch:
   *     summary: Update organization
   *     description: Updates organization details. Only the owner can update.
   *     tags: [Organizations]
   *     security:
   *       - userAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Organization ID
   *         example: "org-123abc"
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *                 example: "Acme Corp Updated"
   *               description:
   *                 type: string
   *                 example: "Updated description"
   *               settings:
   *                 type: object
   *                 example: { "timezone": "America/New_York" }
   *     responses:
   *       200:
   *         description: Organization updated successfully
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
   *                   example: "Organization updated successfully"
   *       403:
   *         description: Only the owner can update the organization
   *       500:
   *         description: Internal server error
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
   * @swagger
   * /api/organizations/{id}:
   *   delete:
   *     summary: Delete organization
   *     description: Deletes an organization. Only the owner can delete. All related data will be removed.
   *     tags: [Organizations]
   *     security:
   *       - userAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Organization ID
   *         example: "org-123abc"
   *     responses:
   *       200:
   *         description: Organization deleted successfully
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
   *                   example: "Organization deleted successfully"
   *       403:
   *         description: Only the owner can delete the organization
   *       500:
   *         description: Internal server error
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
   * @swagger
   * /api/organizations/{id}/members:
   *   post:
   *     summary: Add member to organization
   *     description: Adds a new member to the organization. Only the owner can add members.
   *     tags: [Organizations]
   *     security:
   *       - userAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Organization ID
   *         example: "org-123abc"
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - userId
   *             properties:
   *               userId:
   *                 type: string
   *                 description: User ID to add as member
   *                 example: "user-456def"
   *     responses:
   *       200:
   *         description: Member added successfully
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
   *                   example: "Member added successfully"
   *       400:
   *         description: Validation error
   *       403:
   *         description: Only the owner can add members
   *       500:
   *         description: Internal server error
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
   * @swagger
   * /api/organizations/{id}/members/{userId}:
   *   delete:
   *     summary: Remove member from organization
   *     description: Removes a member from the organization. Only the owner can remove members. Owner cannot remove themselves.
   *     tags: [Organizations]
   *     security:
   *       - userAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Organization ID
   *         example: "org-123abc"
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID to remove
   *         example: "user-456def"
   *     responses:
   *       200:
   *         description: Member removed successfully
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
   *                   example: "Member removed successfully"
   *       400:
   *         description: Cannot remove owner
   *       403:
   *         description: Only the owner can remove members
   *       500:
   *         description: Internal server error
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