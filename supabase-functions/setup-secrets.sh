#!/bin/bash

# Setup Supabase Secrets for Edge Functions
# This script helps you configure required environment variables

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Supabase Secrets Setup${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI is not installed.${NC}"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo -e "${RED}Error: Not logged into Supabase CLI${NC}"
    echo "Run: supabase login"
    exit 1
fi

# Get project ref from parameter, environment, or .env file
PROJECT_REF="$1"

if [ -z "$PROJECT_REF" ]; then
    PROJECT_REF="${SUPABASE_PROJECT_REF}"
fi

# If still not set, try to extract from parent .env file
if [ -z "$PROJECT_REF" ] && [ -f "../.env" ]; then
    echo -e "${BLUE}Extracting project ref from .env...${NC}"
    SUPABASE_URL=$(grep -E "^NEXT_PUBLIC_SUPABASE_URL=" ../.env | head -1 | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    if [ -n "$SUPABASE_URL" ]; then
        # Extract project ref from URL (e.g., https://PROJECT_REF.supabase.co)
        PROJECT_REF=$(echo "$SUPABASE_URL" | sed -E 's|https://([^.]+)\.supabase\.co.*|\1|')
        echo -e "${GREEN}Found project ref: $PROJECT_REF${NC}"
    fi
fi

if [ -z "$PROJECT_REF" ]; then
    echo -e "${YELLOW}Enter your Supabase project ref:${NC}"
    read -r PROJECT_REF
fi

echo -e "\n${BLUE}Project Ref:${NC} $PROJECT_REF"

# Try to get RESEND_API_KEY from .env file
RESEND_KEY=""
if [ -f "../.env" ]; then
    RESEND_KEY=$(grep -E "^RESEND_API_KEY=" ../.env | head -1 | cut -d '=' -f2 | tr -d '"' | tr -d "'")
fi

# Set RESEND_API_KEY
echo -e "\n${YELLOW}Setting RESEND_API_KEY...${NC}"
if [ -z "$RESEND_KEY" ]; then
    echo "Enter your Resend API key (or press Enter to skip):"
    read -rs RESEND_KEY
else
    echo -e "${GREEN}Found RESEND_API_KEY in .env${NC}"
fi

if [ -n "$RESEND_KEY" ]; then
    supabase secrets set RESEND_API_KEY="$RESEND_KEY" --project-ref "$PROJECT_REF"
    echo -e "${GREEN}✓ RESEND_API_KEY set${NC}"
else
    echo -e "${YELLOW}⊘ Skipped RESEND_API_KEY${NC}"
fi

# List all secrets
echo -e "\n${BLUE}Current secrets:${NC}"
supabase secrets list --project-ref "$PROJECT_REF"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\nNote: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
echo -e "are automatically provided by Supabase.\n"

