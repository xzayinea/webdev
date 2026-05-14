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

if(isset($_POST['mark_paid'])) {
    $fine_id = (int)$_POST['fine_id'];
    $stmt = $pdo->prepare("UPDATE fines SET status = 'paid' WHERE id = ? AND student_id = ?");
    $stmt->execute([$fine_id, $student_id]);
    header('Location: fines.php?paid=1');
    exit();
}

$fines = $pdo->prepare("SELECT id, amount, status, created_at FROM fines WHERE student_id = ? ORDER BY created_at DESC");
$fines->execute([$student_id]);
$fines = $fines->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Student Fines</title>
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
        <h2>Fines</h2>
        <?php if(isset($_GET['paid']) && $_GET['paid'] === '1'): ?>
            <div class="alert">Fine status updated successfully.</div>
        <?php endif; ?>
        <div class="card">
            <h4>Your Fine Records</h4>
            <?php if(empty($fines)): ?>
                <p>You have no fines.</p>
            <?php else: ?>
                <table>
                    <thead>
                        <tr><th>ID</th><th>Amount</th><th>Status</th><th>Created</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                        <?php foreach($fines as $fine): ?>
                            <tr>
                                <td><?php echo $fine['id']; ?></td>
                                <td><?php echo number_format($fine['amount'], 2); ?></td>
                                <td><?php echo $fine['status']; ?></td>
                                <td><?php echo $fine['created_at']; ?></td>
                                <td>
                                    <?php if($fine['status'] === 'unpaid'): ?>
                                        <form method="POST">
                                            <input type="hidden" name="fine_id" value="<?php echo $fine['id']; ?>">
                                            <button type="submit" name="mark_paid">Mark as Paid</button>
                                        </form>
                                    <?php else: ?>
                                        Paid
                                    <?php endif; ?>
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
