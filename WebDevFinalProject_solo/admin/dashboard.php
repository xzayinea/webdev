<?php
require_once 'header.php';
require_once '../config/database.php';

$totalStudents = $pdo->query("SELECT COUNT(*) FROM users WHERE role='student'")->fetchColumn();
$totalRequirements = $pdo->query("SELECT COUNT(*) FROM requirements")->fetchColumn();
$totalSubmissions = $pdo->query("SELECT COUNT(*) FROM submissions")->fetchColumn();
$pendingSubmissions = $pdo->query("SELECT COUNT(*) FROM submissions WHERE status='pending'")->fetchColumn();
?>
    <section>
        <h3>Admin Dashboard</h3>
        <div class="card dashboard-grid">
            <div class="summary-card">
                <h4>Students</h4>
                <p><?php echo $totalStudents; ?></p>
            </div>
            <div class="summary-card">
                <h4>Requirements</h4>
                <p><?php echo $totalRequirements; ?></p>
            </div>
            <div class="summary-card">
                <h4>Total Submissions</h4>
                <p><?php echo $totalSubmissions; ?></p>
            </div>
            <div class="summary-card">
                <h4>Pending Verifications</h4>
                <p><?php echo $pendingSubmissions; ?></p>
            </div>
        </div>
    </section>
</main>
</body>
</html>
