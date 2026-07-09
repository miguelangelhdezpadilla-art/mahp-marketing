// Marketing Activity Hub Pro — Landing Page pública
// Fase 1: solo el toggle del menú móvil. Sin lógica de la app,
// sin Supabase, sin autenticación.

const navbarToggle = document.getElementById('navbarToggle');
const navbarMenu = document.getElementById('navbarMenu');

navbarToggle?.addEventListener('click', () => {
  const abierto = navbarMenu.classList.toggle('abierto');
  navbarToggle.setAttribute('aria-expanded', abierto ? 'true' : 'false');
});

navbarMenu?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navbarMenu.classList.remove('abierto');
    navbarToggle?.setAttribute('aria-expanded', 'false');
  });
});

// Fase 3: revela con fade-in los elementos ".reveal" cuando entran
// en pantalla (secciones debajo del Hero, que no son visibles al cargar).
const elementosReveal = document.querySelectorAll('.reveal');

if (elementosReveal.length) {
  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach(entrada => {
      if (entrada.isIntersecting) {
        entrada.target.classList.add('visible');
        observador.unobserve(entrada.target);
      }
    });
  }, { threshold: .15 });

  elementosReveal.forEach(el => observador.observe(el));
}
