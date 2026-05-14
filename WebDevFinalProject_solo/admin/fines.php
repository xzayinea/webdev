<?php
require_once 'header.php';
require_once '../config/database.php';

if(isset($_POST['add_fine'])) {
    $student_id = (int)$_POST['student_id'];
    $amount = (float)$_POST['amount'];

    if($student_id && $amount > 0) {
        $stmt = $pdo->prepare("INSERT INTO fines (student_id, amount) VALUES (?, ?)");
        $stmt->execute([$student_id, $amount]);
        header('Location: fines.php');
        exit();
    }
}

if(isset($_POST['update_fine'])) {
    $fine_id = (int)$_POST['fine_id'];
    $status = $_POST['status'];
    $stmt = $pdo->prepare("UPDATE fines SET status = ? WHERE id = ?");
    $stmt->execute([$status, $fine_id]);
    header('Location: fines.php');
    exit();
}

$students = $pdo->query("SELECT id,name,email FROM users WHERE role='student' ORDER BY name ASC")->fetchAll();
$fines = $pdo->query("SELECT f.id,f.amount,f.status,f.created_at,u.name AS student_name,u.email FROM fines f JOIN users u ON f.student_id = u.id ORDER BY f.created_at DESC")->fetchAll();
?>
    <section>
        <h3>Fines</h3>
        <form method="POST" class="card">
            <h4>Add Fine Record</h4>
            <select name="student_id" required>
                <option value="">Choose Student</option>
                <?php foreach($students as $student): ?>
                    <option value="<?php echo $student['id']; ?>"><?php echo htmlspecialchars($student['name']); ?> (<?php echo htmlspecialchars($student['email']); ?>)</option>
                <?php endforeach; ?>
            </select>
            <input type="number" name="amount" step="0.01" min="0" placeholder="Amount" required>
            <button type="submit" name="add_fine">Create Fine</button>
        </form>

        <div class="card">
            <h4>Fine Records</h4>
            <table>
                <thead>
                    <tr><th>ID</th><th>Student</th><th>Amount</th><th>Status</th><th>Created</th><th>Action</th></tr>
                </thead>
                <tbody>
                    <?php foreach($fines as $fine): ?>
                        <tr>
                            <td><?php echo $fine['id']; ?></td>
                            <td><?php echo htmlspecialchars($fine['student_name']); ?> (<?php echo htmlspecialchars($fine['email']); ?>)</td>
                            <td><?php echo number_format($fine['amount'], 2); ?></td>
                            <td><?php echo $fine['status']; ?></td>
                            <td><?php echo $fine['created_at']; ?></td>
                            <td>
                                <form method="POST" style="display:inline-block;">
                                    <input type="hidden" name="fine_id" value="<?php echo $fine['id']; ?>">
                                    <select name="status">
                                        <option value="unpaid"<?php echo $fine['status'] === 'unpaid' ? ' selected' : ''; ?>>unpaid</option>
                                        <option value="paid"<?php echo $fine['status'] === 'paid' ? ' selected' : ''; ?>>paid</option>
                                    </select>
                                    <button type="submit" name="update_fine">Save</button>
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
