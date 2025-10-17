// frontend/src/components/MeetingUpload.tsx

import { useState } from 'react';
import { audioStorage } from '../utils/audioStorage';
import { uploadMeetingAudio } from '../services/meetingService';

export function MeetingUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [savedLocally, setSavedLocally] = useState(false);

  async function handleUpload(file: File) {
    try {
      setUploading(true);
      
      // 1. Save locally first
      console.log('💾 Saving recording locally...');
      const recordingId = await audioStorage.saveRecording(file);
      setSavedLocally(true);
      console.log('✅ Saved locally with ID:', recordingId);
      
      // 2. Update status to uploading
      await audioStorage.updateStatus(recordingId, 'uploading');
      
      // 3. Upload to server
      console.log('☁️ Uploading to server...');
      const meetingId = await uploadMeetingAudio(file, (p) => setProgress(p));
      
      // 4. Update status to uploaded
      await audioStorage.updateStatus(recordingId, 'uploaded', { meetingId });
      
      console.log('✅ Upload complete! Meeting ID:', meetingId);
      
      // 5. Optional: Keep or delete local copy
      // await audioStorage.deleteRecording(recordingId); // Delete after successful upload
      
    } catch (error) {
      console.error('❌ Upload failed:', error);
      
      // Mark as failed but keep locally
      if (recordingId) {
        await audioStorage.updateStatus(recordingId, 'failed', {
          error: error.message,
        });
      }
      
      alert('Upload failed, but your recording is saved locally. You can retry later.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input
        type="file"
        accept="audio/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
        disabled={uploading}
      />
      
      {uploading && (
        <div>
          {savedLocally ? '☁️ Uploading...' : '💾 Saving locally...'}
          <progress value={progress} max={100} />
        </div>
      )}
    </div>
  );
}