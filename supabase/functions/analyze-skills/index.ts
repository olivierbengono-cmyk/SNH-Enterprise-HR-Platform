import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const LEVEL_SCORE: Record<string, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
};

const LEVEL_LABEL: Record<string, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
  expert: "Expert",
};

type AnalysisType = "position_matching" | "succession_planning" | "training_recommendations";

interface SkillReq {
  skill_id: string;
  skill_name: string;
  required_level: string;
  is_mandatory: boolean;
  weight: number;
}

interface EmpSkill {
  skill_id: string;
  skill_name: string;
  proficiency_level: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  position_title: string | null;
  department_name: string | null;
  current_salary: number | null;
  emp_skills: EmpSkill[];
}

function computeMatchScore(empSkills: EmpSkill[], requirements: SkillReq[]): {
  score: number;
  mandatory_score: number;
  matched_skills: { skill_name: string; emp_level: string; req_level: string; gap: number; weight: number }[];
  missing_mandatory: string[];
  skill_gaps: { skill_name: string; current: string | null; required: string; gap_points: number }[];
} {
  let totalWeight = 0;
  let earnedWeight = 0;
  let mandatoryTotal = 0;
  let mandatoryEarned = 0;

  const matched_skills: { skill_name: string; emp_level: string; req_level: string; gap: number; weight: number }[] = [];
  const missing_mandatory: string[] = [];
  const skill_gaps: { skill_name: string; current: string | null; required: string; gap_points: number }[] = [];

  const empSkillMap = new Map(empSkills.map((s) => [s.skill_id, s]));

  for (const req of requirements) {
    const empSkill = empSkillMap.get(req.skill_id);
    const reqScore = LEVEL_SCORE[req.required_level] ?? 1;
    const empScore = empSkill ? (LEVEL_SCORE[empSkill.proficiency_level] ?? 0) : 0;

    totalWeight += req.weight;
    if (req.is_mandatory) mandatoryTotal += req.weight;

    if (empSkill) {
      const ratio = Math.min(empScore / reqScore, 1.0);
      const contribution = ratio * req.weight;
      earnedWeight += contribution;
      if (req.is_mandatory) mandatoryEarned += contribution;

      const gap = empScore - reqScore;
      matched_skills.push({
        skill_name: req.skill_name,
        emp_level: empSkill.proficiency_level,
        req_level: req.required_level,
        gap,
        weight: req.weight,
      });

      if (gap < 0) {
        skill_gaps.push({
          skill_name: req.skill_name,
          current: empSkill.proficiency_level,
          required: req.required_level,
          gap_points: Math.abs(gap),
        });
      }
    } else {
      if (req.is_mandatory) {
        missing_mandatory.push(req.skill_name);
      }
      skill_gaps.push({
        skill_name: req.skill_name,
        current: null,
        required: req.required_level,
        gap_points: reqScore,
      });
    }
  }

  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
  const mandatory_score = mandatoryTotal > 0 ? Math.round((mandatoryEarned / mandatoryTotal) * 100) : 100;

  return { score, mandatory_score, matched_skills, missing_mandatory, skill_gaps };
}

function generateMatchRationale(emp: Employee, score: number, mandatoryScore: number, matchedCount: number, totalReqs: number, missingMandatory: string[]): string {
  const name = `${emp.first_name} ${emp.last_name}`;
  const dept = emp.department_name ?? "l'entreprise";

  if (score >= 85 && mandatoryScore >= 90) {
    return `${name} présente un profil exceptionnel pour ce poste avec ${score}% de correspondance. Son expérience en ${dept} et sa maîtrise de ${matchedCount} compétences clés sur ${totalReqs} en font un candidat prioritaire.`;
  } else if (score >= 70) {
    return `${name} est un candidat solide (${score}% de correspondance). Avec ${matchedCount}/${totalReqs} compétences couvertes, quelques actions de développement permettraient une prise de poste optimale.`;
  } else if (score >= 50) {
    const gaps = missingMandatory.length > 0 ? ` Compétences critiques manquantes : ${missingMandatory.slice(0,2).join(', ')}.` : '';
    return `${name} dispose d'un potentiel de développement (${score}%).${gaps} Un plan de formation ciblé est recommandé avant toute candidature.`;
  } else {
    return `${name} nécessite un développement significatif pour ce poste (${score}%). Profil à considérer pour un parcours d'évolution à moyen terme.`;
  }
}

function generateSuccessionRationale(emp: Employee, score: number, overlap: number, totalDepartingSkills: number): string {
  const name = `${emp.first_name} ${emp.last_name}`;
  if (score >= 80) {
    return `${name} est idéalement positionné(e) pour assurer la succession avec ${overlap}/${totalDepartingSkills} compétences communes (${score}% de recouvrement). Un transfert de connaissances ciblé sur les points d'écart permettra une transition fluide.`;
  } else if (score >= 60) {
    return `${name} peut assurer la succession avec accompagnement. ${overlap} compétences communes sur ${totalDepartingSkills} constituent une base solide pour un plan de montée en compétences structuré.`;
  } else {
    return `${name} représente une option de succession à long terme. Un plan de développement de 12 à 18 mois est nécessaire pour combler les écarts identifiés.`;
  }
}

function generateTrainingPlan(
  emp: Employee,
  gaps: { skill_name: string; current: string | null; required: string; gap_points: number }[]
): { skill_name: string; current_level: string; target_level: string; priority: string; estimated_duration: string; recommended_approach: string }[] {
  const DURATIONS: Record<number, string> = { 1: "2–4 semaines", 2: "1–3 mois", 3: "3–6 mois" };
  const APPROACHES: Record<string, string> = {
    beginner: "E-learning + atelier pratique supervisé",
    intermediate: "Formation présentielle + coaching terrain",
    advanced: "Certification professionnelle + mentoring expert",
    expert: "Certification internationale + immersion externe",
  };

  return gaps
    .sort((a, b) => b.gap_points - a.gap_points)
    .slice(0, 6)
    .map((g) => ({
      skill_name: g.skill_name,
      current_level: g.current ? LEVEL_LABEL[g.current] ?? g.current : "Non acquis",
      target_level: LEVEL_LABEL[g.required] ?? g.required,
      priority: g.gap_points >= 3 ? "Haute" : g.gap_points === 2 ? "Moyenne" : "Faible",
      estimated_duration: DURATIONS[Math.min(g.gap_points, 3)] ?? "2–4 semaines",
      recommended_approach: APPROACHES[g.required] ?? "Formation continue",
    }));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { type, position_id, employee_id, top_n = 10 }: {
      type: AnalysisType;
      position_id?: string;
      employee_id?: string;
      top_n?: number;
    } = body;

    // ── Position Matching ────────────────────────────────────────────────────
    if (type === "position_matching") {
      if (!position_id) {
        return new Response(JSON.stringify({ error: "position_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Fetch position info
      const { data: posData } = await supabase
        .from("positions")
        .select("id, title, departments(name)")
        .eq("id", position_id)
        .maybeSingle();

      // Fetch requirements
      const { data: reqsData } = await supabase
        .from("position_skill_requirements")
        .select("skill_id, required_level, is_mandatory, weight, skills(name)")
        .eq("position_id", position_id);

      const requirements: SkillReq[] = (reqsData ?? []).map((r: any) => ({
        skill_id: r.skill_id,
        skill_name: r.skills?.name ?? r.skill_id,
        required_level: r.required_level,
        is_mandatory: r.is_mandatory,
        weight: r.weight,
      }));

      if (requirements.length === 0) {
        return new Response(JSON.stringify({ error: "Aucun référentiel de compétences défini pour ce poste" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Fetch all active employees with skills
      const { data: empsData } = await supabase
        .from("employees")
        .select(`
          id, first_name, last_name, current_salary,
          positions(title),
          departments(name),
          employee_skills(skill_id, proficiency_level, skills(name))
        `)
        .eq("employment_status", "active");

      const employees: Employee[] = (empsData ?? []).map((e: any) => ({
        id: e.id,
        first_name: e.first_name,
        last_name: e.last_name,
        position_title: e.positions?.title ?? null,
        department_name: e.departments?.name ?? null,
        current_salary: e.current_salary,
        emp_skills: (e.employee_skills ?? []).map((s: any) => ({
          skill_id: s.skill_id,
          skill_name: s.skills?.name ?? s.skill_id,
          proficiency_level: s.proficiency_level,
        })),
      }));

      const results = employees
        .map((emp) => {
          const { score, mandatory_score, matched_skills, missing_mandatory, skill_gaps } = computeMatchScore(emp.emp_skills, requirements);
          const rationale = generateMatchRationale(emp, score, mandatory_score, matched_skills.filter(m => m.gap >= 0).length, requirements.length, missing_mandatory);
          return {
            employee_id: emp.id,
            first_name: emp.first_name,
            last_name: emp.last_name,
            current_position: emp.position_title,
            department: emp.department_name,
            score,
            mandatory_score,
            skills_covered: matched_skills.filter(m => m.gap >= 0).length,
            total_requirements: requirements.length,
            missing_mandatory,
            skill_gaps,
            rationale,
          };
        })
        .sort((a, b) => b.score - a.score || b.mandatory_score - a.mandatory_score)
        .slice(0, top_n);

      return new Response(JSON.stringify({
        position: { id: position_id, title: posData?.title, department: (posData as any)?.departments?.name },
        requirements,
        candidates: results,
        analysis_timestamp: new Date().toISOString(),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Succession Planning ─────────────────────────────────────────────────
    if (type === "succession_planning") {
      if (!employee_id) {
        return new Response(JSON.stringify({ error: "employee_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Fetch departing employee
      const { data: deptEmp } = await supabase
        .from("employees")
        .select(`
          id, first_name, last_name, current_salary,
          positions(id, title),
          departments(name),
          employee_skills(skill_id, proficiency_level, skills(name))
        `)
        .eq("id", employee_id)
        .maybeSingle();

      if (!deptEmp) {
        return new Response(JSON.stringify({ error: "Employé introuvable" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const departingSkills: EmpSkill[] = ((deptEmp as any).employee_skills ?? []).map((s: any) => ({
        skill_id: s.skill_id,
        skill_name: s.skills?.name ?? s.skill_id,
        proficiency_level: s.proficiency_level,
      }));

      // Fetch position requirements if available
      const positionId = (deptEmp as any).positions?.id;
      let posReqs: SkillReq[] = [];
      if (positionId) {
        const { data: reqsData } = await supabase
          .from("position_skill_requirements")
          .select("skill_id, required_level, is_mandatory, weight, skills(name)")
          .eq("position_id", positionId);
        posReqs = (reqsData ?? []).map((r: any) => ({
          skill_id: r.skill_id,
          skill_name: r.skills?.name ?? r.skill_id,
          required_level: r.required_level,
          is_mandatory: r.is_mandatory,
          weight: r.weight,
        }));
      }

      // Use departing employee's skills as requirements if no formal req exists
      const effectiveReqs: SkillReq[] = posReqs.length > 0 ? posReqs : departingSkills.map((s) => ({
        skill_id: s.skill_id,
        skill_name: s.skill_name,
        required_level: s.proficiency_level,
        is_mandatory: true,
        weight: LEVEL_SCORE[s.proficiency_level] ?? 2,
      }));

      // Fetch all other active employees
      const { data: empsData } = await supabase
        .from("employees")
        .select(`
          id, first_name, last_name,
          positions(title),
          departments(name),
          employee_skills(skill_id, proficiency_level, skills(name))
        `)
        .eq("employment_status", "active")
        .neq("id", employee_id);

      const employees: Employee[] = (empsData ?? []).map((e: any) => ({
        id: e.id,
        first_name: e.first_name,
        last_name: e.last_name,
        position_title: e.positions?.title ?? null,
        department_name: e.departments?.name ?? null,
        current_salary: null,
        emp_skills: (e.employee_skills ?? []).map((s: any) => ({
          skill_id: s.skill_id,
          skill_name: s.skills?.name ?? s.skill_id,
          proficiency_level: s.proficiency_level,
        })),
      }));

      const results = employees
        .map((emp) => {
          const { score, mandatory_score, skill_gaps } = computeMatchScore(emp.emp_skills, effectiveReqs);
          const empSkillMap = new Map(emp.emp_skills.map((s) => s.skill_id));
          const overlap = departingSkills.filter((s) => empSkillMap.has(s.skill_id)).length;
          const rationale = generateSuccessionRationale(emp, score, overlap, departingSkills.length);
          const trainingPlan = generateTrainingPlan(emp, skill_gaps);
          return {
            employee_id: emp.id,
            first_name: emp.first_name,
            last_name: emp.last_name,
            current_position: emp.position_title,
            department: emp.department_name,
            score,
            mandatory_score,
            skills_overlap: overlap,
            total_departing_skills: departingSkills.length,
            skill_gaps,
            training_plan: trainingPlan,
            rationale,
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, top_n);

      return new Response(JSON.stringify({
        departing_employee: {
          id: employee_id,
          name: `${(deptEmp as any).first_name} ${(deptEmp as any).last_name}`,
          position: (deptEmp as any).positions?.title,
          department: (deptEmp as any).departments?.name,
          skills_count: departingSkills.length,
        },
        successors: results,
        analysis_timestamp: new Date().toISOString(),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Training Recommendations ─────────────────────────────────────────────
    if (type === "training_recommendations") {
      if (!position_id || !employee_id) {
        return new Response(JSON.stringify({ error: "position_id and employee_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Fetch position requirements
      const { data: reqsData } = await supabase
        .from("position_skill_requirements")
        .select("skill_id, required_level, is_mandatory, weight, skills(name)")
        .eq("position_id", position_id);

      const { data: posData } = await supabase
        .from("positions")
        .select("title, departments(name)")
        .eq("id", position_id)
        .maybeSingle();

      const requirements: SkillReq[] = (reqsData ?? []).map((r: any) => ({
        skill_id: r.skill_id,
        skill_name: r.skills?.name ?? r.skill_id,
        required_level: r.required_level,
        is_mandatory: r.is_mandatory,
        weight: r.weight,
      }));

      // Fetch employee
      const { data: empData } = await supabase
        .from("employees")
        .select(`
          id, first_name, last_name,
          positions(title),
          departments(name),
          employee_skills(skill_id, proficiency_level, skills(name))
        `)
        .eq("id", employee_id)
        .maybeSingle();

      if (!empData) {
        return new Response(JSON.stringify({ error: "Employé introuvable" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const emp: Employee = {
        id: (empData as any).id,
        first_name: (empData as any).first_name,
        last_name: (empData as any).last_name,
        position_title: (empData as any).positions?.title ?? null,
        department_name: (empData as any).departments?.name ?? null,
        current_salary: null,
        emp_skills: ((empData as any).employee_skills ?? []).map((s: any) => ({
          skill_id: s.skill_id,
          skill_name: s.skills?.name ?? s.skill_id,
          proficiency_level: s.proficiency_level,
        })),
      };

      const { score, mandatory_score, skill_gaps } = computeMatchScore(emp.emp_skills, requirements);
      const trainingPlan = generateTrainingPlan(emp, skill_gaps);

      const totalGapPoints = skill_gaps.reduce((s, g) => s + g.gap_points, 0);
      const estimatedMonths = Math.ceil(totalGapPoints * 0.8);

      return new Response(JSON.stringify({
        employee: {
          id: emp.id,
          name: `${emp.first_name} ${emp.last_name}`,
          current_position: emp.position_title,
          department: emp.department_name,
        },
        target_position: {
          id: position_id,
          title: (posData as any)?.title,
          department: (posData as any)?.departments?.name,
        },
        current_match_score: score,
        mandatory_score,
        total_gaps: skill_gaps.length,
        estimated_development_months: estimatedMonths,
        training_plan: trainingPlan,
        summary: score >= 80
          ? `${emp.first_name} ${emp.last_name} est prêt(e) pour ce poste avec ${score}% de correspondance. Seuls quelques perfectionnements ciblés sont recommandés.`
          : `Un plan de développement structuré sur ${estimatedMonths} mois permettra à ${emp.first_name} ${emp.last_name} d'atteindre le niveau requis pour le poste de ${(posData as any)?.title ?? 'ce poste'}.`,
        analysis_timestamp: new Date().toISOString(),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Type d'analyse invalide. Utilisez: position_matching, succession_planning, training_recommendations" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("analyze-skills error:", error);
    return new Response(JSON.stringify({ error: "Erreur interne du serveur", details: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
