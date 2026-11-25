// Dobles de prueba del motor. NO son integraciones: no llaman a ningún
// proveedor ni a la base de datos, y nunca se usan en producción.
import type { CompanyLimits, LlmProvider, LlmRequest, LlmResult, UsageLedger } from '../types.ts';
import { CATALOGO_RESPALDO, costoUsd } from '../models.ts';

export class FakeProvider implements LlmProvider {
  llamadas: LlmRequest[] = [];
  constructor(private respuestas: Array<Partial<LlmResult> | ((req: LlmRequest) => Partial<LlmResult>)>) {}

  complete(req: LlmRequest): Promise<LlmResult> {
    this.llamadas.push(req);
    const siguiente = this.respuestas.shift();
    if (!siguiente) throw new Error('FakeProvider: no hay más respuestas programadas');
    const parcial = typeof siguiente === 'function' ? siguiente(req) : siguiente;
    return Promise.resolve({ ok: true, text: '', inputTokens: 1000, outputTokens: 100, latencyMs: 5, ...parcial });
  }
}

export function analisisJson(over: Record<string, unknown> = {}): string {
  return JSON.stringify({
    intencion: 'consulta', sentimiento: 'neutro', urgencia: 'media', oportunidad: 40,
    resumen: 'pregunta general', explicacion: 'el cliente hace una pregunta',
    confianza: 0.8, requiere_humano: false, motivo_humano: '',
    respuesta_sugerida: '¡Gracias por escribirnos! En un momento te confirmamos.',
    fuentes_usadas: [],
    ...over,
  });
}

export function limitesDePrueba(over: Partial<CompanyLimits> = {}): CompanyLimits {
  return {
    dailyBudgetUsd: 1, monthlyBudgetUsd: 10,
    maxInputTokens: 3000, maxOutputTokens: 400, maxGenPerConversationHour: 10,
    allowAdvanced: false,
    defaultModel: CATALOGO_RESPALDO['claude-haiku-5-5'],
    advancedModel: CATALOGO_RESPALDO['claude-opus-5-5'],
    suspended: false,
    ...over,
  };
}

/** Reproduce la lógica de ai_reserve/ai_settle (v28) en memoria, por empresa. */
export class MemoryLedger implements UsageLedger {
  filas: Array<{ id: number; companyId: number; useCase: string; modelId: string; status: string; est: number; costo: number }> = [];
  private seq = 0;
  constructor(private porEmpresa: Record<number, CompanyLimits | null>) {}

  limits(companyId: number) { return Promise.resolve(this.porEmpresa[companyId] ?? null); }

  gastado(companyId: number): number {
    return this.filas
      .filter((f) => f.companyId === companyId && f.status !== 'liberada')
      .reduce((s, f) => s + (f.status === 'reservada' ? f.est : f.costo), 0);
  }

  reserve(a: Parameters<UsageLedger['reserve']>[0]) {
    const l = this.porEmpresa[a.companyId];
    if (!l) return Promise.resolve({ usageId: null, motivo: 'sin_limites' });
    if (l.suspended) return Promise.resolve({ usageId: null, motivo: 'suspendida' });
    if (this.gastado(a.companyId) + a.estCostUsd > l.dailyBudgetUsd) {
      return Promise.resolve({ usageId: null, motivo: 'presupuesto_diario' });
    }
    const id = ++this.seq;
    this.filas.push({ id, companyId: a.companyId, useCase: a.useCase, modelId: a.modelId, status: 'reservada', est: a.estCostUsd, costo: 0 });
    return Promise.resolve({ usageId: id, motivo: null });
  }

  settle(a: Parameters<UsageLedger['settle']>[0]) {
    const f = this.filas.find((x) => x.id === a.usageId)!;
    const m = CATALOGO_RESPALDO[f.modelId];
    f.status = a.status;
    f.costo = costoUsd(m, a.inputTokens, a.outputTokens);
    return Promise.resolve();
  }

  link() { return Promise.resolve(); }
}
