<?php
require_once "conexion.php";

$result = $conn->query("SELECT * FROM blogs ORDER BY fecha DESC");
$blogs = [];

while ($row = $result->fetch_assoc()) {
  $blogs[] = $row;
}

header("Content-Type: application/json");
echo json_encode($blogs);
