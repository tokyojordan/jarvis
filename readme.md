# Jarvis Backend API - v2.0

**AI-Powered Hierarchy Management System**

A scalable backend API for managing organizations, workspaces, teams, portfolios, projects, and tasks with a child-knows-parent architecture optimized for Firestore.

---

## 🎯 What is Jarvis?

Jarvis is a modern project management backend that implements:

- 🏢 **Multi-tenant Organizations** - Complete organization hierarchy
- 🔄 **Many-to-Many Relationships** - Projects can belong to multiple portfolios, tasks to multiple projects
- 🎯 **Child-Knows-Parent Architecture** - Optimized for Firestore queries and atomic updates
- 🚀 **Cloud Run Ready** - Designed for serverless deployment
- 📱 **API-First Design** - Perfect for web, mobile, and desktop clients
- 🔒 **User Isolation** - Complete data separation per user/organization

---

## ✨ Key Features

### 🏗️ Hierarchy Structure

```
Organization (Top Level)
  └── Workspace
      ├── Team (Optional)
      └── Portfolio
          └── Projects (Many-to-Many) ✅
              └── Tasks (Many-to-Many) ✅
```

### 🎯 Architecture Highlights

- **Child-Knows-Parent**: Tasks store `projectIds[]`, Projects store `portfolioIds[]`
- **Atomic Updates**: Use Firestore's `arrayUnion` and `arrayRemove`
- **Array-Contains Queries**: Efficient retrieval of related entities
- **No Race Conditions**: Single document updates prevent conflicts
- **Scalable**: Designed for millions of tasks and projects

---

## 📦 Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.3+
- **Framework**: Express 4.18
- **Database**: Google Cloud Firestore
- **Authentication**: Header-based (x-user-id) - Ready for Firebase Auth
- **Deployment**: Google Cloud Run compatible

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Firebase project with Firestore enabled
- Service account key from Firebase

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/jarvis-backend.git
cd jarvis-backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your Firebase credentials
nano .env
```

### Environment Setup

Create a `.env` file:

```env
# Server Configuration
PORT=8080
NODE_ENV=development

# Firebase Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# API Configuration
API_PREFIX=/api
```

### Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create/select your project
3. Enable Firestore Database
4. Go to Project Settings → Service Accounts
5. Click "Generate New Private Key"
6. Save as `serviceAccountKey.json` in project root

### Required Firestore Indexes

Create these indexes in Firebase Console or via `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "projects",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "portfolioIds", "arrayConfig": "CONTAINS" }
      ]
    },
    {
      "collectionGroup": "tasks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "projectIds", "arrayConfig": "CONTAINS" }
      ]
    },
    {
      "collectionGroup": "projects",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "organizationId", "order": "ASCENDING" },
        { "fieldPath": "portfolioIds", "arrayConfig": "CONTAINS" }
      ]
    },
    {
      "collectionGroup": "tasks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "organizationId", "order": "ASCENDING" },
        { "fieldPath": "projectIds", "arrayConfig": "CONTAINS" }
      ]
    }
  ]
}
```

### Start Development Server

```bash
npm run dev
```

You should see:

```
✅ Firebase Admin initialized
🚀 ============================================
✅ Jarvis Backend running on port 8080
📊 Environment: development
🔗 Health check: http://localhost:8080/health
🔗 API info: http://localhost:8080/
🚀 ============================================
```

---

## 📖 API Documentation

### Base URL

```
http://localhost:8080/api
```

### Authentication

All API requests require the `x-user-id` header:

```bash
curl -H "x-user-id: user@example.com" http://localhost:8080/api/organizations
```

> **Note**: In production, replace this with Firebase Auth token validation.

---

## 🏢 Organizations

### Create Organization

```bash
POST /api/organizations

curl -X POST http://localhost:8080/api/organizations \
  -H "Content-Type: application/json" \
  -H "x-user-id: user@example.com" \
  -d '{
    "name": "Acme Corporation",
    "description": "Main company organization"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "organizationId": "abc123"
  },
  "message": "Organization created successfully"
}
```

### Get Organization

```bash
GET /api/organizations/:id

curl -H "x-user-id: user@example.com" \
  http://localhost:8080/api/organizations/abc123
```

### List User's Organizations

```bash
GET /api/organizations

curl -H "x-user-id: user@example.com" \
  http://localhost:8080/api/organizations
```

### Update Organization

```bash
PATCH /api/organizations/:id

curl -X PATCH http://localhost:8080/api/organizations/abc123 \
  -H "Content-Type: application/json" \
  -H "x-user-id: user@example.com" \
  -d '{
    "name": "Updated Name",
    "description": "New description"
  }'
```

### Delete Organization

```bash
DELETE /api/organizations/:id

curl -X DELETE http://localhost:8080/api/organizations/abc123 \
  -H "x-user-id: user@example.com"
```

### Add Member

```bash
POST /api/organizations/:id/members

curl -X POST http://localhost:8080/api/organizations/abc123/members \
  -H "Content-Type: application/json" \
  -H "x-user-id: user@example.com" \
  -d '{
    "userId": "newuser@example.com"
  }'
```

### Remove Member

```bash
DELETE /api/organizations/:id/members/:userId

curl -X DELETE http://localhost:8080/api/organizations/abc123/members/user@example.com \
  -H "x-user-id: owner@example.com"
```

---

## 🗂️ Workspaces

### Create Workspace

```bash
POST /api/workspaces

curl -X POST http://localhost:8080/api/workspaces \
  -H "Content-Type: application/json" \
  -H "x-user-id: user@example.com" \
  -d '{
    "organizationId": "abc123",
    "name": "Engineering",
    "description": "Engineering workspace",
    "color": "#3B82F6",
    "icon": "🚀"
  }'
```

### Get Workspace

```bash
GET /api/workspaces/:id

curl -H "x-user-id: user@example.com" \
  http://localhost:8080/api/workspaces/workspace123
```

### List Workspaces by Organization

```bash
GET /api/workspaces?organizationId=abc123

curl -H "x-user-id: user@example.com" \
  "http://localhost:8080/api/workspaces?organizationId=abc123"
```

### Update Workspace

```bash
PATCH /api/workspaces/:id

curl -X PATCH http://localhost:8080/api/workspaces/workspace123 \
  -H "Content-Type: application/json" \
  -H "x-user-id: user@example.com" \
  -d '{
    "name": "Updated Workspace Name"
  }'
```

### Delete Workspace

```bash
DELETE /api/workspaces/:id

curl -X DELETE http://localhost:8080/api/workspaces/workspace123 \
  -H "x-user-id: user@example.com"
```

---

## 🎯 Coming Soon

- **Teams** - Optional team groupings within workspaces
- **Portfolios** - Aggregate multiple projects for reporting
- **Projects** - Many-to-many relationships with portfolios
- **Tasks** - Many-to-many relationships with projects

---

## 📁 Project Structure

```
jarvis-backend/
├── src/
│   ├── config/
│   │   ├── firebase.ts          # Firebase Admin initialization
│   │   ├── constants.ts         # App constants
│   │   └── index.ts
│   ├── controllers/
│   │   ├── organization.controller.ts
│   │   ├── workspace.controller.ts
│   │   └── [more controllers...]
│   ├── services/
│   │   ├── base.service.ts      # Base CRUD operations
│   │   ├── organization.service.ts
│   │   ├── workspace.service.ts
│   │   └── [more services...]
│   ├── routes/
│   │   ├── organization.routes.ts
│   │   ├── workspace.routes.ts
│   │   └── [more routes...]
│   ├── middleware/
│   │   └── auth.middleware.ts   # Authentication
│   ├── types/
│   │   ├── entities.ts          # Data models
│   │   ├── api.ts               # Request/Response types
│   │   └── index.ts
│   └── index.ts                 # Main Express server
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## 🔑 Key Concepts

### Child-Knows-Parent Architecture

Instead of storing child IDs in parent documents:

**❌ Don't do this:**
```typescript
Portfolio {
  projectIds: ["proj1", "proj2"]  // Parent knows children
}
```

**✅ Do this:**
```typescript
Project {
  portfolioIds: ["portfolio1", "portfolio2"]  // Child knows parents
}
```

**Why?**
- Atomic updates (single document)
- No race conditions
- Better scalability
- Simpler deletes

### Many-to-Many Relationships

Projects can belong to multiple portfolios:

```typescript
// Create project in multiple portfolios
{
  "name": "Mobile App Redesign",
  "portfolioIds": ["q4-roadmap", "innovation"]
}

// Query all projects in a portfolio
db.collection('projects')
  .where('portfolioIds', 'array-contains', 'q4-roadmap')
```

Tasks can belong to multiple projects:

```typescript
// Create task in multiple projects
{
  "title": "Research competitors",
  "projectIds": ["mobile-app", "market-analysis"]
}

// Query all tasks in a project
db.collection('tasks')
  .where('projectIds', 'array-contains', 'mobile-app')
```

---

## 🧪 Testing

### Health Check

```bash
curl http://localhost:8080/health
```

### API Info

```bash
curl http://localhost:8080/
```

### Complete Workflow Test

```bash
# 1. Create Organization
ORG_ID=$(curl -s -X POST http://localhost:8080/api/organizations \
  -H "Content-Type: application/json" \
  -H "x-user-id: test@example.com" \
  -d '{"name":"Test Org"}' | jq -r '.data.organizationId')

# 2. Create Workspace
WORKSPACE_ID=$(curl -s -X POST http://localhost:8080/api/workspaces \
  -H "Content-Type: application/json" \
  -H "x-user-id: test@example.com" \
  -d "{\"organizationId\":\"$ORG_ID\",\"name\":\"Test Workspace\"}" | jq -r '.data.workspaceId')

# 3. List workspaces
curl -H "x-user-id: test@example.com" \
  "http://localhost:8080/api/workspaces?organizationId=$ORG_ID"
```

---

## 🚀 Deployment to Cloud Run

### Build Docker Image

```bash
docker build -t gcr.io/YOUR_PROJECT/jarvis-backend .
docker push gcr.io/YOUR_PROJECT/jarvis-backend
```

### Deploy to Cloud Run

```bash
gcloud run deploy jarvis-backend \
  --image gcr.io/YOUR_PROJECT/jarvis-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars FIREBASE_PROJECT_ID=your-project-id
```

The application automatically uses Application Default Credentials in Cloud Run.

---

## 🔒 Security

- All endpoints require authentication (x-user-id header)
- Organization membership is enforced
- Owner-only operations (delete, add/remove members)
- Data isolation per organization
- Ready for Firebase Auth token validation

---

## 🐛 Troubleshooting

### Firebase Permission Denied

```
PERMISSION_DENIED: Cloud Firestore API has not been used
```

**Solution**: Enable Firestore in Firebase Console

### Module Not Found

```
Cannot find module '../controllers/xxx'
```

**Solution**: Ensure all files are created and TypeScript is compiled

### Port Already in Use

```
EADDRINUSE: address already in use :::8080
```

**Solution**: Kill the process using port 8080 or change PORT in .env

---

## 📝 License

MIT License

---

## 🤝 Contributing

Contributions welcome! Please follow the existing code structure and naming conventions.

---

## 📧 Support

For issues and questions, please open a GitHub issue.

---

**Made with ❤️ for developers who value clean architecture**