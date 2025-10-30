// tests/team.test.ts
import supertest from 'supertest';
import express from 'express';
import { getFirestoreForUser, Timestamp } from './setup';
import teamRoutes from '../src/routes/team.routes';
import { Team } from '../src/types/entities';

// Initialize Express app for testing
const app = express();
app.use(express.json());
app.use('/api/teams', teamRoutes);

// Add to top of tests/team.test.ts and tests/portfolio.test.ts
jest.mock('../src/middleware/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.userId = req.headers['x-user-id'];
    next();
  },
}));

describe('Team API', () => {
  let request: supertest.SuperTest<supertest.Test>;

  beforeAll(async () => {
    request = supertest(app) as unknown as supertest.SuperTest<supertest.Test>;
  });

  // In tests/team.test.ts and tests/portfolio.test.ts, update beforeEach
  beforeEach(async () => {
    const db = getFirestoreForUser('jd@dejongistan.email');
    await db.collection('users').doc('jd@dejongistan.email').set({
      email: 'jd@dejongistan.email',
    });
    await db.collection('workspaces').doc('Pz69WDBkd6OmAAJn2uEO').set({
      organizationId: '418CIuERVlLT7YkTvlbg',
    });
  });

  describe('POST /api/teams', () => {
    it('should create a team successfully', async () => {
      const payload = {
        workspaceId: 'Pz69WDBkd6OmAAJn2uEO',
        name: 'Test Team',
        description: 'Test Description',
        memberIds: ['jd@dejongistan.email'],
        leaderId: 'jd@dejongistan.email',
      };

      const response = await request
        .post('/api/teams')
        .set('x-user-id', 'jd@dejongistan.email')
        .send(payload)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: { id: expect.any(String) },
      });

      // Verify Firestore document
      const doc = await getFirestoreForUser('jd@dejongistan.email')
        .collection('teams')
        .doc(response.body.data.id)
        .get();
      expect(doc.exists).toBe(true);
      const team = doc.data() as Team;
      expect(team).toMatchObject({
        workspaceId: payload.workspaceId,
        name: payload.name,
        description: payload.description,
        memberIds: payload.memberIds,
        leaderId: payload.leaderId,
        createdBy: 'jd@dejongistan.email',
        updatedBy: 'jd@dejongistan.email',
        createdAt: expect.any(Timestamp),
        updatedAt: expect.any(Timestamp),
      });
    });

    it('should return 400 if workspaceId is missing', async () => {
      const payload = {
        name: 'Test Team',
        memberIds: ['jd@dejongistan.email'],
      };

      const response = await request
        .post('/api/teams')
        .set('x-user-id', 'jd@dejongistan.email')
        .send(payload)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Bad Request',
        message: 'workspaceId is required and must be a non-empty string',
      });
    });

    it('should return 400 if x-user-id is missing', async () => {
      const payload = {
        organizationId: '418CIuERVlLT7YkTvlbg',
        workspaceId: 'Pz69WDBkd6OmAAJn2uEO',
        name: 'Test Team',
        memberIds: ['jd@dejongistan.email'],
      };

      const response = await request
        .post('/api/teams')
        .send(payload)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Bad Request',
        message: 'x-user-id header is required and must be a non-empty string',
      });
    });
  });
});