import React from 'react';
import { Clock, Users, FileAudio, Trash2, CheckCircle } from 'lucide-react';
import { Meeting, ActionItem } from './types';

interface MeetingDetailProps {
  meeting: Meeting;
  onBack: () => void;
  deleteMeeting: (id: string) => void;
}

const MeetingDetail: React.FC<MeetingDetailProps> = ({ meeting, onBack, deleteMeeting }) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
        >
          ← Back
        </button>
        <button
          onClick={() => deleteMeeting(meeting.id)}
          className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>

      {/* Meeting Info */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{meeting.title}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-6">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{meeting.duration}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>{meeting.attendeeNames.join(', ') || 'No attendees'}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileAudio className="w-4 h-4" />
            <span>{meeting.originalFilename}</span>
          </div>
        </div>

        {/* Summary */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Summary</h3>
          <p className="text-gray-700 leading-relaxed">{meeting.summary}</p>
        </div>

        {/* Key Points */}
        {meeting.keyPoints.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Key Points</h3>
            <ul className="space-y-2">
              {meeting.keyPoints.map((point: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-indigo-600">{idx + 1}</span>
                  </div>
                  <span className="text-gray-700">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Decisions */}
        {meeting.decisions.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Decisions</h3>
            <ul className="space-y-2">
              {meeting.decisions.map((decision: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{decision}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Items */}
        {meeting.actionItems.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Action Items</h3>
            <div className="space-y-3">
              {meeting.actionItems.map((item: ActionItem, idx: number) => (
                <div key={idx} className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="font-semibold text-gray-900 mb-1">{item.task}</div>
                  <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                    {item.assignee && (
                      <span>
                        Assignee: <span className="font-medium">{item.assignee}</span>
                      </span>
                    )}
                    {item.dueDate && (
                      <span>
                        Due: <span className="font-medium">{new Date(item.dueDate).toLocaleDateString()}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transcript */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Transcript</h3>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{meeting.transcript}</p>
          </div>
          <p className="text-xs text-gray-500 mt-2">{meeting.transcriptLength.toLocaleString()} characters</p>
        </div>
      </div>
    </div>
  );
};

export default MeetingDetail;