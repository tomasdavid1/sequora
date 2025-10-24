import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

interface ResultsProps {
  threadId: string;
  runId: string;
}

export default function Results({ threadId, runId }: ResultsProps) {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    async function poll() {
      try {
        const res = await fetch(`/api/thread/${threadId}/run/${runId}/result`);
        if (!res.ok) throw new Error('Failed to fetch result');
        const data = await res.json();
        if (data.status === 'completed' && data.result) {
          setResult(data.result);
          setLoading(false);
          clearInterval(interval);
        } else if (data.status === 'failed') {
          setError('AI failed to generate a result.');
          setLoading(false);
          clearInterval(interval);
        }
      } catch (e: any) {
        setError(e.message);
        setLoading(false);
        clearInterval(interval);
      }
    }
    poll();
    interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [threadId, runId]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto mt-8 space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (!result) return null;

  return (
    <div className="max-w-2xl mx-auto mt-8 space-y-6">
      <Card className="shadow-lg">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
              Personalized Plan
            </Badge>
          </div>
          <CardTitle className="text-2xl md:text-3xl font-bold text-emerald-700">
            Your Wellness Plan
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Summary Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">Summary</h3>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {result.summary}
            </p>
          </div>

          <Separator />

          {/* Root Protocol Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">Root Protocol</h3>
            <div className="space-y-3">
              {result.root_protocol?.map((item: any, i: number) => (
                <Card key={i} className="bg-emerald-50 border-emerald-200">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <Badge variant="outline" className="w-fit text-xs">
                        {item.frequency}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.dosage}</p>
                        <p className="text-xs text-muted-foreground italic">{item.purpose}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          {/* Vitamins Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">Recommended Supplements</h3>
            <div className="grid gap-3">
              {result.vitamins?.map((v: string, i: number) => (
                <Card key={i} className="bg-blue-50 border-blue-200">
                  <CardContent className="p-3">
                    <p className="text-sm text-foreground">{v}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          {/* Dietary Recommendations */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">Dietary Recommendations</h3>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {result.dietary_recommendations}
            </p>
          </div>

          <Separator />

          {/* Disclaimer */}
          <Alert>
            <AlertDescription className="text-xs leading-relaxed whitespace-pre-line">
              <strong>Disclaimer:</strong> {result.disclaimer}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
} 