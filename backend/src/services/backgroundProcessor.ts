// backend/src/services/backgroundProcessor.ts

import { db } from './firebase';
import { processMeetingRecording } from './meetingIntelligence';
import * as gcsStorage from './gcsStorage';

export interface ProcessingJob {
  jobId: string;
  userId: string;
  gcsPath: string;               // GCS file location
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  filename: string;
  fileSize: number;
  fileHash: string;
  meetingId?: string;
  error?: string;
  retryAttempt?: number;
  createdAt: Date;
  completedAt?: Date;
  canRetry: boolean;            // Always true with GCS!
}

/**
 * Process audio file from GCS in the background (async, non-blocking)
 */
export async function processAudioInBackground(
  jobId: string,
  gcsPath: string,
  userId: string,
  options: {
    filename: string;
    size: number;
    fileHash: string;
    title?: string;
    projectId?: string;
    attendeeIds?: string[];
  }
): Promise<void> {
  
  const jobRef = db.collection('processing_jobs').doc(jobId);
  
  // Create initial job record
  const initialJob: Partial<ProcessingJob> = {
    jobId,
    userId,
    gcsPath,
    status: 'processing',
    progress: 0,
    filename: options.filename,
    fileSize: options.size,
    fileHash: options.fileHash,
    createdAt: new Date(),
    canRetry: true,             // Can always retry with GCS!
  };

  await jobRef.set(initialJob);

  try {
    console.log(`🔄 Starting background processing for job ${jobId}`);
    console.log(`   📦 GCS Path: ${gcsPath}`);
    
    // Update progress: Starting download
    await jobRef.update({ progress: 5 });
    
    // Download file from GCS
    console.log(`⬇️  Downloading from GCS...`);
    const audioBuffer = await gcsStorage.downloadFile(gcsPath);
    
    // Update progress: Download complete
    await jobRef.update({ progress: 15 });
    
    // Process audio with retry logic
    const meetingId = await processWithRetry(
      async () => {
        return await processMeetingRecording(
          audioBuffer,
          userId,
          {
            title: options.title,
            projectId: options.projectId,
            attendeeIds: options.attendeeIds || [],
            filename: options.filename,
            gcsPath,              // Pass GCS path to save in meeting record
            fileHash: options.fileHash,
          }
        );
      },
      3, // max retries
      async (attempt) => {
        console.log(`⚠️  Retry attempt ${attempt} for job ${jobId}`);
        await jobRef.update({ 
          progress: 15 + (attempt * 20),
          retryAttempt: attempt 
        });
      }
    );
    
    // Move file to processed folder
    console.log(`📦 Moving file to processed folder...`);
    const processedPath = await gcsStorage.moveToProcessed(gcsPath, meetingId);
    
    // Update meeting record with new GCS path
    await db.collection('meeting_minutes').doc(meetingId).update({
      gcsPath: processedPath,
      uploadedAt: new Date(),
    });
    
    // Success!
    const completedUpdate: Partial<ProcessingJob> = {
      status: 'completed',
      progress: 100,
      meetingId,
      completedAt: new Date(),
    };
    
    await jobRef.update(completedUpdate);
    
    console.log(`✅ Job ${jobId} completed successfully`);
    console.log(`   🎯 Meeting ID: ${meetingId}`);
    console.log(`   📦 Processed Path: ${processedPath}`);
    
  } catch (error: any) {
    console.error(`❌ Job ${jobId} failed:`, error);
    
    // Failure - file stays in GCS for retry
    const failedUpdate: Partial<ProcessingJob> = {
      status: 'failed',
      error: error.message,
      completedAt: new Date(),
      canRetry: true,  // Can always retry from GCS!
    };
    
    await jobRef.update(failedUpdate);
    
    throw error;
  }
}

/**
 * Retry a failed job (re-process from GCS)
 */
export async function retryFailedJob(jobId: string): Promise<void> {
  const jobDoc = await db.collection('processing_jobs').doc(jobId).get();
  
  if (!jobDoc.exists) {
    throw new Error('Job not found');
  }
  
  const job = jobDoc.data() as ProcessingJob;
  
  if (!job.canRetry) {
    throw new Error('Job cannot be retried');
  }
  
  if (job.status !== 'failed') {
    throw new Error('Only failed jobs can be retried');
  }
  
  console.log(`🔄 Retrying job ${jobId}...`);
  
  // Create new job ID for retry
  const newJobId = `${jobId}-retry-${Date.now()}`;
  
  // Start processing again with same GCS file
  await processAudioInBackground(
    newJobId,
    job.gcsPath,
    job.userId,
    {
      filename: job.filename,
      size: job.fileSize,
      fileHash: job.fileHash,
    }
  );
  
  console.log(`✅ Retry job created: ${newJobId}`);
}

/**
 * Retry logic with exponential backoff
 */
async function processWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  onRetry?: (attempt: number) => Promise<void>
): Promise<T> {
  
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxRetries}`);
      return await fn();
      
    } catch (error: any) {
      lastError = error;
      console.log(`❌ Attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      if (attempt < maxRetries) {
        // Exponential backoff: 2^attempt seconds
        const delayMs = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Retrying in ${delayMs}ms...`);
        
        if (onRetry) {
          await onRetry(attempt);
        }
        
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  // All retries exhausted
  throw lastError!;
}

/**
 * Get job status by ID
 */
export async function getJobStatus(jobId: string): Promise<ProcessingJob | null> {
  const jobDoc = await db.collection('processing_jobs').doc(jobId).get();
  
  if (!jobDoc.exists) {
    return null;
  }
  
  return jobDoc.data() as ProcessingJob;
}

/**
 * Get all jobs for a user
 */
export async function getUserJobs(
  userId: string,
  limit: number = 50
): Promise<ProcessingJob[]> {
  const snapshot = await db
    .collection('processing_jobs')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map(doc => doc.data() as ProcessingJob);
}

/**
 * Clean up old completed jobs (older than specified days)
 */
export async function cleanupOldJobs(daysOld: number = 7): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const oldJobs = await db
    .collection('processing_jobs')
    .where('status', '==', 'completed')
    .where('completedAt', '<', cutoffDate)
    .get();

  if (oldJobs.empty) {
    console.log('🧹 No old jobs to clean up');
    return 0;
  }

  const batch = db.batch();
  oldJobs.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();

  console.log(`🧹 Cleaned up ${oldJobs.size} old jobs`);
  return oldJobs.size;
}