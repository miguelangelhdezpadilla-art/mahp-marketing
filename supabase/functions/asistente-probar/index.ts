// "Probar mi asistente" (MPS-002-004 E5, ADR-022 salvaguarda 3): la
// empresa escribe una pregunta como si fuera un cliente y ve qué
// contestaría la IA con su conocimiento publicado, y si en modo
// automático se enviaría sola o se transferiría a una persona. No envía
// nada a Meta. Cuenta como uso 'playground' en el presupuesto.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AnthropicProvider } from '../_shared/ai/anthropic.ts';
import { SupabaseLedger } from '../_shared/ai/ledger.ts';
import { sugerirRespuesta } from '../_shared/ai/engine.ts';
import {
  adjuntosParaEnviar, buscarConocimiento, registroFuentes, respuestaGuardada, textoFragmento,
} from '../_shared/ai/knowledge.ts';
import { decidirEnvio } from '../_shared/ai/autopilot.ts';
import { cargarParesRecientes, elegirEjemplosEstilo } from '../_shared/ai/aprendizaje.ts';

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MAX_PREGUNTA = 1000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const MENSAJES: Record<string, string> = {
  sin_presupuesto: 'Se alcanzó el límite de IA de tu empresa. Intenta más tarde.',
  tope_conversacion: 'Hiciste muchas pruebas en la última hora. Intenta más tarde.',
  error_proveedor: 'La IA no respondió. Intenta de nuevo.',
  sin_configuracion: 'La IA no está disponible en este momento.',
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

    const { pregunta, company_id: companyPedida } = await req.json();
    if (!pregunta || typeof pregunta !== 'string' || !pregunta.trim()) return json({ error: 'Escribe una pregunta' }, 400);
    if (pregunta.length > MAX_PREGUNTA) return json({ error: 'La pregunta es demasiado larga' }, 400);

    // Misma regla que generar-calendario: la empresa sale de la sesión;
    // solo super_admin (sin empresa propia) puede indicar cuál abrió.
    const { data: rol } = await supabaseUser.rpc('my_role');
    let { data: companyId } = await supabaseUser.rpc('my_company_id');
    if (!companyId && rol === 'super_admin') {
      const pedida = Number(companyPedida);
      if (Number.isInteger(pedida) && pedida > 0) companyId = pedida;
    }
    if (!companyId) return json({ error: 'Tu cuenta no tiene una empresa activa' }, 403);
    if (rol !== 'super_admin' && rol !== 'company_admin') return json({ error: 'Solo el administrador puede probar el asistente' }, 403);
    if (!ANTHROPIC_KEY) return json({ error: 'La IA no está configurada' }, 503);

    const svc = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: asistente } = await svc.from('ai_assistants')
      .select('min_confidence, handoff_message').eq('company_id', companyId).maybeSingle();

    // Tope de pruebas: se cuentan las de la última hora de esta empresa.
    const haceUnaHora = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await svc.from('ai_responses').select('id', { count: 'exact', head: true })
      .eq('company_id', companyId).eq('source', 'playground').gte('created_at', haceUnaHora);

    const fragmentos = await buscarConocimiento(svc, companyId, pregunta);
    const estilo = elegirEjemplosEstilo(await cargarParesRecientes(svc, companyId), pregunta);
    const r = await sugerirRespuesta({
      companyId, conversationId: null, mensaje: pregunta.trim(), historial: [],
      // Las pruebas usan un tope propio y más amplio que el de conversación.
      generacionesUltimaHora: Math.max(0, (count ?? 0) - 20),
      fuentes: fragmentos.map(textoFragmento), estilo, useCase: 'playground',
    }, { provider: new AnthropicProvider(ANTHROPIC_KEY), ledger: new SupabaseLedger(svc) });

    if (r.desenlace === 'omitido') {
      return json({ omitido: true, motivo: 'Es un saludo o un agradecimiento: en una conversación real la IA no lo contesta.' });
    }
    if (!r.analisis) return json({ error: MENSAJES[r.desenlace] ?? 'No se pudo probar. Intenta de nuevo.' }, 429);
    const guardada = r.desenlace === 'propuesta' ? respuestaGuardada(fragmentos, r.analisis.fuentes_usadas) : null;
    if (guardada) r.borrador = guardada;

    const decision = decidirEnvio({
      modo: 'automatico', interruptorGlobal: true, pausaEmpresa: false, pausaConversacion: false,
      desenlace: r.desenlace, analisis: r.analisis,
      minConfianza: Number(asistente?.min_confidence ?? 0.8), dentroDeVentana: true,
      respuestasAutoUltimaHora: 0, maxAutoPorHora: 99, hayMensajeMasNuevo: false,
      hayMensajeTransferencia: !!asistente?.handoff_message?.trim(),
    });

    const fuentes = registroFuentes(fragmentos, r.analisis.fuentes_usadas);
    const { data: fila } = await svc.from('ai_responses').insert({
      company_id: companyId, conversation_id: null, source: 'playground', mode_at_generation: 'automatico',
      draft: r.borrador ?? '', status: r.desenlace === 'bloqueada' ? 'bloqueada' : 'propuesta',
      blocked_reason: r.desenlace === 'bloqueada' ? r.motivo : null,
      intent: r.analisis.intencion, confidence: r.analisis.confianza, needs_human: r.analisis.requiere_humano,
      decision_reason: `${r.motivo} · decisión simulada: ${decision.motivo}`, retrieved: fuentes,
      model: r.modelo, input_tokens: r.inputTokens, output_tokens: r.outputTokens,
      latency_ms: r.latencyMs, est_cost_usd: r.costoUsd, reviewed_by: user.id,
    }).select('id').single();
    if (fila) await new SupabaseLedger(svc).link(r.usageIds, fila.id);

    // Requisito para activar el automático: probar después del último cambio.
    await svc.from('ai_assistants').update({ last_playground_at: new Date().toISOString() }).eq('company_id', companyId);

    return json({
      respuesta: r.borrador ?? '',
      bloqueada: r.desenlace === 'bloqueada' ? r.motivo : null,
      confianza: r.analisis.confianza,
      requiere_humano: r.analisis.requiere_humano,
      motivo_humano: r.analisis.motivo_humano,
      intencion: r.analisis.intencion,
      fuentes: fuentes.map((f) => ({ titulo: f.titulo, usada: f.usada })),
      automatico: decision.accion,          // enviar | transferir | nada
      motivo_automatico: decision.motivo,
      mensaje_transferencia: asistente?.handoff_message ?? null,
      respuesta_guardada: !!guardada,
      // Archivos que acompañan la respuesta (en automático y al aprobarla en la bandeja).
      adjuntos: r.desenlace === 'propuesta'
        ? adjuntosParaEnviar(fragmentos, r.analisis.fuentes_usadas).map((x) => x.label || x.file_name)
        : [],
    });
  } catch (err) {
    console.error('[asistente-probar]', err);
    return json({ error: 'Error interno' }, 500);
  }
});
