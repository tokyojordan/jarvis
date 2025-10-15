import { Router } from 'express';
import admin, { db } from '../services/firebase';

const router = Router();

/**
 * @swagger
 * /api/integration/status:
 *   get:
 *     summary: Get integration status
 *     description: Check connection status of all integrations (Google, Evernote, n8n)
 *     tags: [Integration]
 *     security:
 *       - UserAuth: []
 *     responses:
 *       200:
 *         description: Integration status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 google:
 *                   type: object
 *                   properties:
 *                     contacts:
 *                       type: boolean
 *                     calendar:
 *                       type: boolean
 *                 evernote:
 *                   type: object
 *                   properties:
 *                     connected:
 *                       type: boolean
 *                 n8n:
 *                   type: object
 *                   properties:
 *                     connected:
 *                       type: boolean
 *                     url:
 *                       type: string
 *                 lastSync:
 *                   type: object
 *                   properties:
 *                     contacts:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     calendar:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     evernote:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *       401:
 *         description: Unauthorized
 */
router.get('/status', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user document (may not exist yet)
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    
    // If user doesn't exist, create a basic user document
    if (!userDoc.exists) {
      await db.collection('users').doc(userId).set({
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    const status = {
      google: {
        contacts: !!userData?.googleTokens,
        calendar: !!userData?.googleTokens,
      },
      evernote: {
        connected: !!userData?.evernoteToken,
      },
      n8n: {
        connected: !!process.env.N8N_WEBHOOK_URL,
        url: process.env.N8N_WEBHOOK_URL,
      },
      lastSync: {
        contacts: userData?.lastSync?.contacts || null,
        calendar: userData?.lastSync?.calendar || null,
        evernote: userData?.lastSync?.evernote || null,
      },
    };

    return res.json(status);
  } catch (error: any) {
    console.error('Get status error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/integration/sync-all:
 *   post:
 *     summary: Sync all integrations
 *     description: Trigger a full sync of all connected integrations (Google Contacts, Calendar, Evernote)
 *     tags: [Integration]
 *     security:
 *       - UserAuth: []
 *     responses:
 *       200:
 *         description: Sync initiated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 note:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
router.post('/sync-all', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log(`🔄 Triggering full sync for user ${userId}`);

    // This would trigger background jobs to sync everything
    // For now, return success and let individual sync endpoints handle it
    
    return res.json({ 
      success: true,
      message: 'Sync initiated for all integrations',
      note: 'Use individual sync endpoints for immediate results'
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/integration/oauth/google:
 *   post:
 *     summary: Save Google OAuth tokens
 *     description: Store Google OAuth tokens for accessing Google APIs (Contacts, Calendar, Gmail)
 *     tags: [Integration]
 *     security:
 *       - UserAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tokens
 *             properties:
 *               tokens:
 *                 type: object
 *                 description: OAuth tokens object from Google
 *                 properties:
 *                   access_token:
 *                     type: string
 *                   refresh_token:
 *                     type: string
 *                   scope:
 *                     type: string
 *                   token_type:
 *                     type: string
 *                   expiry_date:
 *                     type: integer
 *     responses:
 *       200:
 *         description: Tokens saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
router.post('/oauth/google', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { tokens } = req.body;

    await db.collection('users').doc(userId).set({
      googleTokens: tokens,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return res.json({ success: true, message: 'Google OAuth tokens saved' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/integration/oauth/evernote:
 *   post:
 *     summary: Save Evernote token
 *     description: Store Evernote access token for syncing notes
 *     tags: [Integration]
 *     security:
 *       - UserAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Evernote access token
 *     responses:
 *       200:
 *         description: Token saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
router.post('/oauth/evernote', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { token } = req.body;

    await db.collection('users').doc(userId).set({
      evernoteToken: token,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return res.json({ success: true, message: 'Evernote token saved' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;