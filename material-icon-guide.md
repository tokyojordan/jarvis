# Material Icons Implementation Guide for Jarvis

## 🎨 Overview

Jarvis uses **Material Icons** (Google's official icon library) for all workspace, team, portfolio, and project icons.

**Why Material Icons?**
- ✅ 2000+ icons in Google's design language
- ✅ Free and open source (Apache 2.0)
- ✅ Optimized for web and mobile
- ✅ Great React/Capacitor support
- ✅ Consistent with Google Cloud ecosystem

**Browse all icons:** https://fonts.google.com/icons

---

## 📦 Installation

### For React/Capacitor App

```bash
npm install @mui/icons-material @mui/material @emotion/react @emotion/styled
```

---

## 🔤 Icon Naming Convention

Material Icons use **snake_case** format:

| Icon Display | Icon Name | Usage |
|-------------|-----------|-------|
| 🚀 | `rocket_launch` | Workspaces, innovative projects |
| 👥 | `group` | Teams, collaboration |
| 📁 | `folder` | General folders/categories |
| 💼 | `business_center` | Business/professional |
| ⚡ | `bolt` | Fast/efficient projects |
| 🎯 | `target` | Goals/objectives |
| 📊 | `analytics` | Data/reporting |
| 🏗️ | `construction` | Building/development |
| 💻 | `code` | Development projects |
| 🎨 | `design_services` | Design work |
| ⚙️ | `settings` | Configuration |
| 📈 | `trending_up` | Growth/improvement |

---

## 💾 Database Storage

### Simple Format (Recommended)
```json
{
  "icon": "rocket_launch",
  "color": "#4F46E5"
}
```

### Extended Format (For Custom Styling)
```json
{
  "iconConfig": {
    "icon": "rocket_launch",
    "iconColor": "#4F46E5",
    "bgColor": "#EEF2FF"
  }
}
```

---

## ⚛️ React/Capacitor Implementation

### Basic Usage

```tsx
import { useState, useEffect } from 'react';
import * as Icons from '@mui/icons-material';

interface WorkspaceIconProps {
  iconName: string;
  color?: string;
  size?: number;
}

export function WorkspaceIcon({ iconName, color = '#000', size = 24 }: WorkspaceIconProps) {
  // Convert snake_case to PascalCase
  // rocket_launch -> RocketLaunch
  const iconKey = iconName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  
  // Dynamically get the icon component
  const IconComponent = Icons[iconKey as keyof typeof Icons];
  
  if (!IconComponent) {
    // Fallback icon if not found
    return <Icons.Folder sx={{ fontSize: size, color }} />;
  }
  
  return <IconComponent sx={{ fontSize: size, color }} />;
}
```

### Usage in Component

```tsx
import { WorkspaceIcon } from './WorkspaceIcon';

function WorkspaceCard({ workspace }) {
  return (
    <div className="workspace-card">
      <WorkspaceIcon 
        iconName={workspace.icon || 'folder'}
        color={workspace.color || '#4F46E5'}
        size={32}
      />
      <h3>{workspace.name}</h3>
    </div>
  );
}
```

### With Capacitor (Native Feel)

```tsx
import { IonIcon } from '@ionic/react';
import { WorkspaceIcon } from './WorkspaceIcon';

function MobileWorkspaceItem({ workspace }) {
  return (
    <div className="flex items-center p-4">
      <div 
        className="flex items-center justify-center w-12 h-12 rounded-xl"
        style={{ backgroundColor: workspace.color + '20' }}
      >
        <WorkspaceIcon 
          iconName={workspace.icon}
          color={workspace.color}
          size={24}
        />
      </div>
      <div className="ml-4">
        <h3 className="font-semibold">{workspace.name}</h3>
        <p className="text-sm text-gray-500">{workspace.description}</p>
      </div>
    </div>
  );
}
```

---

## 🎨 Common Icon Categories

### Workspaces
```typescript
const WORKSPACE_ICONS = {
  engineering: 'rocket_launch',
  design: 'design_services',
  marketing: 'campaign',
  sales: 'trending_up',
  support: 'support_agent',
  operations: 'settings',
  finance: 'account_balance',
  hr: 'groups',
  product: 'inventory',
  general: 'dashboard',
};
```

### Teams
```typescript
const TEAM_ICONS = {
  frontend: 'web',
  backend: 'dns',
  mobile: 'smartphone',
  devops: 'cloud',
  qa: 'bug_report',
  ux: 'palette',
  data: 'analytics',
  security: 'shield',
};
```

### Projects
```typescript
const PROJECT_ICONS = {
  feature: 'new_releases',
  bug_fix: 'build',
  research: 'science',
  documentation: 'description',
  refactor: 'refresh',
  prototype: 'lightbulb',
  migration: 'sync_alt',
  optimization: 'speed',
};
```

### Portfolios
```typescript
const PORTFOLIO_ICONS = {
  roadmap: 'timeline',
  goals: 'flag',
  initiatives: 'stars',
  objectives: 'checklist',
  strategy: 'psychology',
};
```

---

## 📱 Icon Picker Component

```tsx
import { useState } from 'react';
import * as Icons from '@mui/icons-material';

const POPULAR_ICONS = [
  'rocket_launch', 'group', 'folder', 'business_center',
  'bolt', 'analytics', 'code', 'design_services',
  'settings', 'trending_up', 'dashboard', 'work',
];

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [search, setSearch] = useState('');
  
  return (
    <div className="icon-picker">
      <input
        type="text"
        placeholder="Search icons..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2 border rounded-lg"
      />
      
      <div className="grid grid-cols-6 gap-2 mt-4">
        {POPULAR_ICONS.map(iconName => (
          <button
            key={iconName}
            onClick={() => onChange(iconName)}
            className={`p-3 rounded-lg border-2 hover:bg-gray-100 ${
              value === iconName ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
          >
            <WorkspaceIcon iconName={iconName} size={24} />
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## 🔍 API Examples

### Create Workspace with Icon

```bash
curl -X 'POST' \
  'http://localhost:8080/api/workspaces' \
  -H 'x-user-id: user-123' \
  -H 'Content-Type: application/json' \
  -d '{
    "organizationId": "org-123",
    "name": "Engineering Workspace",
    "description": "All engineering teams and projects",
    "color": "#4F46E5",
    "icon": "rocket_launch"
  }'
```

### Update Workspace Icon

```bash
curl -X 'PATCH' \
  'http://localhost:8080/api/workspaces/workspace-456' \
  -H 'x-user-id: user-123' \
  -H 'Content-Type: application/json' \
  -d '{
    "icon": "dashboard",
    "color": "#10B981"
  }'
```

---

## 📋 Full Icon Reference

### Most Popular for Business Apps

| Category | Icon Names |
|----------|-----------|
| **Workspaces** | `rocket_launch`, `dashboard`, `workspace`, `business`, `corporate_fare` |
| **Teams** | `group`, `groups`, `people`, `supervised_user_circle`, `engineering` |
| **Projects** | `folder`, `work`, `assignment`, `task`, `checklist` |
| **Portfolios** | `timeline`, `view_kanban`, `view_list`, `grid_view`, `table_chart` |
| **Tasks** | `check_circle`, `radio_button_unchecked`, `task_alt`, `done_all` |
| **Settings** | `settings`, `tune`, `admin_panel_settings`, `manage_accounts` |
| **Analytics** | `analytics`, `trending_up`, `bar_chart`, `pie_chart`, `insights` |
| **Communication** | `chat`, `message`, `notifications`, `mail`, `campaign` |
| **Files** | `description`, `attach_file`, `cloud_upload`, `download`, `pdf` |
| **Time** | `schedule`, `timer`, `today`, `calendar_month`, `event` |

### Search Tips
- Visit: https://fonts.google.com/icons
- Use filters: "Outlined", "Filled", "Rounded", "Sharp"
- Copy the icon name (snake_case format)
- Test in your app

---

## 🎯 Best Practices

### 1. **Consistent Naming**
```typescript
✅ Use: "rocket_launch"
❌ Avoid: "rocket", "rocketLaunch", "RocketLaunch"
```

### 2. **Fallback Icons**
```typescript
const iconName = workspace.icon || 'folder'; // Always have a default
```

### 3. **Color Accessibility**
```typescript
// Ensure sufficient contrast
const iconColor = getContrastColor(backgroundColor);
```

### 4. **Size Consistency**
```typescript
// Use standard sizes
const sizes = {
  small: 16,
  medium: 24,
  large: 32,
  xlarge: 48,
};
```

### 5. **Validation**
```typescript
// Validate icon names on backend
const VALID_ICONS = ['rocket_launch', 'folder', 'group', ...];

function isValidIcon(iconName: string): boolean {
  return VALID_ICONS.includes(iconName);
}
```

---

## 🚀 Migration from Emoji

If you have existing emoji icons, here's a mapping:

```typescript
const EMOJI_TO_ICON_MAP = {
  '🚀': 'rocket_launch',
  '👥': 'group',
  '📁': 'folder',
  '💼': 'business_center',
  '⚡': 'bolt',
  '📊': 'analytics',
  '🎯': 'gps_fixed',
  '⚙️': 'settings',
  '📈': 'trending_up',
  '💻': 'computer',
  '🎨': 'palette',
  '🏗️': 'construction',
};

// Migration function
function migrateEmojiToIcon(emoji: string): string {
  return EMOJI_TO_ICON_MAP[emoji] || 'folder';
}
```

---

## 📚 Resources

- **Icon Browser:** https://fonts.google.com/icons
- **Material UI Docs:** https://mui.com/material-ui/material-icons/
- **Material Design:** https://m3.material.io/styles/icons
- **React Integration:** https://mui.com/material-ui/icons/

---

**Version:** 1.0  
**Last Updated:** October 2025  
**Status:** Production Ready ✅