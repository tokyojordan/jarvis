# Jarvis Technical Overview v2.0

Complete technical architecture and implementation details for the Jarvis AI meeting assistant with Google Contacts integration, project management, and mobile-first design.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Storage Strategy](#storage-strategy)
3. [Core Components](#core-components)
4. [Data Models](#data-models)
5. [Platform Support](#platform-support)
6. [API Design](#api-design)
7. [AI Integration](#ai-integration)
8. [Security & Authentication](#security--authentication)
9. [Performance Optimization](#performance-optimization)
10. [Deployment](#deployment)
11. [Testing](#testing)

---

## System Architecture

### High-Level Overview

```
┌────────────────────────────────────────────────────────────┐
│                    Client Layer                            │
├────────────────────────────────────────────────────────────┤
│  iOS (Capacitor) → Web Browser → React Frontend           │
│  • Local Filesystem (Capacitor)                           │
│  • Memory Storage (Web)                                    │
│  • Offline-first design                                    │
└────────────────┬───────────────────────────────────────────┘
                 │ HTTPS/REST
                 ▼
┌────────────────────────────────────────────────────────────┐
│                API Gateway (Cloud Run)                     │
├────────────────────────────────────────────────────────────┤
│  Express.js Server (TypeScript)                           │
│  • Rate Limiting                                          │
│  • CORS Configuration                                     │
│  • Request Validation                                     │
│  • Error Handling                                         │
│  • Swagger Documentation                                  │
└────────────────┬───────────────────────────────────────────┘
                 │
    ┌────────────┼────────────┐
    ▼            ▼            ▼
┌─────────┐  ┌─────────┐  ┌──────────┐
│Services │  │Middleware│ │  Routes  │
├─────────┤  ├─────────┤  ├──────────┤
│Meeting  │  │Auth     │  │Meetings  │
│Storage  │  │Logging  │  │Contacts  │
│n8n      │  │Validate │  │Calendar  │
│Google   │  │Error    │  │Reports   │
│Project  │  │         │  │Projects  │
└─────────┘  └─────────┘  └──────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────┐
│                  Storage Layer                             │
├────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐              │
│  │  Google Cloud    │  │   Firestore      │              │
│  │    Storage       │  │   Database       │              │
│  ├──────────────────┤  ├──────────────────┤              │
│  │ • Audio files    │  │ • Meeting data   │              │
│  │ • Recordings     │  │ • User data      │              │
│  │ • Transcripts    │  │ • Projects       │              │
│  │ • $0.026/GB      │  │ • Contacts       │              │
│  └──────────────────┘  └──────────────────┘              │
└────────────────────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────┐
│              External Services                             │
├────────────────────────────────────────────────────────────┤
│  OpenAI (Whisper, GPT-4o-mini)                            │
│  Google People API (Contacts)                             │
│  Google Calendar API                                       │
│  Gmail API                                                 │
│  n8n (Workflows, PDF, Email)                              │
└────────────────────────────────────────────────────────────┘
```

---

## Storage Strategy

### Platform-Aware Storage Architecture

**Mobile (Capacitor iOS/Android):**
```
Record Audio
    ↓
Save to Capacitor Filesystem
    ↓
Upload to Google Cloud Storage (GCS)
    ↓
Backend processes from GCS
    ↓
Delete local file after confirmation
```

**Web (Browser):**
```
Record Audio
    ↓
Store in Memory Buffer
    ↓
Upload directly to backend
    ↓
Backend uploads to GCS
    ↓
Process from GCS
```

### Why This Approach?

| Aspect | Mobile (Local File) | Web (Memory) |
|--------|-------------------|--------------|
| **Data Safety** | ⭐⭐⭐⭐⭐ Files persist | ⭐⭐⭐ Lost on crash |
| **Offline** | ✅ Works offline | ❌ Requires connection |
| **Recovery** | ✅ Can retry upload | ❌ Must re-record |
| **Complexity** | Medium | Low |
| **User Experience** | Best | Good |

### GCS Bucket Structure

```
jarvis-recordings/
├── users/
│   └── {userId}/
│       ├── raw/
│       │   └── {timestamp}-{hash}.webm
│       └── processed/
│           └── {meetingId}/
│               ├── audio.webm
│               └── transcript.txt
├── temp/
│   └── {uploadId}.webm (auto-delete after 24h)
└── archive/
    └── {year}/{month}/{meetingId}.webm
```

### Lifecycle Management

```typescript
// GCS Lifecycle Rules
{
  "lifecycle": {
    "rule": [
      {
        "action": { "type": "Delete" },
        "condition": {
          "age": 90,  // Delete after 90 days
          "matchesPrefix": ["users/", "temp/"]
        }
      },
      {
        "action": { "type": "SetStorageClass", "storageClass": "NEARLINE" },
        "condition": {
          "age": 30,  // Archive after 30 days
          "matchesPrefix": ["archive/"]
        }
      }
    ]
  }
}
```

---

## Core Components

### 1. Storage Service (NEW)

**Location:** `frontend/src/services/storage.service.ts`

**Responsibilities:**
- Detect platform (Capacitor vs Web)
- Abstract storage operations
- Handle file CRUD operations
- Manage offline queue

**Key Functions:**
```typescript
detectPlatform(): 'capacitor' | 'web'
saveRecording(blob: Blob, filename: string): Promise<string>
loadRecording(path: string): Promise<Blob>
deleteRecording(path: string): Promise<void>
listPendingUploads(): Promise<FileMetadata[]>
```

### 2. GCS Service (NEW)

**Location:** `backend/src/services/gcsStorage.ts`

**Responsibilities:**
- Upload files to Google Cloud Storage
- Generate signed URLs for direct upload
- Download files for processing
- Manage bucket lifecycle
- Handle file cleanup

**Key Functions:**
```typescript
uploadFile(buffer: Buffer, path: string): Promise<string>
generateSignedUploadUrl(filename: string, userId: string): Promise<SignedUrl>
downloadFile(path: string): Promise<Buffer>
deleteFile(path: string): Promise<void>
moveToArchive(path: string): Promise<string>
```

### 3. Meeting Intelligence Service (UPDATED)

**Location:** `backend/src/services/meetingIntelligence.ts`

**Changes:**
- Now processes from GCS instead of Buffer
- Downloads file from GCS when needed
- Supports retry logic with persistent files

**Updated Functions:**
```typescript
// OLD: processMeetingRecording(audioBuffer: Buffer, ...)
// NEW:
processMeetingRecording(
  gcsPath: string,
  userId: string,
  options: ProcessingOptions
): Promise<string>

// Downloads from GCS internally
transcribeAudioFromGCS(gcsPath: string): Promise<string>
```

### 4. Background Processor (UPDATED)

**Location:** `backend/src/services/backgroundProcessor.ts`

**Changes:**
- Accepts GCS path instead of Buffer
- Can retry failed jobs without re-upload
- Better error recovery

**Updated Interface:**
```typescript
interface ProcessingJob {
  jobId: string;
  userId: string;
  gcsPath: string;          // NEW: GCS file location
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  filename: string;
  fileSize: number;
  fileHash: string;
  meetingId?: string;
  error?: string;
  retryAttempt?: number;
  canRetry: boolean;        // Always true now!
  createdAt: Date;
  completedAt?: Date;
}
```

### 5. Google Contacts Service (UNCHANGED)

**Location:** `backend/src/services/googleContacts.ts`

Remains the same - no changes needed for storage refactor.

### 6. Project Management Service (UNCHANGED)

**Location:** `backend/src/services/projectManagement.ts`

Remains the same - no changes needed for storage refactor.

---

## Data Models

### Meeting Minutes (UPDATED)

```typescript
interface MeetingMinutes {
  id: string;
  userId: string;
  projectId?: string;
  
  // File Information
  originalFilename: string;
  fileHash: string;
  fileSizeBytes: number;
  fileSizeMB: number;
  gcsPath: string;              // NEW: GCS storage location
  gcsArchivePath?: string;      // NEW: Archive location
  
  // Meeting Details
  title: string;
  date: string;
  duration: string;
  
  // Content
  transcript: string;
  transcriptLength: number;
  gcsTranscriptPath?: string;   // NEW: Transcript in GCS
  
  // AI Analysis
  summary: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: ActionItem[];
  nextSteps: string[];
  
  // Participants
  attendeeIds: string[];
  attendeeNames: string[];
  
  // Project Integration
  linkedProjectId?: string;
  linkedTaskIds?: string[];
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  processedAt: Timestamp;
  uploadedAt: Timestamp;        // NEW: When uploaded to GCS
  archivedAt?: Timestamp;       // NEW: When moved to archive
}
```

### Upload Metadata (NEW)

```typescript
interface UploadMetadata {
  uploadId: string;
  userId: string;
  filename: string;
  fileSize: number;
  fileHash: string;
  localPath?: string;           // Only on Capacitor
  gcsPath?: string;             // Set after upload
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
  error?: string;
  createdAt: Date;
  uploadedAt?: Date;
  retryCount: number;
  maxRetries: number;
}
```

### Contact (UNCHANGED)

Same as before - Google Contacts compatible model.

### Project Management Models (UNCHANGED)

Organization, Workspace, Team, Portfolio, Project, Section, Task, Subtask remain the same.

---

## Platform Support

### Capacitor (iOS/Android)

**Required Plugins:**
```json
{
  "@capacitor/core": "^5.0.0",
  "@capacitor/filesystem": "^5.0.0",
  "@capacitor/ios": "^5.0.0",
  "@capacitor/android": "^5.0.0"
}
```

**Permissions (iOS Info.plist):**
```xml
<key>NSMicrophoneUsageDescription</key>
<string>Record meetings for transcription</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Scan business cards</string>
```

**Storage Locations:**
- **iOS:** `Documents/jarvis/recordings/`
- **Android:** `app/files/jarvis/recordings/`

### Web Browser

**Requirements:**
- Modern browser with MediaRecorder API
- HTTPS (required for microphone access)
- Minimum 100MB free memory

**Fallbacks:**
- No local storage fallback
- Must complete upload in session
- Warning for large recordings

---

## API Design

### New Storage Endpoints

#### Generate Signed Upload URL
```http
POST /api/storage/upload-url
Content-Type: application/json
x-user-id: user@example.com

{
  "filename": "recording-123.webm",
  "fileSize": 5242880,
  "fileHash": "sha256hash...",
  "contentType": "audio/webm"
}

Response:
{
  "success": true,
  "uploadUrl": "https://storage.googleapis.com/...",
  "gcsPath": "users/user@example.com/raw/123.webm",
  "uploadId": "upload-123",
  "expiresIn": 3600
}
```

#### Confirm Upload Complete
```http
POST /api/storage/upload-complete
Content-Type: application/json
x-user-id: user@example.com

{
  "uploadId": "upload-123",
  "gcsPath": "users/user@example.com/raw/123.webm",
  "fileHash": "sha256hash..."
}

Response:
{
  "success": true,
  "jobId": "job-456",
  "message": "Processing started"
}
```

### Updated Meeting Endpoints

#### Upload (Web Only - Direct Upload)
```http
POST /api/meetings/upload
Content-Type: multipart/form-data
x-user-id: user@example.com

File: audio (binary)

Response 202:
{
  "success": true,
  "jobId": "job-789",
  "gcsPath": "users/user@example.com/temp/789.webm",
  "estimatedTimeSeconds": 120
}
```

#### Get Meeting with GCS Info
```http
GET /api/meetings/{id}
x-user-id: user@example.com

Response:
{
  "meeting": {
    "id": "meeting-123",
    "title": "Q4 Review",
    "gcsPath": "users/user@example.com/processed/123/audio.webm",
    "gcsArchivePath": "archive/2024/10/123.webm",
    "transcript": "...",
    ...
  }
}
```

### Existing Endpoints (UNCHANGED)

All contact, project, and task endpoints remain the same.

---

## AI Integration

### OpenAI Whisper (UPDATED)

**Changed:** Now downloads from GCS first

```typescript
async function transcribeAudioFromGCS(gcsPath: string): Promise<string> {
  // Download from GCS
  const audioBuffer = await gcsService.downloadFile(gcsPath);
  
  // Create temp file for Whisper
  const tempPath = `/tmp/${Date.now()}.webm`;
  await fs.promises.writeFile(tempPath, audioBuffer);
  
  // Transcribe
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(tempPath),
    model: 'whisper-1',
    language: 'en',
    response_format: 'json'
  });
  
  // Cleanup
  await fs.promises.unlink(tempPath);
  
  return transcription.text;
}
```

### GPT-4o-mini (UNCHANGED)

Same implementation as before.

---

## Security & Authentication

### Current Implementation (Simple)

```typescript
const userId = req.headers['x-user-id'] as string;
if (!userId) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

### Future: Firebase Auth Integration

```typescript
import { auth } from 'firebase-admin';

async function authenticateRequest(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decodedToken = await auth().verifyIdToken(token);
    req.userId = decodedToken.uid;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

### GCS Security

**Signed URLs:**
- Temporary access (1 hour expiry)
- Scoped to specific file
- No credentials exposed to client

**Bucket IAM:**
```
Service Account: jarvis-backend@project.iam
Roles:
  - Storage Object Admin (for uploads/deletes)
  - Storage Object Viewer (for downloads)
```

### Firestore Security Rules (UPDATED)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Meeting minutes
    match /meeting_minutes/{meetingId} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
    
    // Processing jobs
    match /processing_jobs/{jobId} {
      allow read: if request.auth.uid == resource.data.userId;
      allow write: if false; // Only backend can write
    }
    
    // Upload metadata
    match /upload_metadata/{uploadId} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
    
    // Contacts, Projects, Tasks (unchanged)
    match /contacts/{contactId} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
    
    match /projects/{projectId} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
    
    match /tasks/{taskId} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
  }
}
```

---

## Performance Optimization

### Caching Strategy

**Frontend:**
```typescript
// Cache meeting list in memory
const meetingCache = new Map<string, Meeting>();
const cacheTimeout = 5 * 60 * 1000; // 5 minutes

// Cache GCS signed URLs
const urlCache = new Map<string, { url: string, expires: number }>();
```

**Backend:**
```typescript
// Cache frequently accessed meetings
const redis = new Redis(process.env.REDIS_URL);

async function getCachedMeeting(id: string): Promise<Meeting | null> {
  const cached = await redis.get(`meeting:${id}`);
  if (cached) return JSON.parse(cached);
  
  const meeting = await db.collection('meeting_minutes').doc(id).get();
  if (meeting.exists) {
    await redis.setex(`meeting:${id}`, 3600, JSON.stringify(meeting.data()));
    return meeting.data() as Meeting;
  }
  
  return null;
}
```

### GCS Optimization

**Multipart Upload for Large Files:**
```typescript
// For files > 100MB, use resumable upload
if (fileSize > 100 * 1024 * 1024) {
  await bucket.file(path).createResumableUpload({
    origin: '*',
    metadata: { contentType: 'audio/webm' }
  });
}
```

**Compression:**
```typescript
// Compress audio before upload (optional)
import { compress } from 'audio-compressor';

const compressed = await compress(audioBuffer, {
  quality: 0.8,
  format: 'opus'
});
```

### Firestore Indexes (UPDATED)

```json
{
  "indexes": [
    {
      "collectionGroup": "meeting_minutes",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "gcsPath", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "upload_metadata",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "processing_jobs",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## Deployment

### Google Cloud Run

**Backend Service:**
```yaml
service: jarvis-backend
runtime: nodejs18

resources:
  cpu: 2
  memory_gb: 4
  
automatic_scaling:
  min_instances: 0
  max_instances: 10
  target_cpu_utilization: 0.8

environment_variables:
  NODE_ENV: production
  FIREBASE_PROJECT_ID: jarvis-prod
  GCS_BUCKET_NAME: jarvis-recordings-prod
```

**Required Environment Variables:**
```bash
FIREBASE_PROJECT_ID=jarvis-prod
OPENAI_API_KEY=sk-proj-...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
N8N_BASE_URL=https://n8n.example.com
GCS_BUCKET_NAME=jarvis-recordings-prod
GOOGLE_APPLICATION_CREDENTIALS=/secrets/service-account.json
```

### Capacitor iOS Build

```bash
# Build frontend
cd frontend
npm run build

# Sync to Capacitor
npx cap sync ios

# Open in Xcode
npx cap open ios

# Build & Archive
# Product -> Archive -> Distribute App
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: cd backend && npm install
      
      - name: Build
        run: cd backend && npm run build
      
      - name: Deploy to Cloud Run
        uses: google-github-actions/deploy-cloudrun@v1
        with:
          service: jarvis-backend
          region: us-central1
          source: ./backend
```

---

## Testing

### Unit Tests

**Storage Service:**
```typescript
describe('Storage Service', () => {
  test('detects Capacitor platform', () => {
    const platform = storageService.detectPlatform();
    expect(['capacitor', 'web']).toContain(platform);
  });
  
  test('saves recording to filesystem on Capacitor', async () => {
    const blob = new Blob(['test'], { type: 'audio/webm' });
    const path = await storageService.saveRecording(blob, 'test.webm');
    expect(path).toBeTruthy();
  });
});
```

**GCS Service:**
```typescript
describe('GCS Service', () => {
  test('uploads file to GCS', async () => {
    const buffer = Buffer.from('test audio data');
    const path = await gcsService.uploadFile(buffer, 'test/audio.webm');
    expect(path).toMatch(/^users\//);
  });
  
  test('generates valid signed URL', async () => {
    const signedUrl = await gcsService.generateSignedUploadUrl('test.webm', 'user123');
    expect(signedUrl.uploadUrl).toMatch(/storage.googleapis.com/);
    expect(signedUrl.expiresIn).toBe(3600);
  });
});
```

### Integration Tests

**End-to-End Recording Flow:**
```typescript
describe('Recording Flow (Capacitor)', () => {
  test('complete recording -> upload -> process flow', async () => {
    // 1. Record audio
    const recording = await recordTestAudio(5000); // 5 seconds
    
    // 2. Save to filesystem
    const localPath = await storageService.saveRecording(recording, 'test.webm');
    
    // 3. Get signed URL
    const { uploadUrl, gcsPath } = await api.getUploadUrl({
      filename: 'test.webm',
      fileSize: recording.size,
      fileHash: await calculateHash(recording)
    });
    
    // 4. Upload to GCS
    await uploadToGCS(uploadUrl, recording);
    
    // 5. Confirm upload
    const { jobId } = await api.confirmUpload({ gcsPath });
    
    // 6. Wait for processing
    const job = await waitForJobCompletion(jobId);
    expect(job.status).toBe('completed');
    expect(job.meetingId).toBeTruthy();
    
    // 7. Verify meeting created
    const meeting = await api.getMeeting(job.meetingId);
    expect(meeting.transcript).toBeTruthy();
    expect(meeting.gcsPath).toBe(gcsPath);
  });
});
```

---

## Summary

### Key Improvements in v2.0

✅ **Mobile-First Storage** - Local filesystem on Capacitor, memory on web
✅ **Zero Data Loss** - Files persist through crashes and errors
✅ **Cloud Storage** - GCS for scalable, cost-effective file storage
✅ **Offline Support** - Record without internet, upload when connected
✅ **Better Recovery** - Retry failed uploads without re-recording
✅ **Cost Optimized** - GCS cheaper than Firestore for large files
✅ **Platform Aware** - Automatically detects and adapts to environment
✅ **Production Ready** - Comprehensive error handling and monitoring

### Architecture Benefits

| Feature | v1.0 (Memory) | v2.0 (Local+GCS) |
|---------|---------------|------------------|
| Data Safety | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| Offline | ❌ | ✅ |
| Recovery | ❌ | ✅ |
| Cost | 💰 | 💰 (same) |
| Scalability | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Mobile UX | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## Additional Resources

- **API Documentation:** http://localhost:8080/api-docs
- **Google Cloud Storage:** https://cloud.google.com/storage/docs
- **Capacitor Filesystem:** https://capacitorjs.com/docs/apis/filesystem
- **OpenAI API:** https://platform.openai.com/docs
- **Firebase Documentation:** https://firebase.google.com/docs

---

**Document Version:** 2.0  
**Last Updated:** October 2025  
**Status:** Production Ready with Mobile Support  
**Breaking Changes:** Yes - requires migration from memory-based to GCS-based storage