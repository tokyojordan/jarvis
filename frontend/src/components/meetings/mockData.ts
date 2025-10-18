import { Meeting } from './types';

export const getMockMeetings = (): Meeting[] => [
  {
    id: '1',
    userId: 'demo-user-123',
    originalFilename: 'quarterly-review-q4.m4a',
    fileHash: 'abc123def456',
    fileSizeBytes: 5242880,
    fileSizeMB: 5.0,
    title: 'Q4 Quarterly Business Review',
    date: '2024-10-15T14:00:00Z',
    duration: '45:30',
    transcript: 'Welcome everyone to our Q4 quarterly business review. Today we\'ll be discussing our progress on key initiatives, reviewing our metrics, and planning for the upcoming quarter. Let\'s start with our product roadmap updates...\n\nSarah, can you give us an overview of the product milestones we hit this quarter?\n\nSure! We successfully launched three major features: the new dashboard redesign, mobile app improvements, and the API v2 beta. User feedback has been overwhelmingly positive, with our NPS score jumping from 42 to 58.\n\nThat\'s fantastic progress. Mike, what about customer success metrics?\n\nOur customer satisfaction is at an all-time high of 4.7 out of 5. We reduced churn by 15% and increased expansion revenue by 25%. The customer advisory board meetings have been incredibly valuable for gathering feedback.\n\nExcellent work. Now let\'s discuss the budget for Q1 marketing initiatives...',
    transcriptLength: 2450,
    summary: 'Quarterly review meeting covering Q4 progress, key metrics, and planning for Q1. Team discussed product roadmap, customer feedback, and resource allocation. Revenue grew 25%, customer satisfaction improved significantly, and three major features were successfully shipped.',
    keyPoints: [
      'Revenue grew 25% compared to Q3, exceeding targets',
      'Customer satisfaction score improved to 4.7/5 stars',
      'Three major features shipped successfully: dashboard redesign, mobile improvements, API v2',
      'Team expanded by 5 new engineers to support growth',
      'NPS score increased from 42 to 58',
      'Churn reduced by 15% through improved customer success efforts'
    ],
    decisions: [
      'Approved $150K budget increase for Q1 marketing campaign',
      'Decided to prioritize mobile app redesign as top initiative for Q1',
      'Will hire 2 additional customer success managers by end of November',
      'Moving forward with API v2 general availability in January'
    ],
    actionItems: [
      { 
        task: 'Prepare detailed Q1 roadmap presentation for board meeting', 
        assignee: 'Sarah Chen', 
        dueDate: '2024-10-22',
        projectId: 'q1-planning'
      },
      { 
        task: 'Schedule customer advisory board meeting for Q1 kickoff', 
        assignee: 'Mike Johnson', 
        dueDate: '2024-10-25' 
      },
      { 
        task: 'Review and finalize marketing budget allocation', 
        assignee: 'Lisa Rodriguez', 
        dueDate: '2024-10-20' 
      },
      {
        task: 'Draft job descriptions for customer success manager roles',
        assignee: 'HR Team',
        dueDate: '2024-10-18'
      }
    ],
    nextSteps: [
      'Share meeting notes with all stakeholders by end of week',
      'Schedule follow-up for roadmap review in 2 weeks',
      'Begin recruitment process for new hires'
    ],
    attendeeIds: ['user1', 'user2', 'user3', 'user4'],
    attendeeNames: ['Sarah Chen', 'Mike Johnson', 'Lisa Rodriguez', 'David Park'],
    linkedProjectId: 'q1-planning',
    linkedTaskIds: ['task1', 'task2'],
    createdAt: new Date('2024-10-15T14:00:00Z'),
    updatedAt: new Date('2024-10-15T15:00:00Z'),
    processedAt: new Date('2024-10-15T15:05:00Z')
  },
  {
    id: '2',
    userId: 'demo-user-123',
    originalFilename: 'sprint-planning.m4a',
    fileHash: 'xyz789ghi012',
    fileSizeBytes: 3145728,
    fileSizeMB: 3.0,
    title: 'Sprint 24 Planning Meeting',
    date: '2024-10-14T10:00:00Z',
    duration: '32:15',
    transcript: 'Good morning team. Let\'s plan our next sprint. We have 15 story points available and several high-priority items in the backlog.\n\nAlex, can you walk us through the API performance improvements?\n\nYes, we need to refactor the authentication module and add caching to reduce response times. I estimate this at 5 points.\n\nEmma, what about the dashboard bug fixes?\n\nI have 3 critical bugs that need immediate attention, plus the user profile page needs updates. That\'s about 4 points total.\n\nOkay, that gives us 6 points remaining. Chris, can you handle the documentation updates?\n\nAbsolutely. I\'ll update the API docs and create tutorial videos. That should be 3 points.\n\nPerfect. Let\'s commit to this plan and reconvene daily at 9 AM for standups.',
    transcriptLength: 1820,
    summary: 'Sprint planning session for Sprint 24. Team committed to 15 story points focusing on API improvements, bug fixes, and documentation updates. Key priorities include authentication refactoring and performance optimization.',
    keyPoints: [
      'Team velocity is stable at 15 points per sprint',
      'API performance improvements are top priority this sprint',
      'Three critical bugs identified that need immediate attention',
      'Technical debt will be addressed through authentication refactoring',
      'Documentation and tutorial content to be created for better onboarding'
    ],
    decisions: [
      'Will refactor authentication module to improve security and performance',
      'Defer dashboard redesign to next sprint to focus on stability',
      'Prioritize bug fixes over new features this sprint'
    ],
    actionItems: [
      { 
        task: 'Set up performance monitoring dashboards', 
        assignee: 'Alex Kumar', 
        dueDate: '2024-10-16',
        projectId: 'api-improvements'
      },
      { 
        task: 'Review and update API documentation', 
        assignee: 'Emma Wilson', 
        dueDate: '2024-10-18' 
      },
      { 
        task: 'Create video tutorials for new API features', 
        assignee: 'Chris Lee', 
        dueDate: '2024-10-19' 
      }
    ],
    nextSteps: [
      'Daily standups at 9 AM starting tomorrow',
      'Sprint review scheduled for Friday at 2 PM',
      'Retrospective immediately following sprint review'
    ],
    attendeeIds: ['user4', 'user5', 'user6'],
    attendeeNames: ['Alex Kumar', 'Emma Wilson', 'Chris Lee'],
    linkedProjectId: 'api-improvements',
    createdAt: new Date('2024-10-14T10:00:00Z'),
    updatedAt: new Date('2024-10-14T11:00:00Z'),
    processedAt: new Date('2024-10-14T11:05:00Z')
  },
  {
    id: '3',
    userId: 'demo-user-123',
    originalFilename: 'client-kickoff.m4a',
    fileHash: 'def456jkl789',
    fileSizeBytes: 7340032,
    fileSizeMB: 7.0,
    title: 'Acme Corp - Project Kickoff',
    date: '2024-10-13T15:00:00Z',
    duration: '58:45',
    transcript: 'Thank you all for joining today\'s kickoff meeting for the Acme Corp implementation project. I\'m excited to partner with your team on this initiative.\n\nLet me introduce our team. I\'m Jennifer from account management, and with me are our technical leads Tom and Rachel.\n\nGreat to meet everyone. Can you walk us through your current pain points and what you hope to achieve?\n\nAbsolutely. Our main challenge is data integration across multiple legacy systems. We need a unified dashboard that gives us real-time visibility into operations.\n\nThat makes sense. We\'ve handled similar integrations before. Our proposed timeline is 12 weeks with key milestones every 3 weeks.\n\nThat works for us. What do you need from our team to get started?\n\nWe\'ll need API documentation for your systems, access to staging environments, and weekly check-ins with your technical team.',
    transcriptLength: 3120,
    summary: 'Project kickoff meeting with Acme Corp to discuss implementation of unified dashboard and data integration across legacy systems. 12-week timeline established with clear milestones and deliverables.',
    keyPoints: [
      'Client needs unified dashboard for real-time operations visibility',
      'Multiple legacy systems require integration',
      'Project timeline set at 12 weeks with 3-week milestone intervals',
      'Similar projects have been successfully completed before',
      'Weekly check-ins established for ongoing communication'
    ],
    decisions: [
      'Start with API integration phase in week 1',
      'Weekly status meetings scheduled for Fridays at 2 PM',
      'Client will provide staging environment access by end of week',
      'Use Slack channel for day-to-day communications'
    ],
    actionItems: [
      { 
        task: 'Send client onboarding package and NDA', 
        assignee: 'Jennifer Martinez', 
        dueDate: '2024-10-15' 
      },
      { 
        task: 'Review client API documentation and create integration plan', 
        assignee: 'Tom Anderson', 
        dueDate: '2024-10-17' 
      },
      { 
        task: 'Set up project tracking board and invite client stakeholders', 
        assignee: 'Rachel Green', 
        dueDate: '2024-10-16' 
      },
      {
        task: 'Schedule technical deep-dive session with client engineering team',
        assignee: 'Tom Anderson',
        dueDate: '2024-10-18'
      }
    ],
    nextSteps: [
      'Client to provide API documentation by Wednesday',
      'Technical deep-dive scheduled for next Monday',
      'Project kickoff celebration with full teams next Friday'
    ],
    attendeeIds: ['user7', 'user8', 'user9', 'user10', 'user11'],
    attendeeNames: ['Jennifer Martinez', 'Tom Anderson', 'Rachel Green', 'John Smith (Client)', 'Amy Chen (Client)'],
    createdAt: new Date('2024-10-13T15:00:00Z'),
    updatedAt: new Date('2024-10-13T16:15:00Z'),
    processedAt: new Date('2024-10-13T16:20:00Z')
  }
];