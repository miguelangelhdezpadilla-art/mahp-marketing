import { showToast, sHtml } from '../ui.js';

// Carga y dibuja la lista de estrategias directivas. companyId es opcional:
// si no se pasa (caso colaborador viendo desde super_admin sin empresa propia
// resuelta), se confía en RLS para acotar el resultado.
export async function cargarEstrategias(supabaseClient, companyId, idContenedor) {
  let consulta = supabaseClient.from('strategies').select('*').order('created_at', { ascending: false });
  if (companyId) consulta = consulta.eq('company_id', companyId);

  let { data, error } = await consulta;
  if (error) { showToast('Error al cargar estrategias: ' + error.message, 'error'); return; }

  document.getElementById(idContenedor).innerHTML = (data && data.length)
    ? data.map(s => `
        <div class="estrategia-item">
          <h4>${sHtml(s.title)}</h4>
          <p>${sHtml(s.content)}</p>
          <div class="estrategia-meta">${new Date(s.created_at).toLocaleDateString()}</div>
        </div>`).join('')
    : '<div class="empty-state"><i class="fa-solid fa-lightbulb"></i><p>Sin estrategias publicadas todavía.</p></div>';
}
