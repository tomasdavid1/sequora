import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Brain, Save, Zap } from 'lucide-react';

interface ProtocolConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  protocolConfig: any;
  activeRules?: any[];
  onSave: (config: any, rules?: Record<string, any>) => Promise<void>;
  showRules?: boolean;
}

export function ProtocolConfigModal({
  open,
  onOpenChange,
  protocolConfig,
  activeRules = [],
  onSave,
  showRules = false
}: ProtocolConfigModalProps) {
  const [editingConfig, setEditingConfig] = React.useState<any>({});
  const [editingRules, setEditingRules] = React.useState<Record<string, any>>({});

  // Reset state when modal opens
  React.useEffect(() => {
    if (open && protocolConfig) {
      setEditingConfig({});
      setEditingRules({});
    }
  }, [open, protocolConfig]);

  const handleSave = async () => {
    await onSave(editingConfig, editingRules);
    setEditingConfig({});
    setEditingRules({});
  };

  if (!protocolConfig) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Protocol Configuration
          </DialogTitle>
          <p className="text-sm text-gray-600">
            {protocolConfig.condition_code} • {protocolConfig.risk_level} Risk
          </p>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Active Protocol Rules - Show first if enabled */}
          {showRules && activeRules && activeRules.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-700" />
                Active Detection Rules for {protocolConfig.risk_level} Risk
              </h3>
              <p className="text-xs text-gray-600 mb-3">Edit patterns below. Changes save when you click "Save".</p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {activeRules.map((rule: any) => (
                  <div key={rule.rule_code} className="bg-white rounded p-3 border border-gray-200 text-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{rule.rule_code}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={rule.severity === 'CRITICAL' ? 'destructive' : 'default'} className="text-xs">
                          {rule.severity}
                        </Badge>
                        <span className="text-emerald-700 font-medium text-xs">→ {rule.action_type}</span>
                      </div>
                    </div>
                    <div className="mb-2">
                      <Label className="text-xs font-medium">Patterns (comma-separated):</Label>
                      <Textarea
                        value={
                          editingRules[rule.rule_code]?.text_patterns?.join(', ') || 
                          rule.text_patterns?.join(', ') || ''
                        }
                        onChange={(e) => setEditingRules({
                          ...editingRules,
                          [rule.rule_code]: {
                            ...rule,
                            text_patterns: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                          }
                        })}
                        rows={2}
                        className="text-xs mt-1"
                      />
                    </div>
                    {(rule.numeric_follow_up_question || editingRules[rule.rule_code]?.numeric_follow_up_question !== undefined) && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <Label className="text-xs font-medium">Numeric Follow-Up Question:</Label>
                        <Input
                          value={editingRules[rule.rule_code]?.numeric_follow_up_question ?? rule.numeric_follow_up_question ?? ''}
                          onChange={(e) => setEditingRules({
                            ...editingRules,
                            [rule.rule_code]: {
                              ...editingRules[rule.rule_code],
                              numeric_follow_up_question: e.target.value
                            }
                          })}
                          className="text-xs mt-1"
                          placeholder="e.g., How many pounds have you gained?"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System Prompt */}
          <div>
            <Label className="text-base font-semibold mb-3 block flex items-center gap-2">
              <Brain className="w-5 h-5" />
              AI System Prompt
            </Label>
            <Textarea
              value={editingConfig.system_prompt ?? protocolConfig.system_prompt}
              onChange={(e) => setEditingConfig({ ...editingConfig, system_prompt: e.target.value })}
              rows={6}
              className="font-mono text-sm"
              placeholder="Enter AI personality and behavior..."
            />
            <p className="text-xs text-gray-500 mt-1">Defines how AI interacts with patients of this condition and risk level</p>
          </div>

          {/* Decision Thresholds */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Critical Confidence Threshold</Label>
              <Input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={editingConfig.critical_confidence_threshold ?? protocolConfig.critical_confidence_threshold}
                onChange={(e) => setEditingConfig({
                  ...editingConfig,
                  critical_confidence_threshold: parseFloat(e.target.value)
                })}
              />
              <p className="text-xs text-gray-500 mt-1">AI escalates if confidence {'>'} this</p>
            </div>
            <div>
              <Label>Low Confidence Threshold</Label>
              <Input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={editingConfig.low_confidence_threshold ?? protocolConfig.low_confidence_threshold}
                onChange={(e) => setEditingConfig({
                  ...editingConfig,
                  low_confidence_threshold: parseFloat(e.target.value)
                })}
              />
              <p className="text-xs text-gray-500 mt-1">AI asks more if confidence {'<'} this</p>
            </div>
          </div>

          {/* Vague Symptoms */}
          <div>
            <Label>Vague Symptoms (comma-separated)</Label>
            <Input
              value={
                editingConfig.vague_symptoms 
                  ? editingConfig.vague_symptoms.join(', ')
                  : protocolConfig.vague_symptoms?.join(', ') || ''
              }
              onChange={(e) => setEditingConfig({
                ...editingConfig,
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
                <Label>Enable Sentiment Boost</Label>
                <p className="text-xs text-gray-500">Upgrade severity when patient is distressed</p>
              </div>
              <Switch
                checked={editingConfig.enable_sentiment_boost ?? protocolConfig.enable_sentiment_boost}
                onCheckedChange={(checked) => setEditingConfig({
                  ...editingConfig,
                  enable_sentiment_boost: checked
                })}
              />
            </div>
            
            {(editingConfig.enable_sentiment_boost ?? protocolConfig.enable_sentiment_boost) && (
              <div>
                <Label>Distressed Severity Upgrade</Label>
                <Select
                  value={editingConfig.distressed_severity_upgrade ?? protocolConfig.distressed_severity_upgrade}
                  onValueChange={(value) => setEditingConfig({
                    ...editingConfig,
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
                <p className="text-xs text-gray-500 mt-1">Severity when patient is distressed</p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label>Internal Notes</Label>
            <Textarea
              value={editingConfig.notes ?? protocolConfig.notes ?? ''}
              onChange={(e) => setEditingConfig({ ...editingConfig, notes: e.target.value })}
              rows={3}
              placeholder="Internal notes about this configuration..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => {
              onOpenChange(false);
              setEditingConfig({});
              setEditingRules({});
            }}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

