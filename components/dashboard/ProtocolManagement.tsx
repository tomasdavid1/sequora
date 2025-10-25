'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RedFlagRule, ProtocolAssignment, ConditionCode } from '@/types';
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Brain,
  Users
} from 'lucide-react';

interface ProtocolAssignmentWithRelations extends ProtocolAssignment {
  Episode: {
    Patient: {
      first_name: string;
      last_name: string;
    };
  };
}

export default function ProtocolManagement() {
  const [rules, setRules] = useState<RedFlagRule[]>([]);
  const [assignments, setAssignments] = useState<ProtocolAssignmentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<RedFlagRule | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newRule, setNewRule] = useState({
    rule_code: '',
    description: '',
    condition_specific: false,
    education_level: 'all',
    rules_dsl: {
      red_flags: [],
      closures: []
    }
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load protocol rules
      const rulesResponse = await fetch('/api/admin/protocol-rules');
      const rulesData = await rulesResponse.json();
      setRules(rulesData.rules || []);

      // Load protocol assignments
      const assignmentsResponse = await fetch('/api/admin/protocol-assignments');
      const assignmentsData = await assignmentsResponse.json();
      setAssignments(assignmentsData.assignments || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async () => {
    try {
      const response = await fetch('/api/admin/protocol-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule)
      });

      if (response.ok) {
        setShowCreateDialog(false);
        setNewRule({
          rule_code: '',
          description: '',
          condition_specific: false,
          education_level: 'all',
          rules_dsl: { red_flags: [], closures: [] }
        });
        loadData();
      }
    } catch (error) {
      console.error('Error creating rule:', error);
    }
  };

  const handleUpdateRule = async () => {
    if (!editingRule) return;

    try {
      const response = await fetch(`/api/admin/protocol-rules/${editingRule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRule)
      });

      if (response.ok) {
        setEditingRule(null);
        loadData();
      }
    } catch (error) {
      console.error('Error updating rule:', error);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const response = await fetch(`/api/admin/protocol-rules/${ruleId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Error deleting rule:', error);
    }
  };

  const getEducationLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'HF': return 'bg-blue-100 text-blue-800';
      case 'COPD': return 'bg-orange-100 text-orange-800';
      case 'AMI': return 'bg-red-100 text-red-800';
      case 'PNA': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading protocol data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Protocol Management</h2>
          <p className="text-gray-600 mt-1">Manage AI interaction protocols and rules for TOC patients</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Protocol Rule</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="rule-code">Rule Code</Label>
                <Input
                  id="rule-code"
                  value={newRule.rule_code}
                  onChange={(e) => setNewRule(prev => ({ ...prev, rule_code: e.target.value }))}
                  placeholder="e.g., HF_SOB_HIGH"
                />
              </div>
              <div>
                <Label htmlFor="rule-description">Description</Label>
                <Textarea
                  id="rule-description"
                  value={newRule.description}
                  onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this rule detects and how it works"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="condition-specific"
                  checked={newRule.condition_specific}
                  onCheckedChange={(checked) => setNewRule(prev => ({ ...prev, condition_specific: checked }))}
                />
                <Label htmlFor="condition-specific">Condition Specific</Label>
              </div>
              <div>
                <Label htmlFor="education-level">Education Level</Label>
                <Select value={newRule.education_level} onValueChange={(value) => setNewRule(prev => ({ ...prev, education_level: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateRule} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  Create Rule
                </Button>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="rules" className="space-y-6">
        <TabsList>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Protocol Rules
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Patient Assignments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          {rules.map((rule) => (
            <Card key={rule.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-blue-600" />
                    <div>
                      <CardTitle className="text-lg">{rule.rule_code}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getEducationLevelColor(rule.education_level || 'all')}>
                      {rule.education_level || 'all'}
                    </Badge>
                    {rule.condition_specific && (
                      <Badge variant="outline">Condition Specific</Badge>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingRule(rule)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteRule(rule.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">
                    <strong>Red Flags:</strong> {(rule.rules_dsl as any)?.red_flags?.length || 0} rules
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>Closures:</strong> {(rule.rules_dsl as any)?.closures?.length || 0} rules
                  </div>
                  <div className="text-xs text-gray-500">
                    Created: {rule.created_at ? new Date(rule.created_at).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          {assignments.map((assignment) => (
            <Card key={assignment.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-green-600" />
                    <div>
                      <CardTitle className="text-lg">
                        {assignment.Episode.Patient.first_name} {assignment.Episode.Patient.last_name}
                      </CardTitle>
                      <p className="text-sm text-gray-600">
                        Episode ID: {assignment.episode_id}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getConditionColor(assignment.condition_code)}>
                      {assignment.condition_code}
                    </Badge>
                    <Badge className={getEducationLevelColor(assignment.education_level || 'all')}>
                      {assignment.education_level || 'all'}
                    </Badge>
                    <Badge variant={assignment.is_active ? "default" : "secondary"}>
                      {assignment.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">
                  Assigned: {assignment.assigned_at ? new Date(assignment.assigned_at).toLocaleDateString() : 'N/A'}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Edit Rule Dialog */}
      {editingRule && (
        <Dialog open={!!editingRule} onOpenChange={() => setEditingRule(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Protocol Rule</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-rule-code">Rule Code</Label>
                <Input
                  id="edit-rule-code"
                  value={editingRule.rule_code}
                  onChange={(e) => setEditingRule(prev => prev ? { ...prev, rule_code: e.target.value } : null)}
                />
              </div>
              <div>
                <Label htmlFor="edit-rule-description">Description</Label>
                <Textarea
                  id="edit-rule-description"
                  value={editingRule.description}
                  onChange={(e) => setEditingRule(prev => prev ? { ...prev, description: e.target.value } : null)}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-condition-specific"
                  checked={editingRule.condition_specific || false}
                  onCheckedChange={(checked) => setEditingRule(prev => prev ? { ...prev, condition_specific: checked } : null)}
                />
                <Label htmlFor="edit-condition-specific">Condition Specific</Label>
              </div>
              <div>
                <Label htmlFor="edit-education-level">Education Level</Label>
                <Select 
                  value={editingRule.education_level || 'all'} 
                  onValueChange={(value) => setEditingRule(prev => prev ? { ...prev, education_level: value } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-rules-dsl">Rules DSL (JSON)</Label>
                <Textarea
                  id="edit-rules-dsl"
                  value={JSON.stringify(editingRule.rules_dsl, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setEditingRule(prev => prev ? { ...prev, rules_dsl: parsed } : null);
                    } catch (error) {
                      // Invalid JSON, keep the text as is
                    }
                  }}
                  className="font-mono text-sm"
                  rows={10}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdateRule} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setEditingRule(null)}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

