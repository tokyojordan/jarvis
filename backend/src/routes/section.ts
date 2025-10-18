import { Router } from 'express';
import {
  createSection,
  listSections,
  getSection,
  updateSection,
  deleteSectionById,
  getSectionWithTasks,
} from '../services/projectManagement';

const router = Router();

function requireUserId(req: any) {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) throw new Error('Unauthorized');
  return userId;
}

/**
 * @swagger
 * /sections:
 *   post:
 *     tags: [Sections]
 *     summary: Create a new section
 *     security:
 *       - UserAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - name
 *             properties:
 *               projectId:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Section created successfully
 */
router.post('/sections', async (req, res) => {
  try {
    const userId = requireUserId(req);
    const id = await createSection(req.body, userId);
    res.status(201).json({ success: true, id });
  } catch (e: any) {
    res.status(e.message === 'Unauthorized' ? 401 : 400).json({ error: e.message });
  }
});

/**
 * @swagger
 * /sections:
 *   get:
 *     tags: [Sections]
 *     summary: List sections
 *     security:
 *       - UserAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: Filter by project ID
 *     responses:
 *       200:
 *         description: List of sections
 */
router.get('/sections', async (req, res) => {
  try {
    const userId = requireUserId(req);
    const filters: any = {};
    if (req.query.projectId) filters.projectId = String(req.query.projectId);
    const items = await listSections(userId, filters);
    res.json({ items });
  } catch (e: any) {
    res.status(e.message === 'Unauthorized' ? 401 : 400).json({ error: e.message });
  }
});

/**
 * @swagger
 * /sections/{id}:
 *   get:
 *     tags: [Sections]
 *     summary: Get section by ID
 *     description: Use ?expand=tasks to include all tasks
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
 *           enum: [tasks]
 *         description: Expand related entities
 *     responses:
 *       200:
 *         description: Section details
 *       404:
 *         description: Section not found
 */
router.get('/sections/:id', async (req, res) => {
  try {
    const userId = requireUserId(req);
    const expand = req.query.expand as string;
    
    if (expand === 'tasks') {
      const item = await getSectionWithTasks(req.params.id, userId);
      if (!item) {
        return res.status(404).json({ error: 'NotFound' });
      }
      return res.json({ item });
    } else {
      const item = await getSection(req.params.id, userId);
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
 * /sections/{id}:
 *   patch:
 *     tags: [Sections]
 *     summary: Update section
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
 *     responses:
 *       200:
 *         description: Section updated
 */
router.patch('/sections/:id', async (req, res) => {
  try {
    const userId = requireUserId(req);
    await updateSection(req.params.id, req.body, userId);
    res.json({ success: true });
  } catch (e: any) {
    const code = e.message === 'Unauthorized' ? 401 : e.message === 'Forbidden' ? 403 : e.message === 'NotFound' ? 404 : 400;
    res.status(code).json({ error: e.message });
  }
});

/**
 * @swagger
 * /sections/{id}:
 *   delete:
 *     tags: [Sections]
 *     summary: Delete section
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
 *         description: Section deleted
 */
router.delete('/sections/:id', async (req, res) => {
  try {
    const userId = requireUserId(req);
    await deleteSectionById(req.params.id, userId);
    res.json({ success: true });
  } catch (e: any) {
    const code = e.message === 'Unauthorized' ? 401 : e.message === 'Forbidden' ? 403 : 400;
    res.status(code).json({ error: e.message });
  }
});

export default router;