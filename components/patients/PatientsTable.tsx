'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/ui/data-table';
import { Phone, MessageSquare } from 'lucide-react';

interface PatientsTableProps {
  patients: any[];
  loading?: boolean;
  onPatientClick?: (patient: any) => void;
  onContactClick?: (patient: any) => void;
  onConversationClick?: (patient: any) => void;
}

export function PatientsTable({ 
  patients, 
  loading,
  onPatientClick,
  onContactClick,
  onConversationClick
}: PatientsTableProps) {

  const columns: Column<any>[] = [
    {
      header: 'Patient',
      accessor: 'name',
      filterable: true,
      filterPlaceholder: 'Search patient...',
      cell: (value, row) => (
        <div>
          <button
            onClick={() => onPatientClick?.(row)}
            className="font-medium text-sm text-blue-600 hover:underline text-left"
          >
            {value}
          </button>
          <div className="text-xs text-gray-500 mt-1">
            {row.email || 'No email'}
          </div>
        </div>
      )
    },
    {
      header: 'Condition',
      accessor: 'condition',
      filterable: 'select',
      filterOptions: [
        { label: 'HF', value: 'HF' },
        { label: 'COPD', value: 'COPD' },
        { label: 'AMI', value: 'AMI' },
        { label: 'PNA', value: 'PNA' }
      ],
      cell: (value, row) => (
        <div className="flex items-center gap-1">
          <Badge variant="outline">{value}</Badge>
          {row.riskLevel && <Badge variant="outline" className="text-xs">{row.riskLevel}</Badge>}
        </div>
      )
    },
    {
      header: 'Last Contact',
      accessor: 'lastContact',
      cell: (value) => (
        <div className="text-sm text-gray-600">
          {value ? new Date(value).toLocaleDateString() : 'Never'}
        </div>
      )
    },
    {
      header: 'Days Since Discharge',
      accessor: 'daysSinceDischarge',
      cell: (value) => (
        <div className="text-sm">{value} days</div>
      )
    },
    {
      header: 'Flags',
      accessor: 'flags',
      cell: (value) => value > 0 ? (
        <Badge variant="destructive">{value}</Badge>
      ) : (
        <Badge variant="outline">0</Badge>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      filterable: 'select',
      filterOptions: [
        { label: 'Active', value: 'ACTIVE' },
        { label: 'Escalated', value: 'ESCALATED' },
        { label: 'Completed', value: 'COMPLETED' }
      ],
      cell: (value) => (
        <Badge variant={
          value === 'ESCALATED' ? 'destructive' :
          value === 'ACTIVE' ? 'default' :
          'outline'
        }>
          {value}
        </Badge>
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (value, row) => (
        <div className="flex gap-1 justify-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onContactClick?.(row);
            }}
            title="Contact patient"
          >
            <Phone className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onConversationClick?.(row);
            }}
            title="View conversation history"
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <DataTable
      data={patients}
      columns={columns}
      loading={loading}
      emptyMessage="No patients found"
      searchable={true}
      searchPlaceholder="Search patients..."
      searchKeys={['name', 'condition', 'email', 'primary_phone']}
      getRowClassName={(row) => {
        if (row.status === 'ESCALATED') return 'bg-red-50 border-l-4 border-red-500';
        if (row.flags > 0) return 'bg-yellow-50 border-l-4 border-yellow-400';
        return '';
      }}
    />
  );
}

