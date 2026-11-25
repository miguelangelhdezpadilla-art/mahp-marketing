// Recuperación de conocimiento (E4). company_id lo resuelve el servidor
// (página de Meta o sesión), nunca el cliente ni el modelo; la vigencia y
// el estado los filtra match_knowledge en SQL (ADR-022 salvaguarda 6).
// deno-lint-ignore-file no-explicit-any

export interface Adjunto {
  kind: 'enlace' | 'imagen' | 'video' | 'audio' | 'archivo';
  label: string | null;
  url: string | null;
  storage_path: string | null;
  file_name: string | null;
}

export interface Fragmento {
  id: number; kind: string; title: string; body: string; score: number;
  adjuntos: Adjunto[];
}

export const MAX_FRAGMENTOS = 5;
const MAX_CARACTERES_FRAGMENTO = 1800; // ≈ 600 tokens (MPS-002-004 §3.2)
export const MAX_ADJUNTOS_POR_RESPUESTA = 3;

export async function buscarConocimiento(supabase: any, companyId: number, consulta: string): Promise<Fragmento[]> {
  const { data, error } = await supabase.rpc('match_knowledge', {
    p_company_id: companyId, p_query: consulta.slice(0, 500), p_k: MAX_FRAGMENTOS,
  });
  if (error) {
    console.error('[IA] match_knowledge', error.message);
    return [];
  }
  const filas = (data ?? []) as Omit<Fragmento, 'adjuntos'>[];
  if (!filas.length) return [];

  // Adjuntos de las entradas encontradas (v32). Si la tabla no existe o
  // falla, se responde igual sin adjuntos.
  const { data: adj, error: errAdj } = await supabase
    .from('knowledge_attachments')
    .select('entry_id, kind, label, url, storage_path, file_name')
    .in('entry_id', filas.map((f) => f.id))
    .eq('company_id', companyId)
    .order('id');
  if (errAdj) console.error('[IA] knowledge_attachments', errAdj.message);
  return filas.map((f) => ({ ...f, adjuntos: (adj ?? []).filter((x: any) => x.entry_id === f.id) }));
}

/** Texto de cada fragmento tal como entra a <conocimiento>. */
export function textoFragmento(f: Fragmento): string {
  const enlaces = f.adjuntos.filter((x) => x.kind === 'enlace' && x.url)
    .map((x) => `${x.label ? x.label + ': ' : ''}${x.url}`);
  const archivos = f.adjuntos.filter((x) => x.kind !== 'enlace')
    .map((x) => `${x.label || x.file_name} (${x.kind})`);
  let t = `${f.title}: ${f.body}`;
  if (enlaces.length) t += `\nEnlaces: ${enlaces.join(' | ')}`;
  if (archivos.length) t += `\nArchivos que se adjuntan solos al usar esta información: ${archivos.join(', ')}`;
  return t.slice(0, MAX_CARACTERES_FRAGMENTO);
}

/** Archivos (no enlaces) de los fragmentos citados, en orden, con tope. */
export function adjuntosParaEnviar(fragmentos: Fragmento[], usadas: string[]): Adjunto[] {
  return fragmentos
    .filter((_, i) => usadas.includes(`F${i + 1}`))
    .flatMap((f) => f.adjuntos.filter((x) => x.kind !== 'enlace' && x.storage_path))
    .slice(0, MAX_ADJUNTOS_POR_RESPUESTA);
}

/** Lo que se guarda en ai_responses.retrieved (ADR-014: qué información se usó). */
export function registroFuentes(fragmentos: Fragmento[], usadas: string[] = []) {
  return fragmentos.map((f, i) => ({
    etiqueta: `F${i + 1}`, id: f.id, titulo: f.title, score: Number(f.score.toFixed(3)), usada: usadas.includes(`F${i + 1}`),
    adjuntos: f.adjuntos.length,
  }));
}
