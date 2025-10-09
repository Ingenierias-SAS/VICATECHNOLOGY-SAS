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
});

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

let blogs = JSON.parse(localStorage.getItem("blogs")) || [];
let editIndex = null;
const ADMIN_KEY = "admin123";
let currentImage = ""; // almacena la imagen en Base64

// ==== Convertir archivo a Base64 ====
function fileToBase64(file, callback) {
  const reader = new FileReader();
  reader.onload = function(event) {
    callback(event.target.result);
  };
  reader.readAsDataURL(file);
}

// Detectar cuando el usuario sube una imagen
imgInput.addEventListener("change", () => {
  const file = imgInput.files[0];
  if (file) {
    fileToBase64(file, (base64) => {
      currentImage = base64;
    });
  }
});

// ==== Renderizar blogs ====
function renderBlogs() {
  blogsContainer.innerHTML = "";
  blogs.forEach((blog, index) => {
    const card = document.createElement("div");
    card.className = "blog-card";
    card.innerHTML = `
      <img src="${blog.img}" alt="Blog image">
      <div>
        <h3>${blog.title}</h3>
        <p>${blog.text.substring(0,150)}...</p>
        <div class="blog-actions">
          <button class="edit-btn">Modificar</button>
          <button class="delete-btn">Eliminar</button>
        </div>
      </div>
    `;
    
    // Ver completo
    card.addEventListener("click", (e) => {
      if (!e.target.classList.contains("edit-btn") && !e.target.classList.contains("delete-btn")) {
        document.getElementById("view-img").src = blog.img;
        document.getElementById("view-title").textContent = blog.title;
        document.getElementById("view-text").textContent = blog.text;
        viewModal.style.display = "flex";
      }
    });

    // Editar
    card.querySelector(".edit-btn").addEventListener("click", () => {
      const key = prompt("Ingrese la clave:");
      if (key === ADMIN_KEY) {
        editIndex = index;
        currentImage = blog.img;
        titleInput.value = blog.title;
        textInput.value = blog.text;
        modal.style.display = "flex";
      } else {
        alert("Clave incorrecta");
      }
    });

    // Eliminar
    card.querySelector(".delete-btn").addEventListener("click", () => {
      const key = prompt("Ingrese la clave:");
      if (key === ADMIN_KEY) {
        blogs.splice(index, 1);
        localStorage.setItem("blogs", JSON.stringify(blogs));
        renderBlogs();
      } else {
        alert("Clave incorrecta");
      }
    });

    blogsContainer.appendChild(card);
  });
}

// ==== Crear nuevo blog ====
newBlogBtn.onclick = () => {
  editIndex = null;
  currentImage = "";
  titleInput.value = "";
  textInput.value = "";
  adminKeyInput.value = "";
  imgInput.value = "";
  modal.style.display = "flex";
};

// ==== Guardar blog ====
saveBlogBtn.onclick = () => {
  if (adminKeyInput.value !== ADMIN_KEY) {
    alert("Clave incorrecta");
    return;
  }
  if (!currentImage) {
    alert("Por favor sube una imagen");
    return;
  }
  const blog = {
    img: currentImage,
    title: titleInput.value,
    text: textInput.value
  };
  if (editIndex !== null) {
    blogs[editIndex] = blog;
  } else {
    blogs.push(blog);
  }
  localStorage.setItem("blogs", JSON.stringify(blogs));
  modal.style.display = "none";
  renderBlogs();
};

// ==== Cerrar modales ====
close.onclick = () => modal.style.display = "none";
closeView.onclick = () => viewModal.style.display = "none";

// ==== Inicializar ====
renderBlogs();
