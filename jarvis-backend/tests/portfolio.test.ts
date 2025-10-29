// tests/portfolio.test.ts
import supertest from 'supertest';
import express from 'express';
import { testEnv, getFirestoreForUser, Timestamp } from './setup';
import portfolioRoutes from '../src/routes/portfolio.routes';
import { Portfolio } from '../src/types';

// Initialize Express app for testing
const app = express();
app.use(express.json());
app.use('/api/portfolios', portfolioRoutes);

// Add to top of tests/team.test.ts and tests/portfolio.test.ts
jest.mock('../src/middleware/auth.middleware', () => ({
  authenticate: (req: any, next: any) => {
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
    await testEnv.clearFirestore();
    // Mock user data for auth middleware
    await getFirestoreForUser('jd@dejongistan.email')
      .collection('users')
      .doc('jd@dejongistan.email')
      .set({
        email: 'jd@dejongistan.email',
      });
  });

  describe('POST /api/portfolios', () => {
    it('should create a portfolio successfully', async () => {
      const payload = {
        workspaceId: 'Pz69WDBkd6OmAAJn2uEO',
        name: 'Software Development Portfolio',
        description: 'APIs, websites, apps or other goodies',
        color: '#4F46E5',
        ownerId: 'jd@dejongistan.email',
        startDate: '2025-10-25T08:03:14.898Z',
        endDate: '2025-10-25T08:03:14.898Z',
        status: 'planning',
        goals: ['Develop awesome profitable software'],
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
        ownerId: payload.ownerId,
        startDate: expect.any(Timestamp),
        endDate: expect.any(Timestamp),
        status: payload.status,
        goals: payload.goals,
        metrics: {},
        createdBy: 'jd@dejongistan.email',
        updatedBy: 'jd@dejongistan.email',
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
        message: 'workspaceId, name, and ownerId are required',
      });
    });

    it('should return 400 if status is invalid', async () => {
      const payload = {
        workspaceId: 'Pz69WDBkd6OmAAJn2uEO',
        name: 'Software Development Portfolio',
        ownerId: 'jd@dejongistan.email',
        status: 'invalid_status',
      };

      const response = await request
        .post('/api/portfolios')
        .set('x-user-id', 'jd@dejongistan.email')
        .send(payload)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Validation Error',
        message: 'status must be one of: planning, active, on_hold, completed, archived',
      });
    });
  });
});