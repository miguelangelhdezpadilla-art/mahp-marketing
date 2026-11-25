// Adaptador de Claude (Anthropic) para el AI Response Engine.
// La API key vive solo en Supabase Secrets (ANTHROPIC_API_KEY); este
// archivo corre únicamente en Edge Functions, nunca en el navegador.
import Anthropic from 'npm:@anthropic-ai/sdk@1.5.0';
import type { LlmProvider, LlmRequest, LlmResult } from './types.ts';

const TIMEOUT_MS = 20_000;

export class AnthropicProvider implements LlmProvider {
  private client: Anthropic;

  // timeoutMs: 20 s basta para el Social Hub (respuestas cortas); el
  // calendario genera miles de tokens y necesita más.
  constructor(apiKey: string, opts: { timeoutMs?: number; maxRetries?: number } = {}) {
    // Un reintento (no los 2 por omisión): el webhook corre en segundo
    // plano y cada reintento cuesta tiempo de CPU de la función.
    this.client = new Anthropic({ apiKey, timeout: opts.timeoutMs ?? TIMEOUT_MS, maxRetries: opts.maxRetries ?? 1 });
  }

  async complete(req: LlmRequest): Promise<LlmResult> {
    const inicio = Date.now();
    const vacio = { text: '', inputTokens: 0, outputTokens: 0 };
    try {
      // Sin razonamiento (reasoningAllowance 0) se apaga el thinking:
      // Haiku 5.5 lo permite y para clasificar + redactar 3 oraciones no
      // aporta. Opus 5.5 no permite apagarlo; se usa esfuerzo bajo.
      const pensar = req.model.reasoningAllowance > 0;
      const response = await this.client.messages.create({
        model: req.model.modelId,
        max_tokens: req.maxOutputTokens + req.model.reasoningAllowance,
        system: req.system,
        messages: req.messages,
        ...(pensar ? {} : { thinking: { type: 'disabled' as const } }),
        output_config: {
          effort: 'low',
          ...(req.jsonSchema ? { format: { type: 'json_schema' as const, schema: req.jsonSchema } } : {}),
        },
      });

      const base = {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        latencyMs: Date.now() - inicio,
      };
      const texto = response.content
        .flatMap((b) => (b.type === 'text' ? [b.text] : []))
        .join('');

      if (response.stop_reason === 'refusal') {
        return { ok: false, text: '', ...base, error: { kind: 'refusal', detail: response.stop_details?.category ?? 'sin categoría' } };
      }
      if (response.stop_reason === 'max_tokens') {
        return { ok: false, text: texto, ...base, error: { kind: 'bad_output', detail: 'respuesta cortada por max_tokens' } };
      }
      return { ok: true, text: texto, ...base };
    } catch (err) {
      const latencyMs = Date.now() - inicio;
      // Más específico primero (ver error-codes del SDK).
      if (err instanceof Anthropic.APIConnectionTimeoutError) {
        return { ok: false, ...vacio, latencyMs, error: { kind: 'timeout', detail: 'tiempo de espera agotado' } };
      }
      if (err instanceof Anthropic.RateLimitError) {
        return { ok: false, ...vacio, latencyMs, error: { kind: 'rate_limit', detail: '429' } };
      }
      if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
        return { ok: false, ...vacio, latencyMs, error: { kind: 'auth', detail: String(err.status) } };
      }
      if (err instanceof Anthropic.APIError) {
        return { ok: false, ...vacio, latencyMs, error: { kind: 'provider', detail: `${err.status ?? 'red'} ${err.message}`.slice(0, 300) } };
      }
      return { ok: false, ...vacio, latencyMs, error: { kind: 'provider', detail: String(err).slice(0, 300) } };
    }
  }
}
