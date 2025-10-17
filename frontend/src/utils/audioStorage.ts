// frontend/src/utils/audioStorage.ts

interface StoredAudio {
  id: string;
  file: File;
  filename: string;
  size: number;
  timestamp: Date;
  status: 'pending' | 'uploading' | 'uploaded' | 'failed';
  jobId?: string;
  meetingId?: string;
  error?: string;
}

class AudioStorageService {
  private dbName = 'JarvisAudioDB';
  private storeName = 'recordings';
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async saveRecording(file: File): Promise<string> {
    if (!this.db) await this.init();

    const id = `recording-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const recording: StoredAudio = {
      id,
      file,
      filename: file.name,
      size: file.size,
      timestamp: new Date(),
      status: 'pending',
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(recording);

      request.onsuccess = () => {
        console.log(`✅ Saved recording locally: ${id}`);
        resolve(id);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getRecording(id: string): Promise<StoredAudio | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async updateStatus(
    id: string,
    status: StoredAudio['status'],
    updates?: Partial<StoredAudio>
  ): Promise<void> {
    if (!this.db) await this.init();

    const recording = await this.getRecording(id);
    if (!recording) throw new Error('Recording not found');

    const updated = { ...recording, status, ...updates };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(updated);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllPendingRecordings(): Promise<StoredAudio[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('status');
      const request = index.getAll('pending');

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteRecording(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getStorageStats(): Promise<{
    count: number;
    totalSize: number;
    oldestRecording?: Date;
  }> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const recordings = request.result;
        const stats = {
          count: recordings.length,
          totalSize: recordings.reduce((sum, r) => sum + r.size, 0),
          oldestRecording: recordings.length > 0 
            ? new Date(Math.min(...recordings.map(r => r.timestamp.getTime())))
            : undefined,
        };
        resolve(stats);
      };
      request.onerror = () => reject(request.error);
    });
  }
}

export const audioStorage = new AudioStorageService();