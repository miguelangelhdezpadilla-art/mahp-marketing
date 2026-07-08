import { sHtml as s } from '../ui.js';

const COLORES_AVATAR = ['#6366f1', '#8b5cf6', '#a78bfa'];

function iniciales(nombre) {
  return (nombre || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function badgesHtml(badges) {
  const mapa = {
    top:        { clase: 'badge-gold',   texto: '👑 Top colaborador' },
    racha:      { clase: 'badge-fire',   texto: '🔥 En racha' },
    evidencias: { clase: 'badge-silver', texto: '📎 Evidenciador' },
    veloz:      { clase: 'badge-star',   texto: '⚡ Veloz' },
  };
  return badges.map(b => `<span class="badge-logro ${mapa[b].clase}">${mapa[b].texto}</span>`).join('');
}

function podioHtml(top3) {
  if (top3.length < 3) return '';
  const orden = [top3[1], top3[0], top3[2]]; // 2do, 1er, 3er
  const alturas = [70, 90, 55];
  const posiciones = [2, 1, 3];

  return `
    <div class="podio">
      ${orden.map((u, i) => `
        <div class="podio-item">
          <div class="podio-avatar" style="width:${posiciones[i] === 1 ? 56 : 44}px; height:${posiciones[i] === 1 ? 56 : 44}px; background:${COLORES_AVATAR[posiciones[i] - 1]}">
            ${posiciones[i] === 1 ? '<span class="podio-corona">👑</span>' : ''}
            ${s(iniciales(u.full_name))}
          </div>
          <div class="podio-nombre">${s(u.full_name)}</div>
          <div class="podio-pts">${u.total_points} pts</div>
          <div class="podio-base" style="height:${alturas[i]}px; background:${COLORES_AVATAR[posiciones[i] - 1]}">
            ${posiciones[i]}
          </div>
        </div>`).join('')}
    </div>`;
}

function listaHtml(usuarios, badgesPorUsuario) {
  if (!usuarios.length) {
    return '<div class="empty-state"><i class="fa-solid fa-ranking-star"></i><p>Todavía no hay puntos registrados.</p></div>';
  }

  return `
    <div class="ranking-list">
      ${usuarios.map((u, i) => `
        <div class="ranking-item ${i === 0 ? 'top1' : ''}">
          <div class="ranking-pos">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</div>
          <div class="ranking-avatar" style="background:${COLORES_AVATAR[i % 3]}">${s(iniciales(u.full_name))}</div>
          <div class="ranking-info">
            <div class="ranking-nombre">${s(u.full_name)}</div>
            <div class="ranking-detalle">${u.total_events} acción${u.total_events !== 1 ? 'es' : ''} registrada${u.total_events !== 1 ? 's' : ''}</div>
            <div class="badges-row">${badgesHtml(badgesPorUsuario[u.user_id] ?? [])}</div>
          </div>
          <div class="ranking-pts">${u.total_points}<span> pts</span></div>
        </div>`).join('')}
    </div>`;
}

// ── Ranking de colaboradores (admin/director) ───────────────────
export async function renderRanking(supabase, companyId, idContenedor) {
  const contenedor = document.getElementById(idContenedor);
  if (!contenedor) return;

  const [
    { data: totales },
    { data: campanias },
    { data: evidencias },
    { data: completadas },
    { data: veloces },
  ] = await Promise.all([
    supabase.from('points_totals').select('*').eq('company_id', companyId).order('total_points', { ascending: false }),
    supabase.from('campaigns').select('id, name').eq('company_id', companyId).eq('status', 'activa'),
    supabase.from('evidencias').select('uploaded_by').eq('company_id', companyId),
    supabase.from('actividades').select('assigned_to').eq('company_id', companyId).eq('status', 'completada'),
    supabase.from('points_log').select('user_id').eq('company_id', companyId).eq('action', 'completada_antes_fecha'),
  ]);

  const usuarios = totales ?? [];

  // ── Conteos auxiliares para badges ──
  const evidenciasPorUsuario = {};
  (evidencias ?? []).forEach(ev => {
    if (!ev.uploaded_by) return;
    evidenciasPorUsuario[ev.uploaded_by] = (evidenciasPorUsuario[ev.uploaded_by] ?? 0) + 1;
  });
  const maxEvidencias = Math.max(0, ...Object.values(evidenciasPorUsuario));

  const completadasPorUsuario = {};
  (completadas ?? []).forEach(a => {
    if (!a.assigned_to) return;
    completadasPorUsuario[a.assigned_to] = (completadasPorUsuario[a.assigned_to] ?? 0) + 1;
  });

  const usuariosVeloces = new Set((veloces ?? []).map(v => v.user_id));

  const topColaboradorId = usuarios[0]?.user_id ?? null;

  const badgesPorUsuario = {};
  usuarios.forEach(u => {
    const badges = [];
    if (u.user_id === topColaboradorId) badges.push('top');
    if ((completadasPorUsuario[u.user_id] ?? 0) >= 3) badges.push('racha');
    if (maxEvidencias > 0 && (evidenciasPorUsuario[u.user_id] ?? 0) === maxEvidencias) badges.push('evidencias');
    if (usuariosVeloces.has(u.user_id)) badges.push('veloz');
    badgesPorUsuario[u.user_id] = badges;
  });

  contenedor.innerHTML = `
    <div class="ranking-tabs">
      <button class="ranking-tab activo" onclick="window.cambiarRankingTab('global','${companyId}')">🌐 Global</button>
      ${(campanias ?? []).map(c => `
        <button class="ranking-tab" onclick="window.cambiarRankingTab('${c.id}','${companyId}')">🔥 ${s(c.name)}</button>`).join('')}
    </div>
    <div id="podio-${companyId}">${podioHtml(usuarios.slice(0, 3))}</div>
    <div id="ranking-list-${companyId}">${listaHtml(usuarios, badgesPorUsuario)}</div>`;

  window.cambiarRankingTab = async function(tabId, cId) {
    document.querySelectorAll('.ranking-tab').forEach(btn => btn.classList.remove('activo'));
    const btnActivo = [...document.querySelectorAll('.ranking-tab')].find(btn =>
      btn.getAttribute('onclick')?.includes(`'${tabId}'`));
    if (btnActivo) btnActivo.classList.add('activo');

    let datosTab;
    if (tabId === 'global') {
      datosTab = usuarios;
    } else {
      const { data } = await supabase
        .from('points_by_campaign')
        .select('*')
        .eq('company_id', cId)
        .eq('campaign_id', tabId)
        .order('total_points', { ascending: false });
      datosTab = data ?? [];
    }

    const podioEl = document.getElementById(`podio-${cId}`);
    const listaEl = document.getElementById(`ranking-list-${cId}`);
    if (podioEl) podioEl.innerHTML = podioHtml(datosTab.slice(0, 3));
    if (listaEl) listaEl.innerHTML = listaHtml(datosTab, badgesPorUsuario);
  };
}

// ── Tabla estática del sistema de puntos ─────────────────────────
export function renderTablaPuntos(idContenedor) {
  const contenedor = document.getElementById(idContenedor);
  if (!contenedor) return;

  contenedor.innerHTML = `
    <div class="pts-tabla">
      <div class="pts-tabla-header">🎯 Cómo se ganan los puntos</div>
      <div class="pts-row">
        <span class="pts-accion">✅ Tarea completada</span>
        <span class="pts-valor">+50 pts</span>
      </div>
      <div class="pts-row">
        <span class="pts-accion">📊 Avance reportado (por cada 10%)</span>
        <span class="pts-valor">+5 pts</span>
      </div>
      <div class="pts-row">
        <span class="pts-accion">📎 Evidencia subida</span>
        <span class="pts-valor">+10 pts</span>
      </div>
      <div class="pts-row">
        <span class="pts-accion">⚡ Completada antes de fecha límite</span>
        <span class="pts-valor">+20 pts bonus</span>
      </div>
    </div>`;
}
