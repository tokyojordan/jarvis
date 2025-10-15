import { Router } from 'express';
import { google } from 'googleapis';
import admin, { db } from '../services/firebase';

const router = Router();

// OAuth2 client setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080/api/auth/google/callback'
);

const SCOPES = [
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/gmail.send',
];

/**
 * @swagger
 * /api/integration/oauth/google:
 *   get:
 *     summary: Initiate Google OAuth
 *     description: Redirects to Google OAuth consent screen
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to associate with the OAuth tokens
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth consent screen
 */
router.get('/google', (req, res) => {
  const userId = req.query.userId as string;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId query parameter required' });
  }

  // Generate OAuth URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Get refresh token
    scope: SCOPES,
    state: userId, // Pass userId in state for callback
  });

  console.log('🔐 Redirecting to Google OAuth:', authUrl);
  return res.redirect(authUrl);
});

/**
 * @swagger
 * /api/integration/oauth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     description: Handles the OAuth callback from Google
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID from the initial request
 *     responses:
 *       200:
 *         description: OAuth successful
 */
router.get('/google/callback', async (req, res) => {
  try {
    const code = req.query.code as string;
    const userId = req.query.state as string; // Get userId from state

    if (!code) {
      return res.status(400).json({ error: 'Authorization code missing' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'User ID missing' });
    }

    console.log('🔐 Processing OAuth callback for user:', userId);

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    console.log('✅ OAuth tokens received');
    console.log('   - Access token:', tokens.access_token?.substring(0, 20) + '...');
    console.log('   - Refresh token:', tokens.refresh_token ? 'Yes' : 'No');
    console.log('   - Expiry:', new Date(tokens.expiry_date || 0).toISOString());

    // Save tokens to Firestore
    await db.collection('users').doc(userId).set({
      googleTokens: tokens,
      googleConnectedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log('✅ Tokens saved to Firestore');

    // Success page
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Google Connected!</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 500px;
          }
          h1 {
            color: #667eea;
            margin-top: 0;
          }
          .success {
            font-size: 64px;
            margin: 20px 0;
          }
          .message {
            color: #666;
            margin: 20px 0;
            line-height: 1.6;
          }
          .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            margin-top: 20px;
          }
          .scopes {
            background: #f9fafb;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
            text-align: left;
            font-size: 14px;
          }
          .scopes ul {
            margin: 10px 0;
            padding-left: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">✅</div>
          <h1>Google Connected!</h1>
          <p class="message">
            Your Google account has been successfully connected to Jarvis.
          </p>
          
          <div class="scopes">
            <strong>Enabled Permissions:</strong>
            <ul>
              <li>📧 Google Contacts (read-only)</li>
              <li>📅 Google Calendar (read-only)</li>
              <li>📨 Gmail (send emails)</li>
            </ul>
          </div>
          
          <p class="message">
            You can now sync your contacts and calendar!
          </p>
          
          <a href="http://localhost:8080/api-docs" class="button">
            Go to API Docs
          </a>
          
          <p style="margin-top: 30px; color: #999; font-size: 12px;">
            You can close this window
          </p>
        </div>
      </body>
      </html>
    `);

  } catch (error: any) {
    console.error('❌ OAuth callback error:', error);
    
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>OAuth Error</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #f5f5f5;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 500px;
          }
          h1 {
            color: #ef4444;
            margin-top: 0;
          }
          .error {
            font-size: 64px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error">❌</div>
          <h1>Authentication Failed</h1>
          <p>${error.message}</p>
          <p style="color: #666; font-size: 14px; margin-top: 20px;">
            Please try again or contact support.
          </p>
        </div>
      </body>
      </html>
    `);
  }
});

/**
 * @swagger
 * /api/integration/oauth/google/status:
 *   get:
 *     summary: Check Google OAuth status
 *     description: Check if user has connected their Google account
 *     tags: [Authentication]
 *     security:
 *       - UserAuth: []
 *     responses:
 *       200:
 *         description: OAuth status
 */
router.get('/google/status', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    const hasTokens = !!userData?.googleTokens;
    
    return res.json({
      connected: hasTokens,
      connectedAt: userData?.googleConnectedAt?.toDate().toISOString() || null,
      scopes: hasTokens ? SCOPES : [],
      connectUrl: `http://localhost:8080/api/auth/google?userId=${userId}`
    });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/integration/oauth/google/disconnect:
 *   post:
 *     summary: Disconnect Google account
 *     description: Remove Google OAuth tokens
 *     tags: [Authentication]
 *     security:
 *       - UserAuth: []
 *     responses:
 *       200:
 *         description: Disconnected successfully
 */
router.post('/google/disconnect', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await db.collection('users').doc(userId).update({
      googleTokens: admin.firestore.FieldValue.delete(),
      googleConnectedAt: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('🔓 Google account disconnected for user:', userId);

    return res.json({
      success: true,
      message: 'Google account disconnected'
    });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;