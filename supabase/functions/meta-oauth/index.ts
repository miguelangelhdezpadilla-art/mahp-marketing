// Conexiones sociales en autoservicio (MIP-002 §8). El navegador solo
// envía el token corto de usuario de Facebook Login for Business; aquí,
// y nunca en el cliente (ADR-007), se valida y se cambia por uno largo, se guardan los tokens de
// página en company_meta_pages y se suscribe la página al webhook.
// Acciones: exchange, connect (tras elegir página), disconnect, verify.
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_SECRET   = Deno.env.get('META_APP_SECRET') ?? '';
const APP_ID       = '1011783041707142'; // público, igual que en js/shared/conexionesSociales.js
const GRAPH        = 'https://graph.facebook.com/v26.0';

const PERMISOS_FACEBOOK = ['pages_show_list', 'pages_messaging', 'pages_manage_metadata'];
const PERMISO_INSTAGRAM = 'instagram_manage_messages';

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
  constructor(message: string, readonly code?: number) {
    super(message);
  }
}

// Los tokens viajan como parámetros: nunca registrar la URL ni el
// cuerpo de estas llamadas en logs.
async function graph(path: string, params: Record<string, string>, method = 'GET') {
  const query = new URLSearchParams(params).toString();
  const res = method === 'GET'
    ? await fetch(`${GRAPH}${path}?${query}`)
    : await fetch(`${GRAPH}${path}`, {
        method,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: query,
      });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new GraphError(data.error?.message ?? `Meta respondió ${res.status}`, data.error?.code);
  }
  return data;
}

interface PaginaMeta {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string; username?: string };
}

const CAMPOS_PAGINA = 'id,name,access_token,instagram_business_account{id,username}';

async function listarPaginas(userToken: string): Promise<PaginaMeta[]> {
  const { data } = await graph('/me/accounts', {
    access_token: userToken,
    fields: CAMPOS_PAGINA,
    limit: '100',
  });
  if (data?.length) return data;

  // Con Facebook Login for Business, una página de un portfolio comercial
  // puede no salir en /me/accounts aunque se haya autorizado. Los IDs
  // elegidos en la ventana de Meta vienen en granular_scopes.
  const depuracion = await graph('/debug_token', {
    input_token: userToken,
    access_token: `${APP_ID}|${APP_SECRET}`,
  });
  const ids = new Set<string>();
  for (const g of depuracion.data?.granular_scopes ?? []) {
    if (g.scope?.startsWith('pages_')) for (const id of g.target_ids ?? []) ids.add(String(id));
  }
  const paginas: PaginaMeta[] = [];
  for (const id of ids) {
    try {
      const p = await graph(`/${id}`, { access_token: userToken, fields: CAMPOS_PAGINA });
      if (p.access_token) paginas.push(p);
    } catch (e) {
      console.warn('[meta-oauth] página de granular_scopes:', (e as Error).message);
    }
  }
  return paginas;
}

async function permisosConcedidos(userToken: string): Promise<string[]> {
  const { data } = await graph('/me/permissions', { access_token: userToken });
  return (data ?? [])
    .filter((p: { status: string }) => p.status === 'granted')
    .map((p: { permission: string }) => p.permission);
}

// Solo company_admin de esa empresa o super_admin. La identidad sale
// del JWT vía my_role()/my_company_id(), nunca de lo que afirme el body.
async function puedeAdministrar(supabaseUser: SupabaseClient, companyId: number) {
  const [{ data: rol }, { data: empresa }] = await Promise.all([
    supabaseUser.rpc('my_role'),
    supabaseUser.rpc('my_company_id'),
  ]);
  return rol === 'super_admin' || (rol === 'company_admin' && empresa === companyId);
}

async function desactivarConexion(service: SupabaseClient, fila: { id: number }, userId: string) {
  await service.from('company_meta_pages').update({
    active: false,
    status: 'desconectada',
    page_access_token: '',
    connected_by: userId,
    last_error: null,
  }).eq('id', fila.id);
}

async function conectarPagina(
  service: SupabaseClient,
  companyId: number,
  userId: string,
  pagina: PaginaMeta,
  permisos: string[],
) {
  const instagram = pagina.instagram_business_account;

  // unique (channel, page_id): una página pertenece a una sola empresa.
  const { data: ajenas } = await service
    .from('company_meta_pages')
    .select('id')
    .in('page_id', instagram ? [pagina.id, instagram.id] : [pagina.id])
    .eq('active', true)
    .neq('company_id', companyId);
  if (ajenas?.length) {
    return json({ error: 'Esta página ya está conectada a otra empresa en MAHP.' }, 409);
  }

  const faltantes = PERMISOS_FACEBOOK.filter((p) => !permisos.includes(p));
  let status = faltantes.length ? 'permisos_insuficientes' : 'conectada';
  let lastError: string | null = faltantes.length ? `Faltan permisos: ${faltantes.join(', ')}` : null;

  if (!faltantes.length) {
    try {
      await graph(`/${pagina.id}/subscribed_apps`, {
        access_token: pagina.access_token,
        subscribed_fields: 'messages,messaging_postbacks',
      }, 'POST');
    } catch (e) {
      status = 'error_sincronizacion';
      lastError = (e as Error).message;
    }
  }

  const conInstagram = Boolean(instagram && permisos.includes(PERMISO_INSTAGRAM));

  // meta-send-message espera una sola conexión activa por canal.
  const { data: anteriores } = await service
    .from('company_meta_pages')
    .select('id, page_id')
    .eq('company_id', companyId)
    .eq('active', true);
  for (const fila of anteriores ?? []) {
    if (fila.page_id !== pagina.id && fila.page_id !== instagram?.id) {
      await desactivarConexion(service, fila, userId);
    }
  }

  const comunes = {
    company_id: companyId,
    page_access_token: pagina.access_token,
    active: true,
    status,
    connected_by: userId,
    granted_scopes: permisos,
    last_checked_at: new Date().toISOString(),
    last_error: lastError,
  };
  const filas: Record<string, unknown>[] = [
    { ...comunes, channel: 'facebook', page_id: pagina.id, page_name: pagina.name, linked_page_id: null },
  ];
  if (conInstagram) {
    filas.push({
      ...comunes,
      channel: 'instagram',
      page_id: instagram!.id,
      page_name: instagram!.username ? `@${instagram!.username}` : pagina.name,
      linked_page_id: pagina.id,
    });
  }

  const { error } = await service
    .from('company_meta_pages')
    .upsert(filas, { onConflict: 'channel,page_id' });
  if (error) {
    console.error('[meta-oauth] guardar conexión:', error.message);
    return json({ error: 'No se pudo guardar la conexión.' }, 500);
  }

  return json({
    connected: status === 'conectada',
    status,
    page_name: pagina.name,
    instagram_connected: conInstagram,
    error: lastError,
  });
}

async function accionExchange(
  service: SupabaseClient,
  companyId: number,
  userId: string,
  tokenCorto: string,
) {
  // El token corto llega de FB.login. No se usa response_type=code porque
  // el SDK firma ese code con un redirect_uri interno (xd_arbiter) que el
  // servidor no puede reproducir, y Meta lo rechaza. Antes de usarlo se
  // comprueba que lo emitió esta app y no otra.
  const depuracion = await graph('/debug_token', {
    input_token: tokenCorto,
    access_token: `${APP_ID}|${APP_SECRET}`,
  });
  if (!depuracion.data?.is_valid || String(depuracion.data?.app_id) !== APP_ID) {
    return json({ error: 'La autorización de Meta no es válida para MAHP. Intenta conectar de nuevo.' }, 400);
  }
  // Los tokens de página derivados de un token de usuario largo no
  // deberían caducar por tiempo; "Verificar conexión" detecta si se invalidan.
  const largo = await graph('/oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: APP_ID,
    client_secret: APP_SECRET,
    fb_exchange_token: tokenCorto,
  });

  const [paginas, permisos] = await Promise.all([
    listarPaginas(largo.access_token),
    permisosConcedidos(largo.access_token),
  ]);

  if (!paginas.length) {
    return json({
      error: 'Meta no devolvió ninguna página. Vuelve a conectar, elige "Editar configuración" en la ventana de Meta y marca tu página.',
    }, 422);
  }
  if (paginas.length === 1) {
    return conectarPagina(service, companyId, userId, paginas[0], permisos);
  }

  // Varias páginas: el token largo nunca vuelve al navegador; espera aquí
  // (10 minutos, solo service role) mientras el admin elige. Al
  // navegador solo le llegan nombres, sin tokens.
  const lista = paginas.map((p) => ({
    id: p.id,
    name: p.name,
    instagram: p.instagram_business_account?.username ?? null,
  }));
  const { data: sesion, error } = await service
    .from('meta_oauth_sessions')
    .insert({ company_id: companyId, created_by: userId, user_token: largo.access_token, pages: lista })
    .select('id')
    .single();
  if (error) {
    console.error('[meta-oauth] guardar sesión:', error.message);
    return json({ error: 'No se pudo continuar con la conexión.' }, 500);
  }
  return json({ choose_page: true, session_id: sesion.id, pages: lista });
}

async function accionConnect(
  service: SupabaseClient,
  companyId: number,
  userId: string,
  sessionId: string,
  pageId: string,
) {
  const { data: sesion } = await service
    .from('meta_oauth_sessions')
    .select('id, user_token, expires_at')
    .eq('id', sessionId)
    .eq('company_id', companyId)
    .eq('created_by', userId)
    .maybeSingle();
  if (!sesion || new Date(sesion.expires_at) < new Date()) {
    return json({ error: 'La autorización caducó. Vuelve a pulsar "Conectar con Facebook".' }, 410);
  }

  const [paginas, permisos] = await Promise.all([
    listarPaginas(sesion.user_token),
    permisosConcedidos(sesion.user_token),
  ]);
  const pagina = paginas.find((p) => p.id === pageId);
  if (!pagina) return json({ error: 'Esa página ya no está disponible.' }, 404);

  const respuesta = await conectarPagina(service, companyId, userId, pagina, permisos);
  await service.from('meta_oauth_sessions').delete().eq('id', sesion.id);
  return respuesta;
}

async function accionDisconnect(
  service: SupabaseClient,
  companyId: number,
  userId: string,
  connectionId: number,
) {
  const { data: fila } = await service
    .from('company_meta_pages')
    .select('id, channel, page_id, page_access_token')
    .eq('id', connectionId)
    .eq('company_id', companyId)
    .maybeSingle();
  if (!fila) return json({ error: 'Conexión no encontrada.' }, 404);

  // Instagram llega por la suscripción de su página: esa solo se quita
  // al desconectar Facebook, que también desconecta su Instagram.
  if (fila.channel === 'facebook' && fila.page_access_token) {
    try {
      await graph(`/${fila.page_id}/subscribed_apps`, { access_token: fila.page_access_token }, 'DELETE');
    } catch (e) {
      // El cliente pudo haber revocado el token: se desconecta igual.
      console.warn('[meta-oauth] quitar suscripción:', (e as Error).message);
    }
    const { data: vinculadas } = await service
      .from('company_meta_pages')
      .select('id')
      .eq('company_id', companyId)
      .eq('linked_page_id', fila.page_id)
      .eq('active', true);
    for (const v of vinculadas ?? []) await desactivarConexion(service, v, userId);
  }

  await desactivarConexion(service, fila, userId);
  return json({ disconnected: true });
}

async function accionVerify(service: SupabaseClient, companyId: number) {
  const { data: filas } = await service
    .from('company_meta_pages')
    .select('id, page_access_token')
    .eq('company_id', companyId)
    .eq('active', true);

  for (const fila of filas ?? []) {
    let status = 'conectada';
    let lastError: string | null = null;
    try {
      await graph('/me', { access_token: fila.page_access_token, fields: 'id' });
    } catch (e) {
      const err = e as GraphError;
      status = err.code === 190 ? 'token_invalido' : 'error_sincronizacion';
      lastError = err.message;
    }
    await service.from('company_meta_pages').update({
      status,
      last_error: lastError,
      last_checked_at: new Date().toISOString(),
    }).eq('id', fila.id);
  }
  return json({ verified: filas?.length ?? 0 });
}

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

  const body = await req.json();
  const companyId = Number(body.company_id);
  if (!companyId) return json({ error: 'Falta company_id' }, 400);
  if (!(await puedeAdministrar(supabaseUser, companyId))) {
    return json({ error: 'Solo el administrador de la empresa puede administrar las conexiones.' }, 403);
  }

  const service = createClient(SUPABASE_URL, SERVICE_ROLE);
  await service.from('meta_oauth_sessions').delete().lt('expires_at', new Date().toISOString());

  try {
    switch (body.action) {
      case 'exchange':
        if (!body.access_token) return json({ error: 'Falta access_token' }, 400);
        return await accionExchange(service, companyId, user.id, String(body.access_token));
      case 'connect':
        if (!body.session_id || !body.page_id) return json({ error: 'Falta session_id o page_id' }, 400);
        return await accionConnect(service, companyId, user.id, body.session_id, String(body.page_id));
      case 'disconnect':
        if (!body.connection_id) return json({ error: 'Falta connection_id' }, 400);
        return await accionDisconnect(service, companyId, user.id, Number(body.connection_id));
      case 'verify':
        return await accionVerify(service, companyId);
      default:
        return json({ error: 'Acción no válida' }, 400);
    }
  } catch (e) {
    console.error('[meta-oauth]', body.action, (e as Error).message);
    return json({ error: `Meta rechazó la operación: ${(e as Error).message}` }, 502);
  }
});
