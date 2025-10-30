'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageSquare, Phone, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { cn } from '@/lib/utils';

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
  summary?: string;
  episode?: {
    condition_code?: string;
  };
  messages?: Message[];
}

interface InteractionHistoryProps {
  interactions: Interaction[];
  showEscalations?: boolean;
  viewMode?: 'patient' | 'staff' | 'admin'; // Different detail levels
  compact?: boolean; // For dashboard views
  title?: string; // Custom title override
}

export function InteractionHistory({ 
  interactions,
  showEscalations = true,
  viewMode = 'admin',
  compact = false,
  title
}: InteractionHistoryProps) {
  const [expandedInteractions, setExpandedInteractions] = useState<Set<string>>(new Set());
  
  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedInteractions);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedInteractions(newExpanded);
  };
  
  // Terminology based on view mode
  const terminology = {
    patient: {
      title: title || 'Check-in History',
      singular: 'Check-in',
      emptyMessage: 'No check-ins yet. Your first check-in will appear here.',
      showTechnicalDetails: false
    },
    staff: {
      title: title || 'Patient Interactions',
      singular: 'Interaction',
      emptyMessage: 'No interactions found',
      showTechnicalDetails: false
    },
    admin: {
      title: title || 'Interaction History',
      singular: 'Interaction',
      emptyMessage: 'No interactions found',
      showTechnicalDetails: true
    }
  }[viewMode];
  if (!interactions || interactions.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        message={terminology.emptyMessage}
      />
    );
  }

  return (
    <div className="space-y-3">
      {interactions.map((interaction, index) => {
        const isExpanded = expandedInteractions.has(interaction.id);
        const messageCount = interaction.messages?.length || 0;
        
        return (
          <div key={interaction.id || index} className="border rounded-lg overflow-hidden">
            {/* Interaction Header - Always visible */}
            <div 
              className={cn(
                "p-4 cursor-pointer hover:bg-gray-50 transition-colors",
                compact && "p-3"
              )}
              onClick={() => toggleExpanded(interaction.id)}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {viewMode === 'patient' ? (
                      <>
                        <MessageSquare className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="font-medium text-sm">
                          {terminology.singular}
                        </span>
                      </>
                    ) : (
                      <>
                        <Badge variant="outline" className="text-xs">
                          {interaction.episode?.condition_code || 'Unknown'}
                        </Badge>
                        {showEscalations && (
                          <Badge variant={interaction.status === 'ESCALATED' ? 'destructive' : 'default'} className="text-xs">
                            {interaction.status}
                          </Badge>
                        )}
                      </>
                    )}
                    <span className="text-xs text-gray-500">
                      {new Date(interaction.started_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {interaction.summary && (
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {interaction.summary}
                    </p>
                  )}
                  
                  {!compact && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <MessageSquare className="w-3 h-3" />
                      <span>{messageCount} message{messageCount !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-500 hidden sm:inline">
                    {new Date(interaction.started_at).toLocaleTimeString()}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>
            </div>
            
            {/* Messages - Expandable */}
            {isExpanded && interaction.messages && interaction.messages.length > 0 && (
              <div className="border-t bg-gray-50 p-4 space-y-2">
                {interaction.messages.map((message, msgIndex) => {
                  const isPatient = message.role === 'user' || message.role === 'PATIENT';
                  
                  return (
                    <div 
                      key={msgIndex} 
                      className={cn(
                        "p-3 rounded-lg",
                        isPatient ? 'bg-blue-50 ml-0 sm:ml-8' : 'bg-white mr-0 sm:mr-8'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {viewMode === 'patient' 
                            ? (isPatient ? 'You' : 'Care Team') 
                            : (isPatient ? 'Patient' : 'AI')}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(message.timestamp || message.created_at || interaction.started_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

