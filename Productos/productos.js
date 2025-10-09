document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.getElementById('menu-toggle');
  const menuNav = document.getElementById('menu-nav');

  if (!menuToggle || !menuNav) return;

  menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', !expanded);
    menuNav.classList.toggle('active');
    document.body.classList.toggle('menu-open');
  });

  // Cerrar al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 900 && menuNav.classList.contains('active')) {
      if (!menuNav.contains(e.target) && e.target !== menuToggle) {
        menuNav.classList.remove('active');
        document.body.classList.remove('menu-open');
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    }
  });

  // Cerrar al hacer clic en un enlace
  menuNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 900) {
        menuNav.classList.remove('active');
        document.body.classList.remove('menu-open');
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    });
  });
});

