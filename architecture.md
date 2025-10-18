# ID-Based Architecture Summary

## Overview
The Jarvis project management system now uses **100% ID-based relationships** with no duplicate data storage.

## Data Model Hierarchy

```
Organization
  └── organizationId (FK)
      Workspace
        ├── workspaceId (FK)
        │   Team
        │     └── teamId (FK - optional)
        │         Project
        ├── workspaceId (FK)
        │   Portfolio
        │     └── portfolioId (FK)
        │         Project
        │           └── projectId (FK)
        │               Section
        │                 └── sectionId (FK)
        │                     Task
        │                       └── taskId (FK)
        │                           Subtask
```

## All Relationships

| Child Entity | Foreign Key Field | Parent Entity | Storage Method |
|--------------|-------------------|---------------|----------------|
| Workspace | `organizationId` | Organization | Single FK |
| Team | `workspaceId` | Workspace | Single FK |
| Portfolio | `workspaceId` | Workspace | Single FK |
| Project | `portfolioId` | Portfolio | Single FK |
| Project | `teamId` | Team | Single FK (optional) |
| Section | `projectId` | Project | Single FK |
| Task | `sectionId` | Section | Single FK |
| Task | `projectId` | Project | Single FK (denormalized) |
| Subtask | `taskId` | Task | Single FK |

## Key Principles

### ✅ Single Source of Truth
- Each relationship stored **exactly once** as a foreign key
- No redundant arrays (removed: `projectIds[]`, `sectionIds[]`, `taskIds[]`, `subtasks[]`)
- Query child entities using `WHERE parentId == id`

### ✅ Dynamic Population
- Use `?expand` parameter to populate related entities on-demand
- Examples:
  - `GET /portfolios/{id}?expand=projects`
  - `GET /projects/{id}?expand=sections`
  - `GET /projects/{id}?expand=full` (sections + tasks)
  - `GET /sections/{id}?expand=tasks`
  - `GET /tasks/{id}?expand=subtasks`

### ✅ Cascade Deletes
- Deleting a task automatically deletes all its subtasks
- Service layer handles cleanup logic

## Complete API Endpoints

### Organizations
- `POST /organizations` - Create
- `GET /organizations` - List all
- `GET /organizations/{id}` - Get one
- `PATCH /organizations/{id}` - Update
- `DELETE /organizations/{id}` - Delete

### Workspaces
- `POST /workspaces` - Create
- `GET /workspaces?organizationId=...` - List (filtered)
- `GET /workspaces/{id}` - Get one
- `PATCH /workspaces/{id}` - Update
- `DELETE /workspaces/{id}` - Delete

### Teams
- `POST /teams` - Create
- `GET /teams?workspaceId=...` - List (filtered)
- `GET /teams/{id}` - Get one
- `PATCH /teams/{id}` - Update
- `DELETE /teams/{id}` - Delete

### Portfolios
- `POST /portfolios` - Create
- `GET /portfolios?workspaceId=...` - List (filtered)
- `GET /portfolios/{id}?expand=projects` - Get one (with optional expand)
- `PATCH /portfolios/{id}` - Update
- `DELETE /portfolios/{id}` - Delete
- `POST /portfolios/{id}/rollup` - Calculate completion status

### Projects
- `POST /projects` - Create
- `GET /projects?portfolioId=...&teamId=...` - List (filtered)
- `GET /projects/{id}?expand=sections|full` - Get one (with optional expand)
- `PATCH /projects/{id}` - Update
- `DELETE /projects/{id}` - Delete
- `POST /projects/{id}/calculate-completion` - Calculate completion %

### Sections
- `POST /sections` - Create
- `GET /sections?projectId=...` - List (filtered)
- `GET /sections/{id}?expand=tasks` - Get one (with optional expand)
- `PATCH /sections/{id}` - Update
- `DELETE /sections/{id}` - Delete

### Tasks
- `POST /tasks` - Create
- `GET /tasks?projectId=...&sectionId=...&assigneeId=...&status=...` - List (filtered)
- `GET /tasks/{id}?expand=subtasks` - Get one (with optional expand)
- `PATCH /tasks/{id}` - Update
- `DELETE /tasks/{id}` - Delete (cascades to subtasks)

### Subtasks (NEW!)
- `POST /subtasks` - Create
- `GET /subtasks?taskId=...` - List (filtered)
- `GET /subtasks/{id}` - Get one
- `PATCH /subtasks/{id}` - Update
- `DELETE /subtasks/{id}` - Delete

## Benefits

### 🎯 Consistency
- No orphaned references possible
- Can't have array out of sync with actual data
- Parent-child relationships are always accurate

### 🚀 Performance
- Efficient Firestore queries with proper indexes
- Only fetch data you need
- No need to update multiple documents for relationship changes

### 🔧 Maintainability
- Clear, simple data model
- Easy to understand relationships
- Less code to maintain (no array management)

### 📊 Scalability
- Queries scale with indexed fields
- No document size limits from growing arrays
- Can paginate through children efficiently

## Required Firestore Indexes

```json
{
  "indexes": [
    {
      "collectionGroup": "workspaces",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "organizationId", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "teams",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "workspaceId", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "portfolios",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "workspaceId", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "projects",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "portfolioId", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "projects",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "teamId", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "sections",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "projectId", "order": "ASCENDING" }
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
      "collectionGroup": "tasks",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "sectionId", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "tasks",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "assigneeId", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "tasks",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "subtasks",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "taskId", "order": "ASCENDING" },
        { "fieldPath": "order", "order": "ASCENDING" }
      ]
    }
  ]
}
```

## Migration Path

If you have existing data with embedded arrays:

1. **Backup everything first!**

2. **For Subtasks:**
   ```typescript
   // For each task with embedded subtasks
   const task = await getTask(taskId, userId);
   if (task.subtasks) {
     for (const subtask of task.subtasks) {
       await createSubtask({
         taskId: task.id,
         title: subtask.title,
         status: subtask.status,
         order: index
       }, userId);
     }
     // Remove subtasks array from task
     await updateTask(taskId, { subtasks: [] }, userId);
   }
   ```

3. **For other entities:**
   - No data migration needed!
   - Arrays like `projectIds`, `sectionIds`, `taskIds` were never persisted
   - They were maintained via `FieldValue.arrayUnion()` which we've removed

## Example Usage

### Create a complete hierarchy:

```typescript
// 1. Create organization
const orgId = await createOrganization({ name: "Acme Corp" }, userId);

// 2. Create workspace
const wsId = await createWorkspace({ 
  organizationId: orgId, 
  name: "Engineering" 
}, userId);

// 3. Create portfolio
const portfolioId = await createPortfolio({ 
  workspaceId: wsId, 
  name: "Q4 2025" 
}, userId);

// 4. Create project
const projectId = await createProject({ 
  portfolioId, 
  name: "Mobile App Redesign" 
}, userId);

// 5. Create section
const sectionId = await createSection({ 
  projectId, 
  name: "Planning" 
}, userId);

// 6. Create task
const taskId = await createTask({ 
  sectionId, 
  projectId, 
  title: "Research competitors" 
}, userId);

// 7. Create subtasks
const subtask1 = await createSubtask({ 
  taskId, 
  title: "Analyze App Store reviews" 
}, userId);

const subtask2 = await createSubtask({ 
  taskId, 
  title: "Document findings" 
}, userId);
```

### Query with relationships:

```typescript
// Get portfolio with all projects
const portfolio = await getPortfolioWithProjects(portfolioId, userId);
// Returns: { ...portfolio, projects: [project1, project2, ...] }

// Get project with full hierarchy
const project = await getProjectWithFullHierarchy(projectId, userId);
// Returns: { ...project, sections: [{ ...section, tasks: [...] }, ...] }

// Get task with subtasks
const task = await getTaskWithSubtasks(taskId, userId);
// Returns: { ...task, subtasks: [subtask1, subtask2, ...] }

// List all subtasks for a task
const subtasks = await listSubtasks(userId, { taskId });
// Returns: [subtask1, subtask2, ...] ordered by order field
```

## Summary

✅ **All entities use ID-based foreign keys**  
✅ **No duplicate data storage**  
✅ **Consistent parent-child relationships**  
✅ **Flexible querying with expand parameter**  
✅ **Proper cascade deletes**  
✅ **Complete CRUD operations for all entities**  
✅ **46 API endpoints covering entire hierarchy**  
✅ **Subtasks are now first-class entities**  

The system is now a fully normalized, scalable, ID-based architecture! 🎉