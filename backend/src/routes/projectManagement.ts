import { Router } from 'express';

import {
  // orgs
  createOrganization, listOrganizations, getOrganization, updateOrganization, deleteOrganizationById,
  // workspaces
  createWorkspace, listWorkspaces, getWorkspace, updateWorkspace, deleteWorkspaceById,
  // teams
  createTeam, listTeams, getTeam, updateTeam, deleteTeamById,
  // portfolios
  createPortfolio, listPortfolios, getPortfolio, updatePortfolio, deletePortfolioById, 
  calculatePortfolioStatus, getPortfolioWithProjects,
  // projects
  createProject, listProjects, getProject, updateProject, deleteProjectById,
  getProjectWithSections, getProjectWithFullHierarchy, calculateProjectCompletion,
  // sections
  createSection, listSections, getSection, updateSection, deleteSectionById,
  getSectionWithTasks,
  // tasks (subtasks are just tasks with parentTaskId)
  createTask, listTasks, getTask, updateTask, deleteTaskById, getTaskWithSubtasks,
  addSubtask, removeSubtask,
} from '../services/projectManagement';

const router = Router();

// simple auth extractor
function requireUserId(req: any) {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) throw new Error('Unauthorized');
  return userId;
}

/** ---------- Organizations ---------- */
router.post('/organizations', async (req, res) => {
  try {
    const userId = requireUserId(req);
    const id = await createOrganization(req.body, userId);
    res.status(201).json({ success: true, id });
  } catch (e: any) {
    res.status(e.message === 'Unauthorized' ? 401 : 400).json({ error: e.message });
  }
});

router.get('/organizations', async (req, res) => {
  try {
    const userId = requireUserId(req);
    const items = await listOrganizations(userId);
    res.json({ items });
  } catch (e: any) {
    res.status(e.message === 'Unauthorized' ? 401 : 400).json({ error: e.message });
  }
});

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

/** ---------- Workspaces ---------- */
router.post('/workspaces', async (req, res) => {
  try {
    const userId = requireUserId(req);
    const id = await createWorkspace(req.body, userId);
    res.status(201).json({ success: true, id });
  } catch (e: any) {
    res.status(e.message === 'Unauthorized' ? 401 : 400).json({ error: e.message });
  }
});

router.get('/workspaces', async (req, res) => {
  try {
    const userId = requireUserId(req);
    const filters: any = {};
    if (req.query.organizationId) filters.organizationId = String(req.query.organizationId);
    const items = await listWorkspaces(userId, filters);
    res.json({ items });
  } catch (e: any) {
    res.status(e.message === 'Unauthorized' ? 401 : 400).json({ error: e.message });
  }
});

router.get('/workspaces/:id', async (req, res) => {
  try {
    const userId = requireUserId(req);
    const item = await getWorkspace(req.params.id, userId);
    if (!item) {
      return res.status(404).json({ error: 'NotFound' });
    }
    return res.json({ item });
  } catch (e: any) {
    return res.status(e.message === 'Unauthorized' ? 401 : 400).json({ error: e.message });
  }
});

router.patch('/workspaces/:id', async (req, res) => {
  try {
    const userId = requireUserId(req);
    await updateWorkspace(req.params.id, req.body, userId);
    res.json({ success: true });
  } catch (e: any) {
    const code = e.message === 'Unauthorized' ? 401 : e.message === 'Forbidden' ? 403 : e.message === 'NotFound' ? 404 : 400;
    res.status(code).json({ error: e.message });
  }
});

router.delete('/workspaces/:id', async (req, res) => {
  try {
    const userId = requireUserId(req);
    await deleteWorkspaceById(req.params.id, userId);
    res.json({ success: true });
  } catch (e: any) {
    const code = e.message === 'Unauthorized' ? 401 : e.message === 'Forbidden' ? 403 : 400;
    res.status(code).json({ error: e.message });
  }
});

/** ---------- Teams ---------- */
router.post('/teams', async (req, res) => {
  try {
    const userId = requireUserId(req);
    const id = await createTeam(req.body, userId);
    res.status(201).json({ success: true, id });
  } catch (e: any) {
    res.status(e.message === 'Unauthorized' ? 401 : 400).json({ error: e.message });
  }
});

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

/** ---------- Portfolios ---------- */
router.post('/portfolios', async (req, res) => {
  try {
    const userId = requireUserId(req);
    const id = await createPortfolio(req.body, userId);
    res.status(201).json({ success: true, id });
  } catch (e: any) {
    res.status(e.message === 'Unauthorized' ? 401 : 400).json({ error: e.message });
  }
});

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

router.get('/portfolios/:id', async (req, res) => {
  try {
    const userId = requireUserId(req);
    // Support ?expand=projects query parameter
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

// Calculate and store rollup status
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

/** ---------- Projects ---------- */
router.post('/projects', async (req, res) => {
  try {
    const userId = requireUserId(req);
    const id = await createProject(req.body, userId);
    res.status(201).json({ success: true, id });
  } catch (e: any) {
    res.status(e.message === 'Unauthorized' ? 401 : 400).json({ error: e.message });
  }
});

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

router.get('/projects/:id', async (req, res) => {
  try {
    const userId = requireUserId(req);
    // Support ?expand=sections or ?expand=full query parameters
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

// Calculate and update project completion
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

/** ---------- Sections ---------- */
router.post('/sections', async (req, res) => {
  try {
    const userId = requireUserId(req);
    const id = await createSection(req.body, userId);
    res.status(201).json({ success: true, id });
  } catch (e: any) {
    res.status(e.message === 'Unauthorized' ? 401 : 400).json({ error: e.message });
  }
});

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

router.get('/sections/:id', async (req, res) => {
  try {
    const userId = requireUserId(req);
    // Support ?expand=tasks query parameter
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

/** ---------- Tasks ---------- */
router.post('/tasks', async (req, res) => {
  try {
    const userId = requireUserId(req);
    const id = await createTask(req.body, userId);
    res.status(201).json({ success: true, id });
  } catch (e: any) {
    res.status(e.message === 'Unauthorized' ? 401 : 400).json({ error: e.message });
  }
});

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

router.get('/tasks/:id', async (req, res) => {
  try {
    const userId = requireUserId(req);
    // Support ?expand=subtasks query parameter
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

/** ---------- Task Subtask Management ---------- */
router.post('/tasks/:parentId/subtasks/:subtaskId', async (req, res) => {
  try {
    const userId = requireUserId(req);
    await addSubtask(req.params.parentId, req.params.subtaskId, userId);
    res.json({ success: true });
  } catch (e: any) {
    res.status(e.message === 'Unauthorized' ? 401 : 400).json({ error: e.message });
  }
});

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