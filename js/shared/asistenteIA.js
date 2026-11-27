// Tarjeta "Asistente de IA" del Social Hub (MPS-002-004 E4–E6, ADR-022).
//
//   1. Información del negocio (knowledge_entries, v31): lo que la IA
//      puede usar para contestar. Solo lo publicado y vigente se usa.
//   2. Probar mi asistente (Edge Function asistente-probar): qué
//      contestaría y si en automático se enviaría sola o se transferiría.
//   3. Modo de respuesta y pausa (ai_set_mode / ai_set_auto_pause): las
//      reglas y los requisitos para activar el automático viven en la
//      base, no aquí; esta pantalla solo muestra lo que la base responde.
import { sHtml as s, showToast, showConfirm } from '../ui.js';

const TIPOS = {
  negocio: 'Información general',
  horario: 'Horario',
  producto: 'Producto / menú',
  servicio: 'Servicio',
  promocion: 'Promoción',
  faq: 'Pregunta frecuente (respuesta guardada)',
  politica: 'Política (envíos, pagos, cambios)',
};

const MODOS = {
  manual: { titulo: 'Manual', texto: 'La IA no interviene. Tu equipo contesta todo.' },
  asistido: { titulo: 'Asistido', texto: 'La IA escribe un borrador y una persona decide si lo envía.' },
  automatico: { titulo: 'Automático', texto: 'La IA contesta sola cuando la respuesta está en tu información publicada y está segura. Si no, envía tu mensaje de transferencia y deja la conversación a tu equipo.' },
};

const a = v => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const estado = {
  supabase: null, companyId: null, perfil: null, idCont: null, entradas: [], asistente: null, editando: null,
  adjuntos: [],      // knowledge_attachments de la empresa (v32)
  pendientes: [],    // por guardar: { kind:'enlace', label, url } o { kind, file }
};

const MAX_ARCHIVO = 25 * 1024 * 1024; // límite de Meta y del bucket
const ACEPTA = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm,audio/mpeg,audio/mp4,audio/ogg,audio/wav,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv';
const ICONO = { enlace: '🔗', imagen: '🖼️', video: '🎬', audio: '🎵', archivo: '📄' };

function tipoDeArchivo(file) {
  const m = file.type || '';
  return m.startsWith('image/') ? 'imagen' : m.startsWith('video/') ? 'video' : m.startsWith('audio/') ? 'audio' : 'archivo';
}
const tamano = b => b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

export async function renderAsistenteIA(supabase, companyId, perfil, idCont) {
  Object.assign(estado, { supabase, companyId, perfil, idCont });
  const cont = document.getElementById(idCont);
  if (!cont) return;
  if (!cont.dataset.enlazado) {
    cont.addEventListener('click', manejarClic);
    cont.addEventListener('change', ev => { if (ev.target.id === 'asArchivos') agregarArchivos(ev.target); });
    cont.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' && ev.target.id === 'asPregunta') { ev.preventDefault(); probar(); }
    });
    cont.dataset.enlazado = '1';
  }
  await recargar();
}

async function recargar() {
  const cont = document.getElementById(estado.idCont);
  const [ent, asis, adj] = await Promise.all([
    estado.supabase.from('knowledge_entries')
      .select('id, kind, title, body, status, valid_until, updated_at')
      .eq('company_id', estado.companyId).is('deleted_at', null)
      .order('kind').order('updated_at', { ascending: false }),
    estado.supabase.from('ai_assistants')
      .select('mode, min_confidence, max_auto_per_conversation_hour, handoff_message, auto_paused_at, knowledge_changed_at, last_playground_at')
      .eq('company_id', estado.companyId).maybeSingle(),
    estado.supabase.from('knowledge_attachments')
      .select('id, entry_id, kind, label, url, storage_path, file_name, size_bytes')
      .eq('company_id', estado.companyId).order('id'),
  ]);
  if (ent.error || asis.error) {
    cont.innerHTML = `<p class="mi-rango">No se pudo cargar el asistente: ${s((ent.error || asis.error).message)}</p>`;
    return;
  }
  estado.entradas = ent.data ?? [];
  estado.asistente = asis.data;
  estado.adjuntos = adj.error ? [] : (adj.data ?? []);
  cont.innerHTML = `
    ${seccionModo()}
    <div class="mi-bloque">
      <h3>1. Información del negocio <span class="mi-sub">· la IA solo contesta con lo que esté publicado aquí</span></h3>
      ${formularioEntrada()}
      ${listaEntradas()}
    </div>
    ${['company_admin', 'super_admin'].includes(estado.perfil?.role) ? `
    <div class="mi-bloque">
      <h3>2. Probar mi asistente <span class="mi-sub">· escribe como si fueras un cliente; no se envía nada</span></h3>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <input type="text" id="asPregunta" maxlength="1000" placeholder="Ej. ¿A qué hora abren el sábado?" style="flex:1; min-width:220px; margin:0;">
        <button class="btn-auto" data-accion="probar" style="width:auto; margin:0;">Probar</button>
      </div>
      <div id="asResultado" aria-live="polite" style="margin-top:10px;"></div>
    </div>` : `
    <p class="mi-rango">Probar el asistente lo hace el administrador de la empresa (asistente-probar solo lo permite a ese rol).</p>`}`;
}

// ── Modo ───────────────────────────────────────────────────────
function seccionModo() {
  const as = estado.asistente;
  // Directores y colaboradores editan la información del negocio (D4,
  // 2026-11-25), pero el modo solo lo cambia el administrador
  // (ai_assistants_update / ai_set_mode). El colaborador ni siquiera
  // puede leer ai_assistants: no se le muestra esta sección.
  const rol = estado.perfil?.role;
  const esAdmin = rol === 'company_admin' || rol === 'super_admin';
  if (!esAdmin) {
    if (!as) return '';
    return `<p class="mi-rango" style="margin:0 0 8px;">Modo de respuesta actual: <strong>${s(MODOS[as.mode]?.titulo ?? as.mode)}</strong>${
      as.mode === 'automatico' && as.auto_paused_at ? ' (en pausa)' : ''}. Solo el administrador de la empresa lo cambia.</p>`;
  }
  if (!as) return '<p class="mi-aviso">El asistente aún no está configurado para esta empresa.</p>';
  const pausado = !!as.auto_paused_at;
  const opciones = Object.entries(MODOS).map(([clave, m]) => `
    <label style="display:flex; gap:8px; align-items:flex-start; padding:8px; border:0.5px solid var(--border); border-radius:8px; cursor:pointer; ${as.mode === clave ? 'background:var(--indigo-light);' : ''}">
      <input type="radio" name="asModo" value="${clave}" ${as.mode === clave ? 'checked' : ''} style="width:auto; margin-top:3px;">
      <span><strong>${s(m.titulo)}</strong><br><span style="font-size:12px; color:var(--text-secondary);">${s(m.texto)}</span></span>
    </label>`).join('');
  return `
    <div class="mi-bloque" style="margin-top:0;">
      <h3>Modo de respuesta ${as.mode === 'automatico'
        ? (pausado ? '<span class="badge badge-amber">Automático en pausa</span>' : '<span class="badge badge-green">Automático activo</span>')
        : ''}</h3>
      <div style="display:grid; gap:6px;">${opciones}</div>
      ${estado.avisoModo ? `<p class="mi-aviso" role="alert" style="margin:8px 0 0;">${s(estado.avisoModo)}</p>` : ''}
      ${as.mode !== 'automatico' ? requisitosAutomatico(as) : ''}
      <div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:10px; align-items:flex-end;">
        <label style="flex:1; min-width:240px; font-size:12px;">Mensaje de transferencia a una persona (se envía cuando la IA no puede contestar)
          <textarea id="asHandoff" maxlength="500" rows="2" placeholder="Ej. Gracias por escribirnos. En un momento una persona de nuestro equipo te atiende." style="margin:4px 0 0;">${s(as.handoff_message ?? '')}</textarea>
        </label>
        <label style="font-size:12px;">Seguridad mínima para contestar sola
          <select id="asConfianza" style="margin:4px 0 0;">
            ${[0.7, 0.8, 0.9].map(v => `<option value="${v}" ${Number(as.min_confidence) === v ? 'selected' : ''}>${v * 100}%${v === 0.8 ? ' (recomendado)' : ''}</option>`).join('')}
          </select>
        </label>
      </div>
      <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;">
        <button class="btn-auto" data-accion="guardar-modo" style="width:auto; margin:0;">Guardar modo</button>
        ${as.mode === 'automatico' ? `<button class="btn-auto" data-accion="${pausado ? 'reanudar' : 'pausar'}" style="width:auto; margin:0; background:${pausado ? '#28A745' : '#e74c3c'};">
          ${pausado ? 'Reanudar respuestas automáticas' : '⏸ Pausar respuestas automáticas'}</button>` : ''}
      </div>
      <p class="mi-rango" style="margin-top:8px;">La IA nunca confirma reservaciones, pedidos, pagos ni excepciones, ni atiende quejas: esos casos siempre pasan a tu equipo. Para volver a activar la IA en una conversación transferida, márcala como resuelta.</p>
    </div>`;
}

// Lista visible de lo que la base exige para activar el automático
// (ai_set_mode, v31). La conexión con Meta se valida solo en la base.
function requisitosAutomatico(as) {
  const publicado = k => estado.entradas.some(x => x.kind === k && x.status === 'publicado');
  const probado = as.last_playground_at && (!as.knowledge_changed_at || as.last_playground_at >= as.knowledge_changed_at);
  const items = [
    [publicado('negocio'), 'Publicar una entrada de tipo "Información general"'],
    [publicado('horario'), 'Publicar una entrada de tipo "Horario"'],
    [!!(as.handoff_message ?? '').trim(), 'Escribir y guardar el mensaje de transferencia a una persona'],
    [!!probado, 'Hacer una prueba en "Probar mi asistente" después del último cambio de información'],
    [estado.perfil?.role === 'company_admin', estado.perfil?.role === 'super_admin'
      ? 'Activarlo con la cuenta del administrador de la empresa (tu cuenta de super_admin no puede encenderlo)'
      : 'Activarlo con la cuenta del administrador de la empresa'],
  ];
  return `<div style="margin-top:8px; font-size:12px;">
    <strong>Para activar el automático:</strong>
    <ul style="list-style:none; padding:0; margin:4px 0 0;">
      ${items.map(([ok, texto]) => `<li>${ok ? '✅' : '⬜'} ${s(texto)}</li>`).join('')}
    </ul></div>`;
}

async function guardarModo() {
  estado.avisoModo = null;
  const modo = document.querySelector('input[name="asModo"]:checked')?.value;
  const handoff = document.getElementById('asHandoff')?.value.trim() ?? '';
  const confianza = Number(document.getElementById('asConfianza')?.value ?? 0.8);
  const as = estado.asistente;

  // Primero los ajustes (el automático exige el mensaje de transferencia).
  if (handoff !== (as.handoff_message ?? '') || confianza !== Number(as.min_confidence)) {
    const { error } = await estado.supabase.from('ai_assistants')
      .update({ handoff_message: handoff || null, min_confidence: confianza })
      .eq('company_id', estado.companyId);
    if (error) { showToast('No se guardaron los ajustes: ' + error.message, 'error'); return; }
  }

  if (modo && modo !== as.mode) {
    if (modo === 'automatico' && !(await showConfirm(
      '<strong>¿Activar respuestas automáticas?</strong><br><br>La IA enviará respuestas a tus clientes sin que nadie las revise, ' +
      'solo cuando la respuesta esté en tu información publicada y tenga la seguridad mínima. Puedes pausarlo en cualquier momento.'))) {
      await recargar();
      return;
    }
    const { data: motivo, error } = await estado.supabase.rpc('ai_set_mode', { p_company_id: estado.companyId, p_mode: modo });
    if (error) { showToast('No se cambió el modo: ' + error.message, 'error'); return; }
    if (motivo) { estado.avisoModo = motivo; showToast(motivo, 'error'); await recargar(); return; }
    showToast(`Modo ${MODOS[modo].titulo} activado`);
  } else {
    showToast('Ajustes guardados');
  }
  await recargar();
}

async function cambiarPausa(pausar) {
  if (!pausar && !(await showConfirm('¿Reanudar las respuestas automáticas?'))) return;
  const { data: motivo, error } = await estado.supabase.rpc('ai_set_auto_pause', { p_company_id: estado.companyId, p_pausar: pausar });
  if (error || motivo) { showToast(motivo || error.message, 'error'); return; }
  showToast(pausar ? 'Respuestas automáticas en pausa' : 'Respuestas automáticas reanudadas');
  await recargar();
}

// ── Información del negocio ────────────────────────────────────
function formularioEntrada() {
  const e = estado.editando ? estado.entradas.find(x => x.id === estado.editando) : null;
  const faltan = ['negocio', 'horario'].filter(k => !estado.entradas.some(x => x.kind === k && x.status === 'publicado'));
  return `
    ${faltan.length ? `<p class="mi-aviso" style="margin:0 0 8px;">Empieza por publicar: ${faltan.map(k => `<strong>${s(TIPOS[k])}</strong>`).join(' y ')}.</p>` : ''}
    <div style="display:grid; gap:8px; padding:10px; border:0.5px solid var(--border); border-radius:10px; background:var(--surface-2);">
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <label style="font-size:12px;">Tipo
          <select id="asTipo" style="margin:4px 0 0;">
            ${Object.entries(TIPOS).map(([k, v]) => `<option value="${k}" ${e?.kind === k ? 'selected' : ''}>${s(v)}</option>`).join('')}
          </select>
        </label>
        <label style="flex:1; min-width:220px; font-size:12px;">Título o pregunta
          <input type="text" id="asTitulo" maxlength="200" value="${a(e?.title)}" placeholder="Ej. ¿Cuál es su horario?" style="margin:4px 0 0;">
        </label>
      </div>
      <label style="font-size:12px;">Respuesta o información (escribe los datos exactos: precios, horarios, direcciones)
        <textarea id="asCuerpo" maxlength="3000" rows="3" placeholder="Ej. Lunes a sábado de 9:00 a 18:00. Domingo cerrado." style="margin:4px 0 0;">${s(e?.body ?? '')}</textarea>
      </label>
      <fieldset style="border:0.5px dashed var(--border); border-radius:8px; padding:8px; margin:0;">
        <legend style="font-size:12px; padding:0 4px;">Enlaces y archivos (opcional)</legend>
        <div id="asAdjuntosLista">${listaAdjuntosForm(e)}</div>
        <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:flex-end; margin-top:6px;">
          <input type="url" id="asUrl" placeholder="https://… (menú en línea, ubicación en Maps, catálogo)" style="flex:2; min-width:200px; margin:0;">
          <input type="text" id="asUrlTexto" maxlength="120" placeholder="Nombre del enlace (opcional)" style="flex:1; min-width:140px; margin:0;">
          <button class="btn-auto" data-accion="agregar-enlace" style="width:auto; margin:0;">🔗 Agregar enlace</button>
        </div>
        <label style="display:block; font-size:12px; margin-top:8px;">Imágenes, videos, audios o documentos (máx. 25 MB cada uno)
          <input type="file" id="asArchivos" multiple accept="${ACEPTA}" style="margin:4px 0 0;">
        </label>
        <p class="mi-tile-nota" style="margin:4px 0 0;">Los archivos se envían junto con la respuesta cada vez que se usa esta información: solos en modo automático, o al enviar la sugerencia desde la bandeja. En una <strong>Pregunta frecuente</strong> el texto se envía tal cual lo escribiste.</p>
      </fieldset>
      <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
        <label style="font-size:12px;">Válido hasta (opcional, para promociones)
          <input type="date" id="asHasta" value="${a(e?.valid_until ? e.valid_until.slice(0, 10) : '')}" style="margin:4px 0 0;">
        </label>
        <label style="display:flex; gap:6px; align-items:center; font-size:12px;">
          <input type="checkbox" id="asPublicar" ${!e || e.status === 'publicado' ? 'checked' : ''} style="width:auto; margin:0;"> Publicar (la IA lo puede usar)
        </label>
        <button class="btn-auto" data-accion="guardar-entrada" style="width:auto; margin:0;">${e ? 'Guardar cambios' : 'Agregar'}</button>
        ${e ? '<button class="btn-auto" data-accion="cancelar" style="width:auto; margin:0; background:#64748b;">Cancelar</button>' : ''}
      </div>
    </div>`;
}

function filaAdjunto(x, accion, clave) {
  const nombre = x.kind === 'enlace' ? (x.label ? `${x.label} — ${x.url}` : x.url) : (x.label || x.file_name || x.file?.name);
  const bytes = x.size_bytes || x.file?.size;
  return `<li style="display:flex; gap:6px; align-items:center; font-size:12px; margin:2px 0;">
    <span aria-hidden="true">${ICONO[x.kind] ?? '📄'}</span>
    <span style="flex:1; word-break:break-all;">${s(nombre)}${bytes ? ' · ' + s(tamano(bytes)) : ''}${accion === 'quitar-pendiente' ? ' <em>(por guardar)</em>' : ''}</span>
    <button class="btn-auto" data-accion="${accion}" data-id="${a(clave)}" aria-label="Quitar ${a(nombre)}" style="width:auto; margin:0; padding:2px 8px; background:#e74c3c;">✕</button>
  </li>`;
}

function listaAdjuntosForm(e) {
  const guardados = e ? estado.adjuntos.filter(x => x.entry_id === e.id) : [];
  if (!guardados.length && !estado.pendientes.length) return '<p class="mi-tile-nota" style="margin:0;">Sin enlaces ni archivos.</p>';
  return `<ul style="list-style:none; padding:0; margin:0;">
    ${guardados.map(x => filaAdjunto(x, 'borrar-adjunto', x.id)).join('')}
    ${estado.pendientes.map((x, i) => filaAdjunto(x, 'quitar-pendiente', i)).join('')}
  </ul>`;
}

function refrescarAdjuntosForm() {
  const cont = document.getElementById('asAdjuntosLista');
  const e = estado.editando ? estado.entradas.find(x => x.id === estado.editando) : null;
  if (cont) cont.innerHTML = listaAdjuntosForm(e);
}

function agregarEnlace() {
  const url = document.getElementById('asUrl').value.trim();
  const label = document.getElementById('asUrlTexto').value.trim();
  if (!/^https?:\/\/\S+\.\S+/i.test(url)) { showToast('Escribe un enlace completo que empiece con https://', 'error'); return; }
  estado.pendientes.push({ kind: 'enlace', label: label || null, url });
  document.getElementById('asUrl').value = '';
  document.getElementById('asUrlTexto').value = '';
  refrescarAdjuntosForm();
}

function agregarArchivos(input) {
  for (const file of input.files) {
    if (file.size > MAX_ARCHIVO) { showToast(`"${file.name}" pesa más de 25 MB.`, 'error'); continue; }
    estado.pendientes.push({ kind: tipoDeArchivo(file), file, label: null });
  }
  input.value = '';
  refrescarAdjuntosForm();
}

// Sube los pendientes de una entrada ya guardada. Devuelve cuántos fallaron.
async function guardarPendientes(entryId) {
  let fallidos = 0;
  for (const p of estado.pendientes) {
    let fila;
    if (p.kind === 'enlace') {
      fila = { entry_id: entryId, company_id: estado.companyId, kind: 'enlace', label: p.label, url: p.url };
    } else {
      const limpio = p.file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_').slice(-80);
      const ruta = `${estado.companyId}/${entryId}/${Date.now()}-${limpio}`;
      const { error: errUp } = await estado.supabase.storage.from('knowledge').upload(ruta, p.file, { contentType: p.file.type || undefined });
      if (errUp) { fallidos++; showToast(`No se subió "${p.file.name}": ${errUp.message}`, 'error'); continue; }
      fila = { entry_id: entryId, company_id: estado.companyId, kind: p.kind, storage_path: ruta,
        file_name: p.file.name.slice(0, 200), mime_type: p.file.type || null, size_bytes: p.file.size };
    }
    const { error } = await estado.supabase.from('knowledge_attachments').insert(fila);
    if (error) {
      fallidos++;
      showToast('No se guardó un adjunto: ' + error.message, 'error');
      if (fila.storage_path) await estado.supabase.storage.from('knowledge').remove([fila.storage_path]);
    }
  }
  estado.pendientes = [];
  return fallidos;
}

async function borrarAdjunto(id) {
  const x = estado.adjuntos.find(y => y.id === id);
  if (!x || !(await showConfirm(`¿Quitar "${s(x.label || x.file_name || x.url)}"?`))) return;
  const { error } = await estado.supabase.from('knowledge_attachments').delete().eq('id', id);
  if (error) { showToast('No se quitó: ' + error.message, 'error'); return; }
  if (x.storage_path) await estado.supabase.storage.from('knowledge').remove([x.storage_path]);
  estado.adjuntos = estado.adjuntos.filter(y => y.id !== id);
  refrescarAdjuntosForm();
  showToast('Adjunto quitado');
}

function listaEntradas() {
  if (!estado.entradas.length) return '<p class="mi-rango" style="margin-top:8px;">Todavía no hay información. Sin ella, la IA solo puede decir que en un momento le confirman al cliente.</p>';
  const ahora = Date.now();
  return `<div style="overflow-x:auto; margin-top:8px;"><table class="tabla">
    <thead><tr><th>Tipo</th><th>Título</th><th>Información</th><th>Estado</th><th></th></tr></thead>
    <tbody>${estado.entradas.map(e => {
      const vencida = e.valid_until && Date.parse(e.valid_until) <= ahora;
      const badge = e.status !== 'publicado' ? `<span class="badge badge-slate">${e.status === 'archivado' ? 'Archivado' : 'Borrador'}</span>`
        : vencida ? '<span class="badge badge-amber">Vencida</span>' : '<span class="badge badge-green">Publicado</span>';
      return `<tr>
        <td>${s(TIPOS[e.kind] ?? e.kind)}</td>
        <td>${s(e.title)}${(() => { const n = estado.adjuntos.filter(x => x.entry_id === e.id).length; return n ? `<div class="mi-tile-nota">📎 ${n} adjunto${n > 1 ? 's' : ''}</div>` : ''; })()}</td>
        <td style="max-width:320px; white-space:pre-wrap;">${s(e.body.length > 160 ? e.body.slice(0, 160) + '…' : e.body)}</td>
        <td>${badge}${e.valid_until ? `<div class="mi-tile-nota">hasta ${s(new Date(e.valid_until).toLocaleDateString('es-MX'))}</div>` : ''}</td>
        <td style="white-space:nowrap;">
          <button class="btn-auto" data-accion="editar" data-id="${e.id}" style="width:auto; margin:0;">Editar</button>
          <button class="btn-auto" data-accion="borrar" data-id="${e.id}" style="width:auto; margin:0; background:#e74c3c;">Borrar</button>
        </td></tr>`;
    }).join('')}</tbody></table></div>`;
}

async function guardarEntrada() {
  const titulo = document.getElementById('asTitulo').value.trim();
  const cuerpo = document.getElementById('asCuerpo').value.trim();
  const hasta = document.getElementById('asHasta').value;
  if (titulo.length < 2 || cuerpo.length < 2) { showToast('Escribe el título y la información.', 'error'); return; }
  const fila = {
    kind: document.getElementById('asTipo').value,
    title: titulo,
    body: cuerpo,
    status: document.getElementById('asPublicar').checked ? 'publicado' : 'borrador',
    // Fin del día elegido, hora local.
    valid_until: hasta ? new Date(`${hasta}T23:59:59`).toISOString() : null,
  };
  const q = estado.editando
    ? estado.supabase.from('knowledge_entries').update(fila).eq('id', estado.editando).select('id').single()
    : estado.supabase.from('knowledge_entries').insert({ ...fila, company_id: estado.companyId }).select('id').single();
  const { data: guardada, error } = await q;
  if (error) { showToast('No se guardó: ' + error.message, 'error'); return; }
  const fallidos = estado.pendientes.length ? await guardarPendientes(guardada.id) : 0;
  if (!fallidos) showToast(estado.editando ? 'Información actualizada' : 'Información agregada');
  estado.editando = null;
  await recargar();
}

async function borrarEntrada(id) {
  const e = estado.entradas.find(x => x.id === id);
  if (!e || !(await showConfirm(`¿Borrar "${s(e.title)}"? La IA dejará de usarla.`))) return;
  const { error } = await estado.supabase.from('knowledge_entries')
    .update({ deleted_at: new Date().toISOString(), status: 'archivado' }).eq('id', id);
  if (error) { showToast('No se borró: ' + error.message, 'error'); return; }
  showToast('Información borrada');
  await recargar();
}

// ── Probar ─────────────────────────────────────────────────────
async function probar() {
  const input = document.getElementById('asPregunta');
  const res = document.getElementById('asResultado');
  const pregunta = input?.value.trim();
  if (!pregunta) return;
  res.innerHTML = '<div class="skeleton skeleton-line mid"></div>';

  const { data, error } = await estado.supabase.functions.invoke('asistente-probar', {
    body: { pregunta, company_id: estado.companyId },
  });
  if (error) {
    let msg = error.message;
    try { const b = await error.context?.json?.(); if (b?.error) msg = b.error; } catch { /* sin cuerpo */ }
    res.innerHTML = `<p class="mi-aviso">${s(msg)}</p>`;
    return;
  }
  if (data.omitido) { res.innerHTML = `<p class="mi-rango">${s(data.motivo)}</p>`; return; }

  const usadas = data.fuentes.filter(f => f.usada).map(f => f.titulo);
  const veredicto = {
    enviar: '<span class="badge badge-green">En automático se enviaría sola</span>',
    transferir: '<span class="badge badge-amber">En automático pasaría a tu equipo</span>',
    nada: '<span class="badge badge-slate">En automático no se enviaría nada</span>',
  }[data.automatico] ?? '';
  res.innerHTML = `
    <div class="mi-tile" style="display:grid; gap:6px;">
      <div class="mi-tile-titulo">Respuesta de la IA</div>
      <div style="white-space:pre-wrap;">${s(data.respuesta || '(sin respuesta)')}</div>
      ${data.bloqueada ? `<p class="mi-aviso" style="margin:0;">Bloqueada por seguridad: ${s(data.bloqueada)}</p>` : ''}
      <div>${veredicto} <span class="mi-sub">· seguridad ${Math.round(data.confianza * 100)}%</span></div>
      <div class="mi-tile-nota">${s(data.motivo_automatico)}</div>
      ${data.automatico === 'transferir' && data.mensaje_transferencia ? `<div class="mi-tile-nota">El cliente recibiría: “${s(data.mensaje_transferencia)}”</div>` : ''}
      <div class="mi-tile-nota">Información usada: ${usadas.length ? usadas.map(s).join(', ') : 'ninguna'}</div>
      ${data.respuesta_guardada ? '<div class="mi-tile-nota">✅ Usa tu respuesta guardada tal cual.</div>' : ''}
      ${data.adjuntos?.length ? `<div class="mi-tile-nota">📎 Se enviaría junto con la respuesta: ${data.adjuntos.map(s).join(', ')}</div>` : ''}
    </div>`;
}

// ── Eventos ────────────────────────────────────────────────────
async function manejarClic(ev) {
  const btn = ev.target.closest('button[data-accion]');
  if (!btn) return;
  const { accion } = btn.dataset;
  const id = Number(btn.dataset.id);
  btn.disabled = true;
  try {
    if (accion === 'guardar-modo') await guardarModo();
    else if (accion === 'pausar') await cambiarPausa(true);
    else if (accion === 'reanudar') await cambiarPausa(false);
    else if (accion === 'guardar-entrada') await guardarEntrada();
    else if (accion === 'editar') { estado.editando = id; estado.pendientes = []; await recargar(); document.getElementById('asTitulo')?.focus(); }
    else if (accion === 'cancelar') { estado.editando = null; estado.pendientes = []; await recargar(); }
    else if (accion === 'agregar-enlace') agregarEnlace();
    else if (accion === 'quitar-pendiente') { estado.pendientes.splice(Number(btn.dataset.id), 1); refrescarAdjuntosForm(); }
    else if (accion === 'borrar-adjunto') await borrarAdjunto(id);
    else if (accion === 'borrar') await borrarEntrada(id);
    else if (accion === 'probar') await probar();
  } finally {
    if (btn.isConnected) btn.disabled = false;
  }
}
