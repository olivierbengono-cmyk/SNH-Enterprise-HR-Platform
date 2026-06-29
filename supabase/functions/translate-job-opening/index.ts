import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  const { title, description, requirements } = await req.json() as {
    title: string;
    description: string;
    requirements: string;
  };

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  if (!anthropicKey && !openaiKey) {
    return new Response(
      JSON.stringify({
        title_en: null,
        description_en: null,
        requirements_en: null,
        message: "Aucune clé API IA configurée (ANTHROPIC_API_KEY ou OPENAI_API_KEY). Veuillez saisir la traduction manuellement.",
        no_key: true,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const systemPrompt = `You are a professional bilingual translator specialising in HR and oil & gas industry documents (French → English).
Translate the provided French job opening content accurately and professionally.
Preserve any markdown formatting (line breaks, bullet points).
Return ONLY a valid JSON object with keys: "title_en", "description_en", "requirements_en".
Do not add any explanation or preamble outside the JSON.`;

  const userPrompt = `Translate the following job opening from French to English.

TITLE (French):
${title}

JOB DESCRIPTION (French):
${description}

REQUIRED PROFILE / REQUIREMENTS (French):
${requirements}

Return JSON: {"title_en": "...", "description_en": "...", "requirements_en": "..."}`;

  let aiResponse: string | null = null;

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
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      aiResponse = data.content?.[0]?.text || null;
    }
  }

  if (!aiResponse && openaiKey) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1500,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      aiResponse = data.choices?.[0]?.message?.content || null;
    }
  }

  if (!aiResponse) {
    return new Response(
      JSON.stringify({
        title_en: null,
        description_en: null,
        requirements_en: null,
        message: "La traduction IA n'a pas pu aboutir. Veuillez saisir la traduction manuellement.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return new Response(
      JSON.stringify({ title_en: null, description_en: null, requirements_en: null, message: "Format de réponse IA invalide." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return new Response(
    JSON.stringify({
      title_en: parsed.title_en || null,
      description_en: parsed.description_en || null,
      requirements_en: parsed.requirements_en || null,
      message: "Traduction générée par l'IA. Vérifiez et corrigez si nécessaire.",
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
