import React from 'react';
import { Mic, Upload } from 'lucide-react';

interface RecordingViewProps {
  isRecording: boolean;
  recordingTime: number;
  isUploading: boolean;
  uploadProgress: number;
  startRecording: () => void;
  stopRecording: () => void;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

const RecordingView: React.FC<RecordingViewProps> = ({
  isRecording,
  recordingTime,
  isUploading,
  uploadProgress,
  startRecording,
  stopRecording,
  handleFileUpload,
  fileInputRef,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Recording Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 relative">
            {isRecording && (
              <div className="absolute inset-0 rounded-full bg-red-500 opacity-20 animate-ping" />
            )}
            <Mic className={`w-16 h-16 ${isRecording ? 'text-red-600' : 'text-indigo-600'}`} />
          </div>

          {isRecording && (
            <div className="space-y-2">
              <div className="text-4xl font-bold text-gray-900 font-mono">
                {formatTime(recordingTime)}
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                <p className="text-sm text-gray-600">Recording in progress...</p>
              </div>
            </div>
          )}

          {!isRecording && !isUploading && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to Record</h2>
              <p className="text-gray-600">Tap the button below to start recording your meeting</p>
            </div>
          )}

          {isUploading && (
            <div className="space-y-4">
              <div className="text-2xl font-bold text-gray-900">Processing...</div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">{uploadProgress}% complete</p>
            </div>
          )}

          <div className="flex gap-4 justify-center pt-4">
            {!isRecording && !isUploading && (
              <button
                onClick={startRecording}
                className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <Mic className="w-5 h-5" />
                Start Recording
              </button>
            )}

            {isRecording && (
              <button
                onClick={stopRecording}
                className="px-8 py-4 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <div className="w-4 h-4 rounded-sm bg-white" />
                Stop Recording
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Upload Card */}
      {!isRecording && !isUploading && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100">
              <Upload className="w-8 h-8 text-gray-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Upload Recording</h3>
              <p className="text-gray-600 text-sm">
                Have an existing recording? Upload it here for transcription and analysis
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all flex items-center gap-2 mx-auto"
            >
              <Upload className="w-5 h-5" />
              Choose Audio File
            </button>
            <p className="text-xs text-gray-500">Supports: MP3, M4A, WAV, WEBM</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordingView;