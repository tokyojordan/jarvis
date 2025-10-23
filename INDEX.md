# Jarvis Documentation - Updated Data Model

**Version:** 2.0  
**Date:** October 2025  
**Status:** Production Ready ✅

---

## 📚 Documentation Files

This folder contains the complete, updated documentation for Jarvis with the new data model architecture.

### 🎯 Start Here

1. **[readme.md](./readme.md)** - Complete project README
   - Overview of all features
   - Quick start guide
   - API documentation
   - Updated with new data model

2. **[visual-comparison.md](./visual-comparison.md)** - Old vs New Model
   - Side-by-side comparison
   - Visual diagrams
   - Real-world examples
   - **Read this first if you want to understand the change!**

### 📖 Detailed Documentation

3. **[data-model-summary.md](./data-model-summary.md)** - Complete Architecture Guide
   - Core principles (child knows parent)
   - Full data model with examples
   - Firestore queries and indexes
   - Best practices and anti-patterns
   - Migration guide

4. **[quick-reference.md](./quick-reference.md)** - Quick Lookup Card
   - Golden rule reminder
   - Common query patterns
   - Common update patterns
   - Field names cheat sheet

5. **[CHANGELOG.md](./CHANGELOG.md)** - What Changed
   - Detailed list of changes from v1.x to v2.0
   - Breaking changes
   - Migration steps
   - Code update examples

6. **[Api reference.md](./Api%20reference.md)** API Reference
    - The API reference docs

---

## 🎯 Key Changes Summary

### What Changed?

✅ **Child-knows-parent architecture** (not parent-knows-child)  
✅ **Many-to-many relationships** (projects ↔ portfolios, tasks ↔ projects)  
✅ **Removed Sections** from hierarchy (use tags instead)  
✅ **ID arrays** instead of single IDs

### Why?

- ✅ Atomic updates (one document)
- ✅ No race conditions
- ✅ Better scalability
- ✅ Cleaner deletes
- ✅ More flexible (many-to-many)

---

## 📊 New Data Model

```
Organization
  └── Workspace
      ├── Team (optional)
      └── Portfolio
          └── (query) Projects
              └── (query) Tasks
```

**Key Fields:**
- `Project.portfolioIds: string[]` ← Child knows parents
- `Task.projectIds: string[]` ← Child knows parents

**No more:**
- ❌ `Portfolio.projectIds`
- ❌ `Project.taskIds`
- ❌ `Task.sectionId`

---

## 🔍 Quick Example

### Create Task in Multiple Projects

```typescript
await db.collection('tasks').add({
  title: "Research competitors",
  projectIds: ["mobile-app", "market-analysis"],  // ✅ Multiple projects!
  userId: "user-123",
  status: "in_progress"
});
```

### Query Tasks for a Project

```typescript
const tasks = await db.collection('tasks')
  .where('projectIds', 'array-contains', 'mobile-app')  // ✅ Array contains
  .get();
```

### Add Task to Another Project

```typescript
await db.collection('tasks').doc(taskId).update({
  projectIds: admin.firestore.FieldValue.arrayUnion('new-project-id')  // ✅ Atomic
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
        { "fieldPath": "portfolioIds", "arrayConfig": "CONTAINS" }
      ]
    },
    {
      "collectionGroup": "tasks",
      "fields": [
        { "fieldPath": "projectIds", "arrayConfig": "CONTAINS" }
      ]
    }
  ]
}
```

---

## 🚀 Next Steps

### For New Projects

1. Read `readme.md` for overview
2. Follow quick start guide
3. Use `quick-reference.md` for common patterns
4. Refer to `data-model-summary.md` for deep dive

### For Existing Projects (Migration)

1. **Read first:** `visual-comparison.md` - understand the change
2. **Review:** `CHANGELOG.md` - see what's breaking
3. **Plan:** `data-model-summary.md` - migration section
4. **Execute:** Run migration scripts
5. **Update:** Change queries to use `array-contains`
6. **Test:** Verify all functionality works

---

## ⚠️ Important Notes

### Breaking Changes

- Field names changed (`portfolioId` → `portfolioIds`, `projectId` → `projectIds`)
- Query syntax changed (must use `array-contains`)
- Sections removed (use tags or custom fields)
- New Firestore indexes required

### Migration Required

If you have existing data with the old model, you **must migrate** before using v2.0. See `data-model-summary.md` for migration steps.

---

## 🎓 Learning Path

### Beginner (Just starting)
1. Read `readme.md` - overview
2. Read `quick-reference.md` - patterns
3. Start coding!

### Intermediate (Migrating from v1.x)
1. Read `visual-comparison.md` - understand change
2. Read `CHANGELOG.md` - breaking changes
3. Read `data-model-summary.md` - migration steps
4. Migrate data
5. Update code

### Advanced (Architecting new features)
1. Read `data-model-summary.md` - complete guide
2. Review best practices section
3. Check anti-patterns to avoid
4. Design with "child knows parent" principle

---

## 📞 Support

### Documentation Issues
- Check all 5 documents in this folder
- Look for examples in `data-model-summary.md`
- Review patterns in `quick-reference.md`

### Code Issues
- Verify Firestore indexes are created
- Check field names match new model
- Ensure using `array-contains` for queries
- Validate atomic updates with `arrayUnion`/`arrayRemove`

### Migration Issues
- Follow `CHANGELOG.md` migration steps
- Test on small dataset first
- Backup data before migration
- Verify indexes before running queries

---

## 📂 File Summary

| File | Size | Purpose | When to Read |
|------|------|---------|--------------|
| `readme.md` | 18KB | Complete project overview | Always - start here |
| `visual-comparison.md` | 10KB | Old vs new model | When migrating or understanding change |
| `data-model-summary.md` | 12KB | Complete architecture guide | Deep dive, migration, best practices |
| `quick-reference.md` | 3KB | Quick lookup cheat sheet | Daily coding reference |
| `CHANGELOG.md` | 7KB | Version history & breaking changes | Migration planning |
| `ui-components-guide.md` | 20KB | UI components & hierarchical select | Building frontend forms |

---

## 🎯 The Golden Rule

```
┌────────────────────────────────┐
│                                │
│   👶 CHILD KNOWS PARENT        │
│                                │
│   Tasks store projectIds       │
│   Projects store portfolioIds  │
│                                │
│   (Not the other way around!)  │
│                                │
└────────────────────────────────┘
```

---

## ✅ Anti-Memento Checklist

Before each coding session, review:

- [ ] Read `quick-reference.md` - remember field names
- [ ] Remember: Child knows parent (not vice versa)
- [ ] Use `array-contains` for queries
- [ ] Use `arrayUnion`/`arrayRemove` for updates
- [ ] Check `data-model-summary.md` for complex cases

---

**Version:** 2.0  
**Last Updated:** October 2025  
**Status:** Production Ready ✅  
**Anti-Memento Protection:** ACTIVATED 🎬
