// Envío de texto por la Send API de Meta para respuestas automáticas.
// Solo RESPONSE (ventana estándar de 24 h): nunca HUMAN_AGENT ni otra
// etiqueta (ADR-022 salvaguarda 12). El envío humano sigue en
// meta-send-message, que sí puede usar HUMAN_AGENT.

export const LIMITE_TEXTO_META = 2000;

export interface ResultadoEnvio { ok: boolean; messageId: string | null; error: string | null }

export async function enviarRespuestaAutomatica(
  pageAccessToken: string, destinatarioId: string, texto: string,
): Promise<ResultadoEnvio> {
  try {
    const res = await fetch(`https://graph.facebook.com/v26.0/me/messages?access_token=${pageAccessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: destinatarioId },
        messaging_type: 'RESPONSE',
        message: { text: texto.slice(0, LIMITE_TEXTO_META) },
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      return { ok: false, messageId: null, error: `${data.error?.code ?? res.status} ${data.error?.error_subcode ?? ''} ${data.error?.message ?? ''}`.trim() };
    }
    return { ok: true, messageId: data.message_id ?? null, error: null };
  } catch (err) {
    return { ok: false, messageId: null, error: String(err).slice(0, 300) };
  }
}

const TIPO_META: Record<string, string> = { imagen: 'image', video: 'video', audio: 'audio', archivo: 'file' };

/** Adjunto por URL (Meta lo descarga de una URL firmada de corta duración). */
export function enviarAdjuntoAutomatico(
  pageAccessToken: string, destinatarioId: string, tipo: string, url: string,
): Promise<ResultadoEnvio> {
  return enviarAdjunto(pageAccessToken, destinatarioId, tipo, url, { messaging_type: 'RESPONSE' });
}

/**
 * Igual, con el mismo tipo de mensaje que usó el texto que acompaña
 * (RESPONSE, o la etiqueta HUMAN_AGENT del envío humano fuera de 24 h).
 */
export async function enviarAdjunto(
  pageAccessToken: string, destinatarioId: string, tipo: string, url: string,
  tipoMensaje: Record<string, unknown>,
): Promise<ResultadoEnvio> {
  const metaTipo = TIPO_META[tipo];
  if (!metaTipo) return { ok: false, messageId: null, error: `tipo no soportado: ${tipo}` };
  try {
    const res = await fetch(`https://graph.facebook.com/v26.0/me/messages?access_token=${pageAccessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: destinatarioId },
        ...tipoMensaje,
        message: { attachment: { type: metaTipo, payload: { url, is_reusable: false } } },
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      return { ok: false, messageId: null, error: `${data.error?.code ?? res.status} ${data.error?.message ?? ''}`.trim() };
    }
    return { ok: true, messageId: data.message_id ?? null, error: null };
  } catch (err) {
    return { ok: false, messageId: null, error: String(err).slice(0, 300) };
  }
}
