const SUPABASE_URL = "https://qahhwfthhvacumeitgan.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_A_bfwD2IAbviuy-r9E5D-A_Opvm6IQ5";

export const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

export function roleHome(role) {
  switch (role) {
    case "super_admin": return "admin.html";
    case "company_admin": return "empresa.html";
    case "director": return "directivo.html";
    case "collaborator": return "colaborador.html";
    default: return "login.html";
  }
}

// Verifica sesión + perfil y, si se pasan roles permitidos, redirige
// fuera de la página si el rol del usuario no corresponde.
export async function requireSession(allowedRoles) {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return null;
  }

  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (error || !profile) {
    alert("Tu cuenta no tiene un perfil asignado todavía. Contacta al administrador.");
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
    return null;
  }

  if (profile.active === false) {
    alert("Tu acceso fue revocado. Contacta a tu administrador si crees que es un error.");
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
    return null;
  }

  // Multiempresa (ADR-021): profile.company_id/role es la empresa
  // activa. Si esa membresía fue revocada, saltar a otra empresa de la
  // cuenta; si no queda ninguna, la cuenta ya no tiene acceso.
  if (profile.role !== "super_admin") {
    const { data: empresas, error: errEmpresas } = await supabaseClient.rpc("my_companies");
    if (errEmpresas) {
      console.error("[auth] my_companies:", errEmpresas.message);
    } else if (!empresas.length) {
      alert("Tu acceso fue revocado. Contacta a tu administrador si crees que es un error.");
      await supabaseClient.auth.signOut();
      window.location.href = "login.html";
      return null;
    } else if (!empresas.some(e => e.is_current)) {
      await cambiarEmpresa(empresas[0].company_id);
      return null;
    } else if (empresas.length > 1) {
      montarSelectorEmpresa(empresas);
    }
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    window.location.href = roleHome(profile.role);
    return null;
  }

  return { session, profile };
}

// Cambia la empresa activa y abre el panel del rol que la cuenta
// tiene en esa empresa (puede ser distinto: admin en una, director en otra).
export async function cambiarEmpresa(companyId) {
  const { data: rol, error } = await supabaseClient.rpc("switch_company", { p_company_id: companyId });
  if (error) {
    alert("No se pudo cambiar de empresa: " + error.message);
    return;
  }
  window.location.href = roleHome(rol);
}

// Si el correo invitado ya tenía cuenta, la base de datos aplica la
// invitación al momento (v24) y la marca como usada.
export async function mensajeInvitacionCreada(inviteId) {
  const { data } = await supabaseClient.from("invites").select("used").eq("id", inviteId).single();
  return data?.used
    ? "✅ Esa cuenta ya existía: ya tiene acceso a la empresa."
    : "✅ Invitación creada. Esa persona debe crear su cuenta en login.html con ese mismo correo.";
}

function montarSelectorEmpresa(empresas) {
  const acciones = document.querySelector(".topbar-actions");
  if (!acciones || document.getElementById("selectorEmpresa")) return;

  const etiquetaRol = { company_admin: "Admin", director: "Director", collaborator: "Colaborador" };
  const selector = document.createElement("select");
  selector.id = "selectorEmpresa";
  selector.className = "selector-empresa";
  selector.setAttribute("aria-label", "Cambiar de empresa");
  for (const e of empresas) {
    const opcion = document.createElement("option");
    opcion.value = e.company_id;
    opcion.textContent = `${e.name} · ${etiquetaRol[e.role] || e.role}`;
    opcion.selected = e.is_current;
    selector.appendChild(opcion);
  }
  selector.addEventListener("change", () => cambiarEmpresa(Number(selector.value)));
  acciones.prepend(selector);
}

export async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
}

// El Super Admin no tiene company_id propio: cuando entra a un panel
// operativo lo hace especificando ?company_id=... en la URL (ver botones
// "Ver panel operativo" en admin.html). Los demás roles usan su propia empresa.
export function resolveCompanyId(profile) {
  if (profile.role === "super_admin") {
    let param = new URLSearchParams(window.location.search).get("company_id");
    return param ? Number(param) : null;
  }
  return profile.company_id;
}

// Igual que resolveCompanyId pero para que el Super Admin pueda ver
// las tareas de un colaborador específico vía ?user_id=...
export function resolveUserId(profile) {
  if (profile.role === "super_admin") {
    return new URLSearchParams(window.location.search).get("user_id");
  }
  return profile.id;
}
