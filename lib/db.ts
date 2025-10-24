import { PrismaClient } from '@prisma/client';

// Prisma client with proper serverless configuration
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? 
  new PrismaClient({
    log: ['warn', 'error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Supabase client is now centralized in lib/supabase.ts
// Import from there: import { supabase } from '@/lib/supabase'; 