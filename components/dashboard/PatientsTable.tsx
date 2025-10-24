'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Patient, ConditionCode } from '@/types';
import { 
  Heart,
  Stethoscope,
  Activity,
  MessageSquare
} from 'lucide-react';

interface PatientWithEpisode extends Partial<Patient> {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  condition_code: ConditionCode;
  discharge_at: string;
}

interface PatientsTableProps {
  patients: PatientWithEpisode[];
  onPatientClick?: (patient: PatientWithEpisode) => void;
  showActions?: boolean;
}

export default function PatientsTable({ patients, onPatientClick, showActions = true }: PatientsTableProps) {
  const getConditionIcon = (condition: string) => {
    switch (condition) {
      case 'HF': return <Heart className="w-4 h-4 text-red-500" />;
      case 'COPD': return <Stethoscope className="w-4 h-4 text-blue-500" />;
      case 'AMI': return <Activity className="w-4 h-4 text-orange-500" />;
      case 'PNA': return <Stethoscope className="w-4 h-4 text-green-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getDaysSinceDischarge = (dischargeDate: string) => {
    const discharge = new Date(dischargeDate);
    const now = new Date();
    return Math.floor((now.getTime() - discharge.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (patients.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No patients found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {patients.map((patient) => {
        const daysSinceDischarge = getDaysSinceDischarge(patient.discharge_at);
        const isActive = daysSinceDischarge <= 30;

        return (
          <div 
            key={patient.id} 
            className={`border rounded-lg p-4 ${onPatientClick ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''}`}
            onClick={() => onPatientClick && onPatientClick(patient)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                {getConditionIcon(patient.condition_code)}
                <div>
                  <h3 className="font-medium">{patient.first_name} {patient.last_name}</h3>
                  <p className="text-sm text-gray-500">{patient.email}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline">{patient.condition_code}</Badge>
                  {isActive && (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Active
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  Discharged: {new Date(patient.discharge_at).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-400">
                  {daysSinceDischarge} days ago
                </p>
              </div>
            </div>
            {showActions && (
              <div className="flex gap-2 mt-3">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle contact action
                  }}
                >
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Contact
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle view details action
                  }}
                >
                  <Activity className="w-4 h-4 mr-1" />
                  View Details
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

