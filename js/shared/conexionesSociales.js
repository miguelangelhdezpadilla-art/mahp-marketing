// Cuadro "Conexiones sociales" del Social Hub (MIP-002 §8). El admin de
// la empresa conecta su propia página con Facebook Login for Business.
// El estado se lee sin tokens (my_meta_connections); toda escritura
// pasa por la Edge Function meta-oauth. App ID y config_id no son secretos.
import { sHtml as s, showToast, showConfirm } from '../ui.js';

const APP_ID = '1011783041707142';
const CONFIG_ID = '1683981806659523';
const GRAPH_VERSION = 'v26.0';

const CANALES = [
  { id: 'facebook', nombre: 'Facebook', icono: '📘' },
  { id: 'instagram', nombre: 'Instagram', icono: '📸' },
];

const ESTADOS = {
  conectada: { texto: 'Conectada', clase: 'cs-ok' },
  permisos_insuficientes: { texto: 'Faltan permisos', clase: 'cs-alerta' },
  requiere_reconexion: { texto: 'Requiere reconexión', clase: 'cs-alerta' },
  token_invalido: { texto: 'Requiere reconexión', clase: 'cs-alerta' },
  error_sincronizacion: { texto: 'Error de sincronización', clase: 'cs-error' },
};

let _sdkListo = null;

// El SDK se carga al mostrar el cuadro, no al hacer clic: si el clic
// tuviera que esperar la carga, el navegador bloquearía la ventana de Meta.
function cargarSdkMeta() {
  if (_sdkListo) return _sdkListo;
  _sdkListo = new Promise((resolve, reject) => {
    window.fbAsyncInit = () => {
      window.FB.init({ appId: APP_ID, cookie: false, xfbml: false, version: GRAPH_VERSION });
      resolve();
    };
    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/es_LA/sdk.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onerror = () => {
      _sdkListo = null;
      reject(new Error('No se pudo cargar la ventana de Meta'));
    };
    document.head.appendChild(script);
  });
  return _sdkListo;
}

async function llamar(supabase, cuerpo) {
  const { data, error } = await supabase.functions.invoke('meta-oauth', { body: cuerpo });
  if (error) {
    // supabase-js entrega el detalle de un 4xx/5xx en error.context
    let detalle = null;
    try { detalle = (await error.context.json()).error; } catch { /* sin cuerpo JSON */ }
    throw new Error(detalle || error.message);
  }
  return data;
}

function filaCanal(canal, conexion, puedeAdministrar) {
  const activa = conexion && conexion.status !== 'desconectada';
  const estado = activa ? (ESTADOS[conexion.status] ?? { texto: conexion.status, clase: 'cs-alerta' }) : null;

  let detalle;
  if (activa) {
    const quien = conexion.connected_by_name ? ` · Conectó: ${s(conexion.connected_by_name)}` : '';
    detalle = `<strong>${s(conexion.page_name || conexion.page_id)}</strong>${quien}`;
    if (conexion.last_error) detalle += `<div class="cs-error-texto">${s(conexion.last_error)}</div>`;
  } else if (canal.id === 'instagram') {
    detalle = 'Se conecta junto con Facebook si tu cuenta profesional está vinculada a tu página.';
  } else {
    detalle = 'Conecta tu página para recibir y responder mensajes aquí.';
  }

  const acciones = activa && puedeAdministrar
    ? `<button type="button" class="cs-btn-sec" data-cs-desconectar="${conexion.id}" data-cs-nombre="${s(conexion.page_name || canal.nombre)}">Desconectar</button>`
    : '';

  return `
    <div class="cs-fila">
      <div class="cs-icono" aria-hidden="true">${canal.icono}</div>
      <div class="cs-info">
        <div class="cs-nombre">${canal.nombre}
          <span class="cs-estado ${estado ? estado.clase : 'cs-neutro'}">${estado ? estado.texto : 'No conectada'}</span>
        </div>
        <div class="cs-detalle">${detalle}</div>
      </div>
      <div class="cs-acciones">${acciones}</div>
    </div>`;
}

function mostrarSelectorPaginas(contenedor, paginas, alElegir) {
  const zona = contenedor.querySelector('.cs-zona');
  zona.innerHTML = `
    <p class="cs-mensaje">Elige la página que quieres conectar:</p>
    <div class="cs-paginas">
      ${paginas.map(p => `
        <button type="button" class="cs-pagina" data-cs-pagina="${s(p.id)}">
          <strong>${s(p.name)}</strong>
          ${p.instagram ? `<span>📸 @${s(p.instagram)}</span>` : ''}
        </button>`).join('')}
    </div>`;
  zona.querySelectorAll('[data-cs-pagina]').forEach(b => {
    b.addEventListener('click', () => alElegir(b.dataset.csPagina));
  });
}

export async function renderConexionesSociales(supabase, companyId, perfil, idContenedor) {
  const contenedor = document.getElementById(idContenedor);
  if (!contenedor) return;

  const puedeAdministrar = ['company_admin', 'super_admin'].includes(perfil?.role);

  const aviso = (texto, clase = '') => {
    const zona = contenedor.querySelector('.cs-zona');
    if (zona) zona.innerHTML = texto ? `<p class="cs-mensaje ${clase}">${s(texto)}</p>` : '';
  };

  async function pintar() {
    const { data, error } = await supabase.rpc('my_meta_connections', { p_company_id: companyId });
    if (error) {
      console.error('[conexiones] estado:', error.message);
      contenedor.innerHTML = '<p class="cs-mensaje cs-error-texto">No se pudo cargar el estado de las conexiones.</p>';
      return;
    }

    const activaDe = (canal) => (data ?? []).find(c => c.channel === canal && c.status !== 'desconectada');
    const hayActiva = CANALES.some(c => activaDe(c.id));
    const requiereReconectar = (data ?? []).some(c => ['permisos_insuficientes', 'requiere_reconexion', 'token_invalido'].includes(c.status));

    contenedor.innerHTML = `
      <div class="cs-cuadro">
        <h3>Conexiones sociales</h3>
        ${CANALES.map(c => filaCanal(c, activaDe(c.id), puedeAdministrar)).join('')}
        ${puedeAdministrar ? `
          <div class="cs-botones">
            <button type="button" class="cs-btn-pri" id="csConectar">
              ${requiereReconectar || hayActiva ? 'Reconectar con Facebook' : 'Conectar con Facebook'}
            </button>
            ${hayActiva ? '<button type="button" class="cs-btn-sec" id="csVerificar">Verificar conexión</button>' : ''}
          </div>` : ''}
        <div class="cs-zona"></div>
      </div>`;

    if (!puedeAdministrar) return;

    contenedor.querySelector('#csConectar').addEventListener('click', conectar);
    contenedor.querySelector('#csVerificar')?.addEventListener('click', verificar);
    contenedor.querySelectorAll('[data-cs-desconectar]').forEach(b => {
      b.addEventListener('click', () => desconectar(Number(b.dataset.csDesconectar), b.dataset.csNombre));
    });
  }

  async function procesarResultado(resultado) {
    if (resultado.choose_page) {
      mostrarSelectorPaginas(contenedor, resultado.pages, async (pageId) => {
        aviso('Conectando…');
        try {
          await procesarResultado(await llamar(supabase, {
            action: 'connect', company_id: companyId, session_id: resultado.session_id, page_id: pageId,
          }));
        } catch (e) {
          aviso(e.message, 'cs-error-texto');
        }
      });
      return;
    }
    await pintar();
    if (resultado.connected) {
      showToast(`${resultado.page_name} quedó conectada`);
    } else {
      aviso(resultado.error || 'La conexión no quedó completa.', 'cs-error-texto');
    }
  }

  function conectar() {
    if (!window.FB) {
      aviso('La ventana de Meta todavía no carga. Intenta de nuevo en unos segundos.', 'cs-error-texto');
      cargarSdkMeta().catch(() => {});
      return;
    }
    aviso('Esperando a Meta… Completa los pasos en la ventana que se abrió.');
    // FB.login no acepta una función async como callback.
    window.FB.login((respuesta) => {
      const code = respuesta?.authResponse?.code;
      if (!code) {
        aviso('Se canceló la autorización. Puedes intentarlo de nuevo cuando quieras.');
        return;
      }
      aviso('Conectando…');
      llamar(supabase, { action: 'exchange', company_id: companyId, code })
        .then(procesarResultado)
        .catch(e => aviso(e.message, 'cs-error-texto'));
    }, {
      config_id: CONFIG_ID,
      response_type: 'code',
      override_default_response_type: true,
    });
  }

  async function verificar() {
    aviso('Verificando…');
    try {
      await llamar(supabase, { action: 'verify', company_id: companyId });
      await pintar();
      showToast('Conexión verificada');
    } catch (e) {
      aviso(e.message, 'cs-error-texto');
    }
  }

  async function desconectar(connectionId, nombre) {
    const ok = await showConfirm(`¿Desconectar <strong>${s(nombre)}</strong>? Dejarás de recibir y enviar sus mensajes en MAHP.`);
    if (!ok) return;
    try {
      await llamar(supabase, { action: 'disconnect', company_id: companyId, connection_id: connectionId });
      await pintar();
      showToast('Conexión eliminada');
    } catch (e) {
      aviso(e.message, 'cs-error-texto');
    }
  }

  await pintar();
  if (puedeAdministrar) {
    cargarSdkMeta().catch(e => console.error('[conexiones] SDK de Meta:', e.message));
  }
}
