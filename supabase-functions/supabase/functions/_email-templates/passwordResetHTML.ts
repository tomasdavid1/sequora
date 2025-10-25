export function generatePasswordResetEmail(otpCode: string, recipientName?: string): string {
  const currentYear = new Date().getFullYear();
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - Sequora</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          
          <!-- Logo -->
          <tr>
            <td align="center" style="padding: 32px 0;">
              <h1 style="margin: 0; font-size: 32px; font-weight: bold; color: #059669;">Sequora</h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="background-color: #ffffff; padding: 32px; border-radius: 10px;">
              <h2 style="margin: 0; padding: 0; font-size: 20px; line-height: 33.6px; color: #000000;">Reset Your Password</h2>
              
              <p style="margin: 24px 0 0 0; font-size: 16px; line-height: 24px; color: #333333;">
                Hello${recipientName ? `, ${recipientName}` : ''},
              </p>
              
              <p style="margin: 24px 0 0 0; font-size: 16px; line-height: 24px; color: #333333;">
                We received a request to reset your password for your Sequora account. Use the verification code below to proceed:
              </p>
              
              <!-- OTP Code -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr>
                  <td align="center">
                    <div style="background-color: #059669; color: #FFFFFF; font-size: 32px; font-weight: bold; font-family: Monaco, Courier, monospace; letter-spacing: 8px; padding: 20px 24px; border-radius: 10px; display: inline-block;">
                      ${otpCode}
                    </div>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 12px 0 32px 0; font-size: 14px; line-height: 24px; color: #6B7280;">
                This code will expire in 10 minutes. If you didn't request this password reset, you can safely ignore this email.
              </p>
              
              <p style="margin: 24px 0 0 0; font-size: 16px; line-height: 24px; color: #333333;">
                - The Sequora Team
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #F7F9FC; padding: 32px; text-align: center; border-radius: 0 0 10px 10px;">
              <p style="margin: 0; font-size: 14px; line-height: 16.8px; color: #666666; max-width: 500px;">
                Sequora helps patients manage their post-discharge care with AI-powered check-ins, medication tracking, and personalized support for a smooth recovery.
              </p>
              
              <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 16.8px; color: #666666;">
                Questions? Contact <a href="mailto:onboarding@resend.dev" style="color: #059669; text-decoration: none;">onboarding@resend.dev</a>
              </p>
            </td>
          </tr>
          
          <!-- Copyright -->
          <tr>
            <td align="center" style="padding: 16px 0 0 0;">
              <p style="margin: 0; font-size: 12px; line-height: 16px; color: #6b7280;">
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
}

