# Jarvis - AI-Powered Meeting Assistant & Personal CRM

Transform your meetings into actionable insights with AI-powered transcription, smart summaries, and automated workflows.

**Live Demo:** http://localhost:8080/api-docs (Swagger UI)

---

## 🎯 What is Jarvis?

Jarvis is your intelligent assistant that:

- 🎤 **Transcribes meetings** using OpenAI Whisper
- 🤖 **Analyzes content** with GPT-4 to extract key points, decisions, and action items
- 📧 **Automates workflows** with n8n for PDFs, emails, and reports
- 👥 **Manages contacts** from business cards and Google Contacts with full data model support
- 📅 **Syncs calendars** to keep you organized
- 📊 **Generates reports** on your activities and projects
- 🔍 **Detects duplicates** to prevent reprocessing the same files
- 🏢 **Manages teams and projects** with a structured organization framework

---

## ✨ Key Features

### 🎙️ Meeting Intelligence

- **Audio Transcription:** Upload any audio file (m4a, mp3, wav) and get instant transcription
- **AI Analysis:** GPT-4 extracts summaries, key points, decisions, and action items
- **Duplicate Detection:** SHA-256 hash matching prevents duplicate uploads
- **Filename Tracking:** Every meeting saves original filename, size, and hash
- **Meeting Metadata:** Auto-extracts attendees, duration, and topics
- **Project Linking:** Associate meetings with specific projects or tasks

### 👥 Contact Management (Google Contacts Compatible)

- **Full Google Contacts Data Model:** Support for multiple emails, phones, and addresses
- **Business Card OCR:** Scan business cards to extract contact info
- **Google Contacts Sync:** Bidirectional sync with complete field support
- **Rich Contact Data:** Names, organizations, websites, social profiles, birthdays, relations
- **Smart Organization:** Tag, search, and manage relationships
- **Export & Share:** Generate vCards and share contacts

**Supported Contact Fields:**
- Multiple Email Addresses: Work, home, other, custom types
- Multiple Phone Numbers: Mobile, work, home, fax, pager, etc.
- Multiple Physical Addresses: Structured with street, city, state, zip, country
- Organizations: Company, title, department, dates
- Websites & Social Profiles: LinkedIn, Twitter, GitHub, personal sites
- Personal Details: Birthdays, anniversaries, gender
- Relations: Family, professional relationships
- Custom Fields: User-defined data

### 📅 Calendar Integration

- **Google Calendar Sync:** Import events automatically
- **Meeting Context:** Link calendar events to meeting minutes and projects
- **Upcoming Events:** Quick view of what's next

### 📊 Automated Reports

- **Weekly Activity Reports:** Email summary of meetings, tasks, and progress
- **Project Status Updates:** Health metrics and task completion for portfolios and projects
- **Daily Task Digests:** Morning email with today's priorities

### ⚡ n8n Workflows

- **PDF Generation:** Beautiful meeting minutes PDFs
- **Email Distribution:** Automatic attendee notifications
- **Slack Integration:** Post updates to team channels
- **Custom Workflows:** Build your own automation for tasks and projects

### 🏢 Team & Project Management

**Organization Framework:** Structure your company account with workspaces, teams, portfolios, projects, and tasks

- **Workspaces:** Group related teams and projects (e.g., "Engineering Workspace")
- **Teams:** Optional grouping for projects (e.g., "Frontend Team")
- **Portfolios:** Aggregate multiple projects for high-level reporting (e.g., "Q4 Roadmap")
- **Projects:** Manage specific initiatives - can belong to **MULTIPLE portfolios** (many-to-many)
- **Tasks:** Assign to **MULTIPLE projects** with subtasks, assignees, tags, custom fields, and task dependencies
- **Status Tracking:** Roll up task and project completion for portfolio-level insights

**Data Model (Child Knows Parent):**
- Projects store `portfolioIds: string[]` - array of portfolio IDs they belong to
- Tasks store `projectIds: string[]` - array of project IDs they belong to
- Many-to-many relationships via ID arrays (not text names)
- No "Sections" - tasks link directly to projects

**Firestore Queries:**
```typescript
// Get all projects in a portfolio
where('portfolioIds', 'array-contains', portfolioId)

// Get all tasks in a project
where('projectIds', 'array-contains', projectId)
```

---

## 🗂️ Architecture

```
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
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Firebase account
- OpenAI API key
- Google Cloud project (for OAuth)

### 1. Clone & Install

```bash
git clone https://github.com/tokyojordan/jarvis.git
cd jarvis

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies (optional)
cd ../frontend
npm install
```

### 2. Configure Environment

Create `backend/.env`:

```env
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
```

### 3. Set Up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable Firestore Database
4. Download service account key → save as `backend/serviceAccountKey.json`

### 4. Create Firestore Indexes

Create these composite indexes in Firestore:

```json
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
        { "fieldPath": "projectIds", "arrayConfig": "CONTAINS" }
      ]
    },
    {
      "collectionGroup": "projects",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "portfolioIds", "arrayConfig": "CONTAINS" }
      ]
    }
  ]
}
```

### 5. Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com)
2. Create new secret key
3. Copy to `.env` file

### 6. Start the Backend

```bash
cd backend
npm run dev
```

You should see:
```
✅ Firebase Admin initialized
🚀 Jarvis backend running on port 8080
📊 Health check: http://localhost:8080/health
```

### 7. Access Swagger UI

1. Open http://localhost:8080/api-docs
2. Click "Authorize"
3. Enter `x-user-id: test-user-123`
4. Start testing APIs!

---

## 📖 API Documentation

**Interactive Swagger UI:** http://localhost:8080/api-docs

### Key Endpoints

#### Meetings

- `POST /api/meetings/upload` - Upload & transcribe audio
- `GET /api/meetings` - List all meetings
- `GET /api/meetings/{id}` - Get meeting details
- `POST /api/meetings/{id}/generate-pdf` - Generate PDF
- `POST /api/meetings/{id}/email` - Email minutes
- `DELETE /api/meetings/{id}` - Delete meeting

#### Contacts (Enhanced with Google Contacts Model)

- `POST /api/contacts/sync/google` - Sync Google Contacts (full field support)
- `GET /api/contacts` - List all contacts
- `GET /api/contacts/{id}` - Get contact details
- `POST /api/contacts` - Create new contact
- `PATCH /api/contacts/{id}` - Update contact
- `DELETE /api/contacts/{id}` - Delete contact
- `POST /api/contacts/{id}/sync-to-google` - Push contact to Google

#### Business Card

- `POST /api/business-card/scan` - Scan business card
- `GET /api/business-card/history` - Scan history

#### Calendar

- `POST /api/calendar/sync/google` - Sync Google Calendar
- `GET /api/calendar/events` - List events
- `GET /api/calendar/events/upcoming` - Upcoming events

#### Reports

- `POST /api/reports/weekly` - Weekly activity report
- `POST /api/reports/project-status/{projectId}` - Project status
- `POST /api/reports/task-digest` - Daily task digest
- `POST /api/reports/portfolio-status/{portfolioId}` - Portfolio status

#### Projects & Tasks

- `POST /api/workspaces` - Create a new workspace
- `POST /api/teams` - Create a new team
- `POST /api/portfolios` - Create a new portfolio
- `POST /api/projects` - Create a new project (with `portfolioIds: string[]`)
- `POST /api/tasks` - Create a new task (with `projectIds: string[]`)
- `PATCH /api/tasks/{id}` - Update task (add to more projects, change status, etc.)
- `PATCH /api/projects/{id}` - Update project (add to more portfolios, etc.)
- `GET /api/projects/{id}` - Get project details with tasks
- `GET /api/portfolios/{id}` - Get portfolio with rolled-up status
- `DELETE /api/tasks/{id}` - Delete task
- `DELETE /api/projects/{id}` - Delete project

#### Integration

- `GET /api/integration/status` - Check integration status
- `POST /api/integration/sync-all` - Sync all integrations
- `POST /api/integration/oauth/google` - Save Google tokens

---

## 🧪 Testing

### Test Task Creation (Many-to-Many)

```bash
curl -X 'POST' \
  'http://localhost:8080/api/tasks' \
  -H 'x-user-id: test-user-123' \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Research competitors",
    "projectIds": ["mobile-app-redesign", "market-analysis"],
    "assigneeId": "alice-user-123",
    "tags": ["Research"],
    "customFields": { "Priority": "High" },
    "subtasks": [{ "title": "Analyze App Store" }],
    "dependencies": []
  }'
```

**Response:**
```json
{
  "success": true,
  "taskId": "task123",
  "message": "Task created successfully"
}
```

### Test Project Creation (Many Portfolios)

```bash
curl -X 'POST' \
  'http://localhost:8080/api/projects' \
  -H 'x-user-id: test-user-123' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Mobile App Redesign",
    "portfolioIds": ["q4-roadmap", "innovation-initiatives"],
    "workspaceId": "engineering-workspace"
  }'
```

### Query Tasks by Project

```bash
curl -X 'GET' \
  'http://localhost:8080/api/tasks?projectId=mobile-app-redesign' \
  -H 'x-user-id: test-user-123'
```

---

## 💰 Cost Estimate

### Development (You)

- **OpenAI API:** ~$0.50-2/meeting (Whisper + GPT-4o-mini)
- **Firebase:** $0 (free tier covers 50K reads/20K writes per day)
- **Google Cloud:** $0 (free tier)
- **Total:** ~$5-10/month for moderate use

### Production Deployment

- **Cloud Run (Backend):** $0 (free tier) to $10/month
- **Cloud Run (n8n):** $10-15/month
- **Cloud SQL:** $7/month (optional, SQLite works fine)
- **OpenAI:** Based on usage
- **Total:** ~$20-40/month

---

## 🎯 Use Cases

### For Individuals

- Record and transcribe personal meetings
- Extract action items automatically
- Search meeting history
- Generate weekly progress reports
- Manage comprehensive contact database
- Organize tasks within projects

### For Small Teams

- Share meeting minutes automatically
- Track project decisions
- Maintain unified contact database with Google Contacts sync
- Automate status reports
- Collaborate on projects with task assignments and dependencies

### For Managers

- Review team meetings
- Track action items across projects
- Generate executive summaries
- Monitor project and portfolio health
- Access complete contact information
- Oversee team workflows and task progress

---

## 🔒 Security & Privacy

- **Data Encryption:** All data encrypted in transit (HTTPS) and at rest (Firebase)
- **User Isolation:** Each user's data is completely isolated
- **API Authentication:** Header-based authentication (upgrade to Firebase Auth recommended)
- **Duplicate Prevention:** SHA-256 hashing prevents data duplication
- **No Data Sharing:** Your data stays in your Firebase project
- **GDPR Compliant:** Export and delete data anytime

---

## 🛠️ Tech Stack

### Backend

- **Node.js + Express:** REST API
- **TypeScript:** Type safety
- **Firebase Admin SDK:** Database & authentication
- **OpenAI:** Whisper (transcription) + GPT-4o-mini (analysis)
- **Multer:** File upload handling
- **Swagger:** API documentation
- **Google APIs:** People API (Contacts), Calendar API, Drive API

### Frontend (Optional)

- **React + TypeScript:** Modern UI
- **Vite:** Fast development
- **Tailwind CSS:** Styling

### Automation

- **n8n:** Workflow automation
- **Docker Compose:** Local development

### Cloud Services

- **Google Cloud Run:** Serverless deployment
- **Firebase Firestore:** NoSQL database
- **Google Secret Manager:** API key storage
- **Cloud Storage:** File storage

---

## 📚 Documentation

- [Technical Overview](technical_overview.md) - Architecture deep dive
- [API Reference](http://localhost:8080/api-docs) - Interactive Swagger docs
- **Contact Data Model** - Google Contacts compatible schema
- **Project Management Model** - Workspaces, teams, portfolios, projects, tasks (many-to-many)

---

## 🗺️ Roadmap

### v1.1 (Completed)

- ✅ Duplicate detection
- ✅ Filename tracking
- ✅ File size logging
- ✅ Enhanced metadata extraction
- ✅ Google Contacts full data model support
- ✅ Multiple emails, phones, addresses per contact
- ✅ Bidirectional Google Contacts sync
- ✅ Many-to-many: Projects ↔ Portfolios, Tasks ↔ Projects
- ✅ Child-knows-parent data model

### v1.2 (Next)

- ⏳ Real-time transcription streaming
- ⏳ Multi-language support
- ⏳ Speaker diarization
- ⏳ Meeting templates
- ⏳ Custom action item extraction
- ⏳ Contact merge and deduplication
- ⏳ Advanced contact search and filtering
- ⏳ Task dependency visualization
- ⏳ Portfolio-level analytics

### v2.0 (Future)

- 🔮 Video call integration (Zoom, Meet)
- 🔮 Real-time collaboration
- 🔮 Mobile apps (iOS, Android)
- 🔮 Advanced analytics dashboard
- 🔮 Team workspaces
- 🔮 API webhooks
- 🔮 Contact sharing and permissions
- 🔮 Cross-project task dependencies

---

## 🤝 Contributing

Contributions welcome! Please read our Contributing Guide first.

---

## 📄 License

MIT License - see LICENSE file for details.

---

## 🙏 Acknowledgments

- **OpenAI** - Whisper & GPT-4
- **Firebase** - Database & hosting
- **n8n** - Workflow automation
- **Google Cloud** - Infrastructure
- **Google People API** - Contacts integration

---

## 📧 Support

- **Documentation:** http://localhost:8080/api-docs
- **Issues:** GitHub Issues
- **Email:** support@jarvis.com

---

## 🌟 Star Us!

If you find Jarvis helpful, please give us a star on GitHub! ⭐

Made with ❤️ by developers, for developers
