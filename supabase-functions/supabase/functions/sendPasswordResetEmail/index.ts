import React from "npm:react@18.3.1";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PasswordResetEmail } from "../_email-templates/passwordResetEmail.jsx";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const NEXT_PUBLIC_BASE_URL = Deno.env.get("NEXT_PUBLIC_BASE_URL")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Define allowed origins
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "https://upnext-git-staging-scope-labs.vercel.app",
  "https://upnext.team",
  "https://www.upnext.team",
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

    console.log(`Processing password reset email for ${email}`);

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

    // following the instructions from supabase documentation
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${NEXT_PUBLIC_BASE_URL}/reset-password`,
      },
    });

    if (error || !data.properties.action_link) {
      throw error || new Error("Could not generate password reset link");
    }

    const resetLink = data.properties.action_link;

    // Render email component
    const emailComponent = React.createElement(PasswordResetEmail, {
      resetLink,
      recipientName,
    });

    const html = await renderAsync(emailComponent);

    // Prepare the email data
    const emailData = {
      from: "UpNext <no-reply@coaches.upnext.team>",
      to: [email],
      subject: `Reset your password for UpNext`,
      html,
    };

    console.log(`Sending password reset email to ${email}`);

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

    return new Response(JSON.stringify(dataResend), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...getCorsHeaders(request),
      },
    });
  } catch (error) {
    console.error("Error sending password reset email:", error);

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
