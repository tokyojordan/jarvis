// Updated Contact interface matching Google Contacts data model

export interface EmailAddress {
  value: string;
  type: 'home' | 'work' | 'other' | 'custom';
  customType?: string;
  displayName?: string;
  formattedType?: string;
}

export interface PhoneNumber {
  value: string;
  canonicalForm?: string;
  type: 'home' | 'work' | 'mobile' | 'homeFax' | 'workFax' | 'otherFax' | 'pager' | 'workMobile' | 'workPager' | 'main' | 'googleVoice' | 'other' | 'custom';
  customType?: string;
  formattedType?: string;
}

export interface Address {
  type: 'home' | 'work' | 'other' | 'custom';
  customType?: string;
  formattedType?: string;
  formattedValue?: string;
  streetAddress?: string;
  extendedAddress?: string; // Apartment, suite, etc.
  poBox?: string;
  city?: string;
  region?: string; // State/province
  postalCode?: string;
  country?: string;
  countryCode?: string;
}

export interface Organization {
  name?: string;
  title?: string;
  department?: string;
  symbol?: string; // Stock symbol
  domain?: string;
  jobDescription?: string;
  location?: string;
  type: 'work' | 'other' | 'custom';
  customType?: string;
  current?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface Website {
  value: string;
  type: 'homepage' | 'blog' | 'profile' | 'home' | 'work' | 'other' | 'ftp' | 'reservations' | 'appInstallPage' | 'custom';
  customType?: string;
  formattedType?: string;
}

export interface Name {
  givenName?: string; // First name
  familyName?: string; // Last name
  middleName?: string;
  honorificPrefix?: string; // Dr., Mr., Mrs., etc.
  honorificSuffix?: string; // Jr., Sr., III, etc.
  displayName?: string; // Full formatted name
  displayNameLastFirst?: string;
  phoneticGivenName?: string;
  phoneticFamilyName?: string;
  phoneticMiddleName?: string;
  phoneticFullName?: string;
}

export interface Nickname {
  value: string;
  type: 'default' | 'maidenName' | 'initials' | 'gplus' | 'otherName' | 'alternateName' | 'shortName';
}

export interface Birthday {
  date?: {
    year?: number;
    month: number; // 1-12
    day: number; // 1-31
  };
  text?: string;
}

export interface Event {
  date: {
    year?: number;
    month: number;
    day: number;
  };
  type: 'anniversary' | 'other' | 'custom';
  customType?: string;
  formattedType?: string;
}

export interface Relation {
  person: string;
  type: 'spouse' | 'child' | 'mother' | 'father' | 'parent' | 'brother' | 'sister' | 'friend' | 'relative' | 'domesticPartner' | 'manager' | 'assistant' | 'referredBy' | 'partner' | 'custom';
  customType?: string;
  formattedType?: string;
}

export interface CustomField {
  key: string;
  value: string;
}

export interface SocialProfile {
  value: string; // Username or URL
  type: 'linkedin' | 'twitter' | 'facebook' | 'instagram' | 'github' | 'medium' | 'custom';
  customType?: string;
  url?: string;
}

export interface Photo {
  url: string;
  isDefault?: boolean;
}

export interface Contact {
  id?: string;
  userId: string;
  
  // Core Identity
  names?: Name[];
  displayName?: string; // Computed from names[0] or set manually
  nicknames?: Nickname[];
  photos?: Photo[];
  
  // Communication
  emailAddresses?: EmailAddress[];
  phoneNumbers?: PhoneNumber[];
  addresses?: Address[];
  
  // Professional
  organizations?: Organization[];
  
  // Online Presence
  websites?: Website[];
  socialProfiles?: SocialProfile[];
  
  // Personal Details
  birthdays?: Birthday[];
  events?: Event[];
  genders?: Array<{
    value: 'male' | 'female';
    formattedValue?: string;
  }>;
  
  // Relationships
  relations?: Relation[];
  
  // Additional Information
  biographies?: Array<{
    value: string;
    contentType: 'TEXT_PLAIN' | 'TEXT_HTML';
  }>;
  interests?: string[];
  occupations?: string[];
  skills?: string[];
  
  // Custom Fields
  userDefined?: CustomField[];
  
  // Metadata
  source: 'manual' | 'business_card_ocr' | 'google_contacts' | 'import';
  googleContactId?: string;
  googleResourceName?: string; // Full resource name from Google
  syncedToGoogle?: boolean;
  syncedAt?: Date;
  etag?: string; // For sync conflict resolution
  
  // Tags and Organization
  tags?: string[];
  groups?: string[];
  starred?: boolean;
  
  // Notes
  notes?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt?: Date;
  lastContactedAt?: Date;
}

export interface MeetingMinutes {
  id?: string;
  userId: string;
  title: string;
  date: Date;
  duration: number;
  transcript: string;
  summary: string;
  keyPoints: string[];
  decisions: string[];
  nextSteps: string[];
  attendeeIds: string[];
  attendeeNames: string[];
  projectId?: string;
  source: 'jarvis_recorder' | 'plaud_note' | 'manual';
  
  // File metadata for duplicate detection
  originalFilename?: string;
  fileHash?: string;
  fileSizeBytes?: number;
  fileSizeMB?: number;
  
  createdAt: Date;
  updatedAt?: Date;
}

export interface Task {
  id?: string;
  title: string;
  description?: string;
  ownerId: string;
  assigneeId?: string;
  projectId?: string;
  status: 'todo' | 'in_progress' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
  source: 'manual' | 'meeting_minutes' | 'calendar_event';
  linkedMeetingMinutes?: string;
  createdAt: Date;
  updatedAt?: Date;
}

// Helper type for creating contacts with minimal required fields
export type CreateContactInput = Pick<Contact, 'userId' | 'source'> & {
  name?: string; // Simplified name input
  email?: string; // Simplified email input
  phone?: string; // Simplified phone input
  company?: string; // Simplified company input
  title?: string; // Simplified title input
};

// Type guards
export function hasEmail(contact: Contact): boolean {
  return !!(contact.emailAddresses && contact.emailAddresses.length > 0);
}

export function hasPhone(contact: Contact): boolean {
  return !!(contact.phoneNumbers && contact.phoneNumbers.length > 0);
}

export function hasAddress(contact: Contact): boolean {
  return !!(contact.addresses && contact.addresses.length > 0);
}

export function getPrimaryEmail(contact: Contact): string | undefined {
  return contact.emailAddresses?.[0]?.value;
}

export function getPrimaryPhone(contact: Contact): string | undefined {
  return contact.phoneNumbers?.[0]?.value;
}

export function getPrimaryAddress(contact: Contact): Address | undefined {
  return contact.addresses?.[0];
}

export function getDisplayName(contact: Contact): string {
  if (contact.displayName) return contact.displayName;
  if (contact.names?.[0]?.displayName) return contact.names[0].displayName;
  
  const name = contact.names?.[0];
  if (name) {
    const parts = [
      name.honorificPrefix,
      name.givenName,
      name.middleName,
      name.familyName,
      name.honorificSuffix
    ].filter(Boolean);
    return parts.join(' ');
  }
  
  return getPrimaryEmail(contact) || 'Unknown';
}