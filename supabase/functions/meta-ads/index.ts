// Campañas de Meta Ads → meta_ads_campaigns / meta_ads_daily (v33).
//
// Formas de llamarla:
//   * pg_cron, una vez al día: { modo: 'cron' } + encabezado
//     x-cron-secret (cron_secret_ok, v29). Sincroniza todas las empresas.
//   * Con la sesión del usuario: { company_id, action }
//       - 'sync'   → actualiza ahora (admin, director o super_admin)
//       - 'choose' → { ad_account_id } elige la cuenta publicitaria
//                    entre las que Meta devolvió (admin o super_admin)
//       - 'add'    → { ad_account_id } agrega una cuenta por su ID
//       - 'analizar' → Claude escribe el análisis con proyección (v35;
//                    admin, director o super_admin; se cobra a la IA)
// Cada sincronización trae además las recomendaciones de Meta y el
// puntaje de oportunidad (meta_ads_analysis, v35); si Meta no las da,
// las cifras se guardan igual.
// Se despliega con --no-verify-jwt (pg_cron no tiene JWT); la
// autorización se valida aquí.
//
// La llave (user_token, permiso ads_read) la guarda meta-oauth al
// reconectar Facebook. Dura ~60 días; si Meta la invalida (código 190)
// el estado pasa a token_invalido y el panel pide reconectar.
// deno-lint-ignore-file no-explicit-any
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AnthropicProvider } from '../_shared/ai/anthropic.ts';
import { SupabaseLedger } from '../_shared/ai/ledger.ts';
import { costoMaximoUsd } from '../_shared/ai/models.ts';
import { escaparDatos, estimarTokens } from '../_shared/ai/context.ts';
import {
  armarDatos, ESQUEMA_CAMPANAS, normalizarRecomendaciones, proyectar, SISTEMA_CAMPANAS, validarAnalisisCampanas,
} from '../_shared/ai/campanas.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const MAX_SALIDA_ANALISIS = 1500;
const ESPERA_ANALISIS_MS = 10 * 60_000; // un análisis cada 10 minutos por empresa
const GRAPH        = 'https://graph.facebook.com/v26.0';
const DIAS         = 62; // dos periodos de 30 días + margen para comparar
const ACCION_CONVERSACION = 'onsite_conversion.messaging_conversation_started_7d';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

class GraphError extends Error {
  constructor(message: string, readonly code?: number) { super(message); }
}

// La llave viaja como parámetro: nunca registrar la URL.
async function graph(url: string): Promise<any> {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new GraphError(data.error?.message ?? `Meta respondió ${res.status}`, data.error?.code);
  return data;
}

async function todasLasPaginas(primera: string): Promise<any[]> {
  const filas: any[] = [];
  let url: string | null = primera;
  for (let i = 0; url && i < 20; i++) {
    const data = await graph(url);
    filas.push(...(data.data ?? []));
    url = data.paging?.next ?? null;
  }
  return filas;
}

const fechaISO = (d: Date) => d.toISOString().slice(0, 10);

async function sincronizar(service: SupabaseClient, fila: any) {
  const { company_id, ad_account_id: act, user_token: token } = fila;
  const t = encodeURIComponent(token);
  try {
    const campanas = await todasLasPaginas(
      `${GRAPH}/${act}/campaigns?fields=id,name,effective_status,objective&limit=200&access_token=${t}`,
    );
    if (campanas.length) {
      const { error } = await service.from('meta_ads_campaigns').upsert(campanas.map((c) => ({
        company_id, campaign_id: c.id, name: c.name, effective_status: c.effective_status ?? null,
        objective: c.objective ?? null, updated_at: new Date().toISOString(),
      })), { onConflict: 'company_id,campaign_id' });
      if (error) throw new Error(`guardar campañas: ${error.message}`);
    }

    const hasta = new Date();
    const desde = new Date(hasta.getTime() - DIAS * 86_400_000);
    const rango = encodeURIComponent(JSON.stringify({ since: fechaISO(desde), until: fechaISO(hasta) }));
    const insights = await todasLasPaginas(
      `${GRAPH}/${act}/insights?level=campaign&time_increment=1&time_range=${rango}` +
      `&fields=campaign_id,campaign_name,spend,impressions,reach,clicks,actions&limit=500&access_token=${t}`,
    );
    const filas = insights.map((i) => ({
      company_id,
      campaign_id: i.campaign_id,
      fecha: i.date_start,
      spend: Number(i.spend ?? 0),
      conversations: Number((i.actions ?? []).find((a: any) => a.action_type === ACCION_CONVERSACION)?.value ?? 0),
      impressions: Number(i.impressions ?? 0),
      reach: Number(i.reach ?? 0),
      clicks: Number(i.clicks ?? 0),
      updated_at: new Date().toISOString(),
    }));
    // Campañas que solo aparecen en insights (p. ej. borradas): que tengan nombre.
    const conocidas = new Set(campanas.map((c) => c.id));
    const faltantes = [...new Map(insights.filter((i) => !conocidas.has(i.campaign_id))
      .map((i) => [i.campaign_id, { company_id, campaign_id: i.campaign_id, name: i.campaign_name ?? i.campaign_id }])).values()];
    if (faltantes.length) {
      await service.from('meta_ads_campaigns').upsert(faltantes, { onConflict: 'company_id,campaign_id', ignoreDuplicates: true });
    }
    for (let i = 0; i < filas.length; i += 500) {
      const { error } = await service.from('meta_ads_daily').upsert(filas.slice(i, i + 500), { onConflict: 'company_id,campaign_id,fecha' });
      if (error) throw new Error(`guardar cifras: ${error.message}`);
    }

    await guardarRecomendaciones(service, company_id, act, t);

    await service.from('company_meta_ads').update({
      status: 'conectada', last_error: null, last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq('company_id', company_id);
    return { company_id, campanas: campanas.length, filas: filas.length };
  } catch (e) {
    const err = e as GraphError;
    await service.from('company_meta_ads').update({
      status: err.code === 190 ? 'token_invalido' : 'error',
      last_error: err.message.slice(0, 500), updated_at: new Date().toISOString(),
    }).eq('company_id', company_id);
    console.error('[meta-ads]', company_id, err.code, err.message);
    return { company_id, error: err.message };
  }
}

// Recomendaciones de Meta y puntaje de oportunidad. Opcional: si Meta
// no las da (permiso, versión, cuenta sin datos) se anota el motivo y la
// sincronización sigue.
async function guardarRecomendaciones(service: SupabaseClient, companyId: number, act: string, t: string) {
  const fila: Record<string, unknown> = { company_id: companyId, ad_account_id: act, updated_at: new Date().toISOString() };
  const errores: string[] = [];
  try {
    fila.recommendations = normalizarRecomendaciones(await graph(`${GRAPH}/${act}/recommendations?access_token=${t}`));
    fila.recommendations_at = new Date().toISOString();
  } catch (e) { errores.push(`recomendaciones: ${(e as Error).message}`); }
  try {
    const c = await graph(`${GRAPH}/${act}?fields=opportunity_score&access_token=${t}`);
    const n = Number(c.opportunity_score);
    fila.opportunity_score = c.opportunity_score != null && Number.isFinite(n) ? n : null;
  } catch (e) { errores.push(`puntaje: ${(e as Error).message}`); }
  fila.recommendations_error = errores.length ? errores.join(' · ').slice(0, 500) : null;
  if (errores.length) console.warn('[meta-ads] recomendaciones', companyId, fila.recommendations_error);
  const { error } = await service.from('meta_ads_analysis').upsert(fila, { onConflict: 'company_id' });
  if (error) console.error('[meta-ads] guardar recomendaciones', companyId, error.message);
}

const ayerEnMexico = () => new Date(Date.now() - 86_400_000).toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });

async function analizar(service: SupabaseClient, fila: any, userId: string): Promise<{ status: number; body: unknown }> {
  const companyId = fila.company_id;
  const { data: previo } = await service.from('meta_ads_analysis')
    .select('recommendations, opportunity_score, analysis_at').eq('company_id', companyId).maybeSingle();
  if (previo?.analysis_at && Date.now() - Date.parse(previo.analysis_at) < ESPERA_ANALISIS_MS) {
    return { status: 429, body: { error: 'El análisis se actualizó hace unos minutos. Intenta de nuevo en un rato.' } };
  }
  const ayer = ayerEnMexico();
  const desde = new Date(Date.parse(`${ayer}T12:00:00Z`) - 13 * 86_400_000).toISOString().slice(0, 10);
  const [{ data: campanas }, { data: diarias }] = await Promise.all([
    service.from('meta_ads_campaigns').select('campaign_id, name, effective_status').eq('company_id', companyId),
    service.from('meta_ads_daily').select('campaign_id, fecha, spend, conversations, impressions, clicks')
      .eq('company_id', companyId).gte('fecha', desde).lte('fecha', ayer),
  ]);
  if (!(diarias ?? []).some((d: any) => Number(d.spend) > 0)) {
    return { status: 409, body: { error: 'No hay gasto en las últimas 2 semanas: no hay nada que analizar.' } };
  }
  const proyeccion = proyectar((diarias ?? []) as any, ayer);
  const datos = armarDatos((campanas ?? []) as any, (diarias ?? []) as any, ayer,
    previo?.recommendations ?? [], previo?.opportunity_score ?? null, proyeccion);
  const contenido = `<datos>\n${escaparDatos(datos)}\n</datos>`;

  const ledger = new SupabaseLedger(service);
  const limites = await ledger.limits(companyId);
  if (!limites || limites.suspended) return { status: 503, body: { error: 'La IA está suspendida para esta empresa.' } };
  const modelo = limites.defaultModel;
  const reserva = await ledger.reserve({
    companyId, useCase: 'campanas', modelId: modelo.modelId, userId,
    estCostUsd: costoMaximoUsd(modelo, estimarTokens(SISTEMA_CAMPANAS + contenido), MAX_SALIDA_ANALISIS + modelo.reasoningAllowance),
  });
  if (reserva.usageId === null) return { status: 402, body: { error: 'Se agotó el presupuesto de IA de hoy.' } };
  const res = await new AnthropicProvider(ANTHROPIC_KEY, { timeoutMs: 60_000, maxRetries: 1 }).complete({
    model: modelo, system: SISTEMA_CAMPANAS, messages: [{ role: 'user', content: contenido }],
    maxOutputTokens: MAX_SALIDA_ANALISIS, jsonSchema: ESQUEMA_CAMPANAS as unknown as Record<string, unknown>,
  });
  await ledger.settle({
    usageId: reserva.usageId, inputTokens: res.inputTokens, outputTokens: res.outputTokens,
    latencyMs: res.latencyMs, status: res.ok ? 'liquidada' : 'fallida', errorKind: res.error?.kind ?? null,
  });
  if (!res.ok) {
    console.error('[meta-ads] analizar', companyId, res.error?.kind, res.error?.detail);
    return { status: 502, body: { error: 'No se pudo analizar ahora. Intenta más tarde.' } };
  }
  const analisis = validarAnalisisCampanas(res.text, datos);
  if (!analisis) return { status: 502, body: { error: 'El análisis salió incompleto. Intenta de nuevo.' } };
  if (analisis.quitadas) console.warn('[meta-ads] analizar: frases con cifras sin fuente descartadas', companyId, analisis.quitadas);
  const { error } = await service.from('meta_ads_analysis').upsert({
    company_id: companyId, ad_account_id: fila.ad_account_id,
    analysis: { ...analisis, proyeccion_cifras: proyeccion, periodo_hasta: ayer },
    analysis_model: modelo.modelId, analysis_at: new Date().toISOString(), analysis_by: userId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'company_id' });
  if (error) return { status: 500, body: { error: `No se pudo guardar: ${error.message}` } };
  return { status: 200, body: { ok: true } };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);

  const service = createClient(SUPABASE_URL, SERVICE_ROLE);
  const body = await req.json().catch(() => ({}));

  // ── pg_cron ──
  const secretoCron = req.headers.get('x-cron-secret');
  if (secretoCron) {
    const { data: ok } = await service.rpc('cron_secret_ok', { p_secret: secretoCron });
    if (ok !== true) return json({ error: 'No autorizado' }, 401);
    const { data: filas } = await service.from('company_meta_ads')
      .select('company_id, ad_account_id, user_token')
      .not('ad_account_id', 'is', null).in('status', ['conectada', 'error']);
    const resultados = [];
    for (const f of filas ?? []) resultados.push(await sincronizar(service, f));
    return json({ ok: true, resultados });
  }

  // ── Usuario ──
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'No autorizado' }, 401);
  const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await supabaseUser.auth.getUser();
  if (!user) return json({ error: 'Sesión inválida' }, 401);

  const companyId = Number(body.company_id);
  if (!companyId) return json({ error: 'Falta company_id' }, 400);
  const [{ data: rol }, { data: empresa }] = await Promise.all([
    supabaseUser.rpc('my_role'), supabaseUser.rpc('my_company_id'),
  ]);
  const suya = rol === 'super_admin' || empresa === companyId;
  const puedeVer = suya && (rol === 'super_admin' || rol === 'company_admin' || rol === 'director');
  const puedeElegir = suya && (rol === 'super_admin' || rol === 'company_admin');

  const { data: fila } = await service.from('company_meta_ads')
    .select('company_id, ad_account_id, user_token, accounts').eq('company_id', companyId).maybeSingle();
  if (!fila) return json({ error: 'Esta empresa no tiene una cuenta publicitaria conectada.' }, 404);

  // Agregar por ID una cuenta que Meta no listó: se comprueba que la
  // llave guardada pueda leerla antes de aceptarla.
  if (body.action === 'add') {
    if (!puedeElegir) return json({ error: 'Solo el administrador puede agregar cuentas publicitarias.' }, 403);
    const limpio = String(body.ad_account_id ?? '').trim().replace(/^act_/, '');
    if (!/^\d{5,25}$/.test(limpio)) return json({ error: 'Escribe el ID numérico de la cuenta publicitaria.' }, 400);
    let cuenta: any;
    try {
      const a = await graph(`${GRAPH}/act_${limpio}?fields=id,name,currency&access_token=${encodeURIComponent(fila.user_token)}`);
      cuenta = { id: String(a.id), name: a.name, currency: a.currency ?? null };
    } catch (e) {
      console.warn('[meta-ads] agregar cuenta', limpio, (e as GraphError).code, (e as Error).message);
      return json({
        error: 'La conexión actual no tiene acceso a esa cuenta. Vuelve a conectar Facebook y, en la ventana de Meta, marca esa cuenta publicitaria.',
      }, 403);
    }
    const cuentas = [...(fila.accounts ?? []).filter((a: any) => a.id !== cuenta.id), cuenta];
    await service.from('company_meta_ads').update({ accounts: cuentas, updated_at: new Date().toISOString() }).eq('company_id', companyId);
    fila.accounts = cuentas;
    body.ad_account_id = cuenta.id;
    body.action = 'choose';
  }

  if (body.action === 'choose') {
    if (!puedeElegir) return json({ error: 'Solo el administrador puede elegir la cuenta publicitaria.' }, 403);
    const cuenta = (fila.accounts ?? []).find((a: any) => a.id === String(body.ad_account_id));
    if (!cuenta) return json({ error: 'Esa cuenta publicitaria no está entre las autorizadas.' }, 400);
    await service.from('company_meta_ads').update({
      ad_account_id: cuenta.id, ad_account_name: cuenta.name, currency: cuenta.currency ?? null,
      status: 'conectada', updated_at: new Date().toISOString(),
    }).eq('company_id', companyId);
    // Solo al cambiar a OTRA cuenta: las cifras de la anterior ya no aplican.
    if (fila.ad_account_id && fila.ad_account_id !== cuenta.id) {
      await service.from('meta_ads_daily').delete().eq('company_id', companyId);
      await service.from('meta_ads_campaigns').delete().eq('company_id', companyId);
      await service.from('meta_ads_analysis').delete().eq('company_id', companyId);
    }
    return json(await sincronizar(service, { ...fila, ad_account_id: cuenta.id }));
  }

  if (body.action === 'sync') {
    if (!puedeVer) return json({ error: 'No autorizado' }, 403);
    if (!fila.ad_account_id) return json({ error: 'Primero elige la cuenta publicitaria.' }, 409);
    const r = await sincronizar(service, fila);
    return r.error ? json({ error: `Meta rechazó la consulta: ${r.error}` }, 502) : json(r);
  }

  if (body.action === 'analizar') {
    if (!puedeVer) return json({ error: 'No autorizado' }, 403);
    if (!fila.ad_account_id) return json({ error: 'Primero elige la cuenta publicitaria.' }, 409);
    if (!ANTHROPIC_KEY) return json({ error: 'La IA no está configurada' }, 503);
    const r = await analizar(service, fila, user.id);
    return json(r.body, r.status);
  }

  return json({ error: 'Acción no válida' }, 400);
});
