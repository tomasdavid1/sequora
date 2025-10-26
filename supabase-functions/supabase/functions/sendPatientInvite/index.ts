import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PatientInviteRequest {
  to: string;
  patientName: string;
  hospitalName?: string;
  dischargeDate: string;
  condition: string;
  inviteLink: string;
}

const getConditionName = (code: string): string => {
  const names: Record<string, string> = {
    'HF': 'Heart Failure',
    'COPD': 'COPD',
    'AMI': 'Heart Attack',
    'PNA': 'Pneumonia',
    'OTHER': 'your condition'
  };
  return names[code] || code;
};

const generateEmailHTML = ({
  patientName,
  hospitalName,
  dischargeDate,
  condition,
  inviteLink,
}: PatientInviteRequest): string => {
  const conditionName = getConditionName(condition);
  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Sequora</title>
</head>
<body style="margin: 0; padding: 0; font-family: Helvetica, Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; overflow: hidden;">
          <!-- Logo Header -->
          <tr>
            <td style="padding: 32px; text-align: center; background-color: #ffffff;">
              <h1 style="color: #059669; font-size: 32px; margin: 0; font-weight: bold;">Sequora</h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="font-size: 20px; margin: 0 0 24px 0; color: #000000;">
                Welcome to Your Care Journey, ${patientName}!
              </h2>
              
              <p style="font-size: 16px; line-height: 24px; margin: 0 0 16px 0; color: #333333;">
                You were recently discharged from ${hospitalName || 'your hospital'} for ${conditionName}. 
                We're here to support your recovery every step of the way.
              </p>
              
              <p style="font-size: 16px; line-height: 24px; margin: 24px 0 8px 0; color: #333333; font-weight: bold;">
                What is Sequora?
              </p>
              
              <p style="font-size: 16px; line-height: 24px; margin: 0 0 8px 0; color: #333333;">
                Sequora is your personal post-discharge care coordinator. We'll:
              </p>
              
              <ul style="font-size: 16px; line-height: 24px; margin: 0 0 24px 20px; color: #333333; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Check in with you regularly about how you're feeling</li>
                <li style="margin-bottom: 8px;">Help you track your medications and symptoms</li>
                <li style="margin-bottom: 8px;">Connect you with your care team if needed</li>
                <li style="margin-bottom: 8px;">Answer questions about your recovery</li>
              </ul>
              
              <p style="font-size: 16px; line-height: 24px; margin: 24px 0 8px 0; color: #333333; font-weight: bold;">
                Get Started Today
              </p>
              
              <p style="font-size: 16px; line-height: 24px; margin: 0 0 24px 0; color: #333333;">
                Create your account to access your personalized dashboard, view your care plan, 
                and communicate with your care team.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr>
                  <td align="center">
                    <a href="${inviteLink}" 
                       style="display: inline-block; background-color: #059669; color: #ffffff; 
                              font-size: 16px; font-weight: 600; text-decoration: none; 
                              border-radius: 10px; padding: 18px 36px; min-width: 200px; text-align: center;">
                      Create My Account
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="font-size: 14px; line-height: 20px; margin: 32px 0 16px 0; color: #666666;">
                This invitation link will expire in 7 days. If you need a new link, 
                please contact your care coordinator.
              </p>
              
              <p style="font-size: 14px; line-height: 20px; margin: 16px 0 0 0; color: #666666;">
                <strong>Need Help?</strong><br>
                If you have questions or need assistance, reply to this email or 
                call your care team at the number provided during discharge.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px; background-color: #F7F9FC; text-align: center;">
              <p style="font-size: 14px; line-height: 20px; margin: 0 0 16px 0; color: #666666;">
                Sequora helps patients manage their post-discharge care with 
                AI-powered check-ins, medication tracking, and personalized 
                support for a smooth recovery.
              </p>
              
              <p style="font-size: 14px; line-height: 20px; margin: 0; color: #666666;">
                Questions? Contact 
                <a href="mailto:support@sequora.health" style="color: #059669; text-decoration: none;">
                  support@sequora.health
                </a>
              </p>
            </td>
          </tr>
          
          <!-- Copyright -->
          <tr>
            <td style="padding: 16px; text-align: center;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                © ${currentYear} Sequora. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

const handler = async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        ...corsHeaders,
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  try {
    const {
      to,
      patientName,
      hospitalName,
      dischargeDate,
      condition,
      inviteLink,
    }: PatientInviteRequest = await request.json();

    console.log("📧 [Patient Invite] Sending invitation to:", to);
    console.log("📧 [Patient Invite] Patient:", patientName);
    console.log("📧 [Patient Invite] Condition:", condition);

    // Validate required fields
    if (!to || !patientName || !inviteLink) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: to, patientName, inviteLink",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Generate plain HTML email
    const emailHtml = generateEmailHTML({
      to,
      patientName,
      hospitalName: hospitalName || 'your hospital',
      dischargeDate,
      condition,
      inviteLink,
    });

    console.log("📧 [Patient Invite] Email generated, sending via Resend...");

    // Send via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Sequora Care Team <care@sequora.health>",
        to: [to],
        subject: `Welcome to Your Post-Discharge Care Program`,
        html: emailHtml,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("❌ [Patient Invite] Resend error:", data);
      return new Response(JSON.stringify({ error: data }), {
        status: res.status,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    console.log("✅ [Patient Invite] Email sent successfully:", data.id);

    return new Response(
      JSON.stringify({
        success: true,
        emailId: data.id,
        message: "Patient invitation sent",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("❌ [Patient Invite] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
};

serve(handler);

