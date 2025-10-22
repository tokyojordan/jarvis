#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}  Jarvis Documentation Update${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if zip file exists
ZIP_FILE="$SCRIPT_DIR/jarvis-docs.zip"

if [ ! -f "$ZIP_FILE" ]; then
    echo -e "${RED}❌ Error: jarvis-docs.zip not found in $SCRIPT_DIR${NC}"
    echo ""
    echo "Please ensure jarvis-docs.zip is in the same directory as this script."
    exit 1
fi

# Confirm with user
echo -e "${YELLOW}⚠️  This will OVERWRITE existing documentation files!${NC}"
echo ""
echo "Zip file: $ZIP_FILE"
echo "Target directory: $SCRIPT_DIR"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${GREEN}📦 Extracting files...${NC}"

# Unzip with overwrite (-o flag)
unzip -o "$ZIP_FILE" -d "$SCRIPT_DIR"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Success! Documentation updated.${NC}"
    echo ""
    echo "Updated files:"
    echo "  - readme.md"
    echo "  - technical_overview.md"
    echo "  - data-model-summary.md"
    echo "  - visual-comparison.md"
    echo "  - quick-reference.md"
    echo "  - CHANGELOG.md"
    echo "  - INDEX.md"
    echo "  - ui-components-guide.md"
    echo "  - README.txt"
    echo "  - UI-COMPONENT-SUMMARY.txt"
    echo ""
    echo -e "${GREEN}📚 Start reading: INDEX.md${NC}"
else
    echo ""
    echo -e "${RED}❌ Error: Extraction failed${NC}"
    exit 1
fi