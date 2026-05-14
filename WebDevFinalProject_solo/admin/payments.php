<?php
require_once 'header.php';
require_once '../config/database.php';

$message = '';

if(isset($_POST['add_payment'])) {
    $student_id = (int)$_POST['student_id'];
    $amount = (float)$_POST['amount'];

    if($student_id && $amount > 0) {
        $stmt = $pdo->prepare("INSERT INTO payments (student_id, amount) VALUES (?, ?)");
        $stmt->execute([$student_id, $amount]);
        header('Location: payments.php');
        exit();
    }
}

if(isset($_POST['update_payment'])) {
    $payment_id = (int)$_POST['payment_id'];
    $status = $_POST['status'];
    $stmt = $pdo->prepare("UPDATE payments SET status = ? WHERE id = ?");
    $stmt->execute([$status, $payment_id]);
    header('Location: payments.php');
    exit();
}

$students = $pdo->query("SELECT id,name,email FROM users WHERE role='student' ORDER BY name ASC")->fetchAll();
$payments = $pdo->query("SELECT p.id,p.amount,p.status,p.created_at,u.name AS student_name,u.email FROM payments p JOIN users u ON p.student_id = u.id ORDER BY p.created_at DESC")->fetchAll();
?>
    <section>
        <h3>Payments</h3>
        <form method="POST" class="card">
            <h4>Add Payment Record</h4>
            <select name="student_id" required>
                <option value="">Choose Student</option>
                <?php foreach($students as $student): ?>
                    <option value="<?php echo $student['id']; ?>"><?php echo htmlspecialchars($student['name']); ?> (<?php echo htmlspecialchars($student['email']); ?>)</option>
                <?php endforeach; ?>
            </select>
            <input type="number" name="amount" step="0.01" min="0" placeholder="Amount" required>
            <button type="submit" name="add_payment">Create Payment</button>
        </form>

        <div class="card">
            <h4>Payment Records</h4>
            <table>
                <thead>
                    <tr><th>ID</th><th>Student</th><th>Amount</th><th>Status</th><th>Created</th><th>Action</th></tr>
                </thead>
                <tbody>
                    <?php foreach($payments as $payment): ?>
                        <tr>
                            <td><?php echo $payment['id']; ?></td>
                            <td><?php echo htmlspecialchars($payment['student_name']); ?> (<?php echo htmlspecialchars($payment['email']); ?>)</td>
                            <td><?php echo number_format($payment['amount'], 2); ?></td>
                            <td><?php echo $payment['status']; ?></td>
                            <td><?php echo $payment['created_at']; ?></td>
                            <td>
                                <form method="POST" style="display:inline-block;">
                                    <input type="hidden" name="payment_id" value="<?php echo $payment['id']; ?>">
                                    <select name="status">
                                        <option value="unpaid"<?php echo $payment['status'] === 'unpaid' ? ' selected' : ''; ?>>unpaid</option>
                                        <option value="paid"<?php echo $payment['status'] === 'paid' ? ' selected' : ''; ?>>paid</option>
                                    </select>
                                    <button type="submit" name="update_payment">Save</button>
                                </form>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </section>
</main>
</body>
</html>
