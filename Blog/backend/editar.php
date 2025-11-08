<?php
require_once "conexion.php";

define("ADMIN_KEY", "admin123"); // Debe coincidir con JS y guardar.php

if ($_POST["admin_key"] !== ADMIN_KEY) exit("Clave incorrecta");

$id = intval($_POST["id"]);
$titulo = trim($_POST["titulo"]);
$contenido = trim($_POST["contenido"]);

if ($id <= 0 || empty($titulo) || empty($contenido)) exit("Faltan datos");

// Obtener blog actual para saber si tiene imagen
$res = $conn->query("SELECT imagen_path FROM blogs WHERE id=$id");
$blog = $res->fetch_assoc();
$imagen_path = $blog["imagen_path"];

// Si el usuario subió una nueva imagen:
if (isset($_FILES["imagen"]) && $_FILES["imagen"]["error"] === 0) {

    // Carpeta uploads
    $uploads = __DIR__ . "/../uploads/";
    if (!is_dir($uploads)) mkdir($uploads, 0755, true);

    $ext = pathinfo($_FILES["imagen"]["name"], PATHINFO_EXTENSION);
    $filename = uniqid("blog_", true) . "." . strtolower($ext);
    $destino = $uploads . $filename;

    if (move_uploaded_file($_FILES["imagen"]["tmp_name"], $destino)) {
        // BORRAR la imagen anterior si existe
        $oldFile = $_SERVER["DOCUMENT_ROOT"] . $imagen_path;
        if (file_exists($oldFile)) unlink($oldFile);

        // actualizar ruta
        $imagen_path = "/Blog/uploads/" . $filename;
    }
}

// Actualizar la DB
$stmt = $conn->prepare("UPDATE blogs SET titulo=?, contenido=?, imagen_path=? WHERE id=?");
$stmt->bind_param("sssi", $titulo, $contenido, $imagen_path, $id);
$stmt->execute();
$stmt->close();

echo "OK";
