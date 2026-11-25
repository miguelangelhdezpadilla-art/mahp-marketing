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
