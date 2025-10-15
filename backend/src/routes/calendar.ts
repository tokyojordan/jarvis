import { Router } from 'express';
import { syncGoogleCalendar } from '../services/googleCalendar';
import { db } from '../services/firebase';

const router = Router();

/**
 * @swagger
 * /api/calendar/sync/google:
 *   post:
 *     summary: Sync Google Calendar
 *     description: Import calendar events from Google Calendar
 *     tags: [Calendar]
 *     security:
 *       - UserAuth: []
 *     responses:
 *       200:
 *         description: Calendar synced successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
router.post('/sync/google', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log(`📅 Syncing Google Calendar for user ${userId}`);
    const result = await syncGoogleCalendar(userId);
    
    return res.json({ 
      success: true,
      count: result.count,
      message: `Synced ${result.count} calendar events`
    });
  } catch (error: any) {
    console.error('Calendar sync error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/calendar/events:
 *   get:
 *     summary: Get calendar events
 *     description: Retrieve all calendar events for the authenticated user
 *     tags: [Calendar]
 *     security:
 *       - UserAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of events to return
 *     responses:
 *       200:
 *         description: List of calendar events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 events:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       startTime:
 *                         type: string
 *                         format: date-time
 *                       endTime:
 *                         type: string
 *                         format: date-time
 *                       location:
 *                         type: string
 *                       attendees:
 *                         type: array
 *                         items:
 *                           type: string
 *                 count:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/events', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const snapshot = await db
      .collection('calendar_events')
      .where('userId', '==', userId)
      .orderBy('startTime', 'asc')
      .limit(100)
      .get();

    const events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({ events, count: events.length });
  } catch (error: any) {
    console.error('Get events error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/calendar/events/upcoming:
 *   get:
 *     summary: Get upcoming events
 *     description: Retrieve upcoming calendar events starting from now
 *     tags: [Calendar]
 *     security:
 *       - UserAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of events to return
 *     responses:
 *       200:
 *         description: List of upcoming events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 events:
 *                   type: array
 *                   items:
 *                     type: object
 *                 count:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/events/upcoming', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const now = new Date().toISOString();
    const snapshot = await db
      .collection('calendar_events')
      .where('userId', '==', userId)
      .where('startTime', '>=', now)
      .orderBy('startTime', 'asc')
      .limit(10)
      .get();

    const events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({ events, count: events.length });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;