function abrirModal(id) {
  document.getElementById(id).style.display = "flex";
}

function cerrarModal(id) {
  document.getElementById(id).style.display = "none";
}

function cerrarSiFondo(event, id) {
  let modal = document.getElementById(id);
  if (event.target === modal) { 
    modal.style.display = "none"; 
  }
}

document.addEventListener('DOMContentLoaded', function() {
  // ===== Menú hamburguesa =====
  const menuToggle = document.getElementById('menu-toggle');
  const navMenu = document.getElementById('menu-nav');
  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', function() {
      const isOpen = navMenu.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', isOpen);
    });
  }

  // ===== Tooltip de los slices =====
  const slices = document.querySelectorAll('.slice-content');
  const tooltip = document.getElementById('tooltip');

  if (slices.length > 0 && tooltip) {
    slices.forEach(slice => {
      slice.addEventListener('mouseenter', () => {
        tooltip.innerText = slice.getAttribute('data-info');
        tooltip.style.display = 'block';
      });

      slice.addEventListener('mousemove', (e) => {
        tooltip.style.left = (e.pageX - tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = (e.pageY - tooltip.offsetHeight - 15) + 'px';
      });

      slice.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
      });
    });
  }

  // ===== Modal "Ver más empresas aliadas" =====
  const verMasBtn = document.getElementById("verMasBtn");
  const modalAliados = document.getElementById("modalAliados");
  const cerrarBtnAliados = modalAliados ? modalAliados.querySelector(".cerrar") : null;

  if (verMasBtn && modalAliados) {
    verMasBtn.addEventListener("click", () => abrirModal("modalAliados"));
  }

  if (cerrarBtnAliados) {
    cerrarBtnAliados.addEventListener("click", () => cerrarModal("modalAliados"));
  }

  window.addEventListener("click", (event) => cerrarSiFondo(event, "modalAliados"));
});







