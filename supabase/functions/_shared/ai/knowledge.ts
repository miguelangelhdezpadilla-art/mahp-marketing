// Recuperación de conocimiento (E4). company_id lo resuelve el servidor
// (página de Meta o sesión), nunca el cliente ni el modelo; la vigencia y
// el estado los filtra match_knowledge en SQL (ADR-022 salvaguarda 6).
// deno-lint-ignore-file no-explicit-any

export interface Fragmento { id: number; kind: string; title: string; body: string; score: number }

export const MAX_FRAGMENTOS = 5;
const MAX_CARACTERES_FRAGMENTO = 1800; // ≈ 600 tokens (MPS-002-004 §3.2)

export async function buscarConocimiento(supabase: any, companyId: number, consulta: string): Promise<Fragmento[]> {
  const { data, error } = await supabase.rpc('match_knowledge', {
    p_company_id: companyId, p_query: consulta.slice(0, 500), p_k: MAX_FRAGMENTOS,
  });
  if (error) {
    console.error('[IA] match_knowledge', error.message);
    return [];
  }
  return (data ?? []) as Fragmento[];
}

/** Texto de cada fragmento tal como entra a <conocimiento>. */
export function textoFragmento(f: Fragmento): string {
  return `${f.title}: ${f.body}`.slice(0, MAX_CARACTERES_FRAGMENTO);
}

/** Lo que se guarda en ai_responses.retrieved (ADR-014: qué información se usó). */
export function registroFuentes(fragmentos: Fragmento[], usadas: string[] = []) {
  return fragmentos.map((f, i) => ({
    etiqueta: `F${i + 1}`, id: f.id, titulo: f.title, score: Number(f.score.toFixed(3)), usada: usadas.includes(`F${i + 1}`),
  }));
}
