// frontend/src/components/PendingUploads.tsx

import { useEffect, useState } from 'react';
import { audioStorage } from '../utils/audioStorage';

export function PendingUploads() {
  const [pending, setPending] = useState<StoredAudio[]>([]);

  useEffect(() => {
    loadPending();
  }, []);

  async function loadPending() {
    const recordings = await audioStorage.getAllPendingRecordings();
    setPending(recordings);
  }

  async function retryUpload(recording: StoredAudio) {
    try {
      await audioStorage.updateStatus(recording.id, 'uploading');
      const meetingId = await uploadMeetingAudio(recording.file);
      await audioStorage.updateStatus(recording.id, 'uploaded', { meetingId });
      await loadPending();
    } catch (error) {
      await audioStorage.updateStatus(recording.id, 'failed', {
        error: error.message,
      });
    }
  }

  return (
    <div>
      <h2>Pending Uploads ({pending.length})</h2>
      {pending.map(recording => (
        <div key={recording.id}>
          <span>{recording.filename}</span>
          <span>{(recording.size / (1024 * 1024)).toFixed(2)} MB</span>
          <button onClick={() => retryUpload(recording)}>Retry</button>
        </div>
      ))}
    </div>
  );
}