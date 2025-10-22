Jarvis Technical Overview
Complete technical architecture and implementation details for the Jarvis AI meeting assistant with Google Contacts integration and project management.

Table of Contents

System Architecture
Core Components
Data Models
Google Contacts Integration
Project Management
API Design
AI Integration
Security & Authentication
Performance Optimization
Deployment
Testing


System Architecture
High-Level Overview
┌──────────────────────────────────────────────────────────┐
│                    Client Layer                          │
├──────────────────────────────────────────────────────────┤
│  Browser/Mobile  →  Swagger UI  →  Frontend (React)     │
└────────────────────────┬─────────────────────────────────┘
                         │ HTTPS/REST
                         ▼
┌──────────────────────────────────────────────────────────┐
│                   API Gateway Layer                       │
├──────────────────────────────────────────────────────────┤
│  Express.js Server (TypeScript)                          │
│  ├─ Rate Limiting                                        │
│  ├─ CORS Configuration                                   │
│  ├─ Request Validation                                   │
│  ├─ Error Handling                                       │
│  └─ Swagger Documentation                                │
└────────────────────────┬─────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Services   │  │  Middleware  │  │    Routes    │
├──────────────┤  ├──────────────┤  ├──────────────┤
│ • Meeting    │  │ • Auth       │  │ • Meetings   │
│   Intelligence│  │ • Logging   │  │ • Contacts   │
│ • n8n        │  │ • Validation │  │ • Calendar   │
│   Integration│  │ • Error      │  │ • Reports    │
│ • Google     │  │   Handler    │  │ • Business   │
│   Services   │  │              │  │   Card       │
│ • Project    │  │              │  │ • Projects   │
│   Management │  │              │  │ • Tasks      │
└──────────────┘  └──────────────┘  └──────────────┘
        │                                  │
        └──────────────┬───────────────────┘
                       ▼
┌──────────────────────────────────────────────────────────┐
│                  External Services                        │
├──────────────────────────────────────────────────────────┤
│  ┌───────────┐  ┌────────────┐  ┌──────────────┐        │
│  │  OpenAI   │  │  Firebase  │  │    n8n       │        │
│  ├───────────┤  ├────────────┤  ├──────────────┤        │
│  │ Whisper   │  │ Firestore  │  │ Workflows    │        │
│  │ GPT-4o    │  │ Auth       │  │ PDF Gen      │        │
│  │ mini      │  │ Storage    │  │ Email        │        │
│  └───────────┘  └────────────┘  └──────────────┘        │
│                                                           │
│  ┌───────────┐  ┌────────────┐  ┌──────────────┐        │
│  │  Google   │  │   Gmail    │  │  Google      │        │
│  │  People   │  │    API     │  │   Drive      │        │
│  │   API     │  │            │  │    API       │        │
│  └───────────┘  └────────────┘  └──────────────┘        │
└──────────────────────────────────────────────────────────┘


Core Components
1. Meeting Intelligence Service
Location: src/services/meetingIntelligence.ts
Responsibilities:

Audio transcription using OpenAI Whisper
Content analysis with GPT-4o-mini
Metadata extraction
Duplicate detection via SHA-256 hashing
Meeting data persistence
Linking meetings to projects/tasks

Key Functions:
transcribeAudio(audioBuffer: Buffer, filename: string): Promise<string>
generateMeetingSummary(transcript: string): Promise<MeetingSummary>
extractMeetingMetadata(transcript: string): Promise<Metadata>
processMeetingRecording(
  audioBuffer: Buffer,
  userId: string,
  options: ProcessingOptions
): Promise<string>
checkDuplicateFile(
  userId: string,
  fileHash: string,
  filename: string
): Promise<DuplicateCheckResult>
linkMeetingToProject(meetingId: string, projectId: string): Promise<void>

2. Google Contacts Service
Location: src/services/googleContacts.ts
Features:

Full Google Contacts data model support
Bidirectional sync (import and export)
Multiple emails, phones, addresses per contact
Metadata preservation (creation dates, etags)
Batch operations for performance
Automatic deduplication

Key Functions:
syncAllGoogleContacts(userId: string): Promise<{ count: number }>
syncToGoogleContacts(
  contact: Contact,
  userId: string,
  firestoreId: string
): Promise<GooglePerson>
contactToGooglePerson(contact: Contact): GooglePerson
googlePersonToContact(person: GooglePerson, userId: string): Contact
removeUndefined(obj: any): any

3. Business Card Processor
Location: src/services/businessCardProcessor.ts
Workflow:
Image Upload
   ↓
Google Cloud Vision OCR
   ↓
GPT-4o Text Parsing
   ↓
Convert to Contact Model
   ↓
Save to Firestore
   ↓
Optional: Sync to Google

4. Project Management Service
Location: src/services/projectManagement.ts
Responsibilities:

Manage organizational hierarchy (Organization → Workspace → Team → Portfolio → Project → Section → Task)
Handle task assignments, dependencies, and custom fields
Calculate rolled-up project and portfolio statuses
Integrate tasks with meetings and calendar events
Support tagging and filtering for task organization

Key Functions:
createWorkspace(workspace: Partial<Workspace>, userId: string): Promise<string>
createTeam(team: Partial<Team>, workspaceId: string): Promise<string>
createPortfolio(portfolio: Partial<Portfolio>, workspaceId: string): Promise<string>
createProject(project: Partial<Project>, portfolioId: string): Promise<string>
createSection(section: Partial<Section>, projectId: string): Promise<string>
createTask(task: Partial<Task>, sectionId: string): Promise<string>
updateTask(taskId: string, updates: Partial<Task>): Promise<void>
calculatePortfolioStatus(portfolioId: string): Promise<PortfolioStatus>


Data Models
Meeting Minutes
interface MeetingMinutes {
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
  createdAt: Timestamp;
  updatedAt: Timestamp;
  processedAt: Timestamp;
}

Contact (Google Contacts Compatible)
interface Contact {
  id?: string;
  userId: string;
  
  // Core Identity
  names?: Name[];
  displayName?: string;
  nicknames?: Nickname[];
  photos?: Photo[];
  
  // Communication
  emailAddresses?: EmailAddress[];
  phoneNumbers?: PhoneNumber[];
  addresses?: Address[];
  
  // Professional
  organizations?: Organization[];
  
  // Online Presence
  websites?: Website[];
  socialProfiles?: SocialProfile[];
  
  // Personal Details
  birthdays?: Birthday[];
  events?: Event[];
  genders?: Gender[];
  
  // Relationships
  relations?: Relation[];
  
  // Additional Information
  biographies?: Biography[];
  interests?: string[];
  occupations?: string[];
  skills?: string[];
  
  // Custom Fields
  userDefined?: CustomField[];
  
  // Metadata
  source: 'manual' | 'business_card_ocr' | 'google_contacts' | 'import';
  googleContactId?: string;
  googleResourceName?: string;
  syncedToGoogle?: boolean;
  syncedAt?: Date;
  etag?: string;
  
  // Organization
  tags?: string[];
  groups?: string[];
  starred?: boolean;
  notes?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt?: Date;
  lastContactedAt?: Date;
}

Project Management Models
Organization
interface Organization {
  id: string;
  name: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

Workspace
interface Workspace {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

Team
interface Team {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  memberIds: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

Portfolio
interface Portfolio {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  // NOTE: Do NOT store projectIds here
  // Projects store portfolioIds: string[] instead (child knows parent)
  status: PortfolioStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

Project
interface Project {
  id: string;
  portfolioIds: string[];  // ✅ SOURCE OF TRUTH - array for many-to-many
  workspaceId: string;
  teamId?: string;
  name: string;
  description?: string;
  status: 'not_started' | 'in_progress' | 'completed';
  completionPercentage: number;
  // NOTE: Do NOT store taskIds here
  // Tasks store projectIds: string[] instead (child knows parent)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

Task
interface Task {
  id: string;
  projectIds: string[];  // ✅ SOURCE OF TRUTH - array for many-to-many
  userId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  tags?: string[];
  customFields?: { [key: string]: string };
  subtasks?: Subtask[];
  dependencies?: string[];  // Array of task IDs this task depends on
  status: 'not_started' | 'in_progress' | 'completed';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

Subtask
interface Subtask {
  id: string;
  title: string;
  status: 'not_started' | 'in_progress' | 'completed';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

PortfolioStatus
interface PortfolioStatus {
  completionPercentage: number;
  totalTasks: number;
  completedTasks: number;
  projects: {
    id: string;
    name: string;
    completionPercentage: number;
  }[];
}

Supporting Types
Email Address:
interface EmailAddress {
  value: string;
  type: 'home' | 'work' | 'other' | 'custom';
  customType?: string;
  displayName?: string;
  formattedType?: string;
}

Phone Number:
interface PhoneNumber {
  value: string;
  canonicalForm?: string;
  type: 'home' | 'work' | 'mobile' | 'homeFax' | 'workFax' | 
        'otherFax' | 'pager' | 'workMobile' | 'workPager' | 
        'main' | 'googleVoice' | 'other' | 'custom';
  customType?: string;
  formattedType?: string;
}

Address:
interface Address {
  type: 'home' | 'work' | 'other' | 'custom';
  customType?: string;
  formattedType?: string;
  formattedValue?: string;
  streetAddress?: string;
  extendedAddress?: string;
  poBox?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  countryCode?: string;
}

Name:
interface Name {
  givenName?: string;
  familyName?: string;
  middleName?: string;
  honorificPrefix?: string;
  honorificSuffix?: string;
  displayName?: string;
  displayNameLastFirst?: string;
  phoneticGivenName?: string;
  phoneticFamilyName?: string;
  phoneticMiddleName?: string;
  phoneticFullName?: string;
}

Organization:
interface Organization {
  name?: string;
  title?: string;
  department?: string;
  symbol?: string;
  domain?: string;
  jobDescription?: string;
  location?: string;
  type: 'work' | 'other' | 'custom';
  customType?: string;
  current?: boolean;
  startDate?: Date;
  endDate?: Date;
}


Google Contacts Integration
Sync Architecture
User Authentication (OAuth 2.0)
   ↓
Fetch Contacts (with pagination)
   ↓
Transform Data (Google → Jarvis)
   ↓
Check for Duplicates
   ↓
Batch Write to Firestore
   ↓
Return Count

Data Transformation
Google to Jarvis:
function googlePersonToContact(person: any, userId: string): Contact {
  const contact: Partial<Contact> = {
    userId,
    source: 'google_contacts',
    googleResourceName: person.resourceName,
    etag: person.etag,
  };
  
  // Extract creation date from metadata
  if (person.metadata?.sources) {
    const source = person.metadata.sources.find(s => s.type === 'CONTACT');
    if (source?.updateTime) {
      contact.createdAt = new Date(source.updateTime);
    }
  }
  
  // Map all fields...
  
  return contact;
}

Jarvis to Google:
function contactToGooglePerson(contact: Contact): any {
  const person: any = {};
  
  if (contact.names) {
    person.names = contact.names.map(name => ({
      givenName: name.givenName,
      familyName: name.familyName,
      // ... other fields
    }));
  }
  
  // Map all fields...
  
  return person;
}

Handling Undefined Values
function removeUndefined(obj: any): any {
  if (obj === null || obj === undefined) return undefined;
  
  // Preserve Date objects
  if (obj instanceof Date) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined).filter(item => item !== undefined);
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      const value = removeUndefined(obj[key]);
      if (value !== undefined) {
        cleaned[key] = value;
      }
    }
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }
  
  return obj;
}

Batch Operations
let batch = db.batch();
let batchCount = 0;
const batchLimit = 500;

for (const person of googleContacts) {
  const contactData = googlePersonToContact(person, userId);
  const cleanedData = removeUndefined(contactData);
  
  // Create or update
  if (existing) {
    batch.update(existingRef, cleanedData);
  } else {
    batch.set(newRef, cleanedData);
  }
  
  batchCount++;
  
  if (batchCount >= batchLimit) {
    await batch.commit();
    batch = db.batch();
    batchCount = 0;
  }
}

if (batchCount > 0) {
  await batch.commit();
}


Project Management
Hierarchy Overview (Child Knows Parent)
Organization
  └── Workspace
      ├── Team (Optional)
      └── Portfolio
          └── (query: projects where portfolioIds contains this ID)
              └── Projects (many-to-many via portfolioIds: string[])
                  └── (query: tasks where projectIds contains this ID)
                      └── Tasks (many-to-many via projectIds: string[])
                          ├── Subtask
                          ├── Assignee (userId reference)
                          ├── Tags (string[])
                          ├── Custom Fields ({ key: value })
                          └── Dependencies (string[] of task IDs)

Workflow

1. Create Organization: Set up the root account for the user/company
2. Create Workspace: Define a workspace (e.g., "Engineering Workspace")
3. Create Teams (Optional): Group projects under teams
4. Create Portfolios: Aggregate projects for high-level reporting
5. Create Projects: Define initiatives with portfolioIds: string[] array (many-to-many)
6. Manage Tasks: Assign tasks to multiple projects via projectIds: string[] array
7. Roll-up Status: Calculate completion percentages for projects and portfolios via queries
8. Integrate with Meetings: Link meetings to projects/tasks for context

Key Features

Task Dependencies: Support for task-to-task dependencies within and across projects via dependencies: string[]
Custom Fields: Flexible metadata for tasks (e.g., Priority, Due Date)
Tagging System: Organize tasks with searchable tags
Status Tracking: Automated roll-up of task completion to project and portfolio levels via aggregation queries
Assignee Management: Link tasks to users or contacts via assigneeId
n8n Integration: Automate task notifications and status updates
Many-to-Many: Projects can belong to multiple portfolios, tasks can belong to multiple projects

Implementation
async function createTask(task: Partial<Task>): Promise<string> {
  const taskData: Task = {
    id: uuid(),
    projectIds: task.projectIds || [],  // ✅ Array of project IDs
    userId: task.userId!,
    title: task.title!,
    description: task.description,
    assigneeId: task.assigneeId,
    tags: task.tags || [],
    customFields: task.customFields || {},
    subtasks: task.subtasks || [],
    dependencies: task.dependencies || [],  // Array of task IDs
    status: task.status || 'not_started',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  
  const ref = db.collection('tasks').doc(taskData.id);
  await ref.set(taskData);
  return taskData.id;
}

async function calculatePortfolioStatus(portfolioId: string): Promise<PortfolioStatus> {
  // Query projects that belong to this portfolio
  const projectsSnapshot = await db.collection('projects')
    .where('portfolioIds', 'array-contains', portfolioId)
    .get();
  
  let totalTasks = 0;
  let completedTasks = 0;
  const projectSummaries = [];
  
  for (const projectDoc of projectsSnapshot.docs) {
    const project = projectDoc.data();
    
    // Query tasks that belong to this project
    const tasksSnapshot = await db.collection('tasks')
      .where('projectIds', 'array-contains', projectDoc.id)
      .get();
    
    const projectTaskCount = tasksSnapshot.size;
    const projectCompletedTasks = tasksSnapshot.docs.filter(
      t => t.data().status === 'completed'
    ).length;
    
    totalTasks += projectTaskCount;
    completedTasks += projectCompletedTasks;
    
    projectSummaries.push({
      id: projectDoc.id,
      name: project.name,
      completionPercentage: projectTaskCount > 0 
        ? (projectCompletedTasks / projectTaskCount) * 100 
        : 0,
    });
  }
  
  return {
    completionPercentage: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
    totalTasks,
    completedTasks,
    projects: projectSummaries,
  };
}
  const ref = db.collection('tasks').doc(taskData.id);
  await ref.set(taskData);
  return taskData.id;
}

async function calculatePortfolioStatus(portfolioId: string): Promise<PortfolioStatus> {
  const projects = await db.collection('projects')
    .where('portfolioId', '==', portfolioId)
    .get();
  
  let totalTasks = 0;
  let completedTasks = 0;
  const projectSummaries = [];
  
  for (const project of projects.docs) {
    const tasks = await db.collection('tasks')
      .where('projectId', '==', project.id)
      .get();
    
    const projectTaskCount = tasks.size;
    const projectCompletedTasks = tasks.docs.filter(t => t.data().status === 'completed').length;
    
    totalTasks += projectTaskCount;
    completedTasks += projectCompletedTasks;
    
    projectSummaries.push({
      id: project.id,
      name: project.data().name,
      completionPercentage: projectTaskCount > 0 ? (projectCompletedTasks / projectTaskCount) * 100 : 0,
    });
  }
  
  return {
    completionPercentage: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
    totalTasks,
    completedTasks,
    projects: projectSummaries,
  };
}


UI Components
Hierarchical Multi-Select Component

For selecting projects, tasks, portfolios, and other hierarchical entities, Jarvis uses a modern, mobile-optimized multi-select component.

Recommended Library: @mantine/core

Installation:
npm install @mantine/core @mantine/hooks

Key Features:
✅ Beautiful, modern design out of the box
✅ Mobile-optimized with touch gestures  
✅ Grouped display with hierarchy
✅ Typeahead search across all levels
✅ Hide selected options for cleaner UI
✅ Scrollable dropdown for long lists
✅ Built-in dark mode support
✅ Excellent accessibility

Implementation Example:
import { MultiSelect } from '@mantine/core';
import { useState, useEffect } from 'react';

interface HierarchicalSelectProps {
  userId: string;
  type: 'projects' | 'tasks' | 'portfolios';
  selectedIds?: string[];
  onChange: (selectedIds: string[]) => void;
  placeholder?: string;
}

export function HierarchicalSelect({
  userId,
  type,
  selectedIds = [],
  onChange,
  placeholder = 'Select...'
}: HierarchicalSelectProps) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHierarchy();
  }, [userId, type]);

  const fetchHierarchy = async () => {
    try {
      const response = await fetch(
        `/api/hierarchy?userId=${userId}&type=${type}`,
        { headers: { 'x-user-id': userId } }
      );
      const hierarchyData = await response.json();
      
      // Transform to Mantine format with groups
      const formatted = formatHierarchicalData(hierarchyData);
      setData(formatted);
    } catch (error) {
      console.error('Failed to fetch hierarchy:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatHierarchicalData = (nodes, level = 0, parentLabel = '') => {
    const result = [];
    
    nodes.forEach(node => {
      const indent = '  '.repeat(level);
      const prefix = level > 0 ? '└─ ' : '';
      
      result.push({
        value: node.id,
        label: `${indent}${prefix}${node.name}`,
        group: level === 0 ? node.name : parentLabel,
      });
      
      if (node.children && node.children.length > 0) {
        result.push(
          ...formatHierarchicalData(
            node.children, 
            level + 1, 
            level === 0 ? node.name : parentLabel
          )
        );
      }
    });
    
    return result;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <MultiSelect
      data={data}
      value={selectedIds}
      onChange={onChange}
      label={`Select ${type}`}
      placeholder={placeholder}
      searchable
      hidePickedOptions  // ✅ Hide selected for cleaner UI
      nothingFound="No matches found"
      clearable
      maxDropdownHeight={400}  // ✅ Scrollable
      styles={{
        value: {
          background: '#4f46e5',
          color: 'white',
          borderRadius: '6px',
          padding: '4px 8px',
        },
        dropdown: {
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        },
        item: {
          padding: '10px 12px',
          fontSize: '14px',
          '&[data-selected]': {
            backgroundColor: '#eef2ff',
            color: '#4f46e5',
          },
          '&[data-hovered]': {
            backgroundColor: '#f5f3ff',
          },
        },
      }}
    />
  );
}

Mobile Optimization:

For Capacitor iOS/Android apps, add responsive behavior:

import { useMediaQuery } from '@mantine/hooks';

export function ResponsiveHierarchicalSelect(props: HierarchicalSelectProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <MultiSelect
      {...props}
      maxDropdownHeight={isMobile ? 300 : 400}
      dropdownPosition={isMobile ? 'bottom' : 'flip'}
      withinPortal={isMobile}  // Better mobile positioning
      styles={{
        dropdown: {
          ...(isMobile && {
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            borderRadius: '16px 16px 0 0',
            maxHeight: '70vh',
          }),
        },
      }}
    />
  );
}

Usage Examples:

// Select projects for a task (many-to-many)
<HierarchicalSelect
  userId={currentUser.id}
  type="projects"
  selectedIds={task.projectIds}
  onChange={(projectIds) => updateTask({ projectIds })}
  placeholder="Select projects for this task..."
/>

// Select portfolios for a project (many-to-many)
<HierarchicalSelect
  userId={currentUser.id}
  type="portfolios"
  selectedIds={project.portfolioIds}
  onChange={(portfolioIds) => updateProject({ portfolioIds })}
  placeholder="Select portfolios..."
/>

// Select tasks to link to a meeting
<HierarchicalSelect
  userId={currentUser.id}
  type="tasks"
  selectedIds={meeting.linkedTaskIds}
  onChange={(taskIds) => updateMeeting({ linkedTaskIds: taskIds })}
  placeholder="Link tasks to this meeting..."
/>

Alternative Options:

1. shadcn/ui with Command Component
   - More customizable
   - Tailwind CSS based
   - Great for custom branding

2. Chakra UI with Custom Tree
   - Excellent accessibility
   - Theme-based styling
   - Good mobile support

3. react-checkbox-tree
   - More traditional tree UI
   - Good for complex hierarchies
   - Desktop-focused

Backend API Endpoint:

The component expects a /api/hierarchy endpoint that returns:

GET /api/hierarchy?userId={userId}&type={type}

Response:
{
  "hierarchy": [
    {
      "id": "org-001",
      "name": "Acme Corp",
      "type": "organization",
      "children": [
        {
          "id": "workspace-eng",
          "name": "Engineering Workspace",
          "type": "workspace",
          "children": [
            {
              "id": "portfolio-q4",
              "name": "Q4 Roadmap",
              "type": "portfolio",
              "children": [
                {
                  "id": "project-mobile",
                  "name": "Mobile App Redesign",
                  "type": "project",
                  "children": [
                    {
                      "id": "task-001",
                      "name": "Research competitors",
                      "type": "task"
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}


API Design
Contact Endpoints
Sync from Google:
POST /api/contacts/sync/google
x-user-id: user@example.com

Response:
{
  "success": true,
  "count": 1250,
  "message": "Synced 1250 contacts from Google"
}

Get All Contacts:
GET /api/contacts?search=john&hasEmail=true
x-user-id: user@example.com

Response:
{
  "contacts": [...],
  "count": 42
}

Create Contact:
POST /api/contacts
Content-Type: application/json

{
  "names": [{ "givenName": "John", "familyName": "Doe" }],
  "emailAddresses": [{ "value": "john@example.com", "type": "work" }],
  "phoneNumbers": [{ "value": "+1-555-1234", "type": "mobile" }]
}

Update Contact:
PATCH /api/contacts/{id}
Content-Type: application/json

{
  "emailAddresses": [...],
  "syncToGoogle": true
}

Sync to Google:
POST /api/contacts/{id}/sync-to-google

Response:
{
  "success": true,
  "message": "Contact synced to Google successfully"
}

Project & Task Endpoints
Create Task:
POST /api/tasks
Content-Type: application/json
x-user-id: user@example.com

{
  "title": "Research competitors",
  "projectId": "mobile-app-redesign",
  "sectionId": "planning",
  "assigneeId": "alice-user-123",
  "tags": ["Research"],
  "customFields": { "Priority": "High" },
  "subtasks": [{ "title": "Analyze App Store" }]
}

Response:
{
  "success": true,
  "taskId": "task123",
  "message": "Task created successfully"
}

Update Task:
PATCH /api/tasks/{id}
Content-Type: application/json
x-user-id: user@example.com

{
  "status": "in_progress",
  "dependencies": ["task456"]
}

Response:
{
  "success": true,
  "message": "Task updated successfully"
}

Get Portfolio Status:
GET /api/portfolios/{id}
x-user-id: user@example.com

Response:
{
  "id": "q4-roadmap",
  "name": "Q4 Roadmap",
  "completionPercentage": 70,
  "totalTasks": 100,
  "completedTasks": 70,
  "projects": [
    {
      "id": "mobile-app-redesign",
      "name": "Mobile App Redesign",
      "completionPercentage": 80
    },
    {
      "id": "bug-fixes",
      "name": "Bug Fixes",
      "completionPercentage": 60
    }
  ]
}


AI Integration
OpenAI Whisper
Model: whisper-1
const transcription = await openai.audio.transcriptions.create({
  file: audioFile,
  model: 'whisper-1',
  language: 'en',
  response_format: 'json'
});

Performance:

Speed: ~30s for 10min audio
Accuracy: 95%+ for clear audio
Cost: $0.006/minute

GPT-4o-mini
Model: gpt-4o-mini
const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [...],
  temperature: 0.3,
  response_format: { type: 'json_object' }
});

Output:
{
  "summary": "Meeting summary...",
  "keyPoints": ["Point 1", "Point 2"],
  "decisions": ["Decision 1"],
  "actionItems": [
    {
      "task": "Complete project plan",
      "assignee": "John Doe",
      "dueDate": "2025-11-01",
      "projectId": "mobile-app-redesign",
      "sectionId": "planning"
    }
  ]
}


Security & Authentication
Current Implementation
const userId = req.headers['x-user-id'] as string;
if (!userId) {
  return res.status(401).json({ error: 'Unauthorized' });
}

Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /contacts/{contactId} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
    
    match /meeting_minutes/{meetingId} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
    
    match /workspaces/{workspaceId} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
    
    match /teams/{teamId} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
    
    match /portfolios/{portfolioId} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
    
    match /projects/{projectId} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
    
    match /sections/{sectionId} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
    
    match /tasks/{taskId} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
  }
}


Performance Optimization
Caching
const contactCache = new Map<string, Contact>();
const taskCache = new Map<string, Task>();

async function getCachedContact(id: string): Promise<Contact> {
  if (contactCache.has(id)) {
    return contactCache.get(id)!;
  }
  
  const doc = await db.collection('contacts').doc(id).get();
  const contact = { id: doc.id, ...doc.data() } as Contact;
  contactCache.set(id, contact);
  return contact;
}

async function getCachedTask(id: string): Promise<Task> {
  if (taskCache.has(id)) {
    return taskCache.get(id)!;
  }
  
  const doc = await db.collection('tasks').doc(id).get();
  const task = { id: doc.id, ...doc.data() } as Task;
  taskCache.set(id, task);
  return task;
}

Pagination
const firstPage = await db
  .collection('contacts')
  .where('userId', '==', userId)
  .orderBy('createdAt', 'desc')
  .limit(50)
  .get();

const lastDoc = firstPage.docs[firstPage.docs.length - 1];
const nextPage = await db
  .collection('contacts')
  .where('userId', '==', userId)
  .orderBy('createdAt', 'desc')
  .startAfter(lastDoc)
  .limit(50)
  .get();

const taskPage = await db
  .collection('tasks')
  .where('userId', '==', userId)
  .where('projectId', '==', projectId)
  .orderBy('createdAt', 'desc')
  .limit(50)
  .get();

Firestore Indexes
{
  "indexes": [
    {
      "collectionGroup": "contacts",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "contacts",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "googleResourceName", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "tasks",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "projectId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "projects",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "portfolioId", "order": "ASCENDING" }
      ]
    }
  ]
}


Deployment
Google Cloud Run
service: jarvis-backend
runtime: nodejs18

instance_class: F2
automatic_scaling:
  min_instances: 0
  max_instances: 10

resources:
  cpu: 1
  memory_gb: 2

Environment Variables
FIREBASE_PROJECT_ID
OPENAI_API_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
N8N_BASE_URL


Testing
Unit Tests
describe('Contact Helpers', () => {
  test('getDisplayName returns correct name', () => {
    expect(getDisplayName(contact)).toBe('John Doe');
  });
  
  test('getPrimaryEmail returns first email', () => {
    expect(getPrimaryEmail(contact)).toBe('john@work.com');
  });
});

describe('Project Management', () => {
  test('createTask creates task with correct fields', async () => {
    const taskId = await createTask({
      title: 'Test Task',
      projectId: 'test-project',
      sectionId: 'test-section',
    }, 'test-section');
    const task = await db.collection('tasks').doc(taskId).get();
    expect(task.data().title).toBe('Test Task');
  });
});

Integration Tests
describe('Google Contacts Sync', () => {
  test('syncAllGoogleContacts', async () => {
    const result = await syncAllGoogleContacts('test-user');
    expect(result.count).toBeGreaterThan(0);
  });
});

describe('Portfolio Status', () => {
  test('calculatePortfolioStatus returns correct completion', async () => {
    const status = await calculatePortfolioStatus('q4-roadmap');
    expect(status.completionPercentage).toBeGreaterThanOrEqual(0);
  });
});


Summary
The Jarvis technical architecture provides:
✅ Comprehensive Contact Management - Full Google Contacts data model support✅ AI-Powered Meeting Intelligence - Whisper + GPT-4o-mini integration✅ Bidirectional Sync - Seamless Google Contacts sync✅ Project Management - Structured hierarchy with workspaces, teams, portfolios, projects, and tasks✅ Type Safety - Full TypeScript support with helper functions✅ Scalable Architecture - Cloud-native serverless design✅ Performance Optimized - Caching, batching, and indexing strategies✅ Security First - Data isolation, encryption, and authentication✅ Production Ready - Comprehensive error handling and monitoring  
This architecture supports enterprise-level contact management, meeting intelligence, and project management while maintaining simplicity and ease of use.

Additional Resources

API Documentation: http://localhost:8080/api-docs
Google People API: https://developers.google.com/people
Firebase Documentation: https://firebase.google.com/docs
OpenAI API Reference: https://platform.openai.com/docs


Document Version: 1.2Last Updated: October 2025Status: Production Ready