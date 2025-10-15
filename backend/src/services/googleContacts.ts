import { google } from 'googleapis';
import admin, { db } from './firebase';
import { Contact } from '../models/types';

/**
 * Convert our Contact model to Google People API format
 */
function contactToGooglePerson(contact: Contact) {
  const person: any = {};

  // Names
  if (contact.names && contact.names.length > 0) {
    person.names = contact.names.map(name => ({
      givenName: name.givenName,
      familyName: name.familyName,
      middleName: name.middleName,
      honorificPrefix: name.honorificPrefix,
      honorificSuffix: name.honorificSuffix,
      displayName: name.displayName,
      phoneticGivenName: name.phoneticGivenName,
      phoneticFamilyName: name.phoneticFamilyName,
      phoneticMiddleName: name.phoneticMiddleName,
    }));
  }

  // Nicknames
  if (contact.nicknames && contact.nicknames.length > 0) {
    person.nicknames = contact.nicknames.map(n => ({
      value: n.value,
      type: n.type,
    }));
  }

  // Email Addresses
  if (contact.emailAddresses && contact.emailAddresses.length > 0) {
    person.emailAddresses = contact.emailAddresses.map(email => ({
      value: email.value,
      type: email.type === 'custom' ? email.customType : email.type,
      displayName: email.displayName,
    }));
  }

  // Phone Numbers
  if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
    person.phoneNumbers = contact.phoneNumbers.map(phone => ({
      value: phone.value,
      type: phone.type === 'custom' ? phone.customType : phone.type,
    }));
  }

  // Addresses
  if (contact.addresses && contact.addresses.length > 0) {
    person.addresses = contact.addresses.map(addr => ({
      type: addr.type === 'custom' ? addr.customType : addr.type,
      formattedValue: addr.formattedValue,
      streetAddress: addr.streetAddress,
      extendedAddress: addr.extendedAddress,
      poBox: addr.poBox,
      city: addr.city,
      region: addr.region,
      postalCode: addr.postalCode,
      country: addr.country,
      countryCode: addr.countryCode,
    }));
  }

  // Organizations
  if (contact.organizations && contact.organizations.length > 0) {
    person.organizations = contact.organizations.map(org => ({
      name: org.name,
      title: org.title,
      department: org.department,
      symbol: org.symbol,
      domain: org.domain,
      jobDescription: org.jobDescription,
      location: org.location,
      type: org.type === 'custom' ? org.customType : org.type,
      current: org.current,
      startDate: org.startDate ? {
        year: org.startDate.getFullYear(),
        month: org.startDate.getMonth() + 1,
        day: org.startDate.getDate(),
      } : undefined,
      endDate: org.endDate ? {
        year: org.endDate.getFullYear(),
        month: org.endDate.getMonth() + 1,
        day: org.endDate.getDate(),
      } : undefined,
    }));
  }

  // Websites & URLs
  if (contact.websites && contact.websites.length > 0) {
    person.urls = contact.websites.map(url => ({
      value: url.value,
      type: url.type === 'custom' ? url.customType : url.type,
    }));
  }

  // Social Profiles (added as URLs)
  if (contact.socialProfiles && contact.socialProfiles.length > 0) {
    person.urls = person.urls || [];
    person.urls.push(...contact.socialProfiles.map(social => ({
      value: social.url || social.value,
      type: 'profile',
    })));
  }

  // Birthdays
  if (contact.birthdays && contact.birthdays.length > 0) {
    person.birthdays = contact.birthdays.map(bday => ({
      date: bday.date,
      text: bday.text,
    }));
  }

  // Events (anniversaries, etc.)
  if (contact.events && contact.events.length > 0) {
    person.events = contact.events.map(evt => ({
      date: evt.date,
      type: evt.type === 'custom' ? evt.customType : evt.type,
    }));
  }

  // Relations
  if (contact.relations && contact.relations.length > 0) {
    person.relations = contact.relations.map(rel => ({
      person: rel.person,
      type: rel.type === 'custom' ? rel.customType : rel.type,
    }));
  }

  // Biographies
  if (contact.biographies && contact.biographies.length > 0) {
    person.biographies = contact.biographies.map(bio => ({
      value: bio.value,
      contentType: bio.contentType,
    }));
  }

  // Genders
  if (contact.genders && contact.genders.length > 0) {
    person.genders = contact.genders.map(g => ({
      value: g.value,
      formattedValue: g.formattedValue,
    }));
  }

  // Interests
  if (contact.interests && contact.interests.length > 0) {
    person.interests = contact.interests.map(i => ({ value: i }));
  }

  // Occupations
  if (contact.occupations && contact.occupations.length > 0) {
    person.occupations = contact.occupations.map(o => ({ value: o }));
  }

  // Skills
  if (contact.skills && contact.skills.length > 0) {
    person.skills = contact.skills.map(s => ({ value: s }));
  }

  // Custom Fields (User Defined)
  if (contact.userDefined && contact.userDefined.length > 0) {
    person.userDefined = contact.userDefined.map(field => ({
      key: field.key,
      value: field.value,
    }));
  }

  return person;
}

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

/**
 * Convert Google People API person to our Contact model
 */
function googlePersonToContact(person: any, userId: string): Partial<Contact> {
  const contact: Partial<Contact> = {
    userId,
    source: 'google_contacts',
    googleContactId: person.resourceName?.split('/')[1] || undefined,
    googleResourceName: person.resourceName,
    etag: person.etag,
  };

  // Extract creation date from metadata
  if (person.metadata?.sources) {
    const primarySource = person.metadata.sources.find((s: any) => s.type === 'CONTACT');
    if (primarySource?.updateTime) {
      contact.createdAt = new Date(primarySource.updateTime);
      contact.updatedAt = new Date(primarySource.updateTime);
    }
  }

  // Names
  if (person.names && person.names.length > 0) {
    contact.names = person.names.map((name: any) => ({
      givenName: name.givenName,
      familyName: name.familyName,
      middleName: name.middleName,
      honorificPrefix: name.honorificPrefix,
      honorificSuffix: name.honorificSuffix,
      displayName: name.displayName,
      displayNameLastFirst: name.displayNameLastFirst,
      phoneticGivenName: name.phoneticGivenName,
      phoneticFamilyName: name.phoneticFamilyName,
      phoneticMiddleName: name.phoneticMiddleName,
      phoneticFullName: name.phoneticFullName,
    }));
    contact.displayName = person.names[0].displayName;
  }

  // Nicknames
  if (person.nicknames && person.nicknames.length > 0) {
    contact.nicknames = person.nicknames.map((n: any) => ({
      value: n.value,
      type: n.type,
    }));
  }

  // Email Addresses
  if (person.emailAddresses && person.emailAddresses.length > 0) {
    contact.emailAddresses = person.emailAddresses.map((email: any) => ({
      value: email.value,
      type: email.type || 'other',
      customType: email.type === 'custom' ? email.formattedType : undefined,
      displayName: email.displayName,
      formattedType: email.formattedType,
    }));
  }

  // Phone Numbers
  if (person.phoneNumbers && person.phoneNumbers.length > 0) {
    contact.phoneNumbers = person.phoneNumbers.map((phone: any) => ({
      value: phone.value,
      canonicalForm: phone.canonicalForm,
      type: phone.type || 'other',
      customType: phone.type === 'custom' ? phone.formattedType : undefined,
      formattedType: phone.formattedType,
    }));
  }

  // Addresses
  if (person.addresses && person.addresses.length > 0) {
    contact.addresses = person.addresses.map((addr: any) => ({
      type: addr.type || 'other',
      customType: addr.type === 'custom' ? addr.formattedType : undefined,
      formattedType: addr.formattedType,
      formattedValue: addr.formattedValue,
      streetAddress: addr.streetAddress,
      extendedAddress: addr.extendedAddress,
      poBox: addr.poBox,
      city: addr.city,
      region: addr.region,
      postalCode: addr.postalCode,
      country: addr.country,
      countryCode: addr.countryCode,
    }));
  }

  // Organizations
  if (person.organizations && person.organizations.length > 0) {
    contact.organizations = person.organizations.map((org: any) => ({
      name: org.name,
      title: org.title,
      department: org.department,
      symbol: org.symbol,
      domain: org.domain,
      jobDescription: org.jobDescription,
      location: org.location,
      type: org.type || 'work',
      customType: org.type === 'custom' ? org.formattedType : undefined,
      current: org.current,
      startDate: org.startDate ? new Date(
        org.startDate.year,
        org.startDate.month - 1,
        org.startDate.day
      ) : undefined,
      endDate: org.endDate ? new Date(
        org.endDate.year,
        org.endDate.month - 1,
        org.endDate.day
      ) : undefined,
    }));
  }

  // Websites/URLs
  if (person.urls && person.urls.length > 0) {
    contact.websites = person.urls
      .filter((url: any) => url.type !== 'profile')
      .map((url: any) => ({
        value: url.value,
        type: url.type || 'other',
        customType: url.type === 'custom' ? url.formattedType : undefined,
        formattedType: url.formattedType,
      }));

    // Social profiles
    const socialUrls = person.urls.filter((url: any) => url.type === 'profile');
    if (socialUrls.length > 0) {
      contact.socialProfiles = socialUrls.map((url: any) => ({
        value: url.value,
        url: url.value,
        type: 'custom' as const,
      }));
    }
  }

  // Photos
  if (person.photos && person.photos.length > 0) {
    contact.photos = person.photos.map((photo: any) => ({
      url: photo.url,
      isDefault: photo.default,
    }));
  }

  // Birthdays
  if (person.birthdays && person.birthdays.length > 0) {
    contact.birthdays = person.birthdays.map((bday: any) => ({
      date: bday.date,
      text: bday.text,
    }));
  }

  // Events
  if (person.events && person.events.length > 0) {
    contact.events = person.events.map((evt: any) => ({
      date: evt.date,
      type: evt.type || 'other',
      customType: evt.type === 'custom' ? evt.formattedType : undefined,
      formattedType: evt.formattedType,
    }));
  }

  // Relations
  if (person.relations && person.relations.length > 0) {
    contact.relations = person.relations.map((rel: any) => ({
      person: rel.person,
      type: rel.type || 'other',
      customType: rel.type === 'custom' ? rel.formattedType : undefined,
      formattedType: rel.formattedType,
    }));
  }

  // Biographies
  if (person.biographies && person.biographies.length > 0) {
    contact.biographies = person.biographies.map((bio: any) => ({
      value: bio.value,
      contentType: bio.contentType,
    }));
  }

  // Genders
  if (person.genders && person.genders.length > 0) {
    contact.genders = person.genders.map((g: any) => ({
      value: g.value,
      formattedValue: g.formattedValue,
    }));
  }

  // Interests
  if (person.interests && person.interests.length > 0) {
    contact.interests = person.interests.map((i: any) => i.value);
  }

  // Occupations
  if (person.occupations && person.occupations.length > 0) {
    contact.occupations = person.occupations.map((o: any) => o.value);
  }

  // Skills
  if (person.skills && person.skills.length > 0) {
    contact.skills = person.skills.map((s: any) => s.value);
  }

  // User Defined Fields
  if (person.userDefined && person.userDefined.length > 0) {
    contact.userDefined = person.userDefined.map((field: any) => ({
      key: field.key,
      value: field.value,
    }));
  }

  return contact;
}

/**
 * Sync a single contact to Google Contacts
 */
export async function syncToGoogleContacts(
  contactData: Contact,
  userId: string,
  firestoreId: string
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
  const people = google.people({ version: 'v1', auth: oauth2Client });

  const person = contactToGooglePerson(contactData);

  let response;
  if (contactData.googleResourceName) {
    // Update existing contact
    response = await people.people.updateContact({
      resourceName: contactData.googleResourceName,
      updatePersonFields: Object.keys(person).join(','),
      requestBody: person,
    });
  } else {
    // Create new contact
    response = await people.people.createContact({
      requestBody: person,
    });
  }

  // Clean the update data to remove undefined values
  const updateData = removeUndefined({
    googleContactId: response.data.resourceName?.split('/')[1],
    googleResourceName: response.data.resourceName,
    syncedToGoogle: true,
    syncedAt: admin.firestore.FieldValue.serverTimestamp(),
    etag: response.data.etag,
  });

  await db.collection('contacts').doc(firestoreId).update(updateData);

  return response.data;
}

/**
 * Sync all contacts from Google Contacts
 */
export async function syncAllGoogleContacts(userId: string) {
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
  const people = google.people({ version: 'v1', auth: oauth2Client });

  // Request all available fields
  const personFields = [
    'names',
    'nicknames',
    'emailAddresses',
    'phoneNumbers',
    'addresses',
    'organizations',
    'urls',
    'biographies',
    'birthdays',
    'events',
    'genders',
    'relations',
    'userDefined',
    'interests',
    'occupations',
    'skills',
    'photos',
    'metadata'
  ].join(',');

  let allContacts: any[] = [];
  let pageToken: string | undefined;

  // Handle pagination
  do {
    const response = await people.people.connections.list({
      resourceName: 'people/me',
      pageSize: 1000,
      pageToken,
      personFields,
    });

    if (response.data.connections) {
      allContacts = allContacts.concat(response.data.connections);
    }

    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  console.log(`📥 Fetched ${allContacts.length} contacts from Google`);

  let batch = db.batch();
  let batchCount = 0;
  const batchLimit = 500; // Firestore batch limit

  for (const person of allContacts) {
    const contactData = googlePersonToContact(person, userId);
    
    // Ensure createdAt is set - MUST have a value
    if (!contactData.createdAt) {
      contactData.createdAt = new Date();
    }
    
    // Always set syncedAt to now
    contactData.syncedAt = new Date();

    console.log('Contact data before cleaning:', {
      displayName: contactData.displayName,
      createdAt: contactData.createdAt,
      syncedAt: contactData.syncedAt,
    });

    // Remove undefined values to prevent Firestore errors
    const cleanedData = removeUndefined(contactData);

    console.log('Contact data after cleaning:', {
      displayName: cleanedData.displayName,
      createdAt: cleanedData.createdAt,
      syncedAt: cleanedData.syncedAt,
    });

    // Check if contact already exists
    const existingQuery = await db
      .collection('contacts')
      .where('userId', '==', userId)
      .where('googleResourceName', '==', person.resourceName)
      .limit(1)
      .get();

    if (!existingQuery.empty) {
      // Update existing
      const docRef = existingQuery.docs[0].ref;
      batch.update(docRef, {
        ...cleanedData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Create new
      const docRef = db.collection('contacts').doc();
      batch.set(docRef, cleanedData);
    }

    batchCount++;

    // Commit batch if we hit the limit
    if (batchCount >= batchLimit) {
      await batch.commit();
      batch = db.batch(); // Create new batch
      batchCount = 0;
    }
  }

  // Commit remaining items
  if (batchCount > 0) {
    await batch.commit();
  }

  return { count: allContacts.length };
}