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
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { useToast } from '@/hooks/use-toast';
import { Save, Brain, Eye, Plus, Trash2, ArrowLeft, Settings, AlertTriangle, Edit2, Check, X, Info } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ProtocolConfig, ProtocolContentPack } from '@/types';
import { useProtocolConfig } from '@/hooks/useProtocolConfig';
import { VALID_ACTION_TYPES, ActionType, SeverityType, VALID_SEVERITIES, VALID_RULE_TYPES, RuleTypeType } from '@/lib/enums';

// Helper component for labels with info tooltips
const LabelWithInfo = ({ htmlFor, label, info }: { htmlFor: string; label: string; info: string }) => (
  <div className="flex items-center gap-2 mb-2">
    <Label htmlFor={htmlFor}>{label}</Label>
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help flex-shrink-0" />
      </HoverCardTrigger>
      <HoverCardContent side="right" align="start" className="w-80 z-[100]">
        <p className="text-sm text-gray-700">{info}</p>
      </HoverCardContent>
    </HoverCard>
  </div>
);

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
    condition_code: '',
    rule_type: '',
    text_patterns: [],
    action_type: undefined, // MUST be explicitly selected by user
    severity: '',
    message: '',
    numeric_follow_up_question: null,
    question_category: '',
    question_text: '',
    follow_up_question: '',
    is_critical: false,
    active: true
  } as any);
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
        router.push('/toc/dashboard/protocol-config');
      }
    }
  }, [error, toast, router]);


  const createNewRule = async () => {
    if (!config) return;

    // Process text_patterns if it's a string
    const processedRule = {
      ...newRule,
      text_patterns: typeof newRule.text_patterns === 'string' 
        ? newRule.text_patterns.split(',').map(s => s.trim()).filter(Boolean)
        : newRule.text_patterns
    };

    const success = await createRule(processedRule as Omit<ProtocolContentPack, 'id' | 'created_at' | 'updated_at'>);
    
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
        action_type: undefined, // MUST be explicitly selected by user
        severity: 'LOW',
        message: '',
        numeric_follow_up_question: null,
        question_category: '',
        question_text: '',
        follow_up_question: '',
        is_critical: false,
        active: true
      } as any);
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

      const response = await fetch(`/api/toc/admin/protocol-rules/${editingRuleId}`, {
        method: 'PUT',
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
          <Button onClick={() => router.push('/toc/dashboard/protocol-config')}>
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
            onClick={() => router.push('/toc/dashboard/protocol-config')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
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
              <div className="flex items-center gap-2">
                <CardTitle>Decision Thresholds</CardTitle>
                <HoverCard openDelay={200}>
                  <HoverCardTrigger asChild>
                    <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help flex-shrink-0" />
                  </HoverCardTrigger>
                  <HoverCardContent side="right" align="start" className="w-96 z-[100]">
                    <p className="text-sm text-gray-700 font-semibold mb-2">🧠 The AI Does Holistic Clinical Analysis</p>
                    <p className="text-sm text-gray-700 mb-2">
                      The AI doesn't just match keywords - it uses <strong>clinical reasoning</strong> to assess the overall situation:
                    </p>
                    <ul className="text-sm text-gray-700 space-y-1 list-disc pl-4">
                      <li><strong>Symptom Combinations:</strong> vomiting + dizziness = dehydration risk</li>
                      <li><strong>Context & Red Flags:</strong> medication non-adherence, financial barriers, patient sounds worried</li>
                      <li><strong>Sentiment Analysis:</strong> scared, distressed, or panicked = increases urgency</li>
                      <li><strong>Clinical Judgment:</strong> "If I were the doctor, would I want to know this RIGHT NOW?"</li>
                      <li><strong>Patient Intuition:</strong> When patient says they "don't feel right" or "something's off" - the AI trusts that</li>
                    </ul>
                    <p className="text-sm text-gray-700 mt-2">
                      These thresholds control when the AI's holistic assessment triggers escalations or follow-up questions.
                    </p>
                  </HoverCardContent>
                </HoverCard>
              </div>
              <CardDescription>
                AI confidence levels for different actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <LabelWithInfo 
                  htmlFor="critical_threshold" 
                  label="Critical Confidence Threshold" 
                  info="When the AI is MORE confident than this threshold about a severe symptom (e.g., 0.7 = 70% confident), it will automatically escalate to a nurse. Higher values = AI needs to be MORE certain before escalating. Lower values = AI escalates more cautiously even with less certainty. Example: If set to 0.7 and AI is 80% confident patient has chest pain, it will escalate immediately."
                />
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
                <LabelWithInfo 
                  htmlFor="low_threshold" 
                  label="Low Confidence Threshold" 
                  info="When the AI is LESS confident than this threshold about understanding the patient's condition (e.g., 0.3 = 30% confident), it will ask follow-up clarifying questions instead of making assumptions. Lower values = AI asks for clarification less often. Higher values = AI asks more questions to gather better information. Example: If set to 0.3 and patient says 'I feel weird', AI is only 20% confident so it will ask 'Can you describe what you mean by weird? Where do you feel it?'"
                />
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
                <LabelWithInfo 
                  htmlFor="vague_symptoms" 
                  label="Vague Symptoms (comma-separated)" 
                  info="These are trigger words that tell the AI 'this patient isn't being specific enough - I need more details.' When the AI detects these words (e.g., 'weird', 'off', 'uncomfortable'), it will ALWAYS ask follow-up questions like 'Can you be more specific?' or 'Where exactly do you feel this?' regardless of confidence level. This prevents the AI from making dangerous assumptions when patients use vague language. Add any words that need clarification in your patient population."
                />
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
                  <div className="flex items-center gap-2">
                    <div>
                      <Label htmlFor="sentiment_boost">Enable Sentiment Boost</Label>
                      <p className="text-xs text-gray-500">Upgrade severity when patient is distressed</p>
                    </div>
                    <HoverCard openDelay={200}>
                      <HoverCardTrigger asChild>
                        <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help flex-shrink-0" />
                      </HoverCardTrigger>
                      <HoverCardContent side="right" align="start" className="w-80 z-[100]">
                        <p className="text-sm text-gray-700">When enabled, the AI analyzes the patient's emotional tone (distressed, scared, panicked, crying) in addition to symptoms. If the patient sounds distressed, the AI will automatically upgrade the severity level to treat it as more urgent. Example: Patient says 'I'm really scared, my chest feels a bit tight' - without sentiment boost = MODERATE, with sentiment boost = CRITICAL. This ensures emotionally distressed patients get faster attention even if symptoms seem mild.</p>
                      </HoverCardContent>
                    </HoverCard>
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
                    <LabelWithInfo 
                      htmlFor="distressed_upgrade" 
                      label="Distressed Severity Upgrade" 
                      info="This is the severity level the AI will UPGRADE TO when it detects a distressed patient (only if Sentiment Boost is enabled). The AI will take the HIGHER of: (1) the symptom's normal severity, or (2) this distressed upgrade level. Example: If set to HIGH, a LOW severity symptom from a distressed patient becomes HIGH. A CRITICAL symptom stays CRITICAL (since it's already higher). Think of this as 'minimum severity for distressed patients'."
                    />
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
                        {VALID_SEVERITIES.filter(s => ['CRITICAL', 'HIGH', 'MODERATE'].includes(s)).map((severity) => (
                          <SelectItem key={severity} value={severity}>{severity}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div>
                <LabelWithInfo 
                  htmlFor="notes" 
                  label="Internal Notes" 
                  info="These notes are for your team only - the AI does NOT see or use these. Use this space to document why you chose specific settings, special considerations for this patient population, or protocol version history. Example: 'Increased critical threshold to 0.8 on 2024-03-15 after too many false escalations for anxious patients' or 'Spanish-speaking patients tend to use 'pesado' for heaviness - added to vague symptoms list'."
                />
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
                                severity: value as SeverityType
                              })}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {VALID_SEVERITIES.map((severity) => (
                                  <SelectItem key={severity} value={severity}>{severity}</SelectItem>
                                ))}
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
                                action_type: value as ActionType
                              })}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {VALID_ACTION_TYPES.map((actionType) => (
                                  <SelectItem key={actionType} value={actionType}>{actionType}</SelectItem>
                                ))}
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
              <LabelWithInfo 
                htmlFor="rule_code" 
                label="Rule Code *" 
                info="A unique identifier for this rule (e.g., HF_CHEST_PAIN). Used for tracking and debugging in logs. Must be unique across all rules."
              />
              <Input
                id="rule_code"
                value={newRule.rule_code || ''}
                onChange={(e) => setNewRule({ ...newRule, rule_code: e.target.value })}
                placeholder="HF_CHEST_PAIN"
                className="font-mono"
              />
            </div>

            {/* Rule Type */}
            <div>
              <LabelWithInfo 
                htmlFor="rule_type" 
                label="Rule Type *" 
                info="RED_FLAG: Detects concerning symptoms. CLARIFICATION: Asks follow-up questions for more details. CLOSURE: Identifies when patient confirms they're doing well and conversation can end."
              />
              <Select
                value={newRule.rule_type || 'RED_FLAG'}
                onValueChange={(value) => setNewRule({ ...newRule, rule_type: value as RuleTypeType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VALID_RULE_TYPES.map((ruleType) => (
                    <SelectItem key={ruleType} value={ruleType}>
                    {ruleType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Text Patterns */}
            <div>
              <LabelWithInfo 
                htmlFor="text_patterns" 
                label="Text Patterns *" 
                info="The AI interprets what patients say and maps it to these patterns. For example, if a patient says 'I've been feeling like I can't breathe well,' the AI will recognize this matches 'shortness of breath.' The patterns you enter here are the clinical terms the AI should map to. The AI understands variations and similar meanings automatically - you don't need to list every possible way a patient might describe something. Use commas to separate multiple patterns."
              />
              <Textarea
                id="text_patterns"
                value={Array.isArray(newRule.text_patterns) ? newRule.text_patterns.join(', ') : newRule.text_patterns || ''}
                onChange={(e) => setNewRule({ 
                  ...newRule, 
                  text_patterns: e.target.value
                } as any)}
                rows={3}
                placeholder="chest pain, chest pressure, chest discomfort, heart pain, chest hurt, chest aches, chest tightness"
                className="font-mono"
              />
            </div>

            {/* Action Type */}
            <div>
              <LabelWithInfo 
                htmlFor="action_type" 
                label="Action Type *" 
                info="What the AI should do when this rule triggers. HANDOFF_TO_NURSE: Immediately escalate to a nurse (for critical situations). RAISE_FLAG: Create a flag for review (for concerning but not critical situations). ASK_MORE: Ask clarifying questions. LOG_CHECKIN: Complete the check-in successfully."
              />
              <Select
                value={newRule.action_type}
                onValueChange={(value) => setNewRule({ ...newRule, action_type: value as ActionType })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select action type (required)" />
                </SelectTrigger>
                <SelectContent>
                  {VALID_ACTION_TYPES.map((actionType) => (
                    <SelectItem key={actionType} value={actionType}>{actionType}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Severity */}
            <div>
              <LabelWithInfo 
                htmlFor="severity" 
                label="Severity *" 
                info="AI BEHAVIOR: Controls escalation urgency AND which patients see this rule. CRITICAL = 30min nurse response, URGENT priority. HIGH = 2hr response, HIGH priority. MODERATE = 4hr response, NORMAL priority. LOW = 8hr response, LOW priority. RISK FILTERING: HIGH risk patients see ALL severity rules (they're fragile, everything matters). MEDIUM risk patients see CRITICAL+HIGH+MODERATE only (skip minor stuff). LOW risk patients see CRITICAL+HIGH only (only serious red flags). This matching ensures sick patients get intensive monitoring while stable patients aren't over-monitored."
              />
              <Select
                value={newRule.severity || 'LOW'}
                onValueChange={(value: SeverityType) => setNewRule({ ...newRule, severity: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VALID_SEVERITIES.map((severity) => (
                    <SelectItem key={severity} value={severity}>{severity}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Question Category */}
            <div>
              <LabelWithInfo 
                htmlFor="question_category" 
                label="Question Category" 
                info="AI BEHAVIOR: Groups related health topics so the AI doesn't ask duplicate questions. The AI tracks which categories have been covered in the conversation. If a category is marked as 'Is Critical', the AI MUST cover it before closing the conversation. Examples: 'weight', 'breathing', 'medications', 'swelling'. Use consistent naming so the AI knows these questions are about the same health area."
              />
              <Input
                id="question_category"
                value={(newRule as any).question_category || ''}
                onChange={(e) => setNewRule({ ...newRule, question_category: e.target.value } as any)}
                placeholder="weight, breathing, medications, swelling, etc."
              />
            </div>

            {/* Question Text */}
            <div>
              <LabelWithInfo 
                htmlFor="question_text" 
                label="Question Text" 
                info="AI BEHAVIOR: Makes the AI proactively ask this question in checklist-style conversations. The AI will work through various Question Categories, asking patients about specific health areas. This is the initial question for this category. If set along with 'Follow-up Question', the AI will ask this first, then dig deeper with the follow-up if the patient indicates a concern."
              />
              <Textarea
                id="question_text"
                value={(newRule as any).question_text || ''}
                onChange={(e) => setNewRule({ ...newRule, question_text: e.target.value } as any)}
                rows={2}
                placeholder="Have you noticed any changes in your weight recently?"
              />
            </div>

            {/* Follow-up Question */}
            <div>
              <LabelWithInfo 
                htmlFor="follow_up_question" 
                label="Follow-up Question" 
                info="AI BEHAVIOR: Guides the AI on what to ask next during checklist-style conversations. When you have a 'Question Text' field set, the AI will ask that initial question. If the patient indicates a problem or concern, the AI uses this follow-up to dig deeper. Example: Question Text: 'Any weight changes?' → Patient: 'Yes' → AI asks this follow-up: 'How much weight?'. The AI decides when to use this based on the patient's response."
              />
              <Textarea
                id="follow_up_question"
                value={(newRule as any).follow_up_question || ''}
                onChange={(e) => setNewRule({ ...newRule, follow_up_question: e.target.value } as any)}
                rows={2}
                placeholder="How many pounds have you gained or lost?"
              />
            </div>

            {/* Message */}
            <div>
              <LabelWithInfo 
                htmlFor="message" 
                label="Message *" 
                info="Internal message logged when this rule triggers. Used for nurse review, documentation, and audit trails. The patient never sees this - it's for clinical staff only."
              />
              <Textarea
                id="message"
                value={newRule.message || ''}
                onChange={(e) => setNewRule({ ...newRule, message: e.target.value })}
                rows={2}
                placeholder="Chest pain reported - possible cardiac event"
              />
            </div>

            {/* Numeric Follow-up Question */}
            <div>
              <LabelWithInfo 
                htmlFor="numeric_follow_up_question" 
                label="Numeric Follow-up Question" 
                info="AI BEHAVIOR: ⚠️ ONLY use this if your text patterns involve numeric values (weight changes, pain scales, temperature, etc.). When a pattern matches but the patient didn't provide a specific number, the AI AUTOMATICALLY asks this question - no AI decision involved, it's triggered by the rules engine. Example: Pattern: 'gained weight' (no number) → Patient: 'I've gained some weight' → AI IMMEDIATELY asks: 'How many pounds?'. The number is critical for determining severity. Leave blank if your patterns don't involve quantities."
              />
              <Textarea
                id="numeric_follow_up_question"
                value={newRule.numeric_follow_up_question || ''}
                onChange={(e) => setNewRule({ ...newRule, numeric_follow_up_question: e.target.value })}
                rows={2}
                placeholder="How many pounds have you gained? This will help me understand if we need to escalate this to a nurse."
              />
            </div>

            {/* Is Critical */}
            <div className="flex items-center gap-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_critical"
                  checked={(newRule as any).is_critical || false}
                  onChange={(e) => setNewRule({ ...newRule, is_critical: e.target.checked } as any)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="is_critical" className="cursor-pointer">
                  Is Critical (must be answered)
                </Label>
              </div>
              <HoverCard openDelay={200}>
                <HoverCardTrigger asChild>
                  <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help flex-shrink-0" />
                </HoverCardTrigger>
                <HoverCardContent side="right" align="start" className="w-80 z-[100]">
                  <p className="text-sm text-gray-700">If checked, this question MUST be answered before the AI can close the conversation. Used for essential health checks that should never be skipped (e.g., medication adherence, critical symptoms).</p>
                </HoverCardContent>
              </HoverCard>
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
                action_type: undefined, // MUST be explicitly selected by user
                severity: 'LOW',
                message: '',
                numeric_follow_up_question: null,
                question_category: '',
                question_text: '',
                follow_up_question: '',
                is_critical: false,
                active: true
              } as any);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={createNewRule} 
              disabled={
                !newRule.rule_code || 
                !newRule.text_patterns?.length || 
                !newRule.action_type || 
                !VALID_ACTION_TYPES.includes(newRule.action_type as any) ||
                !newRule.message
              }
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Rule
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
