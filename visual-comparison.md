# Jarvis Data Model - Visual Comparison

## Before (v1.x) - Parent Knows Child ❌

```
┌─────────────────────────┐
│      Portfolio          │
│  id: "q4-roadmap"       │
│  projectIds: [          │ ← ❌ Parent stores children
│    "proj-1",            │    (race conditions!)
│    "proj-2"             │
│  ]                      │
└─────────────────────────┘
            │
            │ Problem: Must update parent
            │ every time child added/removed
            ▼
┌─────────────────────────┐
│       Project           │
│  id: "proj-1"           │
│  portfolioId: "q4..."   │ ← Single parent only
│  taskIds: [             │ ← ❌ Parent stores children
│    "task-1",            │
│    "task-2"             │
│  ]                      │
└─────────────────────────┘
            │
            │ Problem: Must update project
            │ every time task added/removed
            ▼
┌─────────────────────────┐
│        Task             │
│  id: "task-1"           │
│  projectId: "proj-1"    │ ← Single parent only
│  sectionId: "planning"  │
└─────────────────────────┘
```

**Problems:**
- ❌ Race conditions (concurrent updates to parent arrays)
- ❌ Write contention (popular parents = bottleneck)
- ❌ Orphaned references (child deleted but parent not updated)
- ❌ No many-to-many (task can't belong to 2 projects)
- ❌ Extra complexity (sections)

---

## After (v2.0) - Child Knows Parent ✅

```
┌─────────────────────────┐
│      Portfolio          │
│  id: "q4-roadmap"       │
│  name: "Q4 Roadmap"     │
│                         │ ← No projectIds!
│  (query for children)   │    Query instead
│                         │
└─────────────────────────┘
            ▲
            │ Query: where('portfolioIds',
            │         'array-contains', 'q4-roadmap')
            │
┌─────────────────────────┐
│       Project           │
│  id: "proj-1"           │
│  portfolioIds: [        │ ← ✅ Child knows parents
│    "q4-roadmap",        │    (many-to-many!)
│    "innovation"         │
│  ]                      │
│                         │ ← No taskIds!
│  (query for children)   │    Query instead
│                         │
└─────────────────────────┘
            ▲
            │ Query: where('projectIds',
            │         'array-contains', 'proj-1')
            │
┌─────────────────────────┐
│        Task             │
│  id: "task-1"           │
│  projectIds: [          │ ← ✅ Child knows parents
│    "proj-1",            │    (many-to-many!)
│    "proj-2"             │
│  ]                      │
│  tags: ["planning"]     │ ← Use tags instead of sections
└─────────────────────────┘
```

**Benefits:**
- ✅ Atomic updates (one document only)
- ✅ No race conditions
- ✅ No write contention
- ✅ No orphaned references
- ✅ Many-to-many supported
- ✅ Simpler model (no sections)

---

## Real-World Example

### Scenario: Task belongs to 2 projects

#### ❌ Old Way (v1.x) - Impossible!
```
Task could only have ONE projectId
To share a task, you'd need to:
  1. Duplicate the task
  2. Keep them in sync manually
  3. Update both projects' taskIds arrays
```

#### ✅ New Way (v2.0) - Simple!
```typescript
await db.collection('tasks').add({
  title: "Research competitors",
  projectIds: [
    "mobile-app-redesign",
    "market-analysis"
  ]
});

// Query tasks for mobile-app-redesign
const tasks = await db.collection('tasks')
  .where('projectIds', 'array-contains', 'mobile-app-redesign')
  .get();

// Query tasks for market-analysis
const tasks = await db.collection('tasks')
  .where('projectIds', 'array-contains', 'market-analysis')
  .get();
```

**Result:** One task, two projects, no duplication! 🎉

---

## Update Operations Comparison

### Adding Task to Project

#### ❌ Old Way (2 writes, race condition risk)
```typescript
// 1. Update task
await db.collection('tasks').doc(taskId).update({
  projectId: newProjectId
});

// 2. Update project (race condition!)
await db.collection('projects').doc(newProjectId).update({
  taskIds: admin.firestore.FieldValue.arrayUnion(taskId)
});
```

#### ✅ New Way (1 atomic write)
```typescript
// Single atomic update - no race condition!
await db.collection('tasks').doc(taskId).update({
  projectIds: admin.firestore.FieldValue.arrayUnion(newProjectId)
});
```

---

### Deleting Task

#### ❌ Old Way (must clean up parent)
```typescript
const task = await db.collection('tasks').doc(taskId).get();
const projectId = task.data().projectId;

// 1. Delete task
await db.collection('tasks').doc(taskId).delete();

// 2. Must also update project (or get orphaned reference)
await db.collection('projects').doc(projectId).update({
  taskIds: admin.firestore.FieldValue.arrayRemove(taskId)
});
```

#### ✅ New Way (just delete, parent queries automatically exclude)
```typescript
// Just delete - parent will automatically not find it in queries
await db.collection('tasks').doc(taskId).delete();

// No cleanup needed!
```

---

## Query Performance

### Get All Tasks in Project

#### ❌ Old Way (inefficient)
```typescript
// Option 1: Get project first, then get each task (N+1 queries)
const project = await db.collection('projects').doc(projectId).get();
const taskIds = project.data().taskIds;
const tasks = await Promise.all(
  taskIds.map(id => db.collection('tasks').doc(id).get())
);

// Option 2: Query with IN (limited to 10 items)
where('id', 'in', project.data().taskIds.slice(0, 10))
```

#### ✅ New Way (single efficient query)
```typescript
// Single query with proper index
const tasks = await db.collection('tasks')
  .where('projectIds', 'array-contains', projectId)
  .get();

// Works with unlimited tasks!
```

---

## Migration Visual

```
┌──────────────────────┐      MIGRATION      ┌──────────────────────┐
│   Old Portfolio      │                     │   New Portfolio      │
│  ──────────────      │                     │  ──────────────      │
│  projectIds: [...]   │ ────────────────▶   │  (no projectIds)     │
└──────────────────────┘                     └──────────────────────┘

┌──────────────────────┐      MIGRATION      ┌──────────────────────┐
│   Old Project        │                     │   New Project        │
│  ──────────────      │                     │  ──────────────      │
│  portfolioId: "x"    │ ────────────────▶   │  portfolioIds: ["x"] │
│  taskIds: [...]      │                     │  (no taskIds)        │
└──────────────────────┘                     └──────────────────────┘

┌──────────────────────┐      MIGRATION      ┌──────────────────────┐
│   Old Task           │                     │   New Task           │
│  ──────────────      │                     │  ──────────────      │
│  projectId: "x"      │ ────────────────▶   │  projectIds: ["x"]   │
│  sectionId: "plan"   │                     │  (no sectionId)      │
└──────────────────────┘                     └──────────────────────┘
```

---

## Summary Table

| Aspect | Old Model (v1.x) | New Model (v2.0) |
|--------|------------------|------------------|
| **Relationship Storage** | Parent knows child | ✅ Child knows parent |
| **Many-to-Many** | ❌ Not supported | ✅ Fully supported |
| **Update Operations** | 2 documents (race risk) | ✅ 1 document (atomic) |
| **Delete Operations** | Must clean up parent | ✅ Just delete child |
| **Query Performance** | N+1 or IN (limited to 10) | ✅ Single efficient query |
| **Write Contention** | ❌ High on popular parents | ✅ None |
| **Sections** | Separate entity | ✅ Removed (use tags) |
| **Code Complexity** | More complex | ✅ Simpler |
| **Scalability** | Limited | ✅ Excellent |

---

## The Golden Rule

```
╔════════════════════════════════════════╗
║                                        ║
║     👶 CHILD KNOWS PARENT              ║
║                                        ║
║     Tasks store projectIds             ║
║     Projects store portfolioIds        ║
║                                        ║
║     NOT THE OTHER WAY AROUND!          ║
║                                        ║
╚════════════════════════════════════════╝
```

---

**Remember:** One source of truth = No race conditions = Happy developer! 🎉
