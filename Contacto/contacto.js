const menuToggle = document.getElementById('menu-toggle');
const menuNav = document.getElementById('menu-nav');

menuToggle.addEventListener('click', () => {
  const expanded = menuToggle.getAttribute('aria-expanded') === 'true' || false;
  menuToggle.setAttribute('aria-expanded', !expanded);
  menuNav.classList.toggle('active');
});

// Header transparente -> negro al hacer scroll (Contacto)
try {
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
} catch (_) {}
