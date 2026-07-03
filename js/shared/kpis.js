import { sHtml } from '../ui.js';

export function renderizarTarjetaKpi(kpi) {
  let pct = kpi.target_value > 0 ? Math.min(100, Math.round((kpi.current_value / kpi.target_value) * 100)) : 0;
  return `
    <div class="kpi-card">
      <div class="kpi-name">${sHtml(kpi.name)}</div>
      <div class="kpi-values">
        <span class="kpi-current">${kpi.current_value}</span>
        <span class="kpi-target">/ ${kpi.target_value} ${sHtml(kpi.unit) || ''}</span>
      </div>
      <div class="kpi-bar-bg"><div class="kpi-bar-fill" style="width:${pct}%;"></div></div>
    </div>`;
}

// segundoArg puede ser un array de seguidores (nuevo) o un objeto de opciones (legado).
export function renderizarGridKpis(listaKpis, segundoArg = null, tercerArg = null) {
  let seguidores = [];
  let conWrapper = false;
  let mensajeVacio = 'Sin KPIs configurados todavía.';

  if (Array.isArray(segundoArg)) {
    seguidores = segundoArg;
    if (tercerArg && typeof tercerArg === 'object') {
      if (tercerArg.conWrapper  !== undefined) conWrapper  = tercerArg.conWrapper;
      if (tercerArg.mensajeVacio !== undefined) mensajeVacio = tercerArg.mensajeVacio;
    }
  } else if (segundoArg && typeof segundoArg === 'object') {
    if (segundoArg.conWrapper  !== undefined) conWrapper  = segundoArg.conWrapper;
    if (segundoArg.mensajeVacio !== undefined) mensajeVacio = segundoArg.mensajeVacio;
  }

  const tarjetasKpi = (listaKpis ?? []).map(renderizarTarjetaKpi).join('');

  const tarjetasSeguidores = seguidores.map(f => `
    <div class="kpi-card kpi-seguidores">
      <div class="kpi-icon">${f.channel_icon ? sHtml(f.channel_icon) : '📱'}</div>
      <h4>${sHtml(f.channel_name)}</h4>
      <div class="kpi-valores">${Number(f.total_actual).toLocaleString('es-MX')} seguidores</div>
      <div class="kpi-sub">Red social</div>
    </div>`).join('');

  const sinDatos = !listaKpis?.length && !seguidores.length;
  if (sinDatos) {
    return `<div class="empty-state"><i class="fa-solid fa-bullseye"></i><p>${mensajeVacio}</p></div>`;
  }

  const html = tarjetasKpi + tarjetasSeguidores;
  return conWrapper ? `<div class="kpi-grid">${html}</div>` : html;
}

export async function cargarSeguidoresParaKpis(supabase, companyId) {
  const { data, error } = await supabase
    .from('follower_totals')
    .select('channel_name, channel_icon, total_actual')
    .eq('company_id', companyId);
  if (error) {
    console.error('[kpis] cargarSeguidoresParaKpis:', error.message);
    return [];
  }
  return data ?? [];
}
