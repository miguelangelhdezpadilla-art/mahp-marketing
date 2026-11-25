// Webhook de Meta (Messenger + Instagram) para el Social AI Hub.
// Recibe mensajes entrantes, resuelve la empresa dueña por page_id
// (company_meta_pages, v21 — MAHP es multi-tenant, ADR-001), resuelve
// la identidad unificada del cliente (customer_identities, ADR-017)
// y guarda el mensaje. El análisis de IA corre en background (ver
// analizarConIA): el motor de eventos documentado en ADR-008/ADR-013
// (cola sobre Postgres + pg_cron) todavía no está construido en el
// esquema real, así que esto sigue siendo un atajo temporal explícito
// bajo ADR-016 (Progressive Infrastructure Strategy), no una
// implementación de la cadena de eventos del CIE — solo ya no bloquea
// la respuesta al webhook.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { guardarAdjunto, tipoDeAdjunto, urlDeAdjunto } from '../_shared/metaMedia.ts';
import { nombreDeContacto } from '../_shared/metaNombres.ts';
import { AnthropicProvider } from '../_shared/ai/anthropic.ts';
import { SupabaseLedger } from '../_shared/ai/ledger.ts';
import { sugerirRespuesta } from '../_shared/ai/engine.ts';
import type { Turno } from '../_shared/ai/context.ts';

const VERIFY_TOKEN  = Deno.env.get('META_VERIFY_TOKEN') ?? '';
const APP_SECRET     = Deno.env.get('META_APP_SECRET') ?? '';
const ANTHROPIC_KEY  = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// AI Response Engine (MPS-002-004): proveedor (Claude), presupuesto por
// empresa y validación viven en _shared/ai/. Sin ANTHROPIC_API_KEY no
// hay análisis; los mensajes se guardan igual.
const proveedorIA = ANTHROPIC_KEY ? new AnthropicProvider(ANTHROPIC_KEY) : null;

// Un error en una tarea de background (analizarConIA vía waitUntil) no
// tiene un request al que responder — sin este listener queda como
// rechazo no capturado en los logs de forma más confusa.
addEventListener('unhandledrejection', (ev) => {
  console.error('[Webhook] Error no capturado en tarea de background:', ev.reason);
  ev.preventDefault();
});

// Service role: esta función corre server-side y necesita leer
// company_meta_pages (sin política RLS para `authenticated` a
// propósito, v21) y escribir en tablas de varias empresas a la vez.
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

function handleVerification(req: Request): Response {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

// Verificación de firma X-Hub-Signature-256 (MIP-001 §6 / 08B-WEBHOOKS.md
// §2): nunca procesar un payload que no venga firmado por Meta con
// nuestro App Secret.
async function firmaValida(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  if (!signatureHeader || !APP_SECRET) return false;
  const [algo, hashHex] = signatureHeader.split('=');
  // sha256 siempre produce 64 caracteres hex — un valor de otra
  // longitud es un encabezado corrupto/no confiable, se descarta
  // antes de gastar el cómputo de HMAC.
  if (algo !== 'sha256' || !hashHex || hashHex.length !== 64) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(APP_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const computedHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (computedHex.length !== hashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < computedHex.length; i++) diff |= computedHex.charCodeAt(i) ^ hashHex.charCodeAt(i);
  return diff === 0;
}

// Resuelve la empresa dueña de un page_id (v21). Sin esto, un mensaje
// de la página de la Empresa B podría procesarse como si fuera de la
// Empresa A — ver hallazgo de la revisión de Fase 2.
async function resolverPagina(pageId: string, channel: string) {
  const { data } = await supabase
    .from('company_meta_pages')
    .select('company_id, page_id, linked_page_id, page_access_token')
    .eq('page_id', pageId)
    .eq('channel', channel)
    .eq('active', true)
    .maybeSingle();
  return data;
}

// Resuelve el customer unificado para una identidad de canal
// (ADR-017). No hay fusión automática entre canales todavía
// (MPS-002-002 §3, pendiente para MPS-002-003): cada identidad nueva
// crea un customer nuevo salvo que ya exista esa identidad exacta.
// sender.id es el PSID (page-scoped id) que Meta documenta como
// identificador estable de Messenger — no cambia entre mensajes del
// mismo usuario a la misma página.
async function resolverCustomer(companyId: number, channel: string, externalId: string, pagina: any) {
  const { data: existente } = await supabase
    .from('customer_identities')
    .select('customer_id')
    .eq('company_id', companyId)
    .eq('channel', channel)
    .eq('external_id', externalId)
    .maybeSingle();

  if (existente) return existente.customer_id;

  // Solo se pide el nombre a Meta al crear un customer nuevo — no en
  // cada mensaje de uno ya conocido.
  // Con Facebook Login, la página de Facebook vinculada es la que
  // consulta las conversaciones de Instagram (respaldo de nombre).
  const fbPageId = channel === 'instagram' ? pagina.linked_page_id : pagina.page_id;
  const displayName = await nombreDeContacto(channel, externalId, fbPageId, pagina.page_access_token);

  const { data: nuevoCustomer } = await supabase
    .from('customers')
    .insert({ company_id: companyId, full_name: displayName })
    .select('id')
    .single();

  await supabase.from('customer_identities').insert({
    customer_id: nuevoCustomer.id,
    company_id: companyId,
    channel,
    external_id: externalId,
    display_name: displayName,
  });

  return nuevoCustomer.id;
}

// Reabrir una conversación 'resuelto' cuando el cliente vuelve a
// escribir es un comportamiento de producto intencional (no un bug):
// un mismo hilo de Meta (meta_thread_id = PSID) representa una sola
// conversación continua con ese cliente en ese canal, nunca varias.
// reabrir=false para los ecos: que el negocio escriba no reabre una
// conversación resuelta.
async function resolverConversacion(companyId: number, customerId: number, channel: string, threadId: string, reabrir = true) {
  const { data: existente } = await supabase
    .from('conversations')
    .select('id, status')
    .eq('company_id', companyId)
    .eq('meta_thread_id', threadId)
    .maybeSingle();

  if (existente) {
    if (reabrir && existente.status === 'resuelto') {
      await supabase.from('conversations').update({ status: 'nuevo' }).eq('id', existente.id);
    }
    return existente.id;
  }

  const { data: nueva } = await supabase
    .from('conversations')
    .insert({
      company_id: companyId,
      customer_id: customerId,
      meta_thread_id: threadId,
      channel,
      status: 'nuevo',
    })
    .select('id')
    .single();

  return nueva.id;
}

// Análisis + borrador con el AI Response Engine. Se llama vía
// EdgeRuntime.waitUntil() (ver handleWebhook), nunca con await directo
// en el flujo del webhook: si Meta no recibe el 200 OK en unos
// segundos, reintenta la entrega y duplicaría mensajes.
//
// company_id sale de company_meta_pages (resuelto por page_id), nunca
// del cliente ni del modelo.
async function analizarConIA(convId: number, mensaje: string, companyId: number, triggerMessageId: number) {
  if (!proveedorIA || !mensaje) return;

  try {
    // Contexto mínimo: los últimos mensajes con texto, sin el actual.
    const { data: previos } = await supabase
      .from('messages')
      .select('direction, content')
      .eq('conversation_id', convId)
      .eq('legacy_ai_suggestion', false)
      .neq('id', triggerMessageId)
      .neq('content', '')
      .order('sent_at', { ascending: false })
      .limit(6);
    const historial: Turno[] = (previos ?? []).reverse().map((m) => ({
      autor: m.direction === 'inbound' ? 'cliente' : 'negocio',
      texto: m.content ?? '',
    }));

    const haceUnaHora = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await supabase
      .from('ai_responses')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', convId)
      .gte('created_at', haceUnaHora);

    const ledger = new SupabaseLedger(supabase);
    const r = await sugerirRespuesta({
      companyId, conversationId: convId, mensaje, historial,
      generacionesUltimaHora: count ?? 0,
      // Aún no existe la base de conocimientos (MPS-002-004 E4): sin
      // fuentes, la validación bloquea cualquier cifra en el borrador.
      fuentes: [],
    }, { provider: proveedorIA, ledger });

    if (!r.analisis) {
      const nivel = r.desenlace === 'error_proveedor' || r.desenlace === 'sin_configuracion' ? 'error' : 'info';
      console[nivel]('[IA]', r.desenlace, r.motivo, { convId, companyId });
      return;
    }

    const ia = r.analisis;
    await supabase
      .from('conversations')
      .update({
        ia_intencion: ia.intencion,
        ia_sentimiento: ia.sentimiento,
        ia_urgencia: ia.urgencia,
        ia_oportunidad: ia.oportunidad,
        ia_resumen: ia.resumen,
        ia_explicacion: ia.explicacion,
      })
      .eq('id', convId);

    // H1 (v26): la sugerencia NO es un mensaje enviado — vive en
    // ai_responses hasta que un humano la usa. Las bloqueadas también se
    // guardan (auditoría), pero la bandeja solo muestra 'propuesta'.
    const { data: guardada, error } = await supabase.from('ai_responses').insert({
      company_id: companyId,
      conversation_id: convId,
      trigger_message_id: triggerMessageId,
      source: 'webhook',
      mode_at_generation: 'asistido',
      draft: r.borrador ?? '',
      status: r.desenlace === 'bloqueada' ? 'bloqueada' : 'propuesta',
      blocked_reason: r.desenlace === 'bloqueada' ? r.motivo : null,
      intent: ia.intencion,
      confidence: ia.confianza,
      needs_human: ia.requiere_humano,
      decision_reason: r.motivo,
      model: r.modelo,
      input_tokens: r.inputTokens,
      output_tokens: r.outputTokens,
      latency_ms: r.latencyMs,
      est_cost_usd: r.costoUsd,
    }).select('id').single();
    // 23505 = ya existe una sugerencia para este mensaje (índice
    // único de v26): ejecución doble, no es un error real.
    if (error && error.code !== '23505') {
      console.error('[IA] No se pudo guardar la sugerencia:', error, { convId });
    }
    if (guardada) await ledger.link(r.usageIds, guardada.id);
  } catch (err) {
    console.error('[IA] Error al analizar:', err);
  }
}

async function handleWebhook(req: Request): Promise<Response> {
  const rawBody = await req.text();

  if (!(await firmaValida(rawBody, req.headers.get('X-Hub-Signature-256')))) {
    console.warn('[Webhook] Firma inválida, payload descartado');
    return new Response('Forbidden', { status: 403 });
  }

  const body = JSON.parse(rawBody);

  for (const entry of body.entry ?? []) {
    const channel = body.object === 'instagram' ? 'instagram' : 'facebook';
    const pageId = entry.id;
    const pagina = await resolverPagina(pageId, channel);

    if (!pagina) {
      console.warn('[Webhook] page_id sin empresa conectada, se ignora', { pageId, channel });
      continue;
    }

    for (const event of entry.messaging ?? []) {
      if (!event.message) continue;
      // Mensajes borrados o que Meta no puede mostrar: no hay nada que
      // guardar.
      if (event.message.is_deleted || event.message.is_unsupported) continue;

      // Eco (is_echo): mensaje que ENVIÓ el negocio — desde MAHP o
      // desde la app de Instagram/Messenger. Instagram los entrega
      // siempre. El cliente es el destinatario, no el remitente: antes
      // se trataba como mensaje entrante y creaba un "cliente" con el
      // id del propio negocio.
      const esEco = event.message.is_echo === true;
      const clienteId = esEco ? event.recipient?.id : event.sender?.id;
      if (!clienteId) continue;

      const texto = event.message.text ?? '';
      const metaMsgId = event.message.mid;
      const adjuntos = (event.message.attachments ?? [])
        .map((a: any) => ({ tipo: tipoDeAdjunto(a), url: urlDeAdjunto(a) }))
        .filter((a: { url: string | null }) => a.url);

      // Sin texto ni adjunto descargable (p. ej. una reacción): nada
      // que mostrar.
      if (!texto && !adjuntos.length) continue;

      const customerId = await resolverCustomer(pagina.company_id, channel, clienteId, pagina);
      const convId = await resolverConversacion(pagina.company_id, customerId, channel, clienteId, !esEco);

      // Un eco de un envío hecho desde MAHP ya lo guardó
      // meta-send-message con el mismo mid: el upsert de abajo lo
      // ignora. Solo queda nuevo lo que se escribió en la app de Meta.
      const { data: yaExiste } = await supabase
        .from('messages').select('id').eq('meta_message_id', metaMsgId).maybeSingle();
      if (yaExiste) continue;

      // Cada adjunto es su propia fila (así los muestra Meta); el texto,
      // si lo hay, va en la primera. El mid se repite con sufijo para
      // respetar el unique de meta_message_id.
      const filas = (adjuntos.length ? adjuntos : [{ tipo: 'text', url: null }]).map((a: any, i: number) => ({
        indice: i,
        tipo: a.tipo,
        url: a.url,
        content: i === 0 ? texto : '',
        mid: i === 0 ? metaMsgId : `${metaMsgId}#${i}`,
      }));

      let primeraId: number | null = null;
      for (const f of filas) {
        const media = f.url ? await guardarAdjunto(supabase, f.url, pagina.company_id, convId, metaMsgId, f.indice) : null;
        const { data: fila, error } = await supabase
          .from('messages')
          .upsert({
            conversation_id: convId,
            company_id: pagina.company_id,
            direction: esEco ? 'outbound' : 'inbound',
            sender_type: esEco ? 'agente' : 'cliente',
            sender_id: event.sender?.id ?? null,
            content: f.content,
            message_type: f.tipo,
            media_url: media,
            meta_message_id: f.mid,
            ...(event.timestamp ? { sent_at: new Date(event.timestamp).toISOString() } : {}),
          }, { onConflict: 'meta_message_id', ignoreDuplicates: true })
          .select('id')
          .maybeSingle();
        if (error) console.error('[Webhook] Error al guardar el mensaje:', error, { metaMsgId });
        if (f.indice === 0) primeraId = fila?.id ?? null;
      }

      // La IA solo analiza texto escrito por el cliente.
      if (esEco || !texto || !primeraId) continue;
      // @ts-ignore -- global del runtime de Supabase Edge Functions
      EdgeRuntime.waitUntil(analizarConIA(convId, texto, pagina.company_id, primeraId));
    }
  }

  return new Response('OK', { status: 200 });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'GET') return handleVerification(req);
  if (req.method === 'POST') return handleWebhook(req);
  return new Response('Method Not Allowed', { status: 405 });
});
