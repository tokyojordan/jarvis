# Jarvis UI Components Guide

**Version:** 2.0  
**Date:** October 2025  
**Framework:** React + TypeScript

---

## 🎨 Overview

This guide covers the recommended UI components for Jarvis, focusing on hierarchical multi-select for the project management system.

---

## 📊 Hierarchical Multi-Select Component

### Why We Need It

Jarvis has a complex hierarchy:
```
Organization → Workspace → Portfolio → Project → Task
```

Users need to:
- Select multiple projects for a task (many-to-many)
- Select multiple portfolios for a project (many-to-many)
- Search across all levels
- See clear visual hierarchy
- Use it easily on mobile (iPhone app)

### ⭐ Recommended: Mantine MultiSelect

**Why Mantine?**
- ✅ Beautiful, modern design out of the box
- ✅ Mobile-optimized with touch gestures
- ✅ Grouped display with hierarchy
- ✅ Typeahead search across all levels
- ✅ **Hide selected options** for cleaner UI
- ✅ **Scrollable dropdown** for long lists
- ✅ Built-in dark mode support
- ✅ Excellent accessibility
- ✅ Active development & great community

**Demo:** https://mantine.dev/core/multi-select/

---

## 🚀 Installation

### 1. Install Mantine

```bash
npm install @mantine/core @mantine/hooks
```

### 2. Setup Mantine Provider (in your App.tsx)

```typescript
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';

function App() {
  return (
    <MantineProvider>
      {/* Your app */}
    </MantineProvider>
  );
}
```

---

## 💻 Implementation

### Component: HierarchicalSelect.tsx

```typescript
// components/HierarchicalSelect.tsx
import { MultiSelect } from '@mantine/core';
import { useState, useEffect } from 'react';

interface Node {
  id: string;
  name: string;
  type: 'organization' | 'workspace' | 'portfolio' | 'project' | 'task';
  children?: Node[];
}

interface SelectOption {
  value: string;
  label: string;
  group?: string;
}

interface HierarchicalSelectProps {
  userId: string;
  type: 'projects' | 'tasks' | 'portfolios' | 'workspaces';
  selectedIds?: string[];
  onChange: (selectedIds: string[]) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
}

export function HierarchicalSelect({
  userId,
  type,
  selectedIds = [],
  onChange,
  placeholder = 'Select...',
  label,
  disabled = false
}: HierarchicalSelectProps) {
  const [data, setData] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHierarchy();
  }, [userId, type]);

  const fetchHierarchy = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/hierarchy?userId=${userId}&type=${type}`,
        { 
          headers: { 'x-user-id': userId } 
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch hierarchy');
      }
      
      const result = await response.json();
      
      // Transform to Mantine format with groups and indentation
      const formatted = formatHierarchicalData(result.hierarchy);
      setData(formatted);
    } catch (err) {
      console.error('Failed to fetch hierarchy:', err);
      setError('Failed to load options');
    } finally {
      setLoading(false);
    }
  };

  const formatHierarchicalData = (
    nodes: Node[], 
    level = 0, 
    parentLabel = ''
  ): SelectOption[] => {
    const result: SelectOption[] = [];
    
    nodes.forEach(node => {
      // Add indentation for visual hierarchy
      const indent = '  '.repeat(level);
      const prefix = level > 0 ? '└─ ' : '';
      
      // Add emoji icons based on type
      const icon = getIconForType(node.type);
      
      result.push({
        value: node.id,
        label: `${indent}${prefix}${icon} ${node.name}`,
        group: level === 0 ? node.name : parentLabel,
      });
      
      // Recursively add children
      if (node.children && node.children.length > 0) {
        result.push(
          ...formatHierarchicalData(
            node.children, 
            level + 1, 
            level === 0 ? node.name : parentLabel
          )
        );
      }
    });
    
    return result;
  };

  const getIconForType = (type: string): string => {
    const icons = {
      organization: '🏢',
      workspace: '📁',
      portfolio: '📊',
      project: '📋',
      task: '✓',
      team: '👥'
    };
    return icons[type] || '';
  };

  if (loading) {
    return (
      <MultiSelect
        data={[]}
        value={[]}
        label={label}
        placeholder="Loading..."
        disabled
      />
    );
  }

  if (error) {
    return (
      <MultiSelect
        data={[]}
        value={[]}
        label={label}
        placeholder={error}
        disabled
        error={error}
      />
    );
  }

  return (
    <MultiSelect
      data={data}
      value={selectedIds}
      onChange={onChange}
      label={label || `Select ${type}`}
      placeholder={placeholder}
      searchable
      hidePickedOptions  // ✅ KEY FEATURE: Hide selected options
      nothingFound="No matches found"
      clearable
      disabled={disabled}
      maxDropdownHeight={400}  // ✅ KEY FEATURE: Scrollable
      maxSelectedValues={20}  // Reasonable limit
      styles={{
        // Selected value pills
        value: {
          background: '#4f46e5',
          color: 'white',
          borderRadius: '6px',
          padding: '4px 8px',
          fontWeight: 500,
        },
        // Dropdown container
        dropdown: {
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb',
        },
        // Individual items
        item: {
          padding: '10px 12px',
          fontSize: '14px',
          borderRadius: '6px',
          marginBottom: '2px',
          '&[data-selected]': {
            backgroundColor: '#eef2ff',
            color: '#4f46e5',
            fontWeight: 500,
          },
          '&[data-hovered]': {
            backgroundColor: '#f5f3ff',
          },
        },
        // Search input
        searchInput: {
          borderRadius: '8px',
          padding: '8px 12px',
        },
        // Group labels
        group: {
          fontSize: '12px',
          fontWeight: 600,
          color: '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          padding: '8px 12px',
        },
      }}
    />
  );
}
```

---

## 📱 Mobile-Optimized Version

### Component: ResponsiveHierarchicalSelect.tsx

```typescript
// components/ResponsiveHierarchicalSelect.tsx
import { MultiSelect } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { HierarchicalSelectProps } from './HierarchicalSelect';

export function ResponsiveHierarchicalSelect(props: HierarchicalSelectProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isSmallMobile = useMediaQuery('(max-width: 640px)');

  return (
    <MultiSelect
      {...props}
      // Mobile-specific adjustments
      maxDropdownHeight={isMobile ? 300 : 400}
      dropdownPosition={isMobile ? 'bottom' : 'flip'}
      withinPortal={isMobile}  // Better positioning on mobile
      size={isSmallMobile ? 'md' : 'sm'}
      styles={{
        ...props.styles,
        dropdown: {
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          ...(isMobile && {
            // Bottom sheet style on mobile
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            borderRadius: '16px 16px 0 0',
            maxHeight: '70vh',
            animation: 'slideUp 0.3s ease-out',
          }),
        },
        value: {
          background: '#4f46e5',
          color: 'white',
          borderRadius: '6px',
          padding: isSmallMobile ? '6px 10px' : '4px 8px',
          fontSize: isSmallMobile ? '14px' : '13px',
        },
      }}
    />
  );
}
```

---

## 🎯 Usage Examples

### 1. Task Form - Select Multiple Projects

```typescript
import { ResponsiveHierarchicalSelect } from '@/components/ResponsiveHierarchicalSelect';

function TaskForm() {
  const [task, setTask] = useState({
    title: '',
    projectIds: [],  // Array of project IDs
    assigneeId: '',
    status: 'not_started'
  });

  return (
    <form>
      <input
        type="text"
        value={task.title}
        onChange={(e) => setTask({ ...task, title: e.target.value })}
        placeholder="Task title"
      />

      <ResponsiveHierarchicalSelect
        userId={currentUser.id}
        type="projects"
        selectedIds={task.projectIds}
        onChange={(projectIds) => setTask({ ...task, projectIds })}
        label="Projects"
        placeholder="Select one or more projects for this task..."
      />

      <button type="submit">Create Task</button>
    </form>
  );
}
```

### 2. Project Form - Select Multiple Portfolios

```typescript
function ProjectForm() {
  const [project, setProject] = useState({
    name: '',
    portfolioIds: [],  // Array of portfolio IDs
    workspaceId: '',
    description: ''
  });

  return (
    <form>
      <input
        type="text"
        value={project.name}
        onChange={(e) => setProject({ ...project, name: e.target.value })}
        placeholder="Project name"
      />

      <ResponsiveHierarchicalSelect
        userId={currentUser.id}
        type="portfolios"
        selectedIds={project.portfolioIds}
        onChange={(portfolioIds) => setProject({ ...project, portfolioIds })}
        label="Portfolios"
        placeholder="Select portfolios for this project..."
      />

      <button type="submit">Create Project</button>
    </form>
  );
}
```

### 3. Meeting Form - Link to Tasks

```typescript
function MeetingForm() {
  const [meeting, setMeeting] = useState({
    title: '',
    linkedTaskIds: [],  // Array of task IDs
    attendeeIds: []
  });

  return (
    <form>
      <input
        type="text"
        value={meeting.title}
        onChange={(e) => setMeeting({ ...meeting, title: e.target.value })}
        placeholder="Meeting title"
      />

      <ResponsiveHierarchicalSelect
        userId={currentUser.id}
        type="tasks"
        selectedIds={meeting.linkedTaskIds}
        onChange={(taskIds) => setMeeting({ ...meeting, linkedTaskIds: taskIds })}
        label="Related Tasks"
        placeholder="Link tasks discussed in this meeting..."
      />

      <button type="submit">Save Meeting</button>
    </form>
  );
}
```

---

## 🔧 Backend API Endpoint

Create the hierarchy endpoint to support the component:

```typescript
// backend/src/routes/hierarchy.ts
import { Router } from 'express';
import { db } from '../services/firebase';

const router = Router();

/**
 * GET /api/hierarchy
 * Returns hierarchical structure for dropdown
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const type = req.query.type as string;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fetch all relevant data
    const [orgs, workspaces, portfolios, projects, tasks] = await Promise.all([
      db.collection('organizations').where('userId', '==', userId).get(),
      db.collection('workspaces').where('userId', '==', userId).get(),
      db.collection('portfolios').where('userId', '==', userId).get(),
      db.collection('projects').where('userId', '==', userId).get(),
      type === 'tasks' 
        ? db.collection('tasks').where('userId', '==', userId).get()
        : Promise.resolve({ docs: [] })
    ]);

    // Build hierarchy
    const hierarchy = buildHierarchy({
      organizations: orgs.docs.map(d => ({ id: d.id, ...d.data() })),
      workspaces: workspaces.docs.map(d => ({ id: d.id, ...d.data() })),
      portfolios: portfolios.docs.map(d => ({ id: d.id, ...d.data() })),
      projects: projects.docs.map(d => ({ id: d.id, ...d.data() })),
      tasks: tasks.docs.map(d => ({ id: d.id, ...d.data() })),
    }, type);

    return res.json({ hierarchy });
  } catch (error: any) {
    console.error('Hierarchy fetch error:', error);
    return res.status(500).json({ error: error.message });
  }
});

function buildHierarchy(data: any, targetType: string) {
  // Start with organizations
  return data.organizations.map(org => ({
    id: org.id,
    name: org.name,
    type: 'organization',
    children: data.workspaces
      .filter(w => w.organizationId === org.id)
      .map(workspace => ({
        id: workspace.id,
        name: workspace.name,
        type: 'workspace',
        children: data.portfolios
          .filter(p => p.workspaceId === workspace.id)
          .map(portfolio => ({
            id: portfolio.id,
            name: portfolio.name,
            type: 'portfolio',
            children: targetType === 'portfolios' 
              ? undefined 
              : data.projects
                  .filter(proj => proj.portfolioIds?.includes(portfolio.id))
                  .map(project => ({
                    id: project.id,
                    name: project.name,
                    type: 'project',
                    children: targetType === 'tasks'
                      ? data.tasks
                          .filter(t => t.projectIds?.includes(project.id))
                          .map(task => ({
                            id: task.id,
                            name: task.title,
                            type: 'task'
                          }))
                      : undefined
                  }))
          }))
      }))
  }));
}

export default router;
```

**Add to your main index.ts:**
```typescript
import hierarchyRoutes from './routes/hierarchy';
app.use('/api/hierarchy', hierarchyRoutes);
```

---

## 🎨 Custom Styling

### Jarvis Theme

```typescript
// theme/jarvis-theme.ts
import { MantineThemeOverride } from '@mantine/core';

export const jarvisTheme: MantineThemeOverride = {
  colors: {
    jarvis: [
      '#eef2ff',  // lightest
      '#e0e7ff',
      '#c7d2fe',
      '#a5b4fc',
      '#818cf8',
      '#6366f1',  // primary
      '#4f46e5',
      '#4338ca',
      '#3730a3',
      '#312e81',  // darkest
    ],
  },
  primaryColor: 'jarvis',
  fontFamily: 'Inter, sans-serif',
  radius: {
    xs: '6px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
  },
};
```

**Apply theme:**
```typescript
import { MantineProvider } from '@mantine/core';
import { jarvisTheme } from './theme/jarvis-theme';

<MantineProvider theme={jarvisTheme}>
  <App />
</MantineProvider>
```

---

## 📊 Features Summary

### ✅ Implemented Features

| Feature | Status | Description |
|---------|--------|-------------|
| **Hierarchical Display** | ✅ | Visual indentation shows parent-child relationships |
| **Grouped Options** | ✅ | Options grouped by top-level entity |
| **Typeahead Search** | ✅ | Search across all levels instantly |
| **Hide Selected** | ✅ | Selected options hidden from dropdown (cleaner UI) |
| **Scrollable** | ✅ | Max height with scroll for long lists |
| **Multi-Select** | ✅ | Select multiple items with pills |
| **Clear All** | ✅ | One-click to clear all selections |
| **Mobile Optimized** | ✅ | Bottom sheet on mobile, touch-friendly |
| **Loading State** | ✅ | Shows loading while fetching data |
| **Error Handling** | ✅ | Displays errors gracefully |
| **Accessibility** | ✅ | ARIA labels, keyboard navigation |
| **Dark Mode** | ✅ | Automatic with Mantine theme |

---

## 🚀 Next Steps

1. **Install Mantine**
   ```bash
   npm install @mantine/core @mantine/hooks
   ```

2. **Create the component**
   - Copy `HierarchicalSelect.tsx` to your project
   - Copy `ResponsiveHierarchicalSelect.tsx` for mobile

3. **Create the API endpoint**
   - Copy `hierarchy.ts` route
   - Add to your Express app

4. **Use in your forms**
   - Task forms → select projects
   - Project forms → select portfolios
   - Meeting forms → link tasks

---

## 🎓 Alternative Options

If Mantine doesn't fit your needs:

### 1. shadcn/ui with Command Component
- More customizable
- Tailwind CSS based
- Great for custom branding
- **Demo:** https://ui.shadcn.com/docs/components/command

### 2. Chakra UI
- Excellent accessibility
- Theme-based styling
- Good mobile support
- **Demo:** https://chakra-ui.com/

### 3. react-checkbox-tree
- More traditional tree UI
- Good for complex hierarchies
- Desktop-focused
- **Demo:** https://jakezatecky.github.io/react-checkbox-tree/

---

**Version:** 2.0  
**Last Updated:** October 2025  
**Status:** Production Ready ✅
