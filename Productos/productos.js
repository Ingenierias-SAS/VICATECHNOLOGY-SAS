const menuToggle = document.getElementById('menu-toggle');
const menuNav = document.getElementById('menu-nav');

menuToggle.addEventListener('click', () => {
  const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', !isExpanded);
  menuNav.classList.toggle('active');
});