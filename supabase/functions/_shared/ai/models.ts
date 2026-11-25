// Catálogo de modelos y cálculo de costo.
//
// La fuente de verdad es la tabla ai_models (v28): si el proveedor
// cambia una tarifa se corrige una fila, sin desplegar. Este catálogo
// solo existe para calcular la estimación previa a la reserva cuando
// un modelo no está en la tabla — nunca para saltarse el presupuesto.
import type { ModelConfig } from './types.ts';

// Precios de la API de Anthropic, verificados el 2026-11-20 (Haiku 5.5:
// tarifa para prompts de hasta 100K tokens, que es nuestro caso).
export const CATALOGO_RESPALDO: Record<string, ModelConfig> = {
  'claude-haiku-5-5': {
    provider: 'anthropic', modelId: 'claude-haiku-5-5', tier: 'economico',
    priceInputPerMtok: 0.10, priceOutputPerMtok: 0.50, reasoningAllowance: 0,
  },
  'claude-opus-5-5': {
    provider: 'anthropic', modelId: 'claude-opus-5-5', tier: 'avanzado',
    priceInputPerMtok: 4.00, priceOutputPerMtok: 20.00, reasoningAllowance: 1500,
  },
};

export const MODELO_ECONOMICO = 'claude-haiku-5-5';
export const MODELO_AVANZADO = 'claude-opus-5-5';

export function modelo(modelId: string): ModelConfig | null {
  return CATALOGO_RESPALDO[modelId] ?? null;
}

export function costoUsd(m: ModelConfig, inputTokens: number, outputTokens: number): number {
  return (inputTokens * m.priceInputPerMtok + outputTokens * m.priceOutputPerMtok) / 1_000_000;
}

/** Peor caso para la reserva: toda la entrada estimada + toda la salida permitida. */
export function costoMaximoUsd(m: ModelConfig, inputTokensEstimados: number, maxOutputTokens: number): number {
  return costoUsd(m, inputTokensEstimados, maxOutputTokens);
}
