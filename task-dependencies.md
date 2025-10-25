# Task Dependencies - No Subtasks Needed!

## 🎯 Design Decision: Dependencies Over Subtasks

**TL;DR:** Jarvis uses task dependencies instead of embedded subtasks for a cleaner, more flexible architecture.

---

## ❌ Why No Subtasks?

**Problems with subtasks as embedded objects:**

1. **Limited flexibility** - Can't assign subtasks to different people
2. **Can't move** - Subtasks are locked to their parent
3. **No cross-project** - Subtasks can't belong to multiple projects
4. **Complex queries** - Harder to filter/search embedded arrays
5. **Document bloat** - Makes parent task documents larger
6. **No dependencies between subtasks** - Can't express: "Subtask B depends on Subtask A"

---

## ✅ Solution: Use Task Dependencies

**All tasks are equal** - some just depend on others!

```typescript
interface Task {
  id: string;
  projectIds: string[];      // Can belong to multiple projects
  title: string;
  assigneeId?: string;       // Each task can have its own assignee
  dependencies?: string[];   // Tasks this task depends on
  status: 'not_started' | 'in_progress' | 'completed';
  // ... other fields
}
```

---

## 📋 Examples

### Example 1: Parent Task with Dependencies (Old "Subtasks")

**Instead of:**
```json
{
  "id": "task-001",
  "title": "Build User Dashboard",
  "subtasks": [
    {"title": "Design mockups", "status": "completed"},
    {"title": "Implement UI", "status": "in_progress"},
    {"title": "Write tests", "status": "not_started"}
  ]
}
```

**Do this:**
```json
// Parent task
{
  "id": "task-001",
  "title": "Build User Dashboard",
  "projectIds": ["project-123"],
  "dependencies": []
}

// "Subtasks" are just separate tasks
{
  "id": "task-002",
  "title": "Design mockups for dashboard",
  "projectIds": ["project-123"],
  "dependencies": ["task-001"],  // Depends on parent
  "status": "completed"
}

{
  "id": "task-003",
  "title": "Implement dashboard UI",
  "projectIds": ["project-123"],
  "dependencies": ["task-002"],  // Depends on design
  "status": "in_progress"
}

{
  "id": "task-004",
  "title": "Write dashboard tests",
  "projectIds": ["project-123"],
  "dependencies": ["task-003"],  // Depends on implementation
  "status": "not_started"
}
```

---

## 🎨 Visualizing Dependencies

### Linear Dependencies (Old "Subtasks")

```
Task 001: Build User Dashboard
  ↓ (blocks)
Task 002: Design mockups
  ↓ (blocks)
Task 003: Implement UI
  ↓ (blocks)
Task 004: Write tests
```

### Complex Dependencies (Now Possible!)

```
Task 001: API Endpoint      Task 002: UI Design
    ↓                           ↓
    └─────────┬─────────────────┘
              ↓
      Task 003: Integration
              ↓
      Task 004: Testing
```

---

## 💻 API Usage

### Create Parent Task

```bash
curl -X 'POST' \
  'http://localhost:8080/api/tasks' \
  -H 'x-user-id: user-123' \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Build User Dashboard",
    "projectIds": ["project-123"],
    "assigneeId": "alice",
    "dependencies": []
  }'

# Response: { "taskId": "task-001" }
```

### Create Dependent Tasks (Old "Subtasks")

```bash
# Task 1: Design (depends on parent)
curl -X 'POST' \
  'http://localhost:8080/api/tasks' \
  -H 'x-user-id: user-123' \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Design mockups for dashboard",
    "projectIds": ["project-123"],
    "assigneeId": "bob",
    "dependencies": ["task-001"]
  }'

# Task 2: Implementation (depends on design)
curl -X 'POST' \
  'http://localhost:8080/api/tasks' \
  -H 'x-user-id: user-123' \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Implement dashboard UI",
    "projectIds": ["project-123"],
    "assigneeId": "alice",
    "dependencies": ["task-002"]
  }'
```

---

## 🔍 Querying

### Get All Tasks in a Project (Including "Subtasks")

```typescript
const tasks = await db.collection('tasks')
  .where('projectIds', 'array-contains', 'project-123')
  .get();
```

### Get Tasks Blocked by a Specific Task

```typescript
const blockedTasks = await db.collection('tasks')
  .where('dependencies', 'array-contains', 'task-001')
  .get();
```

### Get Top-Level Tasks (No Dependencies)

```typescript
const rootTasks = await db.collection('tasks')
  .where('projectIds', 'array-contains', 'project-123')
  .get();

const topLevel = rootTasks.docs.filter(doc => 
  !doc.data().dependencies || doc.data().dependencies.length === 0
);
```

---

## 🎯 Benefits Summary

| Feature | Subtasks (❌) | Dependencies (✅) |
|---------|--------------|------------------|
| Assign to different people | No | Yes |
| Move between projects | No | Yes |
| Cross-project tasks | No | Yes |
| Complex relationships | No | Yes |
| Easy queries | No | Yes |
| Smaller documents | No | Yes |
| Flexible structure | No | Yes |

---

## 🚀 UI Presentation

You can still **display** tasks in a hierarchical way in the UI, even though they're stored flat:

### Frontend Grouping Logic

```typescript
interface TaskNode {
  task: Task;
  children: TaskNode[];
}

function buildTaskTree(tasks: Task[]): TaskNode[] {
  const taskMap = new Map(tasks.map(t => [t.id, { task: t, children: [] }]));
  const roots: TaskNode[] = [];
  
  tasks.forEach(task => {
    const node = taskMap.get(task.id)!;
    
    if (!task.dependencies || task.dependencies.length === 0) {
      // Root task (no dependencies)
      roots.push(node);
    } else {
      // Add as child to parent tasks
      task.dependencies.forEach(depId => {
        const parent = taskMap.get(depId);
        if (parent) {
          parent.children.push(node);
        }
      });
    }
  });
  
  return roots;
}
```

### Display in UI

```tsx
function TaskTree({ tasks }: { tasks: Task[] }) {
  const tree = buildTaskTree(tasks);
  
  return (
    <div>
      {tree.map(node => (
        <TaskItem key={node.task.id} node={node} level={0} />
      ))}
    </div>
  );
}

function TaskItem({ node, level }: { node: TaskNode; level: number }) {
  return (
    <div style={{ marginLeft: level * 20 }}>
      <div className="task-item">
        <input type="checkbox" checked={node.task.status === 'completed'} />
        <span>{node.task.title}</span>
      </div>
      {node.children.map(child => (
        <TaskItem key={child.task.id} node={child} level={level + 1} />
      ))}
    </div>
  );
}
```

---

## 📖 Migration Guide

If you have existing subtasks, here's how to migrate:

### Step 1: Extract Subtasks to Tasks

```typescript
async function migrateSubtasksToTasks(parentTaskId: string) {
  const parentTask = await db.collection('tasks').doc(parentTaskId).get();
  const subtasks = parentTask.data()?.subtasks || [];
  
  for (const subtask of subtasks) {
    // Create new task for each subtask
    await db.collection('tasks').add({
      title: subtask.title,
      projectIds: parentTask.data()?.projectIds || [],
      dependencies: [parentTaskId],  // Depends on parent
      status: subtask.status,
      userId: parentTask.data()?.userId,
      createdAt: subtask.createdAt || Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }
  
  // Remove subtasks from parent
  await db.collection('tasks').doc(parentTaskId).update({
    subtasks: FieldValue.delete(),
  });
}
```

---

## ✅ Best Practices

### 1. **Keep Dependencies Shallow**
```typescript
✅ Good: Task → Task → Task (3 levels)
❌ Avoid: Task → Task → Task → Task → Task → Task (6+ levels)
```

### 2. **Prevent Circular Dependencies**
```typescript
// Validate before creating
function hasCircularDependency(taskId: string, dependencies: string[]): boolean {
  // Check if any dependency eventually depends back on taskId
  // Implement graph traversal to detect cycles
  return false;
}
```

### 3. **Use Tags for Grouping**
```typescript
// Instead of deeply nested tasks, use tags
{
  "title": "Design mockup",
  "dependencies": ["task-001"],
  "tags": ["design", "dashboard"]  // Easy to filter
}
```

---

## 🎓 Summary

**Old way (Subtasks):**
```json
{
  "task": "Build Feature",
  "subtasks": [...]  // ❌ Embedded, inflexible
}
```

**New way (Dependencies):**
```json
{
  "id": "task-001",
  "title": "Build Feature",
  "dependencies": []
}
{
  "id": "task-002", 
  "title": "Sub-task",
  "dependencies": ["task-001"]  // ✅ Flexible, queryable
}
```

**Result:** Simpler, more flexible, and more powerful! 🎉

---

**Version:** 1.0  
**Last Updated:** October 2025  
**Status:** Production Ready ✅