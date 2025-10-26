'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Phone, MessageSquare, FileText, CheckCircle } from 'lucide-react';

interface TasksTableProps {
  tasks: any[];
  loading?: boolean;
  onTaskResolved?: () => void;
  onPatientClick?: (patient: any) => void;
  onConversationClick?: (interactionId: string) => void;
}

export function TasksTable({ 
  tasks, 
  loading, 
  onTaskResolved,
  onPatientClick,
  onConversationClick
}: TasksTableProps) {
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [showFlagDetailsModal, setShowFlagDetailsModal] = useState(false);

  const handleResolveTask = async (taskId: string, notes: string) => {
    try {
      const response = await fetch(`/api/toc/tasks/${taskId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome: 'CONTACTED',
          notes: notes || 'Patient contacted - issue addressed'
        })
      });

      if (response.ok) {
        setShowResolveModal(false);
        setResolutionNotes('');
        setSelectedTask(null);
        onTaskResolved?.();
      }
    } catch (error) {
      console.error('Error resolving task:', error);
    }
  };

  const taskColumns: Column<any>[] = [
    {
      header: 'Patient',
      accessor: 'patientName',
      filterable: true,
      filterPlaceholder: 'Search patient...',
      cell: (value, row) => (
        <div>
          <button
            onClick={() => onPatientClick?.(row.patient)}
            className="font-medium text-sm text-blue-600 hover:underline text-left"
          >
            {value}
          </button>
          <div className="flex items-center gap-1 mt-1">
            <Badge variant="outline" className="text-xs">{row.condition}</Badge>
            {row.risk_level && <Badge variant="outline" className="text-xs">{row.risk_level}</Badge>}
          </div>
        </div>
      )
    },
    {
      header: 'Reason',
      accessor: 'reason_codes',
      filterable: true,
      filterPlaceholder: 'Search reason...',
      cell: (value) => (
        <div className="text-sm text-gray-800">{value?.join(', ')}</div>
      )
    },
    {
      header: 'Severity',
      accessor: 'severity',
      filterable: 'select',
      filterOptions: [
        { label: 'Critical', value: 'CRITICAL' },
        { label: 'High', value: 'HIGH' },
        { label: 'Moderate', value: 'MODERATE' },
        { label: 'Low', value: 'LOW' }
      ],
      cell: (value) => (
        <Badge variant={value === 'CRITICAL' ? 'destructive' : value === 'HIGH' ? 'default' : 'outline'}>
          {value}
        </Badge>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      filterable: 'select',
      filterOptions: [
        { label: 'Open', value: 'OPEN' },
        { label: 'In Progress', value: 'IN_PROGRESS' },
        { label: 'Resolved', value: 'RESOLVED' }
      ],
      cell: (value) => (
        <Badge variant={
          value === 'OPEN' ? 'destructive' : 
          value === 'IN_PROGRESS' ? 'default' : 
          'outline'
        }>
          {value}
        </Badge>
      )
    },
    {
      header: 'Time',
      accessor: (row) => {
        const isOverdue = new Date(row.sla_due_at) < new Date() && row.status === 'OPEN';
        const timeToBreachMins = Math.floor((new Date(row.sla_due_at).getTime() - Date.now()) / (1000 * 60));
        return { isOverdue, timeToBreachMins };
      },
      cell: (value) => (
        <div className={`text-sm font-medium ${value.isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
          {value.isOverdue 
            ? `⚠️ ${Math.abs(value.timeToBreachMins)}m`
            : value.timeToBreachMins < 60
            ? `${value.timeToBreachMins}m`
            : `${Math.round(value.timeToBreachMins / 60)}h`}
        </div>
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (value, row) => {
        const isOverdue = new Date(row.sla_due_at) < new Date() && row.status === 'OPEN';
        
        return (
          <div className="flex gap-1 justify-end">
            {row.agent_interaction_id && (
              <Button 
                size="sm" 
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onConversationClick?.(row.agent_interaction_id);
                }}
                title="View conversation"
              >
                <MessageSquare className="w-4 h-4" />
              </Button>
            )}
            <Button 
              size="sm" 
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedTask(row);
                setShowFlagDetailsModal(true);
              }}
              title="View details"
            >
              <FileText className="w-4 h-4" />
            </Button>
            {row.status === 'OPEN' && (
              <Button 
                size="sm" 
                variant={isOverdue ? "destructive" : "default"}
                className={isOverdue ? "animate-pulse" : ""}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTask(row);
                  setShowResolveModal(true);
                }}
              >
                {isOverdue ? '🚨 ACTION' : 'Resolve'}
              </Button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <>
      <DataTable
        data={tasks}
        columns={taskColumns}
        loading={loading}
        emptyMessage="No open tasks - all caught up!"
        searchable={true}
        searchPlaceholder="Search tasks..."
        searchKeys={['patientName', 'reason_codes', 'severity', 'condition']}
        getRowClassName={(row) => {
          const isOverdue = new Date(row.sla_due_at) < new Date() && row.status === 'OPEN';
          const isCritical = row.severity === 'CRITICAL';
          
          if (isOverdue) return 'bg-red-100 border-l-4 border-red-500';
          if (isCritical) return 'bg-orange-50 border-l-4 border-orange-400';
          if (row.severity === 'HIGH') return 'bg-yellow-50 border-l-4 border-yellow-400';
          
          return '';
        }}
      />

      {/* Resolve Task Modal */}
      <Dialog open={showResolveModal} onOpenChange={setShowResolveModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Resolve Task - {selectedTask?.patientName}
            </DialogTitle>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-4">
              {/* Patient Contact */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <Label className="text-sm font-medium mb-2 block">Patient Contact</Label>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-blue-600" />
                    <a href={`tel:${selectedTask.patient?.primary_phone}`} className="text-blue-600 hover:underline font-medium">
                      {selectedTask.patient?.primary_phone}
                    </a>
                  </div>
                  {selectedTask.patient?.email && (
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-blue-600" />
                      <a href={`mailto:${selectedTask.patient?.email}`} className="text-blue-600 hover:underline">
                        {selectedTask.patient?.email}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Task Summary */}
              <div className="bg-gray-50 rounded p-3">
                <div className="text-xs text-gray-600 mb-1">Reason:</div>
                <div className="font-medium text-sm">{selectedTask.reason_codes?.join(', ')}</div>
                <div className="flex gap-2 mt-2">
                  <Badge variant={selectedTask.severity === 'CRITICAL' ? 'destructive' : 'default'}>
                    {selectedTask.severity}
                  </Badge>
                </div>
              </div>

              {/* Resolution Notes */}
              <div>
                <Label htmlFor="resolution_notes">Resolution Notes *</Label>
                <Textarea
                  id="resolution_notes"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="What did you discuss? What was the outcome?"
                  rows={4}
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Document your conversation with the patient
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowResolveModal(false);
                    setResolutionNotes('');
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleResolveTask(selectedTask.id, resolutionNotes)}
                  disabled={!resolutionNotes.trim()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm & Resolve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Flag Details Modal */}
      <Dialog open={showFlagDetailsModal} onOpenChange={setShowFlagDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Flag Details</DialogTitle>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded">
                <div>
                  <div className="text-xs text-gray-500">Patient</div>
                  <div className="font-medium">{selectedTask.patientName}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Severity</div>
                  <Badge variant={selectedTask.severity === 'CRITICAL' ? 'destructive' : 'default'}>
                    {selectedTask.severity}
                  </Badge>
                </div>
              </div>
              
              <div>
                <Label>Escalation Reason</Label>
                <div className="mt-2 p-3 bg-gray-50 rounded">
                  {selectedTask.reason_codes?.join(', ')}
                </div>
              </div>
              
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium">{new Date(selectedTask.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">SLA Due:</span>
                  <span className="font-medium">{new Date(selectedTask.sla_due_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

