// backend/src/services/backgroundProcessor.ts

import { db } from './firebase';
import { processMeetingRecording } from './meetingIntelligence';

// Export the interface so it can be used elsewhere
export interface ProcessingJob {
  jobId: string;
  userId: string;
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  filename: string;
  fileSize: number;
  localPath?: string;
  meetingId?: string;
  error?: string;
  retryAttempt?: number;
  createdAt: Date;
  completedAt?: Date;
  canDeleteLocal?: boolean;
  canRetry?: boolean;
}

/**
 * Process audio file in the background (async, non-blocking)
 */
export async function processAudioInBackground(
  jobId: string,
  audioBuffer: Buffer,
  userId: string,
  options: {
    filename: string;
    size: number;
    title?: string;
    projectId?: string;
    attendeeIds?: string[];
    localPath?: string;
  }
): Promise<void> {
  
  const jobRef = db.collection('processing_jobs').doc(jobId);
  
  // Create initial job record - USE THE INTERFACE
  const initialJob: Partial<ProcessingJob> = {
    jobId,
    userId,
    status: 'processing',
    progress: 0,
    filename: options.filename,
    fileSize: options.size,
    localPath: options.localPath,
    createdAt: new Date(),
  };

  await jobRef.set(initialJob);

  try {
    console.log(`🔄 Starting background processing for job ${jobId}`);
    
    // Update progress: Starting transcription
    await jobRef.update({ progress: 10 });
    
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
          }
        );
      },
      3, // max retries
      async (attempt) => {
        // Update progress during retries
        console.log(`⚠️  Retry attempt ${attempt} for job ${jobId}`);
        await jobRef.update({ 
          progress: 10 + (attempt * 20),
          retryAttempt: attempt 
        });
      }
    );
    
    // Success! - USE THE INTERFACE
    const completedUpdate: Partial<ProcessingJob> = {
      status: 'completed',
      progress: 100,
      meetingId,
      completedAt: new Date(),
      canDeleteLocal: true,
    };
    
    await jobRef.update(completedUpdate);
    
    console.log(`✅ Job ${jobId} completed successfully. Meeting ID: ${meetingId}`);
    
  } catch (error: any) {
    console.error(`❌ Job ${jobId} failed:`, error);
    
    // Failure - keep local file for retry - USE THE INTERFACE
    const failedUpdate: Partial<ProcessingJob> = {
      status: 'failed',
      error: error.message,
      completedAt: new Date(),
      canRetry: true,
    };
    
    await jobRef.update(failedUpdate);
    
    throw error; // Re-throw so caller knows it failed
  }
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