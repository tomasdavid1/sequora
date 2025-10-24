# Supabase Functions Deployment Guide

## Overview
This directory contains Supabase Edge Functions for HealthX TOC platform.

## Functions

### 1. `sendPasswordResetOTP`
Generates a 6-digit OTP code and sends it via email using Resend.

**Endpoint:** `https://[project-ref].supabase.co/functions/v1/sendPasswordResetOTP`

**Payload:**
```json
{
  "email": "user@example.com",
  "recipientName": "John Doe"
}
```

### 2. `verifyPasswordResetOTP`
Verifies the OTP code and generates an authenticated session.

**Endpoint:** `https://[project-ref].supabase.co/functions/v1/verifyPasswordResetOTP`

**Payload:**
```json
{
  "email": "user@example.com",
  "otpCode": "123456"
}
```

## Prerequisites

1. **Supabase CLI** installed:
```bash
npm install -g supabase
```

2. **Environment Variables** set in Supabase:
- `RESEND_API_KEY` - Your Resend API key
- `SUPABASE_URL` - Auto-provided by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-provided by Supabase

## Deployment Steps

### 1. Login to Supabase
```bash
supabase login
```

### 2. Link to Your Project
```bash
cd healthx2/supabase-functions
supabase link --project-ref fcxaptzmnywtcdxvpuii
```

### 3. Set Environment Variables
```bash
# Set Resend API key
supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

### 4. Deploy All Functions
```bash
# Deploy all functions at once
supabase functions deploy

# Or deploy individually
supabase functions deploy sendPasswordResetOTP
supabase functions deploy verifyPasswordResetOTP
```

### 5. Verify Deployment
```bash
# List deployed functions
supabase functions list

# Test a function
curl -X POST \
  'https://fcxaptzmnywtcdxvpuii.supabase.co/functions/v1/sendPasswordResetOTP' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","recipientName":"Test User"}'
```

## Environment Setup

### Local .env
Add to `healthx2/.env`:
```env
RESEND_API_KEY=re_your_api_key_here
NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL=https://fcxaptzmnywtcdxvpuii.supabase.co/functions/v1
```

## Testing Locally

```bash
# Start Supabase locally (requires Docker)
supabase start

# Serve functions locally
supabase functions serve sendPasswordResetOTP --env-file ../healthx2/.env
```

## Troubleshooting

**Function not deploying?**
- Ensure you're in the `supabase-functions` directory
- Check Supabase CLI is logged in: `supabase status`

**CORS errors?**
- Verify allowed origins in each function's index.ts
- Add your domain to `ALLOWED_ORIGINS` array

**Email not sending?**
- Verify RESEND_API_KEY is set: `supabase secrets list`
- Check Resend dashboard for delivery status

## Monitoring

View function logs in Supabase Dashboard:
1. Go to Edge Functions
2. Click on function name
3. View Logs tab

Or via CLI:
```bash
supabase functions logs sendPasswordResetOTP
```

