// Contabilidad de consumo sobre Postgres (v28): ai_effective_limits,
// ai_reserve, ai_settle. Requiere un cliente con service role; esas
// funciones no son ejecutables por anon/authenticated.
//
// Falla cerrado: si la base no responde o v28 no está aplicada, no hay
// límites ni reserva, y el motor no llama al modelo.
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { CompanyLimits, ModelConfig, UsageLedger } from './types.ts';

function filaAModelo(id: unknown, tier: unknown, pin: unknown, pout: unknown, razon: unknown): ModelConfig | null {
  if (typeof id !== 'string' || !id) return null;
  return {
    provider: 'anthropic',
    modelId: id,
    tier: tier === 'avanzado' ? 'avanzado' : 'economico',
    priceInputPerMtok: Number(pin),
    priceOutputPerMtok: Number(pout),
    reasoningAllowance: Number(razon ?? 0),
  };
}

export class SupabaseLedger implements UsageLedger {
  constructor(private db: SupabaseClient) {}

  async limits(companyId: number): Promise<CompanyLimits | null> {
    const { data, error } = await this.db.rpc('ai_effective_limits', { p_company_id: companyId });
    const f = Array.isArray(data) ? data[0] : data;
    if (error || !f) {
      console.error('[ai/ledger] ai_effective_limits', error?.message ?? 'sin fila', { companyId });
      return null;
    }
    const defaultModel = filaAModelo(f.default_model_id, f.default_tier, f.default_price_in, f.default_price_out, f.default_reasoning);
    if (!defaultModel) return null;
    return {
      dailyBudgetUsd: Number(f.daily_budget_usd),
      monthlyBudgetUsd: Number(f.monthly_budget_usd),
      maxInputTokens: f.max_input_tokens,
      maxOutputTokens: f.max_output_tokens,
      maxGenPerConversationHour: f.max_gen_per_conversation_hour,
      allowAdvanced: f.allow_advanced === true,
      defaultModel,
      advancedModel: filaAModelo(f.advanced_model_id, f.advanced_tier, f.advanced_price_in, f.advanced_price_out, f.advanced_reasoning),
      suspended: f.suspended_at !== null,
    };
  }

  async reserve(a: Parameters<UsageLedger['reserve']>[0]) {
    const { data, error } = await this.db.rpc('ai_reserve', {
      p_company_id: a.companyId,
      p_use_case: a.useCase,
      p_model_id: a.modelId,
      p_est_cost: a.estCostUsd,
      p_user_id: a.userId ?? null,
      p_conversation_id: a.conversationId ?? null,
    });
    const f = Array.isArray(data) ? data[0] : data;
    if (error || !f) {
      console.error('[ai/ledger] ai_reserve', error?.message ?? 'sin fila', { companyId: a.companyId });
      return { usageId: null, motivo: 'error_contabilidad' };
    }
    return { usageId: f.usage_id ?? null, motivo: f.motivo ?? null };
  }

  async settle(a: Parameters<UsageLedger['settle']>[0]) {
    const { error } = await this.db.rpc('ai_settle', {
      p_usage_id: a.usageId,
      p_input_tokens: a.inputTokens,
      p_output_tokens: a.outputTokens,
      p_latency_ms: a.latencyMs,
      p_status: a.status,
      p_error_kind: a.errorKind ?? null,
    });
    // La reserva sin liquidar se libera sola a los 10 minutos (v28), así
    // que un fallo aquí no deja presupuesto bloqueado para siempre.
    if (error) console.error('[ai/ledger] ai_settle', error.message, { usageId: a.usageId });
  }

  async link(usageIds: number[], aiResponseId: number) {
    if (!usageIds.length) return;
    const { error } = await this.db.from('ai_usage').update({ ai_response_id: aiResponseId }).in('id', usageIds);
    if (error) console.error('[ai/ledger] link', error.message, { usageIds, aiResponseId });
  }
}
