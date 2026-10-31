import { sHtml as s, showToast } from '../ui.js';

const COLORES_AVATAR = ['#6366f1', '#8b5cf6', '#a78bfa', '#ec4899', '#f59e0b'];

let _canalActivo = 'facebook';

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

function mensajesOrdenados(conv) {
  return (conv.messages ?? []).slice().sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at));
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
        <div class="conv-nombre">${s(nombre)} <span class="conv-hora">${ultimo ? horaCorta(ultimo.sent_at) : ''}</span></div>
        <div class="conv-ultimo">${ultimo ? s(truncar(ultimo.content, 60)) : 'Sin mensajes'}</div>
        <div class="conv-badges">
          <span class="conv-badge badge-${claseEstado}">${textoEstado}</span>
          ${conv.ia_urgencia === 'alta' ? '<span class="conv-badge badge-urgente">Urgente</span>' : ''}
          ${conv.ia_oportunidad != null ? `<span class="conv-badge badge-oport">⭐ ${conv.ia_oportunidad}</span>` : ''}
        </div>
      </div>
      ${noLeido ? '<div class="conv-unread">●</div>' : ''}
    </div>`;
}

// ── Burbuja de mensaje (panel derecho) ───────────────────────────
function mensajeHtml(m) {
  const clase = m.sender_type === 'cliente' ? 'cliente' : m.sender_type === 'ia' ? 'ia-msg' : 'agente';
  const icono = clase === 'cliente' ? '🧑' : clase === 'ia-msg' ? '✨' : '🧑‍💼';
  return `
    <div class="msg ${clase}">
      <div class="msg-avatar">${icono}</div>
      <div>
        ${clase === 'ia-msg' ? '<div class="msg-ia-badge">✨ IA</div>' : ''}
        <div class="msg-burbuja">${s(m.content)}</div>
        <div class="msg-hora">${horaCorta(m.sent_at)}</div>
      </div>
    </div>`;
}

function agregarMensajeAlChat(mensaje) {
  const cont = document.getElementById(`mensajes-${mensaje.conversation_id}`);
  if (!cont) return;
  cont.insertAdjacentHTML('beforeend', mensajeHtml(mensaje));
  cont.scrollTop = cont.scrollHeight;
}

// ── Lista de conversaciones ───────────────────────────────────────
async function cargarConversaciones(supabase, companyId, canal) {
  _canalActivo = canal;
  const lista = document.getElementById(`conv-list-${companyId}`);
  if (!lista) return;

  const { data: conversaciones, error } = await supabase
    .from('conversations')
    .select('*, customers(full_name), messages(content, sent_at, sender_type, direction)')
    .eq('company_id', companyId)
    .eq('channel', canal)
    .order('last_message_at', { ascending: false });

  if (error) {
    lista.innerHTML = '<div class="hub-empty"><p>Error al cargar conversaciones.</p></div>';
    return;
  }

  const convs = conversaciones ?? [];
  lista.innerHTML = convs.length
    ? convs.map(c => conversacionCardHtml(c, companyId)).join('')
    : '<div class="hub-empty"><p>No hay conversaciones todavía.</p></div>';

  // Nombre del contacto asignado como propiedad del DOM (no como
  // atributo HTML): sHtml() escapa para contenido de texto, no para
  // contexto de atributo, y el nombre viene de Meta (dato externo,
  // no confiable) — insertarlo en un string de HTML como atributo
  // sería una vía de XSS si trae comillas.
  lista.querySelectorAll('.conv-item').forEach(item => {
    const conv = convs.find(c => String(c.id) === item.dataset.convId);
    if (conv) item.dataset.nombre = nombreDe(conv).toLowerCase();
  });

  const [{ count: countFb }, { count: countIg }] = await Promise.all([
    supabase.from('conversations').select('id', { count: 'exact', head: true })
      .eq('company_id', companyId).eq('channel', 'facebook').eq('status', 'nuevo'),
    supabase.from('conversations').select('id', { count: 'exact', head: true })
      .eq('company_id', companyId).eq('channel', 'instagram').eq('status', 'nuevo'),
  ]);
  const badgeFb = document.getElementById(`badge-fb-${companyId}`);
  const badgeIg = document.getElementById(`badge-ig-${companyId}`);
  if (badgeFb) badgeFb.textContent = countFb ?? 0;
  if (badgeIg) badgeIg.textContent = countIg ?? 0;
}

// ── Abrir conversación (panel derecho) ────────────────────────────
async function abrirConversacion(supabase, convId, companyId, perfil) {
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
  const sugerenciaIA = [...mensajes].reverse().find(m => m.sender_type === 'ia');

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
        <div class="ia-sugerencia" onclick="window.usarSugerenciaIA('${convId}')">
          <span>${s(sugerenciaIA.content)}</span>
          <span class="ia-sugerencia-usar">Usar respuesta →</span>
        </div>` : ''}
      </div>
    </div>` : ''}
    ${tagsHtml(conv, companyId, convId)}
    <div class="mensajes" id="mensajes-${convId}">
      ${mensajes.map(mensajeHtml).join('')}
    </div>
    <div class="resp-box">
      <textarea class="resp-input" id="resp-${convId}" placeholder="Escribe una respuesta..."></textarea>
      <button class="btn-enviar" onclick="window.enviarRespuesta('${convId}','${companyId}')">Enviar →</button>
    </div>`;

  const contMensajes = document.getElementById(`mensajes-${convId}`);
  if (contMensajes) contMensajes.scrollTop = contMensajes.scrollHeight;

  window._perfilActual = perfil;
  window._supabaseHub = supabase;
}

// ── Envío de respuesta ────────────────────────────────────────────
// Nunca llama a Graph API directo ni guarda META_PAGE_TOKEN aquí — ese
// secreto solo vive en la Edge Function meta-send-message (CLAUDE.md
// §5, ADR-007). Este wrapper solo invoca la función con la sesión del
// usuario ya autenticado.
export async function enviarRespuestaMeta(supabase, convId, companyId, contenido) {
  const { data, error } = await supabase.functions.invoke('meta-send-message', {
    body: { conversation_id: convId, content: contenido },
  });

  if (error || data?.error) {
    showToast(data?.error || 'No se pudo enviar la respuesta', 'error');
    return;
  }

  const textarea = document.getElementById(`resp-${convId}`);
  if (textarea) textarea.value = '';

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
      cargarConversaciones(supabase, companyId, _canalActivo);
      if (window._convAbierta === payload.new.conversation_id) {
        agregarMensajeAlChat(payload.new);
      }
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

window.usarSugerenciaIA = function (convId) {
  const textarea = document.getElementById(`resp-${convId}`);
  const sugerencia = document.querySelector('.ia-sugerencia span');
  if (textarea && sugerencia) textarea.value = sugerencia.textContent;
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
}
