import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Send email via Gmail SMTP using nodemailer (npm: import in Deno)
async function sendViaGmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: boolean; error?: string }> {
  const user = Deno.env.get("GMAIL_FROM") || "olivier.bengono@gmail.com";
  const pass = Deno.env.get("GMAIL_APP_PASSWORD");

  if (!pass) {
    return { ok: false, error: "GMAIL_APP_PASSWORD not configured" };
  }

  // Use nodemailer via npm: specifier (supported in Deno 1.28+)
  const nodemailer = await import("npm:nodemailer@6");
  const transporter = nodemailer.default.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({
      from: `"SNH Recrutement" <${user}>`,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

const STATUS_LABELS: Record<string, string> = {
  new: "Soumis",
  reviewing: "En cours d'étude",
  interview: "Entretien planifié",
  offer: "Offre reçue",
  pre_onboarding: "En essai",
  onboarding: "Intégration en cours",
  integrated: "Titularisé(e)",
  rejected: "Non retenu(e)",
  withdrawn: "Candidature retirée",
};

const STATUS_COLORS: Record<string, string> = {
  new: "#3b82f6",
  reviewing: "#f59e0b",
  interview: "#f97316",
  offer: "#0d9488",
  pre_onboarding: "#06b6d4",
  onboarding: "#22c55e",
  integrated: "#10b981",
  rejected: "#ef4444",
  withdrawn: "#94a03b",
};

function buildEmailHtml(opts: {
  candidateName: string;
  jobTitle: string;
  status: string;
  statusLabel: string;
  statusColor: string;
  isSuccess: boolean;
  isRejected: boolean;
}): string {
  const { candidateName, jobTitle, status, statusLabel, statusColor, isSuccess, isRejected } = opts;

  const steps = [
    { key: "new", label: "Soumis" },
    { key: "reviewing", label: "En examen" },
    { key: "interview", label: "Entretien" },
    { key: "offer", label: "Offre" },
    { key: "pre_onboarding", label: "En essai" },
    { key: "onboarding", label: "Intégration" },
    { key: "integrated", label: "Titularisé(e)" },
  ];

  const activeIdx = steps.findIndex((s) => s.key === status);

  const stepsHtml = steps
    .map((s, i) => {
      const done = i < activeIdx;
      const active = i === activeIdx;
      const bg = active ? statusColor : done ? "#10b981" : "#e5e7eb";
      const textColor = active || done ? "#ffffff" : "#9ca3af";
      const label = active || done ? s.label : s.label;
      return `
      <td style="text-align:center;padding:0 4px;vertical-align:top;">
        <div style="width:28px;height:28px;border-radius:50%;background:${bg};color:${textColor};
          display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;
          margin:0 auto 4px;">
          ${done ? "✓" : i + 1}
        </div>
        <div style="font-size:9px;color:${active ? statusColor : done ? "#10b981" : "#9ca3af"};
          font-weight:${active ? "700" : "400"};max-width:52px;word-break:break-word;">
          ${s.label}
        </div>
      </td>`;
    })
    .join("");

  const bodyMessage = isSuccess
    ? `<p style="color:#065f46;font-weight:600;">Félicitations ! Votre candidature a abouti avec succès. Vous rejoignez les effectifs de la SNH.</p>`
    : isRejected
    ? `<p style="color:#374151;">Nous avons examiné attentivement votre candidature. Après délibération, nous ne sommes pas en mesure de donner une suite favorable à ce stade. Nous vous remercions de l'intérêt porté à la SNH et vous encourageons à postuler à de futures opportunités.</p>`
    : `<p style="color:#374151;">Votre candidature pour le poste de <strong>${jobTitle}</strong> vient de franchir une nouvelle étape. Notre équipe RH vous contactera prochainement si une action de votre part est nécessaire.</p>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#006B3C 0%,#004d2b 100%);padding:28px 32px;text-align:center;">
            <p style="margin:0;color:#86efac;font-size:12px;letter-spacing:2px;text-transform:uppercase;">SOCIÉTÉ NATIONALE DES HYDROCARBURES</p>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;">Suivi de candidature</h1>
          </td>
        </tr>
        <!-- Status badge -->
        <tr>
          <td style="padding:28px 32px 0;text-align:center;">
            <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">Statut actuel</p>
            <span style="display:inline-block;background:${statusColor}1a;color:${statusColor};border:1.5px solid ${statusColor}40;
              padding:8px 20px;border-radius:999px;font-size:14px;font-weight:700;letter-spacing:0.5px;">
              ${statusLabel}
            </span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:24px 32px;">
            <p style="margin:0 0 12px;color:#111827;font-size:15px;">Bonjour <strong>${candidateName}</strong>,</p>
            ${bodyMessage}
            <p style="color:#374151;margin:0;">Poste visé : <strong>${jobTitle}</strong></p>
          </td>
        </tr>
        ${!isRejected && status !== "withdrawn" ? `
        <!-- Pipeline tracker -->
        <tr>
          <td style="padding:0 32px 24px;">
            <div style="background:#f9fafb;border-radius:10px;padding:16px;border:1px solid #e5e7eb;">
              <p style="margin:0 0 14px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">
                Progression de votre candidature
              </p>
              <table width="100%" cellpadding="0" cellspacing="0"><tr>${stepsHtml}</tr></table>
            </div>
          </td>
        </tr>` : ""}
        <!-- CTA -->
        <tr>
          <td style="padding:0 32px 28px;text-align:center;">
            <a href="${Deno.env.get("PORTAL_URL") || "https://snh-rh.netlify.app/candidature/"}"
              style="display:inline-block;background:#006B3C;color:#ffffff;text-decoration:none;
                padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
              Accéder à mon espace candidat
            </a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:11px;">
              SNH — Société Nationale des Hydrocarbures du Cameroun<br>
              Cet email est envoyé automatiquement, merci de ne pas y répondre directement.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const { to, candidateName, jobTitle, status } = (await req.json()) as {
      to: string;
      candidateName: string;
      jobTitle: string;
      status: string;
    };

    if (!to || !status) {
      return new Response(JSON.stringify({ error: "Missing required fields: to, status" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const statusLabel = STATUS_LABELS[status] ?? status;
    const statusColor = STATUS_COLORS[status] ?? "#006B3C";
    const isSuccess = status === "integrated";
    const isRejected = status === "rejected";

    const html = buildEmailHtml({ candidateName, jobTitle, status, statusLabel, statusColor, isSuccess, isRejected });
    const text = `Bonjour ${candidateName},\n\nVotre candidature pour le poste "${jobTitle}" vient d'être mise à jour.\nNouveau statut : ${statusLabel}\n\nConnectez-vous à votre espace candidat SNH pour suivre l'évolution de votre dossier.\n\n— SNH Ressources Humaines`;

    const subject = isSuccess
      ? `Félicitations — Votre candidature SNH : ${statusLabel}`
      : isRejected
      ? `SNH — Résultat de votre candidature pour : ${jobTitle}`
      : `SNH — Mise à jour de votre candidature : ${statusLabel}`;

    const result = await sendViaGmail({ to, subject, html, text });

    return new Response(JSON.stringify(result), {
      status: result.ok ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
