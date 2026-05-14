<?php
require_once '../config/session.php';
require_once '../config/auth.php';
require_once '../config/database.php';

if($_SESSION['user']['role'] !== 'representative') {
    header('Location: ../login.php');
    exit();
}

$user = $_SESSION['user'];

$pendingSubmissions = $pdo->prepare(
    "SELECT s.id, s.file_name, s.status, s.created_at, u.name AS student_name, r.name AS requirement_name
     FROM submissions s
     JOIN users u ON s.student_id = u.id
     JOIN requirements r ON s.requirement_id = r.id
     WHERE s.status = 'pending'");
$pendingSubmissions->execute();
$submissions = $pendingSubmissions->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Representative Dashboard</title>
    <link rel="stylesheet" href="../css/style.css">
</head>
<body>
    <header class="navbar">
        <div class="logo">Clearance System - Representative</div>
        <nav class="nav-links">
            <a href="dashboard.php">Dashboard</a>
            <a href="../logout.php">Logout</a>
        </nav>
    </header>
    <main class="page-content">
        <h2>Welcome, <?php echo htmlspecialchars($user['name']); ?></h2>
        <div class="card">
            <h3>Pending Submissions</h3>
            <?php if(empty($submissions)): ?>
                <p>No submissions require verification.</p>
            <?php else: ?>
                <table>
                    <thead>
                        <tr><th>ID</th><th>Student</th><th>Requirement</th><th>File</th><th>Submitted</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                        <?php foreach($submissions as $item): ?>
                            <tr>
                                <td><?php echo $item['id']; ?></td>
                                <td><?php echo htmlspecialchars($item['student_name']); ?></td>
                                <td><?php echo htmlspecialchars($item['requirement_name']); ?></td>
                                <td><?php echo htmlspecialchars($item['file_name']); ?></td>
                                <td><?php echo $item['created_at']; ?></td>
                                <td><a href="verify_requirements.php?verify=<?php echo $item['id']; ?>">Verify</a></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>
    </main>
</body>
</html>
