import { Router } from 'express';
import {
  createOrganization,
  listOrganizations,
  getOrganization,
  updateOrganization,
  deleteOrganizationById,
} from '../services/projectManagement';

const router = Router();

function requireUserId(req: any) {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) throw new Error('Unauthorized');
  return userId;
}

/**
 * @swagger
 * /organizations:
 *   post:
 *     tags: [Organizations]
 *     summary: Create a new organization
 *     security:
 *       - UserAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Acme Corp
 *     responses:
 *       201:
 *         description: Organization created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 id:
 *                   type: string
 */
router.post('/organizations', async (req, res) => {
  try {
    const userId = requireUserId(req);
    const id = await createOrganization(req.body, userId);
    res.status(201).json({ success: true, id });
  } catch (e: any) {
    res.status(e.message === 'Unauthorized' ? 401 : 400).json({ error: e.message });
  }
});

/**
 * @swagger
 * /organizations:
 *   get:
 *     tags: [Organizations]
 *     summary: List all organizations
 *     security:
 *       - UserAuth: []
 *     responses:
 *       200:
 *         description: List of organizations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Organization'
 */
router.get('/organizations', async (req, res) => {
  try {
    const userId = requireUserId(req);
    const items = await listOrganizations(userId);
    res.json({ items });
  } catch (e: any) {
    res.status(e.message === 'Unauthorized' ? 401 : 400).json({ error: e.message });
  }
});

/**
 * @swagger
 * /organizations/{id}:
 *   get:
 *     tags: [Organizations]
 *     summary: Get organization by ID
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
 *         description: Organization details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 item:
 *                   $ref: '#/components/schemas/Organization'
 *       404:
 *         description: Organization not found
 */
router.get('/organizations/:id', async (req, res) => {
  try {
    const userId = requireUserId(req);
    const item = await getOrganization(req.params.id, userId);
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
 * /organizations/{id}:
 *   patch:
 *     tags: [Organizations]
 *     summary: Update organization
 *     security:
 *       - UserAuth: []
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
 *     responses:
 *       200:
 *         description: Organization updated
 */
router.patch('/organizations/:id', async (req, res) => {
  try {
    const userId = requireUserId(req);
    await updateOrganization(req.params.id, req.body, userId);
    res.json({ success: true });
  } catch (e: any) {
    const code = e.message === 'Unauthorized' ? 401 : e.message === 'Forbidden' ? 403 : e.message === 'NotFound' ? 404 : 400;
    res.status(code).json({ error: e.message });
  }
});

/**
 * @swagger
 * /organizations/{id}:
 *   delete:
 *     tags: [Organizations]
 *     summary: Delete organization
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
 *         description: Organization deleted
 */
router.delete('/organizations/:id', async (req, res) => {
  try {
    const userId = requireUserId(req);
    await deleteOrganizationById(req.params.id, userId);
    res.json({ success: true });
  } catch (e: any) {
    const code = e.message === 'Unauthorized' ? 401 : e.message === 'Forbidden' ? 403 : 400;
    res.status(code).json({ error: e.message });
  }
});

export default router;