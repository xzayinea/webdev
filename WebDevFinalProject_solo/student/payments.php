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
$message = '';

if(isset($_POST['mark_paid'])) {
    $payment_id = (int)$_POST['payment_id'];
    $stmt = $pdo->prepare("UPDATE payments SET status = 'paid' WHERE id = ? AND student_id = ?");
    $stmt->execute([$payment_id, $student_id]);
    header('Location: payments.php?paid=1');
    exit();
}

$payments = $pdo->prepare("SELECT id, amount, status, created_at FROM payments WHERE student_id = ? ORDER BY created_at DESC");
$payments->execute([$student_id]);
$payments = $payments->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Student Payments</title>
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
        <h2>Payments</h2>
        <?php if(isset($_GET['paid']) && $_GET['paid'] === '1'): ?>
            <div class="alert">Payment status updated successfully.</div>
        <?php endif; ?>
        <div class="card">
            <h4>Your Payment Records</h4>
            <?php if(empty($payments)): ?>
                <p>You have no payment records.</p>
            <?php else: ?>
                <table>
                    <thead>
                        <tr><th>ID</th><th>Amount</th><th>Status</th><th>Created</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                        <?php foreach($payments as $payment): ?>
                            <tr>
                                <td><?php echo $payment['id']; ?></td>
                                <td><?php echo number_format($payment['amount'], 2); ?></td>
                                <td><?php echo $payment['status']; ?></td>
                                <td><?php echo $payment['created_at']; ?></td>
                                <td>
                                    <?php if($payment['status'] === 'unpaid'): ?>
                                        <form method="POST">
                                            <input type="hidden" name="payment_id" value="<?php echo $payment['id']; ?>">
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
