import { useMemo } from 'react';

export interface PatientAnalytics {
  total: number;
  active: number;
  withFlags: number;
  escalated: number;
  avgDaysSinceDischarge: number;
  within7Days: number;
  within14Days: number;
  within30Days: number;
}

export function usePatientAnalytics(patients: any[]): PatientAnalytics {
  return useMemo(() => {
    if (!patients || patients.length === 0) {
      return {
        total: 0,
        active: 0,
        withFlags: 0,
        escalated: 0,
        avgDaysSinceDischarge: 0,
        within7Days: 0,
        within14Days: 0,
        within30Days: 0
      };
    }

    // Filter active patients (within 30 days of discharge)
    const activePatients = patients.filter(p => {
      if (!p.dischargeDate && !p.discharge_at) {
        console.warn(`⚠️ Patient ${p.id} missing discharge date`);
        return false;
      }
      
      const dischargeDate = p.dischargeDate || p.discharge_at;
      const daysSince = Math.floor(
        (Date.now() - new Date(dischargeDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      return daysSince <= 30;
    });

    // Count patients with flags
    const patientsWithFlags = patients.filter(p => {
      if (p.flags === undefined || p.flags === null) {
        return false;
      }
      return p.flags > 0;
    });

    // Count escalated patients
    const escalatedPatients = patients.filter(p => 
      p.status?.toUpperCase() === 'ESCALATED'
    );

    // Count by time windows
    const within7Days = patients.filter(p => {
      if (!p.daysSinceDischarge) return false;
      return p.daysSinceDischarge <= 7;
    }).length;

    const within14Days = patients.filter(p => {
      if (!p.daysSinceDischarge) return false;
      return p.daysSinceDischarge <= 14;
    }).length;

    const within30Days = activePatients.length;

    // Calculate average days since discharge
    const validPatients = patients.filter(p => 
      p.daysSinceDischarge !== undefined && 
      p.daysSinceDischarge !== null &&
      !isNaN(p.daysSinceDischarge)
    );

    const avgDaysSinceDischarge = validPatients.length > 0
      ? Math.round(
          validPatients.reduce((sum, p) => sum + p.daysSinceDischarge, 0) / validPatients.length
        )
      : 0;

    return {
      total: patients.length,
      active: activePatients.length,
      withFlags: patientsWithFlags.length,
      escalated: escalatedPatients.length,
      avgDaysSinceDischarge,
      within7Days,
      within14Days,
      within30Days
    };
  }, [patients]);
}

