// frontend/src/services/upload.service.ts

import storageService from './storage.service';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  success: boolean;
  jobId: string;
  gcsPath?: string;
  message: string;
  estimatedTimeSeconds?: number;
}

class UploadService {
  
  /**
   * Calculate SHA-256 hash of file
   */
  async calculateHash(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  /**
   * Upload recording from Capacitor (mobile)
   * Uses signed URL for direct upload to GCS
   */
  async uploadFromCapacitor(
    blob: Blob,
    filename: string,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    console.log(`📱 Starting Capacitor upload: ${filename}`);

    // 1. Save to local filesystem first
    const localPath = await storageService.saveRecording(blob, filename);
    console.log(`💾 Saved locally: ${localPath}`);

    // 2. Calculate file hash
    const fileHash = await this.calculateHash(blob);
    console.log(`🔐 Hash: ${fileHash}`);

    // 3. Get signed upload URL from backend
    const signedUrlResponse = await fetch(`${API_BASE_URL}/meetings/upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({
        filename,
        fileSize: blob.size,
        fileHash,
        contentType: blob.type || 'audio/webm',
      }),
    });

    if (!signedUrlResponse.ok) {
      throw new Error('Failed to get upload URL');
    }

    const { uploadUrl, gcsPath, uploadId } = await signedUrlResponse.json();
    console.log(`🔗 Got signed URL for upload ID: ${uploadId}`);

    // 4. Upload directly to GCS
    await this.uploadToGCS(blob, uploadUrl, onProgress);
    console.log(`✅ Uploaded to GCS: ${gcsPath}`);

    // 5. Notify backend that upload is complete
    const completeResponse = await fetch(`${API_BASE_URL}/meetings/upload-complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({
        uploadId,
        gcsPath,
      }),
    });

    if (!completeResponse.ok) {
      const error = await completeResponse.json();
      throw new Error(error.message || 'Upload confirmation failed');
    }

    const result = await completeResponse.json();

    // 6. Delete local file after successful upload
    try {
      await storageService.deleteRecording(localPath);
      console.log(`🗑️  Deleted local file: ${localPath}`);
    } catch (error) {
      console.warn('Could not delete local file:', error);
    }

    return {
      success: true,
      jobId: result.jobId,
      gcsPath,
      message: 'Upload successful, processing started',
      estimatedTimeSeconds: result.estimatedTimeSeconds,
    };
  }

  /**
   * Upload recording from web browser
   * Uploads to backend, which then uploads to GCS
   */
  async uploadFromWeb(
    blob: Blob,
    filename: string,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    console.log(`🌐 Starting web upload: ${filename}`);

    const formData = new FormData();
    formData.append('audio', blob, filename);

    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress({
            loaded: e.loaded,
            total: e.total,
            percentage: Math.round((e.loaded / e.total) * 100),
          });
        }
      });

      xhr.addEventListener('load', async () => {
        if (xhr.status === 202) {
          const result = JSON.parse(xhr.responseText);
          resolve({
            success: true,
            jobId: result.jobId,
            gcsPath: result.gcsPath,
            message: result.message,
            estimatedTimeSeconds: result.estimatedTimeSeconds,
          });
        } else {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.error || 'Upload failed'));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'));
      });

      xhr.open('POST', `${API_BASE_URL}/meetings/upload`);
      xhr.setRequestHeader('x-user-id', userId);
      xhr.send(formData);
    });
  }

  /**
   * Upload blob directly to GCS using signed URL
   */
  private async uploadToGCS(
    blob: Blob,
    signedUrl: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress({
            loaded: e.loaded,
            total: e.total,
            percentage: Math.round((e.loaded / e.total) * 100),
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200 || xhr.status === 201) {
          resolve();
        } else {
          reject(new Error(`GCS upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during GCS upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('GCS upload aborted'));
      });

      xhr.open('PUT', signedUrl);
      xhr.setRequestHeader('Content-Type', blob.type || 'audio/webm');
      xhr.send(blob);
    });
  }

  /**
   * Main upload method - automatically detects platform
   */
  async upload(
    blob: Blob,
    filename: string,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    const isMobile = storageService.isMobile();
    
    if (isMobile) {
      return this.uploadFromCapacitor(blob, filename, userId, onProgress);
    } else {
      return this.uploadFromWeb(blob, filename, userId, onProgress);
    }
  }

  /**
   * Check job status
   */
  async checkJobStatus(jobId: string, userId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/meetings/status/${jobId}`, {
      headers: {
        'x-user-id': userId,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to check job status');
    }

    return response.json();
  }

  /**
   * Poll job status until complete or failed
   */
  async waitForCompletion(
    jobId: string,
    userId: string,
    onProgress?: (progress: number) => void,
    timeout: number = 300000 // 5 minutes
  ): Promise<{ meetingId?: string; error?: string }> {
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds

    while (Date.now() - startTime < timeout) {
      const status = await this.checkJobStatus(jobId, userId);

      if (onProgress && status.progress !== undefined) {
        onProgress(status.progress);
      }

      if (status.status === 'completed') {
        return { meetingId: status.meetingId };
      }

      if (status.status === 'failed') {
        return { error: status.error || 'Processing failed' };
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Processing timeout');
  }
}

// Export singleton instance
export const uploadService = new UploadService();
export default uploadService;