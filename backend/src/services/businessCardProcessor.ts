import vision from '@google-cloud/vision';
import OpenAI from 'openai';
import admin, { db } from './firebase';
import { syncToGoogleContacts } from './googleContacts';
import { Contact } from '../models/types';

const visionClient = new vision.ImageAnnotatorClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function processBusinessCard(imageBuffer: Buffer, userId: string) {
  try {
    const [result] = await visionClient.textDetection(imageBuffer);
    const detections = result.textAnnotations;
    
    if (!detections || detections.length === 0) {
      throw new Error('No text detected in image');
    }

    const rawText = detections[0].description || '';
    const parsedData = await parseWithGPT(rawText);

    // Convert parsed data to new Contact model
    const contactData: Partial<Contact> = {
      userId,
      source: 'business_card_ocr',
      createdAt: new Date(),
      syncedToGoogle: false,
    };

    // Add name
    if (parsedData.name) {
      const nameParts = parsedData.name.split(' ');
      contactData.names = [{
        displayName: parsedData.name,
        givenName: nameParts[0],
        familyName: nameParts.slice(1).join(' ') || undefined,
      }];
      contactData.displayName = parsedData.name;
    }

    // Add email
    if (parsedData.email) {
      contactData.emailAddresses = [{
        value: parsedData.email,
        type: 'work',
      }];
    }

    // Add phone
    if (parsedData.phone) {
      contactData.phoneNumbers = [{
        value: parsedData.phone,
        type: 'work',
      }];
    }

    // Add address
    if (parsedData.address) {
      contactData.addresses = [{
        type: 'work',
        formattedValue: parsedData.address,
      }];
    }

    // Add organization
    if (parsedData.company || parsedData.title) {
      contactData.organizations = [{
        name: parsedData.company,
        title: parsedData.title,
        type: 'work',
        current: true,
      }];
    }

    // Add website
    if (parsedData.website) {
      contactData.websites = [{
        value: parsedData.website,
        type: 'work',
      }];
    }

    // Add LinkedIn as social profile
    if (parsedData.linkedin) {
      contactData.socialProfiles = [{
        value: parsedData.linkedin,
        type: 'linkedin',
        url: parsedData.linkedin.startsWith('http') 
          ? parsedData.linkedin 
          : `https://linkedin.com/in/${parsedData.linkedin}`,
      }];
    }

    // Add raw OCR text as notes
    contactData.notes = `Raw OCR Text:\n${rawText}`;

    const docRef = await db.collection('contacts').add(contactData);

    let syncedToGoogle = false;
    try {
      // Fetch the complete contact with the generated ID
      const savedContact = { id: docRef.id, ...contactData } as Contact;
      await syncToGoogleContacts(savedContact, userId, docRef.id);
      syncedToGoogle = true;
      
      // Update sync status
      await docRef.update({ 
        syncedToGoogle: true,
        syncedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (syncError) {
      console.error('Google Contacts sync failed:', syncError);
    }

    return {
      contact: contactData,
      contactId: docRef.id,
      syncedToGoogle,
    };
  } catch (error) {
    console.error('Business card processing error:', error);
    throw error;
  }
}

async function parseWithGPT(rawText: string) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Extract contact information from business card text. Return JSON with: name, title, company, email, phone, address, website, linkedin. Handle both English and Japanese text.`,
      },
      {
        role: 'user',
        content: `Extract contact information:\n\n${rawText}`,
      },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const parsed = JSON.parse(completion.choices[0].message.content || '{}');
  
  return {
    name: parsed.name || '',
    title: parsed.title || '',
    company: parsed.company || '',
    email: parsed.email || '',
    phone: parsed.phone || '',
    address: parsed.address || '',
    website: parsed.website || '',
    linkedin: parsed.linkedin || '',
  };
}