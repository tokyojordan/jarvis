// frontend/src/services/storage.service.ts

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export type Platform = 'capacitor' | 'web';

export interface FileMetadata {
  path: string;
  filename: string;
  size: number;
  createdAt: Date;
  uri?: string;
}

class StorageService {
  private platform: Platform;
  private recordingsDir = 'jarvis/recordings';

  constructor() {
    this.platform = this.detectPlatform();
    console.log(`📱 Platform detected: ${this.platform}`);
  }

  /**
   * Detect if running in Capacitor or web browser
   */
  detectPlatform(): Platform {
    return Capacitor.isNativePlatform() ? 'capacitor' : 'web';
  }

  /**
   * Get current platform
   */
  getPlatform(): Platform {
    return this.platform;
  }

  /**
   * Check if running on mobile (Capacitor)
   */
  isMobile(): boolean {
    return this.platform === 'capacitor';
  }

  /**
   * Save recording to storage
   * - Capacitor: Save to filesystem
   * - Web: Return blob (kept in memory)
   */
  async saveRecording(blob: Blob, filename: string): Promise<string> {
    if (this.platform === 'capacitor') {
      return this.saveToFilesystem(blob, filename);
    } else {
      // Web: just return a memory reference
      return `memory://${filename}`;
    }
  }

  /**
   * Save blob to Capacitor filesystem
   */
  private async saveToFilesystem(blob: Blob, filename: string): Promise<string> {
    try {
      // Convert blob to base64
      const base64Data = await this.blobToBase64(blob);
      
      // Save to Documents directory
      const result = await Filesystem.writeFile({
        path: `${this.recordingsDir}/${filename}`,
        data: base64Data,
        directory: Directory.Documents,
      });

      console.log(`💾 Saved to filesystem: ${result.uri}`);
      return result.uri;
    } catch (error) {
      console.error('Error saving to filesystem:', error);
      throw error;
    }
  }

  /**
   * Load recording from storage
   */
  async loadRecording(path: string): Promise<Blob> {
    if (this.platform === 'capacitor') {
      return this.loadFromFilesystem(path);
    } else {
      throw new Error('Cannot load from memory path. Use the original blob.');
    }
  }

  /**
   * Load file from Capacitor filesystem
   */
  private async loadFromFilesystem(path: string): Promise<Blob> {
    try {
      const result = await Filesystem.readFile({
        path: path.replace('file://', ''),
      });

      // Convert base64 to blob
      const blob = await this.base64ToBlob(result.data as string, 'audio/webm');
      
      console.log(`📂 Loaded from filesystem: ${path}`);
      return blob;
    } catch (error) {
      console.error('Error loading from filesystem:', error);
      throw error;
    }
  }

  /**
   * Delete recording from storage
   */
  async deleteRecording(path: string): Promise<void> {
    if (this.platform === 'capacitor') {
      try {
        await Filesystem.deleteFile({
          path: path.replace('file://', ''),
        });
        console.log(`🗑️  Deleted from filesystem: ${path}`);
      } catch (error) {
        console.error('Error deleting file:', error);
        throw error;
      }
    }
    // Web: nothing to delete (memory only)
  }

  /**
   * List all pending uploads (Capacitor only)
   */
  async listPendingUploads(): Promise<FileMetadata[]> {
    if (this.platform !== 'capacitor') {
      return [];
    }

    try {
      const result = await Filesystem.readdir({
        path: this.recordingsDir,
        directory: Directory.Documents,
      });

      const files: FileMetadata[] = [];

      for (const file of result.files) {
        if (file.name.endsWith('.webm') || file.name.endsWith('.m4a')) {
          const stat = await Filesystem.stat({
            path: `${this.recordingsDir}/${file.name}`,
            directory: Directory.Documents,
          });

          files.push({
            path: stat.uri,
            filename: file.name,
            size: stat.size,
            createdAt: new Date(stat.mtime),
            uri: stat.uri,
          });
        }
      }

      return files.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }

  /**
   * Get file size
   */
  async getFileSize(path: string): Promise<number> {
    if (this.platform === 'capacitor') {
      const stat = await Filesystem.stat({
        path: path.replace('file://', ''),
      });
      return stat.size;
    }
    return 0;
  }

  /**
   * Check if file exists
   */
  async fileExists(path: string): Promise<boolean> {
    if (this.platform !== 'capacitor') {
      return false;
    }

    try {
      await Filesystem.stat({
        path: path.replace('file://', ''),
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Initialize storage (create directories if needed)
   */
  async initialize(): Promise<void> {
    if (this.platform === 'capacitor') {
      try {
        await Filesystem.mkdir({
          path: this.recordingsDir,
          directory: Directory.Documents,
          recursive: true,
        });
        console.log(`📁 Recordings directory ready`);
      } catch (error) {
        // Directory might already exist
        console.log(`📁 Recordings directory exists`);
      }
    }
  }

  /**
   * Clean up old recordings (older than X days)
   */
  async cleanupOldRecordings(daysOld: number = 7): Promise<number> {
    if (this.platform !== 'capacitor') {
      return 0;
    }

    const files = await this.listPendingUploads();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let deletedCount = 0;

    for (const file of files) {
      if (file.createdAt < cutoffDate) {
        await this.deleteRecording(file.path);
        deletedCount++;
      }
    }

    console.log(`🧹 Cleaned up ${deletedCount} old recordings`);
    return deletedCount;
  }

  // Helper methods

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private async base64ToBlob(base64: string, mimeType: string): Promise<Blob> {
    const byteCharacters = atob(base64);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: mimeType });
  }

  /**
   * Get total storage used (Capacitor only)
   */
  async getStorageUsed(): Promise<number> {
    if (this.platform !== 'capacitor') {
      return 0;
    }

    const files = await this.listPendingUploads();
    return files.reduce((total, file) => total + file.size, 0);
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }
}

// Export singleton instance
export const storageService = new StorageService();
export default storageService;