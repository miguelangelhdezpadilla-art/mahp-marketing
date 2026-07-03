import { sHtml as s, showToast, claseBadgeEstado } from '../ui.js';
import { renderZonaEvidencias } from './evidencias.js';

// ── Cambiar tab del detalle ───────────────────────────────────
window.cambiarTabDetalle = function(tareaId, tab) {
  ['avance', 'evidencias', 'resultado'].forEach(nombre => {
    const panel = document.getElementById(`panel-${nombre}-${tareaId}`);
    const btn   = document.querySelector(`[data-tab-det="${tareaId}-${nombre}"]`);
    if (panel) panel.classList.toggle('activo', nombre === tab);
    if (btn)   btn.classList.toggle('activo', nombre === tab);
  });
};

// ── Render completo de una tarea con tabs ─────────────────────
export async function renderDetalleTarea(supabase, tarea, perfil, idContenedor) {
  const cont = document.getElementById(idContenedor);
  if (!cont) return;

  const companyId = tarea.company_id ?? perfil?.company_id;

  cont.innerHTML = `
    <div class="det-card">
      <div class="det-header">
        <div class="det-titulo">
          ${s(tarea.titulo)}
          <span class="${claseBadgeEstado(tarea.status)}">${tarea.status}</span>
        </div>
        <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">
          ${s(tarea.canal || '')} · ${tarea.fecha || ''}
        </div>
        <div class="det-pbar">
          <div class="det-pbar-fill" style="width:${tarea.progress_pct || 0}%"></div>
        </div>
      </div>
      <div class="det-tabs">
        <button class="det-tab activo" data-tab-det="${tarea.id}-avance"
                onclick="window.cambiarTabDetalle('${tarea.id}','avance')">
          📊 Historial de avance
        </button>
        <button class="det-tab" data-tab-det="${tarea.id}-evidencias"
                onclick="window.cambiarTabDetalle('${tarea.id}','evidencias')">
          📎 Evidencias
        </button>
        <button class="det-tab" data-tab-det="${tarea.id}-resultado"
                onclick="window.cambiarTabDetalle('${tarea.id}','resultado')">
          📈 Resultado
        </button>
      </div>
      <div id="panel-avance-${tarea.id}" class="det-panel activo"></div>
      <div id="panel-evidencias-${tarea.id}" class="det-panel">
        <div id="evidencias-${tarea.id}"></div>
        <div id="ev-galeria-${tarea.id}" class="ev-galeria"></div>
      </div>
      <div id="panel-resultado-${tarea.id}" class="det-panel"></div>
    </div>`;

  await Promise.all([
    renderPanelAvance(supabase, tarea, perfil),
    renderZonaEvidencias(supabase, tarea.id, companyId, perfil?.id, perfil?.role !== 'collaborator'),
    renderPanelResultado(supabase, tarea),
  ]);
}

// ── Panel de avance ───────────────────────────────────────────
async function renderPanelAvance(supabase, tarea, perfil) {
  const cont = document.getElementById(`panel-avance-${tarea.id}`);
  if (!cont) return;

  const esColab = perfil?.role === 'collaborator';

  const { data: updates, error } = await supabase
    .from('activity_updates')
    .select('id, progress_pct, note, created_at, authorized_by, user_id')
    .eq('activity_id', tarea.id)
    .order('created_at', { ascending: false });

  if (error) { console.error('[detalleTarea] avance:', error.message); }

  let sliderHtml = '';
  if (esColab) {
    sliderHtml = `
      <div class="avance-section" style="border:none; padding-bottom:.5rem;">
        <div class="avance-section-label">Mi avance</div>
        <div class="avance-row">
          <input type="range" min="0" max="100" value="${tarea.progress_pct || 0}"
                 id="rango-${tarea.id}" class="avance-slider"
                 oninput="document.getElementById('pct-${tarea.id}').textContent=this.value+'%';
                          document.getElementById('pbar-${tarea.id}').style.width=this.value+'%'">
          <span class="avance-pct" id="pct-${tarea.id}">${tarea.progress_pct || 0}%</span>
        </div>
        <div class="pbar">
          <div class="pbar-fill" id="pbar-${tarea.id}" style="width:${tarea.progress_pct || 0}%"></div>
        </div>
        <input type="text" id="nota-${tarea.id}" placeholder="Nota sobre tu avance (opcional)" style="margin-top:8px;">
        <button onclick="window.actualizarProgreso(${tarea.id})" class="btn-guardar" style="margin-top:8px;">
          💾 Guardar avance
        </button>
      </div>
      <hr style="border:none; border-top:0.5px solid var(--border); margin:.5rem 0;">`;
  }

  const historialHtml = updates?.length
    ? updates.map(u => {
        const fecha = new Date(u.created_at).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        const badgeAuth = u.authorized_by
          ? '<span class="badge-autorizado">✏️ Editado con autorización</span>'
          : '';

        let acciones = '';
        if (esColab) {
          acciones = `
            <div class="hist-lock">
              🔒 Inmutable
              <button class="btn-solicitar-auth"
                      onclick="window.solicitarAutorizacion(${u.id}, ${tarea.id})">
                Editar con autorización
              </button>
              ${badgeAuth}
            </div>`;
        } else {
          acciones = badgeAuth ? `<div style="margin-top:4px;">${badgeAuth}</div>` : '';
        }

        return `
          <div class="hist-item">
            <div class="hist-pct">${u.progress_pct}%</div>
            <div class="hist-info">
              <div class="hist-nota">${u.note ? s(u.note) : '<em style="color:var(--text-muted);">sin nota</em>'}</div>
              <div class="hist-meta">${fecha}</div>
              <div class="hist-pbar"><div class="hist-pbar-fill" style="width:${u.progress_pct}%"></div></div>
              ${acciones}
            </div>
          </div>`;
      }).join('')
    : '<p style="color:var(--text-muted);font-size:13px;">Sin avances reportados todavía.</p>';

  cont.innerHTML = sliderHtml + `<div class="hist-list">${historialHtml}</div>`;
}

// ── Panel de resultado ────────────────────────────────────────
async function renderPanelResultado(supabase, tarea) {
  const cont = document.getElementById(`panel-resultado-${tarea.id}`);
  if (!cont) return;

  const [{ data: updates }, { count: evCount }] = await Promise.all([
    supabase.from('activity_updates').select('progress_pct, created_at').eq('activity_id', tarea.id).order('created_at'),
    supabase.from('evidencias').select('id', { count: 'exact', head: true }).eq('activity_id', tarea.id),
  ]);

  const total  = updates?.length ?? 0;
  const primer = total ? new Date(updates[0].created_at).toLocaleDateString('es-MX') : '—';
  const ultimo = total ? new Date(updates[total - 1].created_at).toLocaleDateString('es-MX') : '—';

  cont.innerHTML = `
    <div class="resultado-stats">
      <div class="resultado-stat">
        <div class="resultado-stat-num">${total}</div>
        <div class="resultado-stat-label">Avances reportados</div>
      </div>
      <div class="resultado-stat">
        <div class="resultado-stat-num">${tarea.progress_pct || 0}%</div>
        <div class="resultado-stat-label">Avance actual</div>
      </div>
      <div class="resultado-stat">
        <div class="resultado-stat-num">${evCount ?? 0}</div>
        <div class="resultado-stat-label">Evidencias</div>
      </div>
      <div class="resultado-stat">
        <div class="resultado-stat-num" style="font-size:13px;">${primer}</div>
        <div class="resultado-stat-label">Primer avance</div>
      </div>
    </div>
    ${tarea.status === 'completada'
      ? '<div class="resultado-completada">✅ Tarea completada</div>'
      : `<div class="det-pbar" style="height:8px;">
           <div class="det-pbar-fill" style="width:${tarea.progress_pct || 0}%"></div>
         </div>
         <p style="font-size:11px;color:var(--text-muted);margin-top:4px;text-align:right;">
           ${tarea.progress_pct || 0}% completado · último avance: ${ultimo}
         </p>`}`;
}

// ── Modal de autorización ─────────────────────────────────────
export async function solicitarAutorizacion(supabase, updateId, tareaId, onGuardado) {
  let modalEl = document.getElementById('modal-autorizacion');
  if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.id = 'modal-autorizacion';
    document.body.appendChild(modalEl);
  }

  const mostrarModal = (contenido) => { modalEl.innerHTML = contenido; };
  const cerrarModal  = () => { modalEl.innerHTML = ''; };

  mostrarModal(`
    <div class="modal-overlay-bg" onclick="if(event.target===this) document.getElementById('modal-autorizacion').innerHTML=''">
      <div class="modal-box">
        <div class="modal-title">🔐 Autorización requerida</div>
        <div class="modal-desc">
          Para editar este avance necesitas la autorización del director.
          Ingresa su correo y contraseña.
        </div>
        <div class="modal-warn">
          ⚠️ Esta acción quedará registrada en el historial de auditoría.
        </div>
        <div class="modal-field">
          <label class="modal-label">Correo del director</label>
          <input type="email" id="auth-email" class="modal-input" placeholder="director@empresa.com">
        </div>
        <div class="modal-field">
          <label class="modal-label">Contraseña</label>
          <input type="password" id="auth-password" class="modal-input" placeholder="••••••••">
        </div>
        <div id="auth-error" style="font-size:12px;color:#dc2626;display:none;"></div>
        <div class="modal-actions">
          <button class="btn-modal-cancelar" onclick="document.getElementById('modal-autorizacion').innerHTML=''">
            Cancelar
          </button>
          <button class="btn-modal-autorizar" id="btn-autorizar-ok" onclick="window._validarAutorizacion()">
            ✓ Autorizar edición
          </button>
        </div>
      </div>
    </div>`);

  window._validarAutorizacion = async function() {
    const email    = document.getElementById('auth-email')?.value?.trim();
    const password = document.getElementById('auth-password')?.value;
    const btnOk    = document.getElementById('btn-autorizar-ok');
    const errEl    = document.getElementById('auth-error');

    if (!email || !password) {
      if (errEl) { errEl.textContent = 'Ingresa correo y contraseña.'; errEl.style.display = 'block'; }
      return;
    }

    if (btnOk) btnOk.disabled = true;

    console.log('[Auth] Intentando validar director:', email);

    const tmpClient = window.supabase.createClient(supabase.supabaseUrl, supabase.supabaseKey);
    const { data: authData, error: authError } = await tmpClient.auth.signInWithPassword({ email, password });

    console.log('[Auth] Resultado:', authError ? 'ERROR: ' + authError.message : 'OK');

    if (authError || !authData?.user) {
      if (errEl) { errEl.textContent = 'Credenciales incorrectas.'; errEl.style.display = 'block'; }
      if (btnOk) btnOk.disabled = false;
      return;
    }

    const { data: perfilDirector } = await tmpClient
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', authData.user.id)
      .single();

    console.log('[Auth] Role del director:', perfilDirector?.role);

    if (!['director', 'company_admin', 'super_admin'].includes(perfilDirector?.role)) {
      if (errEl) { errEl.textContent = 'El usuario no tiene permisos de director.'; errEl.style.display = 'block'; }
      if (btnOk) btnOk.disabled = false;
      return;
    }

    const directorId = perfilDirector.id;

    // Obtener nota actual
    const { data: upActual } = await supabase
      .from('activity_updates')
      .select('note')
      .eq('id', updateId)
      .single();

    const notaActual = upActual?.note ?? '';

    // Mostrar panel de edición
    mostrarModal(`
      <div class="modal-overlay-bg">
        <div class="modal-box">
          <div class="modal-title">✏️ Editar avance</div>
          <div class="modal-desc">
            Autorizado por <strong>${s(perfilDirector.full_name || email)}</strong>.
            Modifica la nota del avance.
          </div>
          <div class="modal-warn">
            ⚠️ Esta acción quedará registrada en el historial de auditoría.
          </div>
          <div class="modal-field">
            <label class="modal-label">Nota</label>
            <input type="text" id="auth-nota-nueva" class="modal-input" value="${s(notaActual)}" placeholder="Nueva nota">
          </div>
          <div id="auth-error-2" style="font-size:12px;color:#dc2626;display:none;"></div>
          <div class="modal-actions">
            <button class="btn-modal-cancelar" onclick="document.getElementById('modal-autorizacion').innerHTML=''">
              Cancelar
            </button>
            <button class="btn-modal-autorizar" onclick="window._guardarEdicionAutorizada('${directorId}')">
              💾 Guardar
            </button>
          </div>
        </div>
      </div>`);
  };

  window._guardarEdicionAutorizada = async function(directorId) {
    const nuevaNota = document.getElementById('auth-nota-nueva')?.value ?? '';
    const errEl2    = document.getElementById('auth-error-2');

    const { error } = await supabase
      .from('activity_updates')
      .update({
        note:           nuevaNota,
        authorized_by:  directorId,
        authorized_at:  new Date().toISOString(),
      })
      .eq('id', updateId);

    if (error) {
      if (errEl2) { errEl2.textContent = 'Error: ' + error.message; errEl2.style.display = 'block'; }
      return;
    }

    showToast('Avance editado con autorización');
    cerrarModal();
    if (onGuardado) await onGuardado();
  };
}
