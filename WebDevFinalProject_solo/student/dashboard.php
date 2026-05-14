<?php
require_once '../config/session.php';
require_once '../config/auth.php';
require_once '../config/database.php';

if($_SESSION['user']['role'] !== 'student') {
    header('Location: ../login.php');
    exit();
}

$user = $_SESSION['user'];
$student_id = $user['id'];

$requirements = $pdo->prepare(
    "SELECT r.id, r.name, r.description, s.status, s.file_name, s.id AS submission_id
     FROM requirements r
     LEFT JOIN submissions s ON s.requirement_id = r.id AND s.student_id = ?");
$requirements->execute([$student_id]);
$requirements = $requirements->fetchAll();

$pending = $pdo->prepare("SELECT COUNT(*) FROM submissions WHERE student_id = ? AND status != 'verified'");
$pending->execute([$student_id]);
$pendingCount = $pending->fetchColumn();

$unpaidPayments = $pdo->prepare("SELECT COUNT(*) FROM payments WHERE student_id = ? AND status = 'unpaid'");
$unpaidPayments->execute([$student_id]);
$paymentCount = $unpaidPayments->fetchColumn();

$unpaidFines = $pdo->prepare("SELECT COUNT(*) FROM fines WHERE student_id = ? AND status = 'unpaid'");
$unpaidFines->execute([$student_id]);
$finesCount = $unpaidFines->fetchColumn();

if($pendingCount == 0 && $paymentCount == 0 && $finesCount == 0) {
    $status = 'CLEARED';
} elseif($paymentCount > 0 || $finesCount > 0) {
    $status = 'HAS FINES';
} else {
    $status = 'PENDING';
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Student Dashboard</title>
    <link rel="stylesheet" href="../css/style.css">
</head>
<body>
    <header class="navbar">
        <div class="logo">Clearance System - Student</div>
        <nav class="nav-links">
            <a href="dashboard.php">Dashboard</a>
            <a href="payments.php">Payments</a>
            <a href="fines.php">Fines</a>
            <a href="../logout.php">Logout</a>
        </nav>
    </header>
    <main class="page-content">
        <h2>Welcome, <?php echo htmlspecialchars($user['name']); ?></h2>
        <?php if(isset($_GET['upload']) && $_GET['upload'] === 'success'): ?>
            <div class="alert">Your file was uploaded successfully.</div>
        <?php endif; ?>
        <div class="card">
            <h3>Clearance Status</h3>
            <p><?php echo $status; ?></p>
            <p>Pending submissions: <?php echo $pendingCount; ?></p>
            <p>Unpaid payments: <?php echo $paymentCount; ?></p>
            <p>Unpaid fines: <?php echo $finesCount; ?></p>
        </div>

        <div class="card">
            <h3>Requirements</h3>
            <?php if(empty($requirements)): ?>
                <p>No requirements found.</p>
            <?php else: ?>
                <table>
                    <thead>
                        <tr><th>Requirement</th><th>Description</th><th>Status</th><th>File</th><th>Upload</th></tr>
                    </thead>
                    <tbody>
                        <?php foreach($requirements as $item): ?>
                            <tr>
                                <td><?php echo htmlspecialchars($item['name']); ?></td>
                                <td><?php echo htmlspecialchars($item['description']); ?></td>
                                <td><?php echo $item['status'] ? $item['status'] : 'not submitted'; ?></td>
                                <td>
                                    <?php if($item['file_name']): ?>
                                        <a href="../uploads/<?php echo htmlspecialchars($item['file_name']); ?>" target="_blank">View</a>
                                    <?php else: ?>
                                        -
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <a href="upload.php?requirement_id=<?php echo $item['id']; ?>">Upload</a>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>
    </main>
</body>
</html>
