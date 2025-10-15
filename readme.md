# Jarvis - AI-Powered Meeting Assistant & Personal CRM

> Transform your meetings into actionable insights with AI-powered transcription, smart summaries, and automated workflows.

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

---

## ✨ Key Features

### 🎙️ Meeting Intelligence
- **Audio Transcription**: Upload any audio file (m4a, mp3, wav) and get instant transcription
- **AI Analysis**: GPT-4 extracts summaries, key points, decisions, and action items
- **Duplicate Detection**: SHA-256 hash matching prevents duplicate uploads
- **Filename Tracking**: Every meeting saves original filename, size, and hash
- **Meeting Metadata**: Auto-extracts attendees, duration, and topics

### 👥 Contact Management (Google Contacts Compatible)
- **Full Google Contacts Data Model**: Support for multiple emails, phones, and addresses
- **Business Card OCR**: Scan business cards to extract contact info
- **Google Contacts Sync**: Bidirectional sync with complete field support
- **Rich Contact Data**: Names, organizations, websites, social profiles, birthdays, relations
- **Smart Organization**: Tag, search, and manage relationships
- **Export & Share**: Generate vCards and share contacts

#### Supported Contact Fields
- **Multiple Email Addresses**: Work, home, other, custom types
- **Multiple Phone Numbers**: Mobile, work, home, fax, pager, etc.
- **Multiple Physical Addresses**: Structured with street, city, state, zip, country
- **Organizations**: Company, title, department, dates
- **Websites & Social Profiles**: LinkedIn, Twitter, GitHub, personal sites
- **Personal Details**: Birthdays, anniversaries, gender
- **Relations**: Family, professional relationships
- **Custom Fields**: User-defined data

### 📅 Calendar Integration
- **Google Calendar Sync**: Import events automatically
- **Meeting Context**: Link calendar events to meeting minutes
- **Upcoming Events**: Quick view of what's next

### 📊 Automated Reports
- **Weekly Activity Reports**: Email summary of meetings, tasks, and progress
- **Project Status Updates**: Health metrics and task completion
- **Daily Task Digests**: Morning email with today's priorities

### ⚡ n8n Workflows
- **PDF Generation**: Beautiful meeting minutes PDFs
- **Email Distribution**: Automatic attendee notifications
- **Slack Integration**: Post updates to team channels
- **Custom Workflows**: Build your own automation

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
git clone https://github.com/yourusername/jarvis.git
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

```bash
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
    }
  ]
}
```

### 5. Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create new secret key
3. Copy to `.env` file

### 6. Set Up Google OAuth (Optional)

See [Google OAuth Setup Guide](./docs/google-oauth-setup.md) for detailed instructions.

### 7. Start the Backend

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

### 8. Access Swagger UI

Open http://localhost:8080/api-docs

- Click **"Authorize"**
- Enter `x-user-id`: `test-user-123`
- Start testing APIs!

### 9. Start n8n (Optional)

```bash
cd jarvis
docker-compose up -d n8n postgres
```

Access n8n UI at http://localhost:5678

---

## 📖 API Documentation

### Interactive Swagger UI
**http://localhost:8080/api-docs**

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

#### Integration
- `GET /api/integration/status` - Check integration status
- `POST /api/integration/sync-all` - Sync all integrations
- `POST /api/integration/oauth/google` - Save Google tokens

---

## 🧪 Testing

### Test Meeting Upload

1. Go to Swagger UI: http://localhost:8080/api-docs
2. Find **Meetings** → **POST /api/meetings/upload**
3. Click **"Try it out"**
4. Upload an audio file
5. Click **"Execute"**

You'll get back:
```json
{
  "success": true,
  "meetingMinutesId": "abc123",
  "message": "Meeting processed successfully",
  "filename": "quarterly-review.m4a"
}
```

### Test Google Contacts Sync

1. Ensure you have Google OAuth set up
2. Use Swagger UI or curl:

```bash
curl -X 'POST' \
  'http://localhost:8080/api/contacts/sync/google' \
  -H 'x-user-id: your-email@example.com' \
  -d ''
```

Response:
```json
{
  "success": true,
  "count": 1250,
  "message": "Synced 1250 contacts from Google"
}
```

### Test Contact Creation with Multiple Fields

```bash
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
```

### Test Duplicate Detection

1. Upload the same file again
2. You'll get a **409 Conflict** error:
```json
{
  "error": "Duplicate file",
  "message": "This file has already been processed. Existing meeting ID: abc123",
  "details": "This recording has already been uploaded and processed."
}
```

### View Meeting Details

1. **GET /api/meetings** to see all meetings
2. **GET /api/meetings/{id}** to see full details including:
   - Transcript
   - AI-generated summary
   - Key points
   - Decisions
   - Action items
   - File metadata

---

## 💰 Cost Estimate

### Development (You)
- **OpenAI API**: ~$0.50-2/meeting (Whisper + GPT-4o-mini)
- **Firebase**: $0 (free tier covers 50K reads/20K writes per day)
- **Google Cloud**: $0 (free tier)
- **Total**: **~$5-10/month** for moderate use

### Production Deployment
- **Cloud Run (Backend)**: $0 (free tier) to $10/month
- **Cloud Run (n8n)**: $10-15/month
- **Cloud SQL**: $7/month (optional, SQLite works fine)
- **OpenAI**: Based on usage
- **Total**: **~$20-40/month**

---

## 🎯 Use Cases

### For Individuals
- Record and transcribe personal meetings
- Extract action items automatically
- Search meeting history
- Generate weekly progress reports
- Manage comprehensive contact database

### For Small Teams
- Share meeting minutes automatically
- Track project decisions
- Maintain unified contact database with Google Contacts sync
- Automate status reports

### For Managers
- Review team meetings
- Track action items across projects
- Generate executive summaries
- Monitor project health
- Access complete contact information

---

## 🔒 Security & Privacy

- **Data Encryption**: All data encrypted in transit (HTTPS) and at rest (Firebase)
- **User Isolation**: Each user's data is completely isolated
- **API Authentication**: Header-based authentication (upgrade to Firebase Auth recommended)
- **Duplicate Prevention**: SHA-256 hashing prevents data duplication
- **No Data Sharing**: Your data stays in your Firebase project
- **GDPR Compliant**: Export and delete data anytime

---

## 🛠️ Tech Stack

### Backend
- **Node.js + Express**: REST API
- **TypeScript**: Type safety
- **Firebase Admin SDK**: Database & authentication
- **OpenAI**: Whisper (transcription) + GPT-4o-mini (analysis)
- **Multer**: File upload handling
- **Swagger**: API documentation
- **Google APIs**: People API (Contacts), Calendar API, Drive API

### Frontend (Optional)
- **React + TypeScript**: Modern UI
- **Vite**: Fast development
- **Tailwind CSS**: Styling

### Automation
- **n8n**: Workflow automation
- **Docker Compose**: Local development

### Cloud Services
- **Google Cloud Run**: Serverless deployment
- **Firebase Firestore**: NoSQL database
- **Google Secret Manager**: API key storage
- **Cloud Storage**: File storage

---

## 📚 Documentation

- [Technical Overview](./docs/technical-overview.md) - Architecture deep dive
- [Deployment Guide](./docs/deployment.md) - Cloud Run deployment
- [n8n Workflows](./docs/n8n-workflows.md) - Automation setup
- [Google OAuth Setup](./docs/google-oauth-setup.md) - OAuth configuration
- [API Reference](http://localhost:8080/api-docs) - Interactive Swagger docs
- [Contact Data Model](./docs/technical-overview.md#contact-data-model) - Google Contacts compatible schema

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

### v1.2 (Next)
- [ ] Real-time transcription streaming
- [ ] Multi-language support
- [ ] Speaker diarization
- [ ] Meeting templates
- [ ] Custom action item extraction
- [ ] Contact merge and deduplication
- [ ] Advanced contact search and filtering

### v2.0 (Future)
- [ ] Video call integration (Zoom, Meet)
- [ ] Real-time collaboration
- [ ] Mobile apps (iOS, Android)
- [ ] Advanced analytics dashboard
- [ ] Team workspaces
- [ ] API webhooks
- [ ] Contact sharing and permissions

---

## 🤝 Contributing

Contributions welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

### Development Workflow

```bash
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
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [OpenAI](https://openai.com) - Whisper & GPT-4
- [Firebase](https://firebase.google.com) - Database & hosting
- [n8n](https://n8n.io) - Workflow automation
- [Google Cloud](https://cloud.google.com) - Infrastructure
- [Google People API](https://developers.google.com/people) - Contacts integration

---

## 📧 Support

- **Documentation**: http://localhost:8080/api-docs
- **Issues**: [GitHub Issues](https://github.com/yourusername/jarvis/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/jarvis/discussions)
- **Email**: support@jarvis.com

---

## 🌟 Star Us!

If you find Jarvis helpful, please give us a star on GitHub! ⭐

---

**Made with ❤️ by developers, for developers**