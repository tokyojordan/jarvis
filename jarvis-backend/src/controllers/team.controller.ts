import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { teamService, organizationService, workspaceService } from '../services';
import { CreateTeamRequest, UpdateTeamRequest, ApiResponse } from '../types';

/**
 * Team Controller
 * Handles HTTP requests for team operations
 */
export class TeamController {
  /**
   * @swagger
   * /api/teams:
   *   post:
   *     summary: Create a new team
   *     tags: [Teams]
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
   *               - name
   *             properties:
   *               organizationId:
   *                 type: string
   *               workspaceId:
   *                 type: string
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               memberIds:
   *                 type: array
   *                 items:
   *                   type: string
   *               leaderId:
   *                 type: string
   *     responses:
   *       201:
   *         description: Team created successfully
   *       400:
   *         description: Validation error
   *       403:
   *         description: Forbidden
   */
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { organizationId, workspaceId, name, description, memberIds, leaderId } = 
        req.body as CreateTeamRequest;
      const userId = req.userId;

      if (!organizationId || !workspaceId || !name) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'organizationId, workspaceId, and name are required',
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

      const teamId = await teamService.createTeam(
        organizationId,
        workspaceId,
        name,
        userId,
        description,
        memberIds,
        leaderId
      );

      res.status(201).json({
        success: true,
        data: { teamId },
        message: 'Team created successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Error creating team:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to create team',
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/teams/{id}:
   *   get:
   *     summary: Get team by ID
   *     tags: [Teams]
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
   *         description: Team details
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Team'
   *       404:
   *         description: Team not found
   *       403:
   *         description: Forbidden
   */
  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const team = await teamService.getById(id);

      if (!team) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Team not found',
        } as ApiResponse);
        return;
      }

      // Check if user is member of organization
      const isMember = await organizationService.isMember(team.organizationId, userId);
      if (!isMember) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You do not have access to this team',
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: team,
      } as ApiResponse);
    } catch (error) {
      console.error('Error getting team:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to get team',
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/teams:
   *   get:
   *     summary: Get all teams (filtered by workspaceId or organizationId)
   *     tags: [Teams]
   *     security:
   *       - userAuth: []
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
   *         description: List of teams
   *       400:
   *         description: Validation error
   *       403:
   *         description: Forbidden
   */
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { workspaceId, organizationId } = req.query;
      const userId = req.userId;

      let teams;

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

        teams = await teamService.getTeamsByWorkspace(workspaceId);
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

        teams = await teamService.getTeamsByOrganization(organizationId);
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
        data: teams,
      } as ApiResponse);
    } catch (error) {
      console.error('Error getting teams:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to get teams',
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/teams/{id}:
   *   patch:
   *     summary: Update team
   *     tags: [Teams]
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
   *               memberIds:
   *                 type: array
   *                 items:
   *                   type: string
   *               leaderId:
   *                 type: string
   *     responses:
   *       200:
   *         description: Team updated successfully
   *       404:
   *         description: Team not found
   *       403:
   *         description: Forbidden
   */
  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const updates = req.body as UpdateTeamRequest;

      const team = await teamService.getById(id);
      if (!team) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Team not found',
        } as ApiResponse);
        return;
      }

      // Check if user is member of organization
      const isMember = await organizationService.isMember(team.organizationId, userId);
      if (!isMember) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You do not have access to this team',
        } as ApiResponse);
        return;
      }

      await teamService.update(id, updates, userId);

      res.json({
        success: true,
        message: 'Team updated successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Error updating team:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to update team',
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/teams/{id}:
   *   delete:
   *     summary: Delete team
   *     tags: [Teams]
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
   *         description: Team deleted successfully
   *       404:
   *         description: Team not found
   *       403:
   *         description: Forbidden
   */
  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const team = await teamService.getById(id);
      if (!team) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Team not found',
        } as ApiResponse);
        return;
      }

      // Check if user is owner of organization
      const isOwner = await organizationService.isOwner(team.organizationId, userId);
      if (!isOwner) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Only organization owners can delete teams',
        } as ApiResponse);
        return;
      }

      await teamService.delete(id);

      res.json({
        success: true,
        message: 'Team deleted successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Error deleting team:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to delete team',
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/teams/{id}/members:
   *   post:
   *     summary: Add member to team
   *     tags: [Teams]
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
   *             required:
   *               - userId
   *             properties:
   *               userId:
   *                 type: string
   *     responses:
   *       200:
   *         description: Member added successfully
   *       404:
   *         description: Team not found
   *       403:
   *         description: Forbidden
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

      const team = await teamService.getById(id);
      if (!team) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Team not found',
        } as ApiResponse);
        return;
      }

      // Check if current user is team leader or org owner
      const isLeader = await teamService.isLeader(id, userId);
      const isOwner = await organizationService.isOwner(team.organizationId, userId);
      
      if (!isLeader && !isOwner) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Only team leaders or organization owners can add members',
        } as ApiResponse);
        return;
      }

      await teamService.addMember(id, memberUserId, userId);

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
   * /api/teams/{id}/members/{userId}:
   *   delete:
   *     summary: Remove member from team
   *     tags: [Teams]
   *     security:
   *       - userAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Member removed successfully
   *       404:
   *         description: Team not found
   *       403:
   *         description: Forbidden
   */
  async removeMember(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id, userId: memberUserId } = req.params;
      const userId = req.userId;

      const team = await teamService.getById(id);
      if (!team) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Team not found',
        } as ApiResponse);
        return;
      }

      // Check if current user is team leader or org owner
      const isLeader = await teamService.isLeader(id, userId);
      const isOwner = await organizationService.isOwner(team.organizationId, userId);
      
      if (!isLeader && !isOwner) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Only team leaders or organization owners can remove members',
        } as ApiResponse);
        return;
      }

      await teamService.removeMember(id, memberUserId, userId);

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

export const teamController = new TeamController();