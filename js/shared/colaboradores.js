import { sHtml as s } from '../ui.js';
import { renderDetalleTarea } from './detalleTarea.js';

const STATUS_LABEL = {
  pendiente:   'Pendiente',
  en_progreso: 'En progreso',
  completada:  'Completada',
};

function iniciales(nombre) {
  return (nombre || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export async function renderizarAvanceColaboradores(supabase, companyId, idContenedor, perfilActual = null) {
  const cont = document.getElementById(idContenedor);
  if (!cont) return;

  cont.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">Cargando...</p>';

  const [{ data: actividades, error: errAct }, { data: perfiles, error: errPerf }] = await Promise.all([
    supabase.from('actividades')
      .select('id, titulo, canal, fecha, status, progress_pct, assigned_to, company_id')
      .eq('company_id', companyId)
      .not('assigned_to', 'is', null),
    supabase.from('profiles')
      .select('id, full_name')
      .eq('company_id', companyId)
      .eq('role', 'collaborator'),
  ]);

  if (errAct)  console.error('[colaboradores] actividades:', errAct.message);
  if (errPerf) console.error('[colaboradores] perfiles:', errPerf.message);

  if (!perfiles?.length) {
    cont.innerHTML = '<div class="empty-state"><i class="fa-solid fa-users"></i><p>Sin colaboradores asignados todavía.</p></div>';
    return;
  }

  const actPorColab = {};
  (actividades ?? []).forEach(a => {
    if (!actPorColab[a.assigned_to]) actPorColab[a.assigned_to] = [];
    actPorColab[a.assigned_to].push(a);
  });

  cont.innerHTML = perfiles.map(p => {
    const tareas = actPorColab[p.id] ?? [];
    const pendientes  = tareas.filter(t => t.status === 'pendiente').length;
    const en_progreso = tareas.filter(t => t.status === 'en_progreso').length;
    const completadas = tareas.filter(t => t.status === 'completada').length;
    const pct = tareas.length
      ? Math.round(tareas.reduce((acc, t) => acc + (t.progress_pct || 0), 0) / tareas.length)
      : 0;

    const placeholders = tareas.length
      ? tareas.map(t => `
          <div id="detalle-tarea-${t.id}-${p.id}" style="width:100%; margin-bottom:8px;">
            <div class="skeleton skeleton-line mid"></div>
          </div>`).join('')
      : '<p style="color:var(--text-muted);font-size:13px;margin:0;">Sin tareas asignadas.</p>';

    return `
      <div class="colab-card">
        <div class="colab-header" onclick="window.toggleColaborador('${p.id}')">
          <div class="colab-avatar">${iniciales(p.full_name)}</div>
          <div class="colab-info">
            <div class="colab-nombre">${s(p.full_name || p.id)}</div>
            <div class="colab-badges">
              <span class="colab-badge badge-pendiente">${pendientes} pendiente${pendientes !== 1 ? 's' : ''}</span>
              <span class="colab-badge badge-en_progreso">${en_progreso} en progreso</span>
              <span class="colab-badge badge-completada">${completadas} completada${completadas !== 1 ? 's' : ''}</span>
            </div>
            <div class="colab-pbar"><div class="colab-pbar-fill" style="width:${pct}%"></div></div>
          </div>
          <div class="colab-pct">${pct}%</div>
        </div>
        <div class="colab-detail" id="colab-detail-${p.id}" style="display:none; flex-direction:column;">
          ${placeholders}
        </div>
      </div>`;
  }).join('');

  window.toggleColaborador = async function(id) {
    const el = document.getElementById('colab-detail-' + id);
    if (!el) return;

    if (el.style.display !== 'none') {
      el.style.display = 'none';
      return;
    }

    el.style.display = 'flex';

    if (el.dataset.loaded) return;
    el.dataset.loaded = 'true';

    const tareas = actPorColab[id] ?? [];
    for (const t of tareas) {
      await renderDetalleTarea(supabase, t, perfilActual, `detalle-tarea-${t.id}-${id}`);
    }
  };
}
