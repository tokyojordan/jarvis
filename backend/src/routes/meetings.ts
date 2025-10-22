// backend/src/routes/meetings.ts

import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { processAudioInBackground } from '../services/backgroundProcessor';
import { generateMeetingPDF, emailMeetingMinutes } from '../services/n8nIntegration';
import { db } from '../services/firebase';
import * as gcsStorage from '../services/gcsStorage';

const router = Router();

// Configure multer for web uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max
  },
});

/**
 * @swagger
 * /api/meetings/upload-url:
 *   post:
 *     summary: Get signed URL for direct GCS upload (Capacitor)
 *     description: Mobile apps upload directly to GCS using signed URL
 *     tags: [Meetings]
 *     security:
 *       - UserAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filename:
 *                 type: string
 *               fileSize:
 *                 type: number
 *               fileHash:
 *                 type: string
 *               contentType:
 *                 type: string
 *     responses:
 *       200:
 *         description: Signed URL generated
 */
router.post('/upload-url', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { filename, fileSize, fileHash, contentType } = req.body;

    if (!filename || !fileSize || !fileHash) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`📱 Mobile upload request from ${userId}`);
    console.log(`   📄 File: ${filename} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

    // Generate signed URL for direct upload
    const signedUrl = await gcsStorage.generateSignedUploadUrl(
      filename,
      userId,
      fileHash,
      { contentType }
    );

    // Create upload metadata record
    await db.collection('upload_metadata').doc(signedUrl.uploadId).set({
      uploadId: signedUrl.uploadId,
      userId,
      filename,
      fileSize,
      fileHash,
      gcsPath: signedUrl.gcsPath,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: 3,
    });

    return res.json({
      success: true,
      ...signedUrl,
    });
  } catch (error: any) {
    console.error('❌ Upload URL generation error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/meetings/upload-complete:
 *   post:
 *     summary: Confirm upload complete and start processing
 *     description: Called after mobile app uploads to GCS
 *     tags: [Meetings]
 *     security:
 *       - UserAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               uploadId:
 *                 type: string
 *               gcsPath:
 *                 type: string
 *               title:
 *                 type: string
 *               projectId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Processing started
 */
router.post('/upload-complete', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { uploadId, gcsPath, title, projectId } = req.body;

    if (!uploadId || !gcsPath) {
      return res.status(400).json({ error: 'Missing uploadId or gcsPath' });
    }

    console.log(`✅ Upload complete notification from ${userId}`);
    console.log(`   🆔 Upload ID: ${uploadId}`);
    console.log(`   📦 GCS Path: ${gcsPath}`);

    // Verify file exists in GCS
    const exists = await gcsStorage.fileExists(gcsPath);
    if (!exists) {
      return res.status(404).json({ error: 'File not found in GCS' });
    }

    // Get upload metadata
    const uploadDoc = await db.collection('upload_metadata').doc(uploadId).get();
    if (!uploadDoc.exists) {
      return res.status(404).json({ error: 'Upload metadata not found' });
    }

    const uploadData = uploadDoc.data();

    // Verify ownership
    if (uploadData?.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Update upload metadata
    await db.collection('upload_metadata').doc(uploadId).update({
      status: 'completed',
      progress: 100,
      uploadedAt: new Date(),
    });

    // Check for override flag
    const skipDuplicateCheck = req.query.skipDuplicateCheck === 'true' || req.body.skipDuplicateCheck === 'true';

    if (skipDuplicateCheck) {
      console.log(`⚠️  Skipping duplicate check (override enabled)`);
    }

    // Check for duplicate (unless override)
    if (!skipDuplicateCheck) {
      const existingMeeting = await db
        .collection('meeting_minutes')
        .where('userId', '==', userId)
        .where('fileHash', '==', uploadData.fileHash)
        .limit(1)
        .get();

      if (!existingMeeting.empty) {
        const existing = existingMeeting.docs[0];
        console.log(`⚠️  Duplicate file detected. Existing meeting: ${existing.id}`);

        // Delete the duplicate from GCS
        await gcsStorage.deleteFile(gcsPath);

        return res.status(409).json({
          error: 'Duplicate file',
          message: 'This file has already been processed.',
          meetingId: existing.id,
        });
      }
    }

    // Start background processing
    const jobId = `job-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    processAudioInBackground(
      jobId,
      gcsPath,
      userId,
      {
        filename: uploadData.filename,
        size: uploadData.fileSize,
        fileHash: uploadData.fileHash,
        title,
        projectId,
      }
    ).catch(err => {
      console.error(`❌ Background processing error for job ${jobId}:`, err);
    });

    return res.json({
      success: true,
      jobId,
      message: 'Processing started',
      estimatedTimeSeconds: Math.ceil(uploadData.fileSize / (1024 * 1024) * 5),
    });
  } catch (error: any) {
    console.error('❌ Upload complete error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/meetings/upload:
 *   post:
 *     summary: Upload audio directly (Web browser)
 *     tags: [Meetings]
 *     security:
 *       - UserAuth: []
 *     parameters:
 *       - in: query
 *         name: skipDuplicateCheck
 *         schema:
 *           type: boolean
 *         description: Skip duplicate file check (for testing)
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
 *     responses:
 *       202:
 *         description: Upload accepted, processing in background
 */
router.post('/upload', upload.single('audio'), async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    console.log(`📊 Original filename: ${req.file.originalname}`);
    console.log(`📊 Uploaded size: ${req.file.size} bytes`);
    console.log(`📊 Buffer length: ${req.file.buffer.length} bytes`);
    console.log(`📊 Expected size from headers: ${req.headers['content-length']}`);

    const { title, projectId, attendeeIds } = req.body;
    const audioFile = req.file;

    console.log(`🌐 Web upload from ${userId}`);
    console.log(`   📄 File: ${audioFile.originalname} (${(audioFile.size / 1024 / 1024).toFixed(2)} MB)`);

    // Calculate file hash
    const fileHash = crypto
      .createHash('sha256')
      .update(audioFile.buffer)
      .digest('hex');

    console.log(`   🔐 Hash: ${fileHash}`);

    // Check for override flag
    const skipDuplicateCheck = req.query.skipDuplicateCheck === 'true' || req.body.skipDuplicateCheck === 'true';

    if (skipDuplicateCheck) {
      console.log(`⚠️  Skipping duplicate check (override enabled)`);
    }

    // Check for duplicates (unless override)
    if (!skipDuplicateCheck) {
      const existingMeeting = await db
        .collection('meeting_minutes')
        .where('userId', '==', userId)
        .where('fileHash', '==', fileHash)
        .limit(1)
        .get();

      if (!existingMeeting.empty) {
        const existing = existingMeeting.docs[0];
        console.log(`⚠️  Duplicate detected: ${existing.id}`);
        return res.status(409).json({
          error: 'Duplicate file',
          message: 'This file has already been processed.',
          meetingId: existing.id,
        });
      }
    }
    // Upload to GCS
    const gcsPath = await gcsStorage.uploadFile(
      audioFile.buffer,
      userId,
      audioFile.originalname,
      fileHash,
      { contentType: audioFile.mimetype }
    );

    // Start background processing
    const jobId = `job-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    processAudioInBackground(
      jobId,
      gcsPath,
      userId,
      {
        filename: audioFile.originalname,
        size: audioFile.size,
        fileHash,
        title,
        projectId,
        attendeeIds: attendeeIds ? JSON.parse(attendeeIds) : [],
      }
    ).catch(err => {
      console.error(`❌ Background processing error for job ${jobId}:`, err);
    });

    return res.status(202).json({
      success: true,
      jobId,
      gcsPath,
      message: 'Audio uploaded. Processing in background.',
      estimatedTimeSeconds: Math.ceil(audioFile.size / (1024 * 1024) * 5),
    });
  } catch (error: any) {
    console.error('❌ Upload error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/meetings/status/{jobId}:
 *   get:
 *     summary: Check processing status
 *     tags: [Meetings]
 */
router.get('/status/:jobId', async (req, res) => {
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

    return res.json({
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      meetingId: job.meetingId,
      error: job.error,
      gcsPath: job.gcsPath,
      canRetry: job.canRetry,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/meetings:
 *   get:
 *     summary: Get all meetings
 *     tags: [Meetings]
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
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/meetings/{id}:
 *   get:
 *     summary: Get specific meeting
 *     tags: [Meetings]
 */
router.get('/:id', async (req, res) => {
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

    return res.json({ meeting: { id: doc.id, ...meeting } });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/meetings/{id}/generate-pdf:
 *   post:
 *     summary: Generate PDF via n8n
 *     tags: [Meetings]
 */
router.post('/:id/generate-pdf', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📄 Generating PDF for meeting ${id}`);
    const result = await generateMeetingPDF(id);

    return res.json({
      success: true,
      message: 'PDF generated',
      pdfUrl: result.pdfUrl,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/meetings/{id}/email:
 *   post:
 *     summary: Email meeting minutes via n8n
 *     tags: [Meetings]
 */
router.post('/:id/email', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📧 Emailing minutes for ${id}`);
    await emailMeetingMinutes(id);

    return res.json({
      success: true,
      message: 'Email sent',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/meetings/{id}:
 *   delete:
 *     summary: Delete meeting
 *     tags: [Meetings]
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

    // Delete from GCS if path exists
    if (meeting.gcsPath) {
      try {
        await gcsStorage.deleteFile(meeting.gcsPath);
      } catch (error) {
        console.error('Error deleting GCS file:', error);
      }
    }

    // Delete from Firestore
    await db.collection('meeting_minutes').doc(id).delete();

    return res.json({ success: true, message: 'Meeting deleted' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/meetings/:id/transcript
 * Download transcript markdown file
 */
router.get('/:id/transcript', async (req, res) => {
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

    if (!meeting.gcsTranscriptPath) {
      return res.status(404).json({ error: 'Transcript not found' });
    }

    // Generate signed download URL
    const downloadUrl = await gcsStorage.generateSignedDownloadUrl(
      meeting.gcsTranscriptPath,
      60 // 60 minutes
    );

    return res.json({
      success: true,
      downloadUrl,
      filename: `${meeting.title?.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'transcript'}-${id}.md`,
      contentType: 'text/markdown',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;