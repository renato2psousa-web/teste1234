
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
  if (event.httpMethod !== "POST") return response(405, { error: "Método não permitido." });

  try {
    const body = JSON.parse(event.body || "{}");
    const eventCode = cleanText(body.event_code, 80);
    const graduateId = Number(body.graduate_id);
    const helperName = cleanText(body.helper_name, 80);
    const score = Math.floor(Number(body.score));
    const collected = Math.floor(Number(body.elevens_collected));
    const completed = Boolean(body.completed);
    const duration = Math.floor(Number(body.duration_seconds));

    if (!eventCode || !Number.isInteger(graduateId) || graduateId <= 0 || !helperName) {
      return response(400, { error: "Dados obrigatórios inválidos." });
    }
    if (!Number.isFinite(score) || score < 0 || score > 100000) {
      return response(400, { error: "Pontuação fora do limite permitido." });
    }
    if (!Number.isFinite(collected) || collected < 0 || collected > 500) {
      return response(400, { error: "Pontos Elevens fora do limite permitido." });
    }
    if (!Number.isFinite(duration) || duration < 0 || duration > 240) {
      return response(400, { error: "Duração da partida inválida." });
    }
    if (completed && duration < 145) {
      return response(400, { error: "Partida concluída com duração incompatível." });
    }

    const events = await supabase(
      `game_events?event_code=eq.${encodeURIComponent(eventCode)}&active=eq.true&select=id,completion_bonus,contract&limit=1`
    );
    if (!events?.length) return response(404, { error: "Evento não encontrado ou encerrado." });
    const activeEvent = events[0];

    const graduates = await supabase(
      `graduates?id=eq.${graduateId}&contract=eq.${encodeURIComponent(activeEvent.contract)}&active=eq.true&select=id,name,display_name&limit=1`
    );
    if (!graduates?.length) return response(404, { error: "Formando não encontrado neste evento." });
    const graduate = graduates[0];

    const bonus = completed ? Number(activeEvent.completion_bonus || 0) : 0;
    const confirmed = completed ? collected + bonus : 0;

    let resultCode = randomCode();
    for (let attempt = 0; attempt < 4; attempt++) {
      const existing = await supabase(`game_sessions?result_code=eq.${resultCode}&select=id&limit=1`);
      if (!existing?.length) break;
      resultCode = randomCode();
    }

    const inserted = await supabase("game_sessions", {
      method: "POST",
      body: JSON.stringify({
        result_code: resultCode,
        event_id: activeEvent.id,
        graduate_id: graduateId,
        helper_name: helperName,
        score,
        elevens_collected: collected,
        completion_bonus: bonus,
        elevens_confirmed: confirmed,
        completed,
        duration_seconds: duration
      })
    });

    return response(201, {
      ok: true,
      result_code: resultCode,
      graduate,
      score,
      elevens_collected: collected,
      completion_bonus: bonus,
      elevens_confirmed: confirmed,
      completed,
      session_id: inserted?.[0]?.id ?? null
    });
  } catch (error) {
    console.error(error);
    return response(500, { error: "Não foi possível salvar o resultado.", detail: error.message });
  }
}
