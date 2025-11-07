import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Get recent risk upgrade information for an episode
 * Checks AgentMessage table for system messages about risk upgrades
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const episodeId = params.id;

    // Find recent interactions for this episode
    const { data: interactions } = await supabase
      .from('AgentInteraction')
      .select('id')
      .eq('episode_id', episodeId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!interactions || interactions.length === 0) {
      return NextResponse.json({ 
        hasUpgrade: false 
      });
    }

    const interactionIds = interactions.map(i => i.id);

    // Look for system messages about risk upgrades
    const { data: systemMessages } = await supabase
      .from('AgentMessage')
      .select('content, created_at')
      .in('interaction_id', interactionIds)
      .eq('role', 'system')
      .ilike('content', '%RISK LEVEL AUTO-UPGRADED%')
      .order('created_at', { ascending: false })
      .limit(1);

    if (!systemMessages || systemMessages.length === 0) {
      return NextResponse.json({ 
        hasUpgrade: false 
      });
    }

    const upgradeMessage = systemMessages[0];
    
    // Parse the system message to extract upgrade details
    // Message format: "🔺 RISK LEVEL AUTO-UPGRADED: LOW → HIGH\n\nReason: ..."
    const content = upgradeMessage.content;
    const levelMatch = content.match(/RISK LEVEL AUTO-UPGRADED:\s*(\w+)\s*→\s*(\w+)/);
    const reasonMatch = content.match(/Reason:\s*([^\n]+)/);
    
    if (!levelMatch) {
      return NextResponse.json({ 
        hasUpgrade: false 
      });
    }

    const [, oldRiskLevel, newRiskLevel] = levelMatch;
    const reason = reasonMatch ? reasonMatch[1].trim() : undefined;

    return NextResponse.json({
      hasUpgrade: true,
      upgrade: {
        oldRiskLevel,
        newRiskLevel,
        upgradedAt: upgradeMessage.created_at,
        reason,
      }
    });

  } catch (error) {
    console.error('Error fetching risk upgrade info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch risk upgrade information' },
      { status: 500 }
    );
  }
}

