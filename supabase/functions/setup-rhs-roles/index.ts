import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ACCOUNTS_TO_CREATE = [
  {
    email: "admin@snh.cm",
    password: "Admin@SNH2026",
    first_name: "Administrateur",
    last_name: "Système",
    role: "admin",
    employee_number: "SNH-ADMIN-001",
  },
  {
    email: "director@snh.cm",
    password: "Director@SNH2026",
    first_name: "Paul",
    last_name: "Biya Mbarga",
    role: "director",
    employee_number: "SNH-DIR-001",
  },
  {
    email: "manager@snh.cm",
    password: "Manager@SNH2026",
    first_name: "Claude",
    last_name: "Nkoulou",
    role: "manager",
    employee_number: "SNH-MGR-001",
  },
  {
    email: "paie@snh.cm",
    password: "Paie@SNH2026",
    first_name: "Sylvie",
    last_name: "Ngono Paie",
    role: "payroll_manager",
    employee_number: "SNH-PAY-001",
  },
  {
    email: "recrutement@snh.cm",
    password: "Recrutement@SNH2026",
    first_name: "Bertrand",
    last_name: "Eto Recrutement",
    role: "recruitment_manager",
    employee_number: "SNH-REC-001",
  },
  {
    email: "carrieres@snh.cm",
    password: "Carrieres@SNH2026",
    first_name: "Nadège",
    last_name: "Messi Carrières",
    role: "career_manager",
    employee_number: "SNH-CAR-001",
  },
  {
    email: "qvct@snh.cm",
    password: "Qvct@SNH2026",
    first_name: "Laurence",
    last_name: "Ateba QVCT",
    role: "qvct_manager",
    employee_number: "SNH-QVC-001",
  },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const results: any[] = [];

    for (const account of ACCOUNTS_TO_CREATE) {
      try {
        const { data: existing } = await supabaseAdmin
          .from("user_profiles")
          .select("id, email, role")
          .eq("email", account.email)
          .maybeSingle();

        if (existing) {
          results.push({ email: account.email, status: "skipped", reason: "Already exists", role: existing.role });
          continue;
        }

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true,
        });

        if (authError) throw authError;

        const { error: profileError } = await supabaseAdmin.from("user_profiles").insert({
          id: authData.user.id,
          email: account.email,
          first_name: account.first_name,
          last_name: account.last_name,
          role: account.role,
          employee_id: account.employee_number,
          password_changed: true,
        });

        if (profileError) throw profileError;

        results.push({ email: account.email, status: "created", role: account.role });
      } catch (err: any) {
        results.push({ email: account.email, status: "error", reason: err.message });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
