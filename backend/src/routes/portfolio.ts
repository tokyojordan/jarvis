import { Router } from 'express';
import {
  createPortfolio,
  listPortfolios,
  getPortfolio,
  updatePortfolio,
  deletePortfolioById,
  calculatePortfolioStatus,
  getPortfolioWithProjects,
} from '../services/projectManagement';

const router = Router();

function requireUserId(req: any) {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) throw new Error('Unauthorized');
  return userId;
}

/**
 * @swagger
 * /portfolios:
 *   post:
 *     tags: [Portfolios]
 *     summary: Create a new portfolio
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
 *     responses:
 *       201:
 *         description: Portfolio created successfully
 */
router.post('/portfolios', async (req, res) => {
  try {
    const userId = requireUserId(req);
    const id = await createPortfolio(req.body, userId);
    res.status(201).json({ success: true, id });
  } catch (e: any) {
    res.status(e.message === 'Unauthorized' ? 401 : 400).json({ error: e.message });
  }
});

/**
 * @swagger
 * /portfolios:
 *   get:
 *     tags: [Portfolios]
 *     summary: List portfolios
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
 *         description: List of portfolios
 */
router.get('/portfolios', async (req, res) => {
  try {
    const userId = requireUserId(req);
    const filters: any = {};
    if (req.query.workspaceId) filters.workspaceId = String(req.query.workspaceId);
    const items = await listPortfolios(userId, filters);
    res.json({ items });
  } catch (e: any) {
    res.status(e.message === 'Unauthorized' ? 401 : 400).json({ error: e.message });
  }
});

/**
 * @swagger
 * /portfolios/{id}:
 *   get:
 *     tags: [Portfolios]
 *     summary: Get portfolio by ID
 *     description: Use ?expand=projects to include all projects
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
 *           enum: [projects]
 *         description: Expand related entities
 *     responses:
 *       200:
 *         description: Portfolio details
 *       404:
 *         description: Portfolio not found
 */
router.get('/portfolios/:id', async (req, res) => {
  try {
    const userId = requireUserId(req);
    const expand = req.query.expand as string;
    
    if (expand === 'projects') {
      const item = await getPortfolioWithProjects(req.params.id, userId);
      if (!item) {
        return res.status(404).json({ error: 'NotFound' });
      }
      return res.json({ item });
    } else {
      const item = await getPortfolio(req.params.id, userId);
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
 * /portfolios/{id}:
 *   patch:
 *     tags: [Portfolios]
 *     summary: Update portfolio
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
 *     responses:
 *       200:
 *         description: Portfolio updated
 */
router.patch('/portfolios/:id', async (req, res) => {
  try {
    const userId = requireUserId(req);
    await updatePortfolio(req.params.id, req.body, userId);
    res.json({ success: true });
  } catch (e: any) {
    const code = e.message === 'Unauthorized' ? 401 : e.message === 'Forbidden' ? 403 : e.message === 'NotFound' ? 404 : 400;
    res.status(code).json({ error: e.message });
  }
});

/**
 * @swagger
 * /portfolios/{id}:
 *   delete:
 *     tags: [Portfolios]
 *     summary: Delete portfolio
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
 *         description: Portfolio deleted
 */
router.delete('/portfolios/:id', async (req, res) => {
  try {
    const userId = requireUserId(req);
    await deletePortfolioById(req.params.id, userId);
    res.json({ success: true });
  } catch (e: any) {
    const code = e.message === 'Unauthorized' ? 401 : e.message === 'Forbidden' ? 403 : 400;
    res.status(code).json({ error: e.message });
  }
});

/**
 * @swagger
 * /portfolios/{id}/rollup:
 *   post:
 *     tags: [Portfolios]
 *     summary: Calculate and store portfolio roll-up status
 *     description: Calculates completion percentage across all projects and tasks
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
 *         description: Roll-up calculated
 */
router.post('/portfolios/:id/rollup', async (req, res) => {
  try {
    const userId = requireUserId(req);
    const status = await calculatePortfolioStatus(req.params.id, userId);
    res.json({ success: true, status });
  } catch (e: any) {
    const code = e.message === 'Unauthorized' ? 401 : e.message === 'NotFound' ? 404 : 400;
    res.status(code).json({ error: e.message });
  }
});

export default router;