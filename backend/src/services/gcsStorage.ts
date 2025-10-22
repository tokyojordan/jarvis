// backend/src/services/gcsStorage.ts

import { Storage, Bucket } from '@google-cloud/storage';
import crypto from 'crypto';
import path from 'path';

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: process.env.FIREBASE_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

const bucketName = process.env.GCS_BUCKET_NAME || 'jarvis-recordings';
const bucket: Bucket = storage.bucket(bucketName);

export interface SignedUploadUrl {
  uploadUrl: string;
  gcsPath: string;
  uploadId: string;
  expiresIn: number;
}

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

/**
 * Generate a signed URL for direct client upload to GCS
 */
export async function generateSignedUploadUrl(
  filename: string,
  userId: string,
  fileHash: string,
  options: UploadOptions = {}
): Promise<SignedUploadUrl> {
  const timestamp = Date.now();
  const ext = path.extname(filename);
  const gcsPath = `users/${userId}/raw/${timestamp}-${fileHash.substring(0, 8)}${ext}`;
  const uploadId = `upload-${timestamp}-${crypto.randomBytes(4).toString('hex')}`;

  const [url] = await bucket.file(gcsPath).getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + 60 * 60 * 1000, // 1 hour
    contentType: options.contentType || 'audio/webm',
  });

  console.log(`📝 Generated signed upload URL for ${userId}`);
  console.log(`   🎯 GCS Path: ${gcsPath}`);
  console.log(`   🆔 Upload ID: ${uploadId}`);

  return {
    uploadUrl: url,
    gcsPath,
    uploadId,
    expiresIn: 3600,
  };
}

/**
 * Upload a file buffer directly to GCS (for web/backend uploads)
 */
export async function uploadFile(
  buffer: Buffer,
  userId: string,
  filename: string,
  fileHash: string,
  options: UploadOptions = {}
): Promise<string> {
  const timestamp = Date.now();
  const ext = path.extname(filename);
  const gcsPath = `users/${userId}/temp/${timestamp}-${fileHash.substring(0, 8)}${ext}`;

  const file = bucket.file(gcsPath);

  await file.save(buffer, {
    contentType: options.contentType || 'audio/webm',
    metadata: {
      metadata: {
        originalFilename: filename,
        userId,
        fileHash,
        uploadedAt: new Date().toISOString(),
        ...options.metadata,
      },
    },
  });

  console.log(`✅ Uploaded file to GCS: ${gcsPath}`);
  return gcsPath;
}

/**
 * Download a file from GCS
 */
export async function downloadFile(gcsPath: string): Promise<Buffer> {
  console.log(`⬇️  Downloading file from GCS: ${gcsPath}`);

  const file = bucket.file(gcsPath);
  const [buffer] = await file.download();

  console.log(`✅ Downloaded ${buffer.length} bytes from GCS`);
  return buffer;
}

/**
 * Check if a file exists in GCS
 */
export async function fileExists(gcsPath: string): Promise<boolean> {
  const file = bucket.file(gcsPath);
  const [exists] = await file.exists();
  return exists;
}

/**
 * Delete a file from GCS
 */
export async function deleteFile(gcsPath: string): Promise<void> {
  const file = bucket.file(gcsPath);
  await file.delete();
  console.log(`🗑️  Deleted file from GCS: ${gcsPath}`);
}

/**
 * Move file to processed folder after successful processing
 */
export async function moveToProcessed(
  gcsPath: string,
  meetingId: string
): Promise<string> {
  try {
    const ext = path.extname(gcsPath);
    const userId = gcsPath.split('/')[1]; // Extract userId from path
    const processedPath = `users/${userId}/processed/${meetingId}${ext}`;

    console.log(`📦 Copying from: ${gcsPath}`);
    console.log(`📦 Copying to: ${processedPath}`);

    // Copy file
    await bucket.file(gcsPath).copy(bucket.file(processedPath));

    // Verify copy succeeded
    const [metadata] = await bucket.file(processedPath).getMetadata();
    console.log(`✅ Copied file size: ${metadata.size} bytes`);

    // Delete original only if copy succeeded
    await bucket.file(gcsPath).delete();

    console.log(`📦 Moved file to processed: ${processedPath}`);
    return processedPath;
  } catch (error) {
    console.error('❌ Error moving file to processed:', error);
    throw error;
  }
}

/**
 * Move file to archive (long-term storage)
 */
export async function moveToArchive(
  gcsPath: string,
  meetingId: string
): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const ext = path.extname(gcsPath);

  const archivePath = `archive/${year}/${month}/${meetingId}${ext}`;

  await bucket.file(gcsPath).copy(bucket.file(archivePath));

  console.log(`📚 Archived file: ${archivePath}`);
  return archivePath;
}

/**
 * Get file metadata
 */
export async function getFileMetadata(gcsPath: string): Promise<{
  size: number;
  contentType: string;
  created: Date;
  updated: Date;
}> {
  const file = bucket.file(gcsPath);
  const [metadata] = await file.getMetadata();

  return {
    size: parseInt(metadata.size as string),
    contentType: metadata.contentType || 'application/octet-stream',
    created: new Date(metadata.timeCreated as string),
    updated: new Date(metadata.updated as string),
  };
}

/**
 * Generate a signed download URL (for sharing/downloading)
 */
export async function generateSignedDownloadUrl(
  gcsPath: string,
  expiresInMinutes: number = 60
): Promise<string> {
  const [url] = await bucket.file(gcsPath).getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + expiresInMinutes * 60 * 1000,
  });

  return url;
}

/**
 * List all files for a user
 */
export async function listUserFiles(
  userId: string,
  folder: 'raw' | 'processed' | 'archive' = 'processed'
): Promise<string[]> {
  const prefix = `users/${userId}/${folder}/`;
  const [files] = await bucket.getFiles({ prefix });

  return files.map(file => file.name);
}

/**
 * Clean up old temp files (> 24 hours)
 */
export async function cleanupTempFiles(): Promise<number> {
  const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
  const [files] = await bucket.getFiles({ prefix: 'users/' });

  let deletedCount = 0;

  for (const file of files) {
    if (file.name.includes('/temp/')) {
      const [metadata] = await file.getMetadata();
      const created = new Date(metadata.timeCreated as string);

      if (created.getTime() < cutoffTime) {
        await file.delete();
        deletedCount++;
        console.log(`🧹 Cleaned up old temp file: ${file.name}`);
      }
    }
  }

  console.log(`🧹 Cleanup complete: Deleted ${deletedCount} old temp files`);
  return deletedCount;
}

/**
 * Initialize bucket (create if doesn't exist)
 */
export async function initializeBucket(): Promise<void> {
  try {
    const [exists] = await bucket.exists();

    if (!exists) {
      console.log(`📦 Creating GCS bucket: ${bucketName}`);
      await storage.createBucket(bucketName, {
        location: 'US',
        storageClass: 'STANDARD',
      });
      console.log(`✅ Bucket created: ${bucketName}`);
    } else {
      console.log(`✅ GCS bucket exists: ${bucketName}`);
    }
  } catch (error) {
    console.error('❌ Error initializing GCS bucket:', error);
    throw error;
  }
}

/**
 * Save transcript to GCS as markdown
 */
export async function saveTranscript(
  transcript: string,
  meetingId: string,
  userId: string,
  meetingData?: {
    title?: string;
    date?: string;
    duration?: string;
    attendeeNames?: string[];
  }
): Promise<string> {
  const gcsPath = `users/${userId}/processed/${meetingId}/transcript.md`;

  // Format transcript as markdown
  const markdownContent = formatTranscriptAsMarkdown(transcript, meetingData);

  const file = bucket.file(gcsPath);

  await file.save(markdownContent, {
    contentType: 'text/markdown',
    metadata: {
      metadata: {
        meetingId,
        userId,
        savedAt: new Date().toISOString(),
      },
    },
  });

  console.log(`💾 Saved transcript to GCS: ${gcsPath}`);
  return gcsPath;
}

/**
 * Format transcript as markdown
 */
function formatTranscriptAsMarkdown(
  transcript: string,
  metadata?: {
    title?: string;
    date?: string;
    duration?: string;
    attendeeNames?: string[];
  }
): string {
  let markdown = '';

  // Header
  if (metadata?.title) {
    markdown += `# ${metadata.title}\n\n`;
  } else {
    markdown += `# Meeting Transcript\n\n`;
  }

  // Metadata section
  markdown += `## Meeting Information\n\n`;

  if (metadata?.date) {
    const formattedDate = new Date(metadata.date).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    markdown += `- **Date:** ${formattedDate}\n`;
  }

  if (metadata?.duration) {
    markdown += `- **Duration:** ${metadata.duration}\n`;
  }

  if (metadata?.attendeeNames && metadata.attendeeNames.length > 0) {
    markdown += `- **Attendees:** ${metadata.attendeeNames.join(', ')}\n`;
  }

  markdown += `\n---\n\n`;

  // Transcript section
  markdown += `## Transcript\n\n`;

  // Format transcript with paragraphs
  const paragraphs = transcript.split('\n').filter(p => p.trim());
  paragraphs.forEach(paragraph => {
    markdown += `${paragraph.trim()}\n\n`;
  });

  return markdown;
}

/**
 * Save complete meeting summary as markdown
 */
export async function saveMeetingSummaryMarkdown(
  meetingId: string,
  userId: string,
  meetingData: {
    title: string;
    date: string;
    duration?: string;
    attendeeNames?: string[];
    summary: string;
    keyPoints?: string[];
    decisions?: string[];
    actionItems?: any[];
    nextSteps?: string[];
    transcript: string;
  }
): Promise<string> {
  const gcsPath = `users/${userId}/processed/${meetingId}/summary.md`;

  let markdown = `# ${meetingData.title}\n\n`;

  // Metadata
  markdown += `## Meeting Information\n\n`;
  const formattedDate = new Date(meetingData.date).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  markdown += `- **Date:** ${formattedDate}\n`;
  if (meetingData.duration) markdown += `- **Duration:** ${meetingData.duration}\n`;
  if (meetingData.attendeeNames?.length) {
    markdown += `- **Attendees:** ${meetingData.attendeeNames.join(', ')}\n`;
  }
  markdown += `\n---\n\n`;

  // Summary
  markdown += `## Summary\n\n${meetingData.summary}\n\n`;

  // Key Points
  if (meetingData.keyPoints?.length) {
    markdown += `## Key Points\n\n`;
    meetingData.keyPoints.forEach((point, i) => {
      markdown += `${i + 1}. ${point}\n`;
    });
    markdown += `\n`;
  }

  // Decisions
  if (meetingData.decisions?.length) {
    markdown += `## Decisions\n\n`;
    meetingData.decisions.forEach(decision => {
      markdown += `- ✅ ${decision}\n`;
    });
    markdown += `\n`;
  }

  // Action Items
  if (meetingData.actionItems?.length) {
    markdown += `## Action Items\n\n`;
    meetingData.actionItems.forEach((item, i) => {
      markdown += `### ${i + 1}. ${item.task}\n\n`;
      if (item.assignee) markdown += `- **Assignee:** ${item.assignee}\n`;
      if (item.dueDate) markdown += `- **Due:** ${item.dueDate}\n`;
      if (item.context) markdown += `- **Context:** ${item.context}\n`;
      markdown += `\n`;
    });
  }

  // Next Steps
  if (meetingData.nextSteps?.length) {
    markdown += `## Next Steps\n\n`;
    meetingData.nextSteps.forEach(step => {
      markdown += `- ${step}\n`;
    });
    markdown += `\n`;
  }

  // Transcript
  markdown += `---\n\n## Full Transcript\n\n`;
  const paragraphs = meetingData.transcript.split('\n').filter(p => p.trim());
  paragraphs.forEach(paragraph => {
    markdown += `${paragraph.trim()}\n\n`;
  });

  const file = bucket.file(gcsPath);
  await file.save(markdown, {
    contentType: 'text/markdown',
    metadata: { metadata: { meetingId, userId, savedAt: new Date().toISOString() } },
  });

  console.log(`📄 Saved meeting summary to GCS: ${gcsPath}`);
  return gcsPath;
}

export default {
  generateSignedUploadUrl,
  uploadFile,
  downloadFile,
  fileExists,
  deleteFile,
  moveToProcessed,
  moveToArchive,
  getFileMetadata,
  generateSignedDownloadUrl,
  listUserFiles,
  cleanupTempFiles,
  initializeBucket,
  saveTranscript,
};