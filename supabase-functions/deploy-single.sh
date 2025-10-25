#!/bin/bash

# Deploy a single Supabase Edge Function
# Usage: ./deploy-single.sh <function-name> [project-ref]

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

FUNCTION_NAME="$1"
PROJECT_REF="$2"

if [ -z "$FUNCTION_NAME" ]; then
    echo -e "${RED}Error: Function name required${NC}"
    echo "Usage: ./deploy-single.sh <function-name> [project-ref]"
    echo ""
    echo "Available functions:"
    echo "  • sendPasswordResetOTP"
    echo "  • verifyPasswordResetOTP"
    echo "  • sendEmail"
    exit 1
fi

# Get project ref from parameter, environment, or .env file
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
    echo "Usage: ./deploy-single.sh $FUNCTION_NAME [project-ref]"
    echo "Or set SUPABASE_PROJECT_REF environment variable"
    echo "Or ensure NEXT_PUBLIC_SUPABASE_URL is set in ../.env"
    exit 1
fi

echo -e "${BLUE}Deploying function:${NC} $FUNCTION_NAME"
echo -e "${BLUE}Project Ref:${NC} $PROJECT_REF\n"

supabase functions deploy "$FUNCTION_NAME" --project-ref "$PROJECT_REF"

echo -e "\n${GREEN}Function deployed successfully!${NC}"
echo -e "View logs: ${BLUE}supabase functions logs $FUNCTION_NAME --project-ref $PROJECT_REF${NC}"

