import { sHtml as s } from '../ui.js';

function colorPorPct(pct) {
  if (pct >= 90) return { fill: 'fill-green', pct: 'pct-green' };
  if (pct >= 60) return { fill: 'fill-blue', pct: 'pct-blue' };
  return { fill: 'fill-amber', pct: 'pct-amber' };
}

// ── Formulario de metas (admin/director) ───────────────────────
export async function renderFormMetas(supabase, companyId, userId, showToast) {
  const contenedor = document.getElementById('formMetas');
  if (!contenedor) return;

  const { data: canales } = await supabase
    .from('social_channels')
    .select('id, name, icon')
    .eq('company_id', companyId)
    .order('name');

  if (!canales?.length) {
    contenedor.innerHTML = '<p style="color:var(--slate-400); font-size:13px;">Primero configura canales en la sección de seguidores.</p>';
    return;
  }

  const optsCanales = canales.map(c =>
    `<option value="${c.id}">${s(c.icon ?? '')} ${s(c.name)}</option>`
  ).join('');

  contenedor.innerHTML = `
    <div class="seg-form">
      <div class="seg-form-row">
        <div class="seg-form-group">
          <label class="seg-form-label">Canal</label>
          <select id="metaCanal" class="seg-form-select">${optsCanales}</select>
        </div>
      </div>
      <div class="seg-form-row">
        <div class="seg-form-group">
          <label class="seg-form-label">Meta total (llegar a)</label>
          <input type="number" id="metaGoalTotal" min="1" placeholder="ej. 5000" class="seg-form-input">
        </div>
        <div class="seg-form-group">
          <label class="seg-form-label">Ganancia esperada (+nuevos)</label>
          <input type="number" id="metaGoalGain" min="1" placeholder="ej. 500" class="seg-form-input">
        </div>
      </div>
      <button onclick="window.guardarMeta()" class="seg-btn-guardar">
        <i class="fa-solid fa-bullseye" aria-hidden="true"></i> Guardar meta
      </button>
      <p id="metaMensaje" style="font-size:13px; margin-top:6px;"></p>
    </div>`;

  window.guardarMeta = async function() {
    const channel_id = document.getElementById('metaCanal')?.value;
    const goal_total  = parseInt(document.getElementById('metaGoalTotal')?.value ?? '', 10);
    const goal_gain   = parseInt(document.getElementById('metaGoalGain')?.value ?? '', 10);
    const mensaje     = document.getElementById('metaMensaje');

    if (!channel_id || isNaN(goal_total) || goal_total <= 0 || isNaN(goal_gain) || goal_gain <= 0) {
      mensaje.textContent = 'Completa canal, meta total y ganancia esperada (mayores a 0).';
      mensaje.style.color = 'var(--red)';
      return;
    }

    const { error } = await supabase.from('follower_goals').upsert({
      company_id: companyId,
      channel_id,
      goal_total,
      goal_gain,
      created_by: userId,
    }, { onConflict: 'company_id,channel_id' });

    if (error) {
      showToast('Error: ' + error.message, 'error');
      return;
    }

    showToast('Meta guardada');
    mensaje.textContent = '';
    await cargarListaMetas(supabase, companyId);
  };

  await cargarListaMetas(supabase, companyId);
}

// ── Lista de metas configuradas (admin/director) ────────────────
export async function cargarListaMetas(supabase, companyId) {
  const contenedor = document.getElementById('listaMetas');
  if (!contenedor) return;

  const { data, error } = await supabase
    .from('follower_goals_progress')
    .select('*')
    .eq('company_id', companyId);

  if (error) { console.error('Error metas:', error.message); return; }

  if (!data?.length) {
    contenedor.innerHTML = '<p style="color:var(--slate-400); font-size:13px;">Sin metas configuradas todavía.</p>';
    return;
  }

  contenedor.innerHTML = data.map(m => {
    const colorTotal = colorPorPct(m.pct_total);
    return `
      <div class="meta-item">
        <div class="meta-icon">${s(m.channel_icon ?? '📱')}</div>
        <div class="meta-info">
          <div class="meta-nombre">${s(m.channel_name)}</div>
          <div class="meta-vals">
            Meta: ${Number(m.goal_total).toLocaleString()} · Ganar: +${Number(m.goal_gain).toLocaleString()}
            · Actual: ${Number(m.total_actual).toLocaleString()}
          </div>
          <div class="meta-sublabel">Avance total</div>
          <div class="meta-pbar">
            <div class="meta-pbar-fill ${colorTotal.fill}" style="width:${m.pct_total}%"></div>
          </div>
          <div class="meta-sublabel">Ganancia en campaña</div>
          <div class="meta-pbar">
            <div class="meta-pbar-fill fill-blue" style="width:${m.pct_gain}%"></div>
          </div>
        </div>
        <div class="meta-badges">
          <span class="meta-pct-badge ${colorTotal.pct}">${m.pct_total}% total</span>
          <span class="meta-pct-badge pct-blue">${m.pct_gain}% ganancia</span>
        </div>
        <button onclick="window.eliminarMeta(${m.goal_id})" class="btn-eliminar-meta">✕</button>
      </div>`;
  }).join('');

  window.eliminarMeta = async function(goalId) {
    const { error } = await supabase.from('follower_goals').delete().eq('id', goalId);
    if (error) { console.error('Error al eliminar meta:', error.message); return; }
    await cargarListaMetas(supabase, companyId);
  };
}

// ── Avance vs metas (vista colaborador) ─────────────────────────
export async function renderAvanceSeguidoresColaborador(supabase, companyId, activityId, idContenedor) {
  const contenedor = document.getElementById(idContenedor);
  if (!contenedor) return;

  const { data, error } = await supabase
    .from('follower_goals_progress')
    .select('*')
    .eq('company_id', companyId);

  if (error) { console.error('Error avance metas:', error.message); return; }

  if (!data?.length) {
    contenedor.innerHTML = '<p class="ev-empty">El director aún no ha configurado metas de seguidores.</p>';
    return;
  }

  contenedor.innerHTML = data.map(m => {
    const colorTotal = colorPorPct(m.pct_total);
    const faltanTotal = Math.max(0, m.goal_total - m.total_actual);
    const faltanGain  = Math.max(0, m.goal_gain - m.gain_actual);
    return `
      <div class="seg-meta-row">
        <div class="seg-meta-canal">
          <span class="seg-meta-canal-icon">${s(m.channel_icon ?? '📱')}</span>
          <span class="seg-meta-canal-nombre">${s(m.channel_name)}</span>
        </div>

        <div class="seg-meta-bloque">
          <div class="seg-meta-bloque-label">Meta total del equipo</div>
          <div class="seg-meta-nums">
            <span class="seg-meta-actual">${Number(m.total_actual).toLocaleString()}</span>
            <span class="seg-meta-de">de</span>
            <span class="seg-meta-objetivo">${Number(m.goal_total).toLocaleString()} seguidores</span>
          </div>
          <div class="seg-pbar">
            <div class="seg-pbar-fill ${colorTotal.fill}" style="width:${m.pct_total}%"></div>
          </div>
          <div class="seg-meta-footer">
            <span class="seg-meta-resta">Faltan ${faltanTotal.toLocaleString()} seguidores</span>
            <span class="seg-meta-chip ${colorTotal.pct}">${m.pct_total}%</span>
          </div>
        </div>

        <div class="seg-meta-bloque">
          <div class="seg-meta-bloque-label">Ganancia esperada en campaña</div>
          <div class="seg-meta-nums">
            <span class="seg-meta-actual">+${Number(m.gain_actual).toLocaleString()}</span>
            <span class="seg-meta-de">de</span>
            <span class="seg-meta-objetivo">+${Number(m.goal_gain).toLocaleString()} nuevos</span>
          </div>
          <div class="seg-pbar">
            <div class="seg-pbar-fill fill-blue" style="width:${m.pct_gain}%"></div>
          </div>
          <div class="seg-meta-footer">
            <span class="seg-meta-resta">Faltan +${faltanGain.toLocaleString()} más</span>
            <span class="seg-meta-chip pct-blue">${m.pct_gain}%</span>
          </div>
        </div>
      </div>`;
  }).join('');
}
