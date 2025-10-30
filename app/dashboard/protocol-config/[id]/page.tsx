'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Save, Brain, Eye, Plus, Trash2, ArrowLeft, Settings, AlertTriangle, Edit2, Check, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ProtocolConfig, ProtocolContentPack } from '@/types';
import { useProtocolConfig } from '@/hooks/useProtocolConfig';




export default function ProtocolConfigDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const configId = params.id as string;
  
  const {
    config,
    loading,
    error,
    saving,
    updateConfig,
    activeRules,
    createRule,
    deleteRule,
    refreshRules
  } = useProtocolConfig({ configId, autoFetch: true });
  
  const [editedConfig, setEditedConfig] = useState<Partial<ProtocolConfig>>({});
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [newRule, setNewRule] = useState<Partial<ProtocolContentPack> & { text_patterns: string[] | string }>({
    rule_code: '',
    condition_code: 'HF' as const,
    rule_type: 'RED_FLAG',
    text_patterns: [],
    action_type: '',
    severity: 'LOW',
    message: '',
    numeric_follow_up_question: null,
    active: true
  });
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editedRule, setEditedRule] = useState<Partial<ProtocolContentPack> & { text_patterns?: string | string[] }>({});

  // Update editedConfig when config changes
  useEffect(() => {
    if (config) {
      setEditedConfig(config);
      // Mark initial load as complete after config is loaded
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    }
  }, [config, isInitialLoad]);

  // Track if there are actual changes (not just initial load)
  const hasChanges = Object.keys(editedConfig).length > 0 && !isInitialLoad;
  
  // Check if there are meaningful changes (not just setting the same values)
  const hasMeaningfulChanges = useMemo(() => {
    if (!config || Object.keys(editedConfig).length === 0 || isInitialLoad) return false;
    
    return Object.entries(editedConfig).some(([key, value]) => {
      const originalValue = config[key as keyof ProtocolConfig];
      return JSON.stringify(originalValue) !== JSON.stringify(value);
    });
  }, [editedConfig, config, isInitialLoad]);

  // Auto-save functionality with debouncing
  useEffect(() => {
    if (!hasMeaningfulChanges || isAutoSaving) return;

    console.log('🔄 Auto-save triggered for changes:', Object.keys(editedConfig));

    const timeoutId = setTimeout(async () => {
      setIsAutoSaving(true);
      try {
        const success = await updateConfig(editedConfig);
        if (success) {
          setLastSaved(new Date());
          setEditedConfig({}); // Clear edited config after successful save
          console.log('✅ Auto-save successful');
        } else {
          console.log('❌ Auto-save failed');
        }
      } catch (error) {
        console.error('❌ Auto-save error:', error);
      } finally {
        setIsAutoSaving(false);
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
  }, [hasMeaningfulChanges, editedConfig, updateConfig, isAutoSaving]);

  // Handle errors from the hook
  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive'
      });
      if (error.includes('not found')) {
        router.push('/dashboard/protocol-config');
      }
    }
  }, [error, toast, router]);


  const createNewRule = async () => {
    if (!config) return;

    const success = await createRule(newRule as Omit<ProtocolContentPack, 'id' | 'created_at' | 'updated_at'>);
    
    if (success) {
      toast({
        title: 'Success',
        description: 'New rule created successfully',
      });
      setNewRule({
        rule_code: '',
        condition_code: config.condition_code,
        rule_type: 'RED_FLAG',
        text_patterns: [],
        action_type: '',
        severity: 'LOW',
        message: '',
        numeric_follow_up_question: null,
        active: true
      });
      setShowAddRuleModal(false);
    } else {
      toast({
        title: 'Error',
        description: 'Failed to create rule',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule? This action cannot be undone.')) {
      return;
    }

    const success = await deleteRule(ruleId);
    
    if (success) {
      toast({
        title: 'Success',
        description: 'Rule deleted successfully',
      });
    } else {
      toast({
        title: 'Error',
        description: 'Failed to delete rule',
        variant: 'destructive'
      });
    }
  };

  const handleEditRule = (rule: ProtocolContentPack) => {
    setEditingRuleId(rule.id);
    setEditedRule({
      ...rule,
      text_patterns: Array.isArray(rule.text_patterns) 
        ? rule.text_patterns.join(', ') 
        : (rule.text_patterns as string) || ''
    } as Partial<ProtocolContentPack> & { text_patterns: string });
  };

  const handleCancelEdit = () => {
    setEditingRuleId(null);
    setEditedRule({});
  };

  const handleSaveRule = async () => {
    if (!editingRuleId) return;

    try {
      const ruleData = {
        ...editedRule,
        text_patterns: typeof editedRule.text_patterns === 'string' 
          ? editedRule.text_patterns.split(',').map((s: string) => s.trim()).filter(Boolean)
          : (editedRule.text_patterns as string[]) || []
      };

      console.log('Saving rule with data:', ruleData);
      console.log('Rule ID:', editingRuleId);

      const response = await fetch(`/api/admin/protocol-content-pack?id=${editingRuleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData)
      });

      const data = await response.json();
      console.log('API response:', data);
      console.log('Response status:', response.status);

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Rule updated successfully',
        });
        setEditingRuleId(null);
        setEditedRule({});
        await refreshRules();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update rule',
          variant: 'destructive'
        });
      }
    } catch (err) {
      console.error('Error updating rule:', err);
      toast({
        title: 'Error',
        description: 'Failed to update rule',
        variant: 'destructive'
      });
    }
  };

  const getThresholdColor = (threshold: number, isLow: boolean = false) => {
    if (isLow) {
      if (threshold >= 0.7) return 'text-emerald-600';
      if (threshold >= 0.5) return 'text-yellow-600';
      return 'text-red-600';
    } else {
      if (threshold <= 0.5) return 'text-red-600 font-bold';
      if (threshold <= 0.7) return 'text-yellow-600';
      return 'text-emerald-600';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Brain className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p>Loading protocol configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && error.includes('not found')) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold mb-2">Configuration Not Found</h2>
          <p className="text-gray-600 mb-4">The requested protocol configuration could not be found.</p>
          <Button onClick={() => router.push('/dashboard/protocol-config')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Configurations
          </Button>
        </div>
      </div>
    );
  }

  if (!config) {
    return null; // Let the hook handle loading/error states
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.push('/dashboard/protocol-config')}
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg font-semibold">Protocol Config</h1>
            <Badge variant="outline" className="text-xs">{config.condition_code}</Badge>
            <Badge variant={
              config.risk_level === 'HIGH' ? 'destructive' : 
              config.risk_level === 'MEDIUM' ? 'default' : 
              'outline'
            } className="text-xs">
              {config.risk_level}
            </Badge>
            <Badge variant={config.active ? 'default' : 'destructive'} className="text-xs">
              {config.active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          {saving || isAutoSaving ? (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              {isAutoSaving ? 'Auto-saving...' : 'Saving...'}
            </div>
          ) : lastSaved ? (
            `Saved ${lastSaved.toLocaleTimeString()}`
          ) : hasChanges ? (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              Unsaved changes
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Configuration Settings */}
        <div className="lg:col-span-1 space-y-6">
          {/* System Prompt */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI System Prompt
              </CardTitle>
              <CardDescription>
                Defines how the AI interacts with patients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={editedConfig.system_prompt ?? config.system_prompt ?? ''}
                onChange={(e) => setEditedConfig({ ...editedConfig, system_prompt: e.target.value })}
                rows={8}
                className="font-mono text-sm"
                placeholder="Enter the AI system prompt that defines personality and behavior..."
              />
            </CardContent>
          </Card>

          {/* Decision Thresholds */}
          <Card>
            <CardHeader>
              <CardTitle>Decision Thresholds</CardTitle>
              <CardDescription>
                AI confidence levels for different actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="critical_threshold">Critical Confidence Threshold</Label>
                <Input
                  id="critical_threshold"
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={editedConfig.critical_confidence_threshold ?? config.critical_confidence_threshold}
                  onChange={(e) => setEditedConfig({
                    ...editedConfig,
                    critical_confidence_threshold: parseFloat(e.target.value)
                  })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  AI escalates if confidence {'>'} this value
                </p>
                <div className={`text-sm font-medium ${getThresholdColor(editedConfig.critical_confidence_threshold ?? config.critical_confidence_threshold)}`}>
                  {(editedConfig.critical_confidence_threshold ?? config.critical_confidence_threshold) * 100}%
                </div>
              </div>
              
              <div>
                <Label htmlFor="low_threshold">Low Confidence Threshold</Label>
                <Input
                  id="low_threshold"
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={editedConfig.low_confidence_threshold ?? config.low_confidence_threshold}
                  onChange={(e) => setEditedConfig({
                    ...editedConfig,
                    low_confidence_threshold: parseFloat(e.target.value)
                  })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  AI asks more questions if confidence {'<'} this
                </p>
                <div className={`text-sm font-medium ${getThresholdColor(editedConfig.low_confidence_threshold ?? config.low_confidence_threshold, true)}`}>
                  {(editedConfig.low_confidence_threshold ?? config.low_confidence_threshold) * 100}%
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="vague_symptoms">Vague Symptoms (comma-separated)</Label>
                <Input
                  id="vague_symptoms"
                  value={
                    editedConfig.vague_symptoms 
                      ? editedConfig.vague_symptoms.join(', ')
                      : config.vague_symptoms?.join(', ') || ''
                  }
                  onChange={(e) => setEditedConfig({
                    ...editedConfig,
                    vague_symptoms: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  placeholder="discomfort, off, tired, weird..."
                />
                <p className="text-xs text-gray-500 mt-1">Words that trigger clarifying questions</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="sentiment_boost">Enable Sentiment Boost</Label>
                    <p className="text-xs text-gray-500">Upgrade severity when patient is distressed</p>
                  </div>
                  <Switch
                    id="sentiment_boost"
                    checked={editedConfig.enable_sentiment_boost ?? config.enable_sentiment_boost}
                    onCheckedChange={(checked) => setEditedConfig({
                      ...editedConfig,
                      enable_sentiment_boost: checked
                    })}
                  />
                </div>
                
                {(editedConfig.enable_sentiment_boost ?? config.enable_sentiment_boost) && (
                  <div>
                    <Label htmlFor="distressed_upgrade">Distressed Severity Upgrade</Label>
                    <Select
                      value={editedConfig.distressed_severity_upgrade ?? config.distressed_severity_upgrade ?? 'HIGH'}
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
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="notes">Internal Notes</Label>
                <Textarea
                  id="notes"
                  value={editedConfig.notes ?? config.notes ?? ''}
                  onChange={(e) => setEditedConfig({ ...editedConfig, notes: e.target.value })}
                  rows={3}
                  placeholder="Internal notes about this configuration..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Active Detection Rules */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Active Detection Rules for {config.risk_level} Risk
                  </CardTitle>
                  <CardDescription>
                    Edit patterns below. Changes save when you click "Save Changes".
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowAddRuleModal(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Rule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeRules.map((rule, index) => {
                  const isEditing = editingRuleId === rule.id;
                  const currentRule = isEditing ? editedRule : rule;
                  
                  return (
                    <div key={rule.id} className="border rounded-lg p-6 space-y-4 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-mono text-sm px-3 py-1">
                            {currentRule.rule_code}
                          </Badge>
                          {isEditing ? (
                            <Select
                              value={currentRule.severity || 'LOW'}
                              onValueChange={(value) => setEditedRule({
                                ...editedRule,
                                severity: value as 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'POSITIVE' | 'STABLE'
                              })}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                                <SelectItem value="HIGH">HIGH</SelectItem>
                                <SelectItem value="MODERATE">MODERATE</SelectItem>
                                <SelectItem value="LOW">LOW</SelectItem>
                                <SelectItem value="POSITIVE">POSITIVE</SelectItem>
                                <SelectItem value="STABLE">STABLE</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant={
                              rule.severity === 'CRITICAL' ? 'destructive' :
                              rule.severity === 'HIGH' ? 'default' :
                              rule.severity === 'MODERATE' ? 'secondary' : 'outline'
                            } className="px-3 py-1">
                              {rule.severity}
                            </Badge>
                          )}
                          <span className="text-gray-400">→</span>
                          {isEditing ? (
                            <Select
                              value={currentRule.action_type || ''}
                              onValueChange={(value) => setEditedRule({
                                ...editedRule,
                                action_type: value as 'RAISE_FLAG' | 'HANDOFF_TO_NURSE' | 'ASK_MORE' | 'LOG_CHECKIN' | 'COUNT_WELLNESS_CONFIRMATION'
                              })}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="RAISE_FLAG">RAISE_FLAG</SelectItem>
                                <SelectItem value="HANDOFF_TO_NURSE">HANDOFF_TO_NURSE</SelectItem>
                                <SelectItem value="ASK_MORE">ASK_MORE</SelectItem>
                                <SelectItem value="LOG_CHECKIN">LOG_CHECKIN</SelectItem>
                                <SelectItem value="COUNT_WELLNESS_CONFIRMATION">COUNT_WELLNESS_CONFIRMATION</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline" className="px-3 py-1">{rule.action_type}</Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSaveRule}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancelEdit}
                                className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditRule(rule)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteRule(rule.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Patterns (comma-separated):</Label>
                        <Input
                          value={isEditing ? (currentRule.text_patterns as string || '') : (Array.isArray(rule.text_patterns) ? rule.text_patterns.join(', ') : (rule.text_patterns as string) || '')}
                          onChange={(e) => {
                            if (isEditing) {
                              setEditedRule({
                                ...editedRule,
                                text_patterns: e.target.value
                              } as Partial<ProtocolContentPack> & { text_patterns: string });
                            }
                          }}
                          className="font-mono"
                          placeholder="chest pain, chest pressure, chest discomfort..."
                          disabled={!isEditing}
                        />
                      </div>
                      
                      {(currentRule.message || isEditing) && (
                        <div>
                          <Label className="text-sm font-medium mb-1 block">Message:</Label>
                          {isEditing ? (
                            <Textarea
                              value={currentRule.message || ''}
                              onChange={(e) => setEditedRule({
                                ...editedRule,
                                message: e.target.value
                              })}
                              rows={2}
                              placeholder="Message to show when this rule is triggered..."
                            />
                          ) : (
                            <p className="text-sm text-gray-700 bg-white p-3 rounded border">{rule.message}</p>
                          )}
                        </div>
                      )}
                      
                      {(currentRule.numeric_follow_up_question || isEditing) && (
                        <div>
                          <Label className="text-sm font-medium mb-1 block">Follow-up Question:</Label>
                          {isEditing ? (
                            <Textarea
                              value={currentRule.numeric_follow_up_question || ''}
                              onChange={(e) => setEditedRule({
                                ...editedRule,
                                numeric_follow_up_question: e.target.value
                              })}
                              rows={2}
                              placeholder="Follow-up question to ask the patient..."
                            />
                          ) : (
                            <p className="text-sm text-gray-700 bg-white p-3 rounded border">{rule.numeric_follow_up_question}</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {activeRules.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <AlertTriangle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No Active Rules</h3>
                    <p className="text-sm mb-4">No active rules for this condition and risk level.</p>
                    <Button
                      onClick={() => setShowAddRuleModal(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Rule
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add New Rule Modal */}
      <Dialog open={showAddRuleModal} onOpenChange={setShowAddRuleModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add New Detection Rule
            </DialogTitle>
            <DialogDescription>
              Create a new rule for {config.condition_code} • {config.risk_level} Risk
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Rule Code */}
            <div>
              <Label htmlFor="rule_code">Rule Code *</Label>
              <Input
                id="rule_code"
                value={newRule.rule_code || ''}
                onChange={(e) => setNewRule({ ...newRule, rule_code: e.target.value })}
                placeholder="HF_CHEST_PAIN"
                className="font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">Unique identifier for this rule</p>
            </div>

            {/* Rule Type */}
            <div>
              <Label htmlFor="rule_type">Rule Type *</Label>
              <Select
                value={newRule.rule_type || 'RED_FLAG'}
                onValueChange={(value: 'RED_FLAG' | 'CLOSURE' | 'CLARIFICATION') => setNewRule({ ...newRule, rule_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RED_FLAG">Red Flag (Detection)</SelectItem>
                    <SelectItem value="CLARIFICATION">Clarification (Ask More)</SelectItem>
                    <SelectItem value="CLOSURE">Closure (Conversation End)</SelectItem>
                  </SelectContent>
              </Select>
            </div>

            {/* Text Patterns */}
            <div>
              <Label htmlFor="text_patterns">Text Patterns *</Label>
              <Textarea
                id="text_patterns"
                value={Array.isArray(newRule.text_patterns) ? newRule.text_patterns.join(', ') : newRule.text_patterns || ''}
                onChange={(e) => setNewRule({ 
                  ...newRule, 
                  text_patterns: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
                rows={3}
                placeholder="chest pain, chest pressure, chest discomfort, heart pain, chest hurt, chest aches, chest tightness"
              />
              <p className="text-xs text-gray-500 mt-1">Comma-separated list of phrases to detect</p>
            </div>

            {/* Action Type */}
            <div>
              <Label htmlFor="action_type">Action Type *</Label>
              <Select
                value={newRule.action_type || ''}
                onValueChange={(value) => setNewRule({ ...newRule, action_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select action type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HANDOFF_TO_NURSE">Handoff to Nurse</SelectItem>
                  <SelectItem value="RAISE_FLAG">Raise Flag</SelectItem>
                  <SelectItem value="ASK_MORE">Ask More Questions</SelectItem>
                  <SelectItem value="LOG_CHECKIN">Log Check-in</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Severity */}
            <div>
              <Label htmlFor="severity">Severity *</Label>
              <Select
                value={newRule.severity || 'LOW'}
                onValueChange={(value: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'POSITIVE' | 'STABLE') => setNewRule({ ...newRule, severity: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                  <SelectItem value="HIGH">HIGH</SelectItem>
                  <SelectItem value="MODERATE">MODERATE</SelectItem>
                  <SelectItem value="LOW">LOW</SelectItem>
                  <SelectItem value="POSITIVE">POSITIVE</SelectItem>
                  <SelectItem value="STABLE">STABLE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Message */}
            <div>
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={newRule.message || ''}
                onChange={(e) => setNewRule({ ...newRule, message: e.target.value })}
                rows={2}
                placeholder="Chest pain reported - possible cardiac event"
              />
              <p className="text-xs text-gray-500 mt-1">Message to show when this rule is triggered</p>
            </div>

            {/* Numeric Follow-up Question */}
            <div>
              <Label htmlFor="numeric_follow_up_question">Follow-up Question (Optional)</Label>
              <Textarea
                id="numeric_follow_up_question"
                value={newRule.numeric_follow_up_question || ''}
                onChange={(e) => setNewRule({ ...newRule, numeric_follow_up_question: e.target.value })}
                rows={2}
                placeholder="How many pounds have you gained? This will help me understand if we need to escalate this to a nurse."
              />
              <p className="text-xs text-gray-500 mt-1">Additional question to ask when this rule is triggered</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => {
              setShowAddRuleModal(false);
              setNewRule({
                rule_code: '',
                condition_code: config.condition_code,
                rule_type: 'RED_FLAG',
                text_patterns: [],
                action_type: '',
                severity: 'LOW',
                message: '',
                numeric_follow_up_question: null,
                active: true
              });
            }}>
              Cancel
            </Button>
            <Button onClick={createNewRule} disabled={!newRule.rule_code || !newRule.text_patterns?.length || !newRule.action_type || !newRule.message}>
              <Plus className="w-4 h-4 mr-2" />
              Create Rule
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
