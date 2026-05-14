<?php
require_once '../config/session.php';
require_once '../config/auth.php';
require_once '../config/database.php';

if($_SESSION['user']['role'] !== 'executive') {
    header('Location: ../login.php');
    exit();
}

$user = $_SESSION['user'];

$totalStudents = $pdo->query("SELECT COUNT(*) FROM users WHERE role='student'")->fetchColumn();
$totalSubmissions = $pdo->query("SELECT COUNT(*) FROM submissions")->fetchColumn();
$pendingSubmissions = $pdo->query("SELECT COUNT(*) FROM submissions WHERE status='pending'")->fetchColumn();
$verifiedSubmissions = $pdo->query("SELECT COUNT(*) FROM submissions WHERE status='verified'")->fetchColumn();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Executive Dashboard</title>
    <link rel="stylesheet" href="../css/style.css">
</head>
<body>
    <header class="navbar">
        <div class="logo">Clearance System - Executive</div>
        <nav class="nav-links">
            <a href="dashboard.php">Dashboard</a>
            <a href="../logout.php">Logout</a>
        </nav>
    </header>
    <main class="page-content">
        <h2>Welcome, <?php echo htmlspecialchars($user['name']); ?></h2>
        <div class="card">
            <h3>Statistics</h3>
            <p>Total Students: <?php echo $totalStudents; ?></p>
            <p>Total Submissions: <?php echo $totalSubmissions; ?></p>
            <p>Pending Submissions: <?php echo $pendingSubmissions; ?></p>
            <p>Verified Submissions: <?php echo $verifiedSubmissions; ?></p>
        </div>
    </main>
</body>
</html>
