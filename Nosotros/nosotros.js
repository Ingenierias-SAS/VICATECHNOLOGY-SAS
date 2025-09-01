document.addEventListener('DOMContentLoaded', function() {
  const menuToggle = document.getElementById('menu-toggle');
  const navMenu = document.getElementById('menu-nav');
  menuToggle.addEventListener('click', function() {
    const isOpen = navMenu.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', isOpen);
  });
  // Opcional: cerrar menú al hacer clic en un enlace
  document.querySelectorAll('#menu-nav a').forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', false);
    });
  });
});