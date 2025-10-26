'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Phone, MessageSquare, UserPlus, Upload, AlertTriangle } from 'lucide-react';

interface PatientsTableProps {
  patients: any[];
  loading?: boolean;
  onPatientClick?: (patient: any) => void;
  onContactClick?: (patient: any) => void;
  onConversationClick?: (patient: any) => void;
  showAddPatient?: boolean; // Whether to show the Add Patient button
  onPatientAdded?: () => void; // Callback after patient is added successfully
}

export function PatientsTable({ 
  patients, 
  loading,
  onPatientClick,
  onContactClick,
  onConversationClick,
  showAddPatient = false,
  onPatientAdded
}: PatientsTableProps) {
  const { toast } = useToast();
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handlePDFUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/toc/nurse/parse-pdf', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        setParsedData(result.data);
        setShowConfirmation(true);
      } else {
        toast({
          title: "Error parsing PDF",
          description: result.error || "Failed to extract data from PDF",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload PDF",
        variant: "destructive"
      });
    }
  };

  const handleCreatePatient = async () => {
    if (!parsedData) return;

    // Validate required fields
    const errors: string[] = [];
    if (!parsedData.firstName?.trim()) errors.push('firstName');
    if (!parsedData.lastName?.trim()) errors.push('lastName');
    if (!parsedData.phone?.trim()) errors.push('phone');
    if (!parsedData.dob) errors.push('dob');
    if (!parsedData.dischargeDate) errors.push('dischargeDate');
    if (!parsedData.condition) errors.push('condition');

    if (errors.length > 0) {
      setValidationErrors(errors);
      toast({
        title: "Missing Required Fields",
        description: "Please fill in all required fields (marked with *)",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/toc/nurse/upload-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedData)
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Patient added successfully"
        });
        setShowConfirmation(false);
        setShowAddPatientModal(false);
        setParsedData(null);
        setValidationErrors([]);
        onPatientAdded?.(); // Refresh the patient list
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create patient",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create patient",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

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
    <>
      <div className="space-y-4">
        {showAddPatient && (
          <div className="flex justify-end">
            <Button onClick={() => setShowAddPatientModal(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Patient
            </Button>
          </div>
        )}
        
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
      </div>

      {/* PDF Upload Modal */}
      <Dialog open={showAddPatientModal && !showConfirmation} onOpenChange={setShowAddPatientModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Patient</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Upload Discharge Summary (PDF)</Label>
              <Input
                type="file"
                accept="application/pdf"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    await handlePDFUpload(file);
                  }
                }}
              />
              <p className="text-sm text-gray-500 mt-1">
                Upload a discharge summary PDF to auto-fill patient information
              </p>
            </div>
            
            <div className="text-center text-gray-500">or</div>
            
            <Button
              variant="outline"
              onClick={() => {
                setParsedData({
                  firstName: '',
                  lastName: '',
                  dob: '',
                  phone: '',
                  email: '',
                  condition: 'HF',
                  dischargeDate: new Date().toISOString().split('T')[0],
                  riskLevel: 'MEDIUM',
                  educationLevel: 'MEDIUM',
                  medications: []
                });
                setShowConfirmation(true);
              }}
            >
              Enter Manually
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation/Edit Modal */}
      <Dialog open={showConfirmation} onOpenChange={(open) => {
        if (!open) {
          setShowConfirmation(false);
          setParsedData(null);
          setValidationErrors([]);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Patient Information</DialogTitle>
          </DialogHeader>
          
          {parsedData && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Review and edit the information below, then create the patient.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className={validationErrors.includes('firstName') ? 'text-red-600' : ''}>
                    First Name *
                  </Label>
                  <Input
                    value={parsedData?.firstName || ''}
                    onChange={(e) => {
                      setParsedData({ ...parsedData, firstName: e.target.value });
                      setValidationErrors(validationErrors.filter(f => f !== 'firstName'));
                    }}
                    className={validationErrors.includes('firstName') ? 'border-red-500' : ''}
                  />
                </div>
                <div>
                  <Label className={validationErrors.includes('lastName') ? 'text-red-600' : ''}>
                    Last Name *
                  </Label>
                  <Input
                    value={parsedData?.lastName || ''}
                    onChange={(e) => {
                      setParsedData({ ...parsedData, lastName: e.target.value });
                      setValidationErrors(validationErrors.filter(f => f !== 'lastName'));
                    }}
                    className={validationErrors.includes('lastName') ? 'border-red-500' : ''}
                  />
                </div>
                <div>
                  <Label className={validationErrors.includes('dob') ? 'text-red-600' : ''}>
                    Date of Birth *
                  </Label>
                  <Input
                    type="date"
                    value={parsedData?.dob || ''}
                    onChange={(e) => {
                      setParsedData({ ...parsedData, dob: e.target.value });
                      setValidationErrors(validationErrors.filter(f => f !== 'dob'));
                    }}
                    className={validationErrors.includes('dob') ? 'border-red-500' : ''}
                  />
                </div>
                <div>
                  <Label className={validationErrors.includes('phone') ? 'text-red-600' : ''}>
                    Phone *
                  </Label>
                  <Input
                    value={parsedData?.phone || ''}
                    onChange={(e) => {
                      setParsedData({ ...parsedData, phone: e.target.value });
                      setValidationErrors(validationErrors.filter(f => f !== 'phone'));
                    }}
                    className={validationErrors.includes('phone') ? 'border-red-500' : ''}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={parsedData?.email || ''}
                    onChange={(e) => setParsedData({ ...parsedData, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label className={validationErrors.includes('condition') ? 'text-red-600' : ''}>
                    Condition *
                  </Label>
                  <Select
                    value={parsedData?.condition || ''}
                    onValueChange={(value) => {
                      setParsedData({ ...parsedData, condition: value });
                      setValidationErrors(validationErrors.filter(f => f !== 'condition'));
                    }}
                  >
                    <SelectTrigger className={validationErrors.includes('condition') ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HF">Heart Failure</SelectItem>
                      <SelectItem value="COPD">COPD</SelectItem>
                      <SelectItem value="AMI">Acute MI</SelectItem>
                      <SelectItem value="PNA">Pneumonia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={validationErrors.includes('dischargeDate') ? 'text-red-600' : ''}>
                    Discharge Date *
                  </Label>
                  <Input
                    type="date"
                    value={parsedData?.dischargeDate || ''}
                    onChange={(e) => {
                      setParsedData({ ...parsedData, dischargeDate: e.target.value });
                      setValidationErrors(validationErrors.filter(f => f !== 'dischargeDate'));
                    }}
                    className={validationErrors.includes('dischargeDate') ? 'border-red-500' : ''}
                  />
                </div>
                <div>
                  <Label>Risk Level</Label>
                  <Select
                    value={parsedData?.riskLevel || 'MEDIUM'}
                    onValueChange={(value) => setParsedData({ ...parsedData, riskLevel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Education Level</Label>
                  <Select
                    value={parsedData?.educationLevel || 'MEDIUM'}
                    onValueChange={(value) => setParsedData({ ...parsedData, educationLevel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">LOW (5th grade)</SelectItem>
                      <SelectItem value="MEDIUM">MEDIUM (everyday language)</SelectItem>
                      <SelectItem value="HIGH">HIGH (medical terms OK)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="col-span-2">
                <Label>Medications</Label>
                <Input
                  placeholder="Enter medications separated by commas (e.g., 'Furosemide 40mg once daily, Metoprolol 25mg twice daily')"
                  defaultValue={parsedData?.medications?.map((m: any) => 
                    typeof m === 'string' ? m : `${m.name}${m.dosage ? ' ' + m.dosage : ''}${m.frequency ? ' ' + m.frequency : ''}`
                  ).join(', ') || ''}
                  onBlur={(e) => {
                    const items = e.target.value.split(',').filter(item => item.trim());
                    const medications = items.map(item => {
                      const parts = item.trim().split(' ');
                      return {
                        name: parts[0] || '',
                        dosage: parts[1] || '',
                        frequency: parts.slice(2).join(' ') || ''
                      };
                    });
                    setParsedData({ ...parsedData, medications });
                  }}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Separate each medication with a comma. Format: Name Dosage Frequency
                </p>
              </div>

              <div className="flex justify-between gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => {
                  setShowConfirmation(false);
                  setParsedData(null);
                }}>
                  ← Back
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => {
                    setShowAddPatientModal(false);
                    setShowConfirmation(false);
                    setParsedData(null);
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreatePatient} disabled={submitting}>
                    {submitting ? 'Creating...' : 'Create Patient'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

