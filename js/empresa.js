import { supabaseClient, requireSession, logout, resolveCompanyId } from './supabaseClient.js';
import { showToast, showConfirm, showPrompt, showInfo, configurarNotificaciones, configurarTabs, sHtml } from './ui.js';
import { renderizarResumen } from './shared/dashboard.js';
import { toggleCampania, cargarDetalleCampania } from './shared/campanias.js';
import { cargarEstrategias as cargarEstrategiasCompartido } from './shared/estrategias.js';
import {
  cargarTotalesSeguidores,
  cargarHistorialSeguidores,
  renderFormSeguidores,
  renderGestionCanales
} from './shared/seguidores.js';
import { renderFormMetas, cargarListaMetas } from './shared/metasSeguidores.js';
import { cargarTablaAvances } from './shared/avances.js';
import { renderFormIA } from './shared/ia.js';
import { renderHistorialTareas } from './shared/historialTareas.js';
import { renderizarGridKpis, cargarSeguidoresParaKpis } from './shared/kpis.js';
import { renderizarAvanceColaboradores } from './shared/colaboradores.js';

window.cerrarSesion = logout;
configurarTabs();

// Expuesto para el formulario multi-día del Sprint 4 (no usado por el resto de empresa.js)
window._supabase = supabaseClient;

let calendar;
let miPerfil;
let companyId;
let actividadIdPorEvento = new Map();

async function cargarInvites() {
  let { data, error } = await supabaseClient.from('invites').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
  if (error) { showToast('Error al cargar invitaciones: ' + error.message, 'error'); return; }
  document.getElementById('tablaInvites').innerHTML = data.map(inv =>
    `<tr><td>${inv.email}</td><td>${inv.role}</td><td>${inv.used ? '✅' : '⏳'}</td></tr>`
  ).join('');
}

window.invitarUsuario = async function() {
  let email = document.getElementById('emailInvite').value.trim();
  let role = document.getElementById('rolInvite').value;

  if (!email) { document.getElementById('mensajeInvite').textContent = 'Escribe un correo.'; return; }

  let { error } = await supabaseClient.from('invites').insert({
    email, role, company_id: companyId, invited_by: miPerfil.id
  });

  if (error) {
    document.getElementById('mensajeInvite').textContent = 'Error: ' + error.message;
    return;
  }

  document.getElementById('emailInvite').value = '';
  document.getElementById('mensajeInvite').textContent = '✅ Invitación creada.';
  await cargarInvites();
};

async function cargarCampanias() {
  let { data, error } = await supabaseClient.from('campaigns').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
  if (error) { showToast('Error al cargar campañas: ' + error.message, 'error'); return; }

  document.getElementById('tablaCampanias').innerHTML = data.map(c => `
    <tr style="cursor:pointer;" onclick="toggleCampania(${c.id})">
      <td><i class="fa-solid fa-chevron-right" id="flecha-${c.id}"></i> ${sHtml(c.name)}</td>
      <td>${sHtml(c.objective) || ''}</td><td>${c.start_date || ''}</td><td>${c.end_date || ''}</td><td>${c.status}</td>
    </tr>
    <tr id="detalle-${c.id}" style="display:none;">
      <td colspan="5"><div id="contenido-detalle-${c.id}" style="padding:12px 0;"></div></td>
    </tr>
  `).join('') || '<tr class="fila-vacia"><td colspan="5">Sin campañas todavía.</td></tr>';

  document.getElementById('campaniaActividad').innerHTML = '<option value="">Sin campaña</option>' +
    data.map(c => `<option value="${c.id}">${sHtml(c.name)}</option>`).join('');
}

window.toggleCampania = (campaignId) => toggleCampania(supabaseClient, campaignId, { permitirAgregarObjetivo: true });

window.agregarObjetivo = async function(campaignId) {
  let name = document.getElementById(`objNombre-${campaignId}`).value.trim();
  let target_value = parseFloat(document.getElementById(`objMeta-${campaignId}`).value);
  let unit = document.getElementById(`objUnidad-${campaignId}`).value.trim();

  if (!name || isNaN(target_value)) { showToast('Escribe un nombre y una meta numérica.', 'error'); return; }

  let { error } = await supabaseClient.from('kpis').insert({ name, target_value, unit, company_id: companyId, campaign_id: campaignId });
  if (error) { showToast('Error al agregar objetivo: ' + error.message, 'error'); return; }

  showToast('Objetivo agregado');
  await cargarDetalleCampania(supabaseClient, campaignId, { permitirAgregarObjetivo: true });
};

window.crearCampania = async function() {
  let name = document.getElementById('nombreCampania').value.trim();
  let objective = document.getElementById('objetivoCampania').value.trim();
  let start_date = document.getElementById('inicioCampania').value || null;
  let end_date = document.getElementById('finCampania').value || null;

  if (!name) { document.getElementById('mensajeCampania').textContent = 'Escribe un nombre.'; return; }

  let { error } = await supabaseClient.from('campaigns').insert({
    name, objective, start_date, end_date, company_id: companyId
  });

  if (error) {
    document.getElementById('mensajeCampania').textContent = 'Error: ' + error.message;
    return;
  }

  document.getElementById('nombreCampania').value = '';
  document.getElementById('objetivoCampania').value = '';
  document.getElementById('inicioCampania').value = '';
  document.getElementById('finCampania').value = '';
  document.getElementById('mensajeCampania').textContent = '✅ Campaña creada.';
  await cargarCampanias();
};

window.publicarEstrategia = async function() {
  let title = document.getElementById('tituloEstrategia').value.trim();
  let content = document.getElementById('contenidoEstrategia').value.trim();

  if (!title || !content) { showToast('Escribe un título y el contenido de la estrategia.', 'error'); return; }

  let { error } = await supabaseClient.from('strategies').insert({ title, content, company_id: companyId, created_by: miPerfil.id });
  if (error) { showToast('Error al publicar: ' + error.message, 'error'); return; }

  document.getElementById('tituloEstrategia').value = '';
  document.getElementById('contenidoEstrategia').value = '';
  showToast('Estrategia publicada');
  await cargarEstrategiasCompartido(supabaseClient, companyId, 'listaEstrategias');
};

async function cargarEquipo() {
  let { data, error } = await supabaseClient.from('profiles').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
  if (error) { showToast('Error al cargar el equipo: ' + error.message, 'error'); return; }

  document.getElementById('tablaEquipo').innerHTML = data.map(u => `
    <tr>
      <td>${u.full_name || u.id}</td>
      <td>${u.role}</td>
      <td>${u.active ? '✅ Activo' : '🚫 Revocado'}</td>
      <td><button onclick="toggleAcceso('${u.id}', ${!u.active})" style="width:auto; background:${u.active ? '#e74c3c' : '#28A745'};">
        ${u.active ? 'Revocar' : 'Restaurar'}
      </button></td>
    </tr>
  `).join('') || '<tr class="fila-vacia"><td colspan="4">Todavía no has invitado a nadie.</td></tr>';
}

window.toggleAcceso = async function(userId, nuevoEstado) {
  let { error } = await supabaseClient.from('profiles').update({ active: nuevoEstado }).eq('id', userId);
  if (error) { showToast('Error al actualizar acceso: ' + error.message, 'error'); return; }
  showToast(nuevoEstado ? 'Acceso restaurado' : 'Acceso revocado');
  await cargarEquipo();
};

const ETIQUETAS_EVENTO = {
  company_created: 'Empresa creada',
  invite_created: 'Invitación creada',
  invite_cancelled: 'Invitación cancelada',
  access_revoked: 'Acceso revocado',
  access_restored: 'Acceso restaurado'
};

async function cargarAuditoria() {
  let { data, error } = await supabaseClient.from('audit_log').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) { showToast('Error al cargar actividad: ' + error.message, 'error'); return; }

  document.getElementById('tablaAuditoria').innerHTML = data.map(ev => {
    let detalle = ev.details ? Object.entries(ev.details).map(([k, v]) => `${k}: ${v}`).join(', ') : '';
    return `<tr><td>${new Date(ev.created_at).toLocaleString()}</td><td>${ETIQUETAS_EVENTO[ev.action] || ev.action}</td><td>${detalle}</td></tr>`;
  }).join('') || '<tr class="fila-vacia"><td colspan="3">Sin actividad todavía.</td></tr>';
}

async function cargarColaboradores() {
  let { data, error } = await supabaseClient
    .from('profiles')
    .select('id, full_name')
    .eq('company_id', companyId)
    .eq('role', 'collaborator');

  if (error) { showToast('Error al cargar colaboradores: ' + error.message, 'error'); return; }

  document.getElementById('asignadoActividad').innerHTML = '<option value="">Sin asignar</option>' +
    data.map(c => `<option value="${c.id}">${c.full_name || c.id}</option>`).join('');

  let selectPendientes = document.getElementById('asignarPendientesColaborador');
  if (selectPendientes) {
    selectPendientes.innerHTML = '<option value="">Selecciona un colaborador</option>' +
      data.map(c => `<option value="${c.id}">${c.full_name || c.id}</option>`).join('');
  }
}

window.asignarPendientes = async function() {
  let colaboradorId = document.getElementById('asignarPendientesColaborador')?.value;
  let mensaje = document.getElementById('mensajeAsignarPendientes');

  if (!colaboradorId) {
    if (mensaje) { mensaje.textContent = 'Selecciona un colaborador primero.'; mensaje.style.color = 'var(--red)'; }
    return;
  }

  let { data, error } = await supabaseClient
    .from('actividades')
    .update({ assigned_to: colaboradorId })
    .eq('company_id', companyId)
    .is('assigned_to', null)
    .neq('status', 'completada')
    .select('id');

  if (error) {
    if (mensaje) { mensaje.textContent = 'Error: ' + error.message; mensaje.style.color = 'var(--red)'; }
    return;
  }

  let cantidad = data?.length ?? 0;
  if (mensaje) {
    mensaje.textContent = cantidad
      ? `✅ ${cantidad} actividad${cantidad !== 1 ? 'es' : ''} asignada${cantidad !== 1 ? 's' : ''}.`
      : 'No había actividades pendientes de asignar.';
    mensaje.style.color = cantidad ? 'var(--green)' : 'var(--text-muted)';
  }
  showToast(cantidad ? `${cantidad} actividad${cantidad !== 1 ? 'es' : ''} asignada${cantidad !== 1 ? 's' : ''}` : 'No había pendientes');
};

async function cargarActividades() {
  let { data, error } = await supabaseClient.from('actividades').select('*').eq('company_id', companyId).order('fecha');
  if (error) { showToast('Error al cargar actividades: ' + error.message, 'error'); return; }

  calendar.removeAllEvents();
  actividadIdPorEvento.clear();

  data.forEach(fila => {
    let evento = calendar.addEvent({
      title: `${fila.titulo} (${fila.canal})`,
      start: fila.fecha,
      color: fila.color,
      classNames: fila.status === 'en_progreso' ? ['fc-event-en-progreso'] : []
    });
    actividadIdPorEvento.set(evento.id, fila.id);
  });
}

window.agregarActividad = async function() {
  let titulo = document.getElementById('titulo').value;
  let canal = document.getElementById('canal').value;
  let descripcion = document.getElementById('descripcion').value.trim() || null;
  let fecha = document.getElementById('fecha').value;
  let color = document.getElementById('categoria').value;
  let campaign_id = document.getElementById('campaniaActividad').value || null;
  let assigned_to = document.getElementById('asignadoActividad').value || null;

  if (!titulo || !canal || !fecha) {
    showToast('Completa todos los campos del formulario.', 'error');
    return;
  }

  let { data, error } = await supabaseClient.from('actividades')
    .insert({ titulo, canal, descripcion, fecha, color, campaign_id, assigned_to, company_id: companyId })
    .select()
    .single();

  if (error) { showToast('Error al guardar: ' + error.message, 'error'); return; }

  let evento = calendar.addEvent({
    title: `${data.titulo} (${data.canal})`,
    start: data.fecha,
    color: data.color
  });
  actividadIdPorEvento.set(evento.id, data.id);
  showToast('Actividad agregada');

  document.getElementById('titulo').value = '';
  document.getElementById('canal').value = '';
  document.getElementById('descripcion').value = '';
  document.getElementById('fecha').value = '';
};

async function manejarArrastrarActividad(info) {
  let id = actividadIdPorEvento.get(info.event.id);
  let nuevaFecha = info.event.startStr;

  let { error } = await supabaseClient.from('actividades').update({ fecha: nuevaFecha }).eq('id', id);
  if (error) {
    showToast('Error al mover la actividad: ' + error.message, 'error');
    info.revert();
    return;
  }
  showToast('Actividad movida al ' + nuevaFecha);
}

async function manejarClickEvento(info) {
  let id = actividadIdPorEvento.get(info.event.id);
  let accion = await showPrompt(`${info.event.title}\n\nEscribe 1 para editar el título, 2 para eliminar, 3 para ver observaciones, o 4 para asignar a un colaborador:`);

  if (accion === '1') {
    let nuevoTitulo = await showPrompt('Nuevo título de la actividad:', info.event.title);
    if (nuevoTitulo) {
      let { error } = await supabaseClient.from('actividades').update({ titulo: nuevoTitulo }).eq('id', id);
      if (error) { showToast('Error al editar: ' + error.message, 'error'); return; }
      info.event.setProp('title', nuevoTitulo);
      showToast('Actividad editada');
    }
  } else if (accion === '2') {
    if (await showConfirm('¿Seguro que deseas eliminar esta actividad?')) {
      let { error } = await supabaseClient.from('actividades').delete().eq('id', id);
      if (error) { showToast('Error al eliminar: ' + error.message, 'error'); return; }
      info.event.remove();
      showToast('Actividad eliminada');
    }
  } else if (accion === '3') {
    let { data, error } = await supabaseClient.from('activity_updates').select('*').eq('activity_id', id).order('created_at', { ascending: false });
    if (error) { showToast('Error al cargar observaciones: ' + error.message, 'error'); return; }

    let html = (data && data.length)
      ? data.map(o => `<div style="border-top:1px solid #eee; padding:6px 0;">
          <strong>${o.progress_pct}%</strong> — ${o.note ? sHtml(o.note) : '<em>(sin nota)</em>'}
          <div style="color:#999; font-size:0.85em;">${new Date(o.created_at).toLocaleString()}${o.updated_at ? ' · editado' : ''}</div>
        </div>`).join('')
      : '<p style="color:#888;">Sin observaciones todavía.</p>';

    showInfo(sHtml(info.event.title), html);
  } else if (accion === '4') {
    let { data: colaboradores, error: errColab } = await supabaseClient
      .from('profiles')
      .select('id, full_name')
      .eq('company_id', companyId)
      .eq('role', 'collaborator');

    if (errColab) { showToast('Error al cargar colaboradores: ' + errColab.message, 'error'); return; }
    if (!colaboradores?.length) { showToast('No hay colaboradores en esta empresa todavía.', 'error'); return; }

    let lista = colaboradores.map((c, i) => `${i + 1}. ${c.full_name || c.id}`).join('\n');
    let seleccion = await showPrompt(`¿A quién asignar "${info.event.title}"?\n\n${lista}\n\nEscribe el número:`);
    let idx = parseInt(seleccion, 10) - 1;

    if (isNaN(idx) || !colaboradores[idx]) { showToast('Selección inválida.', 'error'); return; }

    let { error } = await supabaseClient.from('actividades').update({ assigned_to: colaboradores[idx].id }).eq('id', id);
    if (error) { showToast('Error al asignar: ' + error.message, 'error'); return; }
    showToast('Actividad asignada a ' + (colaboradores[idx].full_name || 'colaborador'));
  }
}

async function cargarKpis() {
  const [{ data, error }, seguidores] = await Promise.all([
    supabaseClient.from('kpis').select('*').eq('company_id', companyId).is('campaign_id', null).order('created_at'),
    cargarSeguidoresParaKpis(supabaseClient, companyId)
  ]);
  if (error) { showToast('Error al cargar KPIs: ' + error.message, 'error'); return; }
  const el = document.getElementById('kpiGrid');
  if (el) el.innerHTML = renderizarGridKpis(data ?? [], seguidores);
}

window.toggleSeccionIA = function() {
  const seccion = document.getElementById('seccionIA');
  const arrow   = document.getElementById('iaArrow');
  const abierta = seccion.style.display !== 'none';
  seccion.style.display = abierta ? 'none' : 'block';
  if (arrow) arrow.textContent = abierta ? '›' : '˅';
};

(async function() {
  let resultado = await requireSession(['company_admin', 'super_admin']);
  if (!resultado) return;
  miPerfil = resultado.profile;
  companyId = resolveCompanyId(miPerfil);
  window._empresaId = companyId; // usado por el formulario multi-día del Sprint 4

  if (miPerfil.role === 'super_admin') {
    document.getElementById('enlaceVolverAdmin').style.display = 'inline';
  }

  if (!companyId) {
    document.getElementById('mensajeSinEmpresa').style.display = 'block';
    return;
  }
  document.getElementById('panelOperativo').style.display = 'block';

  let { data: empresa } = await supabaseClient.from('companies').select('name').eq('id', companyId).single();
  if (empresa) document.getElementById('nombreEmpresaTitulo').textContent = empresa.name;
  document.getElementById('enlaceDashboardDesempeno').href = `directivo.html?company_id=${companyId}`;

  calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
    initialView: 'dayGridMonth',
    locale: 'es',
    events: [],
    editable: true,
    eventClick: manejarClickEvento,
    eventDrop: manejarArrastrarActividad
  });
  calendar.render();
  window._calendar = calendar; // usado por el formulario multi-día del Sprint 4
  window._recargarActividades = cargarActividades; // el calendario no usa event source dinámica, hay que repoblarlo manualmente

  let cambiarTabBase = window.cambiarTab;
  window.cambiarTab = function(nombre) {
    cambiarTabBase(nombre);
    if (nombre === 'calendario') calendar.updateSize();
  };

  await Promise.all([
    renderizarResumen(supabaseClient, companyId, 'resumenGrid'),
    cargarInvites(), cargarEquipo(), cargarCampanias(), cargarColaboradores(), cargarActividades(), cargarAuditoria(),
    cargarEstrategiasCompartido(supabaseClient, companyId, 'listaEstrategias'),
    configurarNotificaciones(supabaseClient, miPerfil.id),
    renderGestionCanales(supabaseClient, companyId, showToast),
    renderFormMetas(supabaseClient, companyId, miPerfil.id, showToast),
    cargarTotalesSeguidores(supabaseClient, companyId),
    renderFormSeguidores(supabaseClient, companyId, null, async () => {
      await cargarTotalesSeguidores(supabaseClient, companyId);
      await cargarHistorialSeguidores(supabaseClient, companyId);
    }),
    cargarHistorialSeguidores(supabaseClient, companyId),
    renderFormIA(supabaseClient, companyId, showToast),
    cargarKpis(),
    renderizarAvanceColaboradores(supabaseClient, companyId, 'avanceColaboradores', miPerfil),
    cargarTablaAvances(supabaseClient, companyId, 'tablaAvances'),
    renderHistorialTareas(supabaseClient, companyId, 'historialTareas'),
  ]);
})();
