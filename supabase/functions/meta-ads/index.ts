// Campañas de Meta Ads → meta_ads_campaigns / meta_ads_daily (v33).
//
// Formas de llamarla:
//   * pg_cron, una vez al día: { modo: 'cron' } + encabezado
//     x-cron-secret (cron_secret_ok, v29). Sincroniza todas las empresas.
//   * Con la sesión del usuario: { company_id, action }
//       - 'sync'   → actualiza ahora (admin, director o super_admin)
//       - 'choose' → { ad_account_id } elige la cuenta publicitaria
//                    entre las que Meta devolvió (admin o super_admin)
// Se despliega con --no-verify-jwt (pg_cron no tiene JWT); la
// autorización se valida aquí.
//
// La llave (user_token, permiso ads_read) la guarda meta-oauth al
// reconectar Facebook. Dura ~60 días; si Meta la invalida (código 190)
// el estado pasa a token_invalido y el panel pide reconectar.
// deno-lint-ignore-file no-explicit-any
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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
    }
    return json(await sincronizar(service, { ...fila, ad_account_id: cuenta.id }));
  }

  if (body.action === 'sync') {
    if (!puedeVer) return json({ error: 'No autorizado' }, 403);
    if (!fila.ad_account_id) return json({ error: 'Primero elige la cuenta publicitaria.' }, 409);
    const r = await sincronizar(service, fila);
    return r.error ? json({ error: `Meta rechazó la consulta: ${r.error}` }, 502) : json(r);
  }

  return json({ error: 'Acción no válida' }, 400);
});
