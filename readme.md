Jarvis - AI-Powered Meeting Assistant & Personal CRM

Transform your meetings into actionable insights with AI-powered transcription, smart summaries, and automated workflows.

Live Demo: http://localhost:8080/api-docs (Swagger UI)

🎯 What is Jarvis?
Jarvis is your intelligent assistant that:

🎤 Transcribes meetings using OpenAI Whisper
🤖 Analyzes content with GPT-4 to extract key points, decisions, and action items
📧 Automates workflows with n8n for PDFs, emails, and reports
👥 Manages contacts from business cards and Google Contacts with full data model support
📅 Syncs calendars to keep you organized
📊 Generates reports on your activities and projects
🔍 Detects duplicates to prevent reprocessing the same files
🏢 Manages teams and projects with a structured organization framework


✨ Key Features
🎙️ Meeting Intelligence

Audio Transcription: Upload any audio file (m4a, mp3, wav) and get instant transcription
AI Analysis: GPT-4 extracts summaries, key points, decisions, and action items
Duplicate Detection: SHA-256 hash matching prevents duplicate uploads
Filename Tracking: Every meeting saves original filename, size, and hash
Meeting Metadata: Auto-extracts attendees, duration, and topics
Project Linking: Associate meetings with specific projects or tasks

👥 Contact Management (Google Contacts Compatible)

Full Google Contacts Data Model: Support for multiple emails, phones, and addresses
Business Card OCR: Scan business cards to extract contact info
Google Contacts Sync: Bidirectional sync with complete field support
Rich Contact Data: Names, organizations, websites, social profiles, birthdays, relations
Smart Organization: Tag, search, and manage relationships
Export & Share: Generate vCards and share contacts

Supported Contact Fields

Multiple Email Addresses: Work, home, other, custom types
Multiple Phone Numbers: Mobile, work, home, fax, pager, etc.
Multiple Physical Addresses: Structured with street, city, state, zip, country
Organizations: Company, title, department, dates
Websites & Social Profiles: LinkedIn, Twitter, GitHub, personal sites
Personal Details: Birthdays, anniversaries, gender
Relations: Family, professional relationships
Custom Fields: User-defined data

📅 Calendar Integration

Google Calendar Sync: Import events automatically
Meeting Context: Link calendar events to meeting minutes and projects
Upcoming Events: Quick view of what's next

📊 Automated Reports

Weekly Activity Reports: Email summary of meetings, tasks, and progress
Project Status Updates: Health metrics and task completion for portfolios and projects
Daily Task Digests: Morning email with today's priorities

⚡ n8n Workflows

PDF Generation: Beautiful meeting minutes PDFs
Email Distribution: Automatic attendee notifications
Slack Integration: Post updates to team channels
Custom Workflows: Build your own automation for tasks and projects

🏢 Team & Project Management

Organization Framework: Structure your company account with workspaces, teams, portfolios, projects, sections, and tasks
Workspaces: Group related teams and projects (e.g., "Engineering Workspace")
Teams: Optional grouping for projects (e.g., "Frontend Team")
Portfolios: Aggregate projects for high-level reporting (e.g., "Q4 Roadmap")
Projects: Manage specific initiatives with tasks and sections (e.g., "Mobile App Redesign")
Sections: Organize tasks within projects (e.g., "Planning", "Development")
Tasks: Assign tasks with subtasks, assignees, tags, custom fields, and dependencies
Status Tracking: Roll up task and project completion for portfolio-level insights


🗂️ Architecture
┌──────────────────────────────────────────────────────────┐
│                  Jarvis Ecosystem                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐     │
│  │   Frontend   │  │   Backend    │  │    n8n    │     │
│  │  (React)     │  │  (Express)   │  │ (Workflows)│     │
│  │  Port 5173   │  │  Port 8080   │  │ Port 5678 │     │
│  └──────────────┘  └──────────────┘  └───────────┘     │
│         │                 │                  │           │
│         └─────────────────┴──────────────────┘           │
│                           │                              │
├───────────────────────────┼──────────────────────────────┤
│                           ▼                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │            Services & Integrations                │   │
│  ├──────────────────────────────────────────────────┤   │
│  │  🤖 OpenAI (Whisper + GPT-4o-mini)               │   │
│  │  🔥 Firebase/Firestore (Database)                │   │
│  │  📧 Gmail API (Email sending)                    │   │
│  │  👥 Google People API (Contacts - Full Support)  │   │
│  │  📅 Google Calendar API (Events)                 │   │
│  │  💾 Google Drive API (PDF storage)               │   │
│  │  🏢 Project Management (Workspaces, Teams,       │   │
│  │      Portfolios, Projects, Tasks)                │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
└──────────────────────────────────────────────────────────┘


🚀 Quick Start
Prerequisites

Node.js 18+
Firebase account
OpenAI API key
Google Cloud project (for OAuth)

1. Clone & Install
git clone https://github.com/yourusername/jarvis.git
cd jarvis

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies (optional)
cd ../frontend
npm install

2. Configure Environment
Create backend/.env:
# Firebase
FIREBASE_PROJECT_ID=your-firebase-project-id
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json

# OpenAI
OPENAI_API_KEY=sk-proj-your-openai-key

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8080/api/integration/oauth/google/callback

# n8n
N8N_BASE_URL=http://localhost:5678
N8N_WEBHOOK_SECRET=your-webhook-secret

# Server
PORT=8080
NODE_ENV=development

3. Set Up Firebase

Go to Firebase Console
Create a new project
Enable Firestore Database
Download service account key → save as backend/serviceAccountKey.json

4. Create Firestore Indexes
Create these composite indexes in Firestore:
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
      "collectionGroup": "contacts",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "source", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "meeting_minutes",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "fileHash", "order": "ASCENDING" }
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

5. Get OpenAI API Key

Go to OpenAI Platform
Create new secret key
Copy to .env file

6. Set Up Google OAuth (Optional)
See Google OAuth Setup Guide for detailed instructions.
7. Start the Backend
cd backend
npm run dev

You should see:
✅ Firebase Admin initialized
🚀 Jarvis backend running on port 8080
📊 Health check: http://localhost:8080/health

8. Access Swagger UI
Open http://localhost:8080/api-docs

Click "Authorize"
Enter x-user-id: test-user-123
Start testing APIs!

9. Start n8n (Optional)
cd jarvis
docker-compose up -d n8n postgres

Access n8n UI at http://localhost:5678

📖 API Documentation
Interactive Swagger UI
http://localhost:8080/api-docs
Key Endpoints
Meetings

POST /api/meetings/upload - Upload & transcribe audio
GET /api/meetings - List all meetings
GET /api/meetings/{id} - Get meeting details
POST /api/meetings/{id}/generate-pdf - Generate PDF
POST /api/meetings/{id}/email - Email minutes
DELETE /api/meetings/{id} - Delete meeting
POST /api/meetings/{id}/link-project - Link meeting to a project

Contacts (Enhanced with Google Contacts Model)

POST /api/contacts/sync/google - Sync Google Contacts (full field support)
GET /api/contacts - List all contacts
GET /api/contacts/{id} - Get contact details
POST /api/contacts - Create new contact
PATCH /api/contacts/{id} - Update contact
DELETE /api/contacts/{id} - Delete contact
POST /api/contacts/{id}/sync-to-google - Push contact to Google

Business Card

POST /api/business-card/scan - Scan business card
GET /api/business-card/history - Scan history

Calendar

POST /api/calendar/sync/google - Sync Google Calendar
GET /api/calendar/events - List events
GET /api/calendar/events/upcoming - Upcoming events

Reports

POST /api/reports/weekly - Weekly activity report
POST /api/reports/project-status/{projectId} - Project status
POST /api/reports/task-digest - Daily task digest
POST /api/reports/portfolio-status/{portfolioId} - Portfolio status

Projects & Tasks

POST /api/workspaces - Create a new workspace
POST /api/teams - Create a new team
POST /api/portfolios - Create a new portfolio
POST /api/projects - Create a new project
POST /api/sections - Create a new section within a project
POST /api/tasks - Create a new task
PATCH /api/tasks/{id} - Update task (e.g., assign, add dependencies)
GET /api/projects/{id} - Get project details with sections and tasks
GET /api/portfolios/{id} - Get portfolio details with rolled-up status
DELETE /api/tasks/{id} - Delete task
DELETE /api/projects/{id} - Delete project

Integration

GET /api/integration/status - Check integration status
POST /api/integration/sync-all - Sync all integrations
POST /api/integration/oauth/google - Save Google tokens


🧪 Testing
Test Meeting Upload

Go to Swagger UI: http://localhost:8080/api-docs
Find Meetings → POST /api/meetings/upload
Click "Try it out"
Upload an audio file
Click "Execute"

You'll get back:
{
  "success": true,
  "meetingMinutesId": "abc123",
  "message": "Meeting processed successfully",
  "filename": "quarterly-review.m4a"
}

Test Google Contacts Sync

Ensure you have Google OAuth set up
Use Swagger UI or curl:

curl -X 'POST' \
  'http://localhost:8080/api/contacts/sync/google' \
  -H 'x-user-id: your-email@example.com' \
  -d ''

Response:
{
  "success": true,
  "count": 1250,
  "message": "Synced 1250 contacts from Google"
}

Test Contact Creation with Multiple Fields
curl -X 'POST' \
  'http://localhost:8080/api/contacts' \
  -H 'x-user-id: test-user-123' \
  -H 'Content-Type: application/json' \
  -d '{
    "names": [{
      "givenName": "John",
      "familyName": "Doe",
      "displayName": "John Doe"
    }],
    "emailAddresses": [
      { "value": "john@work.com", "type": "work" },
      { "value": "john@home.com", "type": "home" }
    ],
    "phoneNumbers": [
      { "value": "+1-555-1234", "type": "mobile" },
      { "value": "+1-555-5678", "type": "work" }
    ],
    "addresses": [{
      "type": "work",
      "streetAddress": "123 Main St",
      "city": "San Francisco",
      "region": "CA",
      "postalCode": "94105",
      "country": "United States"
    }],
    "organizations": [{
      "name": "Acme Corp",
      "title": "Software Engineer",
      "type": "work",
      "current": true
    }]
  }'

Test Task Creation

Use Swagger UI or curl:

curl -X 'POST' \
  'http://localhost:8080/api/tasks' \
  -H 'x-user-id: test-user-123' \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Research competitors",
    "projectId": "mobile-app-redesign",
    "sectionId": "planning",
    "assigneeId": "alice-user-123",
    "tags": ["Research"],
    "customFields": { "Priority": "High" },
    "subtasks": [{ "title": "Analyze App Store" }]
  }'

Response:
{
  "success": true,
  "taskId": "task123",
  "message": "Task created successfully"
}

Test Duplicate Detection

Upload the same file again
You'll get a 409 Conflict error:

{
  "error": "Duplicate file",
  "message": "This file has already been processed. Existing meeting ID: abc123",
  "details": "This recording has already been uploaded and processed."
}

View Meeting Details

GET /api/meetings to see all meetings
GET /api/meetings/{id} to see full details including:
Transcript
AI-generated summary
Key points
Decisions
Action items
File metadata
Linked project/task




💰 Cost Estimate
Development (You)

OpenAI API: ~$0.50-2/meeting (Whisper + GPT-4o-mini)
Firebase: $0 (free tier covers 50K reads/20K writes per day)
Google Cloud: $0 (free tier)
Total: ~$5-10/month for moderate use

Production Deployment

Cloud Run (Backend): $0 (free tier) to $10/month
Cloud Run (n8n): $10-15/month
Cloud SQL: $7/month (optional, SQLite works fine)
OpenAI: Based on usage
Total: ~$20-40/month


🎯 Use Cases
For Individuals

Record and transcribe personal meetings
Extract action items automatically
Search meeting history
Generate weekly progress reports
Manage comprehensive contact database
Organize tasks within projects

For Small Teams

Share meeting minutes automatically
Track project decisions
Maintain unified contact database with Google Contacts sync
Automate status reports
Collaborate on projects with task assignments and dependencies

For Managers

Review team meetings
Track action items across projects
Generate executive summaries
Monitor project and portfolio health
Access complete contact information
Oversee team workflows and task progress


🔒 Security & Privacy

Data Encryption: All data encrypted in transit (HTTPS) and at rest (Firebase)
User Isolation: Each user's data is completely isolated
API Authentication: Header-based authentication (upgrade to Firebase Auth recommended)
Duplicate Prevention: SHA-256 hashing prevents data duplication
No Data Sharing: Your data stays in your Firebase project
GDPR Compliant: Export and delete data anytime


🛠️ Tech Stack
Backend

Node.js + Express: REST API
TypeScript: Type safety
Firebase Admin SDK: Database & authentication
OpenAI: Whisper (transcription) + GPT-4o-mini (analysis)
Multer: File upload handling
Swagger: API documentation
Google APIs: People API (Contacts), Calendar API, Drive API

Frontend (Optional)

React + TypeScript: Modern UI
Vite: Fast development
Tailwind CSS: Styling

Automation

n8n: Workflow automation
Docker Compose: Local development

Cloud Services

Google Cloud Run: Serverless deployment
Firebase Firestore: NoSQL database
Google Secret Manager: API key storage
Cloud Storage: File storage


📚 Documentation

Technical Overview - Architecture deep dive
Deployment Guide - Cloud Run deployment
n8n Workflows - Automation setup
Google OAuth Setup - OAuth configuration
API Reference - Interactive Swagger docs
Contact Data Model - Google Contacts compatible schema
Project Management Model - Workspaces, teams, portfolios, projects, tasks


🗺️ Roadmap
v1.1 (Completed)

✅ Duplicate detection
✅ Filename tracking
✅ File size logging
✅ Enhanced metadata extraction
✅ Google Contacts full data model support
✅ Multiple emails, phones, addresses per contact
✅ Bidirectional Google Contacts sync

v1.2 (Next)

 Real-time transcription streaming
 Multi-language support
 Speaker diarization
 Meeting templates
 Custom action item extraction
 Contact merge and deduplication
 Advanced contact search and filtering
 Task dependency visualization
 Portfolio-level analytics

v2.0 (Future)

 Video call integration (Zoom, Meet)
 Real-time collaboration
 Mobile apps (iOS, Android)
 Advanced analytics dashboard
 Team workspaces
 API webhooks
 Contact sharing and permissions
 Cross-project task dependencies


🤝 Contributing
Contributions welcome! Please read our Contributing Guide first.
Development Workflow
# Create feature branch
git checkout -b feature/amazing-feature

# Make changes
npm run dev

# Test
npm test

# Commit
git commit -m "Add amazing feature"

# Push
git push origin feature/amazing-feature

# Create Pull Request


📄 License
MIT License - see LICENSE file for details.

🙏 Acknowledgments

OpenAI - Whisper & GPT-4
Firebase - Database & hosting
n8n - Workflow automation
Google Cloud - Infrastructure
Google People API - Contacts integration


📧 Support

Documentation: http://localhost:8080/api-docs
Issues: GitHub Issues
Discussions: GitHub Discussions
Email: support@jarvis.com


🌟 Star Us!
If you find Jarvis helpful, please give us a star on GitHub! ⭐

Made with ❤️ by developers, for developers