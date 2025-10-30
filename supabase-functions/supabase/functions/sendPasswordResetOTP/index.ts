import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generatePasswordResetEmail } from "../_email-templates/passwordResetHTML.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Define allowed origins
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://sequora.vercel.app",
  "https://www.sequora.vercel.app",
  "https://sequora.dev",
  "https://www.sequora.dev",
];

// Following the instructions from https://supabase.com/docs/guides/functions/cors
const getCorsHeaders = (request: Request) => {
  const origin = request.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin)
      ? origin
      : "",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
};

// Generate truly random 6-digit OTP
const generateRandomOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const handler = async (request: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        ...getCorsHeaders(request),
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  try {
    // Parse the request body
    const { email, recipientName } = await request.json();

    console.log(`Processing password reset OTP for ${email}`);

    // email is the only parameter that is required
    if (!email) {
      return new Response(
        JSON.stringify({
          error: "Missing required field: email",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(request),
          },
        }
      );
    }

    // Generate truly random 6-digit OTP
    const otpCode = generateRandomOTP();

    console.log(`Generated OTP for ${email}: ${otpCode}`);

    // Store OTP in user metadata for verification
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Get the user first by listing users and filtering by email
    const { data: usersData, error: getUserError } =
      await supabase.auth.admin.listUsers();

    if (getUserError) {
      throw getUserError;
    }

    const user = usersData.users.find((u) => u.email === email);
    if (!user) {
      throw new Error(`User not found: ${email}`);
    }

    // Update user metadata with OTP
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          password_reset_otp: otpCode,
          otp_expires_at: expiresAt.toISOString(),
        },
      }
    );

    if (updateError) {
      console.error("Could not store OTP:", updateError);
      throw updateError;
    }

    // Generate HTML email
    const html = generatePasswordResetEmail(otpCode, recipientName);

    // Prepare the email data
    const emailData = {
      from: "Sequora <noreply@sequora.dev>",
      to: [email],
      subject: `Your Sequora password reset code`,
      html,
    };

    console.log(`Sending password reset OTP email to ${email}`);

    // Send the email using Resend API
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailData),
    });

    const dataResend = await res.json();
    console.log(`Email sent response:`, dataResend);

    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP sent successfully",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(request),
        },
      }
    );
  } catch (error) {
    console.error("Error sending password reset OTP:", error);

    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...getCorsHeaders(request),
      },
    });
  }
};

serve(handler);
