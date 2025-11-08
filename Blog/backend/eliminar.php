<?php
require_once "conexion.php";

define("ADMIN_KEY", "admin123");

if ($_POST["admin_key"] !== ADMIN_KEY) exit("Clave incorrecta");

$id = intval($_POST["id"]);

// obtener la ruta de la imagen
$res = $conn->query("SELECT imagen_path FROM blogs WHERE id=$id");
$row = $res->fetch_assoc();
if ($row) {
  $file = $_SERVER["DOCUMENT_ROOT"] . $row["imagen_path"];
  if (file_exists($file)) unlink($file);
}

// borrar registro
$conn->query("DELETE FROM blogs WHERE id=$id");
echo "OK";
