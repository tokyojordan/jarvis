# Jarvis Data Model - Architectural Summary

**Version:** 2.0 (Updated October 2025)  
**Status:** Production Ready  
**Key Change:** Child-knows-parent with many-to-many relationships

---

## 🎯 Core Principle: Child Knows Parent

**Decision:** Children store arrays of parent IDs, not vice versa.

### Why This Approach?

✅ **Atomic Updates** - Update one document, not multiple  
✅ **No Race Conditions** - No parent lists getting out of sync  
✅ **Easy Queries** - Firestore `array-contains` works perfectly  
✅ **Scales Better** - No write contention on popular parents  
✅ **Cleaner Deletes** - Delete child = done (no parent cleanup)

---

## 📊 Data Model Hierarchy

```
Organization (root account)
  └── Workspace (e.g., "Engineering Workspace")
      ├── Team (optional, e.g., "Frontend Team")
      │
      ├── Portfolio (e.g., "Q4 Roadmap")
      │   └── (query: projects where portfolioIds contains this ID)
      │       └── Projects (MANY-TO-MANY)
      │
      └── Projects (e.g., "Mobile App Redesign")
          ├── portfolioIds: string[] ← SOURCE OF TRUTH
          └── (query: tasks where projectIds contains this ID)
              └── Tasks (MANY-TO-MANY)
                  ├── projectIds: string[] ← SOURCE OF TRUTH
                  ├── assigneeId: string
                  ├── dependencies: string[] (other task IDs)
                  ├── tags: string[]
                  ├── customFields: { [key: string]: string }
                  └── subtasks: Subtask[]
```

**Key Points:**
- ✅ **Sections REMOVED** - Tasks link directly to projects
- ✅ **Many-to-Many** - Projects can belong to multiple portfolios
- ✅ **Many-to-Many** - Tasks can belong to multiple projects
- ✅ **ID Arrays** - Always store document IDs, never text names

---

## 🔥 Firestore Document Structure

### Portfolio

```typescript
{
  id: "q4-roadmap",
  workspaceId: "engineering-workspace",
  name: "Q4 Roadmap",
  description: "High-priority initiatives for Q4 2025",
  status: {
    completionPercentage: 0,
    totalTasks: 0,
    completedTasks: 0,
    projects: []
  },
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Note:** Portfolio does NOT store `projectIds`. Projects know their portfolios!

### Project

```typescript
{
  id: "mobile-app-redesign",
  portfolioIds: [
    "q4-roadmap",              // ← Can belong to multiple portfolios!
    "innovation-initiatives"
  ],
  workspaceId: "engineering-workspace",
  teamId: "mobile-team",
  name: "Mobile App Redesign",
  description: "Complete overhaul of iOS and Android apps",
  status: "in_progress",
  completionPercentage: 45,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Note:** Project does NOT store `taskIds`. Tasks know their projects!

### Task

```typescript
{
  id: "task-001",
  projectIds: [
    "mobile-app-redesign",     // ← Can belong to multiple projects!
    "user-research-initiative"
  ],
  userId: "user-123",
  title: "Research competitor apps",
  description: "Analyze top 10 mobile apps in our category",
  assigneeId: "alice-user-123",
  tags: ["research", "competitive-analysis"],
  customFields: {
    "Priority": "High",
    "Estimated Hours": "8"
  },
  subtasks: [
    {
      id: "subtask-001",
      title: "Download top 10 apps",
      status: "completed"
    },
    {
      id: "subtask-002",
      title: "Document key features",
      status: "in_progress"
    }
  ],
  dependencies: [
    "task-000"  // Must complete task-000 first
  ],
  status: "in_progress",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

## 🔍 Firestore Queries

### Get All Projects in a Portfolio

```typescript
const projects = await db.collection('projects')
  .where('portfolioIds', 'array-contains', 'q4-roadmap')
  .get();
```

### Get All Tasks in a Project

```typescript
const tasks = await db.collection('tasks')
  .where('projectIds', 'array-contains', 'mobile-app-redesign')
  .get();
```

### Get All Portfolios a Project Belongs To

```typescript
const projectDoc = await db.collection('projects')
  .doc('mobile-app-redesign')
  .get();

const portfolioIds = projectDoc.data().portfolioIds;

const portfolios = await Promise.all(
  portfolioIds.map(id => db.collection('portfolios').doc(id).get())
);
```

### Add Project to Another Portfolio (Atomic)

```typescript
await db.collection('projects')
  .doc('mobile-app-redesign')
  .update({
    portfolioIds: admin.firestore.FieldValue.arrayUnion('new-portfolio-id')
  });
```

### Remove Project from Portfolio

```typescript
await db.collection('projects')
  .doc('mobile-app-redesign')
  .update({
    portfolioIds: admin.firestore.FieldValue.arrayRemove('old-portfolio-id')
  });
```

### Add Task to Another Project

```typescript
await db.collection('tasks')
  .doc('task-001')
  .update({
    projectIds: admin.firestore.FieldValue.arrayUnion('new-project-id')
  });
```

---

## 📇 Required Firestore Indexes

```json
{
  "indexes": [
    {
      "collectionGroup": "projects",
      "fields": [
        { "fieldPath": "portfolioIds", "arrayConfig": "CONTAINS" },
        { "fieldPath": "workspaceId", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "projects",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "portfolioIds", "arrayConfig": "CONTAINS" }
      ]
    },
    {
      "collectionGroup": "tasks",
      "fields": [
        { "fieldPath": "projectIds", "arrayConfig": "CONTAINS" },
        { "fieldPath": "status", "order": "ASCENDING" }
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
      "collectionGroup": "tasks",
      "fields": [
        { "fieldPath": "assigneeId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## ⚠️ What NOT to Do

### ❌ BAD: Parent Storing Children

```typescript
// DON'T DO THIS!
Portfolio {
  projectIds: ["proj-1", "proj-2"]  // ❌ Race conditions, write contention
}

Project {
  taskIds: ["task-1", "task-2"]  // ❌ Orphaned references, hard to maintain
}
```

**Problems:**
- Must update parent every time you add/remove child
- Race conditions with concurrent writes
- Write contention on popular parents
- Orphaned references when children deleted
- Harder to maintain consistency

### ❌ BAD: Storing Names Instead of IDs

```typescript
// DON'T DO THIS!
Task {
  projectNames: ["Mobile App", "Research"]  // ❌ Breaks when renamed!
}
```

**Problems:**
- Breaks when parent is renamed
- Can't query efficiently
- No referential integrity
- Harder to validate

---

## ✅ Best Practices

### 1. Always Use Document IDs

```typescript
✅ projectIds: ["mobile-app-redesign", "user-research"]
❌ projectNames: ["Mobile App Redesign", "User Research"]
```

### 2. Query Using array-contains

```typescript
✅ where('projectIds', 'array-contains', projectId)
❌ where('projectNames', '==', projectName)  // Doesn't work with arrays!
```

### 3. Update Arrays Atomically

```typescript
✅ arrayUnion('new-id')   // Safe for concurrent writes
❌ manual array push      // Race conditions!
```

### 4. Validate IDs Exist Before Adding

```typescript
// Before adding project to portfolio
const projectExists = await db.collection('projects').doc(projectId).get();
if (!projectExists.exists) {
  throw new Error('Project not found');
}

await db.collection('projects').doc(projectId).update({
  portfolioIds: admin.firestore.FieldValue.arrayUnion(portfolioId)
});
```

---

## 🎯 Example Use Cases

### Use Case 1: Task in Multiple Projects

**Scenario:** "Research competitor pricing" applies to both "Pricing Strategy" and "Market Analysis" projects.

```typescript
await db.collection('tasks').add({
  title: "Research competitor pricing",
  projectIds: [
    "pricing-strategy-project",
    "market-analysis-project"
  ],
  // ... other fields
});
```

**Result:** Task appears in both projects, but stored only once!

### Use Case 2: Project in Multiple Portfolios

**Scenario:** "Mobile App Redesign" is part of both "Q4 Roadmap" and "Customer Experience Initiatives" portfolios.

```typescript
await db.collection('projects').add({
  name: "Mobile App Redesign",
  portfolioIds: [
    "q4-roadmap",
    "customer-experience"
  ],
  // ... other fields
});
```

**Result:** Project rolls up to both portfolios for status tracking!

### Use Case 3: Calculate Portfolio Status

```typescript
async function calculatePortfolioStatus(portfolioId: string) {
  // Get all projects in this portfolio
  const projectsSnapshot = await db.collection('projects')
    .where('portfolioIds', 'array-contains', portfolioId)
    .get();
  
  let totalTasks = 0;
  let completedTasks = 0;
  
  for (const projectDoc of projectsSnapshot.docs) {
    // Get all tasks in this project
    const tasksSnapshot = await db.collection('tasks')
      .where('projectIds', 'array-contains', projectDoc.id)
      .get();
    
    totalTasks += tasksSnapshot.size;
    completedTasks += tasksSnapshot.docs.filter(
      doc => doc.data().status === 'completed'
    ).length;
  }
  
  return {
    completionPercentage: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
    totalTasks,
    completedTasks
  };
}
```

---

## 📝 Migration Guide (If Upgrading)

If you had the old "parent knows child" model, here's how to migrate:

### Step 1: Add Child Arrays to Projects

```typescript
// For each project
const project = await db.collection('projects').doc(projectId).get();
const portfolioId = project.data().portfolioId;  // Old single ID

await db.collection('projects').doc(projectId).update({
  portfolioIds: [portfolioId],  // Convert to array
  portfolioId: admin.firestore.FieldValue.delete()  // Remove old field
});
```

### Step 2: Remove Parent Arrays from Portfolios

```typescript
// For each portfolio
await db.collection('portfolios').doc(portfolioId).update({
  projectIds: admin.firestore.FieldValue.delete()  // Remove this field
});
```

### Step 3: Update Indexes

Apply the new composite indexes (see above).

### Step 4: Update Queries in Code

```typescript
// OLD
const tasks = await db.collection('tasks')
  .where('projectId', '==', projectId)  // ❌ Old single ID
  .get();

// NEW
const tasks = await db.collection('tasks')
  .where('projectIds', 'array-contains', projectId)  // ✅ Array query
  .get();
```

---

## 🚀 Summary

**Key Architectural Decisions:**

1. ✅ **Child knows parent** (not vice versa)
2. ✅ **Many-to-many via ID arrays** (`portfolioIds`, `projectIds`)
3. ✅ **No Sections** - tasks link directly to projects
4. ✅ **Always use document IDs** - never text names
5. ✅ **Query with `array-contains`** - Firestore native support
6. ✅ **Atomic array operations** - `arrayUnion` / `arrayRemove`

**Benefits:**

- 🎯 **Simple** - One source of truth
- ⚡ **Fast** - Efficient queries with proper indexes
- 🔒 **Safe** - No race conditions or orphaned references
- 📈 **Scalable** - No write contention on popular entities
- 🛠️ **Maintainable** - Clear data flow and validation

---

**Document Version:** 2.0  
**Last Updated:** October 2025  
**Status:** Production Ready ✅
