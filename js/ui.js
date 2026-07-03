// Modal y notificaciones propias, para no depender de alert()/confirm()/prompt()
// nativos del navegador (se ven anticuados y no se pueden estilizar).

const BADGE_POR_ESTADO = { pendiente: 'badge-slate', en_progreso: 'badge-amber', completada: 'badge-green' };

// Devuelve la clase completa (badge + color) para un status de actividad,
// según la paleta del design system (slate=pendiente, amber=en progreso, green=completada).
export function claseBadgeEstado(status) {
  return `badge ${BADGE_POR_ESTADO[status] || 'badge-slate'}`;
}

// Color del relleno de una barra de progreso (.progress-fill) según el avance.
export function claseNivelAvance(pct) {
  return pct >= 70 ? 'high' : pct >= 40 ? 'mid' : 'low';
}

// Sanitiza texto libre escrito por usuarios (notas, descripciones, estrategias)
// antes de insertarlo con innerHTML. Si DOMPurify está cargado en la página
// permite un set de tags seguros (negritas, listas, saltos de línea); si no,
// cae a texto plano escapado para que la app nunca quede expuesta a XSS.
export function sHtml(texto) {
  if (texto == null) return '';
  let str = String(texto);
  if (typeof window !== 'undefined' && window.DOMPurify) {
    return window.DOMPurify.sanitize(str, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'ul', 'ol', 'li', 'p'] });
  }
  let div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function asegurarContenedorToast() {
  let contenedor = document.getElementById("toast-container");
  if (!contenedor) {
    contenedor = document.createElement("div");
    contenedor.id = "toast-container";
    document.body.appendChild(contenedor);
  }
  return contenedor;
}

export function showToast(mensaje, tipo = "ok") {
  let contenedor = asegurarContenedorToast();
  let toast = document.createElement("div");
  toast.className = `toast toast-${tipo}`;
  toast.textContent = mensaje;
  contenedor.appendChild(toast);

  setTimeout(() => toast.classList.add("toast-saliendo"), 3000);
  setTimeout(() => toast.remove(), 3400);
}

function crearModalBase(contenidoHtml) {
  let overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `<div class="modal-caja">${contenidoHtml}</div>`;
  document.body.appendChild(overlay);
  return overlay;
}

export function showConfirm(mensaje) {
  return new Promise((resolve) => {
    let overlay = crearModalBase(`
      <p>${mensaje}</p>
      <div class="modal-botones">
        <button class="modal-btn-cancelar">Cancelar</button>
        <button class="modal-btn-aceptar">Confirmar</button>
      </div>
    `);

    overlay.querySelector(".modal-btn-cancelar").onclick = () => { overlay.remove(); resolve(false); };
    overlay.querySelector(".modal-btn-aceptar").onclick = () => { overlay.remove(); resolve(true); };
  });
}

function escAtributo(valor) {
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function showPrompt(mensaje, valorInicial = "") {
  return new Promise((resolve) => {
    let overlay = crearModalBase(`
      <p>${mensaje}</p>
      <input type="text" class="modal-input" value="${escAtributo(valorInicial)}">
      <div class="modal-botones">
        <button class="modal-btn-cancelar">Cancelar</button>
        <button class="modal-btn-aceptar">Aceptar</button>
      </div>
    `);

    let input = overlay.querySelector(".modal-input");
    input.focus();
    input.select();

    let confirmar = () => { overlay.remove(); resolve(input.value); };
    overlay.querySelector(".modal-btn-cancelar").onclick = () => { overlay.remove(); resolve(null); };
    overlay.querySelector(".modal-btn-aceptar").onclick = confirmar;
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") confirmar(); });
  });
}

// Modal de solo lectura con un botón "Cerrar" — para mostrar listas u
// otra información que no necesita confirmación ni respuesta del usuario.
export function showInfo(tituloHtml, contenidoHtml) {
  let overlay = crearModalBase(`
    <h3 style="margin-top:0;">${tituloHtml}</h3>
    <div>${contenidoHtml}</div>
    <div class="modal-botones">
      <button class="modal-btn-aceptar" style="flex:none; width:100%;">Cerrar</button>
    </div>
  `);
  overlay.querySelector(".modal-btn-aceptar").onclick = () => overlay.remove();
}

// Navegación por pestañas (.tab-panel + .bottom-nav), compartida por las 4
// páginas con sesión. El primer tab/navbtn debe traer la clase "activo" ya
// puesta en el HTML; esta función solo define el manejador de clic.
export function configurarTabs() {
  window.cambiarTab = function(nombre) {
    document.querySelectorAll('.tab-panel').forEach((el) => el.classList.remove('activo'));
    document.querySelectorAll('.bottom-nav button').forEach((el) => el.classList.remove('activo'));
    document.getElementById(`tab-${nombre}`).classList.add('activo');
    document.getElementById(`navbtn-${nombre}`).classList.add('activo');
  };
}

// Campanita de notificaciones, compartida por las 4 páginas con sesión.
// Asume que el topbar tiene un <span id="contadorNotif"> y que existe
// en algún lugar de la página un <div id="panelNotificaciones">.
export async function configurarNotificaciones(supabaseClient, userId) {
  async function cargar() {
    let { data } = await supabaseClient
      .from("notifications")
      .select("*")
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    let noLeidas = (data || []).filter((n) => !n.read).length;
    let contador = document.getElementById("contadorNotif");
    if (contador) {
      contador.style.display = noLeidas > 0 ? "block" : "none";
    }

    let panel = document.getElementById("panelNotificaciones");
    if (panel) {
      panel.innerHTML = (data && data.length)
        ? data.map((n) => `
            <div class="notif-item ${n.read ? "" : "unread"}">
              ${sHtml(n.message)}
              <div style="font-size:0.75em; color:var(--slate-300); margin-top:4px;">${new Date(n.created_at).toLocaleString()}</div>
            </div>`).join("")
        : '<div class="empty-state" style="padding:20px;"><i class="fa-solid fa-bell-slash"></i><p>Sin notificaciones.</p></div>';
    }
  }

  window.toggleNotificaciones = async function() {
    let panel = document.getElementById("panelNotificaciones");
    if (!panel) return;
    let abierto = panel.style.display !== "none";

    if (abierto) { panel.style.display = "none"; return; }

    panel.style.display = "block";
    await supabaseClient.from("notifications").update({ read: true }).eq("recipient_id", userId).eq("read", false);
    await cargar();
  };

  await cargar();
}
