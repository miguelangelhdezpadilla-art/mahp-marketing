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

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    window.location.href = roleHome(profile.role);
    return null;
  }

  return { session, profile };
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
