import { supabaseClient, requireSession, logout } from './supabaseClient.js';
import { showToast, configurarNotificaciones, configurarTabs } from './ui.js';

window.cerrarSesion = logout;
let empresasCache = [];

configurarTabs();

async function cargarEmpresas() {
  let { data, error } = await supabaseClient.from('companies').select('*').order('created_at', { ascending: false });
  if (error) { showToast('Error al cargar empresas: ' + error.message, 'error'); return; }
  empresasCache = data;

  document.getElementById('tablaEmpresas').innerHTML = data.map(e =>
    `<tr><td>${e.name}</td><td>${e.active ? 'Sí' : 'No'}</td><td>${new Date(e.created_at).toLocaleDateString()}</td>
     <td><a href="empresa.html?company_id=${e.id}">Ver panel operativo</a></td></tr>`
  ).join('');

  document.getElementById('empresaInvite').innerHTML = data.map(e =>
    `<option value="${e.id}">${e.name}</option>`
  ).join('');
}

async function cargarInvites() {
  let { data, error } = await supabaseClient.from('invites').select('*').order('created_at', { ascending: false });
  if (error) { showToast('Error al cargar invitaciones: ' + error.message, 'error'); return; }

  document.getElementById('tablaInvites').innerHTML = data.map(inv => {
    let empresa = empresasCache.find(e => e.id === inv.company_id);
    return `<tr><td>${inv.email}</td><td>${inv.role}</td><td>${empresa ? empresa.name : inv.company_id}</td><td>${inv.used ? '✅' : '⏳'}</td></tr>`;
  }).join('');
}

function enlaceVerPanel(usuario) {
  if (usuario.role === 'company_admin') return `<a href="empresa.html?company_id=${usuario.company_id}">Ver panel operativo</a>`;
  if (usuario.role === 'director') return `<a href="directivo.html?company_id=${usuario.company_id}">Ver dashboard</a>`;
  if (usuario.role === 'collaborator') return `<a href="colaborador.html?user_id=${usuario.id}">Ver tareas</a>`;
  return '';
}

async function cargarUsuarios() {
  let { data, error } = await supabaseClient.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) { showToast('Error al cargar usuarios: ' + error.message, 'error'); return; }

  document.getElementById('tablaUsuarios').innerHTML = data.map(u => {
    let empresa = empresasCache.find(e => e.id === u.company_id);
    let botonAcceso = u.role === 'super_admin' ? '' :
      `<button onclick="toggleAcceso('${u.id}', ${!u.active})" style="width:auto; background:${u.active ? '#e74c3c' : '#28A745'};">
        ${u.active ? 'Revocar' : 'Restaurar'}
      </button>`;
    return `<tr><td>${u.full_name || u.id}</td><td>${u.role}</td><td>${empresa ? empresa.name : '—'}</td>
      <td>${u.active ? '✅ Activo' : '🚫 Revocado'}</td><td>${enlaceVerPanel(u)}</td><td>${botonAcceso}</td></tr>`;
  }).join('') || '<tr class="fila-vacia"><td colspan="6">Sin usuarios todavía.</td></tr>';
}

window.toggleAcceso = async function(userId, nuevoEstado) {
  let { error } = await supabaseClient.from('profiles').update({ active: nuevoEstado }).eq('id', userId);
  if (error) { showToast('Error al actualizar acceso: ' + error.message, 'error'); return; }
  showToast(nuevoEstado ? 'Acceso restaurado' : 'Acceso revocado');
  await cargarUsuarios();
};

const ETIQUETAS_EVENTO = {
  company_created: 'Empresa creada',
  invite_created: 'Invitación creada',
  invite_cancelled: 'Invitación cancelada',
  access_revoked: 'Acceso revocado',
  access_restored: 'Acceso restaurado'
};

async function cargarAuditoria() {
  let { data, error } = await supabaseClient.from('audit_log').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) { showToast('Error al cargar actividad: ' + error.message, 'error'); return; }

  document.getElementById('tablaAuditoria').innerHTML = data.map(ev => {
    let empresa = empresasCache.find(e => e.id === ev.company_id);
    let detalle = ev.details ? Object.entries(ev.details).map(([k, v]) => `${k}: ${v}`).join(', ') : '';
    return `<tr><td>${new Date(ev.created_at).toLocaleString()}</td><td>${empresa ? empresa.name : '—'}</td>
      <td>${ETIQUETAS_EVENTO[ev.action] || ev.action}</td><td>${detalle}</td></tr>`;
  }).join('') || '<tr class="fila-vacia"><td colspan="4">Sin actividad todavía.</td></tr>';
}

window.crearEmpresa = async function() {
  let name = document.getElementById('nombreEmpresa').value.trim();
  if (!name) { document.getElementById('mensajeEmpresa').textContent = 'Escribe un nombre.'; return; }

  let { error } = await supabaseClient.from('companies').insert({ name });
  if (error) {
    document.getElementById('mensajeEmpresa').textContent = 'Error: ' + error.message;
    return;
  }

  document.getElementById('nombreEmpresa').value = '';
  document.getElementById('mensajeEmpresa').textContent = '✅ Empresa creada.';
  await cargarEmpresas();
  await cargarInvites();
};

window.invitarAdminEmpresa = async function() {
  let email = document.getElementById('emailInvite').value.trim();
  let company_id = document.getElementById('empresaInvite').value;

  if (!email || !company_id) {
    document.getElementById('mensajeInvite').textContent = 'Completa correo y empresa.';
    return;
  }

  let { data: { session } } = await supabaseClient.auth.getSession();
  let { error } = await supabaseClient.from('invites').insert({
    email, role: 'company_admin', company_id, invited_by: session.user.id
  });

  if (error) {
    document.getElementById('mensajeInvite').textContent = 'Error: ' + error.message;
    return;
  }

  document.getElementById('emailInvite').value = '';
  document.getElementById('mensajeInvite').textContent = '✅ Invitación creada.';
  await cargarInvites();
};

(async function() {
  let resultado = await requireSession(['super_admin']);
  if (!resultado) return;
  await cargarEmpresas();
  await cargarInvites();
  await cargarUsuarios();
  await cargarAuditoria();
  await configurarNotificaciones(supabaseClient, resultado.profile.id);
})();
