export async function renderizarResumen(supabaseClient, companyId, idContenedor) {
  if (!companyId) {
    console.error('[dashboard] renderizarResumen: companyId es undefined');
    return;
  }
  const cont = document.getElementById(idContenedor);
  if (!cont) {
    console.error('[dashboard] renderizarResumen: contenedor #' + idContenedor + ' no encontrado');
    return;
  }

  const skeleton = Array(4).fill(`
    <div class="stat-card skeleton-card">
      <div class="skeleton skeleton-line short"></div>
      <div class="skeleton skeleton-line mid" style="margin-top:8px;"></div>
    </div>`).join('');
  cont.innerHTML = skeleton;

  let hoy = new Date().toISOString().slice(0, 10);

  let [actividadesHoy, todasActividades, campaniasActivas, colaboradores] = await Promise.all([
    supabaseClient.from('actividades').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('fecha', hoy),
    supabaseClient.from('actividades').select('status').eq('company_id', companyId),
    supabaseClient.from('campaigns').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'activa'),
    supabaseClient.from('profiles').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('role', 'collaborator').eq('active', true)
  ]);

  if (actividadesHoy.error)   console.error('[dashboard] actividadesHoy:', actividadesHoy.error.message);
  if (todasActividades.error)  console.error('[dashboard] todasActividades:', todasActividades.error.message);
  if (campaniasActivas.error)  console.error('[dashboard] campaniasActivas:', campaniasActivas.error.message);
  if (colaboradores.error)     console.error('[dashboard] colaboradores:', colaboradores.error.message);

  let total       = todasActividades.data ? todasActividades.data.length : 0;
  let completadas = todasActividades.data ? todasActividades.data.filter(a => a.status === 'completada').length : 0;
  let cumplimiento = total > 0 ? Math.round((completadas / total) * 100) : 0;
  let semaforo = cumplimiento >= 90 ? 'green' : cumplimiento >= 70 ? 'amber' : 'red';

  console.log('[dashboard] resumen —', {
    actividadesHoy: actividadesHoy.count ?? 0,
    cumplimiento:   cumplimiento + '%',
    campaniasActivas: campaniasActivas.count ?? 0,
    colaboradores:  colaboradores.count ?? 0
  });

  let tarjetas = [
    { numero: actividadesHoy.count || 0, etiqueta: '📅 Actividades hoy' },
    { numero: `${cumplimiento}%`, etiqueta: '📈 Cumplimiento', clase: semaforo, sub: `${completadas}/${total} completadas` },
    { numero: campaniasActivas.count || 0, etiqueta: '🔥 Campañas activas', clase: 'accent' },
    { numero: colaboradores.count || 0, etiqueta: '👥 Colaboradores' }
  ];

  cont.innerHTML = tarjetas.map(t => `
    <div class="stat-card ${t.clase || ''}">
      <div class="stat-label">${t.etiqueta}</div>
      <div class="stat-value">${t.numero}</div>
      ${t.sub ? `<div class="stat-sub">${t.sub}</div>` : ''}
    </div>
  `).join('');
}
