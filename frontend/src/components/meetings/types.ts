// Action item from meeting analysis
export interface ActionItem {
  task: string;
  assignee?: string;
  dueDate?: string;
  projectId?: string;
  sectionId?: string;
}

// Main meeting data structure
export interface Meeting {
  id: string;
  userId: string;
  projectId?: string;
  
  // File Information
  originalFilename: string;
  fileHash: string;
  fileSizeBytes: number;
  fileSizeMB: number;
  
  // Meeting Details
  title: string;
  date: string;
  duration: string;
  
  // Content
  transcript: string;
  transcriptLength: number;
  
  // AI Analysis
  summary: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: ActionItem[];
  nextSteps: string[];
  
  // Participants
  attendeeIds: string[];
  attendeeNames: string[];
  
  // Project Integration
  linkedProjectId?: string;
  linkedTaskIds?: string[];
  
  // Timestamps
  createdAt: any;
  updatedAt: any;
  processedAt: any;
}