import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { User, Activity, Calendar, Phone, Mail, Pill, MapPin, Users, Languages, MessageSquare, Heart } from 'lucide-react';
import { Medication } from '@/types';

interface PatientInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: any;
  episode?: any;
}

export function PatientInfoModal({ open, onOpenChange, patient, episode }: PatientInfoModalProps) {
  if (!patient) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Patient Information
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Demographics */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide text-gray-700">
              <User className="w-4 h-4" />
              Demographics
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Full Name</Label>
                  <div className="font-medium">{patient.first_name} {patient.last_name}</div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Date of Birth</Label>
                  <div className="font-medium">
                    {patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {patient.sex_at_birth && (
                  <div>
                    <Label className="text-xs text-gray-500">Sex at Birth</Label>
                    <div className="font-medium">{patient.sex_at_birth}</div>
                  </div>
                )}
                {patient.mrn && (
                  <div>
                    <Label className="text-xs text-gray-500">MRN</Label>
                    <div className="font-mono text-sm font-medium">{patient.mrn}</div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {patient.education_level && (
                  <div>
                    <Label className="text-xs text-gray-500">Education Level</Label>
                    <Badge variant="outline" className="font-normal">
                      {patient.education_level}
                    </Badge>
                  </div>
                )}
                {patient.language_code && (
                  <div className="flex items-center gap-2">
                    <Languages className="w-4 h-4 text-gray-500" />
                    <div>
                      <Label className="text-xs text-gray-500">Language</Label>
                      <div className="font-medium">{patient.language_code}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide text-gray-700">
              <MessageSquare className="w-4 h-4" />
              Contact Information
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Primary Phone</Label>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <a href={`tel:${patient.primary_phone}`} className="text-blue-600 hover:underline font-medium">
                      {patient.primary_phone}
                    </a>
                  </div>
                </div>
                {patient.alt_phone && (
                  <div>
                    <Label className="text-xs text-gray-500">Alternate Phone</Label>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <a href={`tel:${patient.alt_phone}`} className="text-blue-600 hover:underline font-medium">
                        {patient.alt_phone}
                      </a>
                    </div>
                  </div>
                )}
              </div>
              
              {patient.email && (
                <div>
                  <Label className="text-xs text-gray-500">Email</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <a href={`mailto:${patient.email}`} className="text-blue-600 hover:underline">
                      {patient.email}
                    </a>
                  </div>
                </div>
              )}

              {patient.preferred_channel && (
                <div>
                  <Label className="text-xs text-gray-500">Preferred Contact Method</Label>
                  <Badge variant="secondary" className="font-normal">
                    {patient.preferred_channel}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Address */}
          {(patient.address || patient.city || patient.state || patient.zip) && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide text-gray-700">
                <MapPin className="w-4 h-4" />
                Address
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                {patient.address && <div className="font-medium">{patient.address}</div>}
                <div className="text-gray-700">
                  {patient.city && <span>{patient.city}</span>}
                  {patient.state && <span>, {patient.state}</span>}
                  {patient.zip && <span> {patient.zip}</span>}
                </div>
              </div>
            </div>
          )}

          {/* Caregiver Information */}
          {(patient.caregiver_name || patient.caregiver_phone) && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide text-gray-700">
                <Users className="w-4 h-4" />
                Caregiver Information
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  {patient.caregiver_name && (
                    <div>
                      <Label className="text-xs text-gray-500">Name</Label>
                      <div className="font-medium">{patient.caregiver_name}</div>
                    </div>
                  )}
                  {patient.caregiver_relation && (
                    <div>
                      <Label className="text-xs text-gray-500">Relationship</Label>
                      <div className="font-medium">{patient.caregiver_relation}</div>
                    </div>
                  )}
                </div>
                
                {patient.caregiver_phone && (
                  <div>
                    <Label className="text-xs text-gray-500">Phone</Label>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <a href={`tel:${patient.caregiver_phone}`} className="text-blue-600 hover:underline font-medium">
                        {patient.caregiver_phone}
                      </a>
                    </div>
                  </div>
                )}

                {patient.caregiver_preferred_channel && (
                  <div>
                    <Label className="text-xs text-gray-500">Preferred Contact Method</Label>
                    <Badge variant="secondary" className="font-normal">
                      {patient.caregiver_preferred_channel}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Episode Info (if provided) */}
          {episode && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide text-gray-700">
                <Activity className="w-4 h-4" />
                Current Episode
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">Condition</Label>
                    <div className="mt-1">
                      <Badge>{episode.condition_code}</Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Risk Level</Label>
                    <div className="mt-1">
                      <Badge variant={
                        episode.risk_level === 'HIGH' ? 'destructive' : 
                        episode.risk_level === 'MEDIUM' ? 'default' : 
                        'outline'
                      }>
                        {episode.risk_level}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {episode.discharge_at && (
                  <div>
                    <Label className="text-xs text-gray-500">Discharge Date</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">
                        {new Date(episode.discharge_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}

                {episode.admission_at && (
                  <div>
                    <Label className="text-xs text-gray-500">Admission Date</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">
                        {new Date(episode.admission_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}

                {episode.diagnosis && (
                  <div>
                    <Label className="text-xs text-gray-500">Diagnosis</Label>
                    <div className="mt-1 text-sm text-gray-700">{episode.diagnosis}</div>
                  </div>
                )}

                {episode.notes && (
                  <div>
                    <Label className="text-xs text-gray-500">Episode Notes</Label>
                    <div className="mt-1 text-sm text-gray-700 bg-white p-3 rounded border">
                      {episode.notes}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Medications (if provided) */}
          {episode?.medications && Array.isArray(episode.medications) && episode.medications.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide text-gray-700">
                <Pill className="w-4 h-4" />
                Medications
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-2">
                  {episode.medications.map((med: Medication, index: number) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-white rounded border">
                      <Pill className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{med.name}</div>
                        <div className="text-sm text-gray-600 mt-1 space-x-2">
                          {med.dosage && <span>{med.dosage}</span>}
                          {med.frequency && <span>• {med.frequency}</span>}
                          {med.timing && <span>• {med.timing}</span>}
                        </div>
                        {med.notes && (
                          <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">{med.notes}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

