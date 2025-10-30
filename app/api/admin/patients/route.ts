import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    // Get ALL patients with their account status and latest episode info
    const { data: patients, error } = await supabase
      .from('Patient')
      .select(`
        *,
        User!Patient_auth_user_id_fkey (
          id,
          auth_user_id,
          email,
          role,
          created_at,
          last_login_at
        ),
        Episode (
          id,
          condition_code,
          risk_level,
          discharge_at,
          created_at
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all patients:', error);
      return NextResponse.json(
        { error: 'Failed to fetch patients', details: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ Fetched ${patients?.length || 0} patients from database`);

    // Transform data for the frontend
    const transformedPatients = patients.map(patient => {
      const user = Array.isArray(patient.User) ? patient.User[0] : patient.User; // Get the associated user account
      
      // Sort episodes by created_at descending to get the latest episode
      const sortedEpisodes = patient.Episode?.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      }) || [];
      const latestEpisode = sortedEpisodes[0]; // Get the latest episode
      
      // Calculate days since discharge
      const daysSinceDischarge = latestEpisode?.discharge_at 
        ? Math.floor((new Date().getTime() - new Date(latestEpisode.discharge_at).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      // Determine account status
      let accountStatus = 'NO_ACCOUNT';
      let accountCreatedAt = null;
      let lastSignIn = null;
      
      if (user) {
        accountStatus = user.last_login_at ? 'ACTIVE' : 'INACTIVE';
        accountCreatedAt = user.created_at;
        lastSignIn = user.last_login_at;
      }

      // Determine TOC status
      let tocStatus = 'NO_EPISODE';
      if (latestEpisode) {
        if (daysSinceDischarge !== null && daysSinceDischarge <= 30) {
          tocStatus = 'ACTIVE';
        } else if (daysSinceDischarge !== null && daysSinceDischarge <= 60) {
          tocStatus = 'EXTENDED';
        } else if (daysSinceDischarge !== null) {
          tocStatus = 'COMPLETED';
        } else {
          // Episode exists but no discharge date - still active
          tocStatus = 'ACTIVE';
        }
      }

      return {
        id: patient.id,
        first_name: patient.first_name,
        last_name: patient.last_name,
        email: patient.email,
        primary_phone: patient.primary_phone,
        name: `${patient.first_name} ${patient.last_name}`,
        created_at: patient.created_at,
        
        // Account status
        accountStatus,
        accountCreatedAt,
        lastSignIn,
        hasAccount: !!user,
        
        // Episode info
        latestEpisode: latestEpisode ? {
          id: latestEpisode.id,
          condition_code: latestEpisode.condition_code,
          risk_level: latestEpisode.risk_level,
          discharge_at: latestEpisode.discharge_at,
          daysSinceDischarge
        } : null,
        
        // TOC status
        tocStatus,
        
        // Display fields
        condition: latestEpisode?.condition_code || 'N/A',
        riskLevel: latestEpisode?.risk_level || 'N/A',
        dischargeDate: latestEpisode?.discharge_at || null,
        daysSinceDischarge: daysSinceDischarge || null,
        
        // Flags for UI
        flags: 0, // TODO: Calculate from EscalationTasks
        status: tocStatus,
        lastContact: null, // TODO: Calculate from OutreachAttempts
        nextScheduled: null // TODO: Calculate from OutreachPlans
      };
    });

    // Categorize patients
    const allPatients = transformedPatients;
    const pendingPatients = transformedPatients.filter(p => 
      !p.hasAccount && p.tocStatus === 'ACTIVE'
    );
    const activatedPatients = transformedPatients.filter(p => 
      p.hasAccount
    );

    return NextResponse.json({ 
      patients: allPatients,
      pendingPatients,
      activatedPatients,
      counts: {
        total: allPatients.length,
        pending: pendingPatients.length,
        activated: activatedPatients.length,
        withAccounts: transformedPatients.filter(p => p.hasAccount).length,
        withoutAccounts: transformedPatients.filter(p => !p.hasAccount).length,
        activeTOC: transformedPatients.filter(p => p.tocStatus === 'ACTIVE').length,
        completedTOC: transformedPatients.filter(p => p.tocStatus === 'COMPLETED').length
      }
    });

  } catch (error) {
    console.error('Error in admin patients fetch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
