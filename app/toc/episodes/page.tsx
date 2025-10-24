'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Episode {
  id: string;
  patient_id: string;
  condition_code: string;
  discharge_at: string;
  admit_at: string;
  elixhauser_score?: number;
  source_system?: string;
}

export default function EpisodesPage() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEpisodes();
  }, []);

  const fetchEpisodes = async () => {
    try {
      const res = await fetch('/api/toc/episodes?limit=50');
      const data = await res.json();
      setEpisodes(data.episodes || []);
    } catch (error) {
      console.error('Failed to fetch episodes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConditionLabel = (code: string) => {
    const labels: Record<string, string> = {
      HF: 'Heart Failure',
      COPD: 'COPD',
      AMI: 'Acute MI',
      PNA: 'Pneumonia',
      OTHER: 'Other'
    };
    return labels[code] || code;
  };

  const createOutreachPlan = async (episodeId: string) => {
    try {
      await fetch('/api/toc/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episode_id: episodeId })
      });
      alert('Outreach plan created!');
    } catch (error) {
      console.error('Failed to create outreach plan:', error);
    }
  };

  if (loading) return <div className="p-8">Loading episodes...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Recent Discharges</h1>
        <Button onClick={() => window.location.href = '/toc/episodes/new'}>
          + New Episode
        </Button>
      </div>

      <div className="grid gap-4">
        {episodes.map(episode => (
          <Card key={episode.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">
                    {getConditionLabel(episode.condition_code)}
                  </CardTitle>
                  <div className="text-sm text-gray-600 mt-1">
                    Discharged: {new Date(episode.discharge_at).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    ID: {episode.id.slice(0, 16)}...
                  </div>
                </div>
                <div className="space-y-2">
                  <Badge>{episode.condition_code}</Badge>
                  {episode.elixhauser_score && (
                    <div className="text-sm">
                      Risk: {episode.elixhauser_score}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => window.location.href = `/toc/episodes/${episode.id}`}
                >
                  View Details
                </Button>
                <Button 
                  size="sm"
                  onClick={() => createOutreachPlan(episode.id)}
                >
                  Start Outreach
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

