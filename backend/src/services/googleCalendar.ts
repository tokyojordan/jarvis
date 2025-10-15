import { google } from 'googleapis';
import admin, { db } from './firebase';

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
  const batch = db.batch();

  for (const event of events) {
    const eventData = {
      userId,
      source: 'google_calendar',
      googleEventId: event.id,
      title: event.summary || 'Untitled Event',
      description: event.description || '',
      location: event.location || '',
      startTime: event.start?.dateTime || event.start?.date,
      endTime: event.end?.dateTime || event.end?.date,
      attendees: event.attendees?.map((a: any) => a.email) || [],
      organizer: event.organizer?.email || '',
      status: event.status,
      htmlLink: event.htmlLink,
      syncedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = db.collection('calendar_events').doc(event.id!);
    batch.set(docRef, eventData, { merge: true });
  }

  await batch.commit();

  return { count: events.length };
}