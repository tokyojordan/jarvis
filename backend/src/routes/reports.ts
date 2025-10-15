import { Router } from 'express';
import { 
  generateWeeklyReport, 
  generateProjectStatus, 
  sendTaskDigest 
} from '../services/n8nIntegration';

const router = Router();

/**
 * @swagger
 * /api/reports/weekly:
 *   post:
 *     summary: Generate weekly activity report
 *     description: Generate and email a weekly activity report with meetings, tasks, and project stats
 *     tags: [Reports]
 *     security:
 *       - UserAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipients
 *             properties:
 *               recipients:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: email
 *                 description: Email addresses to send the report to
 *                 example: ["manager@company.com", "team@company.com"]
 *     responses:
 *       200:
 *         description: Report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request - recipients array required
 *       401:
 *         description: Unauthorized
 */
router.post('/weekly', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { recipients } = req.body;

    if (!recipients || !Array.isArray(recipients)) {
      return res.status(400).json({ error: 'Recipients array required' });
    }

    console.log(`📊 Generating weekly report for user ${userId}`);
    await generateWeeklyReport(userId, recipients);
    
    return res.json({
      success: true,
      message: 'Weekly report generated and sent',
    });
  } catch (error: any) {
    console.error('Weekly report error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/reports/project-status/{projectId}:
 *   post:
 *     summary: Generate project status report
 *     description: Generate and email a detailed project status report with tasks, meetings, and health metrics
 *     tags: [Reports]
 *     security:
 *       - UserAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipients
 *             properties:
 *               recipients:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: email
 *                 description: Email addresses to send the report to
 *                 example: ["stakeholder@company.com"]
 *     responses:
 *       200:
 *         description: Report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/project-status/:projectId', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { projectId } = req.params;
    const { recipients } = req.body;

    if (!recipients || !Array.isArray(recipients)) {
      return res.status(400).json({ error: 'Recipients array required' });
    }

    console.log(`📈 Generating project status for ${projectId}`);
    await generateProjectStatus(projectId, recipients);
    
    return res.json({
      success: true,
      message: 'Project status report sent',
    });
  } catch (error: any) {
    console.error('Project status error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/reports/task-digest:
 *   post:
 *     summary: Send daily task digest
 *     description: Send an email digest of today's tasks, overdue tasks, and upcoming tasks
 *     tags: [Reports]
 *     security:
 *       - UserAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address to send the digest to
 *                 example: user@company.com
 *     responses:
 *       200:
 *         description: Task digest sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request - email required
 *       401:
 *         description: Unauthorized
 */
router.post('/task-digest', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    console.log(`✅ Sending task digest to ${email}`);
    await sendTaskDigest(userId, email);
    
    return res.json({
      success: true,
      message: 'Task digest sent',
    });
  } catch (error: any) {
    console.error('Task digest error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;