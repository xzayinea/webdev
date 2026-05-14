<?php
require_once '../config/session.php';
require_once '../config/auth.php';

if($_SESSION['user']['role'] !== 'admin') {
    header('Location: ../login.php');
    exit();
}

$user = $_SESSION['user'];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin - Clearance System</title>
    <link rel="stylesheet" href="../css/style.css">
</head>
<body>
    <header class="navbar">
        <div class="logo">Clearance System - Admin</div>
        <nav class="nav-links">
            <a href="dashboard.php">Dashboard</a>
            <a href="users.php">Users</a>
            <a href="sections.php">Sections</a>
            <a href="requirements.php">Requirements</a>
            <a href="payments.php">Payments</a>
            <a href="fines.php">Fines</a>
            <a href="homepage.php">Homepage</a>
            <a href="../logout.php">Logout</a>
        </nav>
    </header>
    <main class="page-content">
        <h2>Welcome, <?php echo htmlspecialchars($user['name']); ?></h2>
