// tests/portfolio.test.ts
import supertest from 'supertest';
import express from 'express';
import { getFirestoreForUser, Timestamp } from './setup';
import portfolioRoutes from '../src/routes/portfolio.routes';
import { Portfolio } from '../src/types';

// Initialize Express app for testing
const app = express();
app.use(express.json());
app.use('/api/portfolios', portfolioRoutes);

// Add to top of tests/team.test.ts and tests/portfolio.test.ts
jest.mock('../src/middleware/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.userId = req.headers['x-user-id'];
    next();
  },
}));

describe('Portfolio API', () => {
  let request: supertest.SuperTest<supertest.Test>;

  beforeAll(async () => {
    request = supertest(app) as unknown as supertest.SuperTest<supertest.Test>;
  });

  beforeEach(async () => {
    const db = getFirestoreForUser('jd@dejongistan.email');
    
    // Create user
    await db.collection('users').doc('jd@dejongistan.email').set({
      email: 'jd@dejongistan.email',
    });
    
    // Create organization
    await db.collection('organizations').doc('418CIuERVlLT7YkTvlbg').set({
      ownerId: 'jd@dejongistan.email',
      memberIds: ['jd@dejongistan.email'],
      name: 'Test Org',
    });
    
    // Create workspace
    await db.collection('workspaces').doc('Pz69WDBkd6OmAAJn2uEO').set({
      organizationId: '418CIuERVlLT7YkTvlbg',
      name: 'Test Workspace',
    });
  });

  describe('POST /api/portfolios', () => {
    it('should create a portfolio successfully', async () => {
      const payload = {
        workspaceId: 'Pz69WDBkd6OmAAJn2uEO',
        name: 'Software Development Portfolio',
        description: 'APIs, websites, apps or other goodies',
        color: '#4F46E5',
        icon: 'folder',
      };

      const response = await request
        .post('/api/portfolios')
        .set('x-user-id', 'jd@dejongistan.email')
        .send(payload)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: { portfolioId: expect.any(String) },
        message: 'Portfolio created successfully',
      });

      // Verify Firestore document
      const doc = await getFirestoreForUser('jd@dejongistan.email')
        .collection('portfolios')
        .doc(response.body.data.portfolioId)
        .get();
      expect(doc.exists).toBe(true);
      const portfolio = doc.data() as Portfolio;
      expect(portfolio).toMatchObject({
        name: payload.name,
        description: payload.description,
        color: payload.color,
        icon: payload.icon,
        completionPercentage: 0,
        totalTasks: 0,
        completedTasks: 0,
        createdAt: expect.any(Timestamp),
        updatedAt: expect.any(Timestamp),
      });
    });

    it('should return 400 if workspaceId is missing', async () => {
      const payload = {
        name: 'Software Development Portfolio',
        ownerId: 'jd@dejongistan.email',
      };

      const response = await request
        .post('/api/portfolios')
        .set('x-user-id', 'jd@dejongistan.email')
        .send(payload)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Validation Error',
        message: 'workspaceId and name are required',
      });
    });
  });
});