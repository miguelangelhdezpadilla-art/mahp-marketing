// Tipos del MAHP AI Response Engine (MPS-002-004 §2). Ningún código
// fuera de _shared/ai/ debe conocer al proveedor: Social AI Hub y el
// calendario solo ven estos tipos.

export type Tier = 'economico' | 'avanzado';

/** Una fila de ai_models (v28) o del catálogo de respaldo (models.ts). */
export interface ModelConfig {
  provider: 'anthropic';
  modelId: string;
  tier: Tier;
  priceInputPerMtok: number;   // USD por millón de tokens de entrada
  priceOutputPerMtok: number;  // USD por millón de tokens de salida
  /**
   * Tokens extra de salida para razonamiento interno. Haiku 5.5 corre
   * con el razonamiento apagado (0); Opus 5.5 no permite apagarlo, así
   * que necesita margen o la respuesta se corta.
   */
  reasoningAllowance: number;
}

/** Límites efectivos de una empresa (ai_effective_limits, v28). */
export interface CompanyLimits {
  dailyBudgetUsd: number;
  monthlyBudgetUsd: number;
  maxInputTokens: number;
  maxOutputTokens: number;
  maxGenPerConversationHour: number;
  allowAdvanced: boolean;
  defaultModel: ModelConfig;
  advancedModel: ModelConfig | null;
  suspended: boolean;
}

export interface LlmMessage { role: 'user' | 'assistant'; content: string }

export interface LlmRequest {
  model: ModelConfig;
  system: string;                 // instrucciones fijas, versionadas en git
  messages: LlmMessage[];
  maxOutputTokens: number;
  /** JSON Schema de la salida; si se da, el proveedor fuerza JSON válido. */
  jsonSchema?: Record<string, unknown>;
}

export type LlmErrorKind = 'rate_limit' | 'timeout' | 'auth' | 'refusal' | 'bad_output' | 'provider';

export interface LlmResult {
  ok: boolean;
  text: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  error?: { kind: LlmErrorKind; detail: string };
}

/** Un adaptador por proveedor. Nunca lanza: los errores vuelven en `error`. */
export interface LlmProvider {
  complete(req: LlmRequest): Promise<LlmResult>;
}

/** Contabilidad de consumo (ai_reserve / ai_settle, v28). */
export interface UsageLedger {
  limits(companyId: number): Promise<CompanyLimits | null>;
  /** Devuelve el id de la reserva, o `null` con el motivo si no cabe. */
  reserve(args: {
    companyId: number; useCase: string; modelId: string; estCostUsd: number;
    userId?: string | null; conversationId?: number | null;
  }): Promise<{ usageId: number | null; motivo: string | null }>;
  settle(args: {
    usageId: number; inputTokens: number; outputTokens: number; latencyMs: number;
    status: 'liquidada' | 'fallida'; errorKind?: string | null;
  }): Promise<void>;
  /** Liga las llamadas a la respuesta guardada en ai_responses. */
  link(usageIds: number[], aiResponseId: number): Promise<void>;
}
