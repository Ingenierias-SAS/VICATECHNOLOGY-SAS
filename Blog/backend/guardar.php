<?php
require_once "conexion.php";

define("ADMIN_KEY", "admin123"); // Cambia si quieres

if ($_POST["admin_key"] !== ADMIN_KEY) {
  http_response_code(401);
  exit("Clave incorrecta");
}

$titulo = trim($_POST["titulo"]);
$contenido = trim($_POST["contenido"]);

if (empty($titulo) || empty($contenido)) exit("Faltan datos");

if (!isset($_FILES["imagen"])) exit("Imagen requerida");

// Carpeta uploads
$uploads = __DIR__ . "/../uploads/";
if (!is_dir($uploads)) mkdir($uploads, 0755, true);

// Nombre único de archivo
$ext = pathinfo($_FILES["imagen"]["name"], PATHINFO_EXTENSION);
$filename = uniqid("blog_", true) . "." . strtolower($ext);
$destino = $uploads . $filename;

if (!move_uploaded_file($_FILES["imagen"]["tmp_name"], $destino)) {
  exit("Error guardando imagen");
}

// URL pública (NO CAMBIAR si la carpeta sigue siendo /blog/)
$imagen_path = "/Blog/uploads/" . $filename;

// Guardar en BD
$stmt = $conn->prepare("INSERT INTO blogs (imagen_path, titulo, contenido) VALUES (?, ?, ?)");
$stmt->bind_param("sss", $imagen_path, $titulo, $contenido);
$stmt->execute();
$stmt->close();

echo "OK";
