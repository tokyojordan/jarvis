// tests/project.test.ts
import supertest from 'supertest';
import express from 'express';
import { getFirestoreForUser, Timestamp } from './setup';
import projectRoutes from '../src/routes/project.routes';
import { Project } from '../src/types/entities';

// Initialize Express app for testing
const app = express();
app.use(express.json());
app.use('/api/projects', projectRoutes);

// Mock auth middleware
jest.mock('../src/middleware/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.userId = req.headers['x-user-id'];
    next();
  },
}));

describe('Project API', () => {
  let request: supertest.SuperTest<supertest.Test>;

  beforeAll(async () => {
    request = supertest(app) as unknown as supertest.SuperTest<supertest.Test>;
  });

  beforeEach(async () => {
    const db = getFirestoreForUser('jd@dejongistan.email');
    
    // Create organization
    await db.collection('organizations').doc('org-123').set({
      ownerId: 'jd@dejongistan.email',
      memberIds: ['jd@dejongistan.email'],
      name: 'Test Org',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    
    // Create workspace
    await db.collection('workspaces').doc('workspace-123').set({
      organizationId: 'org-123',
      name: 'Test Workspace',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    
    // Create portfolio
    await db.collection('portfolios').doc('portfolio-123').set({
      workspaceId: 'workspace-123',
      name: 'Q4 Roadmap',
      completionPercentage: 0,
      totalTasks: 0,
      completedTasks: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  });

  describe('POST /api/projects', () => {
    it('should create a project successfully', async () => {
      const payload = {
        portfolioIds: ['portfolio-123'],
        name: 'Mobile App Redesign',
        description: 'Complete overhaul of iOS and Android apps',
        color: '#4F46E5',
        icon: 'phone_iphone',
        status: 'in_progress',
      };

      const response = await request
        .post('/api/projects')
        .set('x-user-id', 'jd@dejongistan.email')
        .send(payload)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: { projectId: expect.any(String) },
        message: 'Project created successfully',
      });

      // Verify Firestore document
      const doc = await getFirestoreForUser('jd@dejongistan.email')
        .collection('projects')
        .doc(response.body.data.projectId)
        .get();
      
      expect(doc.exists).toBe(true);
      const project = doc.data() as Project;
      expect(project).toMatchObject({
        portfolioIds: payload.portfolioIds,
        name: payload.name,
        description: payload.description,
        color: payload.color,
        icon: payload.icon,
        status: payload.status,
        completionPercentage: 0,
        createdAt: expect.any(Timestamp),
        updatedAt: expect.any(Timestamp),
      });
    });

    it('should create project in multiple portfolios', async () => {
      const db = getFirestoreForUser('jd@dejongistan.email');
      
      // Create second portfolio
      await db.collection('portfolios').doc('portfolio-456').set({
        workspaceId: 'workspace-123',
        name: 'Innovation Initiatives',
        completionPercentage: 0,
        totalTasks: 0,
        completedTasks: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      const payload = {
        portfolioIds: ['portfolio-123', 'portfolio-456'],
        name: 'AI Research Project',
        status: 'not_started',
      };

      const response = await request
        .post('/api/projects')
        .set('x-user-id', 'jd@dejongistan.email')
        .send(payload)
        .expect(201);

      const doc = await db.collection('projects')
        .doc(response.body.data.projectId)
        .get();
      
      const project = doc.data() as Project;
      expect(project.portfolioIds).toEqual(['portfolio-123', 'portfolio-456']);
    });

    it('should return 400 if portfolioIds is missing', async () => {
      const payload = {
        name: 'Mobile App',
      };

      const response = await request
        .post('/api/projects')
        .set('x-user-id', 'jd@dejongistan.email')
        .send(payload)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');
    });

    it('should return 400 if portfolioIds is not an array', async () => {
      const payload = {
        portfolioIds: 'portfolio-123', // String instead of array
        name: 'Mobile App',
      };

      const response = await request
        .post('/api/projects')
        .set('x-user-id', 'jd@dejongistan.email')
        .send(payload)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should get project by id', async () => {
      const db = getFirestoreForUser('jd@dejongistan.email');
      const projectRef = await db.collection('projects').add({
        portfolioIds: ['portfolio-123'],
        name: 'Test Project',
        status: 'in_progress',
        completionPercentage: 50,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      const response = await request
        .get(`/api/projects/${projectRef.id}`)
        .set('x-user-id', 'jd@dejongistan.email')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Project');
    });

    it('should return 404 if project not found', async () => {
      const response = await request
        .get('/api/projects/nonexistent-id')
        .set('x-user-id', 'jd@dejongistan.email')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/projects (by portfolio)', () => {
    it('should get all projects in a portfolio', async () => {
      const db = getFirestoreForUser('jd@dejongistan.email');
      
      await db.collection('projects').add({
        portfolioIds: ['portfolio-123'],
        name: 'Project 1',
        status: 'in_progress',
        completionPercentage: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      await db.collection('projects').add({
        portfolioIds: ['portfolio-123'],
        name: 'Project 2',
        status: 'not_started',
        completionPercentage: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      const response = await request
        .get('/api/projects?portfolioId=portfolio-123')
        .set('x-user-id', 'jd@dejongistan.email')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('PATCH /api/projects/:id', () => {
    it('should update project', async () => {
      const db = getFirestoreForUser('jd@dejongistan.email');
      const projectRef = await db.collection('projects').add({
        portfolioIds: ['portfolio-123'],
        name: 'Original Name',
        status: 'not_started',
        completionPercentage: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      const response = await request
        .patch(`/api/projects/${projectRef.id}`)
        .set('x-user-id', 'jd@dejongistan.email')
        .send({ name: 'Updated Name', status: 'in_progress' })
        .expect(200);

      expect(response.body.success).toBe(true);

      const updated = await projectRef.get();
      expect(updated.data()?.name).toBe('Updated Name');
      expect(updated.data()?.status).toBe('in_progress');
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete project', async () => {
      const db = getFirestoreForUser('jd@dejongistan.email');
      const projectRef = await db.collection('projects').add({
        portfolioIds: ['portfolio-123'],
        name: 'To Delete',
        status: 'not_started',
        completionPercentage: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      await request
        .delete(`/api/projects/${projectRef.id}`)
        .set('x-user-id', 'jd@dejongistan.email')
        .expect(200);

      const deleted = await projectRef.get();
      expect(deleted.exists).toBe(false);
    });
  });

  describe('POST /api/projects/:id/portfolios/:portfolioId', () => {
    it('should add project to another portfolio', async () => {
      const db = getFirestoreForUser('jd@dejongistan.email');
      
      // Create second portfolio
      await db.collection('portfolios').doc('portfolio-456').set({
        workspaceId: 'workspace-123',
        name: 'Another Portfolio',
        completionPercentage: 0,
        totalTasks: 0,
        completedTasks: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      const projectRef = await db.collection('projects').add({
        portfolioIds: ['portfolio-456'],
        name: 'Test Project',
        status: 'in_progress',
        completionPercentage: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      await request
        .post(`/api/projects/${projectRef.id}/portfolios/portfolio-123`)
        .set('x-user-id', 'jd@dejongistan.email')
        .expect(200);

      const updated = await projectRef.get();
      expect(updated.data()?.portfolioIds).toContain('portfolio-456');
      expect(updated.data()?.portfolioIds).toHaveLength(2);
    });
  });

  describe('DELETE /api/projects/:id/portfolios/:portfolioId', () => {
    it('should remove project from portfolio', async () => {
      const db = getFirestoreForUser('jd@dejongistan.email');
      
      const projectRef = await db.collection('projects').add({
        portfolioIds: ['portfolio-123', 'portfolio-456'],
        name: 'Test Project',
        status: 'in_progress',
        completionPercentage: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      await request
        .delete(`/api/projects/${projectRef.id}/portfolios/portfolio-456`)
        .set('x-user-id', 'jd@dejongistan.email')
        .expect(200);

      const updated = await projectRef.get();
      expect(updated.data()?.portfolioIds).toEqual(['portfolio-123']);
    });
  });
});