// src/controllers/project.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { projectService, portfolioService, workspaceService, organizationService } from '../services';
import { ApiResponse } from '../types';

/**
 * Project Controller (v2.0 - Child knows parent)
 * Handles HTTP requests for project operations
 */
export class ProjectController {
  /**
   * @swagger
   * /api/projects:
   *   post:
   *     summary: Create a new project
   *     tags: [Projects]
   *     security:
   *       - userAuth: []
   */
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { portfolioIds, name, description, color, icon, status } = req.body;
      const userId = req.userId;

      // Validate required fields
      if (!portfolioIds || !Array.isArray(portfolioIds) || portfolioIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'portfolioIds must be a non-empty array',
        } as ApiResponse);
        return;
      }

      if (!name) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'name is required',
        } as ApiResponse);
        return;
      }

      // Verify all portfolios exist and user has access
      for (const portfolioId of portfolioIds) {
        console.log(`Checking access for portfolio: ${portfolioId}`);
        
        const portfolio = await portfolioService.getById(portfolioId);
        console.log(`Portfolio found:`, portfolio ? 'YES' : 'NO');
        
        if (!portfolio) {
          res.status(404).json({
            success: false,
            error: 'Not Found',
            message: `Portfolio ${portfolioId} not found`,
          } as ApiResponse);
          return;
        }

        // Traverse: Portfolio -> Workspace -> Organization
        console.log(`Looking for workspace: ${portfolio.workspaceId}`);
        const workspace = await workspaceService.getById(portfolio.workspaceId);
        console.log(`Workspace found:`, workspace ? 'YES' : 'NO', workspace);
        
        if (!workspace) {
          res.status(404).json({
            success: false,
            error: 'Not Found',
            message: 'Associated workspace not found',
          } as ApiResponse);
          return;
        }

        console.log(`Checking membership in org: ${workspace.organizationId} for user: ${userId}`);
        const isMember = await organizationService.isMember(workspace.organizationId, userId);
        console.log(`Is member:`, isMember);
        
        if (!isMember) {
          res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: 'You do not have access to this portfolio',
          } as ApiResponse);
          return;
        }
      }

      const projectId = await projectService.createProject(
        portfolioIds,
        name,
        userId,
        { description, color, icon, status }
      );

      res.status(201).json({
        success: true,
        data: { projectId },
        message: 'Project created successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to create project',
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/projects/{id}:
   *   get:
   *     summary: Get project by ID
   *     tags: [Projects]
   *     security:
   *       - userAuth: []
   */
  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const project = await projectService.getById(id);
      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Project not found',
        } as ApiResponse);
        return;
      }

      // Check access through any of the portfolios
      let hasAccess = false;
      for (const portfolioId of project.portfolioIds) {
        const portfolio = await portfolioService.getById(portfolioId);
        if (portfolio) {
          const workspace = await workspaceService.getById(portfolio.workspaceId);
          if (workspace) {
            const isMember = await organizationService.isMember(workspace.organizationId, userId);
            if (isMember) {
              hasAccess = true;
              break;
            }
          }
        }
      }

      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You do not have access to this project',
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: project,
      } as ApiResponse);
    } catch (error) {
      console.error('Error getting project:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to get project',
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/projects:
   *   get:
   *     summary: Get all projects (filtered by portfolioId)
   *     tags: [Projects]
   *     security:
   *       - userAuth: []
   */
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { portfolioId } = req.query;
      const userId = req.userId;

      if (!portfolioId || typeof portfolioId !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'portfolioId query parameter is required',
        } as ApiResponse);
        return;
      }

      // Verify portfolio exists and user has access
      const portfolio = await portfolioService.getById(portfolioId);
      if (!portfolio) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Portfolio not found',
        } as ApiResponse);
        return;
      }

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

      const projects = await projectService.getProjectsByPortfolio(portfolioId);

      res.json({
        success: true,
        data: projects,
      } as ApiResponse);
    } catch (error) {
      console.error('Error getting projects:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to get projects',
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/projects/{id}:
   *   patch:
   *     summary: Update project
   *     tags: [Projects]
   *     security:
   *       - userAuth: []
   */
  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const updates = req.body;

      const project = await projectService.getById(id);
      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Project not found',
        } as ApiResponse);
        return;
      }

      // Check if user has access (through any portfolio)
      let isOrgOwner = false;
      for (const portfolioId of project.portfolioIds) {
        const portfolio = await portfolioService.getById(portfolioId);
        if (portfolio) {
          const workspace = await workspaceService.getById(portfolio.workspaceId);
          if (workspace) {
            isOrgOwner = await organizationService.isOwner(workspace.organizationId, userId);
            if (isOrgOwner) break;
          }
        }
      }

      if (!isOrgOwner) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Only organization owners can update projects',
        } as ApiResponse);
        return;
      }

      await projectService.update(id, updates, userId);

      res.json({
        success: true,
        message: 'Project updated successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to update project',
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/projects/{id}:
   *   delete:
   *     summary: Delete project
   *     tags: [Projects]
   *     security:
   *       - userAuth: []
   */
  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const project = await projectService.getById(id);
      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Project not found',
        } as ApiResponse);
        return;
      }

      // Check if user is org owner (through any portfolio)
      let isOrgOwner = false;
      for (const portfolioId of project.portfolioIds) {
        const portfolio = await portfolioService.getById(portfolioId);
        if (portfolio) {
          const workspace = await workspaceService.getById(portfolio.workspaceId);
          if (workspace) {
            isOrgOwner = await organizationService.isOwner(workspace.organizationId, userId);
            if (isOrgOwner) break;
          }
        }
      }

      if (!isOrgOwner) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Only organization owners can delete projects',
        } as ApiResponse);
        return;
      }

      await projectService.delete(id);

      res.json({
        success: true,
        message: 'Project deleted successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to delete project',
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/projects/{id}/portfolios/{portfolioId}:
   *   post:
   *     summary: Add project to portfolio
   *     tags: [Projects]
   *     security:
   *       - userAuth: []
   */
  async addToPortfolio(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id, portfolioId } = req.params;
      const userId = req.userId;

      await projectService.addToPortfolio(id, portfolioId, userId);

      res.json({
        success: true,
        message: 'Project added to portfolio successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Error adding project to portfolio:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to add project to portfolio',
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/projects/{id}/portfolios/{portfolioId}:
   *   delete:
   *     summary: Remove project from portfolio
   *     tags: [Projects]
   *     security:
   *       - userAuth: []
   */
  async removeFromPortfolio(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id, portfolioId } = req.params;
      const userId = req.userId;

      await projectService.removeFromPortfolio(id, portfolioId, userId);

      res.json({
        success: true,
        message: 'Project removed from portfolio successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Error removing project from portfolio:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to remove project from portfolio',
      } as ApiResponse);
    }
  }
}

export const projectController = new ProjectController();