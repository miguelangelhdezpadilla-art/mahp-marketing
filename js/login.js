import { supabaseClient, roleHome } from './supabaseClient.js';

let modoSignup = false;
window.supabaseClient = supabaseClient;

window.alternarModo = function(e) {
  e.preventDefault();
  modoSignup = !modoSignup;
  document.getElementById('tituloFormulario').textContent = modoSignup ? 'Crear cuenta' : 'Iniciar sesión';
  document.getElementById('btnLogin').style.display = modoSignup ? 'none' : 'block';
  document.getElementById('btnSignup').style.display = modoSignup ? 'block' : 'none';
  document.getElementById('enlaceAlternar').textContent = modoSignup ? '¿Ya tienes cuenta? Inicia sesión' : '¿Eres nuevo? Crea tu cuenta aquí';
  document.getElementById('mensaje').textContent = '';
};

function mostrarMensaje(texto, esError) {
  let el = document.getElementById('mensaje');
  el.textContent = texto;
  el.className = esError ? 'mensaje-error' : 'mensaje-ok';
}

async function irADashboard(userId) {
  let { data: perfil, error } = await supabaseClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !perfil) {
    mostrarMensaje('Tu cuenta fue creada pero todavía no tiene acceso asignado. Pide a tu administrador que te invite con este mismo correo.', true);
    await supabaseClient.auth.signOut();
    return;
  }

  window.location.href = roleHome(perfil.role);
}

window.iniciarSesion = async function() {
  let email = document.getElementById('email').value;
  let password = document.getElementById('password').value;

  if (!email || !password) {
    mostrarMensaje('Completa correo y contraseña.', true);
    return;
  }

  let { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    mostrarMensaje('No se pudo iniciar sesión: ' + error.message, true);
    return;
  }

  await irADashboard(data.user.id);
};

window.crearCuenta = async function() {
  let email = document.getElementById('email').value;
  let password = document.getElementById('password').value;

  if (!email || !password) {
    mostrarMensaje('Completa correo y contraseña.', true);
    return;
  }

  let { data, error } = await supabaseClient.auth.signUp({ email, password });
  if (error) {
    mostrarMensaje('No se pudo crear la cuenta: ' + error.message, true);
    return;
  }

  if (data.session) {
    await irADashboard(data.user.id);
  } else {
    mostrarMensaje('Cuenta creada. Revisa tu correo para confirmar tu cuenta y luego inicia sesión.', false);
  }
};

// Si ya hay una sesión activa, saltar directo al dashboard correspondiente
(async function() {
  let { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    await irADashboard(session.user.id);
  }
})();
