    import { supabaseClient, requireSession, logout, resolveUserId } from './supabaseClient.js';
    import { showToast, showPrompt, showConfirm, configurarNotificaciones, configurarTabs, sHtml, claseBadgeEstado, claseNivelAvance } from './ui.js';
    import { cargarEstrategias } from './shared/estrategias.js';
    import { renderFormSeguidores } from './shared/seguidores.js';
    import { renderZonaEvidencias, subirEvidencias } from './shared/evidencias.js';
    import { renderDetalleTarea, solicitarAutorizacion } from './shared/detalleTarea.js';
    import { renderAvanceSeguidoresColaborador } from './shared/metasSeguidores.js';

    window.cerrarSesion = logout;
    configurarTabs();
    let miPerfil;
    let tareasUserId;
    let calendar;

    const COLOR_POR_ESTADO = {
      pendiente: '#95a5a6',
      en_progreso: '#f39c12',
      completada: '#27ae60'
    };

    function tarjetaTarea(t) {
      return `
        <div id="tarea-${t.id}">
          <div id="detalle-tarea-${t.id}">
            <div class="skeleton skeleton-line mid"></div>
            <div class="skeleton skeleton-line short" style="margin-top:8px;"></div>
          </div>

          ${t.status !== 'completada' ? `
          <div class="completar-section">
            <div class="completar-hint">
              <i class="fa-solid fa-circle-info"></i>
              Cuando termines todos los pasos, marca la tarea como completada. Esta acción no se puede deshacer.
            </div>
            <button
              onclick="window.completarTarea(${t.id})"
              class="btn-completar">
              <i class="fa-solid fa-circle-check"></i>
              Marcar como completada
            </button>
          </div>` : `
          <div class="completada-banner">
            <i class="fa-solid fa-circle-check"></i>
            Tarea completada — ya no puedes editarla
          </div>`}

          <div class="seg-tarea-section">
            <div id="avance-seg-${t.id}">
              <div class="skeleton skeleton-line mid"></div>
              <div class="skeleton skeleton-line short" style="margin-top:6px;"></div>
            </div>

            <button
              onclick="window.abrirFormSeguidores(${t.id})"
              class="btn-seg-tarea"
              style="margin-top:10px;">
              <i class="fa-solid fa-plus"></i>
              Reportar nuevo conteo
            </button>
            <div id="seg-form-${t.id}" style="margin-top:10px;"></div>
          </div>
        </div>`;
    }

    window.abrirFormSeguidores = async function(activityId) {
      const contenedor = document.getElementById('seg-form-' + activityId);
      if (!contenedor) return;
      if (contenedor.dataset.abierto === 'true') {
        contenedor.innerHTML = '';
        contenedor.dataset.abierto = 'false';
        return;
      }
      contenedor.dataset.abierto = 'true';
      await renderFormSeguidores(
        supabaseClient,
        miPerfil.company_id,
        activityId,
        async () => {
          contenedor.innerHTML = '';
          contenedor.dataset.abierto = 'false';
        }
      );
    };

    window.completarTarea = async function(activityId) {
      const confirmado = await showConfirm(
        '¿Marcar esta tarea como completada? Se guardará con progreso al 100% y no podrás editarla después.'
      );
      if (!confirmado) return;

      const { error } = await supabaseClient
        .from('actividades')
        .update({
          status: 'completada',
          progress_pct: 100
        })
        .eq('id', activityId)
        .eq('assigned_to', miPerfil.id); // seguridad extra

      if (error) {
        showToast('Error al completar la tarea: ' + error.message, 'error');
        return;
      }

      // Registrar el avance final como 100%
      await supabaseClient.from('activity_updates').insert({
        activity_id: activityId,
        user_id: miPerfil.id,
        progress_pct: 100,
        note: 'Tarea marcada como completada'
      });

      showToast('✅ Tarea completada');

      // Recargar: la tarea desaparecerá de la lista
      await cargarTareas();
    };

    async function cargarTareas() {
      let { data, error } = await supabaseClient.from('actividades').select('*').eq('assigned_to', tareasUserId).neq('status', 'completada').order('fecha');
      if (error) { showToast('Error al cargar tus tareas: ' + error.message, 'error'); return; }

      document.getElementById('listaTareas').innerHTML = data.length
        ? data.map(tarjetaTarea).join('')
        : '<div class="empty-state"><i class="fa-solid fa-clipboard-check"></i><p>No tienes tareas asignadas todavía.</p></div>';

      window.subirEvidencias = (activityId, files) =>
        subirEvidencias(supabaseClient, activityId, miPerfil.company_id, miPerfil.id, files);

      window.solicitarAutorizacion = (updateId, tareaId) =>
        solicitarAutorizacion(supabaseClient, updateId, tareaId, async () => { await cargarTareas(); });

      for (const t of data) {
        await renderDetalleTarea(supabaseClient, t, miPerfil, `detalle-tarea-${t.id}`);
      }

      for (const t of data) {
        await renderAvanceSeguidoresColaborador(
          supabaseClient,
          miPerfil.company_id,
          t.id,
          `avance-seg-${t.id}`
        );
      }

      calendar.removeAllEvents();
      data.forEach(t => {
        calendar.addEvent({
          id: String(t.id),
          title: t.titulo,
          start: t.fecha,
          color: COLOR_POR_ESTADO[t.status] || '#3498db'
        });
      });
    }

    window.actualizarProgreso = async function(activityId) {
      let progress_pct = parseInt(document.getElementById(`rango-${activityId}`).value, 10);
      let note = document.getElementById(`nota-${activityId}`).value;

      let { error } = await supabaseClient.from('activity_updates').insert({
        activity_id: activityId,
        user_id: miPerfil.id,
        progress_pct,
        note
      });

      if (error) { showToast('Error al guardar avance: ' + error.message, 'error'); return; }

      showToast('Avance guardado');
      await cargarTareas();
    };

    window.toggleObservaciones = async function(activityId) {
      let contenedor = document.getElementById(`observaciones-${activityId}`);
      let abierto = contenedor.style.display !== 'none';

      if (abierto) { contenedor.style.display = 'none'; return; }

      contenedor.style.display = 'block';
      await cargarObservaciones(activityId);
    };

    async function cargarObservaciones(activityId) {
      let contenedor = document.getElementById(`observaciones-${activityId}`);
      contenedor.innerHTML = '<div class="skeleton skeleton-line mid"></div><div class="skeleton skeleton-line short"></div>';

      let { data, error } = await supabaseClient
        .from('activity_updates')
        .select('*')
        .eq('activity_id', activityId)
        .order('created_at', { ascending: false });

      if (error) { showToast('Error al cargar observaciones: ' + error.message, 'error'); return; }

      contenedor.innerHTML = (data && data.length)
        ? data.map(o => `
            <div style="border-top:1px solid var(--border); padding:8px 0; font-size:0.85em;">
              <strong>${o.progress_pct}%</strong> — ${o.note ? sHtml(o.note) : '<em>(sin nota)</em>'}
              <span style="color:var(--slate-300);"> · ${new Date(o.created_at).toLocaleDateString()}${o.updated_at ? ' (editado)' : ''}</span>
              <button onclick="window.editarObservacion(${o.id}, ${activityId})" class="btn-auto" style="background:none; color:var(--indigo); padding:0 4px;">
                <i class="fa-solid fa-pen"></i>
              </button>
            </div>`).join('')
        : '<div class="empty-state" style="padding:16px;"><p>Sin observaciones todavía.</p></div>';
    }

    window.editarObservacion = async function(updateId, activityId) {
      let { data: actual } = await supabaseClient.from('activity_updates').select('note').eq('id', updateId).single();
      let nuevoTexto = await showPrompt('Editar observación:', actual?.note || '');
      if (nuevoTexto === null) return;

      let { error } = await supabaseClient.from('activity_updates').update({ note: nuevoTexto }).eq('id', updateId);
      if (error) { showToast('Error al editar: ' + error.message, 'error'); return; }

      showToast('Observación actualizada');
      await cargarObservaciones(activityId);
    };

    (async function() {
      let resultado = await requireSession(['collaborator', 'super_admin']);
      if (!resultado) return;
      miPerfil = resultado.profile;
      tareasUserId = resolveUserId(miPerfil);

      if (miPerfil.role === 'super_admin') {
        document.getElementById('enlaceVolverAdmin').style.display = 'inline';
      }

      if (!tareasUserId) {
        document.getElementById('mensajeSinUsuario').style.display = 'block';
        return;
      }
      document.getElementById('seccionCalendario').style.display = 'block';

      calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
        initialView: 'dayGridMonth',
        locale: 'es',
        events: [],
        editable: true,
        eventClick: function(info) {
          window.cambiarTab('tareas');
          document.getElementById(`tarea-${info.event.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        },
        eventDrop: async function(info) {
          let { error } = await supabaseClient.from('actividades').update({ fecha: info.event.startStr }).eq('id', info.event.id);
          if (error) {
            showToast('Error al mover la tarea: ' + error.message, 'error');
            info.revert();
            return;
          }
          showToast('Tarea movida al ' + info.event.startStr);
          await cargarTareas();
        }
      });
      calendar.render();

      let cambiarTabBase = window.cambiarTab;
      window.cambiarTab = function(nombre) {
        cambiarTabBase(nombre);
        if (nombre === 'calendario') calendar.updateSize();
      };

      await Promise.all([
        cargarTareas(),
        cargarEstrategias(supabaseClient, miPerfil.company_id, 'listaEstrategias'),
        configurarNotificaciones(supabaseClient, miPerfil.id)
      ]);
    })();
