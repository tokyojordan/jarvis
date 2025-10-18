# Jarvis Meeting UI - Complete Setup Guide

## 📋 Complete File Structure

Here's exactly where every file should go:

```
jarvis/
├── backend/                        # Your existing backend
│   ├── src/
│   ├── package.json
│   └── ...
└── frontend/                       # NEW - Create this
    ├── public/
    │   └── index.html             # Create this
    ├── src/
    │   ├── components/
    │   │   └── meetings/          # NEW - All meeting components
    │   │       ├── MeetingApp.tsx
    │   │       ├── RecordingView.tsx
    │   │       ├── MeetingsView.tsx
    │   │       ├── MeetingDetail.tsx
    │   │       ├── AlertMessage.tsx
    │   │       ├── types.ts
    │   │       └── mockData.ts
    │   ├── App.tsx                # NEW - Root component
    │   ├── main.tsx               # NEW - Entry point
    │   └── index.css              # NEW - Global styles
    ├── .env                       # NEW - Environment variables
    ├── package.json               # NEW - Dependencies
    ├── vite.config.ts            # NEW - Vite config
    ├── tailwind.config.js        # NEW - Tailwind config
    ├── postcss.config.js         # NEW - PostCSS config
    ├── tsconfig.json             # NEW - TypeScript config
    └── index.html                # NEW - HTML entry
```

## 🚀 Step-by-Step Setup

### Step 1: Create Frontend Directory
```bash
cd jarvis  # Your project root
mkdir frontend
cd frontend
```

### Step 2: Initialize Project
```bash
npm init -y
```

### Step 3: Install Dependencies
```bash
# Core dependencies
npm install react react-dom lucide-react

# Dev dependencies
npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom

# Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Step 4: Create Configuration Files

**package.json** - Copy from the provided file or add these scripts:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

**vite.config.ts** - Copy from provided file

**tailwind.config.js** - Copy from provided file

**tsconfig.json** - Create this file:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**tsconfig.node.json** - Create this file:
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

**postcss.config.js** - Create this file:
```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### Step 5: Create HTML Entry Point

**index.html** - Create in project root:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Jarvis - Meeting Assistant</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### Step 6: Create Source Directory Structure
```bash
mkdir -p src/components/meetings
```

### Step 7: Copy All Component Files

Copy these files into their locations:
- `src/main.tsx` - Entry point
- `src/App.tsx` - Root component
- `src/index.css` - Global styles
- `src/components/meetings/MeetingApp.tsx`
- `src/components/meetings/RecordingView.tsx`
- `src/components/meetings/MeetingsView.tsx`
- `src/components/meetings/MeetingDetail.tsx`
- `src/components/meetings/AlertMessage.tsx`
- `src/components/meetings/types.ts`
- `src/components/meetings/mockData.ts`

### Step 8: Create Environment File

**.env** - Create in frontend root:
```bash
VITE_API_URL=http://localhost:8080/api
```

### Step 9: Start Development Server
```bash
npm run dev
```

You should see:
```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Step 10: Start Backend
In a separate terminal:
```bash
cd ../backend
npm run dev
```

## ✅ Verification Checklist

- [ ] Frontend runs on http://localhost:5173
- [ ] Backend runs on http://localhost:8080
- [ ] No TypeScript errors
- [ ] Can see "Jarvis Meeting Assistant" header
- [ ] Can click between "Record" and "Meetings" tabs
- [ ] Mock data shows 3 sample meetings
- [ ] Can click "Start Recording" (may ask for mic permission)
- [ ] Tailwind styles are working (gradient backgrounds, colors)

## 🐛 Common Issues & Solutions

### Issue: "Cannot find module 'lucide-react'"
```bash
npm install lucide-react
```

### Issue: "Module not found: Can't resolve './RecordingView'"
- Ensure all component files are in `src/components/meetings/`
- Check file names match exactly (case-sensitive)

### Issue: Tailwind styles not working
```bash
# Reinstall Tailwind
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Issue: TypeScript errors
```bash
# Install type definitions
npm install -D @types/node @types/react @types/react-dom
```

### Issue: "window.setInterval" type error
Add to `tsconfig.json`:
```json
{
  "compilerOptions": {
    "lib": ["ES2020", "DOM", "DOM.Iterable"]
  }
}
```

### Issue: CORS errors when calling API
Update your backend to allow CORS:
```typescript
// backend/src/index.ts
import cors from 'cors';

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
```

## 📱 Next Steps

### For Web Development:
1. ✅ You're ready to develop!
2. Add authentication
3. Connect to real backend APIs
4. Add more features

### For Mobile (Capacitor):
```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios
npx cap init
npx cap add ios
npm run build
npx cap sync
npx cap open ios
```

### For Production (Cloud Run):
```bash
npm run build  # Creates dist/ folder
# Deploy dist/ with your backend
```

## 📚 Quick Commands Reference

```bash
# Development
npm run dev          # Start dev server with hot reload

# Build
npm run build        # Production build to dist/

# Preview
npm run preview      # Preview production build locally

# Type checking
npx tsc --noEmit    # Check TypeScript without building

# Lint
npm run lint        # Run ESLint
```

## 🎉 Success!

If you can see the Jarvis interface with the gradient header and tabs, you're all set!

Try:
1. Click "Meetings" tab - should see 3 mock meetings
2. Click a meeting - should see full details
3. Click "Record" tab - should see recording interface
4. Click "Start Recording" - browser asks for mic permission

## 🆘 Still Having Issues?

Common things to check:
1. Node version: `node -v` (should be 18+)
2. All files are in correct directories
3. Run `npm install` in frontend directory
4. Check browser console for errors (F12)
5. Restart dev server: `Ctrl+C` then `npm run dev`

## 📖 What You Have Now

✅ Complete React + TypeScript setup  
✅ Tailwind CSS configured  
✅ Vite for fast development  
✅ 7 modular meeting components  
✅ Mock data for testing  
✅ Type-safe with TypeScript  
✅ Ready for mobile (Capacitor)  
✅ Ready for Cloud Run deployment  

You're ready to build! 🚀