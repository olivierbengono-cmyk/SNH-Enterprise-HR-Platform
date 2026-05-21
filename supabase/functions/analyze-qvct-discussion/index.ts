import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AnalysisRequest {
  threadId: string;
  employeeId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { threadId, employeeId }: AnalysisRequest = await req.json();

    if (!threadId || !employeeId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "threadId et employeeId requis"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: thread, error: threadError } = await supabase
      .from("qvct_discussion_threads")
      .select("*")
      .eq("id", threadId)
      .single();

    if (threadError || !thread) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Discussion non trouvée"
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: messages, error: messagesError } = await supabase
      .from("qvct_discussion_messages")
      .select("message, is_anonymous, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (messagesError || !messages || messages.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Aucun message à analyser"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const conversationText = messages.map(m => m.message).join("\n\n");

    const analysis = analyzeDiscussion(thread.title, thread.category, conversationText);

    const { data: insertedAnalysis, error: insertError } = await supabase
      .from("qvct_discussion_analysis")
      .insert({
        thread_id: threadId,
        summary: analysis.summary,
        key_themes: analysis.key_themes,
        sentiment: analysis.sentiment,
        proposed_actions: analysis.proposed_actions,
        qvct_topics: analysis.qvct_topics,
        generated_by: employeeId,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting analysis:", insertError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Erreur lors de l'enregistrement de l'analyse"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: insertedAnalysis,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Erreur lors de l'analyse de la discussion",
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function analyzeDiscussion(title: string, category: string, conversationText: string) {
  const themes = extractKeyThemes(conversationText, category);
  const sentiment = analyzeSentiment(conversationText);
  const qvctTopics = identifyQVCTTopics(conversationText, category);
  const actions = proposeActions(themes, category);
  const summary = generateSummary(title, conversationText, themes);

  return {
    summary,
    key_themes: themes,
    sentiment,
    proposed_actions: actions,
    qvct_topics: qvctTopics,
  };
}

function extractKeyThemes(text: string, category: string): string[] {
  const lowerText = text.toLowerCase();
  const themes: string[] = [];

  const themeKeywords: Record<string, string[][]> = {
    conditions_travail: [
      ["espace", "bureau", "local"],
      ["équipement", "matériel", "outil"],
      ["température", "climatisation", "chauffage"],
      ["bruit", "nuisance sonore"],
      ["ergonomie", "poste de travail"],
      ["sécurité", "risque"],
    ],
    relations: [
      ["communication", "échange"],
      ["conflit", "tension"],
      ["collaboration", "coopération"],
      ["respect", "considération"],
      ["management", "encadrement"],
      ["entraide", "solidarité"],
    ],
    organisation: [
      ["horaire", "planning", "temps de travail"],
      ["réunion", "rencontre"],
      ["charge de travail", "surcharge"],
      ["processus", "procédure"],
      ["autonomie", "responsabilité"],
      ["télétravail", "distanciel"],
    ],
    sante: [
      ["stress", "pression"],
      ["fatigue", "épuisement"],
      ["bien-être", "santé mentale"],
      ["pause", "repos"],
      ["sport", "activité physique"],
      ["équilibre vie pro", "vie perso"],
    ],
  };

  const categoryKeywords = themeKeywords[category] || [];

  for (const keywordGroup of categoryKeywords) {
    if (keywordGroup.some(keyword => lowerText.includes(keyword))) {
      const themeName = keywordGroup[0].charAt(0).toUpperCase() + keywordGroup[0].slice(1);
      themes.push(themeName);
    }
  }

  if (lowerText.includes("formation") || lowerText.includes("compétence")) {
    themes.push("Formation et développement");
  }

  if (lowerText.includes("reconnaissance") || lowerText.includes("valorisation")) {
    themes.push("Reconnaissance du travail");
  }

  return themes.length > 0 ? themes.slice(0, 5) : ["Amélioration générale"];
}

function analyzeSentiment(text: string): string {
  const lowerText = text.toLowerCase();

  const positiveWords = ["bien", "bon", "excellent", "satisfait", "content", "apprécié", "amélioration", "progrès", "merci"];
  const negativeWords = ["problème", "difficile", "mauvais", "inquiet", "stress", "fatigue", "surcharge", "conflit", "manque"];

  let positiveCount = 0;
  let negativeCount = 0;

  positiveWords.forEach(word => {
    const matches = lowerText.match(new RegExp(word, "g"));
    if (matches) positiveCount += matches.length;
  });

  negativeWords.forEach(word => {
    const matches = lowerText.match(new RegExp(word, "g"));
    if (matches) negativeCount += matches.length;
  });

  if (positiveCount > negativeCount * 1.5) return "positive";
  if (negativeCount > positiveCount * 1.5) return "negative";
  return "neutral";
}

function identifyQVCTTopics(text: string, category: string): string[] {
  const lowerText = text.toLowerCase();
  const topics: string[] = [];

  const qvctMapping: Record<string, string> = {
    "espace de travail": "Environnement physique",
    "équipement": "Ressources matérielles",
    "communication": "Dialogue social",
    "management": "Qualité managériale",
    "horaire": "Organisation temporelle",
    "charge de travail": "Intensité du travail",
    "stress": "Santé psychologique",
    "formation": "Développement professionnel",
    "reconnaissance": "Valorisation du travail",
    "autonomie": "Marges de manœuvre",
  };

  Object.entries(qvctMapping).forEach(([keyword, topic]) => {
    if (lowerText.includes(keyword)) {
      topics.push(topic);
    }
  });

  const categoryTopics: Record<string, string[]> = {
    conditions_travail: ["Environnement physique", "Ressources matérielles"],
    relations: ["Dialogue social", "Qualité managériale"],
    organisation: ["Organisation temporelle", "Intensité du travail"],
    sante: ["Santé psychologique", "Équilibre vie pro/perso"],
  };

  if (categoryTopics[category]) {
    categoryTopics[category].forEach(topic => {
      if (!topics.includes(topic)) {
        topics.push(topic);
      }
    });
  }

  return [...new Set(topics)].slice(0, 4);
}

function proposeActions(themes: string[], category: string): string[] {
  const actions: string[] = [];

  const actionMapping: Record<string, string> = {
    "espace": "Organiser un audit des espaces de travail avec les équipes concernées",
    "équipement": "Établir un plan d'investissement pour renouveler le matériel vieillissant",
    "communication": "Mettre en place des points d'échange réguliers entre équipes et management",
    "horaire": "Étudier la possibilité d'assouplir les horaires de travail",
    "charge": "Réaliser une analyse de la charge de travail par service",
    "stress": "Proposer des ateliers de gestion du stress et de relaxation",
    "formation": "Identifier les besoins en formation et établir un plan de développement",
    "reconnaissance": "Instaurer des moments de reconnaissance du travail accompli",
    "température": "Vérifier et optimiser le système de climatisation/chauffage",
    "bruit": "Identifier les sources de nuisances sonores et mettre en place des solutions",
  };

  themes.forEach(theme => {
    const themeKey = theme.toLowerCase();
    Object.entries(actionMapping).forEach(([keyword, action]) => {
      if (themeKey.includes(keyword) && !actions.includes(action)) {
        actions.push(action);
      }
    });
  });

  const generalActions: Record<string, string[]> = {
    conditions_travail: ["Planifier des visites de poste de travail avec la médecine du travail"],
    relations: ["Organiser des séances de team building pour renforcer la cohésion"],
    organisation: ["Optimiser les processus et réduire les tâches à faible valeur ajoutée"],
    sante: ["Mettre en place un programme de prévention santé au travail"],
  };

  if (generalActions[category] && actions.length < 3) {
    generalActions[category].forEach(action => {
      if (!actions.includes(action)) {
        actions.push(action);
      }
    });
  }

  return actions.slice(0, 5);
}

function generateSummary(title: string, text: string, themes: string[]): string {
  const messageCount = text.split("\n\n").length;
  const avgLength = text.length / messageCount;

  let engagement = "modérée";
  if (messageCount > 10 || avgLength > 150) {
    engagement = "forte";
  } else if (messageCount < 5 || avgLength < 50) {
    engagement = "faible";
  }

  const themesText = themes.length > 0
    ? `Les principaux thèmes abordés sont : ${themes.join(", ")}.`
    : "La discussion aborde plusieurs aspects de la qualité de vie au travail.";

  return `Cette discussion sur "${title}" a généré ${messageCount} message(s) avec une participation ${engagement}. ${themesText} Les échanges révèlent des préoccupations concrètes qui méritent une attention particulière et des actions de suivi.`;
}
