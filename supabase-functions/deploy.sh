#!/bin/bash

# Supabase Edge Functions Deployment Script
# This script deploys all edge functions to your Supabase project

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Sequora - Supabase Functions${NC}"
echo -e "${BLUE}  Deployment Script${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI is not installed.${NC}"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "import_map.json" ]; then
    echo -e "${RED}Error: Must run from supabase-functions directory${NC}"
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
    echo -e "${RED}Error: Project ref not provided${NC}"
    echo "Usage: ./deploy.sh [project-ref]"
    echo "Or set SUPABASE_PROJECT_REF environment variable"
    echo "Or ensure NEXT_PUBLIC_SUPABASE_URL is set in ../.env"
    exit 1
fi

echo -e "${BLUE}Project Ref:${NC} $PROJECT_REF\n"

# Deploy all functions
echo -e "${GREEN}Deploying all functions...${NC}\n"

supabase functions deploy --project-ref "$PROJECT_REF"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\nFunctions deployed:"
echo -e "  • sendPasswordResetOTP"
echo -e "  • verifyPasswordResetOTP"
echo -e "  • sendEmail"
echo -e "  • sendPatientInvite (NEW)"
echo -e "\nView logs: ${BLUE}supabase functions logs <function-name> --project-ref $PROJECT_REF${NC}"
echo -e "List functions: ${BLUE}supabase functions list --project-ref $PROJECT_REF${NC}"

