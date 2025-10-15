import { Router } from 'express';
import multer from 'multer';
import { processBusinessCard } from '../services/businessCardProcessor';
import { db } from '../services/firebase';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * /api/business-card/scan:
 *   post:
 *     summary: Scan business card
 *     description: Upload a business card image to extract contact information using OCR
 *     tags: [Business Card]
 *     security:
 *       - UserAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Business card image (jpg, png, etc.)
 *     responses:
 *       200:
 *         description: Business card processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 contact:
 *                   $ref: '#/components/schemas/Contact'
 *                 contactId:
 *                   type: string
 *                 syncedToGoogle:
 *                   type: boolean
 *       400:
 *         description: No image provided
 *       401:
 *         description: Unauthorized
 */
router.post('/scan', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized - x-user-id header required' });
    }

    console.log(`📇 Processing business card for user ${userId}`);

    const result = await processBusinessCard(req.file.buffer, userId);
    
    return res.json({
      success: true,
      contact: result.contact,
      contactId: result.contactId,
      syncedToGoogle: result.syncedToGoogle,
    });
  } catch (error: any) {
    console.error('Business card processing error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/business-card/history:
 *   get:
 *     summary: Get business card scan history
 *     description: Retrieve all contacts created from business card scans
 *     tags: [Business Card]
 *     security:
 *       - UserAuth: []
 *     responses:
 *       200:
 *         description: List of scanned business cards
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cards:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Contact'
 *                 count:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/history', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const snapshot = await db
      .collection('contacts')
      .where('userId', '==', userId)
      .where('source', '==', 'business_card_ocr')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const cards = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({ cards, count: cards.length });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;