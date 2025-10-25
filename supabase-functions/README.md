# Sequora - Supabase Edge Functions

Programmatically deployed Supabase Edge Functions for the Sequora platform.

## Functions

### Password Reset Flow
- **sendPasswordResetOTP**: Generates and sends a 6-digit OTP code via email
- **verifyPasswordResetOTP**: Verifies OTP and creates authenticated session

### Email Services
- **sendEmail**: Generic email sender for any email needs

## Quick Start

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Setup Secrets

```bash
cd supabase-functions
chmod +x setup-secrets.sh

# Automatically uses project ref from ../.env
./setup-secrets.sh

# Or explicitly provide project ref
./setup-secrets.sh <your-project-ref>
```

This will prompt you to set:
- `RESEND_API_KEY` - Your Resend API key for sending emails

**Note:** Scripts automatically extract project ref from `NEXT_PUBLIC_SUPABASE_URL` in your `.env` file!

### 4. Deploy All Functions

```bash
chmod +x deploy.sh

# Automatically uses project ref from ../.env
./deploy.sh

# Or explicitly provide project ref
./deploy.sh <your-project-ref>

# Or using environment variable
export SUPABASE_PROJECT_REF=your_project_ref
./deploy.sh
```

### 5. Deploy Single Function

```bash
chmod +x deploy-single.sh

# Automatically uses project ref from ../.env
./deploy-single.sh sendPasswordResetOTP

# Or explicitly provide project ref
./deploy-single.sh sendPasswordResetOTP <your-project-ref>
```

## Programmatic Deployment

### From Node.js/CI/CD

```javascript
const { exec } = require('child_process');

const projectRef = process.env.SUPABASE_PROJECT_REF;

exec(`cd supabase-functions && ./deploy.sh ${projectRef}`, (error, stdout, stderr) => {
  if (error) {
    console.error(`Deployment failed: ${error}`);
    return;
  }
  console.log(stdout);
});
```

### GitHub Actions Example

```yaml
name: Deploy Supabase Functions

on:
  push:
    branches: [main]
    paths:
      - 'supabase-functions/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Supabase CLI
        run: npm install -g supabase
      
      - name: Deploy Functions
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_REF }}
        run: |
          cd supabase-functions
          chmod +x deploy.sh
          ./deploy.sh $SUPABASE_PROJECT_REF
```

## Configuration

### Environment Variables

Functions automatically receive from Supabase:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key

You must set via `supabase secrets set`:
- `RESEND_API_KEY` - For email sending

### Imports

All imports use explicit URLs (no import map needed):
- `npm:react@18.3.1` - React for JSX
- `npm:@react-email/components@0.0.25` - Email components
- `npm:@react-email/render@1.0.1` - Email renderer
- `https://deno.land/std@0.224.0/http/server.ts` - Deno HTTP server
- `https://esm.sh/@supabase/supabase-js@2` - Supabase client

### CORS Configuration

Allowed origins (edit in function files):
- `http://localhost:3000` (local development)
- `http://localhost:3001` (local development)
- `https://sequora.vercel.app` (production)
- `https://www.sequora.vercel.app` (production)

## Usage

### From Frontend

```typescript
const response = await fetch(
  'https://[project-ref].supabase.co/functions/v1/sendPasswordResetOTP',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`
    },
    body: JSON.stringify({
      email: 'user@example.com',
      recipientName: 'John Doe'
    })
  }
);
```

## Monitoring

### View Logs

```bash
# All logs
supabase functions logs sendPasswordResetOTP --project-ref <your-ref>

# Live logs
supabase functions logs sendPasswordResetOTP --project-ref <your-ref> --follow
```

### List Functions

```bash
supabase functions list --project-ref <your-ref>
```

## Development

### Local Testing (requires Docker)

```bash
supabase start
supabase functions serve sendPasswordResetOTP --env-file ../.env
```

### File Structure

```
supabase-functions/
├── import_map.json              # Deno import mappings
├── deploy.sh                    # Deploy all functions
├── deploy-single.sh             # Deploy single function
├── setup-secrets.sh             # Setup secrets
└── supabase/
    └── functions/
        ├── _email-templates/    # Shared email templates
        │   ├── EmailBase.tsx
        │   └── PasswordResetOTP.tsx
        ├── sendPasswordResetOTP/
        │   └── index.ts
        ├── verifyPasswordResetOTP/
        │   └── index.ts
        └── sendEmail/
            └── index.ts
```

## Troubleshooting

**Permission denied on scripts:**
```bash
chmod +x deploy.sh deploy-single.sh setup-secrets.sh
```

**Not logged in:**
```bash
supabase login
```

**Missing secrets:**
```bash
./setup-secrets.sh <your-project-ref>
# or
supabase secrets set RESEND_API_KEY=your_key --project-ref <your-ref>
```

**Check current secrets:**
```bash
supabase secrets list --project-ref <your-ref>
```
