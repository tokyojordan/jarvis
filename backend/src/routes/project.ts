import { Router } from 'express';
import {
  createProject,
  listProjects,
  getProject,
  updateProject,
  deleteProjectById,
  getProjectWithSections,
  getProjectWithFullHierarchy,
  calculateProjectCompletion,
} from '../services/projectManagement';

const router = Router();

function requireUserId(req: any) {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) throw new Error('Unauthorized');
  return userId;
}

/**
 * @swagger
 * /projects:
 *   post:
 *     tags: [Projects]
 *     summary: Create a new project
 *     security:
 *       - UserAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - portfolioId
 *               - name
 *             properties:
 *               portfolioId:
 *                 type: string
 *               teamId:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Project created successfully
 */
router.post('/projects', async (req, res) => {
  try {
    const userId = requireUserId(req);
    const id = await createProject(req.body, userId);
    res.status(201).json({ success: true, id });
  } catch (e: any) {
    res.status(e.message === 'Unauthorized' ? 401 : 400).json({ error: e.message });
  }
});

/**
 * @swagger
 * /projects:
 *   get:
 *     tags: [Projects]
 *     summary: List projects
 *     security:
 *       - UserAuth: []
 *     parameters:
 *       - in: query
 *         name: portfolioId
 *         schema:
 *           type: string
 *       - in: query
 *         name: teamId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of projects
 */
router.get('/projects', async (req, res) => {
  try {
    const userId = requireUserId(req);
    const filters: any = {};
    if (req.query.portfolioId) filters.portfolioId = String(req.query.portfolioId);
    if (req.query.teamId) filters.teamId = String(req.query.teamId);
    const items = await listProjects(userId, filters);
    res.json({ items });
  } catch (e: any) {
    res.status(e.message === 'Unauthorized' ? 401 : 400).json({ error: e.message });
  }
});

/**
 * @swagger
 * /projects/{id}:
 *   get:
 *     tags: [Projects]
 *     summary: Get project by ID
 *     description: Use ?expand=sections or ?expand=full to include related data
 *     security:
 *       - UserAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: expand
 *         schema:
 *           type: string
 *           enum: [sections, full]
 *         description: sections = include sections, full = include sections with tasks
 *     responses:
 *       200:
 *         description: Project details
 *       404:
 *         description: Project not found
 */
router.get('/projects/:id', async (req, res) => {
  try {
    const userId = requireUserId(req);
    const expand = req.query.expand as string;
    
    if (expand === 'full') {
      const item = await getProjectWithFullHierarchy(req.params.id, userId);
      if (!item) {
        return res.status(404).json({ error: 'NotFound' });
      }
      return res.json({ item });
    } else if (expand === 'sections') {
      const item = await getProjectWithSections(req.params.id, userId);
      if (!item) {
        return res.status(404).json({ error: 'NotFound' });
      }
      return res.json({ item });
    } else {
      const item = await getProject(req.params.id, userId);
      if (!item) {
        return res.status(404).json({ error: 'NotFound' });
      }
      return res.json({ item });
    }
  } catch (e: any) {
    return res.status(e.message === 'Unauthorized' ? 401 : 400).json({ error: e.message });
  }
});

/**
 * @swagger
 * /projects/{id}:
 *   patch:
 *     tags: [Projects]
 *     summary: Update project
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
 *               status:
 *                 type: string
 *                 enum: [not_started, in_progress, completed]
 *               completionPercentage:
 *                 type: number
 *               teamId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Project updated
 */
router.patch('/projects/:id', async (req, res) => {
  try {
    const userId = requireUserId(req);
    await updateProject(req.params.id, req.body, userId);
    res.json({ success: true });
  } catch (e: any) {
    const code = e.message === 'Unauthorized' ? 401 : e.message === 'Forbidden' ? 403 : e.message === 'NotFound' ? 404 : 400;
    res.status(code).json({ error: e.message });
  }
});

/**
 * @swagger
 * /projects/{id}:
 *   delete:
 *     tags: [Projects]
 *     summary: Delete project
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
 *         description: Project deleted
 */
router.delete('/projects/:id', async (req, res) => {
  try {
    const userId = requireUserId(req);
    await deleteProjectById(req.params.id, userId);
    res.json({ success: true });
  } catch (e: any) {
    const code = e.message === 'Unauthorized' ? 401 : e.message === 'Forbidden' ? 403 : 400;
    res.status(code).json({ error: e.message });
  }
});

/**
 * @swagger
 * /projects/{id}/calculate-completion:
 *   post:
 *     tags: [Projects]
 *     summary: Calculate and update project completion percentage
 *     description: Calculates completion based on task status
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
 *         description: Completion calculated
 */
router.post('/projects/:id/calculate-completion', async (req, res) => {
  try {
    const userId = requireUserId(req);
    const completionPercentage = await calculateProjectCompletion(req.params.id, userId);
    res.json({ success: true, completionPercentage });
  } catch (e: any) {
    const code = e.message === 'Unauthorized' ? 401 : e.message === 'NotFound' ? 404 : 400;
    res.status(code).json({ error: e.message });
  }
});

export default router;