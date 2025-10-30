// src/controllers/portfolio.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { portfolioService, workspaceService, organizationService } from '../services';
import { ApiResponse } from '../types';

/**
 * Portfolio Controller (v2.0 - Child knows parent)
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
   *       - userAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - workspaceId
   *               - name
   *             properties:
   *               workspaceId:
   *                 type: string
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               color:
   *                 type: string
   *               icon:
   *                 type: string
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
      const { workspaceId, name, description, color, icon } = req.body;
      const userId = req.userId;

      if (!workspaceId || !name) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'workspaceId and name are required',
        } as ApiResponse);
        return;
      }

      // Verify workspace exists and user has access
      const workspace = await workspaceService.getById(workspaceId);
      if (!workspace) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Workspace not found',
        } as ApiResponse);
        return;
      }

      // Check organization membership
      const isMember = await organizationService.isMember(workspace.organizationId, userId);
      if (!isMember) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You do not have access to this workspace',
        } as ApiResponse);
        return;
      }

      const portfolioId = await portfolioService.createPortfolio(
        workspaceId,
        name,
        userId,
        { description, color, icon }
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
   *       - userAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Portfolio details
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

      // Traverse: Portfolio -> Workspace -> Organization
      const workspace = await workspaceService.getById(portfolio.workspaceId);
      if (!workspace) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Associated workspace not found',
        } as ApiResponse);
        return;
      }

      const isMember = await organizationService.isMember(workspace.organizationId, userId);
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
   *     summary: Get all portfolios (filtered by workspaceId)
   *     tags: [Portfolios]
   *     security:
   *       - userAuth: []
   *     parameters:
   *       - in: query
   *         name: workspaceId
   *         required: true
   *         schema:
   *           type: string
   *         description: Filter by workspace ID
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
      const { workspaceId } = req.query;
      const userId = req.userId;

      if (!workspaceId || typeof workspaceId !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'workspaceId query parameter is required',
        } as ApiResponse);
        return;
      }

      // Verify workspace exists and user has access
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

      const portfolios = await portfolioService.getPortfoliosByWorkspace(workspaceId);

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
   *       - userAuth: []
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
   *               icon:
   *                 type: string
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
      const updates = req.body;

      const portfolio = await portfolioService.getById(id);
      if (!portfolio) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Portfolio not found',
        } as ApiResponse);
        return;
      }

      // Traverse to check permissions
      const workspace = await workspaceService.getById(portfolio.workspaceId);
      if (!workspace) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Associated workspace not found',
        } as ApiResponse);
        return;
      }

      const isOrgOwner = await organizationService.isOwner(workspace.organizationId, userId);
      if (!isOrgOwner) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Only organization owners can update portfolios',
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
   *       - userAuth: []
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

      // Traverse to check permissions
      const workspace = await workspaceService.getById(portfolio.workspaceId);
      if (!workspace) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Associated workspace not found',
        } as ApiResponse);
        return;
      }

      const isOwner = await organizationService.isOwner(workspace.organizationId, userId);
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