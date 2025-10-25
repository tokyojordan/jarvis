import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { portfolioService, organizationService, workspaceService } from '../services';
import { CreatePortfolioRequest, UpdatePortfolioRequest, ApiResponse } from '../types';

/**
 * Portfolio Controller
 * Handles HTTP requests for portfolio operations
 */
export class PortfolioController {
  /**
   * @swagger
   * /api/portfolios:
   *   post:
   *     summary: Create a new portfolio
   *     tags: [Portfolios]
   *     security:
   *       - UserIdHeader: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - organizationId
   *               - workspaceId
   *               - name
   *               - ownerId
   *             properties:
   *               organizationId:
   *                 type: string
   *               workspaceId:
   *                 type: string
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               color:
   *                 type: string
   *               ownerId:
   *                 type: string
   *               startDate:
   *                 type: string
   *                 format: date-time
   *               endDate:
   *                 type: string
   *                 format: date-time
   *               status:
   *                 type: string
   *                 enum: [planning, active, on_hold, completed, archived]
   *               goals:
   *                 type: array
   *                 items:
   *                   type: string
   *     responses:
   *       201:
   *         description: Portfolio created successfully
   *       400:
   *         description: Validation error
   *       403:
   *         description: Forbidden
   */
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { 
        organizationId, 
        workspaceId, 
        name, 
        description, 
        color, 
        ownerId,
        startDate,
        endDate,
        status,
        goals
      } = req.body as CreatePortfolioRequest;
      const userId = req.userId;

      if (!organizationId || !workspaceId || !name || !ownerId) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'organizationId, workspaceId, name, and ownerId are required',
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

      // Verify workspace belongs to organization
      const workspace = await workspaceService.getById(workspaceId);
      if (!workspace || workspace.organizationId !== organizationId) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid workspace for this organization',
        } as ApiResponse);
        return;
      }

      const portfolioId = await portfolioService.createPortfolio(
        organizationId,
        workspaceId,
        name,
        ownerId,
        userId,
        description,
        color,
        startDate,
        endDate,
        status,
        goals
      );

      res.status(201).json({
        success: true,
        data: { portfolioId },
        message: 'Portfolio created successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Error creating portfolio:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to create portfolio',
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/portfolios/{id}:
   *   get:
   *     summary: Get portfolio by ID
   *     tags: [Portfolios]
   *     security:
   *       - UserIdHeader: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Portfolio details
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Portfolio'
   *       404:
   *         description: Portfolio not found
   *       403:
   *         description: Forbidden
   */
  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const portfolio = await portfolioService.getById(id);

      if (!portfolio) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Portfolio not found',
        } as ApiResponse);
        return;
      }

      // Check if user is member of organization
      const isMember = await organizationService.isMember(portfolio.organizationId, userId);
      if (!isMember) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You do not have access to this portfolio',
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: portfolio,
      } as ApiResponse);
    } catch (error) {
      console.error('Error getting portfolio:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to get portfolio',
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/portfolios:
   *   get:
   *     summary: Get all portfolios (filtered by workspaceId or organizationId)
   *     tags: [Portfolios]
   *     security:
   *       - UserIdHeader: []
   *     parameters:
   *       - in: query
   *         name: workspaceId
   *         schema:
   *           type: string
   *         description: Filter by workspace ID
   *       - in: query
   *         name: organizationId
   *         schema:
   *           type: string
   *         description: Filter by organization ID
   *     responses:
   *       200:
   *         description: List of portfolios
   *       400:
   *         description: Validation error
   *       403:
   *         description: Forbidden
   */
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { workspaceId, organizationId } = req.query;
      const userId = req.userId;

      let portfolios;

      if (workspaceId && typeof workspaceId === 'string') {
        // Get workspace to verify organization membership
        const workspace = await workspaceService.getById(workspaceId);
        if (!workspace) {
          res.status(404).json({
            success: false,
            error: 'Not Found',
            message: 'Workspace not found',
          } as ApiResponse);
          return;
        }

        const isMember = await organizationService.isMember(workspace.organizationId, userId);
        if (!isMember) {
          res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: 'You do not have access to this workspace',
          } as ApiResponse);
          return;
        }

        portfolios = await portfolioService.getPortfoliosByWorkspace(workspaceId);
      } else if (organizationId && typeof organizationId === 'string') {
        const isMember = await organizationService.isMember(organizationId, userId);
        if (!isMember) {
          res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: 'You do not have access to this organization',
          } as ApiResponse);
          return;
        }

        portfolios = await portfolioService.getPortfoliosByOrganization(organizationId);
      } else {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'workspaceId or organizationId query parameter is required',
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: portfolios,
      } as ApiResponse);
    } catch (error) {
      console.error('Error getting portfolios:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to get portfolios',
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/portfolios/{id}:
   *   patch:
   *     summary: Update portfolio
   *     tags: [Portfolios]
   *     security:
   *       - UserIdHeader: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               color:
   *                 type: string
   *               ownerId:
   *                 type: string
   *               startDate:
   *                 type: string
   *                 format: date-time
   *               endDate:
   *                 type: string
   *                 format: date-time
   *               status:
   *                 type: string
   *                 enum: [planning, active, on_hold, completed, archived]
   *               goals:
   *                 type: array
   *                 items:
   *                   type: string
   *               metrics:
   *                 type: object
   *     responses:
   *       200:
   *         description: Portfolio updated successfully
   *       404:
   *         description: Portfolio not found
   *       403:
   *         description: Forbidden
   */
  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const updates = req.body as UpdatePortfolioRequest;

      const portfolio = await portfolioService.getById(id);
      if (!portfolio) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Portfolio not found',
        } as ApiResponse);
        return;
      }

      // Check if user is portfolio owner or org owner
      const isPortfolioOwner = portfolio.ownerId === userId;
      const isOrgOwner = await organizationService.isOwner(portfolio.organizationId, userId);

      if (!isPortfolioOwner && !isOrgOwner) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Only portfolio owner or organization owner can update portfolio',
        } as ApiResponse);
        return;
      }

      await portfolioService.update(id, updates, userId);

      res.json({
        success: true,
        message: 'Portfolio updated successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Error updating portfolio:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to update portfolio',
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/portfolios/{id}:
   *   delete:
   *     summary: Delete portfolio
   *     tags: [Portfolios]
   *     security:
   *       - UserIdHeader: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Portfolio deleted successfully
   *       404:
   *         description: Portfolio not found
   *       403:
   *         description: Forbidden
   */
  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const portfolio = await portfolioService.getById(id);
      if (!portfolio) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Portfolio not found',
        } as ApiResponse);
        return;
      }

      // Check if user is owner of organization
      const isOwner = await organizationService.isOwner(portfolio.organizationId, userId);
      if (!isOwner) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Only organization owners can delete portfolios',
        } as ApiResponse);
        return;
      }

      await portfolioService.delete(id);

      res.json({
        success: true,
        message: 'Portfolio deleted successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Error deleting portfolio:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to delete portfolio',
      } as ApiResponse);
    }
  }
}

export const portfolioController = new PortfolioController();