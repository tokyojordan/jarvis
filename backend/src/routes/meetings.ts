import { Router } from 'express';
import multer from 'multer';
import { processMeetingRecording } from '../services/meetingIntelligence';
import { generateMeetingPDF, emailMeetingMinutes } from '../services/n8nIntegration';
import { db } from '../services/firebase';

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
});

/**
 * @swagger
 * /api/meetings/upload:
 *   post:
 *     summary: Upload and process meeting audio
 *     description: Upload an audio file to transcribe and analyze using OpenAI Whisper and GPT-4. Includes automatic duplicate detection.
 *     tags: [Meetings]
 *     security:
 *       - UserAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *                 description: Audio file (m4a, mp3, wav, etc.)
 *               title:
 *                 type: string
 *                 description: Optional meeting title
 *               projectId:
 *                 type: string
 *                 description: Optional project ID to associate with
 *               attendeeIds:
 *                 type: string
 *                 description: JSON array of attendee contact IDs
 *     responses:
 *       200:
 *         description: Meeting processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 meetingMinutesId:
 *                   type: string
 *                 message:
 *                   type: string
 *                 filename:
 *                   type: string
 *       409:
 *         description: Duplicate file detected
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Duplicate file
 *                 message:
 *                   type: string
 *                 details:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/upload', upload.single('audio'), async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized - x-user-id header required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const { title, projectId, attendeeIds } = req.body;

    console.log(`🎙️ Processing meeting recording for user ${userId}`);
    console.log(`   📄 Filename: ${req.file.originalname}`);
    console.log(`   📦 Size: ${(req.file.size / (1024 * 1024)).toFixed(2)} MB`);
    
    const meetingMinutesId = await processMeetingRecording(
      req.file.buffer,
      userId,
      {
        title,
        projectId,
        attendeeIds: attendeeIds ? JSON.parse(attendeeIds) : [],
        filename: req.file.originalname,
      }
    );

    return res.json({
      success: true,
      meetingMinutesId,
      message: 'Meeting processed successfully',
      filename: req.file.originalname,
    });

  } catch (error: any) {
    console.error('Meeting upload error:', error);
    
    // Check if it's a duplicate file error
    if (error.message.includes('already been processed')) {
      return res.status(409).json({ 
        error: 'Duplicate file',
        message: error.message,
        details: 'This recording has already been uploaded and processed.'
      });
    }
    
    return res.status(500).json({ 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @swagger
 * /api/meetings:
 *   get:
 *     summary: Get all meetings
 *     description: Retrieve all meetings for the authenticated user
 *     tags: [Meetings]
 *     security:
 *       - UserAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of meetings to return
 *     responses:
 *       200:
 *         description: List of meetings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 meetings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Meeting'
 *                 count:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const snapshot = await db
      .collection('meeting_minutes')
      .where('userId', '==', userId)
      .orderBy('date', 'desc')
      .limit(50)
      .get();

    const meetings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({ meetings, count: meetings.length });
  } catch (error: any) {
    console.error('Get meetings error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/meetings/{id}:
 *   get:
 *     summary: Get a specific meeting
 *     description: Retrieve details of a specific meeting by ID
 *     tags: [Meetings]
 *     security:
 *       - UserAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Meeting ID
 *     responses:
 *       200:
 *         description: Meeting details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 meeting:
 *                   $ref: '#/components/schemas/Meeting'
 *       404:
 *         description: Meeting not found
 *       403:
 *         description: Forbidden
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const doc = await db.collection('meeting_minutes').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const meetingData = doc.data();
    const meeting = { id: doc.id, ...meetingData };
    
    // Check ownership 
    if (meetingData?.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.json({ meeting });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/meetings/{id}/generate-pdf:
 *   post:
 *     summary: Generate PDF for meeting
 *     description: Generate and email a PDF summary of the meeting minutes
 *     tags: [Meetings]
 *     security:
 *       - UserAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Meeting ID
 *     responses:
 *       200:
 *         description: PDF generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 pdfUrl:
 *                   type: string
 *       500:
 *         description: Server error
 */
router.post('/:id/generate-pdf', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`📄 Generating PDF for meeting ${id}`);
    const result = await generateMeetingPDF(id);
    
    return res.json({
      success: true,
      message: 'PDF generated and emailed',
      pdfUrl: result.pdfUrl,
    });
  } catch (error: any) {
    console.error('PDF generation error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/meetings/{id}/email:
 *   post:
 *     summary: Email meeting minutes
 *     description: Send meeting minutes to all attendees via email
 *     tags: [Meetings]
 *     security:
 *       - UserAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Meeting ID
 *     responses:
 *       200:
 *         description: Email sent successfully
 *       500:
 *         description: Server error
 */
router.post('/:id/email', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`📧 Emailing meeting minutes for ${id}`);
    await emailMeetingMinutes(id);
    
    return res.json({
      success: true,
      message: 'Meeting minutes emailed to attendees',
    });
  } catch (error: any) {
    console.error('Email error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/meetings/{id}:
 *   delete:
 *     summary: Delete a meeting
 *     description: Delete a meeting and all associated data
 *     tags: [Meetings]
 *     security:
 *       - UserAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Meeting ID
 *     responses:
 *       200:
 *         description: Meeting deleted successfully
 *       404:
 *         description: Meeting not found
 *       403:
 *         description: Forbidden
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const doc = await db.collection('meeting_minutes').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const meeting = doc.data();
    if (meeting?.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await db.collection('meeting_minutes').doc(id).delete();
    return res.json({ success: true, message: 'Meeting deleted' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;