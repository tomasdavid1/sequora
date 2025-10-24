'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AssessmentPage() {
  const router = useRouter();

  useEffect(() => {
    // Always redirect to questionnaire, regardless of auth status
    router.replace('/questionnaire');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Starting your health assessment...</p>
      </div>
    </div>
  );
} 