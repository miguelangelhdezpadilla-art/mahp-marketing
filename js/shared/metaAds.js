// Tarjeta "Tendencias de campañas" (pestaña Redes sociales, v33).
//
// Lee meta_ads_daily / meta_ads_campaigns, que llena la Edge Function
// meta-ads cada noche. Solo admin, director y super_admin (lo garantiza
// la RLS). Mismo criterio de periodos que Meta: "últimos N días" termina
// AYER; el % compara contra los N días anteriores.
//
// Resultado principal: conversaciones con mensajes iniciadas, y su costo
// (importe gastado ÷ conversaciones), como en el resumen de Meta.
import { sHtml as s, showToast } from '../ui.js';

const ESTADOS = {
  ACTIVE: ['Activa', 'badge-green'],
  PAUSED: ['Pausada', 'badge-slate'],
  CAMPAIGN_PAUSED: ['Pausada', 'badge-slate'],
  ARCHIVED: ['Archivada', 'badge-slate'],
  DELETED: ['Eliminada', 'badge-slate'],
  IN_PROCESS: ['En proceso', 'badge-amber'],
  WITH_ISSUES: ['Con problemas', 'badge-red'],
};

const estado = { supabase: null, companyId: null, perfil: null, idCont: null, dias: 7 };

const diaLocal = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString('en-CA'); // YYYY-MM-DD en hora local
};

export async function renderPanelMetaAds(supabase, companyId, perfil, idCont) {
  Object.assign(estado, { supabase, companyId, perfil, idCont });
  const cont = document.getElementById(idCont);
  if (!cont) return;
  if (!cont.dataset.enlazado) {
    cont.addEventListener('click', manejarClic);
    cont.dataset.enlazado = '1';
  }
  await recargar();
}

async function recargar() {
  const cont = document.getElementById(estado.idCont);
  const sb = estado.supabase;
  const { data: cuenta, error } = await sb.from('company_meta_ads')
    .select('ad_account_id, ad_account_name, currency, token_expires_at, status, accounts, last_error, last_synced_at')
    .eq('company_id', estado.companyId).maybeSingle();
  if (error) { cont.innerHTML = `<p class="mi-rango">No se pudo cargar: ${s(error.message)}</p>`; return; }

  const aviso = avisoConexion(cuenta);
  if (!cuenta || !cuenta.ad_account_id) { cont.innerHTML = aviso; return; }

  const n = estado.dias;
  const desde = diaLocal(-2 * n);
  const [{ data: campanas }, { data: diarias }, resAnalisis] = await Promise.all([
    sb.from('meta_ads_campaigns').select('campaign_id, name, effective_status').eq('company_id', estado.companyId),
    sb.from('meta_ads_daily').select('campaign_id, fecha, spend, conversations')
      .eq('company_id', estado.companyId).gte('fecha', desde).lte('fecha', diaLocal(-1)),
    // v35; si aún no existe la tabla, el recuadro simplemente no aparece.
    sb.from('meta_ads_analysis')
      .select('opportunity_score, recommendations, recommendations_at, recommendations_error, analysis, analysis_at')
      .eq('company_id', estado.companyId).maybeSingle(),
  ]);

  const inicioActual = diaLocal(-n);
  const fmt = dinero(cuenta.currency);
  const actual = (diarias ?? []).filter(d => d.fecha >= inicioActual);
  const previo = (diarias ?? []).filter(d => d.fecha < inicioActual);
  const tot = filas => filas.reduce((a, d) => ({ spend: a.spend + Number(d.spend), conv: a.conv + d.conversations }), { spend: 0, conv: 0 });
  const A = tot(actual), P = tot(previo);
  const costo = t => t.conv ? t.spend / t.conv : null;

  const filasCampana = (campanas ?? []).map(c => {
    const a = tot(actual.filter(d => d.campaign_id === c.campaign_id));
    const p = tot(previo.filter(d => d.campaign_id === c.campaign_id));
    return { ...c, a, p };
  }).filter(c => c.effective_status === 'ACTIVE' || c.a.spend > 0 || c.p.spend > 0)
    .sort((x, y) => y.a.spend - x.a.spend);

  cont.innerHTML = `
    ${aviso}
    <div class="mi-filtros" style="justify-content:space-between;">
      <div class="mi-seg-ctrl" role="group" aria-label="Periodo">
        ${[7, 30].map(d => `<button data-accion="periodo" data-dias="${d}" aria-pressed="${n === d}">Últimos ${d} días</button>`).join('')}
      </div>
      <button class="mi-actualizar" data-accion="sync">↻ Actualizar</button>
    </div>
    <p class="mi-rango">${s(cuenta.ad_account_name ?? cuenta.ad_account_id)} · ${s(fechaCorta(inicioActual))} – ${s(fechaCorta(diaLocal(-1)))}, comparado con los ${n} días anteriores${cuenta.last_synced_at ? ` · actualizado ${s(new Date(cuenta.last_synced_at).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}` : ''}</p>
    <div class="mi-tiles">
      ${tile('Conversaciones con mensajes iniciadas', A.conv.toLocaleString('es-MX'), delta(A.conv, P.conv, true))}
      ${tile('Por conversación iniciada', costo(A) == null ? '—' : fmt(costo(A)), delta(costo(A), costo(P), false))}
      ${tile('Importe gastado', fmt(A.spend), delta(A.spend, P.spend, null))}
    </div>
    <div class="mi-bloque">
      <h3>Tendencias de la campaña <span class="mi-sub">· costo por conversación iniciada</span></h3>
      ${filasCampana.length ? `<div style="display:grid; gap:6px;">${filasCampana.map(c => filaCampana(c, fmt, n)).join('')}</div>`
        : '<p class="mi-rango">Sin campañas activas ni gasto en este periodo.</p>'}
    </div>
    ${resAnalisis.error ? '' : bloqueSugerencias(resAnalisis.data, fmt)}`;

  // Mini gráficas: costo diario por conversación de cada campaña.
  cont.querySelectorAll('[data-spark]').forEach(el => {
    const id = el.dataset.spark;
    const serie = [];
    for (let i = n; i >= 1; i--) {
      const f = diaLocal(-i);
      const d = actual.find(x => x.campaign_id === id && x.fecha === f);
      serie.push(d && d.conversations ? Number(d.spend) / d.conversations : null);
    }
    el.innerHTML = sparkline(serie);
  });
}

// ── Sugerencias de campaña (v35) ──
// Arriba lo que dice Meta (puntaje de oportunidad y recomendaciones);
// abajo el análisis de Claude con la proyección que calcula el sistema.
const PRIORIDAD = { alta: ['Alta', 'badge-red'], media: ['Media', 'badge-amber'], baja: ['Baja', 'badge-slate'] };
const fechaHora = f => new Date(f).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function bloqueSugerencias(fila, fmt) {
  const recs = fila?.recommendations ?? [];
  const puntaje = fila?.opportunity_score;
  const a = fila?.analysis;

  const meta = `
    <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:flex-start;">
      <div class="mi-tile" style="flex:0 0 170px;">
        <div class="mi-tile-titulo">Puntaje de oportunidad de Meta</div>
        <div class="mi-tile-valor">${puntaje == null ? '—' : `${Math.round(puntaje)}<span class="mi-sub"> / 100</span>`}</div>
        <div class="mi-tile-nota">${puntaje == null ? 'Meta no lo dio para esta cuenta' : 'Qué tan optimizada está la cuenta, según Meta'}</div>
      </div>
      <div style="flex:1 1 260px; min-width:0;">
        <div class="mi-tile-titulo" style="margin-bottom:6px;">Recomendaciones de Meta</div>
        ${recs.length ? `<ul style="margin:0; padding-left:18px; display:grid; gap:6px;">${recs.slice(0, 8).map(r => `
          <li>${s(r.texto)}${r.mejora ? ` <span class="mi-tile-nota">· ${s(r.mejora)}</span>` : ''}${r.puntos ? ` <span class="badge badge-green">+${s(String(r.puntos))} pts</span>` : ''}
            ${r.url ? ` <a href="${s(r.url)}" target="_blank" rel="noopener noreferrer" style="font-size:12px;">Ver en Meta ↗</a>` : ''}</li>`).join('')}</ul>`
          : `<p class="mi-rango" style="margin:0;">${fila?.recommendations_error ? 'Meta no entregó recomendaciones para esta cuenta.' : fila?.recommendations_at ? 'Meta no tiene recomendaciones por ahora.' : 'Se cargan en la próxima actualización (↻ Actualizar).'}</p>`}
      </div>
    </div>`;

  const p = a?.proyeccion_cifras;
  const claude = a ? `
    ${a.resumen ? `<p style="margin:0 0 8px; font-weight:500;">${s(a.resumen)}</p>` : ''}
    ${a.hallazgos?.length ? `<ul style="margin:0 0 10px; padding-left:18px; display:grid; gap:4px;">${a.hallazgos.map(h => `<li>${s(h)}</li>`).join('')}</ul>` : ''}
    ${a.sugerencias?.length ? `<div style="display:grid; gap:6px; margin-bottom:10px;">${a.sugerencias.map(x => {
      const [txt, clase] = PRIORIDAD[x.prioridad] ?? PRIORIDAD.media;
      return `<div style="padding:10px; border:0.5px solid var(--border); border-radius:10px; background:var(--surface-2);">
        <div style="font-weight:600;">${s(x.titulo)} <span class="badge ${clase}">${txt}</span></div>
        <div class="mi-tile-nota" style="margin-top:2px;">${s(x.detalle)}</div></div>`;
    }).join('')}</div>` : ''}
    ${p ? `<div class="mi-tile-titulo" style="margin-bottom:6px;">Proyección · próximos ${p.dias} días con el mismo presupuesto</div>
      <div class="mi-tiles">
        ${tile('Conversaciones estimadas', `≈ ${Number(p.conversaciones).toLocaleString('es-MX')}`, '')}
        ${tile('Gasto estimado', `≈ ${fmt(p.gasto)}`, '')}
        ${tile('Costo por conversación', p.costo_por_conversacion == null ? '—' : `≈ ${fmt(p.costo_por_conversacion)}`, '')}
      </div>` : ''}
    ${a.proyeccion ? `<p class="mi-tile-nota" style="margin:6px 0 0;">${s(a.proyeccion)}</p>` : ''}
    <p class="mi-tile-nota" style="margin:8px 0 0;">Análisis de la IA del ${s(fechaHora(fila.analysis_at))} con datos hasta ${s(fechaCorta(a.periodo_hasta))}. Es una estimación, no una garantía; revisa antes de cambiar presupuestos.</p>`
    : '<p class="mi-rango" style="margin:0;">Aún no hay análisis. Pulsa <strong>✨ Analizar con IA</strong> para obtener sugerencias y una proyección de la próxima semana.</p>';

  return `
    <div class="mi-bloque">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
        <h3 style="margin:0;">💡 Sugerencias de campaña</h3>
        <button class="mi-actualizar" data-accion="analizar">✨ ${a ? 'Volver a analizar' : 'Analizar con IA'}</button>
      </div>
      <div style="margin-top:10px;">${meta}</div>
      <div style="margin-top:14px; padding-top:12px; border-top:0.5px solid var(--border);">
        <div class="mi-tile-titulo" style="margin-bottom:6px;">Análisis y proyección de la IA de MAHP</div>
        ${claude}
      </div>
    </div>`;
}

function avisoConexion(c) {
  const admin = ['company_admin', 'super_admin'].includes(estado.perfil?.role);
  if (!c) {
    return `<p class="mi-aviso" style="margin:0;">Aún no hay una cuenta publicitaria conectada. ${admin
      ? 'Ve a <strong>Social Hub → Conexiones</strong>, vuelve a conectar Facebook y acepta el permiso de <strong>anuncios</strong> con tu cuenta publicitaria.'
      : 'Pide al administrador que vuelva a conectar Facebook aceptando el permiso de anuncios.'}</p>`;
  }
  if (c.status === 'elegir_cuenta') {
    return admin
      ? `<div class="mi-aviso" style="margin:0 0 8px;">Elige la cuenta publicitaria de esta empresa:
          <select id="adsCuenta" style="margin:6px 0;">${(c.accounts ?? []).map(a => `<option value="${s(a.id)}">${s(a.name)} (${s(a.id)})</option>`).join('')}</select>
          <button class="btn-auto" data-accion="elegir" style="width:auto; margin:0;">Usar esta cuenta</button></div>`
      : '<p class="mi-aviso">El administrador debe elegir la cuenta publicitaria.</p>';
  }
  if (c.status === 'sin_cuentas') return '<p class="mi-aviso">Meta no devolvió ninguna cuenta publicitaria. Al reconectar Facebook, marca tu cuenta publicitaria en la ventana de Meta.</p>';
  if (c.status === 'token_invalido') return '<p class="mi-aviso">La conexión con Meta Ads venció o fue revocada. Vuelve a conectar Facebook en Social Hub → Conexiones.</p>';
  // Con varias cuentas autorizadas, el admin puede cambiar cuál se muestra.
  const cambiar = admin && (c.accounts ?? []).length > 1
    ? `<div class="mi-filtros" style="margin:0 0 8px; font-size:12px;">Cuenta publicitaria:
        <select id="adsCuenta" style="margin:0; width:auto;">${c.accounts.map(a => `<option value="${s(a.id)}" ${a.id === c.ad_account_id ? 'selected' : ''}>${s(a.name)} (${s(a.id)})</option>`).join('')}</select>
        <button class="btn-auto" data-accion="elegir" style="width:auto; margin:0;">Cambiar</button></div>`
    : '';
  // Cuenta que Meta no listó (p. ej. de un portfolio comercial): por ID.
  const agregar = admin
    ? `<details style="margin:0 0 8px; font-size:12px;"><summary style="cursor:pointer; color:var(--text-secondary);">¿No ves tu cuenta publicitaria? Agrégala por su ID</summary>
        <div class="mi-filtros" style="margin-top:6px;">
          <input type="text" id="adsCuentaId" inputmode="numeric" placeholder="ID de la cuenta, p. ej. 1075918470432741" style="margin:0; width:auto; min-width:240px;">
          <button class="btn-auto" data-accion="agregar" style="width:auto; margin:0;">Agregar y usar</button>
        </div>
        <div class="mi-tile-nota">El ID está en Meta Ads Manager, en el selector de cuentas de arriba.</div></details>`
    : '';
  const vence = c.token_expires_at ? (Date.parse(c.token_expires_at) - Date.now()) / 86400000 : null;
  if (vence != null && vence < 7) return cambiar + agregar + `<p class="mi-aviso" style="margin:0 0 8px;">La conexión con Meta Ads vence ${vence < 1 ? 'hoy' : `en ${Math.ceil(vence)} días`}. Vuelve a conectar Facebook en Social Hub → Conexiones para no perder la actualización diaria.</p>`;
  if (c.status === 'error') return cambiar + agregar + `<p class="mi-aviso" style="margin:0 0 8px;">La última actualización falló: ${s(c.last_error ?? 'error de Meta')}</p>`;
  return cambiar + agregar;
}

function dinero(moneda) {
  try {
    const f = new Intl.NumberFormat('es-MX', { style: 'currency', currency: moneda || 'MXN', minimumFractionDigits: 2 });
    return v => f.format(v);
  } catch { return v => '$' + Number(v).toFixed(2); }
}

function fechaCorta(f) {
  return new Date(`${f}T12:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

// subeBien: true = subir es bueno (conversaciones); false = bajar es
// bueno (costo); null = neutro (gasto).
function delta(actual, previo, subeBien) {
  if (actual == null || previo == null || !previo) return '<div class="mi-delta mi-delta-nd">sin periodo anterior para comparar</div>';
  const p = ((actual - previo) / previo) * 100;
  const flecha = p > 0 ? '↑' : p < 0 ? '↓' : '→';
  const bueno = subeBien == null || p === 0 ? null : (p > 0) === subeBien;
  const color = bueno == null ? 'var(--text-secondary)' : bueno ? '#0f7a3d' : '#c2410c';
  return `<div class="mi-delta" style="color:${color};"><span aria-hidden="true">${flecha}</span> ${Math.abs(p).toLocaleString('es-MX', { maximumFractionDigits: 1 })}% <span class="mi-delta-ref">vs. periodo anterior</span></div>`;
}

function tile(titulo, valor, extra) {
  return `<div class="mi-tile"><div class="mi-tile-titulo">${s(titulo)}</div><div class="mi-tile-valor">${valor}</div>${extra}</div>`;
}

function filaCampana(c, fmt, n) {
  const [txt, clase] = ESTADOS[c.effective_status] ?? [c.effective_status ?? '—', 'badge-slate'];
  const cA = c.a.conv ? c.a.spend / c.a.conv : null;
  const cP = c.p.conv ? c.p.spend / c.p.conv : null;
  return `<div style="display:grid; grid-template-columns:minmax(140px,1.4fr) minmax(130px,1fr) minmax(110px,1fr); gap:10px; align-items:center; padding:10px; border:0.5px solid var(--border); border-radius:10px; background:var(--surface-2);">
    <div style="min-width:0;">
      <div style="font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${s(c.name)}">${s(c.name)}</div>
      <span class="badge ${clase}">${s(txt)}</span>
      <div class="mi-tile-nota">${fmt(c.a.spend)} gastados · ${c.a.conv.toLocaleString('es-MX')} conversaciones</div>
    </div>
    <div>
      <div class="mi-tile-titulo">Por conversación iniciada</div>
      <div class="mi-tile-valor" style="font-size:20px;">${cA == null ? '—' : fmt(cA)}</div>
      ${delta(cA, cP, false)}
    </div>
    <div data-spark="${s(c.campaign_id)}" aria-label="Costo diario por conversación, últimos ${n} días"></div>
  </div>`;
}

function sparkline(serie) {
  const vals = serie.filter(v => v != null);
  if (vals.length < 2) return '<span class="mi-tile-nota">sin datos suficientes</span>';
  const w = 120, h = 36, max = Math.max(...vals), min = Math.min(...vals), rango = max - min || 1;
  const x = i => (i / (serie.length - 1)) * w;
  const y = v => h - 3 - ((v - min) / rango) * (h - 6);
  // Tramos continuos: los días sin conversaciones cortan la línea.
  let d = '', abierto = false;
  serie.forEach((v, i) => {
    if (v == null) { abierto = false; return; }
    d += `${abierto ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
    abierto = true;
  });
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-hidden="true"><path d="${d}" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

async function manejarClic(ev) {
  const btn = ev.target.closest('button[data-accion]');
  if (!btn) return;
  const { accion } = btn.dataset;
  if (accion === 'periodo') { estado.dias = Number(btn.dataset.dias); await recargar(); return; }
  btn.disabled = true;
  try {
    const acciones = { elegir: 'choose', agregar: 'add', analizar: 'analizar' };
    const body = { company_id: estado.companyId, action: acciones[accion] ?? 'sync' };
    if (accion === 'analizar') btn.textContent = '⏳ Analizando…';
    if (accion === 'elegir') body.ad_account_id = document.getElementById('adsCuenta')?.value;
    if (accion === 'agregar') body.ad_account_id = document.getElementById('adsCuentaId')?.value;
    const { error } = await estado.supabase.functions.invoke('meta-ads', { body });
    if (error) {
      let msg = error.message;
      try { const b = await error.context?.json?.(); if (b?.error) msg = b.error; } catch { /* sin cuerpo */ }
      showToast(msg, 'error');
    } else showToast(accion === 'sync' ? 'Campañas actualizadas' : accion === 'analizar' ? 'Análisis listo' : 'Cuenta publicitaria conectada');
    await recargar();
  } finally {
    if (btn.isConnected) btn.disabled = false;
  }
}
