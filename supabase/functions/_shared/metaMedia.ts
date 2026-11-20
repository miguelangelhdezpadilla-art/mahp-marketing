// Adjuntos de Messenger/Instagram (imágenes, video, audio, archivos).
//
// Las URLs que manda Meta (lookaside.fbsbx.com / cdninstagram) caducan
// en horas o días: guardarlas tal cual dejaría imágenes rotas en el
// historial. Por eso se descarga el archivo una sola vez y se guarda
// en el bucket privado `social-media` (v27). En messages.media_url se
// guarda la RUTA dentro del bucket, nunca una URL pública: el
// navegador pide una URL firmada y el RLS de storage.objects limita la
// lectura a los miembros de la empresa (la carpeta raíz es company_id).
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const BUCKET_MEDIA = 'social-media';
const MAX_BYTES = 25 * 1024 * 1024; // límite de adjuntos de Messenger

export type TipoMensaje = 'text' | 'image' | 'video' | 'audio' | 'file';

// Webhook: attachment.type ('image', 'video', 'audio', 'file',
// 'sticker', 'ig_reel', 'share', ...). Conversations API: no trae
// type, se deduce de image_data / video_data / mime_type.
export function tipoDeAdjunto(a: any): TipoMensaje {
  const t = String(a?.type ?? '').toLowerCase();
  const mime = String(a?.mime_type ?? '').toLowerCase();
  if (t === 'image' || t === 'sticker' || a?.image_data || mime.startsWith('image/')) return 'image';
  if (t === 'video' || t === 'ig_reel' || t === 'reel' || a?.video_data || mime.startsWith('video/')) return 'video';
  if (t === 'audio' || mime.startsWith('audio/')) return 'audio';
  return 'file';
}

export function urlDeAdjunto(a: any): string | null {
  return a?.payload?.url ?? a?.image_data?.url ?? a?.video_data?.url ?? a?.file_url ?? null;
}

const EXTENSIONES: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp',
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a',
  'audio/aac': 'aac', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'application/pdf': 'pdf',
};

async function sha256Hex(texto: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Descarga el adjunto y lo guarda en Storage. La ruta es determinista
// (empresa/conversación/hash del mid + índice), así que un reintento de
// Meta o una segunda sincronización sobrescriben el mismo archivo en
// vez de duplicarlo. Devuelve la ruta, o null si no se pudo (el
// mensaje se guarda igual, solo sin el archivo).
export async function guardarAdjunto(
  supabase: SupabaseClient,
  url: string,
  companyId: number,
  convId: number,
  metaMsgId: string,
  indice = 0,
): Promise<string | null> {
  try {
    if (!/^https:\/\//i.test(url)) return null;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      console.warn('[media] Meta respondió', res.status, 'al descargar el adjunto');
      return null;
    }
    const tipo = (res.headers.get('content-type') ?? 'application/octet-stream').split(';')[0].trim().toLowerCase();
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength > MAX_BYTES) {
      console.warn('[media] Adjunto demasiado grande, no se guarda', bytes.byteLength);
      return null;
    }
    const ext = EXTENSIONES[tipo] ?? 'bin';
    const ruta = `${companyId}/${convId}/${(await sha256Hex(metaMsgId)).slice(0, 32)}-${indice}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET_MEDIA).upload(ruta, bytes, {
      contentType: tipo,
      upsert: true,
    });
    if (error) {
      console.error('[media] No se pudo subir a Storage:', error.message);
      return null;
    }
    return ruta;
  } catch (err) {
    console.warn('[media] Error al guardar el adjunto:', err);
    return null;
  }
}
