
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
    const eventCode = cleanText(event.queryStringParameters?.event_code, 80);
    if (!eventCode) return response(400, { error: "event_code é obrigatório." });

    const events = await supabase(
      `game_events?event_code=eq.${encodeURIComponent(eventCode)}&select=id,name,event_code,contract,active&limit=1`
    );
    if (!events?.length) return response(404, { error: "Evento não encontrado." });
    const activeEvent = events[0];

    const sessions = await supabase(
      `game_sessions?event_id=eq.${activeEvent.id}&completed=eq.true&select=graduate_id,score,elevens_confirmed,created_at`
    );

    const graduateIds = [...new Set((sessions || []).map(item => item.graduate_id))];
    let graduates = [];
    if (graduateIds.length) {
      graduates = await supabase(`graduates?id=in.(${graduateIds.join(",")})&select=id,name,display_name`);
    }
    const graduateMap = new Map(graduates.map(item => [item.id, item]));

    const totals = new Map();
    for (const item of sessions || []) {
      const current = totals.get(item.graduate_id) || {
        graduate_id: item.graduate_id,
        graduate_name: graduateMap.get(item.graduate_id)?.display_name || graduateMap.get(item.graduate_id)?.name || "Formando",
        best_score: 0,
        elevens_total: 0,
        completed_games: 0
      };
      current.best_score = Math.max(current.best_score, Number(item.score || 0));
      current.elevens_total += Number(item.elevens_confirmed || 0);
      current.completed_games += 1;
      totals.set(item.graduate_id, current);
    }

    const accumulated = [...totals.values()]
      .sort((a, b) => b.elevens_total - a.elevens_total || b.best_score - a.best_score)
      .map((item, index) => ({ position: index + 1, ...item }));

    const records = [...totals.values()]
      .sort((a, b) => b.best_score - a.best_score || b.elevens_total - a.elevens_total)
      .map((item, index) => ({ position: index + 1, ...item }));

    return response(200, {
      event: activeEvent,
      accumulated,
      records,
      total_completed_sessions: sessions?.length || 0
    });
  } catch (error) {
    console.error(error);
    return response(500, { error: "Não foi possível carregar o ranking.", detail: error.message });
  }
}
