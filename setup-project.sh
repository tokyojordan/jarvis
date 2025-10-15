# ============================================
# File: setup-project.sh
# Run this first to create the folder structure
# ============================================

#!/bin/bash

echo "📁 Creating Jarvis project structure..."

# Create main directories
mkdir -p jarvis/{backend,n8n,frontend,deploy,docs}

# Backend structure
mkdir -p jarvis/backend/{src/{routes,services,models,middleware,utils},tests}
mkdir -p jarvis/backend/src/{routes,services,models,middleware,utils}

# Frontend structure
mkdir -p jarvis/frontend/{src/{components,services,pages,styles},public}

# Deploy structure
mkdir -p jarvis/deploy

echo "✅ Project structure created!"
echo ""
echo "📋 Next steps:"
echo "1. cd jarvis"
echo "2. Copy all the files from the artifacts into their respective folders"
echo "3. Run: cd deploy && chmod +x deploy.sh"
echo "4. Run: ./deploy.sh"