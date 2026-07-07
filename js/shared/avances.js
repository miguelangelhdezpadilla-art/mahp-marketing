import { sHtml as s } from '../ui.js';

// ── Tabla de avances reportados por el equipo (admin/director) ──
export async function cargarTablaAvances(supabase, companyId, idContenedor) {
  const contenedor = document.getElementById(idContenedor);
  if (!contenedor) return;

  const { data, error } = await supabase
    .from('activity_updates')
    .select(`
      id, progress_pct, note, created_at,
      actividades!inner ( id, titulo, canal, company_id ),
      profiles ( full_name )
    `)
    .eq('actividades.company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) { console.error('Error avances:', error.message); return; }

  if (!data?.length) {
    contenedor.innerHTML = '<p style="color:var(--slate-400); font-size:13px;">Sin avances reportados todavía.</p>';
    return;
  }

  contenedor.innerHTML = `
    <table class="seg-hist-table">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Colaborador</th>
          <th>Actividad</th>
          <th>Canal</th>
          <th>Avance</th>
          <th>Nota</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(r => `
          <tr>
            <td>${new Date(r.created_at).toLocaleString()}</td>
            <td>${s(r.profiles?.full_name ?? '—')}</td>
            <td><span class="act-pill">${s(r.actividades.titulo)}</span></td>
            <td>${s(r.actividades.canal ?? '')}</td>
            <td>${r.progress_pct}%</td>
            <td style="color:var(--slate-400)">${r.note ? s(r.note) : '—'}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}
