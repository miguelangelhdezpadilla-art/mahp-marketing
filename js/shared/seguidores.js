import { sHtml as s } from '../ui.js';

// ── Totales por canal ─────────────────────────────────────────
export async function cargarTotalesSeguidores(supabase, companyId, campaignId = null) {
  const contenedor = document.getElementById('seguridoresGrid');
  if (!contenedor) return;

  const { data: totales, error } = await supabase
    .from('follower_totals')
    .select('*')
    .eq('company_id', companyId);

  if (error) { console.error('Error seguidores:', error.message); return; }

  let deltasPorCanal = {};
  if (campaignId) {
    const { data: deltas } = await supabase
      .from('follower_delta_by_campaign')
      .select('*')
      .eq('campaign_id', campaignId);
    (deltas ?? []).forEach(d => { deltasPorCanal[d.channel_id] = d.delta_total; });
  }

  contenedor.innerHTML = totales.length
    ? totales.map(t => {
        const delta = deltasPorCanal[t.channel_id] ?? null;
        const deltaHtml = delta !== null
          ? `<div class="seg-delta ${delta >= 0 ? 'delta-up' : 'delta-down'}">
               <i class="fa-solid fa-arrow-trend-${delta >= 0 ? 'up' : 'down'}" aria-hidden="true"></i>
               ${delta >= 0 ? '+' : ''}${delta.toLocaleString()} esta campaña
             </div>`
          : '';
        return `
          <div class="seg-card">
            <div class="seg-header">
              <span class="seg-icon">${s(t.channel_icon ?? '📱')}</span>
              <span class="seg-nombre">${s(t.channel_name)}</span>
            </div>
            <div class="seg-total">${Number(t.total_actual).toLocaleString()}</div>
            <div class="seg-sub">seguidores actuales</div>
            ${deltaHtml}
          </div>`;
      }).join('')
    : '<p style="color:var(--slate-400); font-size:13px;">Sin canales configurados todavía.</p>';
}

// ── Historial de cambios ──────────────────────────────────────
export async function cargarHistorialSeguidores(supabase, companyId, activityId = null) {
  const contenedor = document.getElementById('historialSeguidores');
  if (!contenedor) return;

  let query = supabase
    .from('follower_logs')
    .select(`
      id, before_count, after_count, delta, note, created_at,
      social_channels ( name, icon ),
      actividades ( titulo ),
      profiles ( full_name )
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (activityId) query = query.eq('activity_id', activityId);

  const { data, error } = await query;
  if (error) { console.error('Error historial:', error.message); return; }

  if (!data.length) {
    contenedor.innerHTML = '<p style="color:var(--slate-400); font-size:13px; padding:.5rem 0;">Sin registros todavía.</p>';
    return;
  }

  contenedor.innerHTML = `
    <table class="seg-hist-table">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Actividad</th>
          <th>Canal</th>
          <th>Antes</th>
          <th>Después</th>
          <th>Cambio</th>
          <th>Reportado por</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(r => {
          const chip = r.delta > 0
            ? `<span class="delta-chip chip-up"><i class="fa-solid fa-arrow-up" style="font-size:11px" aria-hidden="true"></i> +${r.delta.toLocaleString()}</span>`
            : r.delta < 0
            ? `<span class="delta-chip chip-down"><i class="fa-solid fa-arrow-down" style="font-size:11px" aria-hidden="true"></i> ${r.delta.toLocaleString()}</span>`
            : `<span class="delta-chip chip-neutral">Sin cambio</span>`;
          return `
            <tr>
              <td>${new Date(r.created_at).toLocaleDateString()}</td>
              <td>${r.actividades ? `<span class="act-pill">${s(r.actividades.titulo)}</span>` : '<span style="color:var(--slate-400)">—</span>'}</td>
              <td><span class="canal-pill">${s(r.social_channels?.icon ?? '')} ${s(r.social_channels?.name ?? '—')}</span></td>
              <td>${Number(r.before_count).toLocaleString()}</td>
              <td>${Number(r.after_count).toLocaleString()}</td>
              <td>${chip}</td>
              <td style="color:var(--slate-400)">${s(r.profiles?.full_name ?? '—')}</td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

// ── Formulario de reporte ─────────────────────────────────────
export async function renderFormSeguidores(supabase, companyId, activityId = null, onGuardado) {
  const contenedorId = activityId != null ? `seg-form-${activityId}` : 'formSeguidores';
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) return;

  const [{ data: canales }, { data: actividades }] = await Promise.all([
    supabase.from('social_channels').select('id, name, icon').eq('company_id', companyId).order('name'),
    supabase.from('actividades').select('id, titulo').eq('company_id', companyId).order('fecha', { ascending: false }),
  ]);

  if (!canales?.length) {
    contenedor.innerHTML = '<p style="color:var(--slate-400); font-size:13px;">Primero configura al menos un canal en "Gestionar canales".</p>';
    return;
  }

  const optsCanales = canales.map(c =>
    `<option value="${c.id}">${s(c.icon ?? '')} ${s(c.name)}</option>`
  ).join('');

  const optsActividades = [
    '<option value="">Sin actividad específica</option>',
    ...(actividades ?? []).map(a =>
      `<option value="${a.id}" ${String(a.id) === String(activityId) ? 'selected' : ''}>${s(a.titulo)}</option>`
    )
  ].join('');

  contenedor.innerHTML = `
    <div class="seg-form">
      <div class="seg-form-row">
        <div class="seg-form-group">
          <label class="seg-form-label">Canal</label>
          <select id="segCanal" class="seg-form-select">${optsCanales}</select>
        </div>
        <div class="seg-form-group">
          <label class="seg-form-label">Actividad relacionada</label>
          <select id="segActividad" class="seg-form-select">${optsActividades}</select>
        </div>
      </div>
      <div class="seg-form-row">
        <div class="seg-form-group">
          <label class="seg-form-label">Seguidores antes</label>
          <input type="number" id="segAntes" min="0" placeholder="ej. 4500" class="seg-form-input">
        </div>
        <div class="seg-form-group">
          <label class="seg-form-label">Seguidores después</label>
          <input type="number" id="segDespues" min="0" placeholder="ej. 4820" class="seg-form-input">
        </div>
      </div>
      <div id="segDeltaPreview" class="seg-delta-preview" style="display:none;"></div>
      <div class="seg-form-group">
        <label class="seg-form-label">Nota (opcional)</label>
        <input type="text" id="segNota" placeholder="ej. Pico por el partido del martes" class="seg-form-input">
      </div>
      <button onclick="window.guardarSeguidores()" class="seg-btn-guardar">
        <i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Guardar reporte
      </button>
      <p id="segMensaje" style="font-size:13px; margin-top:6px;"></p>
    </div>`;

  ['segAntes', 'segDespues'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      const antes   = parseInt(document.getElementById('segAntes')?.value ?? '0', 10);
      const despues = parseInt(document.getElementById('segDespues')?.value ?? '0', 10);
      const preview = document.getElementById('segDeltaPreview');
      if (!isNaN(antes) && !isNaN(despues) && document.getElementById('segDespues')?.value) {
        const diff = despues - antes;
        preview.style.display = 'flex';
        preview.className = `seg-delta-preview ${diff >= 0 ? 'preview-up' : 'preview-down'}`;
        preview.innerHTML = `<i class="fa-solid fa-calculator" aria-hidden="true"></i> Cambio calculado: <strong>${diff >= 0 ? '+' : ''}${diff.toLocaleString()} seguidores</strong>`;
      } else {
        preview.style.display = 'none';
      }
    });
  });

  window.guardarSeguidores = async function() {
    const channel_id   = document.getElementById('segCanal')?.value;
    const activity_id  = document.getElementById('segActividad')?.value || null;
    const before_count = parseInt(document.getElementById('segAntes')?.value ?? '', 10);
    const after_count  = parseInt(document.getElementById('segDespues')?.value ?? '', 10);
    const note         = document.getElementById('segNota')?.value?.trim() || null;
    const mensaje      = document.getElementById('segMensaje');

    if (!channel_id || isNaN(before_count) || isNaN(after_count)) {
      mensaje.textContent = 'Completa canal, seguidores antes y seguidores después.';
      mensaje.style.color = 'var(--red)';
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();

    const { error } = await supabase.from('follower_logs').insert({
      company_id: companyId,
      channel_id,
      activity_id,
      reported_by: session.user.id,
      before_count,
      after_count,
      note,
    });

    if (error) {
      mensaje.textContent = 'Error: ' + error.message;
      mensaje.style.color = 'var(--red)';
      return;
    }

    mensaje.textContent = '✅ Reporte guardado.';
    mensaje.style.color = 'var(--green)';

    ['segAntes', 'segDespues', 'segNota'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('segDeltaPreview').style.display = 'none';

    if (typeof onGuardado === 'function') await onGuardado();
  };
}

// ── Gestión de canales ────────────────────────────────────────
export async function renderGestionCanales(supabase, companyId, showToast) {
  const contenedor = document.getElementById('gestionCanales');
  if (!contenedor) return;

  const { data: canales } = await supabase
    .from('social_channels')
    .select('id, name, icon')
    .eq('company_id', companyId)
    .order('name');

  contenedor.innerHTML = `
    <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:12px;">
      <input type="text" id="nuevoIconCanal" placeholder="📸" style="width:60px;" maxlength="2">
      <input type="text" id="nuevoNombreCanal" placeholder="Nombre del canal (ej. Instagram)">
      <button onclick="window.agregarCanal()" style="width:auto;">
        <i class="fa-solid fa-plus" aria-hidden="true"></i> Agregar canal
      </button>
    </div>
    <div style="display:flex; gap:8px; flex-wrap:wrap;">
      ${(canales ?? []).map(c => `
        <span class="canal-tag">
          ${s(c.icon ?? '')} ${s(c.name)}
          <button onclick="window.eliminarCanal(${c.id})"
                  style="background:none; border:none; cursor:pointer; color:var(--slate-400); padding:0 0 0 4px; width:auto; min-width:0;">
            <i class="fa-solid fa-xmark" style="font-size:11px" aria-hidden="true"></i>
          </button>
        </span>`).join('')}
      ${!canales?.length ? '<span style="color:var(--slate-400); font-size:13px;">Sin canales todavía.</span>' : ''}
    </div>`;

  window.agregarCanal = async function() {
    const icon = document.getElementById('nuevoIconCanal')?.value?.trim() || '📱';
    const name = document.getElementById('nuevoNombreCanal')?.value?.trim();
    if (!name) { showToast('Escribe el nombre del canal.', 'error'); return; }

    const { error } = await supabase.from('social_channels').insert({ company_id: companyId, name, icon });
    if (error) { showToast('Error: ' + error.message, 'error'); return; }

    showToast('Canal agregado.');
    await renderGestionCanales(supabase, companyId, showToast);
  };

  window.eliminarCanal = async function(canalId) {
    const { error } = await supabase.from('social_channels').delete().eq('id', canalId);
    if (error) { showToast('Error: ' + error.message, 'error'); return; }
    showToast('Canal eliminado.');
    await renderGestionCanales(supabase, companyId, showToast);
  };
}
