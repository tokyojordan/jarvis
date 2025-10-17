// frontend/src/components/StorageDashboard.tsx

export function StorageDashboard() {
  const [stats, setStats] = useState({ count: 0, totalSize: 0 });

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const storageStats = await audioStorage.getStorageStats();
    setStats(storageStats);
  }

  async function clearAll() {
    if (confirm('Delete all local recordings?')) {
      // Delete all uploaded recordings
      const recordings = await audioStorage.getAllPendingRecordings();
      for (const rec of recordings) {
        if (rec.status === 'uploaded') {
          await audioStorage.deleteRecording(rec.id);
        }
      }
      await loadStats();
    }
  }

  return (
    <div className="storage-dashboard">
      <h3>Local Storage</h3>
      <p>Recordings: {stats.count}</p>
      <p>Size: {(stats.totalSize / (1024 * 1024)).toFixed(2)} MB</p>
      <button onClick={clearAll}>Clear Uploaded Files</button>
    </div>
  );
}