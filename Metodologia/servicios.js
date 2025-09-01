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
});