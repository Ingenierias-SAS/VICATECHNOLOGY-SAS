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
  const menuToggle = document.getElementById('menu-toggle');
  const navMenu = document.getElementById('menu-nav');
  menuToggle.addEventListener('click', function() {
    const isOpen = navMenu.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', isOpen);
  });
});

