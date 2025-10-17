// backend/src/jobs/storageCleanup.ts

import { localStorage } from '../services/localStorageService';
import { db } from '../config/firebase';

export async function runStorageCleanup() {
  console.log('🧹 Starting storage cleanup job...');

  // 1. Clean up old recordings (30+ days)
  const deletedCount = await localStorage.cleanupOldRecordings(30);

  // 2. Clean up successful jobs (keep failed ones for retry)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const completedJobs = await db
    .collection('processing_jobs')
    .where('status', '==', 'completed')
    .where('canDeleteLocal', '==', true)
    .where('completedAt', '<', sevenDaysAgo)
    .get();

  for (const doc of completedJobs.docs) {
    const job = doc.data();
    if (job.localPath) {
      await localStorage.deleteRecording(job.localPath);
      await doc.ref.update({ localPath: null });
    }
  }

  console.log(`✅ Cleanup complete: ${deletedCount} files deleted`);
}

// Run daily at 2 AM
import cron from 'node-cron';
cron.schedule('0 2 * * *', runStorageCleanup);