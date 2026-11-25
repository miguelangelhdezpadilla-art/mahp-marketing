// Panel de consumo de IA (MPS-002-004 §6, etapa E3).
//
// Dos vistas sobre las mismas vistas de v28:
//   * renderConsumoEmpresa: Social Hub de una empresa. Solo su gasto y su
//     presupuesto; los precios unitarios del proveedor no se muestran.
//     Que solo vea su empresa lo garantiza la RLS, no esta pantalla.
//   * renderConsumoGlobal: admin.html, solo super_admin. Todas las
//     empresas, edición de límites, paro manual y catálogo de modelos.
//
// Los totales salen de ai_usage_status (calculados en la base, con la
// zona horaria de cada empresa). El desglose por uso suma las filas
// diarias de ai_usage_daily del mes en curso.
import { sHtml as s, showToast, showConfirm, showPrompt } from '../ui.js';

const USOS = {
  social_respuesta: 'Sugerencias del Social Hub',
  calendario: 'Calendario con IA',
  playground: 'Pruebas',
};

const ESTADOS = {
  activo:           { texto: 'Activo',              clase: 'badge-green' },
  cerca_del_limite: { texto: 'Cerca del límite',    clase: 'badge-amber' },
  agotado_hoy:      { texto: 'Límite diario agotado', clase: 'badge-red' },
  agotado_mes:      { texto: 'Límite mensual agotado', clase: 'badge-red' },
  suspendida:       { texto: 'Suspendida',          clase: 'badge-red' },
};

// Dólares con los decimales que hagan falta: los consumos típicos son
// fracciones de centavo y "$0.00" escondería que sí hubo gasto.
function usd(n) {
  const v = Number(n ?? 0);
  if (v === 0) return 'US$ 0';
  const dec = v < 0.01 ? 4 : v < 1 ? 3 : 2;
  return 'US$ ' + v.toLocaleString('es-MX', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
// Para atributos (value, id): sHtml no escapa comillas cuando hay DOMPurify.
const a = v => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const entero = n => Math.round(Number(n ?? 0)).toLocaleString('es-MX');

function pct(gasto, limite) {
  const l = Number(limite);
  if (!(l > 0)) return 100;
  return Math.min(100, (Number(gasto) / l) * 100);
}

// Al revés que el avance de tareas: mientras más lleno, peor.
function claseMedidor(p) {
  return p >= 90 ? 'low' : p >= 70 ? 'mid' : 'high';
}

function badgeEstado(estado) {
  const e = ESTADOS[estado] ?? { texto: estado ?? '—', clase: 'badge-slate' };
  return `<span class="badge ${e.clase}">${s(e.texto)}</span>`;
}

// Medidor para la empresa: solo porcentaje del límite, sin montos.
function medidor(titulo, gasto, limite, nota) {
  const p = pct(gasto, limite);
  const texto = p > 0 && p < 1 ? 'menos de 1%' : `${Math.round(p)}%`;
  return `<div class="mi-tile">
    <div class="mi-tile-titulo">${s(titulo)}</div>
    <div class="mi-tile-valor">${texto}</div>
    <div class="progress-bar" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(p)}"
         aria-label="${a(titulo)}: ${a(texto)}" style="margin-top:6px;">
      <div class="progress-fill ${claseMedidor(p)}" style="width:${p.toFixed(1)}%"></div>
    </div>
    <div class="mi-tile-nota">${s(nota)}</div>
  </div>`;
}

// Primer día del mes en la zona horaria de la empresa (YYYY-MM-01), para
// filtrar ai_usage_daily, cuyo "dia" ya viene en esa zona.
function inicioDeMes(zona) {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: zona || 'America/Mexico_City', year: 'numeric', month: '2-digit' })
    .formatToParts(new Date());
  const y = partes.find(p => p.type === 'year').value;
  const m = partes.find(p => p.type === 'month').value;
  return `${y}-${m}-01`;
}

function desglosePorUso(filas) {
  const porUso = {};
  for (const f of filas ?? []) {
    const u = (porUso[f.use_case] ??= { solicitudes: 0, fallidas: 0, costo: 0 });
    u.solicitudes += Number(f.solicitudes);
    u.fallidas += Number(f.fallidas);
    u.costo += Number(f.costo_usd);
  }
  return porUso;
}

function tablaDesglose(porUso) {
  const usos = Object.keys(porUso);
  const total = usos.reduce((acc, u) => acc + porUso[u].costo, 0);
  if (!usos.length) return '<p class="mi-rango">Sin consumo este mes.</p>';
  const parte = c => {
    if (!(total > 0)) return '—';
    const p = (c / total) * 100;
    return p > 0 && p < 1 ? 'menos de 1%' : `${Math.round(p)}%`;
  };
  return `<table class="tabla">
    <thead><tr><th>Uso</th><th>Solicitudes</th><th>Fallidas</th><th>Parte del uso del mes</th></tr></thead>
    <tbody>${usos.map(u => `<tr>
      <td>${s(USOS[u] ?? u)}</td><td>${entero(porUso[u].solicitudes)}</td>
      <td>${entero(porUso[u].fallidas)}</td><td>${parte(porUso[u].costo)}</td></tr>`).join('')}
    </tbody></table>`;
}

// ── Vista de empresa ───────────────────────────────────────────
export async function renderConsumoEmpresa(supabase, companyId, idCont) {
  const cont = document.getElementById(idCont);
  if (!cont) return;
  cont.innerHTML = '<div class="skeleton skeleton-line mid"></div>';

  const { data: st, error } = await supabase.from('ai_usage_status')
    .select('company_id, daily_budget_usd, monthly_budget_usd, gasto_hoy_usd, gasto_mes_usd, solicitudes_mes, estado, suspended_reason')
    .eq('company_id', companyId).maybeSingle();
  if (error) { cont.innerHTML = `<p class="mi-rango">No se pudo cargar el consumo de IA.</p>`; return; }
  if (!st) { cont.innerHTML = `<p class="mi-rango">La IA no está configurada para esta empresa.</p>`; return; }

  const { data: diarias } = await supabase.from('ai_usage_daily')
    .select('use_case, solicitudes, fallidas, costo_usd')
    .eq('company_id', companyId).gte('dia', inicioDeMes());

  const aviso = {
    agotado_hoy: 'Se alcanzó el límite de hoy: las sugerencias de IA vuelven mañana. Tu equipo puede seguir respondiendo normalmente.',
    agotado_mes: 'Se alcanzó el límite del mes: las sugerencias de IA vuelven el próximo mes. Tu equipo puede seguir respondiendo normalmente.',
    suspendida: 'MAHP pausó la IA para esta empresa. Tu equipo puede seguir respondiendo normalmente.',
  }[st.estado];

  cont.innerHTML = `
    <div class="mi-filtros" style="justify-content:space-between;">
      <span>Estado: ${badgeEstado(st.estado)}</span>
      <span class="mi-rango" style="margin:0;">${entero(st.solicitudes_mes)} solicitudes este mes</span>
    </div>
    ${aviso ? `<p class="mi-aviso" role="status" style="margin:6px 0 10px;">${s(aviso)}</p>` : ''}
    <div class="mi-tiles">
      ${medidor('Uso de hoy', st.gasto_hoy_usd, st.daily_budget_usd, 'del límite diario')}
      ${medidor('Uso del mes', st.gasto_mes_usd, st.monthly_budget_usd, 'del límite mensual')}
    </div>
    <div class="mi-bloque">
      <h3>En qué se usó este mes</h3>
      ${tablaDesglose(desglosePorUso(diarias))}
    </div>
    <p class="mi-rango" style="margin-top:10px;">Los límites los define MAHP. Al llegar al 100% la IA se pausa sola y vuelve al día o mes siguiente.</p>`;
}

// ── Vista global (super_admin) ────────────────────────────────
const global = { supabase: null, idCont: null, limites: {}, modelos: [] };

export async function renderConsumoGlobal(supabase, idCont) {
  global.supabase = supabase;
  global.idCont = idCont;
  const cont = document.getElementById(idCont);
  if (!cont) return;
  if (!cont.dataset.enlazado) {
    cont.addEventListener('click', manejarClic);
    cont.dataset.enlazado = '1';
  }
  await recargarGlobal();
}

async function recargarGlobal() {
  const cont = document.getElementById(global.idCont);
  const sb = global.supabase;
  const [st, lim, mod] = await Promise.all([
    sb.from('ai_usage_status').select('*').order('gasto_mes_usd', { ascending: false }),
    sb.from('ai_company_limits').select('*'),
    sb.from('ai_models').select('*').order('tier'),
  ]);
  const error = st.error || lim.error || mod.error;
  if (error) { cont.innerHTML = `<p class="mi-rango">No se pudo cargar el consumo: ${s(error.message)}</p>`; return; }

  global.limites = Object.fromEntries(lim.data.map(l => [l.company_id, l]));
  global.modelos = mod.data;
  const empresas = st.data;
  const totalHoy = empresas.reduce((a, e) => a + Number(e.gasto_hoy_usd), 0);
  const totalMes = empresas.reduce((a, e) => a + Number(e.gasto_mes_usd), 0);
  const totalSol = empresas.reduce((a, e) => a + Number(e.solicitudes_mes), 0);
  const conProblema = empresas.filter(e => e.estado !== 'activo').length;

  cont.innerHTML = `
    <div class="mi-tiles">
      <div class="mi-tile"><div class="mi-tile-titulo">Gasto de hoy (todas)</div><div class="mi-tile-valor">${usd(totalHoy)}</div></div>
      <div class="mi-tile"><div class="mi-tile-titulo">Gasto del mes (todas)</div><div class="mi-tile-valor">${usd(totalMes)}</div></div>
      <div class="mi-tile"><div class="mi-tile-titulo">Solicitudes del mes</div><div class="mi-tile-valor">${entero(totalSol)}</div></div>
      <div class="mi-tile"><div class="mi-tile-titulo">Empresas con aviso</div><div class="mi-tile-valor">${entero(conProblema)}</div>
        <div class="mi-tile-nota">cerca del límite, agotadas o suspendidas</div></div>
    </div>

    <div class="mi-bloque" style="overflow-x:auto;">
      <h3>Por empresa <span class="mi-sub">· el mes y el día se cortan en la zona horaria de cada empresa</span></h3>
      <table class="tabla">
        <thead><tr><th>Empresa</th><th>Estado</th><th>Hoy</th><th>Mes</th><th>Solicitudes</th><th>Modelo</th><th></th></tr></thead>
        <tbody>${empresas.map(filaEmpresa).join('') || '<tr class="fila-vacia"><td colspan="7">Sin empresas.</td></tr>'}</tbody>
      </table>
    </div>

    <div class="mi-bloque" style="overflow-x:auto;">
      <h3>Modelos <span class="mi-sub">· precios en US$ por millón de tokens; se usan para reservar y cobrar</span></h3>
      <table class="tabla">
        <thead><tr><th>Modelo</th><th>Nivel</th><th>Entrada</th><th>Salida</th><th>Activo</th><th></th></tr></thead>
        <tbody>${global.modelos.map(filaModelo).join('')}</tbody>
      </table>
    </div>`;
}

function filaEmpresa(e) {
  const l = global.limites[e.company_id] ?? {};
  const opus = l.allow_advanced ? ' + avanzado' : '';
  const suspendida = !!e.suspended_at;
  return `<tr>
    <td>${s(e.company_name)}${suspendida && e.suspended_reason ? `<div class="mi-tile-nota">${s(e.suspended_reason)}</div>` : ''}</td>
    <td>${badgeEstado(e.estado)}</td>
    <td>${usd(e.gasto_hoy_usd)} <span class="mi-sub">/ ${usd(e.daily_budget_usd)}</span></td>
    <td>${usd(e.gasto_mes_usd)} <span class="mi-sub">/ ${usd(e.monthly_budget_usd)}</span></td>
    <td>${entero(e.solicitudes_mes)}</td>
    <td>${s(e.default_model_id)}${opus}</td>
    <td style="white-space:nowrap;">
      <button class="btn-auto" data-accion="editar" data-id="${e.company_id}" style="width:auto;">Límites</button>
      <button class="btn-auto" data-accion="${suspendida ? 'reanudar' : 'suspender'}" data-id="${e.company_id}"
        style="width:auto; background:${suspendida ? '#28A745' : '#e74c3c'};">${suspendida ? 'Reanudar' : 'Suspender'}</button>
    </td>
  </tr>
  <tr id="edicion-${e.company_id}" style="display:none;"><td colspan="7">${formLimites(e.company_id, l)}</td></tr>`;
}

function campo(id, etiqueta, valor, attrs) {
  return `<label style="display:flex; flex-direction:column; gap:2px; font-size:12px; min-width:130px;">
    ${s(etiqueta)}<input type="number" id="${id}" value="${a(valor)}" ${attrs}></label>`;
}

function formLimites(companyId, l) {
  const avanzados = global.modelos.filter(m => m.tier === 'avanzado' && m.active);
  return `<div style="display:flex; flex-wrap:wrap; gap:10px; align-items:flex-end; padding:6px 0;">
    ${campo(`lim-dia-${companyId}`, 'Límite diario (US$)', l.daily_budget_usd, 'min="0" step="0.01"')}
    ${campo(`lim-mes-${companyId}`, 'Límite mensual (US$)', l.monthly_budget_usd, 'min="0" step="0.01"')}
    ${campo(`lim-sal-${companyId}`, 'Tokens de salida por respuesta', l.max_output_tokens, 'min="50" max="4000" step="10"')}
    ${campo(`lim-hora-${companyId}`, 'Sugerencias por conversación/hora', l.max_gen_per_conversation_hour, 'min="0" max="200" step="1"')}
    <label style="display:flex; gap:6px; align-items:center; font-size:12px;" title="${avanzados.length ? '' : 'No hay modelos avanzados activos'}">
      <input type="checkbox" id="lim-adv-${companyId}" ${l.allow_advanced ? 'checked' : ''} ${avanzados.length ? '' : 'disabled'} style="width:auto;">
      Permitir modelo avanzado (${s(avanzados[0]?.model_id ?? 'ninguno')}, ~40× más caro)
    </label>
    <button class="btn-auto" data-accion="guardar" data-id="${companyId}" style="width:auto;">Guardar</button>
  </div>`;
}

function filaModelo(m) {
  return `<tr>
    <td>${s(m.model_id)}</td><td>${s(m.tier)}</td>
    <td><input type="number" id="mod-in-${a(m.model_id)}" value="${a(m.price_input_per_mtok)}" min="0" step="0.01" style="width:90px;"></td>
    <td><input type="number" id="mod-out-${a(m.model_id)}" value="${a(m.price_output_per_mtok)}" min="0" step="0.01" style="width:90px;"></td>
    <td><input type="checkbox" id="mod-act-${a(m.model_id)}" ${m.active ? 'checked' : ''} style="width:auto;"></td>
    <td><button class="btn-auto" data-accion="guardar-modelo" data-id="${a(m.model_id)}" style="width:auto;">Guardar</button></td>
  </tr>`;
}

async function manejarClic(ev) {
  const btn = ev.target.closest('button[data-accion]');
  if (!btn) return;
  const { accion, id } = btn.dataset;
  btn.disabled = true;
  try {
    if (accion === 'editar') {
      const fila = document.getElementById(`edicion-${id}`);
      fila.style.display = fila.style.display === 'none' ? '' : 'none';
    } else if (accion === 'guardar') await guardarLimites(Number(id));
    else if (accion === 'suspender') await suspender(Number(id));
    else if (accion === 'reanudar') await reanudar(Number(id));
    else if (accion === 'guardar-modelo') await guardarModelo(id);
  } finally {
    btn.disabled = false;
  }
}

function numero(id) {
  const v = document.getElementById(id)?.value;
  return v === '' || v == null ? NaN : Number(v);
}

async function guardarLimites(companyId) {
  const cambios = {
    daily_budget_usd: numero(`lim-dia-${companyId}`),
    monthly_budget_usd: numero(`lim-mes-${companyId}`),
    max_output_tokens: numero(`lim-sal-${companyId}`),
    max_gen_per_conversation_hour: numero(`lim-hora-${companyId}`),
    allow_advanced: document.getElementById(`lim-adv-${companyId}`)?.checked ?? false,
  };
  if (!(cambios.daily_budget_usd >= 0) || !(cambios.monthly_budget_usd >= 0)) {
    showToast('Los límites deben ser cantidades de 0 en adelante.', 'error'); return;
  }
  if (!(cambios.max_output_tokens >= 50 && cambios.max_output_tokens <= 4000)) {
    showToast('Los tokens de salida van de 50 a 4,000.', 'error'); return;
  }
  if (!(Number.isInteger(cambios.max_gen_per_conversation_hour) && cambios.max_gen_per_conversation_hour >= 0 && cambios.max_gen_per_conversation_hour <= 200)) {
    showToast('Las sugerencias por hora van de 0 a 200.', 'error'); return;
  }
  if (cambios.daily_budget_usd > cambios.monthly_budget_usd &&
      !(await showConfirm('El límite diario es mayor que el mensual; en la práctica mandará el mensual. ¿Guardar así?'))) return;

  const actual = global.limites[companyId] ?? {};
  if (cambios.allow_advanced && !actual.allow_advanced) {
    const avanzado = global.modelos.find(m => m.tier === 'avanzado' && m.active);
    if (!avanzado) { showToast('No hay un modelo avanzado activo.', 'error'); return; }
    if (!(await showConfirm(`El modelo avanzado (${s(avanzado.model_id)}) cuesta unas 40 veces más. Solo se usa cuando el económico falla o duda, una vez por mensaje. ¿Permitirlo para esta empresa?`))) return;
    cambios.advanced_model_id = avanzado.model_id;
  }

  const { error } = await global.supabase.from('ai_company_limits').update(cambios).eq('company_id', companyId);
  if (error) { showToast('No se guardaron los límites: ' + error.message, 'error'); return; }
  showToast('Límites guardados');
  await recargarGlobal();
}

async function suspender(companyId) {
  const motivo = await showPrompt('¿Por qué se pausa la IA de esta empresa? (lo verá MAHP en el registro)');
  if (motivo === null) return;
  const { error } = await global.supabase.from('ai_company_limits')
    .update({ suspended_at: new Date().toISOString(), suspended_reason: motivo.trim() || 'Pausa manual' })
    .eq('company_id', companyId);
  if (error) { showToast('No se pudo suspender: ' + error.message, 'error'); return; }
  showToast('IA suspendida para la empresa');
  await recargarGlobal();
}

async function reanudar(companyId) {
  if (!(await showConfirm('¿Reanudar la IA para esta empresa?'))) return;
  const { error } = await global.supabase.from('ai_company_limits')
    .update({ suspended_at: null, suspended_reason: null }).eq('company_id', companyId);
  if (error) { showToast('No se pudo reanudar: ' + error.message, 'error'); return; }
  showToast('IA reanudada');
  await recargarGlobal();
}

async function guardarModelo(modelId) {
  const m = global.modelos.find(x => x.model_id === modelId);
  if (!m) return;
  const cambios = {
    price_input_per_mtok: numero(`mod-in-${modelId}`),
    price_output_per_mtok: numero(`mod-out-${modelId}`),
    active: document.getElementById(`mod-act-${modelId}`)?.checked ?? m.active,
  };
  if (!(cambios.price_input_per_mtok >= 0) || !(cambios.price_output_per_mtok >= 0)) {
    showToast('Los precios deben ser cantidades de 0 en adelante.', 'error'); return;
  }
  if (m.active && !cambios.active) {
    const usanloPorDefecto = Object.values(global.limites).filter(l => l.default_model_id === modelId).length;
    const aviso = usanloPorDefecto
      ? `${usanloPorDefecto} empresa(s) usan este modelo como predeterminado: su IA se detendrá hasta que se reactive. ¿Desactivarlo?`
      : '¿Desactivar este modelo?';
    if (!(await showConfirm(aviso))) return;
  }
  const { error } = await global.supabase.from('ai_models')
    .update({ ...cambios, updated_at: new Date().toISOString() }).eq('model_id', modelId);
  if (error) { showToast('No se guardó el modelo: ' + error.message, 'error'); return; }
  showToast('Modelo guardado');
  await recargarGlobal();
}
