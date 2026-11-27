// La IA aprende de las respuestas del equipo (v34).
//
// Cada noche (pg_cron, { modo: 'cron' } + x-cron-secret) o a pedido
// ({ company_id } con la sesión de admin, director o colaborador):
//   1. junta los pares pregunta del cliente → respuesta humana de los
//      últimos 30 días (_shared/ai/aprendizaje.ts);
//   2. le pide a Claude que encuentre las preguntas que se repiten y
//      proponga una respuesta guardada con el estilo del equipo;
//   3. guarda las propuestas en knowledge_suggestions como PENDIENTES.
// Nada se publica solo: una persona revisa y publica desde la tarjeta
// del asistente. El costo se reserva y liquida en el presupuesto de la
// empresa (use_case 'aprendizaje').
// Se despliega con --no-verify-jwt; la autorización se valida aquí.
// deno-lint-ignore-file no-explicit-any
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AnthropicProvider } from '../_shared/ai/anthropic.ts';
import { SupabaseLedger } from '../_shared/ai/ledger.ts';
import { costoMaximoUsd } from '../_shared/ai/models.ts';
import { escaparDatos, estimarTokens } from '../_shared/ai/context.ts';
import {
  armarPares, ESQUEMA_APRENDIZAJE, filtrarPropuestas, type MensajeHist, type Propuesta, SISTEMA_APRENDIZAJE,
} from '../_shared/ai/aprendizaje.ts';

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const DIAS = 30;
const MAX_PARES = 120;
const MAX_SALIDA = 2500;
const MIN_PARES = 4;   // con menos no hay repeticiones que valga la pena buscar

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

async function aprender(svc: SupabaseClient, companyId: number) {
  const desde = new Date(Date.now() - DIAS * 86_400_000).toISOString();
  const { data: mensajes, error } = await svc.from('messages')
    .select('id, conversation_id, direction, sender_type, content, sent_at')
    .eq('company_id', companyId).eq('legacy_ai_suggestion', false).gte('sent_at', desde)
    .order('conversation_id').order('sent_at').limit(5000);
  if (error) return { company_id: companyId, error: `mensajes: ${error.message}` };

  // Los más recientes primero, con tope.
  const pares = armarPares((mensajes ?? []) as MensajeHist[]).slice(-MAX_PARES);
  if (pares.length < MIN_PARES) return { company_id: companyId, pares: pares.length, nuevas: 0, motivo: 'pocos pares' };

  const [{ data: entradas }, { data: pendientes }] = await Promise.all([
    svc.from('knowledge_entries').select('title').eq('company_id', companyId).is('deleted_at', null),
    svc.from('knowledge_suggestions').select('question').eq('company_id', companyId).in('status', ['pendiente', 'borrador', 'descartada']),
  ]);
  const existentes = [...(entradas ?? []).map((e: any) => e.title), ...(pendientes ?? []).map((s: any) => s.question)];

  const contenido =
    `<ya_guardadas>\n${existentes.map((t) => `- ${escaparDatos(t)}`).join('\n') || '(ninguna)'}\n</ya_guardadas>\n` +
    `<pares>\n${pares.map((p, i) => `[${i}] Cliente: ${escaparDatos(p.pregunta)}\n    Equipo: ${escaparDatos(p.respuesta)}`).join('\n')}\n</pares>`;

  const ledger = new SupabaseLedger(svc);
  const limites = await ledger.limits(companyId);
  if (!limites || limites.suspended) return { company_id: companyId, error: 'IA suspendida o sin límites' };
  const modelo = limites.defaultModel;
  const reserva = await ledger.reserve({
    companyId, useCase: 'aprendizaje', modelId: modelo.modelId,
    estCostUsd: costoMaximoUsd(modelo, estimarTokens(SISTEMA_APRENDIZAJE + contenido), MAX_SALIDA + modelo.reasoningAllowance),
  });
  if (reserva.usageId === null) return { company_id: companyId, error: `sin presupuesto: ${reserva.motivo}` };

  const res = await new AnthropicProvider(ANTHROPIC_KEY, { timeoutMs: 90_000, maxRetries: 0 }).complete({
    model: modelo, system: SISTEMA_APRENDIZAJE, messages: [{ role: 'user', content: contenido }],
    maxOutputTokens: MAX_SALIDA, jsonSchema: ESQUEMA_APRENDIZAJE as unknown as Record<string, unknown>,
  });
  await ledger.settle({
    usageId: reserva.usageId, inputTokens: res.inputTokens, outputTokens: res.outputTokens,
    latencyMs: res.latencyMs, status: res.ok ? 'liquidada' : 'fallida', errorKind: res.error?.kind ?? null,
  });
  if (!res.ok) return { company_id: companyId, error: `proveedor: ${res.error?.kind} ${res.error?.detail ?? ''}` };

  let propuestas: Propuesta[] = [];
  try { propuestas = JSON.parse(res.text).sugerencias ?? []; } catch { return { company_id: companyId, error: 'salida inválida' }; }
  const sugerencias = filtrarPropuestas(propuestas, pares, existentes);
  if (sugerencias.length) {
    const { error: errIns } = await svc.from('knowledge_suggestions')
      .insert(sugerencias.map((s) => ({ ...s, company_id: companyId })));
    if (errIns) return { company_id: companyId, error: `guardar: ${errIns.message}` };
  }
  return { company_id: companyId, pares: pares.length, propuestas: propuestas.length, nuevas: sugerencias.length };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);
  if (!ANTHROPIC_KEY) return json({ error: 'La IA no está configurada' }, 503);

  const svc = createClient(SUPABASE_URL, SERVICE_ROLE);
  const body = await req.json().catch(() => ({}));

  const secreto = req.headers.get('x-cron-secret');
  if (secreto) {
    const { data: ok } = await svc.rpc('cron_secret_ok', { p_secret: secreto });
    if (ok !== true) return json({ error: 'No autorizado' }, 401);
    // Empresas con el asistente encendido (asistido o automático).
    // { company_id } opcional: ejecución manual de soporte para una sola empresa.
    let consulta = svc.from('ai_assistants').select('company_id').neq('mode', 'manual');
    if (Number(body.company_id)) consulta = consulta.eq('company_id', Number(body.company_id));
    const { data: asistentes } = await consulta;
    const resultados = [];
    for (const a of asistentes ?? []) {
      try { resultados.push(await aprender(svc, a.company_id)); }
      catch (e) { resultados.push({ company_id: a.company_id, error: (e as Error).message }); }
    }
    console.log('[ia-aprendizaje]', JSON.stringify(resultados));
    return json({ ok: true, resultados });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'No autorizado' }, 401);
  const supaUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await supaUser.auth.getUser();
  if (!user) return json({ error: 'Sesión inválida' }, 401);
  const companyId = Number(body.company_id);
  if (!companyId) return json({ error: 'Falta company_id' }, 400);
  const [{ data: rol }, { data: empresa }] = await Promise.all([supaUser.rpc('my_role'), supaUser.rpc('my_company_id')]);
  const permitido = rol === 'super_admin' || (empresa === companyId && ['company_admin', 'director', 'collaborator'].includes(rol));
  if (!permitido) return json({ error: 'No autorizado' }, 403);

  const r: any = await aprender(svc, companyId);
  if (r.error) {
    console.error('[ia-aprendizaje]', companyId, r.error);
    return json({ error: 'No se pudo analizar ahora. Intenta más tarde.' }, 502);
  }
  return json(r);
});
