'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title?: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  message, 
  action 
}: EmptyStateProps) {
  return (
    <div className="text-center py-12 text-gray-500">
      <Icon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
      {title && <h3 className="text-lg font-medium text-gray-700 mb-2">{title}</h3>}
      <p className="text-sm">{message}</p>
      {action && (
        <Button 
          onClick={action.onClick}
          variant="outline"
          className="mt-4"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

