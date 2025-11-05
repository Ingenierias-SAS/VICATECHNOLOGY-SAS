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

  // Header transparente -> negro al hacer scroll
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

  // Swap de imagen del banner en móviles (Consultorías)
  try {
    const heroImg = document.querySelector('.bunker-servicios img.img-infra');
    if (heroImg) {
      const desktopSrc = heroImg.getAttribute('src') || '';
      // Inserta '-movil' antes de la extensión del archivo actual
      const mobileSrc = desktopSrc.replace(/(\.[a-z0-9]+)(\?.*)?$/i, '-movil$1');
      const applySwap = () => {
        if (window.innerWidth <= 768) {
          heroImg.setAttribute('src', mobileSrc);
        } else {
          heroImg.setAttribute('src', desktopSrc);
        }
      };
      applySwap();
      window.addEventListener('resize', applySwap);
    }
  } catch (_) { /* silencioso */ }
});
