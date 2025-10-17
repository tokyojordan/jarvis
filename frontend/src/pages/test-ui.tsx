import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle, XCircle, Clock, FileAudio, Loader, Trash2, Eye } from 'lucide-react';

const API_BASE = 'http://localhost:8080/api';
const USER_ID = 'test-user-123';

export default function JarvisTestUI() {
  const [meetings, setMeetings] = useState([]);
  const [jobs, setJobs] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');

  // Load meetings on mount
  useEffect(() => {
    loadMeetings();
  }, []);

  // Poll job status
  useEffect(() => {
    const jobIds = Object.keys(jobs).filter(id => jobs[id].status === 'processing');
    if (jobIds.length === 0) return;

    const interval = setInterval(() => {
      jobIds.forEach(checkJobStatus);
    }, 3000);

    return () => clearInterval(interval);
  }, [jobs]);

  const loadMeetings = async () => {
    try {
      const response = await fetch(`${API_BASE}/meetings`, {
        headers: { 'x-user-id': USER_ID }
      });
      const data = await response.json();
      setMeetings(data.meetings || []);
    } catch (error) {
      console.error('Failed to load meetings:', error);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('audio', selectedFile);
    formData.append('title', `Test Meeting - ${new Date().toLocaleString()}`);

    try {
      const response = await fetch(`${API_BASE}/meetings/upload`, {
        method: 'POST',
        headers: { 'x-user-id': USER_ID },
        body: formData
      });

      const data = await response.json();
      
      if (data.jobId) {
        setJobs(prev => ({
          ...prev,
          [data.jobId]: {
            jobId: data.jobId,
            filename: data.filename,
            status: 'processing',
            progress: 0
          }
        }));
        setSelectedFile(null);
        setActiveTab('processing');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const checkJobStatus = async (jobId) => {
    try {
      const response = await fetch(`${API_BASE}/meetings/status/${jobId}`, {
        headers: { 'x-user-id': USER_ID }
      });
      const data = await response.json();

      setJobs(prev => ({
        ...prev,
        [jobId]: data
      }));

      if (data.status === 'completed') {
        loadMeetings();
      }
    } catch (error) {
      console.error('Failed to check status:', error);
    }
  };

  const viewMeeting = async (meetingId) => {
    try {
      const response = await fetch(`${API_BASE}/meetings/${meetingId}`, {
        headers: { 'x-user-id': USER_ID }
      });
      const data = await response.json();
      setSelectedMeeting(data.meeting);
      setActiveTab('view');
    } catch (error) {
      console.error('Failed to load meeting:', error);
    }
  };

  const deleteMeeting = async (meetingId) => {
    if (!confirm('Delete this meeting?')) return;

    try {
      await fetch(`${API_BASE}/meetings/${meetingId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': USER_ID }
      });
      loadMeetings();
      if (selectedMeeting?.id === meetingId) {
        setSelectedMeeting(null);
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'processing':
        return <Loader className="w-5 h-5 text-blue-400 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-blue-400">🤖 Jarvis Meeting Assistant</h1>
          <p className="text-gray-400 text-sm mt-1">Test UI - User: {USER_ID}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8">
            {['upload', 'processing', 'meetings', 'view'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-blue-400 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'processing' && Object.keys(jobs).length > 0 && (
                  <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                    {Object.values(jobs).filter(j => j.status === 'processing').length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
              <h2 className="text-xl font-semibold mb-6">Upload Meeting Audio</h2>
              
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-12 text-center hover:border-blue-400 transition-colors">
                <FileAudio className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="audio-upload"
                  disabled={uploading}
                />
                
                <label
                  htmlFor="audio-upload"
                  className="cursor-pointer text-blue-400 hover:text-blue-300 font-medium"
                >
                  Choose audio file
                </label>
                <p className="text-gray-500 text-sm mt-2">or drag and drop</p>
                
                {selectedFile && (
                  <div className="mt-6 bg-gray-700 rounded p-4 text-left">
                    <p className="text-sm text-gray-300">
                      <strong>File:</strong> {selectedFile.name}
                    </p>
                    <p className="text-sm text-gray-300 mt-1">
                      <strong>Size:</strong> {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
              >
                {uploading ? (
                  <>
                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Upload & Process
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Processing Tab */}
        {activeTab === 'processing' && (
          <div>
            <h2 className="text-xl font-semibold mb-6">Processing Jobs</h2>
            
            {Object.keys(jobs).length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
                <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No active jobs</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.values(jobs).map(job => (
                  <div key={job.jobId} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        {getStatusIcon(job.status)}
                        <div className="ml-3">
                          <p className="font-medium">{job.filename}</p>
                          <p className="text-sm text-gray-400">
                            Job ID: {job.jobId}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-300">
                          {job.status.toUpperCase()}
                        </p>
                      </div>
                    </div>

                    {job.status === 'processing' && (
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-400">Progress</span>
                          <span className="text-blue-400">{job.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {job.status === 'completed' && job.meetingId && (
                      <button
                        onClick={() => viewMeeting(job.meetingId)}
                        className="mt-4 text-blue-400 hover:text-blue-300 text-sm font-medium"
                      >
                        View Meeting →
                      </button>
                    )}

                    {job.status === 'failed' && job.error && (
                      <div className="mt-4 bg-red-900/20 border border-red-700 rounded p-3">
                        <p className="text-red-400 text-sm">{job.error}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Meetings List Tab */}
        {activeTab === 'meetings' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">All Meetings</h2>
              <button
                onClick={loadMeetings}
                className="text-blue-400 hover:text-blue-300 text-sm font-medium"
              >
                Refresh
              </button>
            </div>

            {meetings.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
                <FileAudio className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No meetings yet</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {meetings.map(meeting => (
                  <div key={meeting.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">{meeting.title || 'Untitled Meeting'}</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
                          <div>
                            <p>📅 {new Date(meeting.createdAt?.seconds * 1000 || meeting.createdAt).toLocaleString()}</p>
                            <p>⏱️ Duration: {meeting.duration || 'Unknown'}</p>
                          </div>
                          <div>
                            <p>📄 {meeting.originalFilename}</p>
                            <p>💾 {meeting.fileSizeMB} MB</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => viewMeeting(meeting.id)}
                          className="p-2 text-blue-400 hover:bg-gray-700 rounded"
                          title="View"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => deleteMeeting(meeting.id)}
                          className="p-2 text-red-400 hover:bg-gray-700 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Meeting Detail View */}
        {activeTab === 'view' && (
          <div>
            {!selectedMeeting ? (
              <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
                <p className="text-gray-400">No meeting selected</p>
                <button
                  onClick={() => setActiveTab('meetings')}
                  className="mt-4 text-blue-400 hover:text-blue-300"
                >
                  View all meetings
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <h2 className="text-2xl font-bold">{selectedMeeting.title}</h2>
                  <button
                    onClick={() => setActiveTab('meetings')}
                    className="text-gray-400 hover:text-gray-300"
                  >
                    ← Back
                  </button>
                </div>

                {/* Summary */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="font-semibold text-lg mb-3 text-blue-400">Summary</h3>
                  <p className="text-gray-300 whitespace-pre-wrap">{selectedMeeting.summary}</p>
                </div>

                {/* Key Points */}
                {selectedMeeting.keyPoints && selectedMeeting.keyPoints.length > 0 && (
                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h3 className="font-semibold text-lg mb-3 text-green-400">Key Points</h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-300">
                      {selectedMeeting.keyPoints.map((point, i) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Items */}
                {selectedMeeting.actionItems && selectedMeeting.actionItems.length > 0 && (
                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h3 className="font-semibold text-lg mb-3 text-yellow-400">Action Items</h3>
                    <div className="space-y-3">
                      {selectedMeeting.actionItems.map((item, i) => (
                        <div key={i} className="bg-gray-700 rounded p-4">
                          <p className="font-medium text-gray-200">{item.task}</p>
                          {item.assignee && (
                            <p className="text-sm text-gray-400 mt-1">
                              Assigned to: {item.assignee}
                            </p>
                          )}
                          {item.dueDate && (
                            <p className="text-sm text-gray-400">
                              Due: {item.dueDate}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Transcript */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="font-semibold text-lg mb-3 text-purple-400">Full Transcript</h3>
                  <div className="max-h-96 overflow-y-auto bg-gray-900 rounded p-4">
                    <p className="text-gray-300 whitespace-pre-wrap text-sm">
                      {selectedMeeting.transcript}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}