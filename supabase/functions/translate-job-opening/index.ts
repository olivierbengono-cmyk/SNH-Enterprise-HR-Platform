import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Free translation via unofficial Google Translate endpoint — no API key needed
async function freeTranslate(text: string): Promise<string | null> {
  if (!text.trim()) return null;
  try {
    const url =
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl=en&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const translated = (data[0] as [string, string][])
      ?.map((chunk) => chunk[0])
      .join("") || null;
    return translated;
  } catch {
    return null;
  }
}

async function aiTranslate(
  title: string,
  description: string,
  requirements: string,
  anthropicKey: string | undefined,
  openaiKey: string | undefined,
): Promise<{ title_en: string | null; description_en: string | null; requirements_en: string | null } | null> {
  const systemPrompt =
    `You are a professional bilingual translator specialising in HR and oil & gas industry documents (French → English).
Translate the provided French job opening content accurately and professionally.
Preserve any line breaks and formatting.
Return ONLY a valid JSON object with keys: "title_en", "description_en", "requirements_en".`;

  const userPrompt =
    `Translate from French to English.\n\nTITLE:\n${title}\n\nDESCRIPTION:\n${description}\n\nREQUIREMENTS:\n${requirements}\n\nJSON:`;

  let aiText: string | null = null;

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
      const d = await res.json();
      aiText = d.content?.[0]?.text || null;
    }
  }

  if (!aiText && openaiKey) {
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
      const d = await res.json();
      aiText = d.choices?.[0]?.message?.content || null;
    }
  }

  if (!aiText) return null;

  const match = aiText.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    return {
      title_en: parsed.title_en || null,
      description_en: parsed.description_en || null,
      requirements_en: parsed.requirements_en || null,
    };
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  const { title, description, requirements } = (await req.json()) as {
    title: string;
    description: string;
    requirements: string;
  };

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") || undefined;
  const openaiKey = Deno.env.get("OPENAI_API_KEY") || undefined;

  // 1. Try AI translation first (if key configured)
  if (anthropicKey || openaiKey) {
    const ai = await aiTranslate(title, description, requirements, anthropicKey, openaiKey);
    if (ai) {
      return new Response(
        JSON.stringify({ ...ai, message: "Traduction générée par l'IA. Vérifiez et corrigez si nécessaire.", source: "ai" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  // 2. Free fallback: translate each field independently via Google Translate
  const [titleEn, descriptionEn, requirementsEn] = await Promise.all([
    freeTranslate(title),
    freeTranslate(description),
    freeTranslate(requirements),
  ]);

  if (titleEn || descriptionEn || requirementsEn) {
    return new Response(
      JSON.stringify({
        title_en: titleEn,
        description_en: descriptionEn,
        requirements_en: requirementsEn,
        message: "Traduction automatique générée (service gratuit). Vérifiez et corrigez si nécessaire.",
        source: "free",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // 3. All methods failed
  return new Response(
    JSON.stringify({
      title_en: null,
      description_en: null,
      requirements_en: null,
      message: "La traduction automatique n'a pas pu aboutir. Veuillez saisir la traduction manuellement.",
      source: "none",
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
