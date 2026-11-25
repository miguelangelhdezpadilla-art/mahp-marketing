import { sHtml as s } from '../ui.js';

// Metas de seguidores por periodo (v30).
// Cada meta tiene canal, periodo (inicio y, opcional, fin) y una meta
// total ("llegar a") y/o una ganancia ("+ nuevos en el periodo").
// follower_goals_progress calcula el avance: en canales ligados a Meta
// usa las cifras de Meta; en los demás, los registros manuales.

function colorPorPct(pct) {
  if (pct >= 90) return { fill: 'fill-green', pct: 'pct-green' };
  if (pct >= 60) return { fill: 'fill-blue', pct: 'pct-blue' };
  return { fill: 'fill-amber', pct: 'pct-amber' };
}

const fmt = n => Number(n ?? 0).toLocaleString('es-MX');

function hoyLocal() {
  return new Date(Date.now() - 6 * 3600e3).toISOString().slice(0, 10);
}
function sumarDias(fecha, n) {
  return new Date(Date.parse(`${fecha}T00:00:00Z`) + n * 86400e3).toISOString().slice(0, 10);
}
function fechaCorta(fecha) {
  if (!fecha) return '';
  return new Date(`${fecha}T12:00:00Z`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
function finDeMes(fecha) {
  const d = new Date(`${fecha}T12:00:00Z`);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
}
function inicioDeMes(fecha) { return `${fecha.slice(0, 8)}01`; }

const PERIODOS = {
  mes: () => { const h = hoyLocal(); return [inicioDeMes(h), finDeMes(h)]; },
  '30': () => { const h = hoyLocal(); return [h, sumarDias(h, 29)]; },
  '90': () => { const h = hoyLocal(); return [h, sumarDias(h, 89)]; },
  trimestre: () => {
    const h = hoyLocal(); const m = Number(h.slice(5, 7)) - 1; const ini = Math.floor(m / 3) * 3;
    const y = h.slice(0, 4);
    const inicio = `${y}-${String(ini + 1).padStart(2, '0')}-01`;
    return [inicio, finDeMes(`${y}-${String(ini + 3).padStart(2, '0')}-01`)];
  },
  anio: () => { const y = hoyLocal().slice(0, 4); return [`${y}-01-01`, `${y}-12-31`]; },
};

function textoPeriodo(m) {
  return m.end_date
    ? `${fechaCorta(m.start_date)} – ${fechaCorta(m.end_date)}`
    : `Desde ${fechaCorta(m.start_date)} (sin fecha de fin)`;
}

// Días que faltan y ritmo necesario para la ganancia.
function ritmoHtml(m) {
  if (m.estado !== 'activa' || !m.end_date) return '';
  const quedan = Math.max(0, Math.round((Date.parse(`${m.end_date}T00:00:00Z`) - Date.parse(`${hoyLocal()}T00:00:00Z`)) / 86400e3) + 1);
  const falta = m.goal_gain ? Math.max(0, m.goal_gain - m.gain_actual)
    : m.goal_total ? Math.max(0, m.goal_total - m.total_actual) : 0;
  if (!quedan) return '';
  return `<div class="meta-ritmo">Quedan ${quedan} día${quedan === 1 ? '' : 's'}${falta ? ` · se necesitan ~${fmt(Math.ceil(falta / quedan))} seguidores por día` : ' · ¡meta alcanzada!'}</div>`;
}

function estadoChip(estado) {
  const t = { activa: 'En curso', futura: 'Próxima', terminada: 'Terminada' }[estado] ?? estado;
  return `<span class="meta-estado meta-estado-${s(estado)}">${t}</span>`;
}

function fuenteNota(m) {
  if (m.source !== 'meta') return '<span class="meta-fuente">Registros manuales</span>';
  return `<span class="meta-fuente">Cifras de Meta${m.followers_at_start != null ? ` · al iniciar: ${fmt(m.followers_at_start)}${m.start_estimated ? ' (estimado)' : ''}` : ''}</span>`;
}

// ── Formulario de metas (admin/director) ───────────────────────
export async function renderFormMetas(supabase, companyId, userId, showToast) {
  const contenedor = document.getElementById('formMetas');
  if (!contenedor) return;

  const [{ data: canales }, { data: totales }] = await Promise.all([
    supabase.from('social_channels').select('id, name, icon').eq('company_id', companyId).order('name'),
    supabase.from('follower_totals').select('channel_id, total_actual, source').eq('company_id', companyId),
  ]);

  if (!canales?.length) {
    contenedor.innerHTML = '<p style="color:var(--slate-400); font-size:13px;">Primero configura canales en la sección de seguidores.</p>';
    return;
  }

  const totalPorCanal = new Map((totales ?? []).map(t => [String(t.channel_id), t]));
  const optsCanales = canales.map(c =>
    `<option value="${c.id}">${s(c.icon ?? '')} ${s(c.name)}</option>`
  ).join('');
  const [iniDef, finDef] = PERIODOS.mes();

  contenedor.innerHTML = `
    <div class="seg-form">
      <div class="seg-form-row">
        <div class="seg-form-group">
          <label class="seg-form-label" for="metaCanal">Canal</label>
          <select id="metaCanal" class="seg-form-select">${optsCanales}</select>
          <div id="metaActual" class="meta-ayuda"></div>
        </div>
        <div class="seg-form-group">
          <label class="seg-form-label" for="metaNombre">Nombre (opcional)</label>
          <input type="text" id="metaNombre" maxlength="60" placeholder="ej. Campaña Navidad" class="seg-form-input">
        </div>
      </div>
      <div class="seg-form-group">
        <span class="seg-form-label">Periodo</span>
        <div class="meta-presets" role="group" aria-label="Periodos rápidos">
          <button type="button" data-periodo="mes">Este mes</button>
          <button type="button" data-periodo="30">Próximos 30 días</button>
          <button type="button" data-periodo="90">Próximos 90 días</button>
          <button type="button" data-periodo="trimestre">Este trimestre</button>
          <button type="button" data-periodo="anio">Este año</button>
        </div>
      </div>
      <div class="seg-form-row">
        <div class="seg-form-group">
          <label class="seg-form-label" for="metaInicio">Inicio</label>
          <input type="date" id="metaInicio" class="seg-form-input" value="${iniDef}">
        </div>
        <div class="seg-form-group">
          <label class="seg-form-label" for="metaFin">Fin (opcional)</label>
          <input type="date" id="metaFin" class="seg-form-input" value="${finDef}">
        </div>
      </div>
      <div class="seg-form-row">
        <div class="seg-form-group">
          <label class="seg-form-label" for="metaGoalTotal">Meta total (llegar a)</label>
          <input type="number" id="metaGoalTotal" min="1" placeholder="ej. 5000" class="seg-form-input">
        </div>
        <div class="seg-form-group">
          <label class="seg-form-label" for="metaGoalGain">Ganancia en el periodo (+nuevos)</label>
          <input type="number" id="metaGoalGain" min="1" placeholder="ej. 500" class="seg-form-input">
        </div>
      </div>
      <p class="meta-ayuda">Llena al menos una de las dos. Si llenas una, te sugerimos la otra con base en los seguidores actuales.</p>
      <button onclick="window.guardarMeta()" class="seg-btn-guardar">
        <i class="fa-solid fa-bullseye" aria-hidden="true"></i> Guardar meta
      </button>
      <p id="metaMensaje" style="font-size:13px; margin-top:6px;"></p>
    </div>`;

  const selCanal = document.getElementById('metaCanal');
  const inpTotal = document.getElementById('metaGoalTotal');
  const inpGain = document.getElementById('metaGoalGain');
  const actualDe = () => totalPorCanal.get(String(selCanal.value));

  const pintarActual = () => {
    const t = actualDe();
    document.getElementById('metaActual').textContent = t
      ? `Hoy: ${fmt(t.total_actual)} seguidores${t.source === 'meta' ? ' (Meta)' : ' (último registro manual)'}`
      : 'Sin cifra actual todavía';
  };
  selCanal.addEventListener('change', pintarActual);
  pintarActual();

  // Sugerir la otra cifra: total = actual + ganancia.
  inpGain.addEventListener('input', () => {
    const t = actualDe(); const g = parseInt(inpGain.value, 10);
    if (t && g > 0 && !inpTotal.dataset.editado) inpTotal.value = Number(t.total_actual) + g;
  });
  inpTotal.addEventListener('input', () => {
    inpTotal.dataset.editado = inpTotal.value ? '1' : '';
    const t = actualDe(); const tot = parseInt(inpTotal.value, 10);
    if (t && tot > Number(t.total_actual) && !inpGain.value) inpGain.placeholder = `sugerido: ${tot - Number(t.total_actual)}`;
  });

  contenedor.querySelectorAll('[data-periodo]').forEach(b => b.addEventListener('click', () => {
    const [ini, fin] = PERIODOS[b.dataset.periodo]();
    document.getElementById('metaInicio').value = ini;
    document.getElementById('metaFin').value = fin;
  }));

  window.guardarMeta = async function() {
    const channel_id = selCanal.value;
    const goal_total = parseInt(inpTotal.value ?? '', 10);
    const goal_gain  = parseInt(inpGain.value ?? '', 10);
    const start_date = document.getElementById('metaInicio').value;
    const end_date   = document.getElementById('metaFin').value || null;
    const name       = document.getElementById('metaNombre').value.trim() || null;
    const mensaje    = document.getElementById('metaMensaje');
    const error = (t) => { mensaje.textContent = t; mensaje.style.color = 'var(--red)'; };

    const tieneTotal = !isNaN(goal_total) && goal_total > 0;
    const tieneGain = !isNaN(goal_gain) && goal_gain > 0;
    if (!channel_id || !start_date) return error('Elige el canal y la fecha de inicio.');
    if (!tieneTotal && !tieneGain) return error('Escribe una meta total o una ganancia (mayor a 0).');
    if (end_date && end_date < start_date) return error('La fecha de fin no puede ser antes del inicio.');

    const { error: err } = await supabase.from('follower_goals').insert({
      company_id: companyId,
      channel_id,
      goal_total: tieneTotal ? goal_total : null,
      goal_gain: tieneGain ? goal_gain : null,
      start_date,
      end_date,
      name,
      created_by: userId,
    });

    if (err) { showToast('Error: ' + err.message, 'error'); return; }

    showToast('Meta guardada');
    mensaje.textContent = '';
    inpTotal.value = ''; inpGain.value = ''; delete inpTotal.dataset.editado;
    document.getElementById('metaNombre').value = '';
    await cargarListaMetas(supabase, companyId);
  };

  await cargarListaMetas(supabase, companyId);
}

// ── Lista de metas (admin/director) ─────────────────────────────
function barra(etiqueta, pct, color, detalle) {
  if (pct == null) return '';
  return `
    <div class="meta-sublabel">${etiqueta} <span class="meta-detalle">${detalle}</span></div>
    <div class="meta-pbar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${etiqueta}">
      <div class="meta-pbar-fill ${color}" style="width:${pct}%"></div>
    </div>`;
}

function metaItemHtml(m, { conEliminar }) {
  const colorTotal = colorPorPct(m.pct_total ?? 0);
  return `
    <div class="meta-item">
      <div class="meta-icon">${s(m.channel_icon ?? '📱')}</div>
      <div class="meta-info">
        <div class="meta-nombre">${s(m.channel_name)}${m.name ? ` · ${s(m.name)}` : ''} ${estadoChip(m.estado)}</div>
        <div class="meta-vals">${textoPeriodo(m)} · Actual: <strong>${fmt(m.total_actual)}</strong></div>
        ${barra('Meta total', m.pct_total, colorTotal.fill, m.goal_total ? `${fmt(m.total_actual)} de ${fmt(m.goal_total)}` : '')}
        ${barra('Ganancia en el periodo', m.pct_gain, 'fill-blue', m.goal_gain ? `${m.gain_actual >= 0 ? '+' : ''}${fmt(m.gain_actual)} de +${fmt(m.goal_gain)}` : '')}
        ${ritmoHtml(m)}
        ${fuenteNota(m)}
      </div>
      <div class="meta-badges">
        ${m.pct_total != null ? `<span class="meta-pct-badge ${colorTotal.pct}">${m.pct_total}% total</span>` : ''}
        ${m.pct_gain != null ? `<span class="meta-pct-badge pct-blue">${m.pct_gain}% ganancia</span>` : ''}
      </div>
      ${conEliminar ? `<button onclick="window.eliminarMeta(${Number(m.goal_id)})" class="btn-eliminar-meta" aria-label="Eliminar meta">✕</button>` : ''}
    </div>`;
}

const ORDEN_ESTADO = { activa: 0, futura: 1, terminada: 2 };

export async function cargarListaMetas(supabase, companyId) {
  const contenedor = document.getElementById('listaMetas');
  if (!contenedor) return;

  const { data, error } = await supabase
    .from('follower_goals_progress')
    .select('*')
    .eq('company_id', companyId)
    .order('start_date', { ascending: false });

  if (error) { console.error('Error metas:', error.message); return; }

  if (!data?.length) {
    contenedor.innerHTML = '<p style="color:var(--slate-400); font-size:13px;">Sin metas configuradas todavía.</p>';
    return;
  }

  const ordenadas = [...data].sort((a, b) => (ORDEN_ESTADO[a.estado] ?? 9) - (ORDEN_ESTADO[b.estado] ?? 9));
  const vigentes = ordenadas.filter(m => m.estado !== 'terminada');
  const pasadas = ordenadas.filter(m => m.estado === 'terminada');

  contenedor.innerHTML = `
    ${vigentes.map(m => metaItemHtml(m, { conEliminar: true })).join('') || '<p style="color:var(--slate-400); font-size:13px;">No hay metas en curso.</p>'}
    ${pasadas.length ? `<details class="meta-pasadas"><summary>Metas terminadas (${pasadas.length})</summary>
      ${pasadas.map(m => metaItemHtml(m, { conEliminar: true })).join('')}</details>` : ''}`;

  window.eliminarMeta = async function(goalId) {
    if (!confirm('¿Eliminar esta meta? Esta acción no se puede deshacer.')) return;
    const { error } = await supabase.from('follower_goals').delete().eq('id', goalId);
    if (error) { console.error('Error al eliminar meta:', error.message); return; }
    await cargarListaMetas(supabase, companyId);
  };
}

// Metas en curso agrupadas por canal (para la tarjeta "Seguidores actuales").
export async function metasActivasPorCanal(supabase, companyId) {
  const { data } = await supabase
    .from('follower_goals_progress')
    .select('*')
    .eq('company_id', companyId)
    .eq('estado', 'activa');
  const porCanal = new Map();
  for (const m of data ?? []) {
    const k = String(m.channel_id);
    if (!porCanal.has(k)) porCanal.set(k, []);
    porCanal.get(k).push(m);
  }
  return porCanal;
}

// ── Avance vs metas (vista colaborador) ─────────────────────────
export async function renderAvanceSeguidoresColaborador(supabase, companyId, activityId, idContenedor) {
  const contenedor = document.getElementById(idContenedor);
  if (!contenedor) return;

  const { data, error } = await supabase
    .from('follower_goals_progress')
    .select('*')
    .eq('company_id', companyId)
    .eq('estado', 'activa');

  if (error) { console.error('Error avance metas:', error.message); return; }

  if (!data?.length) {
    contenedor.innerHTML = '<p class="ev-empty">No hay metas de seguidores en curso.</p>';
    return;
  }

  contenedor.innerHTML = data.map(m => {
    const colorTotal = colorPorPct(m.pct_total ?? 0);
    const faltanTotal = Math.max(0, (m.goal_total ?? 0) - m.total_actual);
    const faltanGain  = Math.max(0, (m.goal_gain ?? 0) - m.gain_actual);
    return `
      <div class="seg-meta-row">
        <div class="seg-meta-canal">
          <span class="seg-meta-canal-icon">${s(m.channel_icon ?? '📱')}</span>
          <span class="seg-meta-canal-nombre">${s(m.channel_name)}${m.name ? ` · ${s(m.name)}` : ''}</span>
          <span class="meta-periodo-mini">${textoPeriodo(m)}</span>
        </div>

        ${m.goal_total ? `
        <div class="seg-meta-bloque">
          <div class="seg-meta-bloque-label">Meta total del equipo</div>
          <div class="seg-meta-nums">
            <span class="seg-meta-actual">${fmt(m.total_actual)}</span>
            <span class="seg-meta-de">de</span>
            <span class="seg-meta-objetivo">${fmt(m.goal_total)} seguidores</span>
          </div>
          <div class="seg-pbar">
            <div class="seg-pbar-fill ${colorTotal.fill}" style="width:${m.pct_total ?? 0}%"></div>
          </div>
          <div class="seg-meta-footer">
            <span class="seg-meta-resta">Faltan ${fmt(faltanTotal)} seguidores</span>
            <span class="seg-meta-chip ${colorTotal.pct}">${m.pct_total ?? 0}%</span>
          </div>
        </div>` : ''}

        ${m.goal_gain ? `
        <div class="seg-meta-bloque">
          <div class="seg-meta-bloque-label">Ganancia en el periodo</div>
          <div class="seg-meta-nums">
            <span class="seg-meta-actual">${m.gain_actual >= 0 ? '+' : ''}${fmt(m.gain_actual)}</span>
            <span class="seg-meta-de">de</span>
            <span class="seg-meta-objetivo">+${fmt(m.goal_gain)} nuevos</span>
          </div>
          <div class="seg-pbar">
            <div class="seg-pbar-fill fill-blue" style="width:${m.pct_gain ?? 0}%"></div>
          </div>
          <div class="seg-meta-footer">
            <span class="seg-meta-resta">Faltan +${fmt(faltanGain)} más</span>
            <span class="seg-meta-chip pct-blue">${m.pct_gain ?? 0}%</span>
          </div>
        </div>` : ''}
        ${ritmoHtml(m)}
      </div>`;
  }).join('');
}
