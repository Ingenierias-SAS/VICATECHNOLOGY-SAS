// Header transparente -> negro al hacer scroll (robusto y global)
(function(){
  let initialized = false;
  function init(){
    if (initialized) return; initialized = true;
    const header = document.querySelector('header');
    if (!header) return;
    const apply = () => {
      const y = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      const scrolled = y > 10;
      header.classList.toggle('header-solid', scrolled);
      document.body.classList.toggle('scrolled', scrolled);
    };
    apply();
    window.addEventListener('scroll', apply, { passive: true });
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(init, 0);
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
  window.addEventListener('load', init);
})();

