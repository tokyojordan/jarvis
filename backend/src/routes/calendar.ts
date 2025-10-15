import { Router } from 'express';
import { syncGoogleCalendar } from '../services/googleCalendar';
import admin, { db } from '../services/firebase';

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
 *       - in: query
 *         name: hasMinutes
 *         schema:
 *           type: boolean
 *         description: Filter events that have meeting minutes
 *       - in: query
 *         name: upcoming
 *         schema:
 *           type: boolean
 *         description: Only show upcoming events
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
 *                     $ref: '#/components/schemas/CalendarEvent'
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

    const { limit = '100', hasMinutes, upcoming } = req.query;

    let query = db
      .collection('calendar_events')
      .where('userId', '==', userId);

    // Filter upcoming events
    if (upcoming === 'true') {
      const now = new Date();
      query = query.where('startTime', '>=', now);
    }

    let snapshot;
    try {
      snapshot = await query.orderBy('startTime', 'desc').limit(parseInt(limit as string)).get();
    } catch (error: any) {
      // If index doesn't exist, fetch without ordering
      console.warn('Firestore index missing for startTime ordering');
      snapshot = await query.limit(parseInt(limit as string)).get();
    }

    let events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Client-side filtering
    if (hasMinutes === 'true') {
      events = events.filter((e: any) => e.meetingMinutesId);
    } else if (hasMinutes === 'false') {
      events = events.filter((e: any) => !e.meetingMinutesId);
    }

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
 *                     $ref: '#/components/schemas/CalendarEvent'
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

    const { limit = '10' } = req.query;
    const now = new Date();

    let snapshot;
    try {
      snapshot = await db
        .collection('calendar_events')
        .where('userId', '==', userId)
        .where('startTime', '>=', now)
        .orderBy('startTime', 'asc')
        .limit(parseInt(limit as string))
        .get();
    } catch (error: any) {
      console.warn('Firestore index missing, fetching unordered');
      const allEvents = await db
        .collection('calendar_events')
        .where('userId', '==', userId)
        .get();

      const filteredEvents = allEvents.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((e: any) => new Date(e.startTime) >= now)
        .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
        .slice(0, parseInt(limit as string));

      return res.json({ events: filteredEvents, count: filteredEvents.length });
    }

    const events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({ events, count: events.length });
  } catch (error: any) {
    console.error('Get upcoming events error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/calendar/events/{id}:
 *   get:
 *     summary: Get a specific calendar event
 *     description: Retrieve details of a specific calendar event by ID
 *     tags: [Calendar]
 *     security:
 *       - UserAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Calendar event ID
 *     responses:
 *       200:
 *         description: Calendar event details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 event:
 *                   $ref: '#/components/schemas/CalendarEvent'
 *       404:
 *         description: Event not found
 *       403:
 *         description: Forbidden
 */
router.get('/events/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const doc = await db.collection('calendar_events').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Calendar event not found' });
    }

    const eventData = doc.data();
    if (eventData?.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const event = { id: doc.id, ...eventData };
    return res.json({ event });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/calendar/events/{id}:
 *   patch:
 *     summary: Update a calendar event
 *     description: Update calendar event information (for manually created events)
 *     tags: [Calendar]
 *     security:
 *       - UserAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Calendar event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               location:
 *                 type: string
 *               meetingMinutesId:
 *                 type: string
 *                 description: Link to meeting minutes
 *     responses:
 *       200:
 *         description: Event updated successfully
 *       404:
 *         description: Event not found
 *       403:
 *         description: Forbidden
 */
router.patch('/events/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const doc = await db.collection('calendar_events').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Calendar event not found' });
    }

    const event = doc.data();
    if (event?.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await db.collection('calendar_events').doc(id).update({
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ success: true, message: 'Calendar event updated' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/calendar/events/{id}:
 *   delete:
 *     summary: Delete a calendar event
 *     description: Delete a calendar event permanently (only for manually created events)
 *     tags: [Calendar]
 *     security:
 *       - UserAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Calendar event ID
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *       404:
 *         description: Event not found
 *       403:
 *         description: Forbidden
 */
router.delete('/events/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const doc = await db.collection('calendar_events').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Calendar event not found' });
    }

    const event = doc.data();
    if (event?.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await db.collection('calendar_events').doc(id).delete();
    return res.json({ success: true, message: 'Calendar event deleted' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/calendar/events/{id}/link-minutes:
 *   post:
 *     summary: Link meeting minutes to calendar event
 *     description: Associate meeting minutes with a calendar event
 *     tags: [Calendar]
 *     security:
 *       - UserAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Calendar event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - meetingMinutesId
 *             properties:
 *               meetingMinutesId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Meeting minutes linked successfully
 *       404:
 *         description: Event or minutes not found
 *       403:
 *         description: Forbidden
 */
router.post('/events/:id/link-minutes', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;
    const { meetingMinutesId } = req.body;

    if (!meetingMinutesId) {
      return res.status(400).json({ error: 'meetingMinutesId is required' });
    }

    // Verify event exists and belongs to user
    const eventDoc = await db.collection('calendar_events').doc(id).get();
    if (!eventDoc.exists) {
      return res.status(404).json({ error: 'Calendar event not found' });
    }
    if (eventDoc.data()?.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Verify meeting minutes exist and belong to user
    const minutesDoc = await db.collection('meeting_minutes').doc(meetingMinutesId).get();
    if (!minutesDoc.exists) {
      return res.status(404).json({ error: 'Meeting minutes not found' });
    }
    if (minutesDoc.data()?.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden - meeting minutes belong to different user' });
    }

    // Link them together
    await db.collection('calendar_events').doc(id).update({
      meetingMinutesId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await db.collection('meeting_minutes').doc(meetingMinutesId).update({
      calendarEventId: id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ 
      success: true, 
      message: 'Meeting minutes linked to calendar event successfully' 
    });
  } catch (error: any) {
    console.error('Link minutes error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;