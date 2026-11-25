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
  faq: 'Pregunta frecuente',
  politica: 'Política (envíos, pagos, cambios)',
};

const MODOS = {
  manual: { titulo: 'Manual', texto: 'La IA no interviene. Tu equipo contesta todo.' },
  asistido: { titulo: 'Asistido', texto: 'La IA escribe un borrador y una persona decide si lo envía.' },
  automatico: { titulo: 'Automático', texto: 'La IA contesta sola cuando la respuesta está en tu información publicada y está segura. Si no, envía tu mensaje de transferencia y deja la conversación a tu equipo.' },
};

const a = v => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const estado = { supabase: null, companyId: null, perfil: null, idCont: null, entradas: [], asistente: null, editando: null };

export async function renderAsistenteIA(supabase, companyId, perfil, idCont) {
  Object.assign(estado, { supabase, companyId, perfil, idCont });
  const cont = document.getElementById(idCont);
  if (!cont) return;
  if (!cont.dataset.enlazado) {
    cont.addEventListener('click', manejarClic);
    cont.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' && ev.target.id === 'asPregunta') { ev.preventDefault(); probar(); }
    });
    cont.dataset.enlazado = '1';
  }
  await recargar();
}

async function recargar() {
  const cont = document.getElementById(estado.idCont);
  const [ent, asis] = await Promise.all([
    estado.supabase.from('knowledge_entries')
      .select('id, kind, title, body, status, valid_until, updated_at')
      .eq('company_id', estado.companyId).is('deleted_at', null)
      .order('kind').order('updated_at', { ascending: false }),
    estado.supabase.from('ai_assistants')
      .select('mode, min_confidence, max_auto_per_conversation_hour, handoff_message, auto_paused_at, knowledge_changed_at, last_playground_at')
      .eq('company_id', estado.companyId).maybeSingle(),
  ]);
  if (ent.error || asis.error) {
    cont.innerHTML = `<p class="mi-rango">No se pudo cargar el asistente: ${s((ent.error || asis.error).message)}</p>`;
    return;
  }
  estado.entradas = ent.data ?? [];
  estado.asistente = asis.data;
  cont.innerHTML = `
    ${seccionModo()}
    <div class="mi-bloque">
      <h3>1. Información del negocio <span class="mi-sub">· la IA solo contesta con lo que esté publicado aquí</span></h3>
      ${formularioEntrada()}
      ${listaEntradas()}
    </div>
    <div class="mi-bloque">
      <h3>2. Probar mi asistente <span class="mi-sub">· escribe como si fueras un cliente; no se envía nada</span></h3>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <input type="text" id="asPregunta" maxlength="1000" placeholder="Ej. ¿A qué hora abren el sábado?" style="flex:1; min-width:220px; margin:0;">
        <button class="btn-auto" data-accion="probar" style="width:auto; margin:0;">Probar</button>
      </div>
      <div id="asResultado" aria-live="polite" style="margin-top:10px;"></div>
    </div>`;
}

// ── Modo ───────────────────────────────────────────────────────
function seccionModo() {
  const as = estado.asistente;
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

async function guardarModo() {
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
    if (motivo) { showToast(motivo, 'error'); await recargar(); return; }
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
        <td>${s(e.title)}</td>
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
    ? estado.supabase.from('knowledge_entries').update(fila).eq('id', estado.editando)
    : estado.supabase.from('knowledge_entries').insert({ ...fila, company_id: estado.companyId });
  const { error } = await q;
  if (error) { showToast('No se guardó: ' + error.message, 'error'); return; }
  showToast(estado.editando ? 'Información actualizada' : 'Información agregada');
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
    else if (accion === 'editar') { estado.editando = id; await recargar(); document.getElementById('asTitulo')?.focus(); }
    else if (accion === 'cancelar') { estado.editando = null; await recargar(); }
    else if (accion === 'borrar') await borrarEntrada(id);
    else if (accion === 'probar') await probar();
  } finally {
    if (btn.isConnected) btn.disabled = false;
  }
}
