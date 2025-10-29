// src/controllers/team.controller.ts
import { Request, Response } from 'express';
import { TeamService } from '../services/team.service';
import { Team } from '../types/entities';

const teamService = new TeamService();

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
 *               - memberIds
 *             properties:
 *               organizationId:
 *                 type: string
 *                 description: The ID of the organization the team belongs to
 *               workspaceId:
 *                 type: string
 *                 description: The ID of the workspace the team belongs to
 *               name:
 *                 type: string
 *                 description: The name of the team
 *               description:
 *                 type: string
 *                 description: Optional description of the team
 *               memberIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of user IDs who are members of the team
 *               leaderId:
 *                 type: string
 *                 description: Optional ID of the team leader
 *     responses:
 *       201:
 *         description: Team created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: The ID of the created team
 *       400:
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export class TeamController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      console.log('POST /api/teams - Incoming request body:', JSON.stringify(req.body, null, 2));
      console.log('POST /api/teams - x-user-id:', req.headers['x-user-id']);

      const userId = req.headers['x-user-id'] as string;
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        console.log('POST /api/teams - Validation failed: Invalid x-user-id');
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'x-user-id header is required and must be a non-empty string',
        });
        return;
      }

      const { organizationId, workspaceId, name, description, memberIds, leaderId } = req.body;

      if (!organizationId || typeof organizationId !== 'string' || organizationId.trim() === '') {
        console.log('POST /api/teams - Validation failed: Invalid organizationId');
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'organizationId is required and must be a non-empty string',
        });
        return;
      }
      if (!workspaceId || typeof workspaceId !== 'string' || workspaceId.trim() === '') {
        console.log('POST /api/teams - Validation failed: Invalid workspaceId');
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'workspaceId is required and must be a non-empty string',
        });
        return;
      }
      if (!name || typeof name !== 'string' || name.trim() === '') {
        console.log('POST /api/teams - Validation failed: Invalid name');
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'name is required and must be a non-empty string',
        });
        return;
      }
      if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
        console.log('POST /api/teams - Validation failed: Invalid memberIds');
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'memberIds is required and must be a non-empty array of strings',
        });
        return;
      }
      if (!memberIds.every((id: any) => typeof id === 'string' && id.trim() !== '')) {
        console.log('POST /api/teams - Validation failed: memberIds contains invalid entries');
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'All memberIds must be non-empty strings',
        });
        return;
      }
      if (leaderId && (typeof leaderId !== 'string' || leaderId.trim() === '')) {
        console.log('POST /api/teams - Validation failed: Invalid leaderId');
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'leaderId must be a non-empty string if provided',
        });
        return;
      }

      const teamData: Omit<Team, 'id' | 'createdAt' | 'updatedAt'> = {
        organizationId,
        workspaceId,
        name,
        description: description || '',
        memberIds,
        leaderId: leaderId || memberIds[0],
      };

      console.log('POST /api/teams - teamData to save:', JSON.stringify(teamData, null, 2));

      const teamId = await teamService.create(teamData, userId);
      console.log('POST /api/teams - Created team ID:', teamId);

      res.status(201).json({ success: true, data: { id: teamId } });
    } catch (error) {
      console.error('POST /api/teams - Error creating team:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Something went wrong',
      });
    }
  }

  /**
   * @swagger
   * /api/teams/{id}:
   *   get:
   *     summary: Get a team by ID
   *     tags: [Teams]
   *     security:
   *       - userAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: The team ID
   *     responses:
   *       200:
   *         description: Team details
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/Team'
   *       400:
   *         description: Bad Request
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       404:
   *         description: Not Found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       500:
   *         description: Internal Server Error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const teamId = req.params.id;
      const userId = req.headers['x-user-id'] as string;

      console.log('GET /api/teams/:id - teamId:', teamId, 'userId:', userId);

      if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Team ID is required and must be a non-empty string',
        });
        return;
      }
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'x-user-id header is required and must be a non-empty string',
        });
        return;
      }

      const team = await teamService.getById(teamId);
      if (!team) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Team not found',
        });
        return;
      }

      console.log('GET /api/teams/:id - Retrieved team:', JSON.stringify(team, null, 2));

      res.json({ success: true, data: team });
    } catch (error) {
      console.error('GET /api/teams/:id - Error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Something went wrong',
      });
    }
  }
}

export const teamController = new TeamController();