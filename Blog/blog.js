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

  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 900 && menuNav.classList.contains('active')) {
      if (!menuNav.contains(e.target) && e.target !== menuToggle) {
        menuNav.classList.remove('active');
        document.body.classList.remove('menu-open');
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    }
  });

  menuNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 900) {
        menuNav.classList.remove('active');
        document.body.classList.remove('menu-open');
        menuToggle.setAttribute('aria-expanded', false);
      }
    });
  });
  
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

// ======================================================
// ===============   LÓGICA DEL BLOG   ==================
// ======================================================

const blogsContainer = document.getElementById("blogs-container");
const newBlogBtn = document.getElementById("new-blog-btn");
const modal = document.getElementById("blog-modal");
const viewModal = document.getElementById("blog-view-modal");
const close = document.querySelector(".close");
const closeView = document.querySelector(".close-view");
const saveBlogBtn = document.getElementById("save-blog-btn");
const imgInput = document.getElementById("blog-img");
const titleInput = document.getElementById("blog-title");
const textInput = document.getElementById("blog-text");
const adminKeyInput = document.getElementById("admin-key");

let blogs = [];
const ADMIN_KEY = "admin123";
let blogEditID = null;

// ====== Cargar blogs desde BD ======
function cargarBlogs() {
  fetch("./backend/obtener.php")
    .then(r => r.json())
    .then(data => {
      blogs = data;
      renderBlogs();
    });
}

// ====== Render ======
function renderBlogs() {
  blogsContainer.innerHTML = "";
  blogs.forEach(blog => {
    const card = document.createElement("div");
    card.className = "blog-card";
    card.innerHTML = `
      <img src="${blog.imagen_path}" alt="Blog image">
      <div>
        <h3>${blog.titulo}</h3>
        <p>${blog.contenido.substring(0,150)}...</p>
        <div class="blog-actions">
          <button class="edit-btn">Modificar</button>
          <button class="delete-btn">Eliminar</button>
        </div>
      </div>
    `;

    // Ver blog completo
    card.addEventListener("click", (e) => {
      if (!e.target.classList.contains("edit-btn") && !e.target.classList.contains("delete-btn")) {
        document.getElementById("view-img").src = blog.imagen_path;
        document.getElementById("view-title").textContent = blog.titulo;
        document.getElementById("view-text").textContent = blog.contenido;
        viewModal.style.display = "flex";
      }
    });

    // Editar
    card.querySelector(".edit-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      const key = prompt("Ingrese la clave:");
      if (key !== ADMIN_KEY) return alert("Clave incorrecta");

      blogEditID = blog.id;
      titleInput.value = blog.titulo;
      textInput.value = blog.contenido;
      imgInput.value = "";
      adminKeyInput.value = "";

      saveBlogBtn.setAttribute("data-mode", "edit");
      modal.style.display = "flex";
    });

    // Eliminar
    card.querySelector(".delete-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      const key = prompt("Ingrese la clave:");
      if (key !== ADMIN_KEY) return alert("Clave incorrecta");

      const formData = new URLSearchParams();
      formData.append("id", blog.id);
      formData.append("admin_key", ADMIN_KEY);

      fetch("./backend/eliminar.php", { method: "POST", body: formData })
        .then(r => r.text())
        .then(resp => resp === "OK" ? cargarBlogs() : alert(resp));
    });

    blogsContainer.appendChild(card);
  });
}

// ====== Crear nuevo blog ======
newBlogBtn.onclick = () => {
  blogEditID = null;
  imgInput.value = "";
  adminKeyInput.value = "";
  titleInput.value = "";
  textInput.value = "";
  saveBlogBtn.setAttribute("data-mode", "new");
  modal.style.display = "flex";
};

// ====== Guardar (nuevo o edición) ======
saveBlogBtn.onclick = () => {
  if (adminKeyInput.value !== ADMIN_KEY) return alert("Clave incorrecta");

  const formData = new FormData();
  formData.append("admin_key", ADMIN_KEY);
  formData.append("titulo", titleInput.value);
  formData.append("contenido", textInput.value);

  if (imgInput.files[0]) formData.append("imagen", imgInput.files[0]);

  // Modo EDITAR
  if (saveBlogBtn.getAttribute("data-mode") === "edit" && blogEditID !== null) {
    formData.append("id", blogEditID);
    fetch("./backend/editar.php", { method: "POST", body: formData })
      .then(r => r.text())
      .then(resp => resp === "OK" ? (modal.style.display="none", cargarBlogs()) : alert(resp));
  }
  // Modo CREAR
  else {
    fetch("./backend/guardar.php", { method: "POST", body: formData })
      .then(r => r.text())
      .then(resp => resp === "OK" ? (modal.style.display="none", cargarBlogs()) : alert(resp));
  }
};

// ====== Cerrar modales ======
close.onclick = () => modal.style.display = "none";
closeView.onclick = () => viewModal.style.display = "none";

// ====== Inicializar ======
cargarBlogs();
