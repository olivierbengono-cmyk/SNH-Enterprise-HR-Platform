import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type Role =
  | "employee"
  | "manager"
  | "drh"
  | "admin"
  | "director"
  | "payroll_manager"
  | "recruitment_manager"
  | "career_manager"
  | "qvct_manager";

interface AIRequest {
  message: string;
  userId: string;
  context?: {
    role?: Role;
    employeeId?: string;
  };
}

interface Suggestion {
  label: string;
  action: string;
  description?: string;
}

interface CommandResult {
  success: boolean;
  message: string;
  action?: string;
  suggestions?: Suggestion[];
}

interface CommandDef {
  patterns: string[];
  action: string;
  response: string;
  roles?: Role[];
}

const COMMANDS: CommandDef[] = [
  // Universal (profile, docs, org)
  { patterns: ["mon profil", "mes informations", "mes donnees personnelles", "ma fiche"], action: "show_profile", response: "Ouverture de votre profil." },
  { patterns: ["mes documents", "mes attestations", "attestation de travail"], action: "show_documents", response: "Acces a vos documents et attestations." },
  { patterns: ["organigramme", "structure de l'entreprise", "qui est qui"], action: "show_orgchart", response: "Affichage de l'organigramme." },
  { patterns: ["discussion qvct", "discussions qvct", "espace d'echange"], action: "show_qvct_discussions", response: "Ouverture des discussions QVCT." },

  // Leave/Absence
  { patterns: ["mes conges", "mes absences", "solde de conges", "voir mes conges"], action: "show_leaves", response: "Voici vos conges et absences." },
  { patterns: ["nouvelle demande de conge", "demander un conge", "poser un conge", "faire une demande de conge"], action: "create_leave", response: "Ouverture du formulaire de demande de conge." },
  { patterns: ["valider les conges", "validations conges", "demandes a valider"], action: "show_validations", response: "Acces aux validations en attente.", roles: ["manager", "drh", "admin"] },

  // Payslips
  { patterns: ["ma fiche de paie", "bulletin de paie", "dernier bulletin", "mes bulletins", "mon salaire"], action: "show_payslips", response: "Affichage de vos bulletins de paie." },

  // Time & expenses
  { patterns: ["pointage", "mon temps", "mes heures", "time tracking"], action: "show_time", response: "Module de pointage ouvert." },
  { patterns: ["note de frais", "notes de frais", "remboursement", "depense"], action: "show_expenses", response: "Gestion des notes de frais ouverte." },

  // Training & performance (employee side)
  { patterns: ["mes formations", "formations disponibles", "catalogue formations"], action: "show_trainings", response: "Voici les formations." },
  { patterns: ["mes objectifs", "ma performance", "mon evaluation"], action: "show_performance", response: "Acces a votre performance." },

  // Manager
  { patterns: ["mon equipe", "voir mon equipe", "gerer mon equipe"], action: "show_my_team", response: "Acces a votre equipe.", roles: ["manager", "drh", "admin"] },
  { patterns: ["performance equipe", "evaluations equipe"], action: "show_team_performance", response: "Performance de votre equipe.", roles: ["manager", "drh", "admin"] },

  // HR Admin (DRH / Admin)
  { patterns: ["liste des employes", "tous les employes", "voir les employes", "personnel"], action: "show_employees", response: "Liste du personnel.", roles: ["drh", "admin", "manager", "career_manager", "recruitment_manager"] },
  { patterns: ["ajouter un employe", "nouvel employe", "creer un employe", "embaucher"], action: "create_employee", response: "Ouverture de la creation d'un employe.", roles: ["drh", "admin"] },
  { patterns: ["gestion des roles", "roles des utilisateurs", "attribuer un role"], action: "show_user_roles", response: "Gestion des roles ouverte.", roles: ["drh", "admin"] },
  { patterns: ["permissions", "droits d'acces", "matrice des permissions"], action: "show_role_permissions", response: "Acces aux permissions par role.", roles: ["admin"] },
  { patterns: ["comptes actifs", "comptes d'acces", "mots de passe"], action: "show_accounts", response: "Gestion des comptes d'acces.", roles: ["drh", "admin"] },
  { patterns: ["parametres", "reglages", "settings", "configuration"], action: "show_settings", response: "Parametres du systeme.", roles: ["drh", "admin"] },
  { patterns: ["disciplinaire", "sanction", "avertissement", "mise a pied"], action: "show_disciplinary", response: "Gestion disciplinaire.", roles: ["drh", "admin", "career_manager"] },
  { patterns: ["competences", "matrice des competences", "skills"], action: "show_skills", response: "Matrice des competences.", roles: ["drh", "admin"] },
  { patterns: ["analytique", "analytics", "kpi rh", "tableaux de bord"], action: "show_analytics", response: "Vue analytique RH." },

  // Recruitment
  { patterns: ["recrutement", "offres d'emploi", "candidats", "entretiens"], action: "show_recruitment", response: "Module recrutement ouvert.", roles: ["drh", "admin", "recruitment_manager"] },
  { patterns: ["nouvelle offre", "creer une offre", "publier un poste"], action: "create_job_opening", response: "Creation d'une offre d'emploi.", roles: ["drh", "admin", "recruitment_manager"] },

  // Payroll admin (payroll_manager / drh / admin)
  { patterns: ["generer la paie", "generation de paie", "lancer la paie", "calcul de paie", "faire la paie"], action: "generate_payroll", response: "Ouverture de la generation de paie.", roles: ["drh", "admin", "payroll_manager"] },
  { patterns: ["elements de paie", "rubriques de paie", "primes fixes"], action: "show_payroll_elements", response: "Elements de paie ouverts.", roles: ["drh", "admin", "payroll_manager"] },
  { patterns: ["grilles salariales", "echelle de salaire"], action: "show_salary_grids", response: "Grilles salariales ouvertes.", roles: ["drh", "admin", "payroll_manager"] },
  { patterns: ["parametres fiscaux", "irpp", "impot"], action: "show_tax_parameters", response: "Parametres fiscaux ouverts.", roles: ["drh", "admin", "payroll_manager"] },
  { patterns: ["cotisations sociales", "cnps"], action: "show_social_contributions", response: "Cotisations sociales ouvertes.", roles: ["drh", "admin", "payroll_manager"] },

  // Training/performance admin
  { patterns: ["gestion des formations", "planifier une formation", "nouveau programme"], action: "show_training_admin", response: "Administration des formations.", roles: ["drh", "admin", "career_manager"] },
  { patterns: ["evaluations", "cycles d'evaluation", "performance admin"], action: "show_performance_admin", response: "Administration de la performance.", roles: ["drh", "admin", "career_manager"] },

  // QVCT
  { patterns: ["qvct", "qualite de vie", "bien-etre"], action: "show_qvct", response: "Module QVCT ouvert." },

  // Reports
  { patterns: ["rapport", "etat", "generer un rapport", "creer un etat", "bilan"], action: "generate_report", response: "Generation d'un rapport en cours..." },

  // Help
  { patterns: ["aide", "help", "comment utiliser", "que peux-tu faire", "guide"], action: "show_help", response: "" },
];

const HOW_TO: Record<string, string> = {
  generate_payroll: "Pour generer la paie : 1) Rendez-vous dans Paie, onglet 'Generation de paie'. 2) Choisissez mois/annee. 3) Verifiez la previsualisation des bulletins (brut, CNPS, IRPP, net). 4) Selectionnez les employes concernes. 5) Cliquez sur 'Generer la paie'. Les bulletins sont enregistres et disponibles dans le module 'Bulletins de paie'.",
  create_leave: "Pour poser un conge : 1) Allez dans 'Conges & Absences'. 2) Cliquez 'Nouvelle demande'. 3) Choisissez le type, les dates et le motif. 4) Soumettez la demande. Votre manager la validera.",
  create_employee: "Pour ajouter un employe : 1) Allez dans 'Liste du personnel'. 2) Cliquez 'Ajouter un employe'. 3) Remplissez les informations personnelles, contractuelles et salariales. 4) Enregistrez — un compte d'acces peut ensuite etre cree dans 'Comptes d'acces'.",
  create_job_opening: "Pour publier une offre : 1) Allez dans 'Recrutement'. 2) Cliquez 'Nouvelle offre'. 3) Renseignez intitule, departement, exigences. 4) Publiez — les candidatures s'accumuleront dans l'onglet 'Candidats'.",
  show_validations: "Pour traiter les conges en attente : 1) Onglet 'Validations'. 2) Passez en revue chaque demande. 3) Approuvez ou refusez avec un motif.",
  show_my_team: "Pour suivre votre equipe : menu 'Mon equipe' — vous y verrez vos collaborateurs, leurs conges, leur performance et leurs formations.",
};

const ROLE_SUGGESTIONS: Record<Role, Suggestion[]> = {
  employee: [
    { label: "Mes bulletins de paie", action: "show_payslips" },
    { label: "Nouvelle demande de conge", action: "create_leave" },
    { label: "Mon pointage", action: "show_time" },
    { label: "Mes notes de frais", action: "show_expenses" },
    { label: "Mes formations", action: "show_trainings" },
    { label: "Ma performance", action: "show_performance" },
    { label: "Mes documents", action: "show_documents" },
    { label: "Discussions QVCT", action: "show_qvct_discussions" },
  ],
  manager: [
    { label: "Mon equipe", action: "show_my_team" },
    { label: "Validations conges", action: "show_validations" },
    { label: "Performance equipe", action: "show_team_performance" },
    { label: "Liste du personnel", action: "show_employees" },
    { label: "Organigramme", action: "show_orgchart" },
  ],
  drh: [
    { label: "Ajouter un employe", action: "create_employee" },
    { label: "Generer la paie", action: "generate_payroll" },
    { label: "Recrutement", action: "show_recruitment" },
    { label: "Analytics RH", action: "show_analytics" },
    { label: "Gestion des roles", action: "show_user_roles" },
    { label: "Formations", action: "show_training_admin" },
    { label: "QVCT", action: "show_qvct" },
    { label: "Disciplinaire", action: "show_disciplinary" },
  ],
  admin: [
    { label: "Generer la paie", action: "generate_payroll" },
    { label: "Permissions", action: "show_role_permissions" },
    { label: "Gestion des roles", action: "show_user_roles" },
    { label: "Comptes d'acces", action: "show_accounts" },
    { label: "Parametres", action: "show_settings" },
    { label: "Analytics RH", action: "show_analytics" },
  ],
  director: [
    { label: "KPI RH", action: "show_analytics" },
    { label: "Rapport mensuel", action: "generate_report" },
    { label: "Organigramme", action: "show_orgchart" },
  ],
  payroll_manager: [
    { label: "Generer la paie", action: "generate_payroll" },
    { label: "Elements de paie", action: "show_payroll_elements" },
    { label: "Grilles salariales", action: "show_salary_grids" },
    { label: "IRPP / Impots", action: "show_tax_parameters" },
    { label: "CNPS", action: "show_social_contributions" },
    { label: "Bulletins", action: "show_payslips" },
  ],
  recruitment_manager: [
    { label: "Recrutement", action: "show_recruitment" },
    { label: "Nouvelle offre", action: "create_job_opening" },
    { label: "Liste du personnel", action: "show_employees" },
    { label: "Analytics", action: "show_analytics" },
  ],
  career_manager: [
    { label: "Evaluations", action: "show_performance_admin" },
    { label: "Formations", action: "show_training_admin" },
    { label: "Disciplinaire", action: "show_disciplinary" },
    { label: "Documents & Attestations", action: "show_documents" },
  ],
  qvct_manager: [
    { label: "Administration QVCT", action: "show_qvct" },
    { label: "Discussions QVCT", action: "show_qvct_discussions" },
  ],
};

function buildHelpMessage(role?: Role): string {
  const suggestions = role ? ROLE_SUGGESTIONS[role] ?? [] : [];
  const lines = suggestions.map((s) => `- ${s.label}`).join("\n");
  const header = role
    ? `Voici ce que je peux faire pour vous en tant que ${role} :`
    : "Voici ce que je peux faire pour vous :";
  return `${header}\n\n${lines}\n\nDemandez-moi par exemple "Comment generer la paie ?" ou "Aide-moi a poser un conge". Je peux aussi ouvrir directement chaque module.`;
}

function isHowToQuery(message: string): boolean {
  const m = message.toLowerCase();
  return /\b(comment|how|procedure|etapes|aide[- ]moi|guide[- ]moi|explique)\b/.test(m);
}

function findMatchingCommand(message: string, role?: Role): CommandDef | null {
  const m = message.toLowerCase();
  for (const cmd of COMMANDS) {
    if (cmd.roles && role && !cmd.roles.includes(role)) continue;
    if (cmd.patterns.some((p) => m.includes(p))) return cmd;
  }
  return null;
}

async function processAIRequest(
  message: string,
  _userId: string,
  context?: { role?: Role }
): Promise<CommandResult> {
  const role = context?.role;
  const suggestions = role ? ROLE_SUGGESTIONS[role] ?? [] : [];

  const command = findMatchingCommand(message, role);
  const howToAsked = isHowToQuery(message);

  if (command) {
    if (command.action === "show_help") {
      return { success: true, message: buildHelpMessage(role), action: "show_help", suggestions };
    }

    const howTo = HOW_TO[command.action];
    const base = howToAsked && howTo ? howTo : command.response;
    const fullMessage = !howToAsked && howTo
      ? `${command.response}\n\nAstuce: ${howTo}`
      : base;

    return {
      success: true,
      message: fullMessage,
      action: command.action,
      suggestions,
    };
  }

  return {
    success: true,
    message:
      "Je n'ai pas compris votre demande. Voici des raccourcis adaptes a votre role — cliquez-en un pour ouvrir la fonctionnalite, ou dites 'aide' pour la liste complete.",
    action: "show_help",
    suggestions,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // ── JWT verification ───────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.slice(7);
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // ────────────────────────────────────────────────────────────────────────

    const { message, context }: Omit<AIRequest, "userId"> = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "Le message est requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // userId is always derived from the verified JWT, never from the request body
    const result = await processAIRequest(message, user.id, context);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI Assistant Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Une erreur s'est produite lors du traitement de votre demande.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
