import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ReportRequest {
  reportType: string;
  parameters?: {
    startDate?: string;
    endDate?: string;
    employeeId?: string;
    departmentId?: string;
    month?: string;
    year?: string;
  };
  userId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { reportType, parameters, userId }: ReportRequest = await req.json();

    if (!reportType || !userId) {
      return new Response(
        JSON.stringify({ error: "Report type and userId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const htmlContent = await generateReportHTML(supabase, reportType, parameters, userId);

    return new Response(
      JSON.stringify({ success: true, html: htmlContent, reportType, generatedAt: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Report Generation Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Erreur lors de la génération du rapport",
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function generateReportHTML(supabase: any, reportType: string, parameters: any, userId: string): Promise<string> {
  const currentDate = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  switch (reportType) {
    case "leaves_monthly":      return await generateLeavesReport(supabase, parameters, currentDate);
    case "attendance_report":   return await generateAttendanceReport(supabase, parameters, currentDate);
    case "payroll_report":      return await generatePayrollReport(supabase, parameters, currentDate);
    case "training_report":     return await generateTrainingReport(supabase, currentDate);
    case "employees_summary":   return await generateEmployeesSummary(supabase, currentDate);
    case "recruitment_report":  return await generateRecruitmentReport(supabase, currentDate);
    case "performance_report":  return await generatePerformanceReport(supabase, currentDate);
    case "qvct_report":         return await generateQvctReport(supabase, currentDate);
    case "analytics_overview":  return await generateAnalyticsOverview(supabase, currentDate);
    default:                    return generateDefaultReport(currentDate);
  }
}

function wrapHTML(title: string, currentDate: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 40px; background-color: #f9fafb;">
  <div style="max-width: 1200px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #0f172a; margin: 0 0 8px 0;">${title}</h1>
      <p style="color: #64748b; margin: 0;">Genere le ${currentDate}</p>
    </div>
    ${body}
    <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #64748b; font-size: 12px; text-align:center;">
      <p>Societe Nationale des Hydrocarbures (SNH) - Direction des Ressources Humaines</p>
    </div>
  </div>
</body>
</html>`;
}

function kpiCard(label: string, value: string | number, color: string): string {
  return `<div style="flex:1; min-width:180px; padding:20px; background:${color}; border-radius:10px; color:white;">
    <p style="margin:0; font-size:12px; opacity:0.85;">${label}</p>
    <p style="margin:6px 0 0; font-size:28px; font-weight:700;">${value}</p>
  </div>`;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    approved: "#10b981", active: "#10b981", open: "#10b981", completed: "#10b981", resolved: "#10b981",
    pending: "#f59e0b", reviewing: "#f59e0b", planned: "#3b82f6", interview: "#f97316",
    rejected: "#ef4444", closed: "#6b7280", cancelled: "#6b7280", terminated: "#6b7280",
    hired: "#059669", integrated: "#047857",
  };
  return colors[status?.toLowerCase()] || "#6b7280";
}

async function generateEmployeesSummary(supabase: any, currentDate: string): Promise<string> {
  const { data: employees } = await supabase
    .from("employees")
    .select("id, employee_number, first_name, last_name, employment_status, department:departments(name), position:positions(title)")
    .order("employee_number");

  const total = employees?.length || 0;
  const active = employees?.filter((e: any) => e.employment_status === "active").length || 0;
  const deptMap: Record<string, number> = {};
  employees?.forEach((e: any) => {
    const d = e.department?.name || "Non assigne";
    deptMap[d] = (deptMap[d] || 0) + 1;
  });

  const rows = employees?.map((e: any) => `
    <tr>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;">${e.employee_number || "-"}</td>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;">${e.first_name} ${e.last_name}</td>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;">${e.position?.title || "-"}</td>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;">${e.department?.name || "-"}</td>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;">
        <span style="padding:4px 8px; border-radius:4px; font-size:12px; background:${getStatusColor(e.employment_status)}; color:white;">${e.employment_status || "-"}</span>
      </td>
    </tr>`).join("") || "<tr><td colspan='5' style='text-align:center; padding:20px;'>Aucune donnee</td></tr>";

  const deptRows = Object.entries(deptMap)
    .map(([d, c]) => `<tr><td style="padding:8px; border-bottom:1px solid #e5e7eb;">${d}</td><td style="padding:8px; text-align:right; border-bottom:1px solid #e5e7eb;"><b>${c}</b></td></tr>`)
    .join("");

  const body = `
    <div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:24px;">
      ${kpiCard("Effectif total", total, "linear-gradient(135deg,#0ea5e9,#14b8a6)")}
      ${kpiCard("Employes actifs", active, "linear-gradient(135deg,#10b981,#059669)")}
      ${kpiCard("Departements", Object.keys(deptMap).length, "linear-gradient(135deg,#f59e0b,#d97706)")}
    </div>
    <h2 style="color:#0f172a; margin-top:24px;">Repartition par departement</h2>
    <table style="width:100%; max-width:500px; border-collapse:collapse; margin-bottom:24px;"><tbody>${deptRows}</tbody></table>
    <h2 style="color:#0f172a;">Liste du personnel</h2>
    <table style="width:100%; border-collapse:collapse;">
      <thead><tr style="background:#f3f4f6;">
        <th style="padding:10px; text-align:left;">Matricule</th>
        <th style="padding:10px; text-align:left;">Nom</th>
        <th style="padding:10px; text-align:left;">Poste</th>
        <th style="padding:10px; text-align:left;">Departement</th>
        <th style="padding:10px; text-align:left;">Statut</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  return wrapHTML("Synthese des effectifs", currentDate, body);
}

async function generateRecruitmentReport(supabase: any, currentDate: string): Promise<string> {
  const [jobsRes, candidatesRes, applicationsRes] = await Promise.all([
    supabase.from("job_openings").select("id, title, status, department:departments(name)").order("created_at", { ascending: false }),
    supabase.from("candidates").select("id, first_name, last_name, status, created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("candidate_applications").select("id, status, created_at, job_opening:job_openings(title), candidate:candidates(first_name, last_name)").order("created_at", { ascending: false }).limit(50),
  ]);
  const jobs = jobsRes.data || [];
  const candidates = candidatesRes.data || [];
  const applications = applicationsRes.data || [];
  const openJobs = jobs.filter((j: any) => j.status === "open").length;
  const hired = applications.filter((a: any) => a.status === "integrated" || a.status === "hired").length;

  const jobRows = jobs.map((j: any) => `
    <tr>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;">${j.title}</td>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;">${j.department?.name || "-"}</td>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;">
        <span style="padding:4px 8px; border-radius:4px; font-size:12px; background:${getStatusColor(j.status)}; color:white;">${j.status}</span>
      </td>
    </tr>`).join("") || "<tr><td colspan='3' style='text-align:center; padding:20px;'>Aucun poste</td></tr>";

  const appRows = applications.slice(0, 30).map((a: any) => `
    <tr>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;">${a.candidate?.first_name || ""} ${a.candidate?.last_name || ""}</td>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;">${a.job_opening?.title || "-"}</td>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;">${a.created_at ? new Date(a.created_at).toLocaleDateString("fr-FR") : "-"}</td>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;">
        <span style="padding:4px 8px; border-radius:4px; font-size:12px; background:${getStatusColor(a.status)}; color:white;">${a.status}</span>
      </td>
    </tr>`).join("") || "<tr><td colspan='4' style='text-align:center; padding:20px;'>Aucune candidature</td></tr>";

  const body = `
    <div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:24px;">
      ${kpiCard("Postes ouverts", openJobs, "linear-gradient(135deg,#10b981,#059669)")}
      ${kpiCard("Candidats", candidates.length, "linear-gradient(135deg,#0ea5e9,#0284c7)")}
      ${kpiCard("Candidatures", applications.length, "linear-gradient(135deg,#f97316,#ea580c)")}
      ${kpiCard("Integres", hired, "linear-gradient(135deg,#059669,#047857)")}
    </div>
    <h2 style="color:#0f172a;">Offres d'emploi</h2>
    <table style="width:100%; border-collapse:collapse; margin-bottom:24px;">
      <thead><tr style="background:#f3f4f6;"><th style="padding:10px; text-align:left;">Poste</th><th style="padding:10px; text-align:left;">Departement</th><th style="padding:10px; text-align:left;">Statut</th></tr></thead>
      <tbody>${jobRows}</tbody>
    </table>
    <h2 style="color:#0f172a;">Candidatures recentes</h2>
    <table style="width:100%; border-collapse:collapse;">
      <thead><tr style="background:#f3f4f6;"><th style="padding:10px; text-align:left;">Candidat</th><th style="padding:10px; text-align:left;">Poste</th><th style="padding:10px; text-align:left;">Date</th><th style="padding:10px; text-align:left;">Statut pipeline</th></tr></thead>
      <tbody>${appRows}</tbody>
    </table>`;
  return wrapHTML("Rapport de Recrutement", currentDate, body);
}

async function generatePerformanceReport(supabase: any, currentDate: string): Promise<string> {
  const [reviewsRes, objectivesRes] = await Promise.all([
    supabase.from("performance_reviews").select("id, status, overall_rating, review_period_start, employee:employees(first_name, last_name)").order("created_at", { ascending: false }).limit(50),
    supabase.from("objectives").select("id, status, progress, title, employee:employees(first_name, last_name)").order("created_at", { ascending: false }).limit(50),
  ]);
  const reviews = reviewsRes.data || [];
  const objectives = objectivesRes.data || [];
  const completed = reviews.filter((r: any) => r.status === "completed").length;
  const avgRating = reviews.filter((r: any) => r.overall_rating).length
    ? (reviews.filter((r: any) => r.overall_rating).reduce((a: number, r: any) => a + (r.overall_rating || 0), 0) / reviews.filter((r: any) => r.overall_rating).length).toFixed(1)
    : "N/A";

  const reviewRows = reviews.map((r: any) => `
    <tr>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;">${r.employee?.first_name || ""} ${r.employee?.last_name || ""}</td>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;">${r.review_period_start ? new Date(r.review_period_start).toLocaleDateString("fr-FR") : "-"}</td>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;">${r.overall_rating != null ? r.overall_rating + "/5" : "En cours"}</td>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;"><span style="padding:4px 8px; border-radius:4px; font-size:12px; background:${getStatusColor(r.status)}; color:white;">${r.status}</span></td>
    </tr>`).join("") || "<tr><td colspan='4' style='text-align:center; padding:20px;'>Aucune evaluation</td></tr>";

  const objRows = objectives.map((o: any) => `
    <tr>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;">${o.employee?.first_name || ""} ${o.employee?.last_name || ""}</td>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;">${o.title || "-"}</td>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;">${o.progress ?? 0}%</td>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;"><span style="padding:4px 8px; border-radius:4px; font-size:12px; background:${getStatusColor(o.status)}; color:white;">${o.status || "-"}</span></td>
    </tr>`).join("") || "<tr><td colspan='4' style='text-align:center; padding:20px;'>Aucun objectif</td></tr>";

  const body = `
    <div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:24px;">
      ${kpiCard("Evaluations", reviews.length, "linear-gradient(135deg,#0ea5e9,#0284c7)")}
      ${kpiCard("Completees", completed, "linear-gradient(135deg,#10b981,#059669)")}
      ${kpiCard("Note moyenne", avgRating, "linear-gradient(135deg,#f59e0b,#d97706)")}
      ${kpiCard("Objectifs", objectives.length, "linear-gradient(135deg,#14b8a6,#0d9488)")}
    </div>
    <h2 style="color:#0f172a;">Evaluations recentes</h2>
    <table style="width:100%; border-collapse:collapse; margin-bottom:24px;">
      <thead><tr style="background:#f3f4f6;"><th style="padding:10px; text-align:left;">Employe</th><th style="padding:10px; text-align:left;">Periode</th><th style="padding:10px; text-align:left;">Note</th><th style="padding:10px; text-align:left;">Statut</th></tr></thead>
      <tbody>${reviewRows}</tbody>
    </table>
    <h2 style="color:#0f172a;">Objectifs</h2>
    <table style="width:100%; border-collapse:collapse;">
      <thead><tr style="background:#f3f4f6;"><th style="padding:10px; text-align:left;">Employe</th><th style="padding:10px; text-align:left;">Objectif</th><th style="padding:10px; text-align:left;">Avancement</th><th style="padding:10px; text-align:left;">Statut</th></tr></thead>
      <tbody>${objRows}</tbody>
    </table>`;
  return wrapHTML("Rapport de Performance", currentDate, body);
}

async function generateQvctReport(supabase: any, currentDate: string): Promise<string> {
  const [surveysRes, eventsRes, incidentsRes] = await Promise.all([
    supabase.from("qvct_surveys").select("id, title, status, created_at").order("created_at", { ascending: false }).limit(30),
    supabase.from("qvct_events").select("id, title, event_type, event_date").order("event_date", { ascending: false }).limit(30),
    supabase.from("qvct_health_incidents").select("id, title, severity, status, incident_date").order("incident_date", { ascending: false }).limit(30),
  ]);
  const surveys = surveysRes.data || [];
  const events = eventsRes.data || [];
  const incidents = incidentsRes.data || [];
  const openInc = incidents.filter((i: any) => i.status === "open").length;
  const resolvedInc = incidents.filter((i: any) => i.status === "resolved").length;

  const incRows = incidents.map((i: any) => `
    <tr>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;">${i.title}</td>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;">${i.severity}</td>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;"><span style="padding:4px 8px; border-radius:4px; font-size:12px; background:${getStatusColor(i.status)}; color:white;">${i.status}</span></td>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;">${i.incident_date ? new Date(i.incident_date).toLocaleDateString("fr-FR") : "-"}</td>
    </tr>`).join("") || "<tr><td colspan='4' style='text-align:center; padding:20px;'>Aucun incident</td></tr>";

  const evRows = events.map((e: any) => `
    <tr>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;">${e.title}</td>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;">${e.event_type}</td>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;">${e.event_date ? new Date(e.event_date).toLocaleDateString("fr-FR") : "-"}</td>
    </tr>`).join("") || "<tr><td colspan='3' style='text-align:center; padding:20px;'>Aucun evenement</td></tr>";

  const survRows = surveys.map((s: any) => `
    <tr>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;">${s.title}</td>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;"><span style="padding:4px 8px; border-radius:4px; font-size:12px; background:${getStatusColor(s.status)}; color:white;">${s.status}</span></td>
    </tr>`).join("") || "<tr><td colspan='2' style='text-align:center; padding:20px;'>Aucune enquete</td></tr>";

  const body = `
    <div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:24px;">
      ${kpiCard("Enquetes", surveys.length, "linear-gradient(135deg,#14b8a6,#0d9488)")}
      ${kpiCard("Evenements", events.length, "linear-gradient(135deg,#0ea5e9,#0284c7)")}
      ${kpiCard("Incidents ouverts", openInc, "linear-gradient(135deg,#ef4444,#dc2626)")}
      ${kpiCard("Incidents resolus", resolvedInc, "linear-gradient(135deg,#10b981,#059669)")}
    </div>
    <h2 style="color:#0f172a;">Incidents</h2>
    <table style="width:100%; border-collapse:collapse; margin-bottom:24px;">
      <thead><tr style="background:#f3f4f6;"><th style="padding:10px; text-align:left;">Titre</th><th style="padding:10px; text-align:left;">Severite</th><th style="padding:10px; text-align:left;">Statut</th><th style="padding:10px; text-align:left;">Date</th></tr></thead>
      <tbody>${incRows}</tbody>
    </table>
    <h2 style="color:#0f172a;">Evenements</h2>
    <table style="width:100%; border-collapse:collapse; margin-bottom:24px;">
      <thead><tr style="background:#f3f4f6;"><th style="padding:10px; text-align:left;">Titre</th><th style="padding:10px; text-align:left;">Type</th><th style="padding:10px; text-align:left;">Date</th></tr></thead>
      <tbody>${evRows}</tbody>
    </table>
    <h2 style="color:#0f172a;">Enquetes</h2>
    <table style="width:100%; border-collapse:collapse;">
      <thead><tr style="background:#f3f4f6;"><th style="padding:10px; text-align:left;">Titre</th><th style="padding:10px; text-align:left;">Statut</th></tr></thead>
      <tbody>${survRows}</tbody>
    </table>`;
  return wrapHTML("Rapport QVCT", currentDate, body);
}

async function generateAnalyticsOverview(supabase: any, currentDate: string): Promise<string> {
  const [empRes, leavesRes, payRes, trainRes, jobsRes, candidatesRes] = await Promise.all([
    supabase.from("employees").select("id", { count: "exact", head: true }).eq("employment_status", "active"),
    supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("payslips").select("net_salary").limit(500),
    supabase.from("training_programs").select("id", { count: "exact", head: true }),
    supabase.from("job_openings").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("candidates").select("id", { count: "exact", head: true }),
  ]);
  const pay = payRes.data || [];
  const totalPay = pay.reduce((a: number, p: any) => a + (p.net_salary || 0), 0);

  const body = `
    <div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:24px;">
      ${kpiCard("Effectif actif", empRes.count || 0, "linear-gradient(135deg,#0ea5e9,#0284c7)")}
      ${kpiCard("Conges en attente", leavesRes.count || 0, "linear-gradient(135deg,#f59e0b,#d97706)")}
      ${kpiCard("Postes ouverts", jobsRes.count || 0, "linear-gradient(135deg,#10b981,#059669)")}
      ${kpiCard("Programmes formation", trainRes.count || 0, "linear-gradient(135deg,#14b8a6,#0d9488)")}
      ${kpiCard("Candidats CVtheque", candidatesRes.count || 0, "linear-gradient(135deg,#6366f1,#4f46e5)")}
      ${kpiCard("Masse salariale (net)", totalPay.toLocaleString("fr-FR") + " FCFA", "linear-gradient(135deg,#0ea5e9,#14b8a6)")}
    </div>
    <p style="color:#64748b;">Ce tableau de bord consolide les principaux indicateurs RH de la periode courante.</p>`;
  return wrapHTML("Vue d'ensemble RH", currentDate, body);
}

async function generateLeavesReport(supabase: any, _parameters: any, currentDate: string): Promise<string> {
  const { data: leaves } = await supabase
    .from("leave_requests")
    .select(`*, employees(first_name, last_name, employee_number), leave_type:leave_types(name)`)
    .order("start_date", { ascending: false })
    .limit(100);

  const total = leaves?.length || 0;
  const approved = leaves?.filter((l: any) => l.status === "approved").length || 0;
  const pending = leaves?.filter((l: any) => l.status === "pending").length || 0;

  const leaveRows = leaves?.map((leave: any) => `
    <tr>
      <td style="padding:12px; border-bottom:1px solid #e5e7eb;">${leave.employees?.employee_number || "N/A"}</td>
      <td style="padding:12px; border-bottom:1px solid #e5e7eb;">${leave.employees?.first_name || ""} ${leave.employees?.last_name || ""}</td>
      <td style="padding:12px; border-bottom:1px solid #e5e7eb;">${leave.leave_type?.name || leave.leave_type_id || "-"}</td>
      <td style="padding:12px; border-bottom:1px solid #e5e7eb;">${leave.start_date ? new Date(leave.start_date).toLocaleDateString("fr-FR") : "-"}</td>
      <td style="padding:12px; border-bottom:1px solid #e5e7eb;">${leave.end_date ? new Date(leave.end_date).toLocaleDateString("fr-FR") : "-"}</td>
      <td style="padding:12px; border-bottom:1px solid #e5e7eb;">${leave.days_count || "-"}</td>
      <td style="padding:12px; border-bottom:1px solid #e5e7eb;">
        <span style="padding:4px 8px; border-radius:4px; font-size:12px; background:${getStatusColor(leave.status)}; color:white;">${leave.status}</span>
      </td>
    </tr>`).join("") || "<tr><td colspan='7' style='text-align:center; padding:20px;'>Aucune donnee disponible</td></tr>";

  const body = `
    <div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:24px;">
      ${kpiCard("Total demandes", total, "linear-gradient(135deg,#0ea5e9,#0284c7)")}
      ${kpiCard("Approuvees", approved, "linear-gradient(135deg,#10b981,#059669)")}
      ${kpiCard("En attente", pending, "linear-gradient(135deg,#f59e0b,#d97706)")}
    </div>
    <table style="width:100%; border-collapse:collapse; margin-top:20px;">
      <thead><tr style="background:#f3f4f6;">
        <th style="padding:12px; text-align:left; font-weight:600; color:#374151;">Matricule</th>
        <th style="padding:12px; text-align:left; font-weight:600; color:#374151;">Employe</th>
        <th style="padding:12px; text-align:left; font-weight:600; color:#374151;">Type</th>
        <th style="padding:12px; text-align:left; font-weight:600; color:#374151;">Debut</th>
        <th style="padding:12px; text-align:left; font-weight:600; color:#374151;">Fin</th>
        <th style="padding:12px; text-align:left; font-weight:600; color:#374151;">Jours</th>
        <th style="padding:12px; text-align:left; font-weight:600; color:#374151;">Statut</th>
      </tr></thead>
      <tbody>${leaveRows}</tbody>
    </table>`;
  return wrapHTML("Rapport des Conges", currentDate, body);
}

async function generateAttendanceReport(supabase: any, _parameters: any, currentDate: string): Promise<string> {
  const { data: employees } = await supabase
    .from("employees")
    .select("id, employee_number, first_name, last_name, department:departments(name)")
    .eq("employment_status", "active")
    .order("employee_number");

  const employeeRows = employees?.map((emp: any) => `
    <tr>
      <td style="padding:12px; border-bottom:1px solid #e5e7eb;">${emp.employee_number || "-"}</td>
      <td style="padding:12px; border-bottom:1px solid #e5e7eb;">${emp.first_name} ${emp.last_name}</td>
      <td style="padding:12px; border-bottom:1px solid #e5e7eb;">${emp.department?.name || "N/A"}</td>
      <td style="padding:12px; border-bottom:1px solid #e5e7eb; text-align:center;"><span style="color:#10b981; font-weight:600;">✓</span></td>
    </tr>`).join("") || "<tr><td colspan='4' style='text-align:center; padding:20px;'>Aucune donnee disponible</td></tr>";

  const body = `
    <table style="width:100%; border-collapse:collapse; margin-top:20px;">
      <thead><tr style="background:#f3f4f6;">
        <th style="padding:12px; text-align:left; font-weight:600; color:#374151;">Matricule</th>
        <th style="padding:12px; text-align:left; font-weight:600; color:#374151;">Employe</th>
        <th style="padding:12px; text-align:left; font-weight:600; color:#374151;">Departement</th>
        <th style="padding:12px; text-align:center; font-weight:600; color:#374151;">Present</th>
      </tr></thead>
      <tbody>${employeeRows}</tbody>
    </table>`;
  return wrapHTML("Rapport de Presence", currentDate, body);
}

async function generatePayrollReport(supabase: any, _parameters: any, currentDate: string): Promise<string> {
  const { data: payslips } = await supabase
    .from("payslips")
    .select(`*, employees(employee_number, first_name, last_name)`)
    .order("period_start", { ascending: false })
    .limit(100);

  const totalNet = payslips?.reduce((a: number, p: any) => a + (p.net_salary || 0), 0) || 0;
  const totalGross = payslips?.reduce((a: number, p: any) => a + (p.gross_salary || 0), 0) || 0;

  const payslipRows = payslips?.map((slip: any) => `
    <tr>
      <td style="padding:12px; border-bottom:1px solid #e5e7eb;">${slip.employees?.employee_number || "N/A"}</td>
      <td style="padding:12px; border-bottom:1px solid #e5e7eb;">${slip.employees?.first_name || ""} ${slip.employees?.last_name || ""}</td>
      <td style="padding:12px; border-bottom:1px solid #e5e7eb;">${slip.period_start ? new Date(slip.period_start).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "-"}</td>
      <td style="padding:12px; border-bottom:1px solid #e5e7eb; text-align:right;">${slip.gross_salary?.toLocaleString("fr-FR") || "0"} FCFA</td>
      <td style="padding:12px; border-bottom:1px solid #e5e7eb; text-align:right;">${slip.net_salary?.toLocaleString("fr-FR") || "0"} FCFA</td>
    </tr>`).join("") || "<tr><td colspan='5' style='text-align:center; padding:20px;'>Aucune donnee disponible</td></tr>";

  const body = `
    <div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:24px;">
      ${kpiCard("Total bulletins", payslips?.length || 0, "linear-gradient(135deg,#0ea5e9,#0284c7)")}
      ${kpiCard("Masse brute", totalGross.toLocaleString("fr-FR") + " FCFA", "linear-gradient(135deg,#f59e0b,#d97706)")}
      ${kpiCard("Masse nette", totalNet.toLocaleString("fr-FR") + " FCFA", "linear-gradient(135deg,#10b981,#059669)")}
    </div>
    <table style="width:100%; border-collapse:collapse; margin-top:20px;">
      <thead><tr style="background:#f3f4f6;">
        <th style="padding:12px; text-align:left; font-weight:600; color:#374151;">Matricule</th>
        <th style="padding:12px; text-align:left; font-weight:600; color:#374151;">Employe</th>
        <th style="padding:12px; text-align:left; font-weight:600; color:#374151;">Periode</th>
        <th style="padding:12px; text-align:right; font-weight:600; color:#374151;">Brut</th>
        <th style="padding:12px; text-align:right; font-weight:600; color:#374151;">Net</th>
      </tr></thead>
      <tbody>${payslipRows}</tbody>
    </table>`;
  return wrapHTML("Rapport des Paies", currentDate, body);
}

async function generateTrainingReport(supabase: any, currentDate: string): Promise<string> {
  const { data: programs } = await supabase
    .from("training_programs")
    .select("*, training_enrollments(id)")
    .order("start_date", { ascending: false })
    .limit(50);

  const totalEnrolled = programs?.reduce((a: number, p: any) => a + (p.training_enrollments?.length || 0), 0) || 0;

  const programRows = programs?.map((prog: any) => `
    <tr>
      <td style="padding:12px; border-bottom:1px solid #e5e7eb;">${prog.title || "-"}</td>
      <td style="padding:12px; border-bottom:1px solid #e5e7eb;">${prog.category || "N/A"}</td>
      <td style="padding:12px; border-bottom:1px solid #e5e7eb;">${prog.start_date ? new Date(prog.start_date).toLocaleDateString("fr-FR") : "-"}</td>
      <td style="padding:12px; border-bottom:1px solid #e5e7eb;">${prog.duration_days || "-"} j</td>
      <td style="padding:12px; border-bottom:1px solid #e5e7eb;">${prog.training_enrollments?.length || 0} / ${prog.max_participants || "∞"}</td>
      <td style="padding:12px; border-bottom:1px solid #e5e7eb;">
        <span style="padding:4px 8px; border-radius:4px; font-size:12px; background:${getStatusColor(prog.status)}; color:white;">${prog.status || "-"}</span>
      </td>
    </tr>`).join("") || "<tr><td colspan='6' style='text-align:center; padding:20px;'>Aucune donnee disponible</td></tr>";

  const body = `
    <div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:24px;">
      ${kpiCard("Programmes", programs?.length || 0, "linear-gradient(135deg,#0ea5e9,#0284c7)")}
      ${kpiCard("Inscrits total", totalEnrolled, "linear-gradient(135deg,#10b981,#059669)")}
    </div>
    <table style="width:100%; border-collapse:collapse; margin-top:20px;">
      <thead><tr style="background:#f3f4f6;">
        <th style="padding:12px; text-align:left; font-weight:600; color:#374151;">Formation</th>
        <th style="padding:12px; text-align:left; font-weight:600; color:#374151;">Categorie</th>
        <th style="padding:12px; text-align:left; font-weight:600; color:#374151;">Date debut</th>
        <th style="padding:12px; text-align:left; font-weight:600; color:#374151;">Duree</th>
        <th style="padding:12px; text-align:left; font-weight:600; color:#374151;">Participants</th>
        <th style="padding:12px; text-align:left; font-weight:600; color:#374151;">Statut</th>
      </tr></thead>
      <tbody>${programRows}</tbody>
    </table>`;
  return wrapHTML("Rapport des Formations", currentDate, body);
}

function generateDefaultReport(currentDate: string): string {
  return wrapHTML("Rapport personnalise", currentDate, `<p style="color:#64748b;">Le rapport a ete genere avec succes le ${currentDate}.</p>`);
}
