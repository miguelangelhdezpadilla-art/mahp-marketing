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

  const { conversation_id, content } = await req.json();
  if (!conversation_id || !content || typeof content !== 'string') {
    return json({ error: 'Falta conversation_id o content' }, 400);
  }

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

  // Service role solo para leer el token de la página — company_meta_pages
  // no tiene ninguna política RLS para `authenticated` a propósito (v21).
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

  const { error: insertError } = await supabaseUser.from('messages').insert({
    conversation_id: conv.id,
    company_id: conv.company_id,
    direction: 'outbound',
    sender_type: 'agente',
    sender_id: user.id,
    content,
    meta_message_id: metaData.message_id ?? null,
  });

  if (insertError) return json({ error: insertError.message }, 500);

  return json({ ok: true });
});
