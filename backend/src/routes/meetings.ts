import { Router } from 'express';
import multer from 'multer';
import { processAudioInBackground } from '../services/backgroundProcessor';
import { generateMeetingPDF, emailMeetingMinutes } from '../services/n8nIntegration';
import { db } from '../services/firebase';

const router = Router();

// Configure multer for large files
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 500 * 1024 * 1024, // 500MB max
    fieldSize: 500 * 1024 * 1024,
  },
});

/**
 * @swagger
 * /api/meetings/upload:
 *   post:
 *     summary: Upload and process meeting audio (async)
 *     description: Upload an audio file for background processing. Returns immediately with a job ID. Use /status endpoint to check progress.
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
 *                 description: Optional project ID
 *               attendeeIds:
 *                 type: string
 *                 description: JSON array of attendee IDs
 *     responses:
 *       202:
 *         description: Upload accepted, processing in background
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 jobId:
 *                   type: string
 *                 message:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [processing]
 *                 estimatedTimeSeconds:
 *                   type: integer
 *       400:
 *         description: Bad request
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
    const audioFile = req.file;

    console.log(`🎙️ Received audio upload from user ${userId}`);
    console.log(`   📄 Filename: ${audioFile.originalname}`);
    console.log(`   📦 Size: ${(audioFile.size / (1024 * 1024)).toFixed(2)} MB`);

    // Generate unique job ID
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    // Estimate processing time (rough: 5 seconds per MB)
    const estimatedTimeSeconds = Math.ceil(audioFile.size / (1024 * 1024) * 5);

    // Start background processing (don't await!)
    processAudioInBackground(
      jobId,
      audioFile.buffer,
      userId,
      {
        filename: audioFile.originalname,
        size: audioFile.size,
        title,
        projectId,
        attendeeIds: attendeeIds ? JSON.parse(attendeeIds) : [],
      }
    ).catch(err => {
      // Log error but don't crash server
      console.error(`❌ Background processing error for job ${jobId}:`, err);
    });

    // Return immediately with 202 Accepted
    return res.status(202).json({
      success: true,
      jobId,
      message: 'Audio upload received. Processing in background.',
      status: 'processing',
      estimatedTimeSeconds,
      filename: audioFile.originalname,
    });

  } catch (error: any) {
    console.error('Meeting upload error:', error);
    return res.status(500).json({ 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @swagger
 * /api/meetings/status/{jobId}:
 *   get:
 *     summary: Check processing status
 *     description: Check the status of a background processing job
 *     tags: [Meetings]
 *     security:
 *       - UserAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID returned from upload
 *     responses:
 *       200:
 *         description: Job status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 jobId:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [processing, completed, failed]
 *                 progress:
 *                   type: integer
 *                   minimum: 0
 *                   maximum: 100
 *                 meetingId:
 *                   type: string
 *                 error:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 completedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Job not found
 *       403:
 *         description: Forbidden
 */
router.get('/status/:jobId', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { jobId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get job from Firestore
    const jobDoc = await db.collection('processing_jobs').doc(jobId).get();
    
    if (!jobDoc.exists) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = jobDoc.data();
    
    // Verify ownership
    if (job?.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.json({
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      meetingId: job.meetingId,
      error: job.error,
      filename: job.filename,
      fileSize: job.fileSize,
      retryAttempt: job.retryAttempt,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    });

  } catch (error: any) {
    console.error('Status check error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/meetings/retry/{jobId}:
 *   post:
 *     summary: Retry failed job
 *     description: Retry processing a failed job (requires local storage implementation)
 *     tags: [Meetings]
 *     security:
 *       - UserAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Failed job ID
 *     responses:
 *       200:
 *         description: Retry initiated
 *       404:
 *         description: Job not found
 *       400:
 *         description: Job cannot be retried
 *       501:
 *         description: Feature not implemented
 */
router.post('/retry/:jobId', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { jobId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const jobDoc = await db.collection('processing_jobs').doc(jobId).get();
    
    if (!jobDoc.exists) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = jobDoc.data();
    
    if (job?.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!job.canRetry) {
      return res.status(400).json({ 
        error: 'Job cannot be retried. Local file may not be available.' 
      });
    }

    // Note: This requires implementing local storage service
    // For now, return 501 Not Implemented
    return res.status(501).json({ 
      error: 'Retry feature requires local storage implementation',
      message: 'Please re-upload the audio file to retry processing',
      jobId: jobId
    });

  } catch (error: any) {
    console.error('Retry error:', error);
    return res.status(500).json({ error: error.message });
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
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = parseInt(req.query.limit as string) || 50;

    const snapshot = await db
      .collection('meeting_minutes')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
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