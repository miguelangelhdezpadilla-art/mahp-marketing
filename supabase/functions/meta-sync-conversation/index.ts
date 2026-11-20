// Trae de Meta el historial reciente de UNA conversación (Messenger o
// Instagram) y guarda lo que falte en `messages`, incluidos los
// mensajes que el negocio escribió desde la app de Meta y los
// adjuntos (imágenes, video, audio, archivos → bucket social-media).
//
// Límite de Meta: la Conversations API solo devuelve el detalle de los
// 20 mensajes más recientes de cada conversación. Lo anterior no se
// puede recuperar por API.
//
// Igual que meta-send-message: el navegador la invoca con la sesión
// del usuario, se valida esa sesión y el RLS decide si puede ver la
// conversación; el Page Access Token solo se lee aquí con service role.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { guardarAdjunto, tipoDeAdjunto, urlDeAdjunto } from '../_shared/metaMedia.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GRAPH        = 'https://graph.facebook.com/v26.0';

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

async function graph(path: string, params: Record<string, string>) {
  const url = new URL(`${GRAPH}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const data = await res.json();
  if (!res.ok || data.error) {
    const e = new Error(data.error?.message ?? `Graph ${res.status}`) as Error & { code?: number };
    e.code = data.error?.code;
    throw e;
  }
  return data;
}

// Campos del mensaje. Si Meta rechaza algún subcampo (#100, varía entre
// Messenger e Instagram), se reintenta con el mínimo.
const CAMPOS_COMPLETOS = 'id,created_time,from,to,message,shares,attachments{mime_type,name,image_data,video_data,file_url}';
const CAMPOS_MINIMOS   = 'id,created_time,from,to,message,attachments';

async function mensajesDeMeta(metaConvId: string, token: string) {
  try {
    return await graph(`/${metaConvId}`, { fields: `messages.limit(20){${CAMPOS_COMPLETOS}}`, access_token: token });
  } catch (e) {
    if ((e as { code?: number }).code !== 100) throw e;
    return await graph(`/${metaConvId}`, { fields: `messages.limit(20){${CAMPOS_MINIMOS}}`, access_token: token });
  }
}

const VENTANA_DUPLICADO_MS = 3 * 60 * 1000;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'No autorizado' }, 401);

  const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
  if (userError || !user) return json({ error: 'Sesión inválida' }, 401);

  const { conversation_id } = await req.json().catch(() => ({}));
  if (!conversation_id) return json({ error: 'Falta conversation_id' }, 400);

  // RLS del usuario: si no es de su empresa, no existe para él.
  const { data: conv } = await supabaseUser
    .from('conversations')
    .select('id, company_id, channel, customer_id, meta_thread_id')
    .eq('id', conversation_id)
    .maybeSingle();
  if (!conv || !conv.meta_thread_id) return json({ error: 'Conversación no encontrada' }, 404);

  const service = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: pagina } = await service
    .from('company_meta_pages')
    .select('page_id, linked_page_id, page_access_token')
    .eq('company_id', conv.company_id)
    .eq('channel', conv.channel)
    .eq('active', true)
    .maybeSingle();
  if (!pagina) return json({ error: 'Esta empresa no tiene una página de Meta conectada' }, 409);

  // Con Facebook Login, las conversaciones de Instagram se consultan
  // desde la página de Facebook vinculada, no desde la cuenta de IG.
  const fbPageId = conv.channel === 'instagram' ? pagina.linked_page_id : pagina.page_id;
  if (!fbPageId) return json({ error: 'Falta la página de Facebook vinculada a esta cuenta de Instagram. Vuelve a conectar la cuenta.' }, 409);

  let mensajesMeta: any[] = [];
  try {
    const lista = await graph(`/${fbPageId}/conversations`, {
      platform: conv.channel === 'instagram' ? 'instagram' : 'messenger',
      user_id: conv.meta_thread_id,
      fields: 'id',
      access_token: pagina.page_access_token,
    });
    const metaConvId = lista.data?.[0]?.id;
    if (!metaConvId) return json({ ok: true, importados: 0, total: 0 });
    const detalle = await mensajesDeMeta(metaConvId, pagina.page_access_token);
    mensajesMeta = detalle.messages?.data ?? [];
  } catch (e) {
    console.error('[meta-sync-conversation]', conv.channel, (e as Error).message);
    return json({ error: `Meta no devolvió el historial: ${(e as Error).message}` }, 502);
  }

  // Lo que ya está guardado, para no duplicar. Instagram no siempre usa
  // el mismo id en el webhook y en la Conversations API, así que además
  // del mid se compara dirección + texto + hora aproximada.
  const { data: existentes } = await service
    .from('messages')
    .select('meta_message_id, direction, content, sent_at')
    .eq('conversation_id', conv.id);
  const mids = new Set((existentes ?? []).map(m => m.meta_message_id).filter(Boolean));
  const yaGuardado = (direccion: string, texto: string, cuando: number) =>
    (existentes ?? []).some(m =>
      m.direction === direccion && texto && m.content === texto &&
      Math.abs(new Date(m.sent_at).getTime() - cuando) < VENTANA_DUPLICADO_MS);

  let importados = 0;
  let nombreCliente: string | null = null;

  // Meta los da del más nuevo al más viejo; se guardan en orden.
  for (const m of [...mensajesMeta].reverse()) {
    const entrante = String(m.from?.id) === String(conv.meta_thread_id);
    if (entrante && !nombreCliente) {
      nombreCliente = m.from?.name ?? (m.from?.username ? `@${m.from.username}` : null);
    }
    const direccion = entrante ? 'inbound' : 'outbound';
    const cuando = new Date(m.created_time).getTime();
    let texto: string = m.message ?? '';
    const adjuntos = (m.attachments?.data ?? [])
      .map((a: any) => ({ tipo: tipoDeAdjunto(a), url: urlDeAdjunto(a) }))
      .filter((a: { url: string | null }) => a.url);
    if (!texto && !adjuntos.length) {
      if (m.shares?.data?.length) texto = '(Compartió una publicación)';
      else continue;
    }

    if (mids.has(m.id) || yaGuardado(direccion, texto, cuando)) continue;

    const filas = adjuntos.length ? adjuntos : [{ tipo: 'text', url: null }];
    for (let i = 0; i < filas.length; i++) {
      const mid = i === 0 ? m.id : `${m.id}#${i}`;
      if (mids.has(mid)) continue;
      const media = filas[i].url
        ? await guardarAdjunto(service, filas[i].url!, conv.company_id, conv.id, m.id, i)
        : null;
      const { data: guardada, error } = await service.from('messages').upsert({
        conversation_id: conv.id,
        company_id: conv.company_id,
        direction: direccion,
        sender_type: entrante ? 'cliente' : 'agente',
        sender_id: m.from?.id ?? null,
        content: i === 0 ? texto : '',
        message_type: filas[i].tipo,
        media_url: media,
        meta_message_id: mid,
        sent_at: new Date(cuando).toISOString(),
      }, { onConflict: 'meta_message_id', ignoreDuplicates: true }).select('id');
      if (error) console.error('[meta-sync-conversation] No se guardó un mensaje', error.message);
      else if (guardada?.length) importados++;
    }
  }

  // Instagram no da el nombre del perfil sin permisos avanzados, pero la
  // conversación sí trae el @usuario: se usa solo si no había nombre.
  if (nombreCliente) {
    await service.from('customers').update({ full_name: nombreCliente })
      .eq('id', conv.customer_id).is('full_name', null);
  }

  return json({ ok: true, importados, total: mensajesMeta.length });
});
