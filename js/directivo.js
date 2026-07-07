import { supabaseClient, requireSession, logout, resolveCompanyId } from './supabaseClient.js';
import { showToast, configurarNotificaciones, configurarTabs } from './ui.js';
import { renderizarResumen } from './shared/dashboard.js';
import { renderizarGridKpis, cargarSeguidoresParaKpis } from './shared/kpis.js';
import { toggleCampania } from './shared/campanias.js';
import { cargarEstrategias } from './shared/estrategias.js';
import { renderizarAvanceColaboradores } from './shared/colaboradores.js';
import { renderHistorialTareas } from './shared/historialTareas.js';
import {
  cargarTotalesSeguidores,
  cargarHistorialSeguidores,
  renderFormSeguidores,
  renderGestionCanales
} from './shared/seguidores.js';
import { renderFormMetas, cargarListaMetas } from './shared/metasSeguidores.js';
import { cargarTablaAvances } from './shared/avances.js';

window.cerrarSesion = logout;
configurarTabs();
let companyId;

async function cargarKpis() {
  let { data, error } = await supabaseClient.from('kpis').select('*').eq('company_id', companyId).is('campaign_id', null).order('created_at');
  if (error) { showToast('Error al cargar KPIs: ' + error.message, 'error'); return; }

  const seguidores = await cargarSeguidoresParaKpis(supabaseClient, companyId);
  document.getElementById('kpiGrid').innerHTML = renderizarGridKpis(data ?? [], seguidores);
}

async function cargarCampaniasYColaboradores() {
  let { data: campanias, error: errCampanias } = await supabaseClient.from('campaigns').select('*').eq('company_id', companyId);
  if (errCampanias) { showToast('Error al cargar campañas: ' + errCampanias.message, 'error'); return; }

  let { data: actividades, error: errActividades } = await supabaseClient
    .from('actividades')
    .select('campaign_id, assigned_to, progress_pct, status')
    .eq('company_id', companyId);
  if (errActividades) { showToast('Error al cargar actividades: ' + errActividades.message, 'error'); return; }

  // Avance promedio por campaña
  document.getElementById('tablaCampanias').innerHTML = campanias.map(c => {
    let delaCampania = actividades.filter(a => a.campaign_id === c.id);
    let promedio = delaCampania.length
      ? Math.round(delaCampania.reduce((s, a) => s + a.progress_pct, 0) / delaCampania.length)
      : 0;
    return `
      <tr style="cursor:pointer;" onclick="toggleCampania(${c.id})">
        <td><i class="fa-solid fa-chevron-right" id="flecha-${c.id}"></i> ${c.name}</td>
        <td>${c.status}</td><td>${promedio}%</td>
      </tr>
      <tr id="detalle-${c.id}" style="display:none;">
        <td colspan="3"><div id="contenido-detalle-${c.id}" style="padding:12px 0;"></div></td>
      </tr>`;
  }).join('') || '<tr class="fila-vacia"><td colspan="3">Sin campañas todavía.</td></tr>';

  // Desempeño por colaborador
  let asignadosUnicos = [...new Set(actividades.map(a => a.assigned_to).filter(Boolean))];

  let nombresPorId = {};
  if (asignadosUnicos.length) {
    let { data: perfiles } = await supabaseClient.from('profiles').select('id, full_name').in('id', asignadosUnicos);
    (perfiles || []).forEach(p => { nombresPorId[p.id] = p.full_name || p.id; });
  }

  document.getElementById('tablaColaboradores').innerHTML = asignadosUnicos.map(id => {
    let tareas = actividades.filter(a => a.assigned_to === id);
    let completadas = tareas.filter(a => a.status === 'completada').length;
    let promedio = tareas.length ? Math.round(tareas.reduce((s, a) => s + a.progress_pct, 0) / tareas.length) : 0;
    return `<tr><td>${nombresPorId[id] || id}</td><td>${tareas.length}</td><td>${completadas}</td><td>${promedio}%</td></tr>`;
  }).join('') || '<tr class="fila-vacia"><td colspan="4">Sin tareas asignadas todavía.</td></tr>';
}

window.toggleCampania = (campaignId) => toggleCampania(supabaseClient, campaignId);

(async function() {
  let resultado = await requireSession(['director', 'company_admin', 'super_admin']);
  if (!resultado) return;
  companyId = resolveCompanyId(resultado.profile);

  if (resultado.profile.role === 'super_admin') {
    document.getElementById('enlaceVolverAdmin').style.display = 'inline';
  }

  if (!companyId) {
    document.getElementById('mensajeSinEmpresa').style.display = 'block';
    return;
  }
  document.getElementById('panelOperativo').style.display = 'block';

  let { data: empresa } = await supabaseClient.from('companies').select('name').eq('id', companyId).single();
  if (empresa) document.getElementById('nombreEmpresaTitulo').textContent = empresa.name;

  await Promise.all([
    renderizarResumen(supabaseClient, companyId, 'resumenGrid'),
    cargarKpis(),
    cargarCampaniasYColaboradores(),
    cargarEstrategias(supabaseClient, companyId, 'listaEstrategias'),
    configurarNotificaciones(supabaseClient, resultado.profile.id),
    renderizarAvanceColaboradores(supabaseClient, companyId, 'avanceColaboradores', resultado.profile),
    cargarTablaAvances(supabaseClient, companyId, 'tablaAvances'),
    renderGestionCanales(supabaseClient, companyId, showToast),
    renderFormMetas(supabaseClient, companyId, resultado.profile.id, showToast),
    cargarTotalesSeguidores(supabaseClient, companyId),
    renderFormSeguidores(supabaseClient, companyId, null, async () => {
      await cargarTotalesSeguidores(supabaseClient, companyId);
      await cargarHistorialSeguidores(supabaseClient, companyId);
    }),
    cargarHistorialSeguidores(supabaseClient, companyId),
    renderHistorialTareas(supabaseClient, companyId, 'historialTareas'),
  ]);
})();
