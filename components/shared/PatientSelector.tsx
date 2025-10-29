'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getConditionColor } from '@/lib/ui-helpers';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  education_level?: string;
}

interface Episode {
  id: string;
  patient_id: string;
  condition_code: string;
  risk_level: string;
  discharge_at: string;
}

interface PatientSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patients: Patient[];
  episodes: Episode[];
  onSelect: (patient: Patient, episode: Episode) => void;
}

export function PatientSelector({
  open,
  onOpenChange,
  patients,
  episodes,
  onSelect
}: PatientSelectorProps) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [availableEpisodes, setAvailableEpisodes] = useState<Episode[]>([]);

  const handlePatientSelected = (patient: Patient) => {
    setSelectedPatient(patient);
    const patientEpisodes = episodes.filter(e => e.patient_id === patient.id);
    setAvailableEpisodes(patientEpisodes);
  };

  const handleEpisodeSelected = (episode: Episode) => {
    if (selectedPatient) {
      onSelect(selectedPatient, episode);
      // Reset state
      setSelectedPatient(null);
      setAvailableEpisodes([]);
    }
  };

  const handleBack = () => {
    setSelectedPatient(null);
    setAvailableEpisodes([]);
  };

  const handleClose = () => {
    setSelectedPatient(null);
    setAvailableEpisodes([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Patient for New Chat</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!selectedPatient ? (
            <>
              <p className="text-sm text-gray-600">Choose a patient to start a conversation:</p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {patients.map((patient) => {
                  const patientEpisodes = episodes.filter(e => e.patient_id === patient.id);
                  const conditions = [...new Set(patientEpisodes.map(ep => ep.condition_code))];
                  const riskLevels = [...new Set(patientEpisodes.map(ep => ep.risk_level))];
                  
                  return (
                    <button
                      key={patient.id}
                      onClick={() => handlePatientSelected(patient)}
                      className="w-full p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-300 text-left transition-colors"
                    >
                      <div className="font-medium">{patient.first_name} {patient.last_name}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {patient.email} • {conditions.length > 0 ? (
                          <span className="font-semibold">{conditions.join(', ')}</span>
                        ) : 'No episodes'} {riskLevels.length > 0 && `• ${riskLevels.join(', ')} Risk`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="font-medium">
                  Selected: {selectedPatient.first_name} {selectedPatient.last_name}
                </div>
                <div className="text-sm text-gray-600">
                  {availableEpisodes.length} episode{availableEpisodes.length !== 1 ? 's' : ''} available •{' '}
                  {selectedPatient.education_level} Education Level
                </div>
              </div>
              
              <div>
                <Label className="mb-2 block">Select Episode (Protocol):</Label>
                <div className="space-y-2">
                  {availableEpisodes.length > 0 ? (
                    availableEpisodes.map((episode) => (
                      <button
                        key={episode.id}
                        onClick={() => handleEpisodeSelected(episode)}
                        className="w-full p-4 border rounded-lg hover:bg-green-50 hover:border-green-300 text-left transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Badge className={getConditionColor(episode.condition_code)}>
                            {episode.condition_code} Protocol
                          </Badge>
                          <Badge variant="outline">{episode.risk_level} Risk</Badge>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Discharged: {new Date(episode.discharge_at).toLocaleDateString()}
                        </div>
                      </button>
                    ))
                  ) : (
                    <Alert>
                      <AlertDescription>
                        No episodes found for this patient. Create one first.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
              
              <Button 
                variant="outline" 
                onClick={handleBack}
              >
                ← Back to Patient Selection
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

