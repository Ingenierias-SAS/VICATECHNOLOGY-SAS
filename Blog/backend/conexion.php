<?php
$host = "localhost";
$user = "vicatech_vica_admin";
$pass = "Vicacolombia100#";
$db   = "vicatech_vicatech_blog";


$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}

$conn->set_charset("utf8mb4");


