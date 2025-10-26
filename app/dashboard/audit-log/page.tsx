'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DataTable, Column } from '@/components/ui/data-table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { FileText, Clock, User, Brain, Zap, Lock } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  patient_name: string;
  condition_code: string;
  risk_level: string;
  started_at: string;
  status: string;
  summary: string | null;
  protocol_config_snapshot: any;
  protocol_rules_snapshot: any;
  protocol_snapshot_at: string | null;
  message_count: number;
}

export default function AuditLogPage() {
  const { user, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchAuditLog();
  }, []);

  const fetchAuditLog = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/toc/audit-log');
      const data = await response.json();
      
      if (data.success) {
        setEntries(data.entries || []);
      }
    } catch (error) {
      console.error('Error fetching audit log:', error);
    } finally {
      setLoading(false);
    }
  };

  // Define table columns
  const columns: Column<AuditLogEntry>[] = [
    {
      header: 'Patient',
      accessor: 'patient_name',
      filterable: true,
      filterPlaceholder: 'Search patient...',
      cell: (value, row) => (
        <div>
          <div className="font-medium text-sm">{value}</div>
          <div className="text-xs text-gray-500">{new Date(row.started_at).toLocaleString()}</div>
        </div>
      )
    },
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
      cell: (value, row) => (
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-xs">{value}</Badge>
          <Badge variant="outline" className="text-xs">{row.risk_level}</Badge>
        </div>
      )
    },
    {
      header: 'Summary',
      accessor: 'summary',
      cell: (value) => (
        <div className="text-sm text-gray-700 max-w-md truncate">
          {value || 'No summary'}
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      filterable: 'select',
      filterOptions: [
        { label: 'Escalated', value: 'ESCALATED' },
        { label: 'Completed', value: 'COMPLETED' },
        { label: 'In Progress', value: 'IN_PROGRESS' }
      ],
      cell: (value) => (
        <Badge variant={
          value === 'ESCALATED' ? 'destructive' : 
          value === 'COMPLETED' ? 'default' : 
          'outline'
        }>
          {value}
        </Badge>
      )
    },
    {
      header: 'Messages',
      accessor: 'message_count',
      cell: (value) => (
        <div className="text-sm text-gray-600">{value || 0}</div>
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
          onClick={(e) => {
            e.stopPropagation();
            setSelectedEntry(row);
            setShowDetailsModal(true);
          }}
        >
          <FileText className="w-4 h-4 mr-1" />
          View
        </Button>
      )
    }
  ];

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert className="max-w-md">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            Please log in to access the audit log.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const userRole = user.user_metadata?.role || 'PATIENT';
  if (userRole !== 'ADMIN' && userRole !== 'STAFF') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert className="max-w-md">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            Only administrators and staff can access the audit log.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Log</h1>
          <p className="text-gray-600">View all interactions with protocol snapshots</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
            Back to Dashboard
          </Button>
          <Button onClick={fetchAuditLog}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Interactions ({entries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={entries}
            columns={columns}
            loading={loading}
            emptyMessage="No interactions found"
            searchable={true}
            searchPlaceholder="Search by patient, condition, summary..."
            searchKeys={['patient_name', 'condition_code', 'summary', 'status']}
            hoverable={true}
          />
        </CardContent>
      </Card>

      {/* Details Modal - Shows Protocol Snapshots */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Interaction Audit Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedEntry && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-xs text-gray-500">Patient</div>
                  <div className="font-medium">{selectedEntry.patient_name}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Protocol</div>
                  <div className="flex gap-1">
                    <Badge>{selectedEntry.condition_code}</Badge>
                    <Badge variant="outline">{selectedEntry.risk_level}</Badge>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Status</div>
                  <div>
                    <Badge variant={
                      selectedEntry.status === 'ESCALATED' ? 'destructive' : 
                      selectedEntry.status === 'COMPLETED' ? 'default' : 
                      'outline'
                    }>
                      {selectedEntry.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Messages</div>
                  <div className="font-medium">{selectedEntry.message_count || 0}</div>
                </div>
              </div>

              {/* Summary */}
              {selectedEntry.summary && (
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4" />
                    Conversation Summary
                  </Label>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                    {selectedEntry.summary}
                  </div>
                </div>
              )}

              {/* Protocol Config Snapshot */}
              {selectedEntry.protocol_config_snapshot && (
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4" />
                    AI Decision Parameters (Snapshot)
                  </Label>
                  <div className="bg-gray-50 rounded p-4 space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-600">Critical Threshold:</span>{' '}
                        <span className="font-medium">
                          {(selectedEntry.protocol_config_snapshot.critical_confidence_threshold * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Low Threshold:</span>{' '}
                        <span className="font-medium">
                          {(selectedEntry.protocol_config_snapshot.low_confidence_threshold * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Vague Symptoms:</span>{' '}
                      <span className="font-medium">
                        {selectedEntry.protocol_config_snapshot.vague_symptoms?.join(', ') || 'None'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Sentiment Boost:</span>{' '}
                      <span className="font-medium">
                        {selectedEntry.protocol_config_snapshot.enable_sentiment_boost 
                          ? `Enabled (→ ${selectedEntry.protocol_config_snapshot.distressed_severity_upgrade})`
                          : 'Disabled'}
                      </span>
                    </div>
                    {selectedEntry.protocol_config_snapshot.system_prompt && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <span className="text-gray-600">System Prompt:</span>
                        <div className="mt-1 p-2 bg-white rounded border text-xs italic">
                          {selectedEntry.protocol_config_snapshot.system_prompt.substring(0, 200)}...
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Protocol Rules Snapshot */}
              {selectedEntry.protocol_rules_snapshot && (
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4" />
                    Active Rules at Time of Interaction
                  </Label>
                  <div className="bg-gray-50 rounded p-4 max-h-96 overflow-y-auto space-y-2">
                    {/* Red Flags */}
                    {selectedEntry.protocol_rules_snapshot.red_flags?.map((rule: any, idx: number) => (
                      <div key={idx} className="bg-white rounded p-3 border border-gray-200 text-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold">{rule.flag?.type || 'Unknown'}</span>
                          <Badge variant={rule.flag?.severity === 'CRITICAL' ? 'destructive' : 'default'} className="text-xs">
                            {rule.flag?.severity}
                          </Badge>
                        </div>
                        <div className="text-gray-600 mb-1">
                          <span className="font-medium">Patterns:</span> {rule.if?.any_text?.join(', ')}
                        </div>
                        <div className="text-emerald-700">
                          <span className="font-medium">Action:</span> {rule.flag?.action}
                        </div>
                      </div>
                    ))}
                    
                    {/* Closures */}
                    {selectedEntry.protocol_rules_snapshot.closures?.map((rule: any, idx: number) => (
                      <div key={idx} className="bg-green-50 rounded p-3 border border-green-200 text-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold">Closure Rule</span>
                          <Badge variant="outline" className="text-xs">LOG_CHECKIN</Badge>
                        </div>
                        <div className="text-gray-600">
                          <span className="font-medium">Patterns:</span> {rule.if?.any_text?.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Snapshot Timestamp */}
              {selectedEntry.protocol_snapshot_at && (
                <div className="flex items-center gap-2 text-xs text-gray-500 pt-4 border-t">
                  <Clock className="w-3 h-3" />
                  Snapshot captured: {new Date(selectedEntry.protocol_snapshot_at).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

