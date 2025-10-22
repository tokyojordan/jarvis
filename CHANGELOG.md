# Jarvis Data Model Changelog

## Version 2.0 - October 2025

### 🎯 Major Changes

#### 1. ✅ Child-Knows-Parent Architecture

**Before (v1.x):**
```typescript
Portfolio {
  projectIds: string[]  // ❌ Parent stored children
}

Project {
  portfolioId: string   // Single portfolio only
  taskIds: string[]     // ❌ Parent stored children
}

Task {
  projectId: string     // Single project only
  sectionId: string
}
```

**After (v2.0):**
```typescript
Portfolio {
  // No projectIds field - query for children instead
}

Project {
  portfolioIds: string[]  // ✅ Child stores parents (many-to-many)
  // No taskIds field
}

Task {
  projectIds: string[]  // ✅ Child stores parents (many-to-many)
  // No sectionId field
}
```

**Why?**
- Atomic updates (one document only)
- No race conditions
- Easier queries with `array-contains`
- Better scalability
- Cleaner deletes

---

#### 2. ✅ Many-to-Many Relationships

**Before:**
- Project belongs to ONE portfolio
- Task belongs to ONE project

**After:**
- Project can belong to MULTIPLE portfolios
- Task can belong to MULTIPLE projects

**Example Use Cases:**
- "Mobile App Redesign" project in both "Q4 Roadmap" and "Innovation Initiatives" portfolios
- "Research competitors" task in both "Mobile App" and "Market Analysis" projects

---

#### 3. ✅ Removed Sections from Hierarchy

**Before:**
```
Project → Section → Task
```

**After:**
```
Project → Task (direct relationship)
```

**Why?**
- Sections were just UI organization, not a true data entity
- Tasks can belong to multiple projects anyway
- Simpler data model
- If UI needs sections, implement as a view filter (e.g., `tags` or `customFields.section`)

**Alternative for UI:** Use task tags or custom fields:
```typescript
Task {
  tags: ["planning", "high-priority"],
  customFields: { "Section": "Planning" }
}
```

---

### 📝 Summary of Field Changes

| Entity | Old Field | New Field | Type | Notes |
|--------|-----------|-----------|------|-------|
| Portfolio | `projectIds: string[]` | ❌ Removed | - | Query instead |
| Project | `portfolioId: string` | `portfolioIds: string[]` | Array | Many-to-many |
| Project | `taskIds: string[]` | ❌ Removed | - | Query instead |
| Task | `projectId: string` | `projectIds: string[]` | Array | Many-to-many |
| Task | `sectionId: string` | ❌ Removed | - | Use tags/customFields |

---

### 🔄 Migration Required

If you have existing data with the old model:

#### Step 1: Update Projects
```typescript
// Convert single portfolioId to array
const projects = await db.collection('projects').get();
for (const doc of projects.docs) {
  const data = doc.data();
  if (data.portfolioId && !data.portfolioIds) {
    await doc.ref.update({
      portfolioIds: [data.portfolioId],
      portfolioId: admin.firestore.FieldValue.delete()
    });
  }
}
```

#### Step 2: Update Tasks
```typescript
// Convert single projectId to array
const tasks = await db.collection('tasks').get();
for (const doc of tasks.docs) {
  const data = doc.data();
  if (data.projectId && !data.projectIds) {
    await doc.ref.update({
      projectIds: [data.projectId],
      projectId: admin.firestore.FieldValue.delete(),
      sectionId: admin.firestore.FieldValue.delete()  // Remove sections
    });
  }
}
```

#### Step 3: Clean Up Portfolios
```typescript
// Remove projectIds arrays from portfolios
const portfolios = await db.collection('portfolios').get();
for (const doc of portfolios.docs) {
  if (doc.data().projectIds) {
    await doc.ref.update({
      projectIds: admin.firestore.FieldValue.delete()
    });
  }
}
```

#### Step 4: Update Indexes
Apply new composite indexes (see data-model-summary.md).

#### Step 5: Update Code
Replace all queries and updates to use new field names.

---

### 📇 New Firestore Indexes Required

Add these composite indexes:

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
    }
  ]
}
```

---

### 🔧 Code Changes Required

#### Old Query Pattern
```typescript
// OLD: Single parent
const tasks = await db.collection('tasks')
  .where('projectId', '==', projectId)
  .get();

const projects = await db.collection('projects')
  .where('portfolioId', '==', portfolioId)
  .get();
```

#### New Query Pattern
```typescript
// NEW: Array contains
const tasks = await db.collection('tasks')
  .where('projectIds', 'array-contains', projectId)
  .get();

const projects = await db.collection('projects')
  .where('portfolioIds', 'array-contains', portfolioId)
  .get();
```

#### Old Update Pattern
```typescript
// OLD: Replace single value
await taskRef.update({ projectId: 'new-project' });
```

#### New Update Pattern
```typescript
// NEW: Add to array (keeps existing)
await taskRef.update({
  projectIds: admin.firestore.FieldValue.arrayUnion('new-project')
});

// Remove from array
await taskRef.update({
  projectIds: admin.firestore.FieldValue.arrayRemove('old-project')
});
```

---

### 🎉 Benefits of New Model

✅ **Flexibility:** Tasks and projects can belong to multiple parents  
✅ **Scalability:** No write contention on parent documents  
✅ **Simplicity:** One source of truth (child stores parent IDs)  
✅ **Reliability:** Atomic updates, no race conditions  
✅ **Performance:** Efficient queries with proper indexes  
✅ **Maintainability:** Clearer data flow, easier to reason about

---

### ⚠️ Breaking Changes

1. **API Changes:**
   - `POST /api/tasks` now requires `projectIds: string[]` (was `projectId: string`)
   - `POST /api/projects` now requires `portfolioIds: string[]` (was `portfolioId: string`)
   - Removed `sectionId` from task creation

2. **Query Changes:**
   - Must use `array-contains` instead of `==` for project/portfolio queries

3. **Data Structure:**
   - Old documents won't work until migrated
   - New indexes required for queries to work

---

### 📚 Updated Documentation

- ✅ readme.md - Updated with new hierarchy and examples
- ✅ data-model-summary.md - Complete architectural guide
- ✅ quick-reference.md - Quick lookup for common patterns
- ✅ CHANGELOG.md - This document

---

### 🚀 Next Steps

1. Review the new data model in `data-model-summary.md`
2. Run migration scripts on existing data (if applicable)
3. Apply new Firestore indexes
4. Update frontend/mobile code to use new field names
5. Test queries with new `array-contains` pattern
6. Update API documentation

---

### 📞 Support

If you encounter issues during migration:
1. Check `data-model-summary.md` for detailed examples
2. Review `quick-reference.md` for common patterns
3. See GitHub issues for known migration problems

---

**Version:** 2.0  
**Date:** October 2025  
**Status:** Production Ready ✅  
**Breaking Changes:** Yes - migration required
