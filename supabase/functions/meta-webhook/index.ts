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

const VERIFY_TOKEN  = Deno.env.get('META_VERIFY_TOKEN') ?? '';
const APP_SECRET     = Deno.env.get('META_APP_SECRET') ?? '';
const GROQ_API_KEY   = Deno.env.get('GROQ_API_KEY') ?? '';
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const INTENCIONES = ['reserva', 'precio', 'queja', 'consulta', 'felicitacion', 'otro'];
const SENTIMIENTOS = ['positivo', 'neutro', 'negativo'];
const URGENCIAS = ['alta', 'media', 'baja'];

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
    .select('company_id, page_access_token')
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
async function resolverCustomer(companyId: number, channel: string, externalId: string, displayName: string | null) {
  const { data: existente } = await supabase
    .from('customer_identities')
    .select('customer_id')
    .eq('company_id', companyId)
    .eq('channel', channel)
    .eq('external_id', externalId)
    .maybeSingle();

  if (existente) return existente.customer_id;

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
async function resolverConversacion(companyId: number, customerId: number, channel: string, threadId: string) {
  const { data: existente } = await supabase
    .from('conversations')
    .select('id, status')
    .eq('company_id', companyId)
    .eq('meta_thread_id', threadId)
    .maybeSingle();

  if (existente) {
    if (existente.status === 'resuelto') {
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

function iaValida(ia: any): boolean {
  return (
    typeof ia === 'object' && ia !== null &&
    INTENCIONES.includes(ia.intencion) &&
    SENTIMIENTOS.includes(ia.sentimiento) &&
    URGENCIAS.includes(ia.urgencia) &&
    typeof ia.oportunidad === 'number' &&
    typeof ia.explicacion === 'string' && ia.explicacion.trim().length > 0
  );
}

// Análisis IA — vía Groq, el proveedor ya usado en este proyecto
// (js/shared/ia.js, supabase/functions/generar-calendario), no
// Anthropic: no existe ninguna integración de Anthropic en este
// código, se verificó antes de escribir esta función.
//
// Se llama vía EdgeRuntime.waitUntil() (ver handleWebhook), nunca con
// await directo en el flujo del webhook: si Meta no recibe el 200 OK
// en unos segundos, reintenta la entrega — y como Groq puede tardar
// más que eso bajo carga, esperarlo aquí habría sido la causa más
// probable de mensajes duplicados (hallazgo real de la revisión).
async function analizarConIA(convId: number, mensaje: string, companyId: number) {
  if (!GROQ_API_KEY || !mensaje) return;

  try {
    const prompt = `Analiza este mensaje de un cliente en redes sociales de un negocio.
Mensaje: "${mensaje}"

Responde SOLO con JSON válido sin texto adicional:
{
  "intencion": "reserva|precio|queja|consulta|felicitacion|otro",
  "sentimiento": "positivo|neutro|negativo",
  "urgencia": "alta|media|baja",
  "oportunidad": 85,
  "resumen": "Resumen en máximo 10 palabras",
  "explicacion": "Motivo breve y visible de esta clasificación",
  "respuesta_sugerida": "Respuesta natural y amigable para este mensaje"
}`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await res.json();
    const texto = data.choices?.[0]?.message?.content ?? '{}';
    const ia = JSON.parse(texto.replace(/```json/g, '').replace(/```/g, '').trim());

    // ADR-014: ninguna clasificación de IA sin motivo visible, y
    // además debe respetar los mismos valores que los check
    // constraints de `conversations` (v20) — si Groq devuelve una
    // clave fuera de catálogo o un tipo incorrecto, se descarta en
    // vez de dejar que el update falle silenciosamente contra la BD.
    if (!iaValida(ia)) {
      console.warn('[IA] Respuesta con forma inválida, se descarta la clasificación', { convId, ia });
      return;
    }

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

    if (ia.respuesta_sugerida) {
      await supabase.from('messages').insert({
        conversation_id: convId,
        company_id: companyId,
        direction: 'outbound',
        sender_type: 'ia',
        content: ia.respuesta_sugerida,
      });
    }
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

      const senderId = event.sender.id;
      const content = event.message.text ?? '';
      const metaMsgId = event.message.mid;

      // Mensajes sin texto (sticker/adjunto sin caption) — soporte de
      // medios no está en alcance todavía (no se pidió); se ignora en
      // vez de guardar una fila con content vacío.
      if (!content) continue;

      const customerId = await resolverCustomer(pagina.company_id, channel, senderId, null);
      const convId = await resolverConversacion(pagina.company_id, customerId, channel, senderId);

      // Idempotencia real (sin ventana de carrera): insert atómico con
      // ON CONFLICT DO NOTHING sobre messages.meta_message_id (unique
      // constraint, v23) en vez de "select, si no existe, insert" —
      // dos entregas concurrentes del mismo evento (Meta reintenta
      // ante cualquier fallo o demora) ya no pueden colarse las dos.
      // Si metaMsgId viene null (no debería, Meta lo documenta como
      // parte estándar de todo evento de mensaje), el constraint no
      // aplica entre sí — se inserta sin deduplicar ese caso.
      const { data: mensajeInsertado, error: insertError } = await supabase
        .from('messages')
        .upsert({
          conversation_id: convId,
          company_id: pagina.company_id,
          direction: 'inbound',
          sender_type: 'cliente',
          sender_id: senderId,
          content,
          meta_message_id: metaMsgId,
        }, { onConflict: 'meta_message_id', ignoreDuplicates: true })
        .select('id')
        .maybeSingle();

      if (insertError) {
        console.error('[Webhook] Error al guardar el mensaje:', insertError, { metaMsgId });
        continue;
      }

      if (!mensajeInsertado) {
        // ignoreDuplicates: no se insertó nada porque metaMsgId ya
        // existía — reintento de Meta, no se re-analiza con IA.
        console.log('[Webhook] Reintento de Meta detectado, ya procesado', { metaMsgId });
        continue;
      }

      // No se espera el análisis de IA — ver comentario en
      // analizarConIA. El webhook responde 200 OK apenas termina de
      // guardar los mensajes, sin esperar a Groq.
      // @ts-ignore -- global del runtime de Supabase Edge Functions
      EdgeRuntime.waitUntil(analizarConIA(convId, content, pagina.company_id));
    }
  }

  return new Response('OK', { status: 200 });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'GET') return handleVerification(req);
  if (req.method === 'POST') return handleWebhook(req);
  return new Response('Method Not Allowed', { status: 405 });
});
