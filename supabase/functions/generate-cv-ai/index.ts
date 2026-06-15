import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const { profile, experiences, educations, skills, languages, instructions } = await req.json();

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      // Return a basic enhancement without AI when no API key is configured
      return new Response(JSON.stringify({
        aiSummary: profile.summary || null,
        message: "Aucune clé API IA configurée — le CV est généré avec les données du profil.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const profileText = `
Prénom : ${profile.first_name}
Nom : ${profile.last_name}
Titre professionnel : ${profile.professional_title || profile.desired_position || "Non renseigné"}
Email : ${profile.email}
Téléphone : ${profile.phone || ""}
Localisation : ${profile.location || ""}${profile.region ? ", " + profile.region : ""}
Résumé actuel : ${profile.summary || "Aucun résumé disponible"}
Date de naissance : ${profile.birth_date || ""}
Genre : ${profile.gender || ""}
Nationalité : ${profile.nationality || ""}
Mobilité : ${profile.mobility || ""}
Disponibilité : ${profile.availability_date || ""}

Expériences :
${(experiences || []).map((e: any) => `- ${e.job_title} chez ${e.company} (${e.start_date ? new Date(e.start_date).getFullYear() : ""} – ${e.is_current ? "Présent" : (e.end_date ? new Date(e.end_date).getFullYear() : "")})\n  ${e.description || ""}`).join("\n")}

Formations :
${(educations || []).map((e: any) => `- ${e.degree}${e.field_of_study ? ", " + e.field_of_study : ""} — ${e.institution} (${e.end_date ? new Date(e.end_date).getFullYear() : ""})`).join("\n")}

Compétences :
${(skills || []).map((s: any) => `- ${s.name} (${s.category}, niveau ${s.level})`).join("\n")}

Langues :
${(languages || []).map((l: any) => `- ${l.name} : ${l.level}`).join("\n")}
`;

    const systemPrompt = `Tu es un expert en rédaction de CV professionnels pour le marché africain et camerounais.
Tu dois améliorer et structurer le profil du candidat pour générer un résumé professionnel percutant.
Réponds UNIQUEMENT avec un JSON valide de la forme :
{
  "aiSummary": "Le résumé professionnel amélioré en français (3-5 phrases percutantes, en première personne ou à la troisième personne selon les instructions)",
  "suggestions": ["suggestion 1 pour améliorer le profil", "suggestion 2"]
}`;

    const userPrompt = `Voici le profil du candidat :\n${profileText}\n\nInstructions spécifiques de l'utilisateur : ${instructions || "Génère un résumé professionnel percutant adapté au secteur pétrolier/gazier de la SNH (Société Nationale des Hydrocarbures du Cameroun)."}`;

    // Try Anthropic Claude first, fall back to OpenAI
    let aiResponse: string | null = null;

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (anthropicKey) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-20240307",
          max_tokens: 800,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        aiResponse = data.content?.[0]?.text || null;
      }
    }

    if (!aiResponse) {
      const openaiKey = Deno.env.get("OPENAI_API_KEY");
      if (openaiKey) {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            max_tokens: 800,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          aiResponse = data.choices?.[0]?.message?.content || null;
        }
      }
    }

    if (!aiResponse) {
      return new Response(JSON.stringify({
        aiSummary: profile.summary || null,
        suggestions: [],
        message: "La génération IA n'a pas pu aboutir. Le CV est généré avec les données du profil.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Parse JSON from AI response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid AI response format");
    const parsed = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
