import { Router } from 'express';
import {
  createTeam,
  listTeams,
  getTeam,
  updateTeam,
  deleteTeamById,
} from '../services/projectManagement';

const router = Router();

function requireUserId(req: any) {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) throw new Error('Unauthorized');
  return userId;
}

/**
 * @swagger
 * /teams:
 *   post:
 *     tags: [Teams]
 *     summary: Create a new team
 *     security:
 *       - UserAuth: []
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
 *               memberIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Team created successfully
 */
router.post('/teams', async (req, res) => {
  try {
    const userId = requireUserId(req);
    const id = await createTeam(req.body, userId);
    res.status(201).json({ success: true, id });
  } catch (e: any) {
    res.status(e.message === 'Unauthorized' ? 401 : 400).json({ error: e.message });
  }
});

/**
 * @swagger
 * /teams:
 *   get:
 *     tags: [Teams]
 *     summary: List teams
 *     security:
 *       - UserAuth: []
 *     parameters:
 *       - in: query
 *         name: workspaceId
 *         schema:
 *           type: string
 *         description: Filter by workspace ID
 *     responses:
 *       200:
 *         description: List of teams
 */
router.get('/teams', async (req, res) => {
  try {
    const userId = requireUserId(req);
    const filters: any = {};
    if (req.query.workspaceId) filters.workspaceId = String(req.query.workspaceId);
    const items = await listTeams(userId, filters);
    res.json({ items });
  } catch (e: any) {
    res.status(e.message === 'Unauthorized' ? 401 : 400).json({ error: e.message });
  }
});

/**
 * @swagger
 * /teams/{id}:
 *   get:
 *     tags: [Teams]
 *     summary: Get team by ID
 *     security:
 *       - UserAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Team details
 *       404:
 *         description: Team not found
 */
router.get('/teams/:id', async (req, res) => {
  try {
    const userId = requireUserId(req);
    const item = await getTeam(req.params.id, userId);
    if (!item) {
      return res.status(404).json({ error: 'NotFound' });
    }
    return res.json({ item });
  } catch (e: any) {
    return res.status(e.message === 'Unauthorized' ? 401 : 400).json({ error: e.message });
  }
});

/**
 * @swagger
 * /teams/{id}:
 *   patch:
 *     tags: [Teams]
 *     summary: Update team
 *     security:
 *       - UserAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
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
 *     responses:
 *       200:
 *         description: Team updated
 */
router.patch('/teams/:id', async (req, res) => {
  try {
    const userId = requireUserId(req);
    await updateTeam(req.params.id, req.body, userId);
    res.json({ success: true });
  } catch (e: any) {
    const code = e.message === 'Unauthorized' ? 401 : e.message === 'Forbidden' ? 403 : e.message === 'NotFound' ? 404 : 400;
    res.status(code).json({ error: e.message });
  }
});

/**
 * @swagger
 * /teams/{id}:
 *   delete:
 *     tags: [Teams]
 *     summary: Delete team
 *     security:
 *       - UserAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Team deleted
 */
router.delete('/teams/:id', async (req, res) => {
  try {
    const userId = requireUserId(req);
    await deleteTeamById(req.params.id, userId);
    res.json({ success: true });
  } catch (e: any) {
    const code = e.message === 'Unauthorized' ? 401 : e.message === 'Forbidden' ? 403 : 400;
    res.status(code).json({ error: e.message });
  }
});

export default router;