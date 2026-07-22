const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

async function supabase(path) {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error("Configuração do Supabase ausente.");
  const result = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${SUPABASE_SECRET_KEY}`
    }
  });
  const data = await result.json();
  if (!result.ok) throw new Error(data?.message || "Erro ao consultar o Supabase.");
  return data;
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return response(204, {});
  if (event.httpMethod !== "GET") return response(405, { error: "Método não permitido." });

  try {
    const eventCode = String(event.queryStringParameters?.event_code || "").trim();
    if (!eventCode) return response(400, { error: "event_code é obrigatório." });

    const events = await supabase(`game_events?event_code=eq.${encodeURIComponent(eventCode)}&active=eq.true&select=contract&limit=1`);
    if (!events?.length) return response(404, { error: "Evento não encontrado ou encerrado." });

    const graduates = await supabase(
      `graduates?contract=eq.${encodeURIComponent(events[0].contract)}&active=eq.true&select=id,name,display_name,contract&order=display_name.asc`
    );

    return response(200, { graduates });
  } catch (error) {
    console.error(error);
    return response(500, { error: "Não foi possível carregar os formandos.", detail: error.message });
  }
}
