import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function extractIP(req: Request): string {
  // Cloudflare (Bolt / production)
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf;
  // Reverse proxy standard
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  // Direct
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const ip_address = extractIP(req);
  const user_agent = req.headers.get("user-agent") ?? "unknown";

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { type, ...payload } = body as { type: "security" | "audit"; [k: string]: unknown };

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const table = type === "security" ? "security_events" : "audit_logs";
  const { error } = await supabase.from(table).insert({
    ...payload,
    ip_address,
    user_agent,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, ip_address }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
