import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data: employees, error: employeesError } = await supabaseAdmin
      .from("employees")
      .select("id, employee_number, email, first_name, last_name, user_id")
      .eq("employment_status", "active");

    if (employeesError) {
      throw employeesError;
    }

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
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: employee.email,
          password: employee.employee_number,
          email_confirm: true,
        });

        if (authError) {
          throw authError;
        }

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

        if (profileError) {
          throw profileError;
        }

        const { error: employeeUpdateError } = await supabaseAdmin
          .from("employees")
          .update({ user_id: authData.user.id })
          .eq("id", employee.id);

        if (employeeUpdateError) {
          throw employeeUpdateError;
        }

        results.success++;
        results.details.push({
          employee_number: employee.employee_number,
          email: employee.email,
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
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
