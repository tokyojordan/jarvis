import React, { useState, useRef, useEffect } from 'react';
import { Mic, FileAudio, LogOut } from 'lucide-react';
import RecordingView from './RecordingView';
import MeetingsView from './MeetingsView';
import MeetingDetail from './MeetingDetail';
import AlertMessage from './AlertMessage';
import { Meeting } from './types';
import { getMockMeetings } from './mockData';
import { useAuth } from '../../hooks/useAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const MeetingApp: React.FC = () => {
  const { userId, clearUser, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'record' | 'meetings'>('record');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (userId) {
      fetchMeetings();
    }
  }, [userId]);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingTime(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const fetchMeetings = async () => {
    if (!userId) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/meetings`, {
        headers: { 'x-user-id': userId }
      });
      if (!response.ok) throw new Error('Failed to fetch meetings');
      const data = await response.json();
      setMeetings(data.meetings || []);
    } catch (err) {
      console.error('Error fetching meetings:', err);
      setMeetings(getMockMeetings());
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await uploadAudio(audioBlob, `recording-${Date.now()}.webm`);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError('Failed to access microphone. Please check permissions.');
      console.error('Recording error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) uploadAudio(file, file.name);
  };

  const uploadAudio = async (audioBlob: Blob, filename: string) => {
    if (!userId) {
      setError('User not authenticated');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append('audio', audioBlob, filename);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch(`${API_BASE_URL}/meetings/upload`, {
        method: 'POST',
        headers: { 'x-user-id': userId },
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      const data = await response.json();
      setSuccess(`Meeting "${data.filename}" processed successfully!`);
      
      setTimeout(() => {
        fetchMeetings();
        setIsUploading(false);
        setUploadProgress(0);
        setSuccess(null);
        setActiveTab('meetings');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload and process audio');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const deleteMeeting = async (meetingId: string) => {
    if (!userId || !confirm('Are you sure you want to delete this meeting?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/meetings/${meetingId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': userId }
      });

      if (!response.ok) throw new Error('Failed to delete meeting');
      
      setMeetings(meetings.filter(m => m.id !== meetingId));
      if (selectedMeeting?.id === meetingId) {
        setSelectedMeeting(null);
      }
      setSuccess('Meeting deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to delete meeting');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      clearUser();
      setMeetings([]);
      setSelectedMeeting(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Mic className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Jarvis</h1>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Jarvis</h1>
                <p className="text-xs text-gray-500">Meeting Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">{userId}</span>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm border border-gray-200">
          <button
            onClick={() => setActiveTab('record')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'record'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Mic className="w-4 h-4" />
              <span>Record</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('meetings')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'meetings'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FileAudio className="w-4 h-4" />
              <span>Meetings ({meetings.length})</span>
            </div>
          </button>
        </div>
      </div>

      {/* Alerts */}
      <div className="max-w-6xl mx-auto px-4 pt-4">
        {error && <AlertMessage type="error" message={error} />}
        {success && <AlertMessage type="success" message={success} />}
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'record' ? (
          <RecordingView
            isRecording={isRecording}
            recordingTime={recordingTime}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            startRecording={startRecording}
            stopRecording={stopRecording}
            handleFileUpload={handleFileUpload}
            fileInputRef={fileInputRef}
          />
        ) : selectedMeeting ? (
          <MeetingDetail
            meeting={selectedMeeting}
            onBack={() => setSelectedMeeting(null)}
            deleteMeeting={deleteMeeting}
          />
        ) : (
          <MeetingsView
            meetings={meetings}
            onSelectMeeting={setSelectedMeeting}
          />
        )}
      </main>
    </div>
  );
};

export default MeetingApp;