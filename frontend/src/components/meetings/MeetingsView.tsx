import React from 'react';
import { Clock, Users, FileAudio, Link as LinkIcon } from 'lucide-react';
import { Meeting } from './types';

interface MeetingsViewProps {
  meetings: Meeting[];
  onSelectMeeting: (meeting: Meeting) => void;
}

const MeetingsView: React.FC<MeetingsViewProps> = ({ meetings, onSelectMeeting }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (meetings.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
        <FileAudio className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">No meetings yet</h3>
        <p className="text-gray-600">Record or upload your first meeting to get started</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {meetings.map((meeting) => (
        <div
          key={meeting.id}
          onClick={() => onSelectMeeting(meeting)}
          className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer group"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors truncate">
                {meeting.title}
              </h3>
              <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{meeting.duration}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{meeting.attendeeNames.length} attendees</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileAudio className="w-4 h-4" />
                  <span>{meeting.fileSizeMB.toFixed(1)} MB</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">{meeting.summary}</p>
              <div className="flex flex-wrap gap-2">
                {meeting.actionItems.length > 0 && (
                  <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-md font-medium">
                    {meeting.actionItems.length} action items
                  </span>
                )}
                {meeting.decisions.length > 0 && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-md font-medium">
                    {meeting.decisions.length} decisions
                  </span>
                )}
                {meeting.linkedProjectId && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md font-medium flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" />
                    Linked to project
                  </span>
                )}
              </div>
            </div>
            <div className="text-right text-sm text-gray-500">
              {formatDate(meeting.date)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MeetingsView;