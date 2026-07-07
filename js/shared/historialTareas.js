import { sHtml as s } from '../ui.js';

function fechaFormateada(fechaIso) {
  return new Date(fechaIso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Historial de tareas completadas (admin/director) ────────────
export async function renderHistorialTareas(supabase, companyId, idContenedor) {
  const contenedor = document.getElementById(idContenedor);
  if (!contenedor) return;

  const { data: tareas, error } = await supabase
    .from('actividades')
    .select('id, titulo, canal, fecha, assigned_to, campaign_id')
    .eq('company_id', companyId)
    .eq('status', 'completada')
    .order('fecha', { ascending: false });

  if (error) { console.error('[historialTareas] actividades:', error.message); return; }

  if (!tareas?.length) {
    contenedor.innerHTML = '<div class="empty-state"><i class="fa-solid fa-clipboard-check"></i><p>Aún no hay tareas completadas.</p></div>';
    return;
  }

  const datosPorTarea = {};

  await Promise.all(tareas.map(async t => {
    const [{ data: avances }, { data: evidencias }, { data: perfil }] = await Promise.all([
      supabase.from('activity_updates')
        .select('progress_pct, note, created_at')
        .eq('activity_id', t.id)
        .order('created_at', { ascending: false }),
      supabase.from('evidencias')
        .select('file_url, file_type, file_name')
        .eq('activity_id', t.id),
      t.assigned_to
        ? supabase.from('profiles').select('full_name').eq('id', t.assigned_to).single()
        : Promise.resolve({ data: null }),
    ]);

    datosPorTarea[t.id] = {
      avances: avances ?? [],
      evidencias: evidencias ?? [],
      colaborador: perfil?.full_name ?? '—',
    };
  }));

  contenedor.innerHTML = '<div class="historial-section">' + tareas.map(t => {
    const { avances, evidencias, colaborador } = datosPorTarea[t.id];

    const evHtml = evidencias.length
      ? evidencias.map(ev =>
          ev.file_type === 'image'
            ? `<div class="historial-ev-thumb">
                 <img src="${s(ev.file_url)}" alt="${s(ev.file_name)}"
                      onclick="window.open('${s(ev.file_url)}','_blank')">
               </div>`
            : `<div class="historial-ev-thumb video"
                    onclick="window.open('${s(ev.file_url)}','_blank')">🎬</div>`
        ).join('')
      : '';

    const avancesHtml = avances.length
      ? avances.map(a => `
          <div class="historial-avance-item">
            <div class="historial-avance-pct">${a.progress_pct}%</div>
            <div class="historial-avance-info">
              <div class="historial-avance-nota">${a.note ? s(a.note) : '(sin nota)'}</div>
              <div class="historial-avance-fecha">${fechaFormateada(a.created_at)}</div>
            </div>
          </div>`).join('')
      : '';

    return `
      <div class="historial-card" id="hcard-${t.id}">
        <div class="historial-header" onclick="window.toggleHistorial(${t.id})">
          <div class="historial-check">✅</div>
          <div class="historial-info">
            <div class="historial-titulo">${s(t.titulo)}</div>
            <div class="historial-meta">
              ${s(colaborador)} · ${s(t.canal ?? '')} · ${t.fecha}
              · ${evidencias.length} evidencia${evidencias.length !== 1 ? 's' : ''}
              · ${avances.length} avance${avances.length !== 1 ? 's' : ''}
            </div>
          </div>
          <i class="fa-solid fa-chevron-right" id="hflecha-${t.id}" style="color:var(--text-muted)"></i>
        </div>

        <div id="hbody-${t.id}" class="historial-body" style="display:none;">
          <div>
            <div class="historial-subtitulo">📎 Evidencias (${evidencias.length})</div>
            <div class="historial-ev-grid">${evHtml}</div>
            ${evidencias.length === 0 ? '<p class="ev-empty">Sin evidencias.</p>' : ''}
          </div>

          <div>
            <div class="historial-subtitulo">📊 Historial de avances (${avances.length})</div>
            <div class="historial-avances">${avancesHtml}</div>
            ${avances.length === 0 ? '<p class="ev-empty">Sin avances registrados.</p>' : ''}
          </div>
        </div>
      </div>`;
  }).join('') + '</div>';

  window.toggleHistorial = function(tareaId) {
    const body   = document.getElementById(`hbody-${tareaId}`);
    const flecha = document.getElementById(`hflecha-${tareaId}`);
    if (!body) return;

    const abierto = body.style.display !== 'none';
    body.style.display = abierto ? 'none' : 'flex';
    if (flecha) flecha.style.transform = abierto ? 'rotate(0deg)' : 'rotate(90deg)';
  };
}
