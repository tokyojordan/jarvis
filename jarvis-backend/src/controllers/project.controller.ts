import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { projectService, organizationService, workspaceService, portfolioService } from '../services';
import { CreateProjectRequest, UpdateProjectRequest, ApiResponse } from '../types';

/**
 * Project Controller
 * Handles HTTP requests for project operations
 * CRITICAL: Projects can belong to MULTIPLE portfolios (portfolioIds array)
 */
export class ProjectController {
  /**
   * @swagger
   * /api/projects:
   *   post:
   *     summary: Create a new project
   *     description: Projects can belong to multiple portfolios using portfolioIds array (child-knows-parent architecture)
   *     tags: [Projects]
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
   *               - workspaceId
   *               - portfolioIds
   *               - name
   *               - ownerId
   *             properties:
   *               organizationId:
   *                 type: string
   *               workspaceId:
   *                 type: string
   *               portfolioIds:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Array of portfolio IDs (child-knows-parent)
   *               teamId:
   *                 type: string
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               ownerId:
   *                 type: string
   *               memberIds:
   *                 type: array
   *                 items:
   *                   type: string
   *               startDate:
   *                 type: string
   *                 format: date-time
   *               endDate:
   *                 type: string
   *                 format: date-time
   *               status:
   *                 type: string
   *                 enum: [planning, active, on_hold, completed, archived]
   *               priority:
   *                 type: string
   *                 enum: [low, medium, high, critical]
   *               tags:
   *                 type: array
   *                 items:
   *                   type: string
   *               customFields:
   *                 type: object
   *     responses:
   *       201:
   *         description: Project created successfully
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
        portfolioIds,
        teamId,
        name, 
        description, 
        ownerId,
        memberIds,
        startDate,
        endDate,
        status,
        priority,
        tags,
        customFields
      } = req.body as CreateProjectRequest;
      const userId = req.userId;

      if (!organizationId || !workspaceId || !portfolioIds || !Array.isArray(portfolioIds) || portfolioIds.length === 0 || !name || !ownerId) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'organizationId, workspaceId, portfolioIds (array), name, and ownerId are required',
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

      // Verify all portfolios exist and belong to the workspace
      for (const portfolioId of portfolioIds) {
        const portfolio = await portfolioService.getById(portfolioId);
        if (!portfolio || portfolio.workspaceId !== workspaceId) {
          res.status(400).json({
            success: false,
            error: 'Validation Error',
            message: `Invalid portfolio ${portfolioId} for this workspace`,
          } as ApiResponse);
          return;
        }
      }

      const projectId = await projectService.createProject(
        organizationId,
        workspaceId,
        portfolioIds, // ✅ Array of portfolio IDs
        name,
        ownerId,
        userId,
        teamId,
        description,
        memberIds,
        startDate,
        endDate,
        status,
        priority,
        tags,
        customFields
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
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Project details
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Project'
   *       404:
   *         description: Project not found
   *       403:
   *         description: Forbidden
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

      // Check if user is member of organization
      const isMember = await organizationService.isMember(project.organizationId, userId);
      if (!isMember) {
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
   *     summary: Get all projects (filtered by workspaceId, portfolioId, or organizationId)
   *     description: Use portfolioId to query projects in a specific portfolio (uses array-contains)
   *     tags: [Projects]
   *     security:
   *       - userAuth: []
   *     parameters:
   *       - in: query
   *         name: workspaceId
   *         schema:
   *           type: string
   *         description: Filter by workspace ID
   *       - in: query
   *         name: portfolioId
   *         schema:
   *           type: string
   *         description: Filter by portfolio ID (array-contains query)
   *       - in: query
   *         name: organizationId
   *         schema:
   *           type: string
   *         description: Filter by organization ID
   *       - in: query
   *         name: teamId
   *         schema:
   *           type: string
   *         description: Filter by team ID
   *     responses:
   *       200:
   *         description: List of projects
   *       400:
   *         description: Validation error
   *       403:
   *         description: Forbidden
   */
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { workspaceId, portfolioId, organizationId, teamId } = req.query;
      const userId = req.userId;

      let projects;

      if (portfolioId && typeof portfolioId === 'string') {
        // Query by portfolio using array-contains (child-knows-parent)
        const portfolio = await portfolioService.getById(portfolioId);
        if (!portfolio) {
          res.status(404).json({
            success: false,
            error: 'Not Found',
            message: 'Portfolio not found',
          } as ApiResponse);
          return;
        }

        const isMember = await organizationService.isMember(portfolio.organizationId, userId);
        if (!isMember) {
          res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: 'You do not have access to this portfolio',
          } as ApiResponse);
          return;
        }

        projects = await projectService.getProjectsByPortfolio(portfolioId);
      } else if (workspaceId && typeof workspaceId === 'string') {
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

        projects = await projectService.getProjectsByWorkspace(workspaceId);
      } else if (teamId && typeof teamId === 'string') {
        projects = await projectService.getProjectsByTeam(teamId);
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

        projects = await projectService.getProjectsByOrganization(organizationId);
      } else {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'workspaceId, portfolioId, teamId, or organizationId query parameter is required',
        } as ApiResponse);
        return;
      }

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
   *     description: Can update portfolioIds array to add/remove portfolio associations
   *     tags: [Projects]
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
   *               portfolioIds:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Update portfolio associations
   *               teamId:
   *                 type: string
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               ownerId:
   *                 type: string
   *               memberIds:
   *                 type: array
   *                 items:
   *                   type: string
   *               startDate:
   *                 type: string
   *                 format: date-time
   *               endDate:
   *                 type: string
   *                 format: date-time
   *               status:
   *                 type: string
   *                 enum: [planning, active, on_hold, completed, archived]
   *               priority:
   *                 type: string
   *                 enum: [low, medium, high, critical]
   *               tags:
   *                 type: array
   *                 items:
   *                   type: string
   *               customFields:
   *                 type: object
   *     responses:
   *       200:
   *         description: Project updated successfully
   *       404:
   *         description: Project not found
   *       403:
   *         description: Forbidden
   */
  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const updates = req.body as UpdateProjectRequest;

      const project = await projectService.getById(id);
      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Project not found',
        } as ApiResponse);
        return;
      }

      // Check if user is project owner or org owner
      const isProjectOwner = project.ownerId === userId;
      const isOrgOwner = await organizationService.isOwner(project.organizationId, userId);

      if (!isProjectOwner && !isOrgOwner) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Only project owner or organization owner can update project',
        } as ApiResponse);
        return;
      }

      // If updating portfolioIds, verify all portfolios exist and belong to workspace
      if (updates.portfolioIds && Array.isArray(updates.portfolioIds)) {
        for (const portfolioId of updates.portfolioIds) {
          const portfolio = await portfolioService.getById(portfolioId);
          if (!portfolio || portfolio.workspaceId !== project.workspaceId) {
            res.status(400).json({
              success: false,
              error: 'Validation Error',
              message: `Invalid portfolio ${portfolioId} for this workspace`,
            } as ApiResponse);
            return;
          }
        }
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
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Project deleted successfully
   *       404:
   *         description: Project not found
   *       403:
   *         description: Forbidden
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

      // Check if user is owner of organization
      const isOwner = await organizationService.isOwner(project.organizationId, userId);
      if (!isOwner) {
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
   *     description: Atomically add a portfolio to the project's portfolioIds array
   *     tags: [Projects]
   *     security:
   *       - userAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: portfolioId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Project added to portfolio successfully
   *       404:
   *         description: Project or portfolio not found
   *       403:
   *         description: Forbidden
   */
  async addToPortfolio(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id, portfolioId } = req.params;
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

      const portfolio = await portfolioService.getById(portfolioId);
      if (!portfolio) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Portfolio not found',
        } as ApiResponse);
        return;
      }

      // Verify portfolio belongs to same workspace
      if (portfolio.workspaceId !== project.workspaceId) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Portfolio must belong to the same workspace as the project',
        } as ApiResponse);
        return;
      }

      // Check if user is project owner or org owner
      const isProjectOwner = project.ownerId === userId;
      const isOrgOwner = await organizationService.isOwner(project.organizationId, userId);

      if (!isProjectOwner && !isOrgOwner) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Only project owner or organization owner can add to portfolio',
        } as ApiResponse);
        return;
      }

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
   *     description: Atomically remove a portfolio from the project's portfolioIds array
   *     tags: [Projects]
   *     security:
   *       - userAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: portfolioId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Project removed from portfolio successfully
   *       404:
   *         description: Project not found
   *       403:
   *         description: Forbidden
   */
  async removeFromPortfolio(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id, portfolioId } = req.params;
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

      // Check if user is project owner or org owner
      const isProjectOwner = project.ownerId === userId;
      const isOrgOwner = await organizationService.isOwner(project.organizationId, userId);

      if (!isProjectOwner && !isOrgOwner) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Only project owner or organization owner can remove from portfolio',
        } as ApiResponse);
        return;
      }

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