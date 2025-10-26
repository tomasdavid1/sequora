'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Save, X, Settings2, TrendingUp, AlertCircle, Eye, Brain } from 'lucide-react';
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
  const { toast } = useToast();
  const [configs, setConfigs] = useState<ProtocolConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedConfig, setEditedConfig] = useState<Partial<ProtocolConfig>>({});
  const [filterCondition, setFilterCondition] = useState<string>('');
  const [filterRiskLevel, setFilterRiskLevel] = useState<string>('');
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<ProtocolConfig | null>(null);

  useEffect(() => {
    fetchConfigs();
  }, [filterCondition, filterRiskLevel]);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      let url = '/api/admin/protocol-config';
      const params = new URLSearchParams();
      if (filterCondition) params.append('condition', filterCondition);
      if (filterRiskLevel) params.append('riskLevel', filterRiskLevel);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url);
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

  const startEditing = (config: ProtocolConfig) => {
    setEditingId(config.id);
    setEditedConfig(config);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditedConfig({});
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
        setEditingId(null);
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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Protocol Configuration</h1>
              <p className="text-gray-600">AI decision parameters for each condition + risk level</p>
            </div>
            <Button variant="outline" onClick={() => router.back()}>
              ← Back
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="filter-condition">Condition</Label>
                <Select value={filterCondition} onValueChange={setFilterCondition}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Conditions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Conditions</SelectItem>
                    <SelectItem value="HF">HF - Heart Failure</SelectItem>
                    <SelectItem value="COPD">COPD</SelectItem>
                    <SelectItem value="PNA">PNA - Pneumonia</SelectItem>
                    <SelectItem value="AMI">AMI - Acute MI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="filter-risk">Risk Level</Label>
                <Select value={filterRiskLevel} onValueChange={setFilterRiskLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Risk Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Risk Levels</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Critical Threshold</CardTitle>
              <AlertCircle className="w-4 h-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xs text-gray-500">
                Lower = more sensitive. AI confidence above this → escalate immediately.
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Low Threshold</CardTitle>
              <Settings2 className="w-4 h-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xs text-gray-500">
                Higher = asks more questions. AI confidence below this → clarify.
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Sentiment Boost</CardTitle>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xs text-gray-500">
                Upgrades severity when patient is distressed + has symptoms.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Configurations ({configs.length})</CardTitle>
            <CardDescription>
              Click <Pencil className="w-3 h-3 inline" /> to edit. Changes take effect immediately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              </div>
            ) : configs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No configurations found. Try adjusting your filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Condition</TableHead>
                      <TableHead>Risk</TableHead>
                      <TableHead>Critical Threshold</TableHead>
                      <TableHead>Low Threshold</TableHead>
                      <TableHead>Vague Symptoms</TableHead>
                      <TableHead>Sentiment Boost</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {configs.map((config) => (
                      <TableRow key={config.id}>
                        <TableCell>
                          <Badge>{config.condition_code}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRiskBadgeVariant(config.risk_level)}>
                            {config.risk_level}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {editingId === config.id ? (
                            <Input
                              type="number"
                              step="0.05"
                              min="0"
                              max="1"
                              value={editedConfig.critical_confidence_threshold || ''}
                              onChange={(e) => setEditedConfig({
                                ...editedConfig,
                                critical_confidence_threshold: parseFloat(e.target.value)
                              })}
                              className="w-20"
                            />
                          ) : (
                            <span className={getThresholdColor(config.critical_confidence_threshold)}>
                              {config.critical_confidence_threshold.toFixed(2)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingId === config.id ? (
                            <Input
                              type="number"
                              step="0.05"
                              min="0"
                              max="1"
                              value={editedConfig.low_confidence_threshold || ''}
                              onChange={(e) => setEditedConfig({
                                ...editedConfig,
                                low_confidence_threshold: parseFloat(e.target.value)
                              })}
                              className="w-20"
                            />
                          ) : (
                            <span className={getThresholdColor(config.low_confidence_threshold, true)}>
                              {config.low_confidence_threshold.toFixed(2)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-gray-600">
                            {config.vague_symptoms?.length || 0} words
                          </span>
                        </TableCell>
                        <TableCell>
                          {config.enable_sentiment_boost ? (
                            <Badge variant="outline" className="text-emerald-600">
                              {config.distressed_severity_upgrade}
                            </Badge>
                          ) : (
                            <Badge variant="outline">OFF</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={config.active ? 'default' : 'destructive'}>
                            {config.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {editingId === config.id ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => saveConfig(config.id)}
                                >
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelEditing}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedConfig(config);
                                    setEditedConfig(config); // Pre-populate for editing
                                    setDetailsModalOpen(true);
                                  }}
                                  title="View/Edit Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => startEditing(config)}
                                  title="Quick Edit"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details/Edit Modal */}
        <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5" />
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
    </div>
  );
}

