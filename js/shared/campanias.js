import { renderizarGridKpis } from './kpis.js';
import { sHtml, claseBadgeEstado } from '../ui.js';

// Carga y dibuja el detalle de una campaña (sus objetivos + sus
// actividades). opciones.permitirAgregarObjetivo agrega el formulario
// para crear un objetivo nuevo (solo lo usa empresa.js; directivo.js no).
export async function cargarDetalleCampania(supabaseClient, campaignId, { permitirAgregarObjetivo = false } = {}) {
  let contenedor = document.getElementById(`contenido-detalle-${campaignId}`);
  contenedor.innerHTML = `
    <div class="skeleton skeleton-stat" style="margin-bottom:8px;"></div>
    <div class="skeleton skeleton-line mid"></div>
    <div class="skeleton skeleton-line short"></div>`;

  let [objetivos, actividadesCampania] = await Promise.all([
    supabaseClient.from('kpis').select('*').eq('campaign_id', campaignId),
    supabaseClient.from('actividades').select('titulo, fecha, status').eq('campaign_id', campaignId).order('fecha')
  ]);

  let htmlObjetivos = renderizarGridKpis(objetivos.data, { conWrapper: true, mensajeVacio: 'Sin objetivos todavía.' });

  let htmlActividades = (actividadesCampania.data && actividadesCampania.data.length)
    ? '<ul>' + actividadesCampania.data.map(a => `<li>${sHtml(a.titulo)} — ${a.fecha} <span class="${claseBadgeEstado(a.status)}">${a.status}</span></li>`).join('') + '</ul>'
    : '<div class="empty-state"><i class="fa-solid fa-list-check"></i><p>Sin actividades todavía.</p></div>';

  let htmlFormulario = permitirAgregarObjetivo ? `
    <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; max-width:600px; margin:8px 0 16px 0;">
      <input type="text" id="objNombre-${campaignId}" placeholder="Nombre del objetivo" style="width:180px;">
      <input type="number" id="objMeta-${campaignId}" placeholder="Meta" style="width:90px;">
      <input type="text" id="objUnidad-${campaignId}" placeholder="Unidad" style="width:110px;">
      <button style="width:auto;" onclick="agregarObjetivo(${campaignId})"><i class="fa-solid fa-bullseye"></i> Agregar objetivo</button>
    </div>` : '';

  contenedor.innerHTML = `
    <h4 style="margin-top:0;">Objetivos</h4>
    ${htmlObjetivos}
    ${htmlFormulario}
    <h4>Actividades</h4>
    ${htmlActividades}
  `;
}

// Abre/cierra la fila expandible de una campaña; al abrir, carga su detalle.
export async function toggleCampania(supabaseClient, campaignId, opciones = {}) {
  let fila = document.getElementById(`detalle-${campaignId}`);
  let flecha = document.getElementById(`flecha-${campaignId}`);
  let abierta = fila.style.display !== 'none';

  if (abierta) {
    fila.style.display = 'none';
    flecha.className = 'fa-solid fa-chevron-right';
    return;
  }

  fila.style.display = 'table-row';
  flecha.className = 'fa-solid fa-chevron-down';
  await cargarDetalleCampania(supabaseClient, campaignId, opciones);
}
