'use client';

import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { TrendingUp, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface RiskUpgradeBadgeProps {
  oldRiskLevel: string;
  newRiskLevel: string;
  upgradedAt: string;
  reason?: string;
  compact?: boolean;
}

export function RiskUpgradeBadge({ 
  oldRiskLevel, 
  newRiskLevel, 
  upgradedAt, 
  reason,
  compact = false 
}: RiskUpgradeBadgeProps) {
  const timeAgo = formatDistanceToNow(new Date(upgradedAt), { addSuffix: true });
  
  // Check if upgrade was recent (within 24 hours)
  const isRecent = Date.now() - new Date(upgradedAt).getTime() < 24 * 60 * 60 * 1000;
  
  if (compact) {
    return (
      <HoverCard openDelay={200}>
        <HoverCardTrigger asChild>
          <Badge 
            variant="destructive" 
            className="gap-1 cursor-help animate-pulse"
          >
            <TrendingUp className="w-3 h-3" />
            {isRecent ? 'Recently Upgraded' : 'Upgraded'}
          </Badge>
        </HoverCardTrigger>
        <HoverCardContent side="right" align="start" className="w-80">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-red-500" />
              <h4 className="font-semibold">Risk Level Auto-Upgraded</h4>
            </div>
            <div className="text-sm space-y-1">
              <p className="font-medium">
                <span className="text-gray-600">{oldRiskLevel}</span>
                {' → '}
                <span className="text-red-600 font-bold">{newRiskLevel}</span>
              </p>
              <p className="text-gray-500">{timeAgo}</p>
              {reason && (
                <p className="text-gray-700 mt-2 pt-2 border-t">
                  <span className="font-medium">Reason: </span>
                  {reason}
                </p>
              )}
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  }

  return (
    <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex-shrink-0 mt-0.5">
        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-red-600" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold text-red-900">Risk Level Auto-Upgraded</h4>
          {isRecent && (
            <Badge variant="destructive" className="text-xs">
              New
            </Badge>
          )}
        </div>
        <p className="text-sm text-red-800 font-medium mb-1">
          <span className="text-gray-700">{oldRiskLevel}</span>
          {' → '}
          <span className="text-red-700 font-bold">{newRiskLevel}</span>
          {' '}
          <span className="text-gray-600 font-normal">({timeAgo})</span>
        </p>
        {reason && (
          <p className="text-sm text-gray-700 mt-2">
            <span className="font-medium">Reason: </span>
            {reason}
          </p>
        )}
      </div>
    </div>
  );
}

