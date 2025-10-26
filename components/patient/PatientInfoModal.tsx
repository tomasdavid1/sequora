import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { User, Activity, Calendar, Phone, Mail } from 'lucide-react';

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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Patient Information
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Name</Label>
                <div className="font-medium">{patient.first_name} {patient.last_name}</div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Date of Birth</Label>
                <div className="font-medium">
                  {patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-3 border-t">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500" />
                <a href={`tel:${patient.primary_phone}`} className="text-blue-600 hover:underline">
                  {patient.primary_phone}
                </a>
              </div>
              {patient.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <a href={`mailto:${patient.email}`} className="text-blue-600 hover:underline text-sm">
                    {patient.email}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Episode Info (if provided) */}
          {episode && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Current Episode
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-gray-500">Condition:</Label>
                  <Badge>{episode.condition_code}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-gray-500">Risk Level:</Label>
                  <Badge variant={
                    episode.risk_level === 'HIGH' ? 'destructive' : 
                    episode.risk_level === 'MEDIUM' ? 'default' : 
                    'outline'
                  }>
                    {episode.risk_level}
                  </Badge>
                </div>
                {episode.discharge_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">
                      Discharged: {new Date(episode.discharge_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

