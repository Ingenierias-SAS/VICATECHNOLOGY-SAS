document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.getElementById('menu-toggle');
  const menuNav = document.getElementById('menu-nav');

  if (!menuToggle || !menuNav) return;

  // Abrir / cerrar menú
  menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', !expanded);
    menuNav.classList.toggle('active');
    document.body.classList.toggle('menu-open');
  });

  // Cerrar clic fuera del menú
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 900 && menuNav.classList.contains('active')) {
      if (!menuNav.contains(e.target) && e.target !== menuToggle) {
        menuNav.classList.remove('active');
        document.body.classList.remove('menu-open');
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    }
  });

  // Cerrar menú al seleccionar una opción
  menuNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 900) {
        menuNav.classList.remove('active');
        document.body.classList.remove('menu-open');
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    });
  });

  // Header sólido al hacer scroll
  const header = document.querySelector('header');
  const onScroll = () => {
    const y = window.pageYOffset || document.documentElement.scrollTop || 0;
    const scrolled = y > 10;
    header.classList.toggle('header-solid', scrolled);
    document.body.classList.toggle('scrolled', scrolled);
  };

  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
});

