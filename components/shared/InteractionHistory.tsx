'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { MessageSquare } from 'lucide-react';
import { EmptyState } from './EmptyState';

interface Message {
  id?: string;
  role: string;
  content: string;
  timestamp?: string;
  created_at?: string;
}

interface Interaction {
  id: string;
  started_at: string;
  status: string;
  episode?: {
    condition_code?: string;
  };
  messages?: Message[];
}

interface InteractionHistoryProps {
  interactions: Interaction[];
  showEscalations?: boolean;
}

export function InteractionHistory({ 
  interactions,
  showEscalations = true 
}: InteractionHistoryProps) {
  if (!interactions || interactions.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        message="No conversation history found"
      />
    );
  }

  return (
    <div className="space-y-4">
      {interactions.map((interaction, index) => (
        <div key={interaction.id || index} className="border rounded-lg p-4">
          {/* Interaction Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {interaction.episode?.condition_code || 'Unknown'}
              </Badge>
              <Badge variant={interaction.status === 'ESCALATED' ? 'destructive' : 'default'}>
                {interaction.status}
              </Badge>
            </div>
            <span className="text-sm text-gray-500">
              {new Date(interaction.started_at).toLocaleString()}
            </span>
          </div>
          
          {/* Messages */}
          {interaction.messages && interaction.messages.length > 0 && (
            <div className="space-y-2">
              {interaction.messages.map((message, msgIndex) => {
                const isPatient = message.role === 'user' || message.role === 'PATIENT';
                
                return (
                  <div key={msgIndex} className={`p-3 rounded ${
                    isPatient ? 'bg-blue-50' : 'bg-gray-100'
                  }`}>
                    <div className="text-xs text-gray-500 mb-1">
                      {isPatient ? 'Patient' : 'AI'}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

