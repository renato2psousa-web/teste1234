
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

function assertConfig() {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    throw new Error("Variáveis SUPABASE_URL e SUPABASE_SECRET_KEY não configuradas.");
  }
}

async function supabase(path, options = {}) {
  assertConfig();
  const result = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {})
    }
  });

  const text = await result.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!result.ok) {
    const message = data?.message || data?.error || `Erro Supabase ${result.status}`;
    throw new Error(message);
  }
  return data;
}

function cleanText(value, max = 120) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

function randomCode(length = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = "";
  for (let i = 0; i < length; i++) {
    value += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return value;
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return response(204, {});
  if (event.httpMethod !== "GET") return response(405, { error: "Método não permitido." });

  try {
    const resultCode = cleanText(event.queryStringParameters?.code, 20).toUpperCase();
    if (!resultCode) return response(400, { error: "code é obrigatório." });

    const sessions = await supabase(
      `game_sessions?result_code=eq.${encodeURIComponent(resultCode)}&select=id,result_code,event_id,graduate_id,helper_name,score,elevens_collected,completion_bonus,elevens_confirmed,completed,duration_seconds,created_at&limit=1`
    );
    if (!sessions?.length) return response(404, { error: "Resultado não encontrado." });
    const session = sessions[0];

    const [graduates, events] = await Promise.all([
      supabase(`graduates?id=eq.${session.graduate_id}&select=id,name,display_name,contract&limit=1`),
      supabase(`game_events?id=eq.${session.event_id}&select=id,name,event_code,contract&limit=1`)
    ]);

    return response(200, {
      ...session,
      graduate: graduates?.[0] || null,
      event: events?.[0] || null
    });
  } catch (error) {
    console.error(error);
    return response(500, { error: "Não foi possível carregar o resultado.", detail: error.message });
  }
}
