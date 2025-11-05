// ================== MENÚ MÓVIL ==================
document.addEventListener('DOMContentLoaded', function() {

  const menuToggle = document.getElementById('menu-toggle');
  const navMenu = document.getElementById('menu-nav');

  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', function() {
      const isOpen = navMenu.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', isOpen);
    });

    // Cerrar menú al hacer clic en un enlace
    document.querySelectorAll('#menu-nav a').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', false);
      });
    });
  }

  // ================== HEADER TRANSPARENTE / NEGRO ==================
  const header = document.querySelector('header');

  function onScroll() {
    if (!header) return;
    const y = window.pageYOffset || document.documentElement.scrollTop || 0;
    const scrolled = y > 10; // unificar umbral con el resto del sitio
    header.classList.toggle('header-solid', scrolled);
    document.body.classList.toggle('scrolled', scrolled);
  }

  // Ejecuta una vez al inicio y cuando se hace scroll
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

});
