// backend/src/services/localStorageService.ts

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const STORAGE_DIR = process.env.LOCAL_STORAGE_DIR || './data/recordings';

export class LocalStorageService {
  
  async init(): Promise<void> {
    // Create storage directory if it doesn't exist
    await fs.mkdir(STORAGE_DIR, { recursive: true });
    console.log(`📁 Local storage initialized: ${STORAGE_DIR}`);
  }

  async saveRecording(
    audioBuffer: Buffer,
    userId: string,
    filename: string
  ): Promise<string> {
    
    // Create user-specific folder
    const userDir = path.join(STORAGE_DIR, userId);
    await fs.mkdir(userDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const hash = crypto.createHash('md5').update(audioBuffer).digest('hex').substring(0, 8);
    const ext = path.extname(filename);
    const safeFilename = `${timestamp}-${hash}${ext}`;
    const filepath = path.join(userDir, safeFilename);

    // Save file
    await fs.writeFile(filepath, audioBuffer);
    console.log(`💾 Saved locally: ${filepath} (${audioBuffer.length} bytes)`);

    return filepath;
  }

  async getRecording(filepath: string): Promise<Buffer> {
    return await fs.readFile(filepath);
  }

  async deleteRecording(filepath: string): Promise<void> {
    try {
      await fs.unlink(filepath);
      console.log(`🗑️  Deleted: ${filepath}`);
    } catch (error) {
      console.error(`Failed to delete ${filepath}:`, error);
    }
  }

  async getUserRecordings(userId: string): Promise<string[]> {
    const userDir = path.join(STORAGE_DIR, userId);
    try {
      const files = await fs.readdir(userDir);
      return files.map(f => path.join(userDir, f));
    } catch (error) {
      return [];
    }
  }

  async getStorageStats(userId: string): Promise<{
    count: number;
    totalSize: number;
  }> {
    const files = await this.getUserRecordings(userId);
    let totalSize = 0;

    for (const file of files) {
      try {
        const stats = await fs.stat(file);
        totalSize += stats.size;
      } catch (error) {
        // File might have been deleted
      }
    }

    return { count: files.length, totalSize };
  }

  async cleanupOldRecordings(daysOld: number = 30): Promise<number> {
    const cutoffDate = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    const users = await fs.readdir(STORAGE_DIR);

    for (const userId of users) {
      const userDir = path.join(STORAGE_DIR, userId);
      const files = await fs.readdir(userDir);

      for (const file of files) {
        const filepath = path.join(userDir, file);
        const stats = await fs.stat(filepath);

        if (stats.mtimeMs < cutoffDate) {
          await fs.unlink(filepath);
          deletedCount++;
        }
      }
    }

    console.log(`🧹 Cleaned up ${deletedCount} old recordings`);
    return deletedCount;
  }
}

export const localStorage = new LocalStorageService();