import { google } from 'googleapis';
import { db } from './firebase';

/**
 * Remove undefined values from an object recursively
 */
function removeUndefined(obj: any): any {
  if (obj === null || obj === undefined) {
    return undefined;
  }
  
  // Preserve Date objects
  if (obj instanceof Date) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined).filter(item => item !== undefined);
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      const value = removeUndefined(obj[key]);
      if (value !== undefined) {
        cleaned[key] = value;
      }
    }
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }
  
  return obj;
}

export async function syncGoogleCalendar(
  userId: string,
  startDate?: Date,
  endDate?: Date
) {
  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.data();
  
  if (!userData?.googleTokens) {
    throw new Error('User not authenticated with Google');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials(userData.googleTokens);

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // Default: Last 30 days to next 90 days
  const timeMin = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const timeMax = endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    maxResults: 500,
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = response.data.items || [];
  console.log(`📥 Fetched ${events.length} calendar events from Google`);

  let batch = db.batch();
  let batchCount = 0;
  const batchLimit = 500;

  for (const event of events) {
    // Parse start and end times
    const startTime = event.start?.dateTime 
      ? new Date(event.start.dateTime)
      : event.start?.date 
        ? new Date(event.start.date)
        : new Date();

    const endTime = event.end?.dateTime 
      ? new Date(event.end.dateTime)
      : event.end?.date 
        ? new Date(event.end.date)
        : new Date();

    const eventData = {
      userId,
      source: 'google_calendar',
      googleEventId: event.id,
      title: event.summary || 'Untitled Event',
      description: event.description,
      location: event.location,
      startTime,
      endTime,
      timezone: event.start?.timeZone || event.end?.timeZone,
      attendees: event.attendees?.map((a: any) => a.email) || [],
      organizer: event.organizer?.email,
      status: event.status,
      htmlLink: event.htmlLink,
      meetingMinutesId: undefined, // Can be linked later
      createdAt: event.created ? new Date(event.created) : new Date(),
      updatedAt: event.updated ? new Date(event.updated) : new Date(),
      syncedAt: new Date(),
    };

    // Remove undefined values
    const cleanedData = removeUndefined(eventData);

    // Check if event already exists
    const existingQuery = await db
      .collection('calendar_events')
      .where('userId', '==', userId)
      .where('googleEventId', '==', event.id)
      .limit(1)
      .get();

    if (!existingQuery.empty) {
      // Update existing
      const docRef = existingQuery.docs[0].ref;
      batch.update(docRef, {
        ...cleanedData,
        updatedAt: new Date(),
      });
    } else {
      // Create new with Google event ID as document ID
      const docRef = db.collection('calendar_events').doc(event.id!);
      batch.set(docRef, cleanedData);
    }

    batchCount++;

    // Commit batch if we hit the limit
    if (batchCount >= batchLimit) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  // Commit remaining items
  if (batchCount > 0) {
    await batch.commit();
  }

  return { count: events.length };
}

/**
 * Create a manual calendar event (not from Google)
 */
export async function createManualEvent(
  userId: string,
  eventData: {
    title: string;
    description?: string;
    location?: string;
    startTime: Date;
    endTime: Date;
    attendees?: string[];
  }
) {
  const event = {
    userId,
    source: 'manual',
    ...eventData,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const cleanedData = removeUndefined(event);
  const docRef = await db.collection('calendar_events').add(cleanedData);

  return { id: docRef.id, ...cleanedData };
}