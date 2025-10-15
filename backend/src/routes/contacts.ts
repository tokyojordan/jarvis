import { Router } from 'express';
import { syncAllGoogleContacts, syncToGoogleContacts } from '../services/googleContacts';
import admin, { db } from '../services/firebase';
import { Contact, getDisplayName } from '../models/types';

const router = Router();

/**
 * @swagger
 * /api/contacts/sync/google:
 *   post:
 *     summary: Sync Google Contacts
 *     description: Import all contacts from Google Contacts with full field support
 *     tags: [Contacts]
 *     security:
 *       - UserAuth: []
 *     responses:
 *       200:
 *         description: Contacts synced successfully
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

    console.log(`📧 Syncing Google contacts for user ${userId}`);
    const result = await syncAllGoogleContacts(userId);
    
    return res.json({ 
      success: true,
      count: result.count,
      message: `Synced ${result.count} contacts from Google` 
    });
  } catch (error: any) {
    console.error('Google contacts sync error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/contacts:
 *   get:
 *     summary: Get all contacts
 *     description: Retrieve all contacts for the authenticated user
 *     tags: [Contacts]
 *     security:
 *       - UserAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, or phone
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [manual, business_card_ocr, google_contacts, import]
 *         description: Filter by source
 *       - in: query
 *         name: hasEmail
 *         schema:
 *           type: boolean
 *         description: Filter contacts with email addresses
 *       - in: query
 *         name: hasPhone
 *         schema:
 *           type: boolean
 *         description: Filter contacts with phone numbers
 *     responses:
 *       200:
 *         description: List of contacts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 contacts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Contact'
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

    const { search, source, hasEmail, hasPhone } = req.query;

    let query = db
      .collection('contacts')
      .where('userId', '==', userId);

    // Apply filters
    if (source) {
      query = query.where('source', '==', source);
    }

    // Try to order by createdAt, but handle missing index gracefully
    let snapshot;
    try {
      snapshot = await query.orderBy('createdAt', 'desc').get();
    } catch (error: any) {
      // If index doesn't exist, fetch without ordering
      console.warn('Firestore index missing for createdAt ordering, fetching unordered');
      snapshot = await query.get();
    }

    let contacts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Contact[];

    // Sort in memory if we couldn't sort in the query
    if (contacts.length > 0 && !contacts[0].createdAt) {
      console.warn('Contacts missing createdAt field');
    } else {
      contacts.sort((a, b) => {
        const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return bTime - aTime;
      });
    }

    // Client-side filtering for complex queries
    if (search) {
      const searchLower = (search as string).toLowerCase();
      contacts = contacts.filter(contact => {
        const displayName = getDisplayName(contact).toLowerCase();
        const emails = contact.emailAddresses?.map((e: any) => e.value.toLowerCase()).join(' ') || '';
        const phones = contact.phoneNumbers?.map((p: any) => p.value).join(' ') || '';
        
        return displayName.includes(searchLower) || 
               emails.includes(searchLower) || 
               phones.includes(searchLower);
      });
    }

    if (hasEmail === 'true') {
      contacts = contacts.filter(c => c.emailAddresses && c.emailAddresses.length > 0);
    }

    if (hasPhone === 'true') {
      contacts = contacts.filter(c => c.phoneNumbers && c.phoneNumbers.length > 0);
    }

    return res.json({ contacts, count: contacts.length });
  } catch (error: any) {
    console.error('Get contacts error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/contacts:
 *   post:
 *     summary: Create a new contact
 *     description: Create a new contact with full Google Contacts field support
 *     tags: [Contacts]
 *     security:
 *       - UserAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *               names:
 *                 type: array
 *                 items:
 *                   type: object
 *               emailAddresses:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     value:
 *                       type: string
 *                     type:
 *                       type: string
 *               phoneNumbers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     value:
 *                       type: string
 *                     type:
 *                       type: string
 *               addresses:
 *                 type: array
 *                 items:
 *                   type: object
 *               organizations:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Contact created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const contactData: Partial<Contact> = {
      ...req.body,
      userId,
      source: req.body.source || 'manual',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection('contacts').add(contactData);
    const newContact = { id: docRef.id, ...contactData };

    return res.status(201).json({ 
      success: true,
      contact: newContact,
      message: 'Contact created successfully' 
    });
  } catch (error: any) {
    console.error('Create contact error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/contacts/{id}:
 *   get:
 *     summary: Get a specific contact
 *     description: Retrieve details of a specific contact by ID
 *     tags: [Contacts]
 *     security:
 *       - UserAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact ID
 *     responses:
 *       200:
 *         description: Contact details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 contact:
 *                   $ref: '#/components/schemas/Contact'
 *       404:
 *         description: Contact not found
 *       403:
 *         description: Forbidden
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const doc = await db.collection('contacts').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const contactData = doc.data();
    const contact = { id: doc.id, ...contactData };
    
    if (contactData?.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.json({ contact });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/contacts/{id}:
 *   patch:
 *     summary: Update a contact
 *     description: Update contact information with support for all Google Contacts fields
 *     tags: [Contacts]
 *     security:
 *       - UserAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *               emailAddresses:
 *                 type: array
 *               phoneNumbers:
 *                 type: array
 *               addresses:
 *                 type: array
 *               syncToGoogle:
 *                 type: boolean
 *                 description: If true, also sync changes to Google Contacts
 *     responses:
 *       200:
 *         description: Contact updated successfully
 *       404:
 *         description: Contact not found
 *       403:
 *         description: Forbidden
 */
router.patch('/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const doc = await db.collection('contacts').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const contact = doc.data();
    if (contact?.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Remove syncToGoogle flag from data to be saved
    const { syncToGoogle, ...dataToSave } = updateData;

    await db.collection('contacts').doc(id).update(dataToSave);

    // Optionally sync to Google if requested
    if (syncToGoogle && contact?.googleResourceName) {
      const updatedDoc = await db.collection('contacts').doc(id).get();
      await syncToGoogleContacts(updatedDoc.data() as Contact, userId, id);
    }

    return res.json({ success: true, message: 'Contact updated' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/contacts/{id}:
 *   delete:
 *     summary: Delete a contact
 *     description: Delete a contact permanently
 *     tags: [Contacts]
 *     security:
 *       - UserAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact ID
 *     responses:
 *       200:
 *         description: Contact deleted successfully
 *       404:
 *         description: Contact not found
 *       403:
 *         description: Forbidden
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const doc = await db.collection('contacts').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const contact = doc.data();
    if (contact?.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await db.collection('contacts').doc(id).delete();
    return res.json({ success: true, message: 'Contact deleted' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/contacts/{id}/sync-to-google:
 *   post:
 *     summary: Sync contact to Google
 *     description: Push a single contact to Google Contacts
 *     tags: [Contacts]
 *     security:
 *       - UserAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact ID
 *     responses:
 *       200:
 *         description: Contact synced to Google successfully
 *       404:
 *         description: Contact not found
 *       403:
 *         description: Forbidden
 */
router.post('/:id/sync-to-google', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const doc = await db.collection('contacts').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const contactData = doc.data();
    if (contactData?.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await syncToGoogleContacts(contactData as Contact, userId, id);

    return res.json({ 
      success: true, 
      message: 'Contact synced to Google successfully' 
    });
  } catch (error: any) {
    console.error('Sync to Google error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;