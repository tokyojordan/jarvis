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
- 📚 **Full Swagger Documentation** - Interactive API documentation at /api-docs

---

## ✨ Key Features

### 🏗️ Complete Hierarchy Structure

```
Organization (Top Level)
  └── Workspace
      ├── Team (Optional)
      │   ├── Members
      │   └── Leader
      └── Portfolio
          └── Projects (Many-to-Many) ✅
              ├── portfolioIds: string[]
              ├── Team Assignment
              ├── Project Members
              └── Tasks (Many-to-Many) ✅
                  ├── projectIds: string[]
                  ├── Assignee & Reporter
                  ├── Subtasks
                  └── Dependencies
```

### 🎯 Architecture Highlights

- **Child-Knows-Parent**: Tasks store `projectIds[]`, Projects store `portfolioIds[]`
- **Atomic Updates**: Use Firestore's `arrayUnion` and `arrayRemove`
- **Array-Contains Queries**: Efficient retrieval of related entities
- **No Race Conditions**: Single document updates prevent conflicts
- **Scalable**: Designed for millions of tasks and projects
- **Full CRUD**: All entities support Create, Read, Update, Delete
- **Member Management**: Teams and organizations support member operations
- **Portfolio/Project Associations**: Atomic add/remove operations

---

## 📦 Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.3+
- **Framework**: Express 4.18
- **Database**: Google Cloud Firestore
- **Authentication**: Header-based (x-user-id) - Ready for Firebase Auth
- **Documentation**: Swagger/OpenAPI 3.0
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
📚 API Docs: http://localhost:8080/api-docs
🚀 ============================================
```

---

## 📚 API Documentation

### Swagger UI

**Interactive API Documentation:** http://localhost:8080/api-docs

- Try out all endpoints directly from the browser
- View request/response schemas
- Download OpenAPI spec from http://localhost:8080/api-docs.json

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

## 🏢 API Endpoints Overview

### Organizations
- `POST /api/organizations` - Create organization
- `GET /api/organizations` - List user's organizations
- `GET /api/organizations/:id` - Get organization details
- `PATCH /api/organizations/:id` - Update organization
- `DELETE /api/organizations/:id` - Delete organization
- `POST /api/organizations/:id/members` - Add member
- `DELETE /api/organizations/:id/members/:userId` - Remove member

### Workspaces
- `POST /api/workspaces` - Create workspace
- `GET /api/workspaces?organizationId=xxx` - List workspaces
- `GET /api/workspaces/:id` - Get workspace details
- `PATCH /api/workspaces/:id` - Update workspace
- `DELETE /api/workspaces/:id` - Delete workspace

### Teams
- `POST /api/teams` - Create team
- `GET /api/teams?workspaceId=xxx` - List teams by workspace
- `GET /api/teams?organizationId=xxx` - List teams by organization
- `GET /api/teams/:id` - Get team details
- `PATCH /api/teams/:id` - Update team
- `DELETE /api/teams/:id` - Delete team
- `POST /api/teams/:id/members` - Add team member
- `DELETE /api/teams/:id/members/:userId` - Remove team member

### Portfolios
- `POST /api/portfolios` - Create portfolio
- `GET /api/portfolios?workspaceId=xxx` - List portfolios by workspace
- `GET /api/portfolios?organizationId=xxx` - List portfolios by organization
- `GET /api/portfolios/:id` - Get portfolio details
- `PATCH /api/portfolios/:id` - Update portfolio
- `DELETE /api/portfolios/:id` - Delete portfolio

### Projects (Many-to-Many with Portfolios)
- `POST /api/projects` - Create project (with portfolioIds array)
- `GET /api/projects?portfolioId=xxx` - List projects in portfolio (array-contains)
- `GET /api/projects?workspaceId=xxx` - List projects by workspace
- `GET /api/projects/:id` - Get project details
- `PATCH /api/projects/:id` - Update project (including portfolioIds)
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/portfolios/:portfolioId` - Add project to portfolio (atomic)
- `DELETE /api/projects/:id/portfolios/:portfolioId` - Remove from portfolio (atomic)

### Tasks (Many-to-Many with Projects)
- `POST /api/tasks` - Create task (with projectIds array)
- `GET /api/tasks?projectId=xxx` - List tasks in project (array-contains)
- `GET /api/tasks?workspaceId=xxx` - List tasks by workspace
- `GET /api/tasks?assigneeId=xxx` - List tasks by assignee
- `GET /api/tasks/:id` - Get task details
- `PATCH /api/tasks/:id` - Update task (including projectIds)
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/projects/:projectId` - Add task to project (atomic)
- `DELETE /api/tasks/:id/projects/:projectId` - Remove from project (atomic)

---

## 📝 Example Workflows

### Complete Workflow: Organization → Task

```bash
# 1. Create Organization
curl -X POST http://localhost:8080/api/organizations \
  -H "Content-Type: application/json" \
  -H "x-user-id: user@example.com" \
  -d '{"name": "Acme Corp"}'
# Response: {"success": true, "data": {"organizationId": "org-123"}}

# 2. Create Workspace
curl -X POST http://localhost:8080/api/workspaces \
  -H "Content-Type: application/json" \
  -H "x-user-id: user@example.com" \
  -d '{
    "organizationId": "org-123",
    "name": "Engineering",
    "color": "#3B82F6"
  }'
# Response: {"success": true, "data": {"workspaceId": "ws-456"}}

# 3. Create Portfolio
curl -X POST http://localhost:8080/api/portfolios \
  -H "Content-Type: application/json" \
  -H "x-user-id: user@example.com" \
  -d '{
    "organizationId": "org-123",
    "workspaceId": "ws-456",
    "name": "Q4 Roadmap",
    "ownerId": "user@example.com",
    "status": "active"
  }'
# Response: {"success": true, "data": {"portfolioId": "port-789"}}

# 4. Create Project in Multiple Portfolios
curl -X POST http://localhost:8080/api/projects \
  -H "Content-Type: application/json" \
  -H "x-user-id: user@example.com" \
  -d '{
    "organizationId": "org-123",
    "workspaceId": "ws-456",
    "portfolioIds": ["port-789", "port-999"],
    "name": "Mobile App Redesign",
    "ownerId": "user@example.com",
    "memberIds": ["user@example.com"],
    "status": "active",
    "priority": "high"
  }'
# Response: {"success": true, "data": {"projectId": "proj-111"}}

# 5. Create Task in Multiple Projects
curl -X POST http://localhost:8080/api/tasks \
  -H "Content-Type: application/json" \
  -H "x-user-id: user@example.com" \
  -d '{
    "organizationId": "org-123",
    "workspaceId": "ws-456",
    "projectIds": ["proj-111", "proj-222"],
    "title": "Research competitor apps",
    "assigneeId": "user@example.com",
    "status": "in_progress",
    "priority": "high"
  }'
# Response: {"success": true, "data": {"taskId": "task-333"}}

# 6. Query all tasks in a project (array-contains)
curl -H "x-user-id: user@example.com" \
  "http://localhost:8080/api/tasks?projectId=proj-111"
```

### Many-to-Many Operations

```bash
# Add project to another portfolio (atomic)
curl -X POST http://localhost:8080/api/projects/proj-111/portfolios/port-888 \
  -H "x-user-id: user@example.com"

# Add task to another project (atomic)
curl -X POST http://localhost:8080/api/tasks/task-333/projects/proj-444 \
  -H "x-user-id: user@example.com"

# Remove project from portfolio (atomic)
curl -X DELETE http://localhost:8080/api/projects/proj-111/portfolios/port-999 \
  -H "x-user-id: user@example.com"
```

---

## 📁 Project Structure

```
jarvis-backend/
├── src/
│   ├── config/
│   │   ├── firebase.ts           # Firebase Admin initialization
│   │   ├── constants.ts          # App constants
│   │   ├── swagger.config.ts     # Swagger/OpenAPI configuration
│   │   └── index.ts
│   ├── controllers/
│   │   ├── organization.controller.ts
│   │   ├── workspace.controller.ts
│   │   ├── team.controller.ts
│   │   ├── portfolio.controller.ts
│   │   ├── project.controller.ts
│   │   ├── task.controller.ts
│   │   └── [all with Swagger annotations]
│   ├── services/
│   │   ├── base.service.ts       # Base CRUD operations
│   │   ├── organization.service.ts
│   │   ├── workspace.service.ts
│   │   ├── team.service.ts
│   │   ├── portfolio.service.ts
│   │   ├── project.service.ts
│   │   ├── task.service.ts
│   │   └── index.ts
│   ├── routes/
│   │   ├── organization.routes.ts
│   │   ├── workspace.routes.ts
│   │   ├── team.routes.ts
│   │   ├── portfolio.routes.ts
│   │   ├── project.routes.ts
│   │   ├── task.routes.ts
│   │   └── [all with Swagger tags]
│   ├── middleware/
│   │   └── auth.middleware.ts    # Authentication
│   ├── types/
│   │   ├── entities.ts           # Data models
│   │   ├── api.ts                # Request/Response types
│   │   └── index.ts
│   └── index.ts                  # Main Express server
├── package.json
├── tsconfig.json
├── .env.example
├── firestore.indexes.json
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
- Supports many-to-many naturally

### Many-to-Many Relationships

#### Projects ↔ Portfolios

```typescript
// Create project in multiple portfolios
POST /api/projects
{
  "name": "Mobile App",
  "portfolioIds": ["q4-roadmap", "innovation"]
}

// Query all projects in a portfolio
GET /api/projects?portfolioId=q4-roadmap
// Uses: where('portfolioIds', 'array-contains', 'q4-roadmap')

// Add project to another portfolio (atomic)
POST /api/projects/proj-123/portfolios/new-portfolio-id

// Remove from portfolio (atomic)
DELETE /api/projects/proj-123/portfolios/old-portfolio-id
```

#### Tasks ↔ Projects

```typescript
// Create task in multiple projects
POST /api/tasks
{
  "title": "Research competitors",
  "projectIds": ["mobile-app", "market-analysis"]
}

// Query all tasks in a project
GET /api/tasks?projectId=mobile-app
// Uses: where('projectIds', 'array-contains', 'mobile-app')

// Add task to another project (atomic)
POST /api/tasks/task-456/projects/new-project-id

// Remove from project (atomic)
DELETE /api/tasks/task-456/projects/old-project-id
```

---

## 🧪 Testing

### Using Swagger UI

1. Open http://localhost:8080/api-docs
2. Click "Authorize" and enter your user ID
3. Try out any endpoint directly from the browser

### Using cURL

```bash
# Health check
curl http://localhost:8080/health

# Create organization
curl -X POST http://localhost:8080/api/organizations \
  -H "Content-Type: application/json" \
  -H "x-user-id: test@example.com" \
  -d '{"name":"Test Org"}'
```

---

## 🚀 Deployment to Cloud Run

### Build and Deploy

```bash
# Build Docker image
docker build -t gcr.io/YOUR_PROJECT/jarvis-backend .
docker push gcr.io/YOUR_PROJECT/jarvis-backend

# Deploy to Cloud Run
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
- CORS configured for specified origins
- Helmet.js for security headers

---

## ✅ Complete Feature Checklist

- ✅ Organizations - Full CRUD + member management
- ✅ Workspaces - Full CRUD with organization filtering
- ✅ Teams - Full CRUD + member management + leader assignment
- ✅ Portfolios - Full CRUD with workspace filtering
- ✅ Projects - Full CRUD + many-to-many with portfolios + atomic operations
- ✅ Tasks - Full CRUD + many-to-many with projects + atomic operations
- ✅ Swagger Documentation - Complete OpenAPI 3.0 spec
- ✅ Child-knows-parent architecture throughout
- ✅ Cloud Run compatible with fallback credentials
- ✅ Atomic array operations (arrayUnion/arrayRemove)
- ✅ Array-contains queries for relationships
- ✅ Permission checks and access control

---

## 📖 Additional Documentation

- **[quick-reference.md](./quick-reference.md)** - Quick lookup for common patterns
- **[visual-comparison.md](./visual-comparison.md)** - Old vs new architecture
- **[ui-components-guide.md](./ui-components-guide.md)** - Frontend component guide
- **Swagger UI** - http://localhost:8080/api-docs

---

## 🛠 Troubleshooting

### Firebase Permission Denied

```
PERMISSION_DENIED: Cloud Firestore API has not been used
```

**Solution**: Enable Firestore in Firebase Console

### Missing Firestore Indexes

```
The query requires an index
```

**Solution**: Create the required indexes in Firebase Console or deploy firestore.indexes.json

### Port Already in Use

```
EADDRINUSE: address already in use :::8080
```

**Solution**: Kill the process using port 8080 or change PORT in .env

### Swagger Not Showing Endpoints

**Solution**: Ensure swagger.config.ts includes both routes and controllers in the `apis` array

---

## 📄 License

MIT License

---

## 🤝 Contributing

Contributions welcome! Please follow the existing code structure and naming conventions.

---

## 📧 Support

For issues and questions, please open a GitHub issue.

---

**Made with ❤️ for developers who value clean architecture and comprehensive documentation**

**Version 2.0 - Complete Backend Implementation ✅**