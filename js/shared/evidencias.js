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
