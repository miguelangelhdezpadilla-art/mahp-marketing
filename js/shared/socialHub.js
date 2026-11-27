import { sHtml as s, showToast } from '../ui.js';

const COLORES_AVATAR = ['#6366f1', '#8b5cf6', '#a78bfa', '#ec4899', '#f59e0b'];

let _canalActivo = 'facebook';

// Conversaciones sin mensajes en 20 días se ocultan de la bandeja (PO,
// 2026-11-26). No se borra nada: si el cliente vuelve a escribir,
// last_message_at avanza y reaparece con todo su historial.
const DIAS_VISIBLES = 20;
let _verAntiguas = false;
const limiteAntiguas = () => new Date(Date.now() - DIAS_VISIBLES * 86400000).toISOString();

function iniciales(nombre) {
  return (nombre || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function colorAvatar(nombre) {
  const codigo = (nombre || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return COLORES_AVATAR[codigo % COLORES_AVATAR.length];
}

function horaCorta(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

// Día en palabras para fechas cercanas: Hoy, Ayer, Antier; las demás con
// fecha ("23 nov", y el año si no es el actual). Compara días de
// calendario en la hora local, no periodos de 24 h.
function diaRelativo(iso) {
  const d = new Date(iso);
  const inicio = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dias = Math.round((inicio(new Date()) - inicio(d)) / 86400000);
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  if (dias === 2) return 'Antier';
  return d.toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short',
    ...(d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}),
  });
}

// Lista de conversaciones: "Hoy 12:46 p.m.", "Ayer 9:10 a.m.", "Antier
// 6:05 p.m."; más atrás solo la fecha.
function fechaCortaLista(iso) {
  if (!iso) return '';
  const dia = diaRelativo(iso);
  return ['Hoy', 'Ayer', 'Antier'].includes(dia) ? `${dia} ${horaCorta(iso)}` : dia;
}

function truncar(texto, n) {
  if (!texto) return '';
  return texto.length > n ? texto.slice(0, n) + '…' : texto;
}

function nombreDe(conv) {
  return conv.customers?.full_name || 'Contacto sin nombre';
}

async function cargarColaboradores(supabase, companyId) {
  const { data } = await supabase
    .from('company_members')
    .select('id, full_name, role')
    .eq('company_id', companyId)
    .eq('active', true)
    .order('full_name');
  return data ?? [];
}

function tagsHtml(conv, companyId, convId) {
  const tags = conv.conversation_tags ?? [];
  if (!tags.length) return '';
  return `
    <div class="conv-badges" style="padding:.5rem 1.1rem; border-bottom:0.5px solid var(--border);">
      ${tags.map(t => {
        const bloqueada = t.confidence_state === 'locked';
        const sufijo = t.confidence_state === 'suggested' ? ' ?' : t.confidence_state === 'locked' ? ' 🔒' : ' ✓';
        return `<span class="conv-badge badge-oport"
          style="cursor:${bloqueada ? 'default' : 'pointer'};"
          ${bloqueada ? '' : `onclick="window.confirmarTag('${t.id}','${companyId}','${convId}')"`}
          title="${t.confidence_state}">${s(t.tag)}${sufijo}</span>`;
      }).join('')}
    </div>`;
}

// Las sugerencias de IA antiguas que se guardaron como mensajes (v26,
// H1) nunca se enviaron al cliente: no son parte del historial.
function mensajesOrdenados(conv) {
  return (conv.messages ?? [])
    .filter(m => !m.legacy_ai_suggestion)
    .sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at));
}

// Sugerencia de IA vigente: la más reciente sin usar, y solo si es
// posterior a la última respuesta enviada (si un agente ya contestó,
// esa sugerencia quedó atrás).
async function sugerenciaVigente(supabase, convId, mensajes) {
  const { data } = await supabase
    .from('ai_responses')
    .select('id, draft, created_at, retrieved')
    .eq('conversation_id', convId)
    .in('status', ['propuesta', 'legacy'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const ultimaSalida = [...mensajes].reverse().find(m => m.direction === 'outbound');
  if (ultimaSalida && new Date(ultimaSalida.sent_at) >= new Date(data.created_at)) return null;
  return data;
}

// Color de la vista previa según quién escribió al último:
//   cliente → negritas (espera respuesta)
//   IA de MAHP → verde
//   IA con el mensaje de transferencia (conversación pausada para una
//   persona, v31) → amarillo fuerte
function claseUltimo(conv, ultimo) {
  if (!ultimo) return '';
  if (ultimo.direction === 'inbound') return 'conv-ultimo-cliente';
  if (ultimo.sender_type === 'ia') return conv.ai_paused ? 'conv-ultimo-transferencia' : 'conv-ultimo-ia';
  return '';
}

// ── Tarjeta de conversación (lista izquierda) ────────────────────
function conversacionCardHtml(conv, companyId) {
  const nombre = nombreDe(conv);
  const mensajes = mensajesOrdenados(conv);
  const ultimo = mensajes[mensajes.length - 1];
  const noLeido = ultimo && ultimo.direction === 'inbound' && conv.status !== 'resuelto';
  const claseEstado = conv.status === 'en_atencion' ? 'atencion' : conv.status === 'resuelto' ? 'resuelto' : 'nuevo';
  const textoEstado = conv.status === 'en_atencion' ? 'En atención' : conv.status === 'resuelto' ? 'Resuelto' : 'Nuevo';

  return `
    <div class="conv-item" data-conv-id="${conv.id}"
         onclick="window.abrirConversacion('${conv.id}','${companyId}')">
      <div class="conv-avatar" style="background:${colorAvatar(nombre)}">
        ${s(iniciales(nombre))}
        <span class="conv-canal-dot ${conv.channel === 'facebook' ? 'dot-fb' : 'dot-ig'}">${conv.channel === 'facebook' ? 'f' : 'i'}</span>
      </div>
      <div class="conv-info">
        <div class="conv-nombre">${s(nombre)} <span class="conv-hora">${ultimo ? fechaCortaLista(ultimo.sent_at) : ''}</span></div>
        <div class="conv-ultimo ${claseUltimo(conv, ultimo)}">${ultimo ? s(truncar(textoVistaPrevia(ultimo), 60)) : 'Sin mensajes'}</div>
        <div class="conv-badges">
          <span class="conv-badge badge-${claseEstado}">${textoEstado}</span>
          ${conv.ia_urgencia === 'alta' ? '<span class="conv-badge badge-urgente">Urgente</span>' : ''}
          ${conv.ia_oportunidad != null ? `<span class="conv-badge badge-oport">⭐ ${conv.ia_oportunidad}</span>` : ''}
        </div>
      </div>
      ${noLeido ? '<div class="conv-unread">●</div>' : ''}
    </div>`;
}

// ── Adjuntos (v27) ────────────────────────────────────────────────
// media_url guarda la ruta dentro del bucket privado social-media, no
// una URL: se pide una URL firmada (válida 1 h) y el RLS de Storage
// limita la lectura a la empresa dueña.
const BUCKET_MEDIA = 'social-media';
const ETIQUETA_TIPO = { image: '📷 Imagen', video: '🎬 Video', audio: '🎤 Audio', file: '📎 Archivo' };

// Texto para la lista de conversaciones cuando el mensaje es solo un adjunto.
function textoVistaPrevia(m) {
  return m.content || ETIQUETA_TIPO[m.message_type] || '';
}

function adjuntoHtml(m) {
  if (!m.message_type || m.message_type === 'text') return '';
  const etiqueta = ETIQUETA_TIPO[m.message_type] ?? '📎 Archivo';
  // Meta no dejó descargar el archivo (o caducó antes de guardarlo).
  if (!m.media_url) return `<div class="msg-media-pendiente">${etiqueta} (no disponible)</div>`;
  return `<div class="msg-media-pendiente" data-media-path="${s(m.media_url)}" data-media-tipo="${s(m.message_type)}">${etiqueta}…</div>`;
}

// Cambia cada marcador data-media-path por la imagen/video/audio real.
async function hidratarMedios(supabase, cont) {
  const marcadores = [...(cont?.querySelectorAll('[data-media-path]') ?? [])];
  if (!marcadores.length || !supabase) return;
  const rutas = [...new Set(marcadores.map(el => el.dataset.mediaPath))];
  const { data, error } = await supabase.storage.from(BUCKET_MEDIA).createSignedUrls(rutas, 3600);
  if (error || !data) return;
  const urlPorRuta = new Map(data.filter(d => d.signedUrl).map(d => [d.path, d.signedUrl]));

  for (const el of marcadores) {
    const url = urlPorRuta.get(el.dataset.mediaPath);
    if (!url) { el.textContent = `${ETIQUETA_TIPO[el.dataset.mediaTipo] ?? '📎 Archivo'} (no disponible)`; continue; }
    const tipo = el.dataset.mediaTipo;
    let nodo;
    if (tipo === 'image') {
      nodo = document.createElement('a');
      nodo.href = url; nodo.target = '_blank'; nodo.rel = 'noopener'; nodo.className = 'msg-media-link';
      const img = document.createElement('img');
      img.src = url; img.alt = 'Imagen enviada en la conversación'; img.className = 'msg-media'; img.loading = 'lazy';
      img.onload = () => { if (cont.dataset.pegadoAbajo === '1') cont.scrollTop = cont.scrollHeight; };
      nodo.appendChild(img);
    } else if (tipo === 'video' || tipo === 'audio') {
      nodo = document.createElement(tipo);
      nodo.src = url; nodo.controls = true; nodo.preload = 'metadata'; nodo.className = 'msg-media';
    } else {
      nodo = document.createElement('a');
      nodo.href = url; nodo.target = '_blank'; nodo.rel = 'noopener';
      nodo.className = 'msg-media-pendiente'; nodo.textContent = '📎 Abrir archivo';
    }
    el.replaceWith(nodo);
  }
}

// ── Burbuja de mensaje (panel derecho) ───────────────────────────
function mensajeHtml(m) {
  const clase = m.sender_type === 'cliente' ? 'cliente' : m.sender_type === 'ia' ? 'ia-msg' : 'agente';
  const icono = clase === 'cliente' ? '🧑' : clase === 'ia-msg' ? '✨' : '🧑‍💼';
  const adjunto = adjuntoHtml(m);
  return `
    <div class="msg ${clase}" data-msg-id="${Number(m.id) || ''}">
      <div class="msg-avatar">${icono}</div>
      <div class="${adjunto ? 'msg-media-wrap' : ''}">
        ${clase === 'ia-msg' ? '<div class="msg-ia-badge">✨ IA</div>' : ''}
        ${adjunto}
        ${m.content ? `<div class="msg-burbuja">${s(m.content)}</div>` : ''}
        <div class="msg-hora">${fechaHora(m.sent_at)}${clase === 'agente' && m.content && Number(m.id)
          ? ` · <button class="msg-guardar" onclick="window.guardarComoRespuesta(${Number(m.id)}, ${Number(m.conversation_id)})" title="Guardar como respuesta para que la IA la use con otros clientes">💾 Guardar como respuesta</button>`
          : ''}</div>
      </div>
    </div>`;
}

// Burbujas del chat: siempre día + hora ("Hoy 12:46 p.m.", "Ayer …",
// "Antier …", "23 nov 9:10 a.m.").
function fechaHora(iso) {
  if (!iso) return '';
  return `${diaRelativo(iso)} ${horaCorta(iso)}`;
}

function agregarMensajeAlChat(mensaje) {
  const cont = document.getElementById(`mensajes-${mensaje.conversation_id}`);
  if (!cont) return;
  if (mensaje.legacy_ai_suggestion) return;
  // Llega tarde por Realtime algo que ya se pintó (p. ej. tras importar historial).
  if (cont.querySelector(`[data-msg-id="${Number(mensaje.id)}"]`)) return;
  cont.insertAdjacentHTML('beforeend', mensajeHtml(mensaje));
  // El cliente volvió a escribir: se reabre la ventana de 24 h.
  if (mensaje.direction === 'inbound') {
    document.getElementById(`ventana-${mensaje.conversation_id}`)?.remove();
    const ta = document.getElementById(`resp-${mensaje.conversation_id}`);
    const bt = document.getElementById(`enviar-${mensaje.conversation_id}`);
    if (ta) { ta.disabled = false; ta.placeholder = 'Escribe una respuesta...'; }
    if (bt) bt.disabled = false;
  }
  cont.scrollTop = cont.scrollHeight;
  hidratarMedios(window._supabaseHub, cont);
}

// ── Historial de Meta (v27) ───────────────────────────────────────
// Al abrir una conversación se pide a Meta su historial reciente una
// vez por sesión (Meta solo entrega los últimos 20 mensajes). Mientras
// tanto, el Realtime no agrega uno por uno los mensajes importados: se
// vuelve a pintar todo al final, ya en orden.
const _sincronizadas = new Set();
const _sincronizando = new Set();

async function sincronizarHistorial(supabase, convId, companyId, { manual = false } = {}) {
  const clave = String(convId);
  if (_sincronizando.has(clave)) return;
  _sincronizando.add(clave);
  const btn = document.getElementById(`btn-historial-${convId}`);
  if (btn) { btn.disabled = true; btn.textContent = '↻ Trayendo…'; }

  try {
    const { data, error } = await supabase.functions.invoke('meta-sync-conversation', {
      body: { conversation_id: Number(convId) },
    });
    let detalle = data?.error;
    if (error && !detalle && error?.context?.json) {
      try { detalle = (await error.context.json())?.error; } catch { /* sin cuerpo JSON */ }
    }
    if (error || detalle) {
      if (manual) showToast(detalle || 'No se pudo traer el historial de Meta', 'error');
      return;
    }
    _sincronizadas.add(clave);
    if (manual) {
      showToast(data?.importados ? `Se agregaron ${data.importados} mensajes del historial` : 'El historial ya estaba completo', 'ok');
    }
    if (data?.importados && String(window._convAbierta) === clave) {
      _sincronizando.delete(clave);
      await abrirConversacion(supabase, convId, companyId, window._perfilActual, { sinSincronizar: true });
      recargarListaPronto(supabase, companyId);
    }
  } finally {
    _sincronizando.delete(clave);
    const b = document.getElementById(`btn-historial-${convId}`);
    if (b) { b.disabled = false; b.textContent = '↻ Historial'; }
  }
}

window.sincronizarHistorial = function (convId, companyId) {
  sincronizarHistorial(window._supabaseHub, convId, companyId, { manual: true });
};

// Una importación inserta varios mensajes seguidos; sin esto la lista
// se recargaría una vez por cada uno.
let _temporizadorLista = null;
function recargarListaPronto(supabase, companyId) {
  clearTimeout(_temporizadorLista);
  _temporizadorLista = setTimeout(() => cargarConversaciones(supabase, companyId, _canalActivo), 400);
}

// ── Lista de conversaciones ───────────────────────────────────────
async function cargarConversaciones(supabase, companyId, canal) {
  _canalActivo = canal;
  const lista = document.getElementById(`conv-list-${companyId}`);
  if (!lista) return;

  let consulta = supabase
    .from('conversations')
    .select('*, customers(full_name), messages(content, sent_at, sender_type, direction, message_type, legacy_ai_suggestion)')
    .eq('company_id', companyId)
    .eq('channel', canal)
    .order('last_message_at', { ascending: false });
  if (!_verAntiguas) consulta = consulta.gte('last_message_at', limiteAntiguas());
  const [{ data: conversaciones, error }, { count: ocultas }] = await Promise.all([
    consulta,
    supabase.from('conversations').select('id', { count: 'exact', head: true })
      .eq('company_id', companyId).eq('channel', canal)
      .or(`last_message_at.lt.${limiteAntiguas()},last_message_at.is.null`),
  ]);

  if (error) {
    lista.innerHTML = '<div class="hub-empty"><p>Error al cargar conversaciones.</p></div>';
    return;
  }

  const convs = conversaciones ?? [];
  const botonAntiguas = ocultas
    ? `<button class="hub-ver-antiguas" onclick="window.alternarAntiguas('${companyId}')"
         style="display:block; width:calc(100% - 16px); margin:8px; padding:8px; font-size:12px; background:var(--surface-2); color:var(--text-secondary); border:0.5px solid var(--border); border-radius:8px; cursor:pointer;">
         ${_verAntiguas ? `Ocultar las de más de ${DIAS_VISIBLES} días sin mensajes` : `Ver ${ocultas} conversación${ocultas === 1 ? '' : 'es'} con más de ${DIAS_VISIBLES} días sin mensajes`}
       </button>`
    : '';
  lista.innerHTML = (convs.length
    ? convs.map(c => conversacionCardHtml(c, companyId)).join('')
    : `<div class="hub-empty"><p>${ocultas && !_verAntiguas ? `Sin conversaciones en los últimos ${DIAS_VISIBLES} días.` : 'No hay conversaciones todavía.'}</p></div>`)
    + botonAntiguas;

  // Nombre del contacto asignado como propiedad del DOM (no como
  // atributo HTML): sHtml() escapa para contenido de texto, no para
  // contexto de atributo, y el nombre viene de Meta (dato externo,
  // no confiable) — insertarlo en un string de HTML como atributo
  // sería una vía de XSS si trae comillas.
  lista.querySelectorAll('.conv-item').forEach(item => {
    const conv = convs.find(c => String(c.id) === item.dataset.convId);
    if (conv) item.dataset.nombre = nombreDe(conv).toLowerCase();
  });

  // Los contadores de pestaña cuentan solo lo visible (últimos 20 días).
  const [{ count: countFb }, { count: countIg }] = await Promise.all([
    supabase.from('conversations').select('id', { count: 'exact', head: true })
      .eq('company_id', companyId).eq('channel', 'facebook').eq('status', 'nuevo')
      .gte('last_message_at', limiteAntiguas()),
    supabase.from('conversations').select('id', { count: 'exact', head: true })
      .eq('company_id', companyId).eq('channel', 'instagram').eq('status', 'nuevo')
      .gte('last_message_at', limiteAntiguas()),
  ]);
  const badgeFb = document.getElementById(`badge-fb-${companyId}`);
  const badgeIg = document.getElementById(`badge-ig-${companyId}`);
  if (badgeFb) badgeFb.textContent = countFb ?? 0;
  if (badgeIg) badgeIg.textContent = countIg ?? 0;
}

window.alternarAntiguas = function (companyId) {
  _verAntiguas = !_verAntiguas;
  cargarConversaciones(window._supabaseHub, companyId, _canalActivo);
};

// ── Abrir conversación (panel derecho) ────────────────────────────
async function abrirConversacion(supabase, convId, companyId, perfil, { sinSincronizar = false } = {}) {
  window._convAbierta = convId;

  document.querySelectorAll(`#conv-list-${companyId} .conv-item`).forEach(el => el.classList.remove('sel'));
  const card = document.querySelector(`#conv-list-${companyId} .conv-item[data-conv-id="${convId}"]`);
  if (card) card.classList.add('sel');

  const right = document.getElementById(`hub-right-${companyId}`);
  if (!right) return;
  right.innerHTML = '<div class="hub-empty"><p>Cargando…</p></div>';

  const { data: conv, error } = await supabase
    .from('conversations')
    .select('*, customers(full_name), messages(*), conversation_tags(id, tag, confidence_state)')
    .eq('id', convId)
    .single();

  if (error || !conv) {
    right.innerHTML = '<div class="hub-empty"><p>No se pudo cargar la conversación.</p></div>';
    return;
  }

  if (conv.status === 'nuevo') {
    await supabase.from('conversations').update({ status: 'en_atencion' }).eq('id', convId);
    conv.status = 'en_atencion';
  }

  const nombre = nombreDe(conv);
  const mensajes = mensajesOrdenados(conv);
  const sugerenciaIA = await sugerenciaVigente(supabase, convId, mensajes);

  right.innerHTML = `
    <div class="conv-header">
      <div class="conv-header-avatar" style="background:${colorAvatar(nombre)}">${s(iniciales(nombre))}</div>
      <div class="conv-header-info">
        <div class="conv-header-nombre">${s(nombre)}</div>
        <div class="conv-header-meta">
          <span>${conv.channel === 'facebook' ? '📘 Facebook' : '📸 Instagram'}</span>
          ${conv.ia_oportunidad != null ? `<span class="ia-tag tag-oportunidad">⭐ ${conv.ia_oportunidad} oportunidad</span>` : ''}
        </div>
      </div>
      <div class="conv-header-actions">
        <button class="btn-historial" id="btn-historial-${convId}" title="Traer de ${conv.channel === 'facebook' ? 'Messenger' : 'Instagram'} los últimos 20 mensajes, con imágenes"
                onclick="window.sincronizarHistorial('${convId}','${companyId}')">↻ Historial</button>
        <button class="btn-asignar" onclick="window.asignarConversacion('${convId}','${companyId}')">👤 Asignar</button>
        <button class="btn-resolver" onclick="window.resolverConversacion('${convId}','${companyId}')">✓ Resolver</button>
      </div>
    </div>
    ${conv.ia_intencion ? `
    <div class="ia-panel">
      <div class="ia-panel-icon">✨</div>
      <div class="ia-panel-body">
        <div class="ia-panel-title">Análisis IA</div>
        <div class="ia-tags">
          <span class="ia-tag tag-intencion">${s(conv.ia_intencion)}</span>
          ${conv.ia_sentimiento ? `<span class="ia-tag tag-sentimiento-${conv.ia_sentimiento === 'positivo' ? 'pos' : conv.ia_sentimiento === 'negativo' ? 'neg' : 'neu'}">${s(conv.ia_sentimiento)}</span>` : ''}
          ${conv.ia_urgencia ? `<span class="ia-tag tag-urgencia-${conv.ia_urgencia}">${s(conv.ia_urgencia)}</span>` : ''}
        </div>
        ${conv.ia_explicacion ? `<div style="font-size:11px;color:#4338ca;margin-bottom:6px;">💡 ${s(conv.ia_explicacion)}</div>` : ''}
        ${sugerenciaIA ? `
        <div class="ia-sugerencia" onclick="window.usarSugerenciaIA('${convId}','${sugerenciaIA.id}')">
          <span>${s(sugerenciaIA.draft)}</span>
          ${(() => {
            const n = Array.isArray(sugerenciaIA.retrieved)
              ? sugerenciaIA.retrieved.filter(f => f?.usada).reduce((t, f) => t + (Number(f.archivos) || 0), 0) : 0;
            const tope = Math.min(n, 3);
            return tope ? `<div style="font-size:11px;color:#4338ca;margin-top:4px;">📎 Al enviarla se adjuntan ${tope} archivo${tope > 1 ? 's' : ''} guardado${tope > 1 ? 's' : ''} con esta respuesta</div>` : '';
          })()}
          <span class="ia-sugerencia-usar">Usar respuesta →</span>
        </div>` : ''}
      </div>
    </div>` : ''}
    ${tagsHtml(conv, companyId, convId)}
    <div class="mensajes" id="mensajes-${convId}">
      ${mensajes.map(mensajeHtml).join('')}
    </div>
    ${(() => {
      // Meta solo deja responder dentro de 24 h desde el último mensaje del
      // cliente; la extensión a 7 días (HUMAN_AGENT) requiere aprobación de
      // Meta que la app aún no tiene. Se avisa antes de escribir.
      const ultimoCliente = [...mensajes].reverse().find(m => m.direction === 'inbound');
      const cerrada = ultimoCliente && Date.now() - Date.parse(ultimoCliente.sent_at) > 24 * 3600 * 1000;
      return `
    ${cerrada ? `<div class="resp-ventana-cerrada" id="ventana-${convId}" role="status" style="margin:6px 12px 0; padding:8px 10px; border-radius:8px; background:var(--amber-light); color:#92400E; font-size:12px;">
      ⏰ Pasaron más de 24 horas desde el último mensaje del cliente (${fechaHora(ultimoCliente.sent_at)}). Meta no permite responder hasta que vuelva a escribir. Si es urgente, contéstale desde la app de Facebook o Instagram.
    </div>` : ''}
    <div class="resp-box">
      <textarea class="resp-input" id="resp-${convId}" placeholder="${cerrada ? 'Esperando a que el cliente vuelva a escribir…' : 'Escribe una respuesta...'}" ${cerrada ? 'disabled' : ''}></textarea>
      <button class="btn-enviar" id="enviar-${convId}" onclick="window.enviarRespuesta('${convId}','${companyId}')" ${cerrada ? 'disabled' : ''}>Enviar →</button>
    </div>`;
    })()}`;

  const contMensajes = document.getElementById(`mensajes-${convId}`);
  if (contMensajes) {
    contMensajes.scrollTop = contMensajes.scrollHeight;
    // Las imágenes cargan después: si el agente sigue abajo, se
    // mantiene abajo al terminar de cargar cada una.
    contMensajes.dataset.pegadoAbajo = '1';
    contMensajes.onscroll = () => {
      const abajo = contMensajes.scrollHeight - contMensajes.scrollTop - contMensajes.clientHeight < 40;
      contMensajes.dataset.pegadoAbajo = abajo ? '1' : '0';
    };
    hidratarMedios(supabase, contMensajes);
  }

  window._perfilActual = perfil;
  window._supabaseHub = supabase;

  if (!sinSincronizar && !_sincronizadas.has(String(convId))) {
    sincronizarHistorial(supabase, convId, companyId);
  }
}

// ── Envío de respuesta ────────────────────────────────────────────
// Nunca llama a Graph API directo ni guarda META_PAGE_TOKEN aquí — ese
// secreto solo vive en la Edge Function meta-send-message (CLAUDE.md
// §5, ADR-007). Este wrapper solo invoca la función con la sesión del
// usuario ya autenticado.
export async function enviarRespuestaMeta(supabase, convId, companyId, contenido) {
  const textareaEnvio = document.getElementById(`resp-${convId}`);
  const aiResponseId = textareaEnvio?.dataset.aiResponseId;
  const { data, error } = await supabase.functions.invoke('meta-send-message', {
    body: {
      conversation_id: convId,
      content: contenido,
      ...(aiResponseId ? { ai_response_id: Number(aiResponseId) } : {}),
    },
  });

  if (error || data?.error) {
    // Con un estado distinto de 2xx, invoke() deja `data` vacío y el
    // mensaje de la función viene en error.context (la Response).
    let detalle = data?.error;
    if (!detalle && error?.context?.json) {
      try { detalle = (await error.context.json())?.error; } catch { /* sin cuerpo JSON */ }
    }
    showToast(detalle || 'No se pudo enviar la respuesta', 'error');
    return;
  }

  if (data?.aviso) showToast(data.aviso, 'error');

  const textarea = document.getElementById(`resp-${convId}`);
  if (textarea) { textarea.value = ''; delete textarea.dataset.aiResponseId; }

  await abrirConversacion(supabase, convId, companyId, window._perfilActual);
  await cargarConversaciones(supabase, companyId, _canalActivo);
}

// ── Realtime: mensajes nuevos sin recargar la página ─────────────
export function suscribirseAMensajesNuevos(supabase, companyId) {
  supabase
    .channel(`mensajes-nuevos-${companyId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `company_id=eq.${companyId}`,
    }, (payload) => {
      recargarListaPronto(supabase, companyId);
      // Durante una importación de historial se pinta todo al final.
      if (_sincronizando.has(String(payload.new.conversation_id))) return;
      // _convAbierta llega como texto desde el onclick; conversation_id
      // viene como número en el payload — se comparan como texto.
      if (String(window._convAbierta) === String(payload.new.conversation_id)) {
        agregarMensajeAlChat(payload.new);
      }
    })
    // Sugerencias de IA nuevas (v26): viven en ai_responses, no en
    // messages. Si es de la conversación abierta, se vuelve a pintar
    // para mostrarla — salvo que el agente ya esté escribiendo.
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'ai_responses',
      filter: `company_id=eq.${companyId}`,
    }, (payload) => {
      const convId = window._convAbierta;
      if (String(convId) !== String(payload.new.conversation_id)) return;
      const textarea = document.getElementById(`resp-${convId}`);
      if (textarea && textarea.value.trim()) return;
      abrirConversacion(supabase, convId, companyId, window._perfilActual);
    })
    .subscribe();
}

// ── Funciones globales referenciadas por los onclick del HTML ────
window.filtrarConversaciones = function (texto) {
  const filtro = texto.trim().toLowerCase();
  document.querySelectorAll('.conv-item').forEach(item => {
    item.style.display = (item.dataset.nombre || '').includes(filtro) ? '' : 'none';
  });
};

window.cambiarCanalHub = function (canal, companyId) {
  document.querySelectorAll('.hub-tab').forEach(btn => btn.classList.remove('activo'));
  const btn = [...document.querySelectorAll('.hub-tab')].find(b => b.getAttribute('onclick')?.includes(`'${canal}'`));
  if (btn) btn.classList.add('activo');
  cargarConversaciones(window._supabaseHub, companyId, canal);
};

// ── Guardar una respuesta del equipo como Pregunta frecuente (v34) ──
// La pregunta son los mensajes del cliente justo antes de esa respuesta.
// Se guarda en la base de conocimientos como respuesta guardada: la IA
// la usa tal cual con otros clientes (publicada) o queda como borrador.
const escAttr = v => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

window.guardarComoRespuesta = async function (msgId, convId) {
  const supabase = window._supabaseHub;
  const { data: msgs, error } = await supabase.from('messages')
    .select('id, company_id, direction, sender_type, content, sent_at')
    .eq('conversation_id', convId).eq('legacy_ai_suggestion', false)
    .order('sent_at', { ascending: true });
  if (error || !msgs) { showToast('No se pudo leer la conversación.', 'error'); return; }
  const i = msgs.findIndex(x => x.id === msgId);
  if (i < 0) return;
  const respuesta = msgs[i];
  const preguntas = [];
  for (let j = i - 1; j >= 0 && preguntas.length < 4; j--) {
    if (msgs[j].direction !== 'inbound') { if (preguntas.length) break; continue; }
    if (msgs[j].content?.trim()) preguntas.unshift(msgs[j].content.trim());
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal-caja" style="max-width:560px; width:calc(100% - 32px);">
    <h3 style="margin-top:0;">💾 Guardar como respuesta</h3>
    <p style="font-size:12px; color:var(--text-secondary); margin-top:-6px;">Cuando otro cliente pregunte algo parecido, la IA enviará esta respuesta tal cual. Quita nombres o datos de este cliente en particular.</p>
    <label style="font-size:12px;">Pregunta del cliente
      <input type="text" id="gcrPregunta" maxlength="200" value="${escAttr(preguntas.join(' ').slice(0, 200))}" style="margin:4px 0 8px;"></label>
    <label style="font-size:12px;">Respuesta
      <textarea id="gcrRespuesta" maxlength="3000" rows="5" style="margin:4px 0 8px;">${s(respuesta.content ?? '')}</textarea></label>
    <label style="display:flex; gap:6px; align-items:center; font-size:12px;">
      <input type="checkbox" id="gcrPublicar" checked style="width:auto; margin:0;"> Publicar ya (si no, queda como borrador en "Asistente de IA")</label>
    <div class="modal-botones">
      <button class="modal-btn-cancelar">Cancelar</button>
      <button class="modal-btn-aceptar">Guardar</button>
    </div></div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('.modal-btn-cancelar').onclick = () => overlay.remove();
  overlay.querySelector('.modal-btn-aceptar').onclick = async () => {
    const title = overlay.querySelector('#gcrPregunta').value.trim();
    const body = overlay.querySelector('#gcrRespuesta').value.trim();
    if (title.length < 2 || body.length < 2) { showToast('Escribe la pregunta y la respuesta.', 'error'); return; }
    const publicar = overlay.querySelector('#gcrPublicar').checked;
    const { error: errIns } = await supabase.from('knowledge_entries').insert({
      company_id: respuesta.company_id, kind: 'faq', title, body, status: publicar ? 'publicado' : 'borrador',
    });
    if (errIns) { showToast('No se guardó: ' + errIns.message, 'error'); return; }
    overlay.remove();
    showToast(publicar ? 'Respuesta guardada: la IA ya la puede usar' : 'Guardada como borrador en Asistente de IA');
  };
};

window.abrirConversacion = function (convId, companyId) {
  abrirConversacion(window._supabaseHub, convId, companyId, window._perfilActual);
};

// Selector real de colaborador: reemplaza el botón "Asignar" por un
// <select> con el equipo de la empresa (profiles activos), en vez de
// autoasignación fija.
window.asignarConversacion = async function (convId, companyId) {
  const supabase = window._supabaseHub;
  const perfil = window._perfilActual;
  if (!supabase) return;

  const btn = document.querySelector('.btn-asignar');
  if (!btn) return;

  const colaboradores = await cargarColaboradores(supabase, companyId);

  const select = document.createElement('select');
  select.className = 'btn-asignar';
  select.innerHTML = `
    <option value="">Sin asignar</option>
    ${colaboradores.map(c => `<option value="${c.id}">${s(c.full_name || 'Sin nombre')}</option>`).join('')}`;

  select.onchange = async () => {
    const nuevoId = select.value || null;
    const nombreAsignado = colaboradores.find(c => c.id === nuevoId)?.full_name;

    await supabase.from('conversations').update({
      assigned_to: nuevoId,
      assigned_reason: nuevoId
        ? `Asignado a ${nombreAsignado || 'un colaborador'} por ${perfil?.full_name || 'un agente'}`
        : null,
    }).eq('id', convId);

    showToast(nuevoId ? 'Conversación asignada' : 'Asignación removida', 'ok');
    abrirConversacion(supabase, convId, companyId, perfil);
    cargarConversaciones(supabase, companyId, _canalActivo);
  };

  btn.replaceWith(select);
  select.focus();
};

// Etiquetas con niveles de confianza (ADR-018): un clic avanza
// suggested → confirmed → locked. Una vez 'locked' no se toca desde
// aquí (bloqueada a propósito, requiere una acción deliberada aparte).
window.confirmarTag = async function (tagId, companyId, convId) {
  const supabase = window._supabaseHub;
  if (!supabase) return;

  const { data: tagActual } = await supabase
    .from('conversation_tags')
    .select('confidence_state')
    .eq('id', tagId)
    .single();

  if (!tagActual || tagActual.confidence_state === 'locked') return;

  const siguiente = tagActual.confidence_state === 'suggested' ? 'confirmed' : 'locked';
  await supabase.from('conversation_tags').update({ confidence_state: siguiente }).eq('id', tagId);

  showToast(siguiente === 'confirmed' ? 'Etiqueta confirmada' : 'Etiqueta bloqueada', 'ok');
  abrirConversacion(supabase, convId, companyId, window._perfilActual);
};

window.resolverConversacion = async function (convId, companyId) {
  const supabase = window._supabaseHub;
  if (!supabase) return;

  await supabase.from('conversations').update({ status: 'resuelto' }).eq('id', convId);
  showToast('Conversación marcada como resuelta', 'ok');
  await cargarConversaciones(supabase, companyId, _canalActivo);
  await abrirConversacion(supabase, convId, companyId, window._perfilActual);
};

// Guarda en el textarea qué sugerencia se usó: al enviar, la Edge
// Function la marca como aprobada o editada (v26). Si el agente borra
// todo el texto, deja de contar como uso de la sugerencia.
window.usarSugerenciaIA = function (convId, aiResponseId) {
  const textarea = document.getElementById(`resp-${convId}`);
  const sugerencia = document.querySelector('.ia-sugerencia span');
  if (!textarea || !sugerencia) return;
  textarea.value = sugerencia.textContent;
  textarea.dataset.aiResponseId = aiResponseId;
  textarea.oninput = () => { if (!textarea.value.trim()) delete textarea.dataset.aiResponseId; };
};

window.enviarRespuesta = async function (convId, companyId) {
  const textarea = document.getElementById(`resp-${convId}`);
  if (!textarea) return;
  const contenido = textarea.value.trim();
  if (!contenido) return;
  await enviarRespuestaMeta(window._supabaseHub, convId, companyId, contenido);
};

// ── Punto de entrada ───────────────────────────────────────────────
export async function renderSocialHub(supabase, companyId, perfil, idContenedor) {
  const cont = document.getElementById(idContenedor);
  if (!cont) return;

  window._supabaseHub = supabase;
  window._perfilActual = perfil;
  _canalActivo = 'facebook';

  cont.innerHTML = `
    <div class="hub-wrapper">
      <div class="hub-left">
        <div class="hub-search">
          <input type="text" id="hub-buscar-${companyId}"
                 placeholder="🔍 Buscar conversaciones..."
                 oninput="window.filtrarConversaciones(this.value)">
        </div>
        <div class="hub-tabs">
          <button class="hub-tab activo" onclick="window.cambiarCanalHub('facebook','${companyId}')">
            📘 Facebook
            <span id="badge-fb-${companyId}" class="hub-badge">0</span>
          </button>
          <button class="hub-tab" onclick="window.cambiarCanalHub('instagram','${companyId}')">
            📸 Instagram
            <span id="badge-ig-${companyId}" class="hub-badge">0</span>
          </button>
        </div>
        <div class="conv-list" id="conv-list-${companyId}">cargando...</div>
      </div>
      <div class="hub-right" id="hub-right-${companyId}">
        <div class="hub-empty">
          <div style="font-size:32px;">💬</div>
          <p>Selecciona una conversación</p>
        </div>
      </div>
    </div>`;

  await cargarConversaciones(supabase, companyId, 'facebook');
  suscribirseAMensajesNuevos(supabase, companyId);
  rellenarNombresPendientes(supabase, companyId);
}

// Contactos que siguen como "Contacto sin nombre": se le pide a Meta su
// nombre o @usuario, una vez por sesión y por lotes (v27).
const _nombresRevisados = new Set();
async function rellenarNombresPendientes(supabase, companyId) {
  if (_nombresRevisados.has(String(companyId))) return;
  _nombresRevisados.add(String(companyId));
  let antesDe = null;
  let total = 0;
  for (let vuelta = 0; vuelta < 10; vuelta++) {
    const { data, error } = await supabase.functions.invoke('meta-sync-conversation', {
      body: { company_id: Number(companyId), rellenar_nombres: true, ...(antesDe ? { antes_de: antesDe } : {}) },
    });
    if (error || data?.error) return;
    total += data?.actualizados ?? 0;
    if (!data?.hay_mas) break;
    antesDe = data.siguiente;
  }
  if (total) cargarConversaciones(supabase, companyId, _canalActivo);
}
