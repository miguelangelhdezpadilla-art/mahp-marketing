// Validación de la salida, independiente del modelo (MPS-002-003 §6.2
// paso 9). Regla: la IA nunca afirma un precio, porcentaje, hora o
// fecha que no aparezca literalmente en las fuentes que recibió.

export const INTENCIONES = ['reserva', 'precio', 'queja', 'consulta', 'felicitacion', 'otro'] as const;
export const SENTIMIENTOS = ['positivo', 'neutro', 'negativo'] as const;
export const URGENCIAS = ['alta', 'media', 'baja'] as const;

export interface Analisis {
  intencion: typeof INTENCIONES[number];
  sentimiento: typeof SENTIMIENTOS[number];
  urgencia: typeof URGENCIAS[number];
  oportunidad: number;
  resumen: string;
  explicacion: string;
  confianza: number;
  requiere_humano: boolean;
  motivo_humano: string;
  respuesta_sugerida: string;
  /** Etiquetas de las fuentes de <conocimiento> que respaldan la respuesta (p. ej. "F1"). */
  fuentes_usadas: string[];
}

/** JSON Schema que se pasa como formato de salida estructurada. */
export const ESQUEMA_ANALISIS = {
  type: 'object',
  additionalProperties: false,
  required: ['intencion', 'sentimiento', 'urgencia', 'oportunidad', 'resumen', 'explicacion',
    'confianza', 'requiere_humano', 'motivo_humano', 'respuesta_sugerida', 'fuentes_usadas'],
  properties: {
    intencion: { type: 'string', enum: [...INTENCIONES] },
    sentimiento: { type: 'string', enum: [...SENTIMIENTOS] },
    urgencia: { type: 'string', enum: [...URGENCIAS] },
    oportunidad: { type: 'integer', description: '0 a 100' },
    resumen: { type: 'string', description: 'máximo 10 palabras' },
    explicacion: { type: 'string', description: 'motivo breve y visible de la clasificación' },
    confianza: { type: 'number', description: '0 a 1: qué tan seguro estás de que la respuesta sugerida es correcta y suficiente' },
    requiere_humano: { type: 'boolean' },
    motivo_humano: { type: 'string', description: 'vacío si requiere_humano es false' },
    respuesta_sugerida: { type: 'string' },
    fuentes_usadas: {
      type: 'array', items: { type: 'string' },
      description: 'etiquetas [F1], [F2]… de <conocimiento> en las que se basa la respuesta; vacío si no usaste ninguna',
    },
  },
} as const;

export const MAX_SUGERENCIA = 1000;

/** Parsea y valida la forma. `null` = salida inválida. */
export function parsearAnalisis(texto: string): Analisis | null {
  let a: any;
  try { a = JSON.parse(texto); } catch { return null; }
  const ok = typeof a === 'object' && a !== null &&
    (INTENCIONES as readonly string[]).includes(a.intencion) &&
    (SENTIMIENTOS as readonly string[]).includes(a.sentimiento) &&
    (URGENCIAS as readonly string[]).includes(a.urgencia) &&
    Number.isFinite(a.oportunidad) &&
    typeof a.resumen === 'string' &&
    typeof a.explicacion === 'string' && a.explicacion.trim().length > 0 &&   // ADR-014
    Number.isFinite(a.confianza) &&
    typeof a.requiere_humano === 'boolean' &&
    typeof a.motivo_humano === 'string' &&
    typeof a.respuesta_sugerida === 'string' &&
    (a.fuentes_usadas === undefined || (Array.isArray(a.fuentes_usadas) && a.fuentes_usadas.every((f: unknown) => typeof f === 'string')));
  if (!ok) return null;
  return {
    ...a,
    oportunidad: Math.max(0, Math.min(100, Math.round(a.oportunidad))),
    confianza: Math.max(0, Math.min(1, a.confianza)),
    resumen: a.resumen.trim().slice(0, 120),
    respuesta_sugerida: a.respuesta_sugerida.trim(),
    fuentes_usadas: [...new Set<string>((a.fuentes_usadas ?? []).map((f: string) => f.replace(/[\[\]\s]/g, '').toUpperCase()))],
  };
}

// Cifras que la IA no puede afirmar sin fuente. Se extrae el "núcleo"
// (los dígitos con su separador) y se exige que aparezca en las fuentes.
const PATRONES_CIFRA: RegExp[] = [
  /\$\s?\d[\d.,]*/g,                                              // $45, $1,200.50
  /\d[\d.,]*\s?(?:pesos|mxn|usd|dlls?|d[oó]lares)\b/gi,            // 45 pesos
  /\d[\d.,]*\s?%/g,                                               // 20%, 15 %
  /\b\d{1,2}:\d{2}\b/g,                                           // 10:30
  /\b\d{1,2}\s?(?:a\.?\s?m\.?|p\.?\s?m\.?|hrs?|horas)(?=\W|$)/gi,  // 9 am, 9pm, 18 hrs
  /\b\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/gi,
  /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g,                           // 15/03, 15/03/2026
];

function nucleo(cifra: string): string {
  const m = cifra.match(/\d[\d.,:/]*\d|\d/);
  return (m ? m[0] : cifra).replace(/[.,]$/, '');
}

export function cifrasEn(texto: string): string[] {
  const encontradas = new Set<string>();
  for (const p of PATRONES_CIFRA) for (const m of texto.matchAll(p)) encontradas.add(m[0].trim());
  return [...encontradas];
}

/**
 * Cifras de la respuesta que NO aparecen en ninguna fuente. Vacío =
 * respuesta aceptable. Sin fuentes (aún no hay base de conocimientos),
 * cualquier cifra queda bloqueada.
 */
export function cifrasSinFuente(respuesta: string, fuentes: string[]): string[] {
  const corpus = fuentes.join('\n');
  return cifrasEn(respuesta).filter((c) => !corpus.includes(nucleo(c)));
}

/** Indicios de que el texto filtra las instrucciones internas. */
export function filtraInstrucciones(respuesta: string): boolean {
  const n = respuesta.toLowerCase();
  return n.includes('<conversacion>') || n.includes('<mensaje_actual>') ||
    n.includes('instrucciones del sistema') || n.includes('system prompt');
}

/** Etiqueta con la que cada fuente entra a <conocimiento>: F1, F2… */
export const etiquetaFuente = (i: number) => `F${i + 1}`;

/** Fuentes citadas que no estaban entre las recuperadas (citas inventadas). */
export function citasInvalidas(citadas: string[], totalFuentes: number): string[] {
  const validas = new Set(Array.from({ length: totalFuentes }, (_, i) => etiquetaFuente(i)));
  return citadas.filter((c) => !validas.has(c));
}
