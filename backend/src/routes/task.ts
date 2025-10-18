import { Router } from 'express';
import {
  createTask,
  listTasks,
  getTask,
  updateTask,
  deleteTaskById,
  getTaskWithSubtasks,
  addSubtask,
  removeSubtask,
} from '../services/projectManagement';

const router = Router();

function requireUserId(req: any) {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) throw new Error('Unauthorized');
  return userId;
}

/**
 * @swagger
 * /tasks:
 *   post:
 *     tags: [Tasks]
 *     summary: Create a new task
 *     description: Set parentTaskId to create a subtask
 *     security:
 *       - UserAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sectionId
 *               - projectId
 *               - title
 *             properties:
 *               sectionId:
 *                 type: string
 *               projectId:
 *                 type: string
 *               parentTaskId:
 *                 type: string
 *                 description: Optional - if set, this task becomes a subtask
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               assigneeId:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               customFields:
 *                 type: object
 *                 additionalProperties:
 *                   type: string
 *               subtaskIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of existing task IDs to link as subtasks
 *               dependencies:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of task IDs this task depends on
 *     responses:
 *       201:
 *         description: Task created successfully
 */
router.post('/tasks', async (req, res) => {
  try {
    const userId = requireUserId(req);
    const id = await createTask(req.body, userId);
    res.status(201).json({ success: true, id });
  } catch (e: any) {
    res.status(e.message === 'Unauthorized' ? 401 : 400).json({ error: e.message });
  }
});

/**
 * @swagger
 * /tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: List tasks
 *     description: Filter by project, section, assignee, status, or parent task
 *     security:
 *       - UserAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *       - in: query
 *         name: sectionId
 *         schema:
 *           type: string
 *       - in: query
 *         name: assigneeId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [not_started, in_progress, completed]
 *       - in: query
 *         name: parentTaskId
 *         schema:
 *           type: string
 *         description: Filter to get subtasks of a specific task
 *     responses:
 *       200:
 *         description: List of tasks
 */
router.get('/tasks', async (req, res) => {
  try {
    const userId = requireUserId(req);
    const filters: any = {};
    if (req.query.projectId) filters.projectId = String(req.query.projectId);
    if (req.query.sectionId) filters.sectionId = String(req.query.sectionId);
    if (req.query.assigneeId) filters.assigneeId = String(req.query.assigneeId);
    if (req.query.status) filters.status = String(req.query.status);
    if (req.query.parentTaskId) filters.parentTaskId = String(req.query.parentTaskId);
    const items = await listTasks(userId, filters);
    res.json({ items });
  } catch (e: any) {
    res.status(e.message === 'Unauthorized' ? 401 : 400).json({ error: e.message });
  }
});

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     tags: [Tasks]
 *     summary: Get task by ID
 *     description: Use ?expand=subtasks to include all subtasks
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
 *           enum: [subtasks]
 *         description: Expand related entities
 *     responses:
 *       200:
 *         description: Task details
 *       404:
 *         description: Task not found
 */
router.get('/tasks/:id', async (req, res) => {
  try {
    const userId = requireUserId(req);
    const expand = req.query.expand as string;
    
    if (expand === 'subtasks') {
      const item = await getTaskWithSubtasks(req.params.id, userId);
      if (!item) {
        return res.status(404).json({ error: 'NotFound' });
      }
      return res.json({ item });
    } else {
      const item = await getTask(req.params.id, userId);
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
 * /tasks/{id}:
 *   patch:
 *     tags: [Tasks]
 *     summary: Update task
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               assigneeId:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               customFields:
 *                 type: object
 *               subtaskIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               dependencies:
 *                 type: array
 *                 items:
 *                   type: string
 *               status:
 *                 type: string
 *                 enum: [not_started, in_progress, completed]
 *               parentTaskId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Task updated
 */
router.patch('/tasks/:id', async (req, res) => {
  try {
    const userId = requireUserId(req);
    await updateTask(req.params.id, req.body, userId);
    res.json({ success: true });
  } catch (e: any) {
    const code = e.message === 'Unauthorized' ? 401 : e.message === 'Forbidden' ? 403 : e.message === 'NotFound' ? 404 : 400;
    res.status(code).json({ error: e.message });
  }
});

/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     tags: [Tasks]
 *     summary: Delete task and all its subtasks
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
 *         description: Task deleted
 */
router.delete('/tasks/:id', async (req, res) => {
  try {
    const userId = requireUserId(req);
    await deleteTaskById(req.params.id, userId);
    res.json({ success: true });
  } catch (e: any) {
    const code = e.message === 'Unauthorized' ? 401 : e.message === 'Forbidden' ? 403 : 400;
    res.status(code).json({ error: e.message });
  }
});

/**
 * @swagger
 * /tasks/{parentId}/subtasks/{subtaskId}:
 *   post:
 *     tags: [Tasks]
 *     summary: Link an existing task as a subtask to a parent task
 *     security:
 *       - UserAuth: []
 *     parameters:
 *       - in: path
 *         name: parentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: subtaskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Subtask linked successfully
 */
router.post('/tasks/:parentId/subtasks/:subtaskId', async (req, res) => {
  try {
    const userId = requireUserId(req);
    await addSubtask(req.params.parentId, req.params.subtaskId, userId);
    res.json({ success: true });
  } catch (e: any) {
    res.status(e.message === 'Unauthorized' ? 401 : 400).json({ error: e.message });
  }
});

/**
 * @swagger
 * /tasks/{parentId}/subtasks/{subtaskId}:
 *   delete:
 *     tags: [Tasks]
 *     summary: Remove a subtask from its parent task
 *     security:
 *       - UserAuth: []
 *     parameters:
 *       - in: path
 *         name: parentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: subtaskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Subtask unlinked successfully
 */
router.delete('/tasks/:parentId/subtasks/:subtaskId', async (req, res) => {
  try {
    const userId = requireUserId(req);
    await removeSubtask(req.params.parentId, req.params.subtaskId, userId);
    res.json({ success: true });
  } catch (e: any) {
    res.status(e.message === 'Unauthorized' ? 401 : 400).json({ error: e.message });
  }
});

export default router;