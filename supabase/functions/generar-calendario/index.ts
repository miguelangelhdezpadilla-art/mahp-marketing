// Genera el calendario de contenido con Claude vía el AI Response
// Engine (MPS-002-004). H11: antes era un proxy abierto a Groq para
// cualquier sesión; ahora tiene límite de tamaño, tope por usuario,
// presupuesto de la empresa, registro en ai_usage y error genérico.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AnthropicProvider } from '../_shared/ai/anthropic.ts';
import { SupabaseLedger } from '../_shared/ai/ledger.ts';
import { costoMaximoUsd } from '../_shared/ai/models.ts';
import { estimarTokens } from '../_shared/ai/context.ts';

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const MAX_PROMPT = 12_000;          // caracteres
const MAX_SALIDA = 6_000;           // tokens: hasta 31 actividades en JSON (≈ $0.003 con Haiku)
const TIMEOUT_MS = 90_000;          // generar 6k tokens puede tardar más de 20 s
const MAX_POR_USUARIO_HORA = 20;

const SISTEMA = `Eres un planificador de contenido de marketing para redes sociales. Responde únicamente con el objeto JSON que se te pide, sin texto antes ni después y sin bloques de código.`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

const MENSAJES: Record<string, string> = {
  presupuesto_diario: 'Se alcanzó el límite diario de IA de tu empresa. Intenta mañana.',
  presupuesto_mensual: 'Se alcanzó el límite mensual de IA de tu empresa.',
  suspendida: 'La IA está suspendida para tu empresa.',
  tope_usuario: 'Hiciste demasiadas solicitudes en la última hora. Intenta más tarde.',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'No autorizado' }, 401);

    const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) return json({ error: 'Sesión inválida' }, 401);

    const { prompt, company_id: companyPedida } = await req.json();

    // La empresa sale de la sesión (empresa activa). Única excepción:
    // super_admin no pertenece a ninguna empresa y trabaja sobre la que
    // abrió (empresa.html?company_id=), así que puede indicarla en el
    // body; el gasto se carga al presupuesto de esa empresa.
    let { data: companyId } = await supabaseUser.rpc('my_company_id');
    if (!companyId) {
      const { data: rol } = await supabaseUser.rpc('my_role');
      const pedida = Number(companyPedida);
      if (rol === 'super_admin' && Number.isInteger(pedida) && pedida > 0) companyId = pedida;
    }
    if (!companyId) return json({ error: 'Tu cuenta no tiene una empresa activa' }, 403);

    if (!prompt || typeof prompt !== 'string') return json({ error: 'Falta el prompt' }, 400);
    if (prompt.length > MAX_PROMPT) return json({ error: 'La solicitud es demasiado larga' }, 400);

    if (!ANTHROPIC_KEY) return json({ error: 'La IA no está configurada' }, 503);

    const supabaseService = createClient(SUPABASE_URL, SERVICE_ROLE);
    const ledger = new SupabaseLedger(supabaseService);
    const limites = await ledger.limits(companyId);
    if (!limites) return json({ error: 'La IA no está disponible en este momento' }, 503);
    if (limites.suspended) return json({ error: MENSAJES.suspendida }, 429);

    const modelo = limites.defaultModel;
    const estimado = costoMaximoUsd(modelo, estimarTokens(SISTEMA + prompt), MAX_SALIDA + modelo.reasoningAllowance);
    const { data: reserva, error: errReserva } = await supabaseService.rpc('ai_reserve', {
      p_company_id: companyId, p_use_case: 'calendario', p_model_id: modelo.modelId,
      p_est_cost: estimado, p_user_id: user.id, p_conversation_id: null, p_max_user_hour: MAX_POR_USUARIO_HORA,
    });
    const fila = Array.isArray(reserva) ? reserva[0] : reserva;
    if (errReserva || !fila) {
      console.error('[generar-calendario] ai_reserve', errReserva?.message);
      return json({ error: 'La IA no está disponible en este momento' }, 503);
    }
    if (!fila.usage_id) return json({ error: MENSAJES[fila.motivo] ?? 'La IA no está disponible en este momento' }, 429);

    const res = await new AnthropicProvider(ANTHROPIC_KEY, { timeoutMs: TIMEOUT_MS, maxRetries: 0 }).complete({
      model: modelo,
      system: SISTEMA,
      messages: [{ role: 'user', content: prompt }],
      maxOutputTokens: MAX_SALIDA,
    });
    await ledger.settle({
      usageId: fila.usage_id, inputTokens: res.inputTokens, outputTokens: res.outputTokens,
      latencyMs: res.latencyMs, status: res.ok ? 'liquidada' : 'fallida', errorKind: res.error?.kind ?? null,
    });

    if (!res.ok) {
      // El detalle del proveedor queda en los logs, no se manda al navegador.
      console.error('[generar-calendario] proveedor', res.error);
      return json({ error: 'No se pudo generar el calendario. Intenta de nuevo.' }, 502);
    }

    // Misma forma que devolvía antes (js/shared/ia.js lee choices[0].message.content).
    return json({ choices: [{ message: { content: res.text } }] });
  } catch (err) {
    console.error('[generar-calendario]', err);
    return json({ error: 'Error interno' }, 500);
  }
});
