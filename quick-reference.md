# Jarvis Data Model - Quick Reference Card

## 🎯 Golden Rule
**Child knows parent. Always.**

---

## 📊 Hierarchy

```
Organization → Workspace → Team (optional)
                        → Portfolio
                            ↓ (query)
                          Project (portfolioIds: string[])
                            ↓ (query)
                          Task (projectIds: string[])
```

---

## 🔥 Field Names

| Entity | Stores | Field Name | Type | Example |
|--------|--------|------------|------|---------|
| Portfolio | ❌ Nothing | - | - | Queries for children |
| **Project** | ✅ Portfolios | `portfolioIds` | `string[]` | `["q4-roadmap", "innovation"]` |
| **Task** | ✅ Projects | `projectIds` | `string[]` | `["mobile-app", "research"]` |

---

## 🔍 Query Patterns

### Get Projects in Portfolio
```typescript
where('portfolioIds', 'array-contains', portfolioId)
```

### Get Tasks in Project
```typescript
where('projectIds', 'array-contains', projectId)
```

---

## ✏️ Update Patterns

### Add Project to Portfolio
```typescript
.update({
  portfolioIds: admin.firestore.FieldValue.arrayUnion(portfolioId)
})
```

### Remove Project from Portfolio
```typescript
.update({
  portfolioIds: admin.firestore.FieldValue.arrayRemove(portfolioId)
})
```

### Add Task to Project
```typescript
.update({
  projectIds: admin.firestore.FieldValue.arrayUnion(projectId)
})
```

---

## ✅ DO

- ✅ Store document IDs in arrays
- ✅ Use `array-contains` for queries
- ✅ Use `arrayUnion` / `arrayRemove` for updates
- ✅ Validate parent exists before adding
- ✅ Create composite indexes for array queries

---

## ❌ DON'T

- ❌ Store children IDs in parent
- ❌ Store text names instead of IDs
- ❌ Manually push to arrays (race conditions!)
- ❌ Use `==` queries on array fields
- ❌ Forget to create indexes

---

## 📇 Required Indexes

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
      "collectionGroup": "tasks",
      "fields": [
        { "fieldPath": "projectIds", "arrayConfig": "CONTAINS" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## 🎯 Example

**Create Task in 2 Projects:**
```typescript
await db.collection('tasks').add({
  title: "Research competitors",
  projectIds: ["mobile-redesign", "market-analysis"],
  userId: "user-123",
  status: "in_progress"
});
```

**Query Tasks for Project:**
```typescript
const tasks = await db.collection('tasks')
  .where('projectIds', 'array-contains', 'mobile-redesign')
  .get();
```

**Add Task to Another Project:**
```typescript
await db.collection('tasks').doc(taskId).update({
  projectIds: admin.firestore.FieldValue.arrayUnion('new-project-id')
});
```

---

**Remember:** Child knows parent = One source of truth = No race conditions! 🎉
