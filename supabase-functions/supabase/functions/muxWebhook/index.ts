// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const muxWebHookSigningSecret = Deno.env.get("MUX_WEBHOOK_SIGNING_SECRET")!;

// Tolerance of 5 minutes (300 seconds) as per Mux's specification
const TIMESTAMP_TOLERANCE_SECONDS = 300;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

serve(async (req: Request) => {
  console.log("Received webhook request");

  if (req.method !== "POST") {
    console.log("Invalid method:", req.method);
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
    });
  }

  const body = await req.text();
  const signature = req.headers.get("Mux-Signature");

  console.log("Headers:", Object.fromEntries(req.headers.entries()));
  console.log("Mux-Signature:", signature);

  if (!signature) {
    console.log("Missing Mux-Signature header");
    return new Response(
      JSON.stringify({ error: "Missing Mux-Signature header" }),
      { status: 401 }
    );
  }

  try {
    // Step 1: Extract the timestamp and signatures
    const [timestamp, signatures] = signature.split(",");
    const ts = timestamp.split("=")[1];
    const sig = signatures.split("=")[1];

    console.log("Timestamp:", ts);
    console.log("Signature:", sig);

    // Verify timestamp tolerance (5 minutes)
    const timestampSeconds = parseInt(ts, 10);
    const currentSeconds = Math.floor(Date.now() / 1000);
    const diffSeconds = Math.abs(currentSeconds - timestampSeconds);

    if (diffSeconds > TIMESTAMP_TOLERANCE_SECONDS) {
      console.log("Timestamp out of tolerance range:", {
        webhookTimestamp: timestampSeconds,
        currentTimestamp: currentSeconds,
        diffSeconds: diffSeconds,
        toleranceSeconds: TIMESTAMP_TOLERANCE_SECONDS,
      });
      return new Response(
        JSON.stringify({ error: "Timestamp out of tolerance range" }),
        { status: 401 }
      );
    }

    // Step 2: Prepare the signed_payload string
    const message = `${ts}.${body}`;
    console.log("Signed payload:", message);

    // Step 3: Determine the expected signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(muxWebHookSigningSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const messageBuffer = encoder.encode(message);
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      messageBuffer
    );

    // Convert to hex
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    console.log("Computed signature:", computedSignature);
    console.log("Expected signature:", sig);

    // Step 4: Compare signatures
    if (computedSignature !== sig) {
      console.log("Signature verification failed");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
      });
    }

    console.log("Signature verified successfully");

    // Process the webhook payload
    const jsonBody = JSON.parse(body);
    console.log("Webhook body:", jsonBody);

    if (jsonBody.type === "video.asset.ready") {
      const { upload_id, playback_ids } = jsonBody.data;
      console.log("Webhook received for video.asset.ready:", jsonBody);
      console.log("upload_id:", upload_id);
      console.log("playback_ids:", playback_ids);

      const { data, error } = await supabase
        .from("Highlight")
        .update({
          mux_playback_id: playback_ids[0].id,
          status: "READY",
        })
        .eq("mux_id", upload_id)
        .select();

      if (error) {
        console.error("Error updating video:", error);
        return new Response(
          JSON.stringify({ error: "Internal Server Error", details: error }),
          { status: 500 }
        );
      }

      console.log("Successfully updated video asset:", data);
      return new Response(
        JSON.stringify({
          message: "Success",
          data: data,
        }),
        {
          status: 200,
        }
      );
    }

    console.log(
      "Webhook received but no action taken - unhandled event type:",
      jsonBody.type
    );
    return new Response(
      JSON.stringify({
        message: "Webhook received but no action taken",
        type: jsonBody.type,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({
        error: "Error processing webhook",
        details: error,
      }),
      { status: 400 }
    );
  }
});
