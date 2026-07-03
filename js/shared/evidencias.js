import { sHtml as s, showToast } from '../ui.js';

// ── Zona de subida + galería ──────────────────────────────────
export async function renderZonaEvidencias(supabase, activityId, companyId, userId, soloLectura = false) {
  const cont = document.getElementById('evidencias-' + activityId);
  if (!cont) return;

  if (!soloLectura) {
    cont.innerHTML = `
      <div class="ev-upload-area" onclick="document.getElementById('ev-input-${activityId}').click()">
        <div class="ev-upload-icon">📎</div>
        <div class="ev-upload-text">Arrastra o selecciona imágenes y videos</div>
        <div class="ev-upload-sub">JPG, PNG, MP4, MOV · máx 50MB</div>
      </div>
      <input type="file" id="ev-input-${activityId}" accept="image/*,video/*"
             multiple style="display:none"
             onchange="window.subirEvidencias(${activityId}, this.files)">`;
  } else {
    cont.innerHTML = '';
  }

  await cargarGaleriaEvidencias(supabase, activityId);
}

// ── Galería ───────────────────────────────────────────────────
export async function cargarGaleriaEvidencias(supabase, activityId) {
  const galeria = document.getElementById('ev-galeria-' + activityId);
  if (!galeria) return;

  const { data, error } = await supabase
    .from('evidencias')
    .select('*')
    .eq('activity_id', activityId)
    .order('created_at', { ascending: false });

  if (error) { console.error('[evidencias] galería:', error.message); return; }

  if (!data?.length) {
    galeria.innerHTML = '<p class="ev-empty">Sin evidencias todavía.</p>';
    return;
  }

  galeria.innerHTML = data.map(ev =>
    ev.file_type === 'image'
      ? `<div class="ev-thumb">
           <img src="${s(ev.file_url)}" alt="${s(ev.file_name)}"
                onclick="window.open('${s(ev.file_url)}','_blank')">
           <div class="ev-thumb-label">${s(ev.file_name)}</div>
         </div>`
      : `<div class="ev-thumb ev-video">
           <div class="ev-thumb-play">🎬</div>
           <div class="ev-thumb-label"
                onclick="window.open('${s(ev.file_url)}','_blank')">${s(ev.file_name)}</div>
         </div>`
  ).join('');
}

// ── Subir archivos ────────────────────────────────────────────
export async function subirEvidencias(supabase, activityId, companyId, userId, files) {
  if (!files?.length) return;

  let subidos = 0;

  for (const file of Array.from(files)) {
    const esImagen = file.type.startsWith('image/');
    const esVideo  = file.type.startsWith('video/');

    if (!esImagen && !esVideo) {
      showToast(`Tipo no permitido: ${file.name}`, 'error');
      continue;
    }
    if (file.size > 50 * 1024 * 1024) {
      showToast(`${file.name} supera los 50MB`, 'error');
      continue;
    }

    const path = `${companyId}/${activityId}/${Date.now()}-${file.name}`;

    const { error: errUp } = await supabase.storage.from('evidencias').upload(path, file);
    if (errUp) { showToast('Error al subir ' + file.name + ': ' + errUp.message, 'error'); continue; }

    const { data: urlData } = supabase.storage.from('evidencias').getPublicUrl(path);
    const file_url = urlData.publicUrl;

    const { error: errDb } = await supabase.from('evidencias').insert({
      activity_id: activityId,
      company_id:  companyId,
      uploaded_by: userId,
      file_url,
      file_type:   esImagen ? 'image' : 'video',
      file_name:   file.name,
    });
    if (errDb) { showToast('Error al registrar ' + file.name + ': ' + errDb.message, 'error'); continue; }

    subidos++;
  }

  if (subidos > 0) {
    showToast(`${subidos} archivo${subidos > 1 ? 's' : ''} subido${subidos > 1 ? 's' : ''}`);
    await cargarGaleriaEvidencias(supabase, activityId);
  }
}

// ── Tareas completadas con evidencias (admin / directivo) ─────
export async function renderTareasCompletadas(supabase, companyId, idContenedor) {
  const contenedor = document.getElementById(idContenedor);
  if (!contenedor) return;

  const { data: tareas, error } = await supabase
    .from('actividades')
    .select('id, titulo, canal, fecha, assigned_to')
    .eq('company_id', companyId)
    .eq('status', 'completada')
    .order('fecha', { ascending: false });

  if (error || !tareas?.length) {
    contenedor.innerHTML = '<p class="ev-empty">Sin tareas completadas todavía.</p>';
    return;
  }

  const ids = [...new Set(tareas.map(t => t.assigned_to).filter(Boolean))];
  const nombresPorId = {};
  if (ids.length) {
    const { data: perfiles } = await supabase
      .from('profiles').select('id, full_name').in('id', ids);
    (perfiles ?? []).forEach(p => { nombresPorId[p.id] = p.full_name ?? p.id; });
  }

  const { data: todasEvidencias } = await supabase
    .from('evidencias')
    .select('activity_id, file_url, file_type, file_name')
    .in('activity_id', tareas.map(t => t.id));

  const evidenciasPorActividad = {};
  (todasEvidencias ?? []).forEach(ev => {
    if (!evidenciasPorActividad[ev.activity_id])
      evidenciasPorActividad[ev.activity_id] = [];
    evidenciasPorActividad[ev.activity_id].push(ev);
  });

  contenedor.innerHTML = '<div class="completadas-section">' +
    tareas.map(t => {
      const nombre = nombresPorId[t.assigned_to] ?? '—';
      const evs    = evidenciasPorActividad[t.id] ?? [];
      const evHtml = evs.map(ev =>
        ev.file_type === 'image'
          ? `<div class="comp-ev-thumb">
               <img src="${s(ev.file_url)}" alt="${s(ev.file_name)}"
                    onclick="window.open('${s(ev.file_url)}','_blank')">
             </div>`
          : `<div class="comp-ev-thumb video"
                  onclick="window.open('${s(ev.file_url)}','_blank')">🎬</div>`
      ).join('');

      return `
        <div class="comp-card">
          <div class="comp-check">✅</div>
          <div class="comp-info">
            <div class="comp-titulo">${s(t.titulo)}</div>
            <div class="comp-meta">${s(nombre)} · ${s(t.canal)} · ${t.fecha}</div>
            ${evs.length
              ? `<div class="comp-ev-row">${evHtml}</div>`
              : '<p class="ev-empty" style="margin-top:6px;">Sin evidencias</p>'}
          </div>
        </div>`;
    }).join('') + '</div>';
}
