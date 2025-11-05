document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.getElementById('menu-toggle');
  const menuNav = document.getElementById('menu-nav');

  menuToggle.addEventListener('click', () => {
    const expanded = menuToggle.getAttribute('aria-expanded') === 'true' || false;
    menuToggle.setAttribute('aria-expanded', !expanded);
    menuNav.classList.toggle('active');
  });

  // Opcional: cerrar menú al hacer clic en un enlace
  menuNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menuNav.classList.remove('active');
      menuToggle.setAttribute('aria-expanded', false);
    });
  });

  // Header transparente -> negro al hacer scroll (Servicios)
  const header = document.querySelector('header');
  const onScroll = () => {
    if (!header) return;
    const y = window.pageYOffset || document.documentElement.scrollTop || 0;
    const scrolled = y > 10;
    header.classList.toggle('header-solid', scrolled);
    document.body.classList.toggle('scrolled', scrolled);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
});
