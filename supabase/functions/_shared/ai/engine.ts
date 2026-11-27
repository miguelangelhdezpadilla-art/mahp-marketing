// MAHP AI Response Engine (MPS-002-004 §2). Recibe una solicitud ya
// atada a una empresa resuelta en el servidor (nunca por el cliente ni
// por el modelo) y devuelve un resultado tipado. No envía nada a Meta:
// quien llama decide según el modo (ADR-022).
import type { CompanyLimits, LlmProvider, ModelConfig, UsageLedger } from './types.ts';
import { construirEntrada, escaparDatos, esTrivial, estimarTokens, type Turno } from './context.ts';
import { costoMaximoUsd, costoUsd } from './models.ts';
import { SISTEMA_SOCIAL } from './prompts.ts';
import {
  type Analisis, cifrasSinFuente, citasInvalidas, enlacesSinFuente, ESQUEMA_ANALISIS, etiquetaFuente, filtraInstrucciones, MAX_SUGERENCIA,
  parsearAnalisis,
} from './validate.ts';

export const UMBRAL_CONFIANZA_AVANZADO = 0.4;

export interface SolicitudSocial {
  companyId: number;
  /** null en "Probar mi asistente" (no hay conversación real). */
  conversationId: number | null;
  mensaje: string;
  historial: Turno[];
  /** Generaciones de IA en esta conversación durante la última hora. */
  generacionesUltimaHora: number;
  /** Textos de conocimiento recuperado (match_knowledge), ya filtrados por empresa y vigencia. */
  fuentes: string[];
  /** Respuestas reales del equipo, solo para imitar el tono (opción 3). Nunca son fuente de datos. */
  estilo?: { pregunta: string; respuesta: string }[];
  /** Caso de uso para la contabilidad: el webhook o "Probar mi asistente". */
  useCase?: 'social_respuesta' | 'playground';
}

export type Desenlace =
  | 'omitido'           // nivel 0: no ameritaba IA
  | 'propuesta'         // borrador válido para revisión humana
  | 'bloqueada'         // el modelo respondió, pero la validación lo rechazó
  | 'sin_presupuesto'   // límite diario/mensual o empresa suspendida
  | 'tope_conversacion' // demasiadas generaciones en esta conversación
  | 'error_proveedor'
  | 'sin_configuracion';

export interface ResultadoSocial {
  desenlace: Desenlace;
  motivo: string;
  analisis?: Analisis;
  borrador?: string;
  modelo?: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  costoUsd: number;
  usageIds: number[];
}

interface Intento {
  analisis: Analisis | null;
  bloqueo: string | null;
  error: string | null;
}

/**
 * Tokens de salida: el límite de la empresa, pero con espacio para que la
 * IA copie completa la fuente más larga (respuestas guardadas) más los
 * demás campos del JSON. Con 400 fijos, una respuesta guardada larga se
 * cortaba (max_tokens) y no quedaba sugerencia. El tope en dólares
 * (reserva por costo máximo) sigue aplicando.
 */
export const MAX_SALIDA_CON_FUENTES = 1500;
export function tokensDeSalida(limiteEmpresa: number, fuentes: string[]): number {
  const fuenteMasLarga = fuentes.reduce((m, f) => Math.max(m, estimarTokens(f)), 0);
  return Math.max(limiteEmpresa, Math.min(MAX_SALIDA_CON_FUENTES, fuenteMasLarga + 300));
}

// El conocimiento lo escribe la empresa: también es dato, no instrucción.
const escaparFuente = (f: string) => escaparDatos(f);

export async function sugerirRespuesta(
  sol: SolicitudSocial,
  deps: { provider: LlmProvider; ledger: UsageLedger },
): Promise<ResultadoSocial> {
  const r: ResultadoSocial = {
    desenlace: 'omitido', motivo: '', inputTokens: 0, outputTokens: 0, latencyMs: 0, costoUsd: 0, usageIds: [],
  };

  // Nivel 0: sin costo.
  if (esTrivial(sol.mensaje)) return { ...r, motivo: 'mensaje trivial (acuse, emoji o saludo)' };

  const limites = await deps.ledger.limits(sol.companyId);
  if (!limites) return { ...r, desenlace: 'sin_configuracion', motivo: 'no se pudieron leer los límites de la empresa' };
  if (limites.suspended) return { ...r, desenlace: 'sin_presupuesto', motivo: 'IA suspendida para esta empresa' };
  if (sol.generacionesUltimaHora >= limites.maxGenPerConversationHour) {
    return { ...r, desenlace: 'tope_conversacion', motivo: `más de ${limites.maxGenPerConversationHour} generaciones en una hora en esta conversación` };
  }

  const conocimiento = sol.fuentes.length
    ? `<conocimiento>\n${sol.fuentes.map((f, i) => `[${etiquetaFuente(i)}] ${escaparFuente(f)}`).join('\n---\n')}\n</conocimiento>`
    : '<conocimiento>\n(sin información del negocio)\n</conocimiento>';
  // Tono del equipo: datos escapados y fuera de <conocimiento>, así que
  // sus cifras no cuentan como fuente (cifrasSinFuente solo mira fuentes).
  const estilo = sol.estilo?.length
    ? `<estilo_del_equipo>\n${sol.estilo.map((e, i) =>
      `Ejemplo ${i + 1}\nCliente: ${escaparDatos(e.pregunta)}\nEquipo: ${escaparDatos(e.respuesta)}`).join('\n---\n')}\n</estilo_del_equipo>\n`
    : '';
  const tokensSistema = estimarTokens(SISTEMA_SOCIAL) + estimarTokens(conocimiento) + estimarTokens(estilo);
  const entrada = construirEntrada(sol.historial, sol.mensaje, limites.maxInputTokens, tokensSistema);
  const contenido = `${conocimiento}\n${estilo}${entrada}`;

  // Nivel 2: modelo económico.
  const primero = await intentar(limites.defaultModel, limites, contenido, sol, deps, r);
  if (primero.error === 'sin_presupuesto') return { ...r, desenlace: 'sin_presupuesto', motivo: 'presupuesto de IA agotado' };

  // Nivel 3: avanzado, una sola vez, solo si la empresa lo tiene
  // habilitado y el económico falló o dudó.
  let final = primero;
  const dudoso = !primero.analisis || primero.bloqueo !== null ||
    primero.analisis.confianza < UMBRAL_CONFIANZA_AVANZADO;
  if (dudoso && limites.allowAdvanced && limites.advancedModel && !primero.analisis?.requiere_humano) {
    const segundo = await intentar(limites.advancedModel, limites, contenido, sol, deps, r);
    if (segundo.analisis && !segundo.bloqueo) final = segundo;
  }

  if (final.error && !final.analisis) {
    return { ...r, desenlace: 'error_proveedor', motivo: final.error };
  }
  if (!final.analisis) return { ...r, desenlace: 'error_proveedor', motivo: 'salida con forma inválida' };

  r.analisis = final.analisis;
  r.borrador = final.analisis.respuesta_sugerida;
  if (final.bloqueo) return { ...r, desenlace: 'bloqueada', motivo: final.bloqueo };
  return {
    ...r,
    desenlace: 'propuesta',
    motivo: final.analisis.requiere_humano ? `requiere humano: ${final.analisis.motivo_humano}` : final.analisis.explicacion,
  };
}

async function intentar(
  modelo: ModelConfig,
  limites: CompanyLimits,
  contenido: string,
  sol: SolicitudSocial,
  deps: { provider: LlmProvider; ledger: UsageLedger },
  acumulado: ResultadoSocial,
): Promise<Intento> {
  const maxSalida = tokensDeSalida(limites.maxOutputTokens, sol.fuentes);
  const estimado = costoMaximoUsd(
    modelo,
    estimarTokens(SISTEMA_SOCIAL) + estimarTokens(contenido),
    maxSalida + modelo.reasoningAllowance,
  );
  const reserva = await deps.ledger.reserve({
    companyId: sol.companyId, useCase: sol.useCase ?? 'social_respuesta', modelId: modelo.modelId,
    estCostUsd: estimado, conversationId: sol.conversationId,
  });
  if (reserva.usageId === null) return { analisis: null, bloqueo: null, error: 'sin_presupuesto' };
  acumulado.usageIds.push(reserva.usageId);

  const res = await deps.provider.complete({
    model: modelo,
    system: SISTEMA_SOCIAL,
    messages: [{ role: 'user', content: contenido }],
    maxOutputTokens: maxSalida,
    jsonSchema: ESQUEMA_ANALISIS as unknown as Record<string, unknown>,
  });

  await deps.ledger.settle({
    usageId: reserva.usageId,
    inputTokens: res.inputTokens, outputTokens: res.outputTokens, latencyMs: res.latencyMs,
    status: res.ok ? 'liquidada' : 'fallida', errorKind: res.error?.kind ?? null,
  });
  acumulado.modelo = modelo.modelId;
  acumulado.inputTokens += res.inputTokens;
  acumulado.outputTokens += res.outputTokens;
  acumulado.latencyMs += res.latencyMs;
  acumulado.costoUsd += costoUsd(modelo, res.inputTokens, res.outputTokens);

  if (!res.ok) return { analisis: null, bloqueo: null, error: `${res.error?.kind}: ${res.error?.detail}` };

  const analisis = parsearAnalisis(res.text);
  if (!analisis) return { analisis: null, bloqueo: null, error: 'salida con forma inválida' };

  const borrador = analisis.respuesta_sugerida;
  if (!borrador) return { analisis, bloqueo: 'respuesta sugerida vacía', error: null };
  if (borrador.length > MAX_SUGERENCIA) return { analisis, bloqueo: `respuesta de ${borrador.length} caracteres`, error: null };
  if (filtraInstrucciones(borrador)) return { analisis, bloqueo: 'la respuesta menciona instrucciones internas', error: null };
  const enlaces = enlacesSinFuente(borrador, sol.fuentes);
  if (enlaces.length) return { analisis, bloqueo: `enlaces que no están en la información del negocio: ${enlaces.join(', ')}`, error: null };
  const inventadas = citasInvalidas(analisis.fuentes_usadas, sol.fuentes.length);
  if (inventadas.length) return { analisis, bloqueo: `cita fuentes que no recibió: ${inventadas.join(', ')}`, error: null };
  // Las cifras se comparan contra las fuentes que dice haber usado; si no
  // citó ninguna, contra todas (modo asistido: lo revisa una persona).
  const citadas = analisis.fuentes_usadas.length
    ? sol.fuentes.filter((_, i) => analisis.fuentes_usadas.includes(etiquetaFuente(i)))
    : sol.fuentes;
  const sinFuente = cifrasSinFuente(borrador, citadas);
  if (sinFuente.length) {
    return { analisis, bloqueo: `cifras sin fuente verificada: ${sinFuente.join(', ')}`, error: null };
  }
  return { analisis, bloqueo: null, error: null };
}
