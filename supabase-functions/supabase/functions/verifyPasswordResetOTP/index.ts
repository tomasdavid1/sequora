import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Helper function to check if OTP is expired
const isOTPExpired = (expiresAt: string): boolean => {
  return new Date() > new Date(expiresAt);
};

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
    const { email, otpCode } = await request.json();

    console.log(`Verifying OTP for ${email}`);

    // Both email and OTP are required
    if (!email || !otpCode) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: email and otpCode",
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

    // Get the user and check stored OTP
    const { data: usersData, error: getUserError } =
      await supabase.auth.admin.listUsers();

    if (getUserError) {
      console.error("Error fetching users:", getUserError);
      return new Response(
        JSON.stringify({
          error: "Error fetching user data",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(request),
          },
        }
      );
    }

    const user = usersData.users.find((u) => u.email === email);
    if (!user) {
      console.error("User not found:", email);
      return new Response(
        JSON.stringify({
          error: "User not found",
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

    const userMetadata = user.user_metadata;
    const storedOTP = userMetadata?.password_reset_otp;
    const otpExpiresAt = userMetadata?.otp_expires_at;

    // Check if OTP exists and matches
    if (!storedOTP || storedOTP !== otpCode) {
      console.error(
        "OTP verification failed: codes don't match or OTP not found"
      );
      return new Response(
        JSON.stringify({
          error: "Invalid or expired OTP code",
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

    // Check if OTP is expired
    if (!otpExpiresAt || isOTPExpired(otpExpiresAt)) {
      console.error("OTP verification failed: OTP expired");
      return new Response(
        JSON.stringify({
          error: "Invalid or expired OTP code",
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

    // Clear the used OTP
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...userMetadata,
        password_reset_otp: null,
        otp_expires_at: null,
      },
    });

    console.log(`OTP verified successfully for ${email}`);

    // Generate a recovery link to get the token_hash
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
    });

    if (error || !data.properties?.action_link) {
      throw error || new Error("Could not generate recovery session");
    }

    // Extract the token_hash from the recovery link
    const url = new URL(data.properties.action_link);
    const tokenHash = url.searchParams.get("token");

    console.log("Recovery link:", data.properties.action_link);
    console.log(
      "Extracted token_hash:",
      tokenHash ? `${tokenHash.substring(0, 20)}...` : "NULL"
    );

    if (!tokenHash) {
      throw new Error("Could not extract token_hash from recovery link");
    }

    // Use Supabase's verifyOtp with the token_hash to create a session
    const { data: sessionData, error: verifyError } =
      await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "recovery",
      });

    if (verifyError || !sessionData.session) {
      console.error("Token verification failed:", verifyError);
      throw verifyError || new Error("Could not verify recovery token");
    }

    console.log("Recovery token verified successfully");

    // Return the authenticated session
    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP verified successfully",
        session: {
          access_token: sessionData.session.access_token,
          refresh_token: sessionData.session.refresh_token,
          expires_at: sessionData.session.expires_at,
          user: {
            id: sessionData.user?.id,
            email: sessionData.user?.email,
          },
        },
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
    console.error("Error verifying OTP:", error);

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

serve(handler);
