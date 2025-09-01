const menuToggle = document.getElementById('menu-toggle');
const menuNav = document.getElementById('menu-nav');

menuToggle.addEventListener('click', () => {
  const expanded = menuToggle.getAttribute('aria-expanded') === 'true' || false;
  menuToggle.setAttribute('aria-expanded', !expanded);
  menuNav.classList.toggle('active');
});