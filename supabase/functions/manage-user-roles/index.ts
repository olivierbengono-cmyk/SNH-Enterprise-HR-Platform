import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const VALID_ROLES = [
  "employee",
  "manager",
  "drh",
  "director",
  "admin",
  "payroll_manager",
  "recruitment_manager",
  "career_manager",
  "qvct_manager",
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    const user = userData?.user;

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile } = await supabaseClient
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!callerProfile || !["drh", "admin"].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: "Forbidden: Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const method = req.method;

    if (method === "GET") {
      const { data: profiles, error } = await supabaseClient
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const lastSignInMap: Record<string, string | null> = {};
      try {
        let page = 1;
        const perPage = 1000;
        for (let i = 0; i < 10; i++) {
          const { data: authList, error: authErr } = await supabaseClient.auth.admin.listUsers({ page, perPage });
          if (authErr) break;
          const users = authList?.users || [];
          for (const u of users) {
            lastSignInMap[u.id] = (u as any).last_sign_in_at ?? null;
          }
          if (users.length < perPage) break;
          page += 1;
        }
      } catch (err) {
        console.warn("Could not enrich last_sign_in_at:", err);
      }

      const enriched = (profiles || []).map((p: any) => ({
        ...p,
        last_sign_in: lastSignInMap[p.id] ?? null,
      }));

      return new Response(JSON.stringify(enriched), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (method === "PUT") {
      const { userId, role } = await req.json();
      if (!userId || !role) {
        return new Response(JSON.stringify({ error: "Missing userId or role" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!VALID_ROLES.includes(role)) {
        return new Response(JSON.stringify({ error: "Invalid role" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabaseClient
        .from("user_profiles")
        .update({ role, updated_at: new Date().toISOString() })
        .eq("id", userId)
        .select()
        .maybeSingle();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (method === "POST" || method === "DELETE") {
      const body = method === "DELETE" ? null : await req.json().catch(() => null);
      const action = body?.action || (method === "DELETE" ? "delete" : null);
      const userId = body?.userId || new URL(req.url).searchParams.get("userId");

      if (action === "delete" && userId) {
        await supabaseClient.from("employees").update({ user_id: null }).eq("user_id", userId);
        await supabaseClient.from("user_profiles").delete().eq("id", userId);
        try {
          await supabaseClient.auth.admin.deleteUser(userId);
        } catch (err) {
          console.warn("Auth user deletion error:", err);
        }
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
