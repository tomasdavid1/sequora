'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { OutreachPlanTemplate } from '@/types';
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  Clock,
  Calendar,
  Phone,
  ArrowLeft
} from 'lucide-react';

export default function OutreachTemplatesPage() {
  const [templates, setTemplates] = useState<OutreachPlanTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<OutreachPlanTemplate | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    condition_code: 'HF' as const,
    risk_level: 'HIGH' as const,
    preferred_channel: 'SMS' as const,
    fallback_channel: 'VOICE' as const,
    first_contact_delay_hours: 24,
    max_attempts: 3,
    attempt_interval_hours: 48,
    contact_window_hours: 168,
    timezone: 'America/New_York',
    active: true,
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/toc/admin/outreach-templates');
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      const response = await fetch('/api/toc/admin/outreach-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate)
      });

      if (response.ok) {
        setShowCreateDialog(false);
        setNewTemplate({
          condition_code: 'HF',
          risk_level: 'HIGH',
          preferred_channel: 'SMS',
          fallback_channel: 'VOICE',
          first_contact_delay_hours: 24,
          max_attempts: 3,
          attempt_interval_hours: 48,
          contact_window_hours: 168,
          timezone: 'America/New_York',
          active: true,
        });
        loadTemplates();
      }
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;

    try {
      const response = await fetch(`/api/toc/admin/outreach-templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTemplate)
      });

      if (response.ok) {
        setEditingTemplate(null);
        loadTemplates();
      }
    } catch (error) {
      console.error('Error updating template:', error);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`/api/toc/admin/outreach-templates/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadTemplates();
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'HIGH': return 'bg-red-100 text-red-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'HF': return 'bg-blue-100 text-blue-800';
      case 'COPD': return 'bg-purple-100 text-purple-800';
      case 'AMI': return 'bg-red-100 text-red-800';
      case 'PNA': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Settings className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
          <p className="text-gray-500">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <Button
          variant="outline"
          onClick={() => window.location.href = '/toc/dashboard'}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Outreach Templates</h1>
          <p className="text-gray-500 mt-1">
            Configure outreach schedules based on condition and risk level
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Outreach Template</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <Label>Condition</Label>
                <Select
                  value={newTemplate.condition_code}
                  onValueChange={(value: any) => setNewTemplate({...newTemplate, condition_code: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HF">Heart Failure (HF)</SelectItem>
                    <SelectItem value="COPD">COPD</SelectItem>
                    <SelectItem value="AMI">AMI</SelectItem>
                    <SelectItem value="PNA">Pneumonia (PNA)</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Risk Level</Label>
                <Select
                  value={newTemplate.risk_level}
                  onValueChange={(value: any) => setNewTemplate({...newTemplate, risk_level: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>First Contact Delay (hours)</Label>
                <Input
                  type="number"
                  value={newTemplate.first_contact_delay_hours}
                  onChange={(e) => setNewTemplate({...newTemplate, first_contact_delay_hours: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <Label>Max Attempts</Label>
                <Input
                  type="number"
                  value={newTemplate.max_attempts}
                  onChange={(e) => setNewTemplate({...newTemplate, max_attempts: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <Label>Attempt Interval (hours)</Label>
                <Input
                  type="number"
                  value={newTemplate.attempt_interval_hours}
                  onChange={(e) => setNewTemplate({...newTemplate, attempt_interval_hours: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <Label>Contact Window (hours)</Label>
                <Input
                  type="number"
                  value={newTemplate.contact_window_hours}
                  onChange={(e) => setNewTemplate({...newTemplate, contact_window_hours: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <Label>Preferred Channel</Label>
                <Select
                  value={newTemplate.preferred_channel}
                  onValueChange={(value: any) => setNewTemplate({...newTemplate, preferred_channel: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SMS">SMS</SelectItem>
                    <SelectItem value="VOICE">Voice</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fallback Channel</Label>
                <Select
                  value={newTemplate.fallback_channel || 'VOICE'}
                  onValueChange={(value: any) => setNewTemplate({...newTemplate, fallback_channel: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SMS">SMS</SelectItem>
                    <SelectItem value="VOICE">Voice</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 flex items-center space-x-2">
                <Switch
                  checked={newTemplate.active}
                  onCheckedChange={(checked) => setNewTemplate({...newTemplate, active: checked})}
                />
                <Label>Active</Label>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTemplate}>
                <Save className="h-4 w-4 mr-2" />
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className={getConditionColor(template.condition_code)}>
                      {template.condition_code}
                    </Badge>
                    <Badge className={getRiskLevelColor(template.risk_level)}>
                      {template.risk_level}
                    </Badge>
                    {template.active ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-700">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg">
                    {template.condition_code} - {template.risk_level} Risk
                  </CardTitle>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingTemplate(template)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">First Contact</p>
                    <p className="text-sm text-gray-500">{template.first_contact_delay_hours}h after discharge</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">Max Attempts</p>
                    <p className="text-sm text-gray-500">{template.max_attempts} attempts</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">Interval</p>
                    <p className="text-sm text-gray-500">{template.attempt_interval_hours}h between attempts</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">Channel</p>
                    <p className="text-sm text-gray-500">{template.preferred_channel} → {template.fallback_channel}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      {editingTemplate && (
        <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Template</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <Label>First Contact Delay (hours)</Label>
                <Input
                  type="number"
                  value={editingTemplate.first_contact_delay_hours || 24}
                  onChange={(e) => setEditingTemplate({...editingTemplate, first_contact_delay_hours: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <Label>Max Attempts</Label>
                <Input
                  type="number"
                  value={editingTemplate.max_attempts || 3}
                  onChange={(e) => setEditingTemplate({...editingTemplate, max_attempts: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <Label>Attempt Interval (hours)</Label>
                <Input
                  type="number"
                  value={editingTemplate.attempt_interval_hours || 48}
                  onChange={(e) => setEditingTemplate({...editingTemplate, attempt_interval_hours: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <Label>Contact Window (hours)</Label>
                <Input
                  type="number"
                  value={editingTemplate.contact_window_hours || 168}
                  onChange={(e) => setEditingTemplate({...editingTemplate, contact_window_hours: parseInt(e.target.value)})}
                />
              </div>
              <div className="col-span-2 flex items-center space-x-2">
                <Switch
                  checked={editingTemplate.active || false}
                  onCheckedChange={(checked) => setEditingTemplate({...editingTemplate, active: checked})}
                />
                <Label>Active</Label>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateTemplate}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

