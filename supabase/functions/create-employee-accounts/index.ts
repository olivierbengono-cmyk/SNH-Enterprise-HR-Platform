import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ADMIN_ROLES = ["admin", "drh", "director"];

function generateTempPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "@#$!";
  const all = upper + lower + digits + special;
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  // Ensure at least one of each required character class
  let pwd =
    upper[arr[0] % upper.length] +
    lower[arr[1] % lower.length] +
    digits[arr[2] % digits.length] +
    special[arr[3] % special.length];
  for (let i = 4; i < 12; i++) {
    pwd += all[arr[i] % all.length];
  }
  // Shuffle
  const shuffled = new Uint8Array(12);
  crypto.getRandomValues(shuffled);
  return pwd.split("").sort((_, __) => shuffled[Math.floor(Math.random() * 12)] - 128).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ── JWT verification: only admins/DRH may create accounts ──────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.slice(7);
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile || !ADMIN_ROLES.includes(profile.role)) {
      return new Response(JSON.stringify({ error: "Accès refusé : rôle insuffisant" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // ────────────────────────────────────────────────────────────────────────

    const { data: employees, error: employeesError } = await supabaseAdmin
      .from("employees")
      .select("id, employee_number, email, first_name, last_name, user_id")
      .eq("employment_status", "active");

    if (employeesError) throw employeesError;

    const results = {
      success: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[],
    };

    for (const employee of employees) {
      if (employee.user_id) {
        results.skipped++;
        results.details.push({
          employee_number: employee.employee_number,
          status: "skipped",
          reason: "Account already exists",
        });
        continue;
      }

      if (!employee.email) {
        results.errors++;
        results.details.push({
          employee_number: employee.employee_number,
          status: "error",
          reason: "No email address",
        });
        continue;
      }

      try {
        const tempPassword = generateTempPassword();

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: employee.email,
          password: tempPassword,
          email_confirm: true,
        });

        if (authError) throw authError;

        const { error: profileError } = await supabaseAdmin
          .from("user_profiles")
          .insert({
            id: authData.user.id,
            email: employee.email,
            first_name: employee.first_name,
            last_name: employee.last_name,
            role: "employee",
            employee_id: employee.id,
            password_changed: false,
          });

        if (profileError) throw profileError;

        const { error: employeeUpdateError } = await supabaseAdmin
          .from("employees")
          .update({ user_id: authData.user.id })
          .eq("id", employee.id);

        if (employeeUpdateError) throw employeeUpdateError;

        results.success++;
        results.details.push({
          employee_number: employee.employee_number,
          email: employee.email,
          temp_password: tempPassword,
          status: "success",
        });
      } catch (err: any) {
        results.errors++;
        results.details.push({
          employee_number: employee.employee_number,
          status: "error",
          reason: err.message,
        });
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("create-employee-accounts error:", error);
    return new Response(
      JSON.stringify({ error: "Une erreur interne s'est produite" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
