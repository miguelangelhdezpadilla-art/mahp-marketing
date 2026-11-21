// Panel "Estadísticas de Meta" (pestaña Seguidores).
//
// Lee meta_insights_daily y meta_content_insights (v29), que llena la
// Edge Function meta-insights cada noche. Solo lectura: el RLS limita
// a la empresa activa. Las gráficas son SVG propio (sin librerías).
//
// Reglas de lectura de cifras:
//   * Las métricas aditivas (visualizaciones, interacciones, nuevos
//     seguidores) se suman en el periodo.
//   * El alcance diario NO se suma (la misma persona contaría varias
//     veces): se muestra como promedio por día.
//   * Seguidores actuales = la foto más reciente.
//   * El % compara contra el periodo anterior de igual duración, y solo
//     si ese periodo tiene datos casi completos.
import { sHtml as s, showToast } from '../ui.js';

const CANALES = {
  facebook: {
    nombre: 'Facebook', color: '#2a78d6', icono: '📘',
    vistas: 'page_media_view',
    alcance: 'page_total_media_view_unique',
    interacciones: 'page_post_engagements',
    nuevos: 'page_daily_follows_unique',
    video: 'page_video_views',
  },
  instagram: {
    nombre: 'Instagram', color: '#eb6834', icono: '📸',
    vistas: 'views',
    alcance: 'reach',
    interacciones: 'total_interactions',
    nuevos: 'follower_count',
    perfil: 'profile_views',
  },
};

const METRICAS = [...new Set(Object.values(CANALES).flatMap(c =>
  [c.vistas, c.alcance, c.interacciones, c.nuevos, c.video, c.perfil].filter(Boolean)
)), 'followers_count'];

const TIPOS_CONTENIDO = { REEL: 'Reels', REELS: 'Reels', FEED: 'Publicaciones', POST: 'Publicaciones', STORY: 'Historias', AD: 'Anuncios', CAROUSEL_CONTAINER: 'Carruseles' };

const estado = { canal: 'ambos', dias: 30, datos: null, contenido: [], companyId: null, supabase: null, idCont: null };

// ── Utilidades ─────────────────────────────────────────────────
const fmt = n => n == null || Number.isNaN(n) ? '—' : Math.round(n).toLocaleString('es-MX');
const fmtCorto = n => {
  if (n == null) return '—';
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toLocaleString('es-MX', { maximumFractionDigits: 1 }) + ' M';
  if (a >= 1e4) return (n / 1e3).toLocaleString('es-MX', { maximumFractionDigits: 0 }) + ' mil';
  return Math.round(n).toLocaleString('es-MX');
};
function hoyLocal() {
  // Mismo corte que la Edge Function: UTC-6 (Aguascalientes).
  return new Date(Date.now() - 6 * 3600e3).toISOString().slice(0, 10);
}
function sumarDias(fecha, n) {
  return new Date(Date.parse(`${fecha}T00:00:00Z`) + n * 86400e3).toISOString().slice(0, 10);
}
function fechaCorta(fecha) {
  return new Date(`${fecha}T12:00:00Z`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

// ── Carga ──────────────────────────────────────────────────────
async function cargarDatos(supabase, companyId) {
  const desde = sumarDias(hoyLocal(), -181);
  const filas = [];
  // PostgREST devuelve como máximo 1000 filas por consulta.
  for (let ini = 0; ; ini += 1000) {
    const { data, error } = await supabase
      .from('meta_insights_daily')
      .select('channel, metric, breakdown, date, value')
      .eq('company_id', companyId)
      .gte('date', desde)
      .or(`metric.in.(${METRICAS.join(',')}),and(metric.eq.views,breakdown.like.media_product_type*)`)
      .order('date')
      .range(ini, ini + 999);
    if (error) throw error;
    filas.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  // indice[canal][metric|breakdown][fecha] = valor
  const indice = {};
  for (const f of filas) {
    const clave = f.breakdown ? `${f.metric}|${f.breakdown}` : f.metric;
    ((indice[f.channel] ??= {})[clave] ??= {})[f.date] = Number(f.value);
  }
  return indice;
}

async function cargarContenido(supabase, companyId) {
  const { data } = await supabase
    .from('meta_content_insights')
    .select('channel, media_id, media_type, caption, permalink, thumbnail_url, published_at, metrics')
    .eq('company_id', companyId)
    .order('published_at', { ascending: false })
    .limit(80);
  return data ?? [];
}

// ── Cálculos ───────────────────────────────────────────────────
function rangoActual(dias) {
  const hasta = sumarDias(hoyLocal(), -1);
  return { desde: sumarDias(hasta, -(dias - 1)), hasta };
}

function serie(datos, canal, metric, desde, hasta) {
  const m = datos?.[canal]?.[metric] ?? {};
  const out = [];
  for (let d = desde; d <= hasta; d = sumarDias(d, 1)) out.push({ fecha: d, valor: m[d] ?? null });
  return out;
}

function resumen(datos, canal, metric, dias, modo = 'suma') {
  const { desde, hasta } = rangoActual(dias);
  const act = serie(datos, canal, metric, desde, hasta).filter(p => p.valor != null);
  const ant = serie(datos, canal, metric, sumarDias(desde, -dias), sumarDias(desde, -1)).filter(p => p.valor != null);
  if (!act.length) return null;
  const agg = arr => {
    const t = arr.reduce((a, p) => a + p.valor, 0);
    return modo === 'promedio' ? t / arr.length : t;
  };
  const valor = agg(act);
  // Solo se compara si el periodo anterior está (casi) completo.
  const comparable = ant.length >= Math.floor(dias * 0.9);
  const previo = comparable ? agg(ant) : null;
  const cambio = comparable && previo ? (valor - previo) / previo * 100 : null;
  return { valor, cambio, diasConDato: act.length };
}

function seguidoresActuales(datos, canal) {
  const m = datos?.[canal]?.followers_count ?? {};
  const fechas = Object.keys(m).sort();
  if (!fechas.length) return null;
  const ultima = fechas[fechas.length - 1];
  return { valor: m[ultima], fecha: ultima };
}

function primerDia(datos, canal, metric) {
  const fechas = Object.keys(datos?.[canal]?.[metric] ?? {}).sort();
  return fechas[0] ?? null;
}

// ── Render: tarjetas ───────────────────────────────────────────
function deltaHtml(cambio) {
  if (cambio == null) return '<div class="mi-delta mi-delta-nd">sin periodo anterior completo</div>';
  const sube = cambio >= 0;
  return `<div class="mi-delta ${sube ? 'mi-sube' : 'mi-baja'}">
    <span aria-hidden="true">${sube ? '▲' : '▼'}</span><span class="sr-only">${sube ? 'subió' : 'bajó'}</span>
    ${Math.abs(cambio).toLocaleString('es-MX', { maximumFractionDigits: 1 })}%
    <span class="mi-delta-ref">vs. ${estado.dias} días anteriores</span></div>`;
}

function tarjeta(titulo, r, nota = '') {
  return `<div class="mi-tile">
    <div class="mi-tile-titulo">${s(titulo)}</div>
    <div class="mi-tile-valor">${r ? fmt(r.valor) : '—'}</div>
    ${r ? deltaHtml(r.cambio) : '<div class="mi-delta mi-delta-nd">sin datos</div>'}
    ${nota ? `<div class="mi-tile-nota">${s(nota)}</div>` : ''}
  </div>`;
}

function tarjetasCanal(datos, canal) {
  const c = CANALES[canal];
  const d = estado.dias;
  const seg = seguidoresActuales(datos, canal);
  const filas = [
    tarjeta('Visualizaciones', resumen(datos, canal, c.vistas, d)),
    tarjeta('Alcance promedio por día', resumen(datos, canal, c.alcance, d, 'promedio'),
      'Personas distintas por día; Meta no permite sumarlas sin contar dos veces a la misma persona.'),
    tarjeta('Interacciones', resumen(datos, canal, c.interacciones, d)),
    tarjeta('Nuevos seguidores', resumen(datos, canal, c.nuevos, d)),
  ];
  if (c.video) filas.push(tarjeta('Reproducciones de video', resumen(datos, canal, c.video, d),
    'Cálculo de la API de Meta; puede variar unas decenas respecto a "reproducciones de 3 s" en Meta Business Suite.'));
  if (c.perfil) filas.push(tarjeta('Visitas al perfil', resumen(datos, canal, c.perfil, d)));
  const desde = primerDia(datos, canal, c.vistas);
  const aviso = desde && desde > rangoActual(d).desde
    ? `<p class="mi-aviso">${c.nombre} solo tiene datos desde el ${fechaCorta(desde)}${canal === 'instagram' ? ' (Meta guarda ~30 días de Instagram; MAHP los acumula desde ahora)' : ''}.</p>`
    : '';
  return `
    <div class="mi-canal">
      <div class="mi-canal-cab">
        <span class="mi-punto" style="background:${c.color}"></span>
        <strong>${c.icono} ${c.nombre}</strong>
        ${seg ? `<span class="mi-seg">${fmt(seg.valor)} seguidores</span>` : ''}
      </div>
      ${aviso}
      <div class="mi-tiles">${filas.join('')}</div>
    </div>`;
}

// ── Render: gráfica de líneas (SVG) ────────────────────────────
const G = { w: 720, h: 240, izq: 52, der: 16, arr: 16, abj: 28 };

function graficaLineas(datos, canales) {
  const { desde, hasta } = rangoActual(estado.dias);
  const series = canales.map(canal => ({
    canal, ...CANALES[canal],
    puntos: serie(datos, canal, CANALES[canal].vistas, desde, hasta),
  })).filter(x => x.puntos.some(p => p.valor != null));
  if (!series.length) return '<p class="mi-vacio">Todavía no hay datos de visualizaciones para este periodo.</p>';

  const n = series[0].puntos.length;
  const max = Math.max(1, ...series.flatMap(x => x.puntos.map(p => p.valor ?? 0)));
  const paso = Math.pow(10, Math.floor(Math.log10(max)));
  const tope = Math.ceil(max / paso) * paso;
  const X = i => G.izq + (n === 1 ? 0 : i * (G.w - G.izq - G.der) / (n - 1));
  const Y = v => G.arr + (1 - v / tope) * (G.h - G.arr - G.abj);

  const grid = [0, 0.5, 1].map(f => {
    const v = tope * f;
    return `<line x1="${G.izq}" x2="${G.w - G.der}" y1="${Y(v)}" y2="${Y(v)}" class="mi-grid"/>
      <text x="${G.izq - 8}" y="${Y(v) + 4}" class="mi-eje" text-anchor="end">${fmtCorto(v)}</text>`;
  }).join('');

  const marcas = [0, Math.floor((n - 1) / 2), n - 1].map(i =>
    `<text x="${X(i)}" y="${G.h - 8}" class="mi-eje" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}">${fechaCorta(series[0].puntos[i].fecha)}</text>`
  ).join('');

  const lineas = series.map(x => {
    let d = '';
    x.puntos.forEach((p, i) => {
      if (p.valor == null) return;
      const prev = x.puntos[i - 1];
      d += `${d && prev?.valor != null ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.valor).toFixed(1)}`;
    });
    return `<path d="${d}" fill="none" stroke="${x.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  }).join('');

  const leyenda = series.length > 1
    ? `<div class="mi-leyenda">${series.map(x => `<span><i style="background:${x.color}"></i>${x.nombre}</span>`).join('')}</div>`
    : '';

  return `
    ${leyenda}
    <div class="mi-grafica" data-n="${n}">
      <svg viewBox="0 0 ${G.w} ${G.h}" role="img" aria-label="Visualizaciones por día, ${series.map(x => x.nombre).join(' y ')}, últimos ${estado.dias} días">
        ${grid}${marcas}${lineas}
        <line class="mi-cruz" x1="0" x2="0" y1="${G.arr}" y2="${G.h - G.abj}" visibility="hidden"/>
        ${series.map((x, k) => `<circle class="mi-cruz-punto" data-k="${k}" r="4" fill="${x.color}" stroke="var(--surface)" stroke-width="2" visibility="hidden"/>`).join('')}
        <rect class="mi-hit" x="${G.izq}" y="${G.arr}" width="${G.w - G.izq - G.der}" height="${G.h - G.arr - G.abj}" fill="transparent"/>
      </svg>
      <div class="mi-tooltip" hidden></div>
    </div>
    ${tablaAccesible(series)}`;
}

function tablaAccesible(series) {
  const n = series[0].puntos.length;
  const filas = [];
  for (let i = n - 1; i >= 0; i--) {
    filas.push(`<tr><td>${fechaCorta(series[0].puntos[i].fecha)}</td>${series.map(x => `<td>${fmt(x.puntos[i].valor)}</td>`).join('')}</tr>`);
  }
  return `<details class="mi-tabla-det"><summary>Ver como tabla</summary>
    <div style="overflow-x:auto;"><table class="mi-tabla"><thead><tr><th>Día</th>${series.map(x => `<th>${x.nombre}</th>`).join('')}</tr></thead>
    <tbody>${filas.join('')}</tbody></table></div></details>`;
}

function activarCruz(cont, datos, canales) {
  const g = cont.querySelector('.mi-grafica');
  if (!g) return;
  const svg = g.querySelector('svg');
  const tip = g.querySelector('.mi-tooltip');
  const cruz = svg.querySelector('.mi-cruz');
  const hit = svg.querySelector('.mi-hit');
  const { desde, hasta } = rangoActual(estado.dias);
  const series = canales.map(canal => ({ ...CANALES[canal], puntos: serie(datos, canal, CANALES[canal].vistas, desde, hasta) }))
    .filter(x => x.puntos.some(p => p.valor != null));
  const n = series[0]?.puntos.length ?? 0;
  if (!n) return;
  const max = Math.max(1, ...series.flatMap(x => x.puntos.map(p => p.valor ?? 0)));
  const paso = Math.pow(10, Math.floor(Math.log10(max)));
  const tope = Math.ceil(max / paso) * paso;
  const X = i => G.izq + (n === 1 ? 0 : i * (G.w - G.izq - G.der) / (n - 1));
  const Y = v => G.arr + (1 - v / tope) * (G.h - G.arr - G.abj);

  const mover = (ev) => {
    const r = svg.getBoundingClientRect();
    const xv = (ev.clientX - r.left) / r.width * G.w;
    const i = Math.max(0, Math.min(n - 1, Math.round((xv - G.izq) / ((G.w - G.izq - G.der) / Math.max(1, n - 1)))));
    cruz.setAttribute('x1', X(i)); cruz.setAttribute('x2', X(i)); cruz.setAttribute('visibility', 'visible');
    svg.querySelectorAll('.mi-cruz-punto').forEach(c => {
      const p = series[Number(c.dataset.k)].puntos[i];
      if (p.valor == null) { c.setAttribute('visibility', 'hidden'); return; }
      c.setAttribute('cx', X(i)); c.setAttribute('cy', Y(p.valor)); c.setAttribute('visibility', 'visible');
    });
    tip.innerHTML = `<div class="mi-tip-fecha">${fechaCorta(series[0].puntos[i].fecha)}</div>` +
      series.map(x => `<div><i style="background:${x.color}"></i>${x.nombre} <strong>${fmt(x.puntos[i].valor)}</strong></div>`).join('');
    tip.hidden = false;
    const px = X(i) / G.w * r.width;
    tip.style.left = `${Math.min(Math.max(px + 12, 0), r.width - tip.offsetWidth)}px`;
    if (px + 12 + tip.offsetWidth > r.width) tip.style.left = `${Math.max(px - tip.offsetWidth - 12, 0)}px`;
  };
  const salir = () => {
    tip.hidden = true; cruz.setAttribute('visibility', 'hidden');
    svg.querySelectorAll('.mi-cruz-punto').forEach(c => c.setAttribute('visibility', 'hidden'));
  };
  hit.addEventListener('pointermove', mover);
  hit.addEventListener('pointerdown', mover);
  hit.addEventListener('pointerleave', salir);
}

// ── Render: por tipo de contenido (Instagram) ─────────────────
function barrasTipo(datos) {
  const { desde, hasta } = rangoActual(estado.dias);
  const ig = datos?.instagram ?? {};
  const totales = {};
  for (const [clave, porFecha] of Object.entries(ig)) {
    if (!clave.startsWith('views|media_product_type:')) continue;
    const tipo = clave.split(':')[1];
    const etiqueta = TIPOS_CONTENIDO[tipo.toUpperCase()] ?? tipo.toLowerCase();
    for (const [f, v] of Object.entries(porFecha)) {
      if (f >= desde && f <= hasta) totales[etiqueta] = (totales[etiqueta] ?? 0) + v;
    }
  }
  const lista = Object.entries(totales).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (!lista.length) return '';
  const total = lista.reduce((a, [, v]) => a + v, 0);
  return `
    <div class="mi-bloque">
      <h3>Visualizaciones de Instagram por tipo de contenido</h3>
      <div class="mi-barras">
        ${lista.map(([k, v]) => `
          <div class="mi-barra-fila" title="${s(k)}: ${fmt(v)} visualizaciones">
            <span class="mi-barra-et">${s(k)}</span>
            <span class="mi-barra-pista"><span class="mi-barra" style="width:${Math.max(1, v / lista[0][1] * 100)}%"></span></span>
            <span class="mi-barra-val">${(v / total * 100).toLocaleString('es-MX', { maximumFractionDigits: 1 })}%</span>
          </div>`).join('')}
      </div>
    </div>`;
}

// ── Render: mejor contenido ────────────────────────────────────
function vistasDe(p) {
  const m = p.metrics ?? {};
  return Number(m.views ?? m.post_media_view ?? m.post_video_views ?? m.reach ?? 0);
}

function mejorContenido(canales) {
  const lista = estado.contenido
    .filter(p => canales.includes(p.channel))
    .map(p => ({ ...p, vistas: vistasDe(p) }))
    .sort((a, b) => b.vistas - a.vistas)
    .slice(0, 8);
  if (!lista.length) return '';
  return `
    <div class="mi-bloque">
      <h3>Mejor contenido <span class="mi-sub">(últimas 30 publicaciones de cada red)</span></h3>
      <div class="mi-contenido">
        ${lista.map(p => {
          const m = p.metrics ?? {};
          const inter = m.total_interactions ?? ((m.likes ?? 0) + (m.comments ?? 0) + (m.shares ?? 0) + (m.saved ?? 0));
          const fecha = p.published_at ? new Date(p.published_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '';
          return `
            <a class="mi-post" href="${s(p.permalink ?? '#')}" target="_blank" rel="noopener noreferrer">
              <div class="mi-post-img" data-src="${s(p.thumbnail_url ?? '')}">
                <span class="mi-post-canal" style="background:${CANALES[p.channel].color}">${CANALES[p.channel].icono}</span>
              </div>
              <div class="mi-post-info">
                <div class="mi-post-vistas">${fmt(p.vistas)} <span>visualizaciones</span></div>
                <div class="mi-post-meta">${s(fecha)}${inter ? ` · ${fmt(inter)} interacciones` : ''}</div>
                <div class="mi-post-texto">${s((p.caption ?? '').slice(0, 90))}</div>
              </div>
            </a>`;
        }).join('')}
      </div>
    </div>`;
}

// Las miniaturas son URLs de Meta (dato externo): se asignan como
// propiedad del DOM, nunca interpoladas en un atributo src.
function cargarMiniaturas(cont) {
  cont.querySelectorAll('.mi-post-img[data-src]').forEach(div => {
    const url = div.dataset.src;
    if (!/^https:\/\//.test(url)) return;
    const img = document.createElement('img');
    img.alt = '';
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.onerror = () => img.remove();
    img.src = url;
    div.prepend(img);
  });
}

// ── Panel ──────────────────────────────────────────────────────
function pintar() {
  const cont = document.getElementById(estado.idCont);
  if (!cont) return;
  const datos = estado.datos;
  const disponibles = Object.keys(CANALES).filter(c => datos?.[c] && Object.keys(datos[c]).length);
  if (!disponibles.length) {
    cont.innerHTML = `<div class="mi-vacio">
      <p>Todavía no hay estadísticas de Meta para esta empresa.</p>
      <p>Conecta la página en <strong>Social Hub → Conexiones sociales</strong> aceptando los permisos de estadísticas. Las cifras se cargan cada noche; también puedes pulsar <strong>Actualizar ahora</strong>.</p>
      <button class="mi-actualizar" id="mi-actualizar">↻ Actualizar ahora</button></div>`;
    cont.querySelector('#mi-actualizar')?.addEventListener('click', actualizarAhora);
    return;
  }
  const canales = estado.canal === 'ambos' ? disponibles : [estado.canal].filter(c => disponibles.includes(c));

  const ultima = Object.values(datos).flatMap(m => Object.values(m).flatMap(o => Object.keys(o))).sort().pop();
  cont.innerHTML = `
    <div class="mi-filtros">
      <div class="mi-seg-ctrl" role="group" aria-label="Red social">
        ${[['ambos', 'Ambas'], ...disponibles.map(c => [c, CANALES[c].nombre])].map(([v, t]) =>
          `<button data-canal="${v}" aria-pressed="${estado.canal === v}">${t}</button>`).join('')}
      </div>
      <div class="mi-seg-ctrl" role="group" aria-label="Periodo">
        ${[7, 30, 90].map(d => `<button data-dias="${d}" aria-pressed="${estado.dias === d}">${d} días</button>`).join('')}
      </div>
      <button class="mi-actualizar" id="mi-actualizar" title="Pedir a Meta las cifras más recientes">↻ Actualizar</button>
    </div>
    <p class="mi-rango">Del ${fechaCorta(rangoActual(estado.dias).desde)} al ${fechaCorta(rangoActual(estado.dias).hasta)} · datos hasta el ${ultima ? fechaCorta(ultima) : '—'} · fuente: Meta</p>
    ${canales.map(c => tarjetasCanal(datos, c)).join('')}
    <div class="mi-bloque">
      <h3>Visualizaciones por día</h3>
      ${graficaLineas(datos, canales)}
    </div>
    ${canales.includes('instagram') ? barrasTipo(datos) : ''}
    ${mejorContenido(canales)}`;

  cont.querySelectorAll('[data-canal]').forEach(b => b.addEventListener('click', () => { estado.canal = b.dataset.canal; pintar(); }));
  cont.querySelectorAll('[data-dias]').forEach(b => b.addEventListener('click', () => { estado.dias = Number(b.dataset.dias); pintar(); }));
  cont.querySelector('#mi-actualizar')?.addEventListener('click', actualizarAhora);
  activarCruz(cont, datos, canales);
  cargarMiniaturas(cont);
}

async function actualizarAhora() {
  const btn = document.getElementById('mi-actualizar');
  if (btn) { btn.disabled = true; btn.textContent = '↻ Actualizando…'; }
  const { data, error } = await estado.supabase.functions.invoke('meta-insights', {
    body: { company_id: Number(estado.companyId) },
  });
  if (error || data?.error) {
    let detalle = data?.error;
    if (!detalle && error?.context?.json) { try { detalle = (await error.context.json())?.error; } catch { /* sin cuerpo */ } }
    showToast(detalle || 'No se pudieron actualizar las estadísticas', 'error');
    if (btn) { btn.disabled = false; btn.textContent = '↻ Actualizar'; }
    return;
  }
  const errores = (data?.resultados ?? []).flatMap(r => r.errores ?? []);
  showToast(errores.length ? 'Actualizado con avisos de Meta (revisa la conexión)' : 'Estadísticas actualizadas', errores.length ? 'error' : 'ok');
  await recargar();
}

async function recargar() {
  try {
    [estado.datos, estado.contenido] = await Promise.all([
      cargarDatos(estado.supabase, estado.companyId),
      cargarContenido(estado.supabase, estado.companyId),
    ]);
    pintar();
  } catch (e) {
    console.error('[metaInsights]', e);
    const cont = document.getElementById(estado.idCont);
    if (cont) cont.innerHTML = '<p class="mi-vacio">No se pudieron cargar las estadísticas de Meta.</p>';
  }
}

export async function renderPanelMetaInsights(supabase, companyId, idContenedor) {
  Object.assign(estado, { supabase, companyId, idCont: idContenedor });
  const cont = document.getElementById(idContenedor);
  if (!cont) return;
  cont.innerHTML = '<div class="skeleton skeleton-line mid"></div>';
  await recargar();
}
