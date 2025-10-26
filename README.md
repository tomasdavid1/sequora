# HealthX Transition of Care Platform

A comprehensive AI-powered platform for managing post-discharge patient care.

## Features

- **Role-Based Dashboards**: Admin, Nurse, and Patient views
- **AI Protocol System**: Intelligent check-ins with condition-specific rules
- **Real-Time Interactions**: AI-powered patient conversations with tool calling
- **Escalation Management**: Automated red flag detection and nurse notifications
- **Protocol Management**: Configurable rules for different conditions and education levels
- **Type-Safe Database**: Full TypeScript integration with Supabase

## Tech Stack

- **Frontend**: Next.js 13, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL), Edge Functions
- **AI**: OpenAI GPT-4 with function calling
- **Email**: Resend API for transactional emails
- **Auth**: Supabase Auth with OTP-based password reset

## Getting Started

1. **Install dependencies**:
```bash
npm install
```

2. **Set up environment variables**:
Create `.env` file with:
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPEN_API_KEY=your_openai_key
RESEND_API_KEY=your_resend_key
```

3. **Run database migrations**:
```bash
# Apply migrations in Supabase dashboard or via CLI
```

4. **Start development server**:
```bash
npm run dev
```

## Project Structure

```
healthx2/
├── app/                    # Next.js pages and API routes
│   ├── api/toc/           # TOC-specific API endpoints
│   ├── dashboard/         # Role-based dashboard pages
│   └── components/        # Shared components
├── components/            # UI components
│   └── dashboard/        # Dashboard-specific components
├── lib/                  # Utilities and helpers
├── types/                # TypeScript type definitions
├── supabase/             # Database migrations
└── supabase-functions/   # Edge functions for email OTP
```

## Key Routes

- `/login` - User authentication
- `/signup` - Patient registration (requires existing patient record)
- `/dashboard` - Role-based unified dashboard
- `/dashboard/patients` - Patient management (Admin)
- `/dashboard/protocol-config` - Protocol configuration (Admin)
- `/dashboard/ai-tester` - AI interaction testing (Admin/Staff)

## License

Proprietary - All rights reserved

