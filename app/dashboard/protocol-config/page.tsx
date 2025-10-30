'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Save, Brain, Eye } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface ProtocolConfig {
  id: string;
  condition_code: string;
  risk_level: string;
  critical_confidence_threshold: number;
  low_confidence_threshold: number;
  vague_symptoms: string[];
  enable_sentiment_boost: boolean;
  distressed_severity_upgrade: string;
  route_medication_questions_to_info: boolean;
  route_general_questions_to_info: boolean;
  detect_multiple_symptoms: boolean;
  system_prompt: string | null;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function ProtocolConfigPage() {
  const router = useRouter();
  const { toast} = useToast();
  const [configs, setConfigs] = useState<ProtocolConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editedConfig, setEditedConfig] = useState<Partial<ProtocolConfig>>({});
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<ProtocolConfig | null>(null);
  
  // Define table columns
  const columns: Column<ProtocolConfig>[] = [
    {
      header: 'Condition',
      accessor: 'condition_code',
      filterable: 'select',
      filterOptions: [
        { label: 'HF', value: 'HF' },
        { label: 'COPD', value: 'COPD' },
        { label: 'AMI', value: 'AMI' },
        { label: 'PNA', value: 'PNA' }
      ],
      cell: (value) => <Badge>{value}</Badge>
    },
    {
      header: 'Risk',
      accessor: 'risk_level',
      filterable: 'select',
      filterOptions: [
        { label: 'HIGH', value: 'HIGH' },
        { label: 'MEDIUM', value: 'MEDIUM' },
        { label: 'LOW', value: 'LOW' }
      ],
      cell: (value) => (
        <Badge variant={
          value === 'HIGH' ? 'destructive' : 
          value === 'MEDIUM' ? 'default' : 
          'outline'
        }>
          {value}
        </Badge>
      )
    },
    {
      header: 'Critical',
      accessor: 'critical_confidence_threshold',
      cell: (value) => (
        <span className={getThresholdColor(value)}>
          {(value * 100).toFixed(0)}%
        </span>
      )
    },
    {
      header: 'Low',
      accessor: 'low_confidence_threshold',
      cell: (value) => (
        <span className={getThresholdColor(value, true)}>
          {(value * 100).toFixed(0)}%
        </span>
      )
    },
    {
      header: 'Sentiment',
      accessor: 'enable_sentiment_boost',
      cell: (value, row) => value ? (
        <Badge variant="outline" className="text-emerald-600">
          {row.distressed_severity_upgrade}
        </Badge>
      ) : (
        <Badge variant="outline">OFF</Badge>
      )
    },
    {
      header: 'Status',
      accessor: 'active',
      cell: (value) => (
        <Badge variant={value ? 'default' : 'destructive'}>
          {value ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (value, row) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setSelectedConfig(row);
            setEditedConfig(row);
            setDetailsModalOpen(true);
          }}
        >
          <Eye className="w-4 h-4 mr-1" />
          View/Edit
        </Button>
      )
    }
  ];

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/protocol-config');
      const data = await response.json();

      if (data.success) {
        setConfigs(data.configs);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch protocol configs',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error fetching configs:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch protocol configs',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/protocol-config/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedConfig)
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Protocol config updated successfully',
        });
        setEditedConfig({});
        fetchConfigs();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update config',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: 'Error',
        description: 'Failed to save changes',
        variant: 'destructive'
      });
    }
  };

  const getRiskBadgeVariant = (riskLevel: string) => {
    switch (riskLevel) {
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'default';
      case 'LOW': return 'outline';
      default: return 'default';
    }
  };

  const getThresholdColor = (threshold: number, isLow: boolean = false) => {
    if (isLow) {
      // Low confidence threshold (higher = asks more questions)
      if (threshold >= 0.7) return 'text-emerald-600';
      if (threshold >= 0.5) return 'text-yellow-600';
      return 'text-red-600';
    } else {
      // Critical confidence threshold (lower = more sensitive)
      if (threshold <= 0.5) return 'text-red-600 font-bold';
      if (threshold <= 0.7) return 'text-yellow-600';
      return 'text-emerald-600';
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold">Protocol Configuration</h1>
          <p className="text-sm sm:text-base text-gray-600">AI decision parameters for each condition + risk level</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          className="w-full sm:w-auto sm:flex-shrink-0"
        >
          ← Back
        </Button>
      </div>

      {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Configurations ({configs.length})</CardTitle>
            <CardDescription>
              Click View/Edit to modify. Changes take effect immediately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={configs}
              columns={columns}
              loading={loading}
              emptyMessage="No configurations found. Try adjusting your filters."
              hoverable={true}
              searchable={true}
              searchPlaceholder="Search by condition, risk level, notes..."
              searchKeys={['condition_code', 'risk_level', 'notes', 'system_prompt']}
              mobileCardView={true}
              renderMobileCard={(row) => (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Badge>{row.condition_code}</Badge>
                      <Badge variant={
                        row.risk_level === 'HIGH' ? 'destructive' : 
                        row.risk_level === 'MEDIUM' ? 'default' : 
                        'outline'
                      }>
                        {row.risk_level}
                      </Badge>
                    </div>
                    <Badge variant={row.active ? 'default' : 'destructive'}>
                      {row.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-xs text-gray-500">Critical Threshold:</span>
                      <div className={getThresholdColor(row.critical_confidence_threshold)}>
                        {(row.critical_confidence_threshold * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Low Threshold:</span>
                      <div className={getThresholdColor(row.low_confidence_threshold, true)}>
                        {(row.low_confidence_threshold * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                  
                  {row.enable_sentiment_boost && (
                    <div className="text-xs">
                      <span className="text-gray-500">Sentiment:</span>{' '}
                      <Badge variant="outline" className="text-emerald-600">
                        {row.distressed_severity_upgrade}
                      </Badge>
                    </div>
                  )}
                  
                  <div className="pt-2 border-t">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full"
                      onClick={() => {
                        setSelectedConfig(row);
                        setEditedConfig(row);
                        setDetailsModalOpen(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View/Edit
                    </Button>
                  </div>
                </div>
              )}
            />
          </CardContent>
        </Card>

        {/* Details/Edit Modal */}
        <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Protocol Configuration Details
              </DialogTitle>
              <DialogDescription>
                {selectedConfig && (
                  <span>
                    {selectedConfig.condition_code} • {selectedConfig.risk_level} Risk
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            
            {selectedConfig && (
              <div className="space-y-6">
                {/* System Prompt - Most Important */}
                <div>
                  <Label htmlFor="system_prompt" className="text-base font-semibold flex items-center gap-2 mb-3">
                    <Brain className="w-5 h-5" />
                    AI System Prompt
                  </Label>
                  <Textarea
                    id="system_prompt"
                    value={editedConfig.system_prompt ?? selectedConfig.system_prompt ?? ''}
                    onChange={(e) => setEditedConfig({ ...editedConfig, system_prompt: e.target.value })}
                    rows={6}
                    className="font-mono text-sm"
                    placeholder="Enter the AI system prompt that defines personality and behavior..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This prompt defines how the AI interacts with patients of this condition and risk level
                  </p>
                </div>

                {/* Decision Thresholds */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="critical_threshold">Critical Confidence Threshold</Label>
                    <Input
                      id="critical_threshold"
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={editedConfig.critical_confidence_threshold ?? selectedConfig.critical_confidence_threshold}
                      onChange={(e) => setEditedConfig({
                        ...editedConfig,
                        critical_confidence_threshold: parseFloat(e.target.value)
                      })}
                    />
                    <p className="text-xs text-gray-500 mt-1">AI escalates if confidence {'>'} this value</p>
                  </div>
                  <div>
                    <Label htmlFor="low_threshold">Low Confidence Threshold</Label>
                    <Input
                      id="low_threshold"
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={editedConfig.low_confidence_threshold ?? selectedConfig.low_confidence_threshold}
                      onChange={(e) => setEditedConfig({
                        ...editedConfig,
                        low_confidence_threshold: parseFloat(e.target.value)
                      })}
                    />
                    <p className="text-xs text-gray-500 mt-1">AI asks more questions if confidence {'<'} this</p>
                  </div>
                </div>

                {/* Vague Symptoms */}
                <div>
                  <Label htmlFor="vague_symptoms">Vague Symptoms (comma-separated)</Label>
                  <Input
                    id="vague_symptoms"
                    value={
                      editedConfig.vague_symptoms 
                        ? editedConfig.vague_symptoms.join(', ')
                        : selectedConfig.vague_symptoms?.join(', ') || ''
                    }
                    onChange={(e) => setEditedConfig({
                      ...editedConfig,
                      vague_symptoms: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    placeholder="discomfort, off, tired, weird..."
                  />
                  <p className="text-xs text-gray-500 mt-1">Words that trigger clarifying questions</p>
                </div>

                {/* Sentiment Boost */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="sentiment_boost">Enable Sentiment Boost</Label>
                      <p className="text-xs text-gray-500">Upgrade severity when patient is distressed</p>
                    </div>
                    <Switch
                      id="sentiment_boost"
                      checked={editedConfig.enable_sentiment_boost ?? selectedConfig.enable_sentiment_boost}
                      onCheckedChange={(checked) => setEditedConfig({
                        ...editedConfig,
                        enable_sentiment_boost: checked
                      })}
                    />
                  </div>
                  
                  {(editedConfig.enable_sentiment_boost ?? selectedConfig.enable_sentiment_boost) && (
                    <div>
                      <Label htmlFor="distressed_upgrade">Distressed Severity Upgrade</Label>
                      <Select
                        value={editedConfig.distressed_severity_upgrade ?? selectedConfig.distressed_severity_upgrade}
                        onValueChange={(value) => setEditedConfig({
                          ...editedConfig,
                          distressed_severity_upgrade: value
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                          <SelectItem value="HIGH">HIGH</SelectItem>
                          <SelectItem value="MODERATE">MODERATE</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">Severity level when patient is distressed</p>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <Label htmlFor="notes">Internal Notes</Label>
                  <Textarea
                    id="notes"
                    value={editedConfig.notes ?? selectedConfig.notes ?? ''}
                    onChange={(e) => setEditedConfig({ ...editedConfig, notes: e.target.value })}
                    rows={3}
                    placeholder="Internal notes about this configuration..."
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => {
                    setDetailsModalOpen(false);
                    setEditedConfig({});
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={async () => {
                    await saveConfig(selectedConfig.id);
                    setDetailsModalOpen(false);
                    setEditedConfig({});
                  }}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
    </div>
  );
}

