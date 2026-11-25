// Recorte de contexto y nivel 0 de la escalera de costo (MPS-002-004
// §3). Todo aquí es determinista: se aplica por código, no depende de
// que el modelo obedezca.

/** Mensajes que no ameritan llamar al modelo: acuses, emojis, risas. */
const TRIVIALES = new Set([
  'ok', 'oki', 'okey', 'okay', 'va', 'vale', 'sale', 'si', 'no', 'listo', 'perfecto',
  'gracias', 'muchas gracias', 'mil gracias', 'ty', 'thanks', 'bien', 'excelente',
  'jaja', 'jajaja', 'jajajaja', 'jeje', 'xd', 'hola', 'buenas',
]);

export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // acentos
    .replace(/\p{Extended_Pictographic}|\p{Emoji_Modifier}|‍|️/gu, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * true si el mensaje no necesita IA. "hola" sí es trivial: un saludo
 * solo no contiene una pregunta; la clasificación y la sugerencia
 * llegan con el siguiente mensaje del cliente.
 */
export function esTrivial(texto: string): boolean {
  const n = normalizar(texto);
  if (!n) return true;                       // solo emojis / signos
  if (TRIVIALES.has(n)) return true;
  // "jajajajaja", "okkk", "siii"
  if (/^(ja|je|ji)+$/.test(n.replace(/\s/g, ''))) return true;
  if (/^(o+k+|s+i+|n+o+|v+a+)$/.test(n)) return true;
  return false;
}

/**
 * Estimación conservadora de tokens (≈3 caracteres por token en
 * español). Sobreestima a propósito: la reserva de presupuesto usa
 * este número y la liquidación corrige con los tokens reales.
 */
export function estimarTokens(texto: string): number {
  return Math.ceil(texto.length / 3);
}

export interface Turno { autor: 'cliente' | 'negocio'; texto: string }

export const MAX_TURNOS = 6;
export const MAX_CARACTERES_TURNO = 300;

/** Últimos N turnos, cada uno recortado. El más reciente va al final. */
export function recortarHistorial(turnos: Turno[], maxTurnos = MAX_TURNOS, maxCaracteres = MAX_CARACTERES_TURNO): Turno[] {
  return turnos
    .filter((t) => t.texto.trim())
    .slice(-maxTurnos)
    .map((t) => ({ autor: t.autor, texto: recortar(t.texto.trim(), maxCaracteres) }));
}

export function recortar(texto: string, max: number): string {
  return texto.length <= max ? texto : texto.slice(0, max - 1) + '…';
}

/**
 * Neutraliza el cierre de las etiquetas que delimitan datos, para que
 * un cliente no pueda "salirse" del bloque <conversacion> escribiendo
 * </conversacion> en su mensaje.
 */
export function escaparDatos(texto: string): string {
  return texto.replace(/<\s*\//g, '< /');
}

/**
 * Arma el bloque de datos de la conversación y lo ajusta al límite de
 * tokens de entrada: primero quita turnos antiguos; si aún no cabe,
 * recorta el mensaje actual. Nunca toca las instrucciones del sistema.
 */
export function construirEntrada(
  historial: Turno[],
  mensajeActual: string,
  maxTokensEntrada: number,
  tokensSistema: number,
): string {
  let turnos = recortarHistorial(historial);
  let actual = recortar(mensajeActual.trim(), 2000);
  const armar = () => {
    const previos = turnos
      .map((t) => `${t.autor === 'cliente' ? 'Cliente' : 'Negocio'}: ${escaparDatos(t.texto)}`)
      .join('\n');
    return `<conversacion>\n${previos || '(sin mensajes previos)'}\n</conversacion>\n<mensaje_actual>\n${escaparDatos(actual)}\n</mensaje_actual>`;
  };
  let entrada = armar();
  while (estimarTokens(entrada) + tokensSistema > maxTokensEntrada && turnos.length) {
    turnos = turnos.slice(1);
    entrada = armar();
  }
  const disponible = (maxTokensEntrada - tokensSistema) * 3 - 200;
  if (estimarTokens(entrada) + tokensSistema > maxTokensEntrada && disponible > 0) {
    actual = recortar(actual, disponible);
    entrada = armar();
  }
  return entrada;
}
