// Estadísticas de Meta (Facebook Page Insights + Instagram Insights)
// → meta_insights_daily / meta_content_insights (v29).
//
// Dos formas de llamarla:
//   * pg_cron, una vez al día: { modo: 'cron' } + encabezado
//     x-cron-secret, validado contra Vault con cron_secret_ok(). Procesa
//     todas las conexiones activas.
//   * La bandeja/panel, con la sesión del usuario: { company_id } —
//     solo su empresa (my_companies()).
// Se despliega con --no-verify-jwt (pg_cron no tiene JWT); la
// autorización se valida aquí en ambos casos.
//
// Meta cambia o retira métricas con frecuencia. Cada métrica se pide
// de forma tolerante: si Meta rechaza una, se registra en
// `no_disponibles` y el resto se guarda igual.
//
// Permisos: Facebook → read_insights + pages_read_engagement;
// Instagram → instagram_basic + instagram_manage_insights.
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GRAPH        = 'https://graph.facebook.com/v26.0';

// Aguascalientes: UTC-6 sin horario de verano (desde 2022). Los días
// se cortan a medianoche local.
const OFFSET_HORAS = -6;
const DIA_MS = 86_400_000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

class GraphError extends Error {
  constructor(message: string, readonly code?: number) { super(message); }
}

// Los tokens viajan en la URL: nunca registrar la URL en logs.
async function graph(path: string, params: Record<string, string>) {
  const url = new URL(`${GRAPH}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new GraphError(data.error?.message ?? `Meta respondió ${res.status}`, data.error?.code);
  return data;
}

// ── Fechas ──────────────────────────────────────────────────────
// Inicio (UTC, en segundos) del día local `fecha` (YYYY-MM-DD).
function inicioDiaLocal(fecha: string): number {
  return Math.floor((Date.parse(`${fecha}T00:00:00Z`) - OFFSET_HORAS * 3_600_000) / 1000);
}
function hoyLocal(): string {
  return new Date(Date.now() + OFFSET_HORAS * 3_600_000).toISOString().slice(0, 10);
}
function sumarDias(fecha: string, n: number): string {
  return new Date(Date.parse(`${fecha}T00:00:00Z`) + n * DIA_MS).toISOString().slice(0, 10);
}
// end_time de Meta (period=day) marca el FIN del día: el día medido es
// el anterior.
function diaDeEndTime(endTime: string): string {
  return new Date(Date.parse(endTime) - DIA_MS + OFFSET_HORAS * 3_600_000 + 12 * 3_600_000)
    .toISOString().slice(0, 10);
}

type Fila = { metric: string; breakdown: string; date: string; value: number };

interface Contexto {
  service: SupabaseClient;
  companyId: number;
  channel: 'facebook' | 'instagram';
  pageId: string;
  token: string;
  filas: Fila[];
  noDisponibles: Set<string>;
  errores: string[];
}

function anotarError(ctx: Contexto, que: string, e: unknown) {
  const err = e as GraphError;
  // 100 = métrica/campo inválido para esta cuenta o versión; 10/200 = permiso.
  if (err.code === 100) ctx.noDisponibles.add(que);
  else ctx.errores.push(`${que}: ${err.message}`);
}

// ── Facebook ────────────────────────────────────────────────────
const METRICAS_FB = [
  'page_media_view',               // visualizaciones (reemplazo de impresiones)
  'page_total_media_view_unique',  // personas que vieron
  'page_post_engagements',
  'page_video_views',              // reproducciones de 3 s
  'page_video_views_unique',
  'page_video_complete_views_30s',
  'page_daily_follows_unique',
  'page_daily_unfollows_unique',
  'page_follows',                  // total de seguidores
  'page_views_total',
];

async function insightsFacebook(ctx: Contexto, desde: string, hasta: string) {
  // period=day admite rangos de hasta 90 días.
  for (let ini = desde; ini <= hasta; ini = sumarDias(ini, 90)) {
    const fin = [sumarDias(ini, 89), hasta].sort()[0];
    await Promise.all(METRICAS_FB.map(async (metric) => {
      try {
        const data = await graph(`/${ctx.pageId}/insights`, {
          metric, period: 'day',
          since: String(inicioDiaLocal(ini)),
          until: String(inicioDiaLocal(sumarDias(fin, 1))),
          access_token: ctx.token,
        });
        for (const serie of data.data ?? []) {
          for (const v of serie.values ?? []) {
            const date = diaDeEndTime(v.end_time);
            if (typeof v.value === 'number') {
              ctx.filas.push({ metric, breakdown: '', date, value: v.value });
            } else if (v.value && typeof v.value === 'object') {
              for (const [k, n] of Object.entries(v.value)) {
                if (typeof n === 'number') ctx.filas.push({ metric, breakdown: k, date, value: n });
              }
            }
          }
        }
      } catch (e) { anotarError(ctx, `facebook.${metric}`, e); }
    }));
  }

  try {
    const p = await graph(`/${ctx.pageId}`, { fields: 'followers_count,fan_count', access_token: ctx.token });
    if (typeof p.followers_count === 'number') {
      ctx.filas.push({ metric: 'followers_count', breakdown: '', date: hoyLocal(), value: p.followers_count });
    }
  } catch (e) { anotarError(ctx, 'facebook.followers_count', e); }
}

async function contenidoFacebook(ctx: Contexto) {
  let posts: any[] = [];
  try {
    const data = await graph(`/${ctx.pageId}/posts`, {
      fields: 'id,message,created_time,permalink_url,full_picture,status_type',
      limit: '30',
      access_token: ctx.token,
    });
    posts = data.data ?? [];
  } catch (e) { anotarError(ctx, 'facebook.posts', e); return; }

  const METRICAS_POST = ['post_media_view', 'post_impressions_unique', 'post_clicks', 'post_reactions_by_type_total', 'post_video_views'];
  const filas = await Promise.all(posts.map(async (p) => {
    const metrics: Record<string, unknown> = {};
    await Promise.all(METRICAS_POST.map(async (metric) => {
      try {
        const d = await graph(`/${p.id}/insights`, { metric, access_token: ctx.token });
        const v = d.data?.[0]?.values?.[0]?.value;
        if (v != null) metrics[metric] = v;
      } catch (e) { anotarError(ctx, `facebook.${metric}`, e); }
    }));
    return {
      company_id: ctx.companyId, channel: 'facebook', page_id: ctx.pageId,
      media_id: p.id, media_type: p.status_type ?? 'post',
      caption: (p.message ?? '').slice(0, 500), permalink: p.permalink_url ?? null,
      thumbnail_url: p.full_picture ?? null, published_at: p.created_time ?? null,
      metrics, updated_at: new Date().toISOString(),
    };
  }));
  if (filas.length) {
    const { error } = await ctx.service.from('meta_content_insights').upsert(filas, { onConflict: 'channel,media_id' });
    if (error) ctx.errores.push(`guardar contenido facebook: ${error.message}`);
  }
}

// ── Instagram ───────────────────────────────────────────────────
const METRICAS_IG_TOTAL = ['views', 'reach', 'accounts_engaged', 'total_interactions', 'likes', 'comments', 'shares', 'saves', 'profile_views', 'follows_and_unfollows'];
const DESGLOSES_IG = [
  { metric: 'views', breakdown: 'follower_type' },      // seguidores vs no seguidores
  { metric: 'views', breakdown: 'media_product_type' }, // reels, publicaciones, historias
  { metric: 'reach', breakdown: 'follower_type' },
];

async function totalesIgDia(ctx: Contexto, fecha: string, metricas: string[]) {
  const params = {
    metric: metricas.join(','), metric_type: 'total_value', period: 'day',
    since: String(inicioDiaLocal(fecha)), until: String(inicioDiaLocal(sumarDias(fecha, 1))),
    access_token: ctx.token,
  };
  const data = await graph(`/${ctx.pageId}/insights`, params);
  for (const m of data.data ?? []) {
    const tv = m.total_value;
    if (!tv) continue;
    if (typeof tv.value === 'number') ctx.filas.push({ metric: m.name, breakdown: '', date: fecha, value: tv.value });
    for (const b of tv.breakdowns ?? []) {
      for (const r of b.results ?? []) {
        ctx.filas.push({
          metric: m.name,
          breakdown: `${(b.dimension_keys ?? []).join('+')}:${(r.dimension_values ?? []).join('+')}`,
          date: fecha, value: Number(r.value) || 0,
        });
      }
    }
  }
}

async function insightsInstagram(ctx: Contexto, desde: string, hasta: string) {
  // Instagram solo da ~30 días hacia atrás.
  const limite = sumarDias(hoyLocal(), -29);
  if (desde < limite) desde = limite;

  let validas = [...METRICAS_IG_TOTAL];
  const dias: string[] = [];
  for (let d = desde; d <= hasta; d = sumarDias(d, 1)) dias.push(d);

  for (const fecha of dias) {
    try {
      await totalesIgDia(ctx, fecha, validas);
    } catch (e) {
      if ((e as GraphError).code !== 100) { anotarError(ctx, 'instagram.totales', e); break; }
      // Alguna métrica no existe para esta cuenta/versión: se prueban
      // una por una y se sigue solo con las válidas.
      const ok: string[] = [];
      for (const m of validas) {
        try { await totalesIgDia(ctx, fecha, [m]); ok.push(m); }
        catch (e2) { anotarError(ctx, `instagram.${m}`, e2); }
      }
      validas = ok;
      if (!validas.length) break;
    }
    for (const d of DESGLOSES_IG) {
      if (ctx.noDisponibles.has(`instagram.${d.metric}.${d.breakdown}`)) continue;
      try {
        const data = await graph(`/${ctx.pageId}/insights`, {
          metric: d.metric, metric_type: 'total_value', period: 'day', breakdown: d.breakdown,
          since: String(inicioDiaLocal(fecha)), until: String(inicioDiaLocal(sumarDias(fecha, 1))),
          access_token: ctx.token,
        });
        for (const m of data.data ?? []) {
          for (const b of m.total_value?.breakdowns ?? []) {
            for (const r of b.results ?? []) {
              ctx.filas.push({
                metric: m.name,
                breakdown: `${d.breakdown}:${(r.dimension_values ?? []).join('+')}`,
                date: fecha, value: Number(r.value) || 0,
              });
            }
          }
        }
      } catch (e) { anotarError(ctx, `instagram.${d.metric}.${d.breakdown}`, e); }
    }
  }

  // Seguidores nuevos por día (serie, últimos 30 días sin hoy).
  try {
    const data = await graph(`/${ctx.pageId}/insights`, {
      metric: 'follower_count', period: 'day',
      since: String(inicioDiaLocal(desde)), until: String(inicioDiaLocal(sumarDias(hasta, 1))),
      access_token: ctx.token,
    });
    for (const v of data.data?.[0]?.values ?? []) {
      if (typeof v.value === 'number') ctx.filas.push({ metric: 'follower_count', breakdown: '', date: diaDeEndTime(v.end_time), value: v.value });
    }
  } catch (e) { anotarError(ctx, 'instagram.follower_count', e); }

  try {
    const p = await graph(`/${ctx.pageId}`, { fields: 'followers_count,follows_count,media_count', access_token: ctx.token });
    const hoy = hoyLocal();
    for (const k of ['followers_count', 'media_count']) {
      if (typeof p[k] === 'number') ctx.filas.push({ metric: k, breakdown: '', date: hoy, value: p[k] });
    }
  } catch (e) { anotarError(ctx, 'instagram.followers_count', e); }
}

async function contenidoInstagram(ctx: Contexto) {
  let medias: any[] = [];
  try {
    const data = await graph(`/${ctx.pageId}/media`, {
      fields: 'id,caption,media_type,media_product_type,permalink,thumbnail_url,media_url,timestamp,like_count,comments_count',
      limit: '30',
      access_token: ctx.token,
    });
    medias = data.data ?? [];
  } catch (e) { anotarError(ctx, 'instagram.media', e); return; }

  const filas = await Promise.all(medias.map(async (m) => {
    const metrics: Record<string, unknown> = { likes: m.like_count, comments: m.comments_count };
    for (const lista of [['views', 'reach', 'saved', 'shares', 'total_interactions'], ['reach']]) {
      try {
        const d = await graph(`/${m.id}/insights`, { metric: lista.join(','), access_token: ctx.token });
        for (const x of d.data ?? []) {
          const v = x.values?.[0]?.value ?? x.total_value?.value;
          if (v != null) metrics[x.name] = v;
        }
        break;
      } catch (e) {
        if ((e as GraphError).code !== 100) { anotarError(ctx, 'instagram.media_insights', e); break; }
      }
    }
    return {
      company_id: ctx.companyId, channel: 'instagram', page_id: ctx.pageId,
      media_id: m.id, media_type: m.media_product_type === 'REELS' ? 'REELS' : m.media_type,
      caption: (m.caption ?? '').slice(0, 500), permalink: m.permalink ?? null,
      thumbnail_url: m.thumbnail_url ?? m.media_url ?? null, published_at: m.timestamp ?? null,
      metrics, updated_at: new Date().toISOString(),
    };
  }));
  if (filas.length) {
    const { error } = await ctx.service.from('meta_content_insights').upsert(filas, { onConflict: 'channel,media_id' });
    if (error) ctx.errores.push(`guardar contenido instagram: ${error.message}`);
  }
}

// ── Una conexión ────────────────────────────────────────────────
// v30: cada red conectada tiene su canal en social_channels (panel de
// seguidores y metas). Si la empresa no lo tiene, se crea ligado.
async function asegurarCanal(service: SupabaseClient, companyId: number, channel: string) {
  const { data } = await service.from('social_channels').select('id')
    .eq('company_id', companyId).eq('meta_channel', channel).maybeSingle();
  if (data) return;
  const { error } = await service.from('social_channels').insert({
    company_id: companyId,
    name: channel === 'facebook' ? 'Facebook' : 'Instagram',
    icon: channel === 'facebook' ? '📘' : '📸',
    meta_channel: channel,
  });
  // 23505: otra corrida lo creó al mismo tiempo.
  if (error && error.code !== '23505') console.error('[meta-insights] crear canal', channel, error.message);
}

async function procesarConexion(service: SupabaseClient, c: any) {
  await asegurarCanal(service, c.company_id, c.channel);
  const ctx: Contexto = {
    service, companyId: c.company_id, channel: c.channel, pageId: c.page_id,
    token: c.page_access_token, filas: [], noDisponibles: new Set(), errores: [],
  };

  // Primera corrida para esta cuenta: se trae historia (FB 90 días,
  // IG 30). Después, solo los últimos 3 días (Meta ajusta cifras
  // recientes).
  const { count } = await service.from('meta_insights_daily')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', c.company_id).eq('channel', c.channel).eq('page_id', c.page_id);
  const hasta = sumarDias(hoyLocal(), -1);
  const desde = sumarDias(hasta, count ? -2 : (c.channel === 'facebook' ? -89 : -29));

  if (c.channel === 'facebook') {
    await insightsFacebook(ctx, desde, hasta);
    await contenidoFacebook(ctx);
  } else {
    await insightsInstagram(ctx, desde, hasta);
    await contenidoInstagram(ctx);
  }

  // Una fila por clave (la última gana) y guardado en lotes.
  const unicas = new Map<string, Fila>();
  for (const f of ctx.filas) unicas.set(`${f.metric}|${f.breakdown}|${f.date}`, f);
  const filas = [...unicas.values()].map(f => ({
    company_id: c.company_id, channel: c.channel, page_id: c.page_id,
    metric: f.metric, breakdown: f.breakdown, date: f.date, value: f.value,
    fetched_at: new Date().toISOString(),
  }));
  for (let i = 0; i < filas.length; i += 500) {
    const { error } = await service.from('meta_insights_daily')
      .upsert(filas.slice(i, i + 500), { onConflict: 'company_id,channel,page_id,metric,breakdown,date' });
    if (error) ctx.errores.push(`guardar métricas: ${error.message}`);
  }

  if (ctx.errores.length) console.error('[meta-insights]', c.channel, c.page_id, ctx.errores.slice(0, 5));
  return {
    company_id: c.company_id, channel: c.channel, desde, hasta,
    filas: filas.length,
    no_disponibles: [...ctx.noDisponibles],
    errores: ctx.errores.slice(0, 10),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);

  const service = createClient(SUPABASE_URL, SERVICE_ROLE);
  const body = await req.json().catch(() => ({}));
  let companyIds: number[] | null = null;

  const secretoCron = req.headers.get('x-cron-secret');
  if (secretoCron) {
    const { data: ok } = await service.rpc('cron_secret_ok', { p_secret: secretoCron });
    if (ok !== true) return json({ error: 'No autorizado' }, 401);
  } else {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'No autorizado' }, 401);
    const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return json({ error: 'Sesión inválida' }, 401);
    const companyId = Number(body.company_id);
    if (!companyId) return json({ error: 'Falta company_id' }, 400);
    const { data: mias } = await supabaseUser.rpc('my_companies');
    const permitida = (mias ?? []).some((c: any) => Number(c.company_id ?? c.id) === companyId);
    if (!permitida) return json({ error: 'No autorizado' }, 403);
    companyIds = [companyId];
  }

  let consulta = service.from('company_meta_pages')
    .select('company_id, channel, page_id, page_access_token')
    .eq('active', true);
  if (companyIds) consulta = consulta.in('company_id', companyIds);
  const { data: conexiones, error } = await consulta;
  if (error) return json({ error: 'No se pudieron leer las conexiones' }, 500);

  const resultados = [];
  for (const c of conexiones ?? []) {
    try { resultados.push(await procesarConexion(service, c)); }
    catch (e) {
      console.error('[meta-insights] conexión', c.channel, c.page_id, (e as Error).message);
      resultados.push({ company_id: c.company_id, channel: c.channel, errores: [(e as Error).message] });
    }
  }
  return json({ ok: true, resultados });
});
