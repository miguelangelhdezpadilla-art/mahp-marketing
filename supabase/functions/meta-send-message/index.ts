// Envía una respuesta saliente a Meta (Messenger/Instagram) desde el
// Social AI Hub. Existe como función separada — y no como fetch()
// directo desde js/shared/socialHub.js — porque el Page Access Token
// es un secreto: nunca puede vivir en código que corre en el
// navegador (CLAUDE.md §5, ADR-007). El cliente llama a esta función
// vía supabase.functions.invoke(), que adjunta el JWT de la sesión;
// aquí se valida esa sesión y se respeta RLS antes de tocar nada.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY       = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'No autorizado' }, 401);

  // Cliente con la sesión del usuario que llama: toda lectura de aquí
  // en adelante respeta RLS tal como la vería ese usuario en el
  // navegador — nunca se confía solo en el conversation_id del body.
  const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
  if (userError || !user) return json({ error: 'Sesión inválida' }, 401);

  const { conversation_id, content: contenidoCrudo, ai_response_id } = await req.json();
  if (!conversation_id || !contenidoCrudo || typeof contenidoCrudo !== 'string') {
    return json({ error: 'Falta conversation_id o content' }, 400);
  }
  const content = contenidoCrudo.trim();
  if (!content) return json({ error: 'El mensaje está vacío' }, 400);
  // Límite de texto de la Send API de Messenger/Instagram.
  if (content.length > 2000) return json({ error: 'El mensaje supera 2000 caracteres' }, 400);

  const { data: conv, error: convError } = await supabaseUser
    .from('conversations')
    .select('id, company_id, channel, customer_id')
    .eq('id', conversation_id)
    .single();

  if (convError || !conv) {
    // RLS ya filtró esto si el usuario no pertenece a la empresa —
    // no distinguimos "no existe" de "no autorizado" en la respuesta.
    return json({ error: 'Conversación no encontrada' }, 404);
  }

  const { data: identidad } = await supabaseUser
    .from('customer_identities')
    .select('external_id')
    .eq('customer_id', conv.customer_id)
    .eq('channel', conv.channel)
    .maybeSingle();

  if (!identidad) return json({ error: 'No se encontró la identidad del cliente en este canal' }, 404);

  // Si el agente está usando una sugerencia de IA, debe pertenecer a
  // esta conversación (RLS ya garantiza que es de su empresa) y seguir
  // pendiente. Se valida ANTES de enviar.
  let sugerencia: { id: number; draft: string } | null = null;
  if (ai_response_id != null) {
    const { data } = await supabaseUser
      .from('ai_responses')
      .select('id, draft, status, conversation_id')
      .eq('id', ai_response_id)
      .maybeSingle();
    if (!data || data.conversation_id !== conv.id) {
      return json({ error: 'La sugerencia no pertenece a esta conversación' }, 400);
    }
    if (data.status !== 'propuesta' && data.status !== 'legacy') {
      return json({ error: 'Esa sugerencia ya fue usada o descartada' }, 409);
    }
    sugerencia = { id: data.id, draft: data.draft };
  }

  // Service role solo para dos cosas: leer el token de la página
  // (company_meta_pages no tiene política RLS para `authenticated`, v21)
  // y escribir messages/ai_responses (el navegador no puede, v26). Todo
  // lo anterior ya se validó con la sesión y el RLS del usuario.
  const supabaseService = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: pagina } = await supabaseService
    .from('company_meta_pages')
    .select('page_access_token')
    .eq('company_id', conv.company_id)
    .eq('channel', conv.channel)
    .eq('active', true)
    .maybeSingle();

  if (!pagina) return json({ error: 'Esta empresa no tiene una página de Meta conectada' }, 409);

  const enviar = (extra: Record<string, unknown>) =>
    fetch(`https://graph.facebook.com/v26.0/me/messages?access_token=${pagina.page_access_token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: identidad.external_id },
        message: { text: content },
        ...extra,
      }),
    });

  // Dentro de las 24 h desde el último mensaje del cliente basta
  // RESPONSE. HUMAN_AGENT (MIP-001 §0, ADR-009) extiende la ventana a
  // 7 días, pero exige la función "Human Agent" aprobada en la app, así
  // que solo se intenta cuando Meta indica que la ventana ya cerró.
  let metaRes = await enviar({ messaging_type: 'RESPONSE' });
  let metaData = await metaRes.json();
  const fueraDeVentana = metaData.error?.error_subcode === 2018278
    || /outside of allowed window/i.test(metaData.error?.message ?? '');
  if (fueraDeVentana) {
    metaRes = await enviar({ messaging_type: 'MESSAGE_TAG', tag: 'HUMAN_AGENT' });
    metaData = await metaRes.json();
  }

  if (!metaRes.ok || metaData.error) {
    console.error('[meta-send-message]', conv.channel, metaData.error?.code, metaData.error?.error_subcode, metaData.error?.message);
    const motivo = fueraDeVentana
      ? 'Pasaron más de 24 horas desde el último mensaje del cliente; Meta no permite responder hasta que vuelva a escribir.'
      : (metaData.error?.message ?? `Meta respondió ${metaRes.status}`);
    return json({ error: `Meta rechazó el envío: ${motivo}` }, 502);
  }

  // H2 (v26): el navegador ya no puede insertar en messages. Se guarda
  // con service role, solo después de que Meta aceptó el envío, y con
  // el autor tomado de la sesión validada arriba (nunca del body).
  let { data: guardado, error: insertError } = await supabaseService.from('messages').insert({
    conversation_id: conv.id,
    company_id: conv.company_id,
    direction: 'outbound',
    sender_type: 'agente',
    sender_id: user.id,
    content,
    meta_message_id: metaData.message_id ?? null,
  }).select('id').single();

  // 23505: el eco de Meta (is_echo) llegó al webhook antes que esta
  // inserción y ya guardó el mensaje con el mismo mid. No es un fallo:
  // se completa el autor real sobre esa fila.
  if (insertError?.code === '23505' && metaData.message_id) {
    const { data: existente } = await supabaseService.from('messages')
      .update({ sender_id: user.id, sender_type: 'agente' })
      .eq('meta_message_id', metaData.message_id)
      .select('id').maybeSingle();
    if (existente) { guardado = existente; insertError = null; }
  }

  if (insertError) {
    // El mensaje YA llegó al cliente: no se reporta como fallo de envío.
    console.error('[meta-send-message] Enviado a Meta pero no se guardó en messages', insertError, { convId: conv.id });
    return json({ ok: true, aviso: 'El mensaje se envió, pero no se pudo guardar en el historial' });
  }

  // H1 (v26): si el agente usó una sugerencia de IA, queda registrada
  // como aprobada (sin cambios) o editada, ligada al mensaje enviado.
  if (sugerencia) {
    const { error: errSugerencia } = await supabaseService.from('ai_responses').update({
      status: content === sugerencia.draft.trim() ? 'aprobada' : 'editada',
      final_text: content,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      sent_message_id: guardado.id,
    }).eq('id', sugerencia.id);
    if (errSugerencia) console.error('[meta-send-message] No se pudo actualizar la sugerencia', errSugerencia);
  }

  return json({ ok: true });
});
