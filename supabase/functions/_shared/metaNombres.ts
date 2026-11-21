// Nombre visible de un contacto de Messenger/Instagram.
//
// 1. Perfil directo: Instagram → name / username (User Profile API, el
//    usuario ya escribió a la cuenta); Messenger → first_name/last_name
//    (requiere "Business Asset User Profile Access"; si la app no lo
//    tiene, Meta devuelve error u objeto vacío).
// 2. Respaldo: participants de la conversación (Conversations API, solo
//    pages_messaging / instagram_manage_messages): trae name en
//    Messenger y username en Instagram.
// Nunca se inventa un nombre: si Meta no da ninguno, queda null.
const GRAPH = 'https://graph.facebook.com/v26.0';

async function get(path: string, params: Record<string, string>) {
  const url = new URL(`${GRAPH}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    return res.ok && !data.error ? data : null;
  } catch {
    return null;
  }
}

function formatear(p: any): string | null {
  if (!p) return null;
  const nombre = (p.name ?? [p.first_name, p.last_name].filter(Boolean).join(' ')).trim();
  if (nombre) return nombre;
  return p.username ? `@${p.username}` : null;
}

export async function nombreDeContacto(
  channel: string,
  externalId: string,
  fbPageId: string | null,
  token: string,
): Promise<string | null> {
  const perfil = await get(`/${externalId}`, {
    fields: channel === 'instagram' ? 'name,username' : 'first_name,last_name',
    access_token: token,
  });
  const directo = formatear(perfil);
  if (directo) return directo;

  if (!fbPageId) return null;
  const convs = await get(`/${fbPageId}/conversations`, {
    platform: channel === 'instagram' ? 'instagram' : 'messenger',
    user_id: externalId,
    fields: 'participants',
    access_token: token,
  });
  const participante = (convs?.data?.[0]?.participants?.data ?? [])
    .find((p: any) => String(p.id) === String(externalId));
  return formatear(participante);
}
