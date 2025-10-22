╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║              JARVIS DATA MODEL DOCUMENTATION v2.0                  ║
║                                                                    ║
║         Anti-Memento Protection: DOCUMENTATION ACTIVATED           ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝

📚 START HERE: INDEX.md
   Complete guide to all documentation files


🎯 KEY PRINCIPLE: Child Knows Parent

   Portfolio
      ↑
      | Query: where('portfolioIds', 'array-contains', portfolioId)
      |
   Project
      ├─ portfolioIds: string[]  ← SOURCE OF TRUTH
      ↑
      | Query: where('projectIds', 'array-contains', projectId)
      |
   Task
      └─ projectIds: string[]    ← SOURCE OF TRUTH


✅ DO:
   - Store document IDs in arrays
   - Use array-contains for queries
   - Use arrayUnion/arrayRemove for updates

❌ DON'T:
   - Store children IDs in parent
   - Store text names instead of IDs
   - Manually push to arrays


📖 QUICK LINKS:

   1. INDEX.md              - Start here, overview of all docs
   2. visual-comparison.md  - See old vs new model side-by-side
   3. data-model-summary.md - Complete architecture guide
   4. quick-reference.md    - Daily coding cheat sheet
   5. CHANGELOG.md          - What changed from v1.x
   6. readme.md             - Complete project README
   7. ui-components-guide.md - UI components (hierarchical select)


🚀 NEXT STEPS:

   New Project:
      1. Read readme.md
      2. Use quick-reference.md while coding

   Migration:
      1. Read visual-comparison.md
      2. Read CHANGELOG.md
      3. Follow migration in data-model-summary.md


💡 REMEMBER:
   
   Projects have: portfolioIds (array)
   Tasks have: projectIds (array)
   
   NO MORE:
   - Portfolio.projectIds
   - Project.taskIds
   - Task.sectionId


╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║                  Child knows parent = Simple!                      ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
